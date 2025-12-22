import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { parseExcelFile, generateFileHash } from "@/lib/excel-import";

const prisma = new PrismaClient();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        { error: 'No valid sheets found in the file. Ensure at least one sheet contains "dept" in cells A1:D10.' },
        { status: 400 }
      );
    }

    console.log(
      `[Import API] Successfully parsed ${transactionSets.length} transaction set(s) from valid account sheets`
    );

    // Get user ID from session
    const userId = (session.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 401 }
      );
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      console.error(`[Import] User not found in database: ${userId}`);
      return NextResponse.json(
        { error: "User not found. Please log in again." },
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
      } else {
        console.log(`[Import]   Sheet has no transactions to save`);
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
