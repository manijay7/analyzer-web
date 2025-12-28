// Custom Reconciliation Report Export Utility
import { ExportTransaction } from "./csv-export";

export interface ReconciliationReportOptions {
  scope: "current" | "workbook";
  fileName: string;
  sheetName?: string;
  metadata?: Record<string, any>;
  preparedBy?: string; // Name of the user who prepared the report (from sheet metadata)
  reviewedBy?: string; // Name of the current user who is reviewing/exporting the report
  sheetImport?: {
    metaData?: {
      bankName?: string;
      bankAccountNumber?: string;
      generalLedgerName?: string;
      generalLedgerNumber?: string;
      balancePerBankStatement?: number;
      reportingDate?: string;
      internalAccountBalance?: number;
      preparedBy?: string;
      reviewedBy?: string;
    };
  };
}

export interface ReconciliationReportData {
  metadata: {
    dept?: string;
    branch?: string;
    reportingDate?: string;
    reportingUnit?: string;
    bankAccountNumber?: string;
    generalLedgerName?: string;
    generalLedgerNumber?: string;
    operations?: string;
    headOffice?: string;
  };
  balancePerBankStatement: number;
  sections: {
    addDebitInBooksNotCreditedByBank: ExportTransaction[];
    addDebitByBankNotCreditedInBooks: ExportTransaction[];
    lessCreditByBankNotDebitedInBooks: ExportTransaction[];
    lessCreditInBooksNotDebitedByBank: ExportTransaction[];
  };
  preparedBy?: string;
  reviewedBy?: string;
  date?: string;
}

/**
 * Extracts bank name from metadata by splitting and taking first segment
 */
function extractBankName(metadata: Record<string, any>): string {
  const bankNameField =
    metadata["generalLedgerName"] ||
    metadata["BANK NAME"] ||
    metadata["bank name"] ||
    "";
  if (typeof bankNameField === "string" && bankNameField.includes(" ")) {
    return bankNameField.split(" ")[0];
  }
  return bankNameField || "BANK";
}

/**
 * Formats a date to dd-MMM-yyyy format (e.g., 27-Nov-25)
 */
function formatReportDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats currency values
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

/**
 * Escapes CSV field values
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Groups transactions by their reconciliation type
 */
function groupTransactionsByReconType(
  transactions: ExportTransaction[]
): ReconciliationReportData["sections"] {
  const sections: ReconciliationReportData["sections"] = {
    addDebitInBooksNotCreditedByBank: [],
    addDebitByBankNotCreditedInBooks: [],
    lessCreditByBankNotDebitedInBooks: [],
    lessCreditInBooksNotDebitedByBank: [],
  };

  transactions.forEach((tx) => {
    const recon = (tx.recon || "").toUpperCase();
    const side = tx.side?.toUpperCase() || "";

    // Determine which section this transaction belongs to
    if (recon.includes("INT DR")) {
      // Internal Debit (in our books)
      sections.addDebitInBooksNotCreditedByBank.push(tx);
    } else if (recon.includes("EXT DR")) {
      // External Debit (by bank)
      sections.addDebitByBankNotCreditedInBooks.push(tx);
    } else if (recon.includes("EXT CR")) {
      // External Credit (by bank)
      sections.lessCreditByBankNotDebitedInBooks.push(tx);
    } else if (recon.includes("INT CR")) {
      // Internal Credit (in our books)
      sections.lessCreditInBooksNotDebitedByBank.push(tx);
    }
  });

  return sections;
}

/**
 * Generates the custom reconciliation report in CSV format
 */
export function generateCustomReconciliationReport(
  transactions: ExportTransaction[],
  options: ReconciliationReportOptions
): string {
  console.log("generating report");
  const lines: string[] = [];
  const metadata = options.metadata || {};
  const sheetImportMeta = options.sheetImport?.metaData || {};

  // Extract metadata with fallbacks
  const dept = metadata["DEPT"] || sheetImportMeta["DEPT"] || "";
  const branch = metadata["BRANCH"] || sheetImportMeta["BRANCH"] || "";
  const reportingDate = formatReportDate(
    sheetImportMeta.reportingDate ||
      metadata["REPORTING DATE"] ||
      new Date().toISOString().split("T")[0]
  );
  const reportingUnit =
    metadata["REPORTING UNIT"] ||
    sheetImportMeta["REPORTING UNIT"] ||
    "RECONCILIATION";
  const bankAccountNumber =
    sheetImportMeta.bankAccountNumber || metadata["BANK ACCOUNT NUMBER"] || "";
  const generalLedgerName =
    sheetImportMeta.generalLedgerName || metadata["GENERAL LEDGER NAME"] || "";
  const generalLedgerNumber =
    sheetImportMeta.generalLedgerNumber ||
    metadata["GENERAL LEDGER NUMBER"] ||
    "";

  // Extract bank name using the specified logic
  const bankName = extractBankName({
    "bank name": sheetImportMeta.generalLedgerName || "",
  });

  const internalAccountBalance = sheetImportMeta.internalAccountBalance;

  // Row 1: Header row with column labels (with empty first column)
  lines.push(
    ",Field_1,Field_2,Field_3,Field_4,Field_5,Field_6,Field_7,Field_8,Field_9"
  );

  // Rows 2-4: Empty rows
  lines.push(",,,,,");
  lines.push(",,,,,");
  lines.push(",,,,,");

  // Row 5: DEPT information
  lines.push(
    `,DEPT,,OPERATIONS,,BANK ACCOUNT NUMBER,${escapeCSV(bankAccountNumber)}`
  );

  // Row 6: BRANCH information
  lines.push(
    `,BRANCH,,HEAD OFFICE,,GENERAL LEDGER NAME,${escapeCSV(generalLedgerName)}`
  );

  // Row 7: REPORTING DATE
  lines.push(
    `,REPORTING DATE,,${reportingDate},,GENERAL LEDGER NUMBER,${escapeCSV(
      generalLedgerNumber
    )}`
  );

  // Row 8: REPORTING UNIT
  lines.push(`,REPORTING UNIT,,RECONCILIATION,,,`);

  // Rows 9-11: Empty rows
  lines.push(",,,,,");
  lines.push(",,,,,");
  lines.push(",,,,,");

  // Row 12: Balance per bank statement
  const balanceAmount = sheetImportMeta.balancePerBankStatement;
  const balanceRow = 12; // Track the row number for the bank balance

  lines.push(
    `,,${reportingDate},BALANCE PER BANK STATEMENT,${escapeCSV(balanceAmount)}`
  );

  // Rows 13: Empty row
  lines.push(",,,,,");

  // Row 14: Transaction headers
  lines.push(",SN,DATE,DESCRIPTION,AMOUNT,GL Ref No.,AGING(DAYS),RECON");

  // Rows 15-17: Empty rows
  lines.push(",,,,,");
  lines.push(",,,,,");
  lines.push(",,,,,");

  // Group transactions
  const sections = groupTransactionsByReconType(transactions);

  // Row 18: First reconciliation section header
  lines.push(`,,,ADD: DEBIT IN OUR BOOKS BUT NOT CREDITED BY ${bankName}`);

  let currentRow = 19;
  let intDrTotalRow = 0;
  let extDrTotalRow = 0;
  let extCrTotalRow = 0;
  let intCrTotalRow = 0;

  // Map unmatched transactions for int dr transactions
  if (sections.addDebitInBooksNotCreditedByBank.length > 0) {
    const sectionStartRow = currentRow;
    sections.addDebitInBooksNotCreditedByBank.forEach((tx, index) => {
      const formattedDate = formatReportDate(tx.date);
      const amount = formatCurrency(tx.amount);
      const glRef = tx.glRefNo || tx.reference || "";
      const aging = tx.aging || "";
      const recon = tx.recon || "";

      lines.push(
        `,${escapeCSV(tx.sn || "")},${formattedDate},${escapeCSV(
          tx.description
        )},${escapeCSV(amount)},${escapeCSV(glRef)},${aging},${escapeCSV(
          recon
        )}`
      );
      currentRow++;
    });

    const sectionEndRow = currentRow - 1;
    // Row n: First total (Internal Debits)
    intDrTotalRow = currentRow;
    lines.push(`,,,TOTAL:,=SUM(E${sectionStartRow}:E${sectionEndRow})`);
    currentRow++;
  } else {
    intDrTotalRow = currentRow;
    lines.push(`,,,TOTAL:,0.00`);
    currentRow++;
  }

  // Rows 21-23: Empty rows
  lines.push(",,,,,");
  lines.push(",,,,,");
  lines.push(",,,,,");

  // Row 24: Second reconciliation section header
  lines.push(
    `,,,ADD: DEBIT ORIGINATED BY ${bankName} BUT NOT CREDITED IN OUR BOOKS`
  );

  // Map unmatched transactions for ext dr transactions
  currentRow = currentRow + 4;
  if (sections.addDebitByBankNotCreditedInBooks.length > 0) {
    const sectionStartRow = currentRow;
    sections.addDebitByBankNotCreditedInBooks.forEach((tx, index) => {
      const formattedDate = formatReportDate(tx.date);
      const amount = formatCurrency(tx.amount);
      const glRef = tx.glRefNo || tx.reference || "";
      const aging = tx.aging || "";
      const recon = tx.recon || "";

      lines.push(
        `,${escapeCSV(tx.sn || "")},${formattedDate},${escapeCSV(
          tx.description
        )},${escapeCSV(amount)},${escapeCSV(glRef)},${aging},${escapeCSV(
          recon
        )}`
      );
      currentRow++;
    });

    const sectionEndRow = currentRow - 1;
    // Row n: Second total (External Debits)
    extDrTotalRow = currentRow;
    lines.push(`,,,TOTAL:,=SUM(E${sectionStartRow}:E${sectionEndRow})`);
    currentRow++;
  } else {
    extDrTotalRow = currentRow;
    lines.push(`,,,TOTAL:,0.00`);
    currentRow++;
  }

  // Rows 27-29: Empty rows
  lines.push(",,,,,");
  lines.push(",,,,,");
  lines.push(",,,,,");

  // Row 30: Third reconciliation section header
  lines.push(
    `,,,LESS: CREDIT ORIGINATED BY ${bankName} BUT NOT DEBITED IN OUR BOOKS`
  );

  // Map unmatched transactions for ext cr transactions
  currentRow = currentRow + 4;
  if (sections.lessCreditByBankNotDebitedInBooks.length > 0) {
    const sectionStartRow = currentRow;
    sections.lessCreditByBankNotDebitedInBooks.forEach((tx, index) => {
      const formattedDate = formatReportDate(tx.date);
      const amount = formatCurrency(tx.amount);
      const glRef = tx.glRefNo || tx.reference || "";
      const aging = tx.aging || "";
      const recon = tx.recon || "";

      lines.push(
        `,${escapeCSV(tx.sn || "")},${formattedDate},${escapeCSV(
          tx.description
        )},${escapeCSV(amount)},${escapeCSV(glRef)},${aging},${escapeCSV(
          recon
        )}`
      );
      currentRow++;
    });

    const sectionEndRow = currentRow - 1;
    // Row n: Third total (External Credits)
    extCrTotalRow = currentRow;
    lines.push(`,,,TOTAL:,=SUM(E${sectionStartRow}:E${sectionEndRow})`);
    currentRow++;
  } else {
    extCrTotalRow = currentRow;
    lines.push(`,,,TOTAL:,0.00`);
    currentRow++;
  }

  // Rows 33-35: Empty rows
  lines.push(",,,,,");
  lines.push(",,,,,");
  lines.push(",,,,,");

  // Row 36: Fourth reconciliation section header
  lines.push(`,,,LESS: CREDIT IN OUR BOOKS BUT NOT DEBITED BY ${bankName}`);

  // Map unmatched transactions for int cr transactions
  currentRow = currentRow + 4;
  if (sections.lessCreditInBooksNotDebitedByBank.length > 0) {
    const sectionStartRow = currentRow;
    sections.lessCreditInBooksNotDebitedByBank.forEach((tx, index) => {
      const formattedDate = formatReportDate(tx.date);
      const amount = formatCurrency(tx.amount);
      const glRef = tx.glRefNo || tx.reference || "";
      const aging = tx.aging || "";
      const recon = tx.recon || "";

      lines.push(
        `,${escapeCSV(tx.sn || "")},${formattedDate},${escapeCSV(
          tx.description
        )},${escapeCSV(amount)},${escapeCSV(glRef)},${aging},${escapeCSV(
          recon
        )}`
      );
      currentRow++;
    });

    const sectionEndRow = currentRow - 1;
    // Row n: Fourth total (Internal Credits)
    intCrTotalRow = currentRow;
    lines.push(`,,,TOTAL:,=SUM(E${sectionStartRow}:E${sectionEndRow})`);
    currentRow++;
  } else {
    intCrTotalRow = currentRow;
    lines.push(`,,,TOTAL:,0.00`);
    currentRow++;
  }

  // Insert 2 rows (rows 39-40)
  lines.push(",,,,,");
  lines.push(",,,,,");

  // Build dynamic formula: Bank Balance + Total Int DR - Total Ext DR + Total Ext CR - Total Int CR
  const grandTotalFormula = `=ABS(E${balanceRow}+E${intDrTotalRow}-E${intCrTotalRow}+E${extDrTotalRow}-E${extCrTotalRow})`;

  // Row 41: Grand total header
  const grandTotalRow = currentRow + 2;
  lines.push(`,,,GRAND TOTAL,${grandTotalFormula},`);
  currentRow++;

  // Next Row: Internal account balance with dynamic formula
  const internalBalanceRow = grandTotalRow + 1;
  lines.push(
    `,,,INTERNAL ACCOUNT BALANCE AS AT ${reportingDate},${escapeCSV(
      internalAccountBalance
    )},`
  );
  currentRow++;

  // Row n: Difference calculation
  lines.push(`,,,DIFFERENCE,=E${internalBalanceRow}-E${grandTotalRow}`);

  lines.push(",,,,,");

  // Row n: Prepared by (from sheet metadata - who originally prepared it)
  const preparedBy =
    metadata["PREPARED BY:"] ||
    metadata["PREPARED BY"] ||
    sheetImportMeta["PREPARED BY:"] ||
    sheetImportMeta["PREPARED BY"] ||
    sheetImportMeta.preparedBy ||
    "Unknown";
  lines.push(`,,,PREPARED BY:,${escapeCSV(preparedBy)},DATE,${reportingDate},`);

  lines.push(",,,,,");

  // Row n: Reviewed by (current user who is exporting/reviewing)
  const reviewedBy = options.reviewedBy || "";
  lines.push(`,,,REVIEWED BY:,${escapeCSV(reviewedBy)},DATE,${reportingDate},`);

  return lines.join("\r\n") + "\r\n";
}

/**
 * Downloads the custom reconciliation report
 */
export function downloadCustomReconciliationReport(
  content: string,
  fileName: string
): void {
  try {
    // Create Blob with UTF-8 BOM for Excel compatibility
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });

    // Create temporary download link
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "")
      .replace("T", "_");

    const baseFileName = fileName.replace(/\.[^/.]+$/, "");
    const downloadFileName = `${baseFileName}_CustomReconciliationReport_${timestamp}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", downloadFileName);
    link.style.visibility = "hidden";

    // Append to body, click, and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke object URL to free memory
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error("Custom reconciliation report download failed:", error);
    throw new Error("Failed to download custom reconciliation report");
  }
}

/**
 * Main export function for custom reconciliation report
 */
export function exportCustomReconciliationReport(
  transactions: ExportTransaction[],
  options: ReconciliationReportOptions
): void {
  // Generate report content
  const content = generateCustomReconciliationReport(transactions, options);

  // Trigger download
  downloadCustomReconciliationReport(content, options.fileName);
}
