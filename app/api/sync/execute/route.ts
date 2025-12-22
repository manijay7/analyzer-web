import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { parseExcelFile, generateFileHash } from "@/lib/excel-import";

const prisma = new PrismaClient();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FileResult {
  fileName: string;
  status: "success" | "error" | "duplicate" | "skipped";
  message: string;
  sheetsImported?: number;
  transactionsImported?: number;
  error?: string;
}

// POST - Process all Excel files in a folder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { folderPath, skipDuplicates = true } = body;

    if (!folderPath) {
      return NextResponse.json(
        { error: "Folder path is required" },
        { status: 400 }
      );
    }

    // Security check
    if (!path.isAbsolute(folderPath)) {
      return NextResponse.json(
        { error: "Folder path must be absolute" },
        { status: 400 }
      );
    }

    // Verify folder exists
    try {
      const stats = await fs.stat(folderPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: "Path is not a directory" },
          { status: 400 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: "Folder does not exist or is not accessible" },
        { status: 404 }
      );
    }

    // Get user ID
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
      select: { id: true },
    });

    if (!user) {
      console.error(`[FolderSync] User not found in database: ${userId}`);
      return NextResponse.json(
        { error: "User not found. Please log in again." },
        { status: 401 }
      );
    }

    console.log(`[FolderSync] Starting sync for folder: ${folderPath}`);
    console.log(
      `[FolderSync] User: ${userId}, Skip duplicates: ${skipDuplicates}`
    );

    // Read directory
    const files = await fs.readdir(folderPath);
    const excelFiles = files.filter(
      (file) => file.endsWith(".xlsx") || file.endsWith(".xls")
    );

    console.log(`[FolderSync] Found ${excelFiles.length} Excel file(s)`);

    if (excelFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No Excel files found in folder",
        results: [],
        summary: {
          total: 0,
          succeeded: 0,
          failed: 0,
          duplicates: 0,
          skipped: 0,
        },
      });
    }

    const results: FileResult[] = [];
    let succeeded = 0;
    let failed = 0;
    let duplicates = 0;
    let skipped = 0;

    // Process each file
    for (const fileName of excelFiles) {
      const filePath = path.join(folderPath, fileName);
      console.log(`\n[FolderSync] Processing: ${fileName}`);

      try {
        // Read file
        const fileBuffer = await fs.readFile(filePath);
        const fileHash = generateFileHash(fileBuffer);
        const fileStats = await fs.stat(filePath);

        // Check for duplicates
        const existingImport = await prisma.fileImport.findFirst({
          where: {
            OR: [{ checksum: fileHash }, { filename: fileName }],
          },
        });

        if (existingImport) {
          console.log(`[FolderSync] Duplicate found: ${fileName}`);

          if (skipDuplicates) {
            duplicates++;
            results.push({
              fileName,
              status: "duplicate",
              message: `Skipped - already imported on ${existingImport.uploadedAt.toISOString()}`,
            });
            continue;
          } else {
            // Delete existing import
            console.log(
              `[FolderSync] Overriding existing import for: ${fileName}`
            );
            await prisma.fileImport.delete({
              where: { id: existingImport.id },
            });
          }
        }

        // Parse Excel file
        const transactionSets = parseExcelFile(fileBuffer, fileName);

        if (transactionSets.length === 0) {
          console.log(`[FolderSync] No valid sheets in: ${fileName}`);
          skipped++;
          results.push({
            fileName,
            status: "skipped",
            message: 'No valid sheets found (must contain "dept" in A1:D10)',
          });
          continue;
        }

        // Create FileImport record
        const fileImport = await prisma.fileImport.create({
          data: {
            filename: fileName,
            mimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileSize: fileStats.size,
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

        console.log(`[FolderSync] Created FileImport: ${fileImport.id}`);

        // Save each sheet and transactions
        let totalTransactionsImported = 0;

        for (let i = 0; i < transactionSets.length; i++) {
          const set = transactionSets[i];

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

          // Save transactions
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

            totalTransactionsImported += allTransactions.length;
          }
        }

        succeeded++;
        results.push({
          fileName,
          status: "success",
          message: `Successfully imported ${transactionSets.length} sheet(s)`,
          sheetsImported: transactionSets.length,
          transactionsImported: totalTransactionsImported,
        });

        console.log(
          `[FolderSync] ✓ ${fileName}: ${transactionSets.length} sheets, ${totalTransactionsImported} transactions`
        );
      } catch (error) {
        console.error(`[FolderSync] ✗ Error processing ${fileName}:`, error);
        failed++;
        results.push({
          fileName,
          status: "error",
          message: "Failed to process file",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(
      `\n[FolderSync] Complete! Success: ${succeeded}, Failed: ${failed}, Duplicates: ${duplicates}, Skipped: ${skipped}`
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${excelFiles.length} file(s)`,
      results,
      summary: {
        total: excelFiles.length,
        succeeded,
        failed,
        duplicates,
        skipped,
      },
    });
  } catch (error) {
    console.error("[FolderSync] Critical error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sync folder",
      },
      { status: 500 }
    );
  }
}
