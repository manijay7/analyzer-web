import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET - List all Excel files in a folder
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get("path");

    if (!folderPath) {
      return NextResponse.json(
        { error: "Folder path is required" },
        { status: 400 }
      );
    }

    // Security check: ensure path is absolute and exists
    if (!path.isAbsolute(folderPath)) {
      return NextResponse.json(
        { error: "Folder path must be absolute" },
        { status: 400 }
      );
    }

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

    // Read directory contents
    const files = await fs.readdir(folderPath);

    // Filter for Excel files only
    const excelFiles = files.filter(
      (file) => file.endsWith(".xlsx") || file.endsWith(".xls")
    );

    // Get file stats for each Excel file
    const fileDetails = await Promise.all(
      excelFiles.map(async (filename) => {
        const filePath = path.join(folderPath, filename);
        const stats = await fs.stat(filePath);

        return {
          name: filename,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      folderPath,
      totalFiles: fileDetails.length,
      files: fileDetails,
    });
  } catch (error) {
    console.error("Folder sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to read folder",
      },
      { status: 500 }
    );
  }
}
