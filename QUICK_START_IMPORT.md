# Transaction Import - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
npm install
# If that fails, try:
npm cache clean --force && npm install
```

### Step 2: Run the Application

```bash
npm run dev
```

Visit: http://localhost:3000

### Step 3: Import Transactions

1. Log in with admin credentials:

   - Email: `admin@analyzerweb.com`
   - Password: `password123`

2. Click the **"Import"** tab in the header

3. Upload your Excel file:

   - Drag & drop OR click to browse
   - Supports: `.xlsx` and `.xls` files

4. Select a transaction set from the dropdown

5. View your transactions:
   - **Left Pane**: GL transactions (INT CR, INT DR)
   - **Right Pane**: Statement transactions (EXT DR, EXT CR)

## 📄 Excel File Format

### Minimum Required Structure:

```
| Amount  | Type   |
|---------|--------|
| 1500.00 | int cr |
| 800.00  | int dr |
```

### Recommended Structure:

```
| Date       | Description      | Amount  | Reference | Type   |
|------------|------------------|---------|-----------|--------|
| 2024-12-03 | Payment received | 1500.00 | REF-001   | int cr |
| 2024-12-03 | Vendor payment   | 800.00  | REF-002   | int dr |
| 2024-12-03 | Bank transfer    | 1500.00 | TXN-123   | ext dr |
| 2024-12-03 | Customer deposit | 800.00  | TXN-124   | ext cr |
```

### Transaction Types:

- `int cr` → Internal Credit (GL)
- `int dr` → Internal Debit (GL)
- `ext dr` → External Debit (Statement)
- `ext cr` → External Credit (Statement)

## 🎯 Key Features

✅ Drag-and-drop file upload
✅ Multi-sheet support
✅ Automatic column detection
✅ Dual-pane view (GL vs Statement)
✅ Transaction selection
✅ Real-time statistics
✅ Professional UI

## ❓ Troubleshooting

### Problem: Dependencies won't install

**Solution**:

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Problem: Import tab not visible

**Solution**: Make sure you're logged in with admin account

### Problem: File upload fails

**Solution**:

- Check file format (.xlsx or .xls)
- Verify file has transaction data
- Ensure amount column exists

### Problem: Transactions not appearing

**Solution**:

- Check transaction type column has valid values
- Verify sheet has data
- Look for errors in console (F12)

## 📚 Full Documentation

For complete details, see:

- [`TRANSACTION_IMPORT_GUIDE.md`](./TRANSACTION_IMPORT_GUIDE.md) - Full user guide
- [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md) - Technical details

## 🎉 You're Ready!

The transaction import engine is fully implemented and ready to use. Simply install dependencies and start uploading your transaction files!

---

**Need Help?** Check the console (F12) for error messages or review the full documentation.
