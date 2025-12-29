import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, rateLimit } from "@/lib/api-security";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, 20, 15 * 60 * 1000); // 20 requests per 15 minutes
    if (rateLimitResult) return rateLimitResult;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check export_data permission
    if (!hasPermission(user.role as any, "export_data")) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { fileId, scope, sheetId } = body;

    if (!fileId || !scope) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: fileId, scope" },
        { status: 400 }
      );
    }

    if (scope !== "current" && scope !== "workbook") {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid scope. Must be "current" or "workbook"',
        },
        { status: 400 }
      );
    }

    if (scope === "current" && !sheetId) {
      return NextResponse.json(
        { success: false, error: "sheetId required for current sheet scope" },
        { status: 400 }
      );
    }

    // Verify file exists
    const fileImport = await prisma.fileImport.findUnique({
      where: { id: fileId },
    });

    if (!fileImport) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    let transactions: any[] = [];
    let metadata: any = {
      fileName: fileImport.filename,
      exportDate: new Date().toISOString(),
    };

    if (scope === "current") {
      // Export current sheet only
      const sheet = await prisma.sheetImport.findUnique({
        where: { id: sheetId },
        include: {
          transactions: {
            where: {
              status: "UNMATCHED",
            },
          },
        },
      });

      if (!sheet) {
        return NextResponse.json(
          { success: false, error: "Sheet not found" },
          { status: 404 }
        );
      }

      // Add sheet metadata to each transaction
      // Parse metadata JSON string if needed
      const parsedMetadata =
        typeof sheet.metadata === "string"
          ? JSON.parse(sheet.metadata)
          : sheet.metadata || {};

      transactions = sheet.transactions.map((tx) => ({
        ...tx,
        sheetName: sheet.name,
        fileName: fileImport.filename,
        sheetMetadata: parsedMetadata,
      }));

      metadata.sheetName = sheet.name;
      metadata.exportedCount = transactions.length;
    } else {
      // Export entire workbook
      const sheets = await prisma.sheetImport.findMany({
        where: {
          fileImportId: fileId,
        },
        include: {
          transactions: {
            where: {
              status: "UNMATCHED",
            },
          },
        },
        orderBy: {
          sheetOrder: "asc",
        },
      });

      // Aggregate transactions from all sheets
      for (const sheet of sheets) {
        // Parse metadata JSON string if needed
        const parsedMetadata =
          typeof sheet.metadata === "string"
            ? JSON.parse(sheet.metadata)
            : sheet.metadata || {};

        const sheetTransactions = sheet.transactions.map((tx) => ({
          ...tx,
          sheetName: sheet.name,
          fileName: fileImport.filename,
          sheetMetadata: parsedMetadata,
        }));
        transactions.push(...sheetTransactions);
      }

      metadata.totalSheets = sheets.length;
      metadata.exportedCount = transactions.length;
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        metadata,
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
