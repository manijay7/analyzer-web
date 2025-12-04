import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import crypto from "crypto";

const prisma = new PrismaClient();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Type definitions for imported transaction data
interface ImportedTransaction {
  sn?: string;
  date: string;
  description: string;
  amount: number;
  glRefNo?: string;
  aging?: number;
  recon?: string;
  reference: string;
  type: "int cr" | "int dr" | "ext dr" | "ext cr";
  [key: string]: any;
}

interface TransactionSet {
  id: string;
  name: string;
  date: string;
  totalTransactions: number;
  glTransactions: {
    intCr: ImportedTransaction[];
    intDr: ImportedTransaction[];
  };
  statementTransactions: {
    extDr: ImportedTransaction[];
    extCr: ImportedTransaction[];
  };
  metadata?: Record<string, any>; // Sheet metadata (DEPT, BRANCH, etc.)
}

// Storage for tracking imported files (in-memory for now, move to database later)
const importedFiles = new Map<
  string,
  { fileName: string; hash: string; uploadedAt: string }
>();

// Check if sheet contains "dept" in cells A1:D10
function isValidAccountSheet(worksheet: XLSX.WorkSheet): boolean {
  const range = { s: { c: 0, r: 0 }, e: { c: 3, r: 9 } }; // A1:D10

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];

      if (cell && cell.v) {
        const cellValue = String(cell.v).toLowerCase();
        if (cellValue.includes("dept")) {
          return true;
        }
      }
    }
  }

  return false;
}

// Generate file hash for duplicate detection
function generateFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Extract metadata from sheet data
function extractMetadata(jsonData: any[][]): Record<string, any> {
  const metadata: Record<string, any> = {};
  const metadataFields = [
    "DEPT",
    "BRANCH",
    "REPORTING DATE",
    "REPORTING UNIT",
    "BANK ACCOUNT NUMBER",
    "GENERAL LEDGER NAME",
    "GENERAL LEDGER NUMBER",
    "BALANCE PER BANK STATEMENT",
    "GRAND TOTAL",
    "INTERNAL ACCOUNT BALANCE AS AT",
    "DIFFERENCE",
    "PREPARED BY:",
    "REVIEWED BY:",
  ];

  for (let i = 0; i < jsonData.length; i++) {
    const row =
      jsonData[i]?.map((cell) => (cell || "").toString().trim()) || [];

    // Stop if we hit the transaction table
    if (
      row.includes("SN") &&
      row.includes("DATE") &&
      row.includes("DESCRIPTION")
    ) {
      break;
    }

    // Extract metadata fields
    metadataFields.forEach((field) => {
      const fieldIndex = row.indexOf(field);
      if (fieldIndex !== -1) {
        // Look for value in next 3 columns
        for (let j = 1; j <= 3 && fieldIndex + j < row.length; j++) {
          if (row[fieldIndex + j]) {
            metadata[field] = row[fieldIndex + j];
            break;
          }
        }
      }
    });
  }

  return metadata;
}

// Parse sheet data with proper transaction extraction
function parseSheetData(jsonData: any[][], sheetName: string) {
  const metadata = extractMetadata(jsonData);
  const transactions = {
    intCr: [] as ImportedTransaction[],
    intDr: [] as ImportedTransaction[],
    extDr: [] as ImportedTransaction[],
    extCr: [] as ImportedTransaction[],
  };

  // Find transaction table start
  let transactionStartIndex = -1;
  for (let i = 0; i < jsonData.length; i++) {
    const row =
      jsonData[i]?.map((cell) => (cell || "").toString().trim()) || [];
    if (
      row.includes("SN") &&
      row.includes("DATE") &&
      row.includes("DESCRIPTION")
    ) {
      transactionStartIndex = i;
      break;
    }
  }

  if (transactionStartIndex === -1) {
    console.log(`[Import] No transaction table found in sheet "${sheetName}"`);
    return { metadata, transactions };
  }

  // Get column indices
  const headerRow =
    jsonData[transactionStartIndex]?.map((cell) =>
      (cell || "").toString().trim()
    ) || [];

  const colIndices = {
    SN: headerRow.indexOf("SN"),
    DATE: headerRow.indexOf("DATE"),
    DESCRIPTION: headerRow.indexOf("DESCRIPTION"),
    AMOUNT: headerRow.indexOf("AMOUNT"),
    GLRefNo: headerRow.indexOf("GL Ref No."),
    AGING: headerRow.indexOf("AGING(DAYS)"),
    RECON: headerRow.indexOf("RECON"),
  };

  // Validate required columns exist
  if (
    colIndices.SN === -1 ||
    colIndices.DATE === -1 ||
    colIndices.DESCRIPTION === -1 ||
    colIndices.RECON === -1
  ) {
    console.log(`[Import] Missing required columns in sheet "${sheetName}"`);
    return { metadata, transactions };
  }

  console.log(
    `[Import] Found transaction table at row ${
      transactionStartIndex + 1
    } in sheet "${sheetName}"`
  );
  console.log(`[Import] Column indices:`, colIndices);

  // Parse transaction rows
  let parsedCount = 0;
  for (let i = transactionStartIndex + 1; i < jsonData.length; i++) {
    const row =
      jsonData[i]?.map((cell) => (cell || "").toString().trim()) || [];

    // Skip empty rows or rows that don't have enough columns
    if (
      row.length <
      Math.max(...Object.values(colIndices).filter((idx) => idx !== -1)) + 1
    )
      continue;

    // Skip summary rows (TOTAL, ADD, LESS)
    const description = row[colIndices.DESCRIPTION] || "";
    if (
      ["TOTAL:", "ADD:", "LESS:"].some((prefix) =>
        description.startsWith(prefix)
      )
    ) {
      continue;
    }

    const recon = (row[colIndices.RECON] || "").trim().toUpperCase();

    // Only process rows with valid RECON values
    if (!["INT CR", "INT DR", "EXT CR", "EXT DR"].includes(recon)) {
      continue;
    }

    // Parse amount and aging
    const amountStr = row[colIndices.AMOUNT] || "0";
    const amount = Math.abs(
      parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || 0
    );

    const agingStr = row[colIndices.AGING] || "";
    const aging = agingStr ? parseInt(agingStr, 10) : undefined;

    if (amount === 0) continue;

    const transaction: ImportedTransaction = {
      sn: row[colIndices.SN] || `SN-${i}`,
      date: row[colIndices.DATE] || new Date().toISOString().split("T")[0],
      description: description || "Transaction",
      amount: amount,
      glRefNo: row[colIndices.GLRefNo] || row[colIndices.SN] || `REF-${i}`,
      aging: aging,
      recon: recon,
      reference: row[colIndices.GLRefNo] || row[colIndices.SN] || `REF-${i}`,
      type: recon.toLowerCase() as "int cr" | "int dr" | "ext dr" | "ext cr",
    };

    // Categorize transaction based on RECON value
    switch (recon) {
      case "INT CR":
        transactions.intCr.push(transaction);
        break;
      case "INT DR":
        transactions.intDr.push(transaction);
        break;
      case "EXT DR":
        transactions.extDr.push(transaction);
        break;
      case "EXT CR":
        transactions.extCr.push(transaction);
        break;
    }
    parsedCount++;
  }

  console.log(
    `[Import] Parsed ${parsedCount} transactions from sheet "${sheetName}"`
  );
  console.log(
    `[Import]   INT CR: ${transactions.intCr.length}, INT DR: ${transactions.intDr.length}, EXT DR: ${transactions.extDr.length}, EXT CR: ${transactions.extCr.length}`
  );

  return { metadata, transactions };
}

function parseExcelFile(buffer: Buffer, fileName: string): TransactionSet[] {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const transactionSets: TransactionSet[] = [];

    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];

      // Filter sheets: only process sheets containing "dept" in A1:D10
      if (!isValidAccountSheet(worksheet)) {
        console.log(
          `[Import] Skipping sheet "${sheetName}" - does not contain "dept" in A1:D10`
        );
        return;
      }

      console.log(`[Import] Processing valid account sheet: "${sheetName}"`);

      // Convert sheet to 2D array (preserves structure for metadata extraction)
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: "",
      });

      if (jsonData.length === 0) return;

      // Parse sheet data with metadata extraction
      const { metadata, transactions } = parseSheetData(jsonData, sheetName);

      const totalTransactions =
        transactions.intCr.length +
        transactions.intDr.length +
        transactions.extDr.length +
        transactions.extCr.length;

      if (totalTransactions > 0) {
        transactionSets.push({
          id: `set-${index + 1}-${Date.now()}`,
          name: sheetName || `Transaction Set ${index + 1}`,
          date:
            metadata["REPORTING DATE"] ||
            new Date().toISOString().split("T")[0],
          totalTransactions,
          glTransactions: {
            intCr: transactions.intCr,
            intDr: transactions.intDr,
          },
          statementTransactions: {
            extDr: transactions.extDr,
            extCr: transactions.extCr,
          },
          metadata, // Include extracted metadata
        });
      } else {
        console.log(
          `[Import] No valid transactions found in sheet "${sheetName}"`
        );
      }
    });

    return transactionSets;
  } catch (error) {
    console.error("Error parsing Excel file:", error);
    throw new Error("Failed to parse Excel file");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const override = formData.get("override") === "true"; // Check if override is requested

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload an Excel file (.xlsx or .xls)",
        },
        { status: 400 }
      );
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate file hash for duplicate detection
    const fileHash = generateFileHash(buffer);

    // Check for duplicates in database (unless override is requested)
    if (!override) {
      const existingImport = await prisma.fileImport.findFirst({
        where: {
          OR: [{ checksum: fileHash }, { filename: file.name }],
        },
      });

      if (existingImport) {
        return NextResponse.json(
          {
            success: false,
            duplicate: true,
            message: `File "${file.name}" has already been imported`,
            existingImport: {
              fileName: existingImport.filename,
              uploadedAt: existingImport.uploadedAt.toISOString(),
            },
            prompt:
              "Would you like to override the existing data or skip this import?",
          },
          { status: 409 }
        );
      }
    } else {
      console.log(
        `[Import] Override requested - replacing existing import for "${file.name}"`
      );

      // Delete existing import and related data
      const existing = await prisma.fileImport.findFirst({
        where: {
          OR: [{ checksum: fileHash }, { filename: file.name }],
        },
      });

      if (existing) {
        console.log(`[Import] Deleting existing import: ${existing.id}`);
        await prisma.fileImport.delete({ where: { id: existing.id } });
      }
    }

    // Parse Excel file with sheet filtering
    const transactionSets = parseExcelFile(buffer, file.name);

    if (transactionSets.length === 0) {
      return NextResponse.json(
        { error: "No valid transactions found in the file" },
        { status: 400 }
      );
    }

    console.log(
      `[Import API] Successfully parsed ${transactionSets.length} transaction set(s) from valid account sheets`
    );

    // Get user ID from session
    const userId = (session.user as any)?.id || (session.user as any)?.email;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 401 }
      );
    }

    // Save to database
    console.log(`[Import] Saving to database...`);

    // Create FileImport record
    const fileImport = await prisma.fileImport.create({
      data: {
        filename: file.name,
        mimeType:
          file.type ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileSize: file.size,
        checksum: fileHash,
        status: "COMPLETED",
        sheetCount: transactionSets.length,
        validSheetCount: transactionSets.length,
        processedCount: transactionSets.reduce(
          (sum, set) => sum + set.totalTransactions,
          0
        ),
        acceptedCount: transactionSets.reduce(
          (sum, set) => sum + set.totalTransactions,
          0
        ),
        uploadedById: userId,
        processedAt: new Date(),
      },
    });

    console.log(`[Import] Created FileImport: ${fileImport.id}`);

    // Save each sheet and its transactions
    for (let i = 0; i < transactionSets.length; i++) {
      const set = transactionSets[i];

      console.log(
        `[Import] Saving sheet ${i + 1}/${transactionSets.length}: "${
          set.name
        }"`
      );

      // Create SheetImport record
      const sheetImport = await prisma.sheetImport.create({
        data: {
          name: set.name,
          fileImportId: fileImport.id,
          metadata: JSON.stringify(set.metadata || {}),
          transactionCount: set.totalTransactions,
          intCrCount: set.glTransactions.intCr.length,
          intDrCount: set.glTransactions.intDr.length,
          extCrCount: set.statementTransactions.extCr.length,
          extDrCount: set.statementTransactions.extDr.length,
          reportingDate: set.metadata?.["REPORTING DATE"] || set.date,
          sheetOrder: i,
        },
      });

      console.log(`[Import]   Created SheetImport: ${sheetImport.id}`);

      // Save all transactions for this sheet
      const allTransactions = [
        ...set.glTransactions.intCr.map((t) => ({ ...t, side: "LEFT" })),
        ...set.glTransactions.intDr.map((t) => ({ ...t, side: "LEFT" })),
        ...set.statementTransactions.extDr.map((t) => ({
          ...t,
          side: "RIGHT",
        })),
        ...set.statementTransactions.extCr.map((t) => ({
          ...t,
          side: "RIGHT",
        })),
      ];

      // Batch create transactions
      if (allTransactions.length > 0) {
        await prisma.transaction.createMany({
          data: allTransactions.map((t) => ({
            sn: t.sn,
            date: t.date,
            description: t.description,
            amount: t.amount,
            glRefNo: t.glRefNo,
            aging: t.aging,
            recon: t.recon,
            reference: t.reference,
            side: t.side,
            type: t.type,
            status: "UNMATCHED",
            fileImportId: fileImport.id,
            sheetImportId: sheetImport.id,
            importedById: userId,
          })),
        });

        console.log(`[Import]   Saved ${allTransactions.length} transactions`);
      }
    }

    console.log(`[Import] Database save complete!`);

    // Return parsed data with database IDs
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${transactionSets.length} sheet(s) with ${fileImport.processedCount} total transactions`,
      data: {
        fileImportId: fileImport.id,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: fileImport.uploadedAt.toISOString(),
        fileHash,
        sheetCount: transactionSets.length,
        totalTransactions: fileImport.processedCount,
        transactionSets: transactionSets.map((set, i) => ({
          id: set.id,
          name: set.name,
          date: set.date,
          totalTransactions: set.totalTransactions,
          metadata: set.metadata,
        })),
      },
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import transactions",
      },
      { status: 500 }
    );
  }
}
