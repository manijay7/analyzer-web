# Transaction Import Enhancement

## Overview

The transaction import functionality has been enhanced with sheet filtering and duplicate detection capabilities to handle multi-sheet Excel workbooks containing account-specific transaction data.

## New Features

### 1. Multi-Sheet Processing

- **Processes all sheets** in the uploaded Excel workbook
- **Filters sheets** based on validation criteria
- **Populates dropdown** with only valid account sheets
- Each sheet is treated as a separate transaction set

### 2. Sheet Filtering by "dept" Keyword

- **Validation Criteria**: Only sheets containing the word "dept" (case-insensitive) in cells A1:D10 are processed
- **Range Scanned**: A1 through D10 (first 4 columns, first 10 rows)
- **Filtering Logic**:
  - Sheets without "dept" in the specified range are excluded
  - Excluded sheets don't appear in the select dropdown
  - Console logs show which sheets are skipped vs. processed

### 3. Duplicate Detection

- **Hash-based Detection**: Generates SHA-256 hash of file content
- **Filename Check**: Also checks for duplicate filenames
- **User Prompt**: When duplicate detected, user gets options:
  - **Override Existing**: Replace previously imported data
  - **Skip Import**: Cancel the import and keep existing data
- **Visual Feedback**: Yellow warning banner with import timestamp

## Technical Implementation

### Backend Changes (`app/api/transactions/import/route.ts`)

#### New Helper Functions

```typescript
// Check if sheet contains "dept" in cells A1:D10
function isValidAccountSheet(worksheet: XLSX.WorkSheet): boolean;

// Generate file hash for duplicate detection
function generateFileHash(buffer: Buffer): string;
```

#### Enhanced Parser

```typescript
function parseExcelFile(buffer: Buffer, fileName: string): TransactionSet[];
```

- Now accepts `fileName` parameter
- Filters sheets using `isValidAccountSheet()`
- Logs which sheets are processed vs. skipped

#### Duplicate Detection in POST Handler

- Generates file hash before parsing
- Checks in-memory storage for existing imports
- Returns 409 status code when duplicate found
- Accepts `override` parameter to bypass duplicate check
- Stores import metadata after successful processing

### Frontend Changes (`components/TransactionImporter.tsx`)

#### New State Variables

```typescript
const [uploadStatus, setUploadStatus] = useState<
  "idle" | "success" | "error" | "duplicate"
>("idle");
const [pendingFile, setPendingFile] = useState<File | null>(null);
const [duplicateInfo, setDuplicateInfo] = useState<any>(null);
```

#### Enhanced Upload Handler

```typescript
const handleFileUpload = async (file: File, override = false)
```

- Handles 409 response for duplicate detection
- Sends `override` flag when user chooses to override
- Manages pending file state during duplicate resolution

#### New User Actions

```typescript
const handleOverride = () => { ... }  // Re-upload with override flag
const handleSkip = () => { ... }      // Cancel and clear pending import
```

#### Duplicate Warning UI

- Yellow warning banner (instead of red error or green success)
- Shows previous import timestamp
- Two action buttons: "Override Existing" and "Skip Import"

## Usage Examples

### Example 1: Valid Multi-Sheet Workbook

```
Workbook: "Monthly_Transactions.xlsx"
├── Sheet1: "Account Summary"  ← Skipped (no "dept" in A1:D10)
├── Sheet2: "Dept 101"         ← Processed ✓
├── Sheet3: "Dept 102"         ← Processed ✓
└── Sheet4: "Notes"            ← Skipped (no "dept" in A1:D10)

Result: Dropdown shows 2 options:
- "Dept 101 - 2024-12-03 (45 transactions)"
- "Dept 102 - 2024-12-03 (32 transactions)"
```

### Example 2: Duplicate File Detection

```
First Upload:
✓ "Transactions_Nov.xlsx" uploaded successfully
  Hash: 3f7a8b9c... stored

Second Upload (same file):
⚠ Duplicate detected!
  Previous import: 12/3/2024, 10:30:45 AM

  [Override Existing] [Skip Import]
```

### Example 3: Sheet Filtering Console Output

```
[Import] Processing file: "OMNIBSIC RECON REPORT.xlsx"
[Import] Skipping sheet "Cover Page" - does not contain "dept" in A1:D10
[Import] Processing valid account sheet: "Dept 101 Transactions"
[Import] Processing valid account sheet: "Dept 102 Transactions"
[Import] Skipping sheet "Summary" - does not contain "dept" in A1:D10
[Import API] Successfully parsed 2 transaction set(s) from valid account sheets
```

## Data Flow

### Normal Import Flow

```
1. User uploads Excel file
2. Backend generates file hash
3. Backend checks for duplicates
4. Backend parses all sheets
5. Backend filters sheets by "dept" keyword
6. Frontend receives valid transaction sets
7. Dropdown populated with valid sheets only
8. User selects sheet to view
9. Transactions displayed in dual-pane view
```

### Duplicate Detection Flow

```
1. User uploads Excel file
2. Backend generates file hash
3. Backend finds existing import
4. Backend returns 409 with duplicate info
5. Frontend shows yellow warning
6. User chooses Override or Skip

   If Override:
   7a. Frontend re-uploads with override=true
   8a. Backend processes normally
   9a. New data replaces old data

   If Skip:
   7b. Frontend clears pending file
   8b. Import cancelled
```

## API Response Examples

### Successful Import

```json
{
  "success": true,
  "message": "Successfully imported 2 transaction set(s) from valid account sheets",
  "data": {
    "fileName": "transactions.xlsx",
    "fileSize": 45678,
    "uploadedAt": "2024-12-03T14:30:00.000Z",
    "fileHash": "3f7a8b9c...",
    "totalValidSheets": 2,
    "transactionSets": [
      {
        "id": "set-1-1733234400000",
        "name": "Dept 101",
        "date": "2024-12-03",
        "totalTransactions": 45,
        "glTransactions": { ... },
        "statementTransactions": { ... }
      },
      ...
    ]
  }
}
```

### Duplicate Detected

```json
{
  "success": false,
  "duplicate": true,
  "message": "File \"transactions.xlsx\" has already been imported",
  "existingImport": {
    "fileName": "transactions.xlsx",
    "uploadedAt": "2024-12-03T10:30:45.000Z"
  },
  "prompt": "Would you like to override the existing data or skip this import?"
}
```

## Configuration

### Sheet Validation Range

To change the range where "dept" is searched:

```typescript
// In isValidAccountSheet() function
const range = { s: { c: 0, r: 0 }, e: { c: 3, r: 9 } }; // A1:D10

// Modify to search A1:F15:
const range = { s: { c: 0, r: 0 }, e: { c: 5, r: 14 } };
```

### Validation Keyword

To change from "dept" to another keyword:

```typescript
// In isValidAccountSheet() function
if (cellValue.includes("dept")) {
  // Change 'dept' to your keyword
  return true;
}
```

### Case Sensitivity

Currently case-insensitive. To make case-sensitive:

```typescript
// Remove .toLowerCase() call
const cellValue = String(cell.v); // Instead of .toLowerCase()
if (cellValue.includes('Dept')) { // Use exact case
```

## Storage Note

**Current Implementation**: Duplicate detection uses in-memory storage

```typescript
const importedFiles = new Map<string, { ... }>();
```

**Limitation**: Import history is lost when server restarts

**Future Enhancement**: Move to database persistence

```typescript
// Recommended: Store in database table
CREATE TABLE imported_files (
  id VARCHAR(64) PRIMARY KEY,  -- file hash
  fileName VARCHAR(255),
  uploadedAt TIMESTAMP,
  userId VARCHAR(255),
  FOREIGN KEY (userId) REFERENCES User(id)
);
```

## Testing

### Test Case 1: Valid Sheet with "dept"

1. Create Excel with sheet containing "Dept 101" in cell A1
2. Upload file
3. Verify sheet appears in dropdown

### Test Case 2: Invalid Sheet without "dept"

1. Create Excel with sheet containing "Account 101" in cell A1
2. Upload file
3. Verify no transaction sets returned

### Test Case 3: Duplicate Detection

1. Upload file "test.xlsx"
2. Note success message
3. Upload same file again
4. Verify duplicate warning appears
5. Click "Override Existing"
6. Verify re-import succeeds

### Test Case 4: Mixed Valid/Invalid Sheets

1. Create workbook with:
   - Sheet1: Contains "dept" in B2
   - Sheet2: No "dept" anywhere
   - Sheet3: Contains "department" in C5
2. Upload file
3. Verify only valid sheets in dropdown

## Troubleshooting

### No Sheets Detected

**Problem**: All sheets filtered out  
**Solution**: Check if any sheet has "dept" (case-insensitive) in A1:D10 range

### Duplicate Detection Not Working

**Problem**: Same file not detected as duplicate  
**Solution**: Server may have restarted (in-memory storage cleared)

### Wrong Sheets Appearing

**Problem**: Sheets without "dept" showing up  
**Solution**: Check `isValidAccountSheet()` logic and range definition

## Performance Considerations

- **Large Files**: Parser processes all sheets sequentially
- **Many Sheets**: Each sheet validated before parsing
- **Hash Generation**: SHA-256 hashing is fast for typical Excel files
- **Memory Usage**: In-memory duplicate tracking scales with number of unique uploads

## Security Notes

- File hash prevents tampering detection
- Authentication required (NextAuth session check)
- File type validation (.xlsx, .xls only)
- Server-side processing only (no client-side Excel parsing)

## Future Enhancements

1. **Database Persistence**: Store import history in database
2. **User-Specific Imports**: Track imports per user
3. **Import History View**: Show list of all previous imports
4. **Bulk Delete**: Remove old imports
5. **Configurable Keywords**: Admin-configurable sheet validation
6. **Advanced Filtering**: Multiple keywords, regex patterns
7. **Sheet Preview**: Show sheet contents before import
8. **Partial Import**: Allow selecting specific sheets to import
