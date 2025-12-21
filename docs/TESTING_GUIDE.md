# Quick Test Guide - Enhanced Import Features

## Prerequisites

- xlsx package installed (`npm install xlsx`)
- Development server running (`npm run dev`)
- Logged in to the application
- Sample Excel file with multiple sheets

## Test 1: Sheet Filtering by "dept" Keyword

### Setup Test File

Create an Excel file with these sheets:

- **Sheet 1**: Add "Department 101" in cell A1
- **Sheet 2**: Add "Dept 102" in cell B3
- **Sheet 3**: Add "Account Summary" (no "dept" anywhere in A1:D10)
- **Sheet 4**: Add "dept code: 103" in cell D10

### Expected Result

- ✅ Sheets 1, 2, and 4 should be processed
- ❌ Sheet 3 should be skipped
- Dropdown shows 3 transaction sets

### How to Verify

1. Open browser console (F12)
2. Upload the test file
3. Check console logs for:
   ```
   [Import] Processing valid account sheet: "Sheet 1"
   [Import] Processing valid account sheet: "Sheet 2"
   [Import] Skipping sheet "Sheet 3" - does not contain "dept" in A1:D10
   [Import] Processing valid account sheet: "Sheet 4"
   ```
4. Verify dropdown only shows valid sheets

## Test 2: Duplicate Detection

### Test Steps

1. **First Upload**:

   - Upload file "test_transactions.xlsx"
   - Wait for green success message
   - Note the timestamp

2. **Second Upload (Same File)**:

   - Upload the same file again
   - Should see yellow warning banner
   - Message: "File 'test_transactions.xlsx' has already been imported"
   - Previous import timestamp displayed

3. **Test Override**:

   - Click "Override Existing" button
   - File should re-upload successfully
   - Green success message appears

4. **Test Skip**:
   - Upload the file a third time
   - Click "Skip Import" button
   - Warning should disappear
   - No import occurs

### Expected Behavior

| Action             | Status Color   | Buttons Shown   |
| ------------------ | -------------- | --------------- |
| First upload       | Green          | ❌ (X to clear) |
| Duplicate detected | Yellow         | Override, Skip  |
| Override clicked   | Green          | ❌ (X to clear) |
| Skip clicked       | None (cleared) | -               |

## Test 3: Multi-Sheet Processing

### Sample File Structure

Use the provided "OMNIBSIC RECON REPORT_AS_AT_201125 DD.xlsx" or create:

```
transactions.xlsx
├── Cover (no "dept") → SKIPPED
├── Dept 101 GL      → PROCESSED
├── Dept 102 GL      → PROCESSED
├── Dept 103 GL      → PROCESSED
└── Summary (no "dept") → SKIPPED
```

### Verification Steps

1. Upload file
2. Open dropdown selector
3. Count number of options
4. Should equal number of sheets with "dept" in A1:D10
5. Click each option to view transactions

## Test 4: No Valid Sheets

### Setup

Create Excel with only these sheets:

- "Cover Page"
- "Instructions"
- "Summary"

(None contain "dept" in A1:D10)

### Expected Result

- Error message: "No valid transactions found in the file"
- Red error banner
- No dropdown appears

## Test 5: Real Excel Data

### Using Your Actual Data

1. Use your real Excel file with account sheets
2. Ensure each account sheet has "dept" somewhere in cells A1:D10
3. Upload the file
4. Check console logs to see which sheets are processed
5. Verify dropdown shows all department sheets

### Example Console Output

```
[Import] Skipping sheet "Cover Page" - does not contain "dept" in A1:D10
[Import] Processing valid account sheet: "Dept 101 - Checking"
[Import] Processing valid account sheet: "Dept 102 - Savings"
[Import] Processing valid account sheet: "Dept 103 - Operations"
[Import] Skipping sheet "Summary Report" - does not contain "dept" in A1:D10
[Import API] Successfully parsed 3 transaction set(s) from valid account sheets
```

## Test 6: Edge Cases

### Test 6a: "dept" at Boundary (D10)

- Put "dept" in cell D10 (last cell of range)
- Should be detected ✅

### Test 6b: "dept" Just Outside Range (E10)

- Put "dept" in cell E10 (outside range)
- Should NOT be detected ❌

### Test 6c: "dept" Below Range (A11)

- Put "dept" in cell A11 (row 11)
- Should NOT be detected ❌

### Test 6d: Case Variations

Test these values in A1:

- "Dept" → ✅ Detected
- "DEPT" → ✅ Detected
- "dept" → ✅ Detected
- "Department" → ✅ Detected (contains "dept")
- "Depot" → ✅ Detected (contains "dept")
- "Depth" → ✅ Detected (contains "dept")

### Test 6e: Different File Same Name

1. Upload "test.xlsx" (Version 1)
2. Upload different "test.xlsx" (Version 2, different content)
3. Should detect as duplicate by filename
4. Hash would be different but filename check triggers

### Test 6f: Same Content Different Name

1. Upload "november.xlsx"
2. Rename to "november_backup.xlsx"
3. Upload renamed file
4. Should detect as duplicate by content hash
5. Different filename but same hash triggers

## Quick Verification Checklist

- [ ] Only sheets with "dept" in A1:D10 appear in dropdown
- [ ] Duplicate files show yellow warning
- [ ] "Override Existing" button works
- [ ] "Skip Import" button works
- [ ] Console logs show which sheets are processed/skipped
- [ ] Success message mentions "valid account sheets"
- [ ] Previous import timestamp shown in duplicate warning
- [ ] Multiple valid sheets all appear in dropdown
- [ ] Invalid sheets don't appear in dropdown

## Common Issues & Solutions

### Issue: All sheets filtered out

**Cause**: No sheets have "dept" in A1:D10  
**Solution**: Add "dept" keyword to cells A1:D10 in at least one sheet

### Issue: Duplicate not detected

**Cause**: Server restarted (in-memory storage cleared)  
**Solution**: This is expected behavior with current implementation

### Issue: TypeScript errors in editor

**Cause**: LSP hasn't updated  
**Solution**: These are cosmetic, application will run correctly

### Issue: Import fails silently

**Cause**: Authentication may have expired  
**Solution**: Refresh page and log in again

## API Testing with cURL

### Test Normal Upload

```bash
curl -X POST http://localhost:3000/api/transactions/import \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -F "file=@transactions.xlsx"
```

### Test Override

```bash
curl -X POST http://localhost:3000/api/transactions/import \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -F "file=@transactions.xlsx" \
  -F "override=true"
```

## Browser Console Commands

### Check import history

```javascript
// This only works if you expose importedFiles (currently not exposed)
// For debugging, you can add a GET endpoint
```

### Check current transaction sets

```javascript
// In browser console after import
console.log("Current sets:", transactionSets);
```

## Performance Testing

### Large File Test

1. Create Excel with 50+ sheets
2. Ensure ~25 have "dept" in A1:D10
3. Upload and measure time
4. Check console for processing logs
5. Verify all valid sheets detected

### Many Transactions Test

1. Create sheet with 1000+ transaction rows
2. Ensure sheet has "dept" in header
3. Upload and check parsing time
4. Verify all transactions loaded

## Success Criteria

All tests should show:

- ✅ Only valid sheets (with "dept") processed
- ✅ Invalid sheets skipped with log message
- ✅ Duplicate detection working
- ✅ Override functionality working
- ✅ Skip functionality working
- ✅ Dropdown populated correctly
- ✅ Transactions display in dual-pane view
- ✅ No console errors (except cosmetic TS errors)

## Next Steps After Testing

If all tests pass:

1. Consider moving duplicate tracking to database
2. Add user-specific import tracking
3. Add import history view
4. Consider making "dept" keyword configurable

If tests fail:

1. Check console logs for errors
2. Verify xlsx package installed
3. Check file format (must be .xlsx or .xls)
4. Verify authentication working
5. Check server is running
