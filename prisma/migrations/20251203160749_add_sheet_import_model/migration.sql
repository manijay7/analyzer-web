-- CreateTable
CREATE TABLE "SheetImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fileImportId" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "intCrCount" INTEGER NOT NULL DEFAULT 0,
    "intDrCount" INTEGER NOT NULL DEFAULT 0,
    "extCrCount" INTEGER NOT NULL DEFAULT 0,
    "extDrCount" INTEGER NOT NULL DEFAULT 0,
    "reportingDate" TEXT,
    "sheetOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SheetImport_fileImportId_fkey" FOREIGN KEY ("fileImportId") REFERENCES "FileImport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FileImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT,
    "checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" TEXT,
    "sheetCount" INTEGER NOT NULL DEFAULT 0,
    "validSheetCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "FileImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FileImport" ("acceptedCount", "checksum", "errorDetails", "fileSize", "filename", "id", "mimeType", "processedAt", "processedCount", "rejectedCount", "status", "storagePath", "uploadedAt", "uploadedById") SELECT "acceptedCount", "checksum", "errorDetails", "fileSize", "filename", "id", "mimeType", "processedAt", "processedCount", "rejectedCount", "status", "storagePath", "uploadedAt", "uploadedById" FROM "FileImport";
DROP TABLE "FileImport";
ALTER TABLE "new_FileImport" RENAME TO "FileImport";
CREATE INDEX "FileImport_status_uploadedAt_idx" ON "FileImport"("status", "uploadedAt");
CREATE INDEX "FileImport_uploadedById_idx" ON "FileImport"("uploadedById");
CREATE INDEX "FileImport_checksum_idx" ON "FileImport"("checksum");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reference" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "type" TEXT,
    "matchId" TEXT,
    "importedById" TEXT,
    "fileImportId" TEXT,
    "sheetImportId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "contentHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "MatchGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_fileImportId_fkey" FOREIGN KEY ("fileImportId") REFERENCES "FileImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_sheetImportId_fkey" FOREIGN KEY ("sheetImportId") REFERENCES "SheetImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "archivedAt", "contentHash", "createdAt", "date", "description", "fileImportId", "id", "importedById", "isDeleted", "matchId", "reference", "side", "status", "updatedAt") SELECT "amount", "archivedAt", "contentHash", "createdAt", "date", "description", "fileImportId", "id", "importedById", "isDeleted", "matchId", "reference", "side", "status", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_date_side_status_idx" ON "Transaction"("date", "side", "status");
CREATE INDEX "Transaction_matchId_idx" ON "Transaction"("matchId");
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX "Transaction_contentHash_idx" ON "Transaction"("contentHash");
CREATE INDEX "Transaction_fileImportId_idx" ON "Transaction"("fileImportId");
CREATE INDEX "Transaction_sheetImportId_idx" ON "Transaction"("sheetImportId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SheetImport_fileImportId_idx" ON "SheetImport"("fileImportId");

-- CreateIndex
CREATE INDEX "SheetImport_reportingDate_idx" ON "SheetImport"("reportingDate");
