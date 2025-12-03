-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ANALYST',
    "status" TEXT NOT NULL DEFAULT 'active',
    "avatar" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "lastLogin" DATETIME,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "passwordChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reference" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "matchId" TEXT,
    "importedById" TEXT,
    "fileImportId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "contentHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "MatchGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_fileImportId_fkey" FOREIGN KEY ("fileImportId") REFERENCES "FileImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftTransactionIds" TEXT NOT NULL,
    "rightTransactionIds" TEXT NOT NULL,
    "totalLeft" REAL NOT NULL,
    "totalRight" REAL NOT NULL,
    "difference" REAL NOT NULL,
    "adjustment" REAL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "matchByUserId" TEXT,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchGroup_matchByUserId_fkey" FOREIGN KEY ("matchByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MatchGroup_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "deviceFingerprint" TEXT,
    "geolocation" TEXT,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeState" TEXT,
    "afterState" TEXT,
    "changeSummary" TEXT NOT NULL,
    "justification" TEXT,
    "previousHash" TEXT,
    "currentHash" TEXT,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "transactions" TEXT NOT NULL,
    "matches" TEXT NOT NULL,
    "selectedDate" TEXT NOT NULL,
    "stats" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    CONSTRAINT "SystemSnapshot_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoleRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "requestedRole" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    CONSTRAINT "RoleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "location" TEXT,
    "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" DATETIME,
    "closedBy" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FileImport" (
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
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "FileImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Transaction_date_side_status_idx" ON "Transaction"("date", "side", "status");

-- CreateIndex
CREATE INDEX "Transaction_matchId_idx" ON "Transaction"("matchId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_contentHash_idx" ON "Transaction"("contentHash");

-- CreateIndex
CREATE INDEX "Transaction_fileImportId_idx" ON "Transaction"("fileImportId");

-- CreateIndex
CREATE INDEX "MatchGroup_status_timestamp_idx" ON "MatchGroup"("status", "timestamp");

-- CreateIndex
CREATE INDEX "MatchGroup_matchByUserId_idx" ON "MatchGroup"("matchByUserId");

-- CreateIndex
CREATE INDEX "MatchGroup_approvedById_idx" ON "MatchGroup"("approvedById");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_userId_actionType_idx" ON "AuditLog"("timestamp", "userId", "actionType");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "SystemSnapshot_timestamp_idx" ON "SystemSnapshot"("timestamp");

-- CreateIndex
CREATE INDEX "SystemSnapshot_createdByUserId_idx" ON "SystemSnapshot"("createdByUserId");

-- CreateIndex
CREATE INDEX "RoleRequest_status_timestamp_idx" ON "RoleRequest"("status", "timestamp");

-- CreateIndex
CREATE INDEX "RoleRequest_userId_idx" ON "RoleRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSession_token_key" ON "DeviceSession"("token");

-- CreateIndex
CREATE INDEX "DeviceSession_userId_lastActive_idx" ON "DeviceSession"("userId", "lastActive");

-- CreateIndex
CREATE INDEX "DeviceSession_token_idx" ON "DeviceSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPeriod_name_key" ON "FinancialPeriod"("name");

-- CreateIndex
CREATE INDEX "FinancialPeriod_startDate_endDate_idx" ON "FinancialPeriod"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "FinancialPeriod_isClosed_idx" ON "FinancialPeriod"("isClosed");

-- CreateIndex
CREATE INDEX "FileImport_status_uploadedAt_idx" ON "FileImport"("status", "uploadedAt");

-- CreateIndex
CREATE INDEX "FileImport_uploadedById_idx" ON "FileImport"("uploadedById");

-- CreateIndex
CREATE INDEX "FileImport_checksum_idx" ON "FileImport"("checksum");
