import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/transactions/sheets - List all imported sheets
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileImportId = searchParams.get("fileImportId");
    const sheetId = searchParams.get("sheetId");

    // If sheetId is provided, return specific sheet with transactions
    if (sheetId) {
      const sheet = await prisma.sheetImport.findUnique({
        where: { id: sheetId },
        include: {
          fileImport: {
            select: {
              filename: true,
              uploadedAt: true,
            },
          },
          transactions: {
            where: { isDeleted: false },
            orderBy: { date: "asc" },
          },
        },
      });

      if (!sheet) {
        return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
      }

      // Parse metadata
      const metadata = JSON.parse(sheet.metadata);

      // Categorize transactions
      const glTransactions = {
        intCr: sheet.transactions.filter((t) => t.type === "int cr"),
        intDr: sheet.transactions.filter((t) => t.type === "int dr"),
      };

      const statementTransactions = {
        extDr: sheet.transactions.filter((t) => t.type === "ext dr"),
        extCr: sheet.transactions.filter((t) => t.type === "ext cr"),
      };

      return NextResponse.json({
        success: true,
        data: {
          id: sheet.id,
          name: sheet.name,
          metadata,
          reportingDate: sheet.reportingDate,
          fileName: sheet.fileImport.filename,
          uploadedAt: sheet.fileImport.uploadedAt,
          totalTransactions: sheet.transactionCount,
          glTransactions,
          statementTransactions,
          counts: {
            intCr: sheet.intCrCount,
            intDr: sheet.intDrCount,
            extDr: sheet.extDrCount,
            extCr: sheet.extCrCount,
          },
        },
      });
    }

    // If fileImportId is provided, list sheets from that file
    if (fileImportId) {
      const sheets = await prisma.sheetImport.findMany({
        where: { fileImportId },
        orderBy: { sheetOrder: "asc" },
        include: {
          fileImport: {
            select: {
              filename: true,
              uploadedAt: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: sheets.map((sheet) => ({
          id: sheet.id,
          name: sheet.name,
          reportingDate: sheet.reportingDate,
          transactionCount: sheet.transactionCount,
          counts: {
            intCr: sheet.intCrCount,
            intDr: sheet.intDrCount,
            extDr: sheet.extDrCount,
            extCr: sheet.extCrCount,
          },
          metadata: JSON.parse(sheet.metadata),
        })),
      });
    }

    // List all file imports with their sheets
    const fileImports = await prisma.fileImport.findMany({
      orderBy: { uploadedAt: "desc" },
      include: {
        sheets: {
          orderBy: { sheetOrder: "asc" },
        },
        uploadedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: fileImports.map((file) => ({
        id: file.id,
        filename: file.filename,
        uploadedAt: file.uploadedAt,
        uploadedBy: file.uploadedBy,
        sheetCount: file.sheetCount,
        totalTransactions: file.processedCount,
        status: file.status,
        sheets: file.sheets.map((sheet) => ({
          id: sheet.id,
          name: sheet.name,
          reportingDate: sheet.reportingDate,
          transactionCount: sheet.transactionCount,
          counts: {
            intCr: sheet.intCrCount,
            intDr: sheet.intDrCount,
            extDr: sheet.extDrCount,
            extCr: sheet.extCrCount,
          },
        })),
      })),
    });
  } catch (error) {
    console.error("Sheets API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to retrieve sheets",
      },
      { status: 500 }
    );
  }
}
