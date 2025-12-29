// Shared Excel import utilities
import * as ExcelJS from "exceljs";
import crypto from "crypto";

// Type definitions for imported transaction data
export interface ImportedTransaction {
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

export interface TransactionSet {
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
  metadata?: Record<string, any>;
}

// Check if sheet contains "dept" in cells A1:D10
export function isValidAccountSheet(worksheet: ExcelJS.Worksheet): boolean {
  // Check cells A1:D10 (rows 1-10, columns 1-4)
  for (let row = 1; row <= 10; row++) {
    for (let col = 1; col <= 4; col++) {
      const cell = worksheet.getCell(row, col);
      if (cell.value) {
        const cellValue = String(cell.value).toLowerCase();
        if (cellValue.includes("dept")) {
          return true;
        }
      }
    }
  }

  return false;
}

// Generate file hash for duplicate detection
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Extract metadata from sheet data
export function extractMetadata(jsonData: any[][]): Record<string, any> {
  const metadata: Record<string, any> = {};
  const beforeTransactionsFields = [
    "DEPT",
    "BRANCH",
    "REPORTING DATE",
    "REPORTING UNIT",
    "BANK ACCOUNT NUMBER",
    "GENERAL LEDGER NAME",
    "GENERAL LEDGER NUMBER",
    "BALANCE PER BANK STATEMENT",
  ];

  const afterTransactionsFields = [
    "INTERNAL ACCOUNT BALANCE AS AT",
    "PREPARED BY:",
    "REVIEWED BY:",
  ];

  let transactionTableStartIndex = -1;

  // First pass: Extract metadata before transaction table
  for (let i = 0; i < jsonData.length; i++) {
    const row =
      jsonData[i]?.map((cell) => (cell || "").toString().trim()) || [];

    // Mark where transaction table starts
    if (
      row.includes("SN") &&
      row.includes("DATE") &&
      row.includes("DESCRIPTION")
    ) {
      transactionTableStartIndex = i;
      break;
    }

    // Extract metadata fields before transactions
    beforeTransactionsFields.forEach((field) => {
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

  // Second pass: Extract metadata after transaction table
  if (transactionTableStartIndex !== -1) {
    for (let i = transactionTableStartIndex; i < jsonData.length; i++) {
      const row =
        jsonData[i]?.map((cell) => (cell || "").toString().trim()) || [];

      // Extract metadata fields after transactions
      afterTransactionsFields.forEach((field) => {
        // Use partial matching for fields that may have additional text (like dates)
        const fieldIndex = row.findIndex((cell) =>
          cell.toUpperCase().startsWith(field.toUpperCase())
        );

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
  }

  return metadata;
}

// Parse sheet data with proper transaction extraction
export function parseSheetData(jsonData: any[][], sheetName: string) {
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

// Parse Excel file into transaction sets
export async function parseExcelFile(
  buffer: Buffer | ArrayBuffer,
  fileName: string
): Promise<TransactionSet[]> {
  try {
    const workbook = new ExcelJS.Workbook();
    // Type assertion to bypass TypeScript strict checking
    await workbook.xlsx.load(buffer as any);
    const transactionSets: TransactionSet[] = [];

    workbook.worksheets.forEach((worksheet, index) => {
      const sheetName = worksheet.name;

      // Filter sheets: only process sheets containing "dept" in A1:D10
      if (!isValidAccountSheet(worksheet)) {
        console.log(
          `[Import] Skipping sheet "${sheetName}" - does not contain "dept" in A1:D10`
        );
        return;
      }

      console.log(`[Import] Processing valid account sheet: "${sheetName}"`);

      // Convert sheet to 2D array (preserves structure for metadata extraction)
      const jsonData: any[][] = [];
      worksheet.eachRow((row, rowNumber) => {
        const rowData: any[] = [];
        row.eachCell((cell, colNumber) => {
          rowData.push(cell.value || "");
        });
        jsonData.push(rowData);
      });

      if (jsonData.length === 0) return;

      // Parse sheet data with metadata extraction
      const { metadata, transactions } = parseSheetData(jsonData, sheetName);

      const totalTransactions =
        transactions.intCr.length +
        transactions.intDr.length +
        transactions.extDr.length +
        transactions.extCr.length;

      // Include all sheets regardless of transaction count
      transactionSets.push({
        id: `set-${index + 1}-${Date.now()}`,
        name: sheetName || `Transaction Set ${index + 1}`,
        date:
          metadata["REPORTING DATE"] || new Date().toISOString().split("T")[0],
        totalTransactions,
        glTransactions: {
          intCr: transactions.intCr,
          intDr: transactions.intDr,
        },
        statementTransactions: {
          extDr: transactions.extDr,
          extCr: transactions.extCr,
        },
        metadata,
      });

      if (totalTransactions === 0) {
        console.log(
          `[Import] Sheet "${sheetName}" has no transactions but will be imported`
        );
      }
    });

    return transactionSets;
  } catch (error) {
    console.error("Error parsing Excel file:", error);
    throw new Error("Failed to parse Excel file");
  }
}
