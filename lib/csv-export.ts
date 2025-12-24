// CSV Export Utility Functions
import { Transaction } from './types';

export interface ExportTransaction extends Transaction {
  sheetName?: string;
  fileName?: string;
  sheetMetadata?: Record<string, any>;
}

export interface ExportOptions {
  scope: 'current' | 'workbook';
  fileName: string;
  sheetName?: string;
}

/**
 * Escapes CSV field values according to RFC 4180
 * - Doubles internal quotes
 * - Wraps in quotes if contains comma, newline, or quote
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Check if field needs quoting
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Double internal quotes and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Generates CSV content from transaction data with complete field mapping
 */
export function generateCSV(transactions: ExportTransaction[], options: ExportOptions): string {
  if (transactions.length === 0) {
    // Return headers only for empty export - use minimal headers
    const headers = [
      'Serial Number', 'Date', 'Description', 'Amount', 'GL Reference',
      'Aging (Days)', 'Recon Type', 'Sheet Name', 'File Name', 'Export Date',
      'Transaction ID', 'Side', 'Status'
    ];
    return headers.join(',') + '\r\n';
  }

  // Build header row with dynamic metadata fields
  const headers = getCSVHeaders(transactions);
  const rows: string[] = [headers.join(',')];

  // Build data rows
  for (const transaction of transactions) {
    const row = buildCSVRow(transaction, options, headers);
    rows.push(row);
  }

  return rows.join('\r\n') + '\r\n';
}

/**
 * Defines CSV column headers in the correct order
 * Dynamically includes all metadata fields found in transactions
 */
function getCSVHeaders(transactions: ExportTransaction[]): string[] {
  // Fixed headers for standard fields
  const fixedHeaders = [
    // Original Excel Columns
    'Serial Number',
    'Date',
    'Description',
    'Amount',
    'GL Reference',
    'Aging (Days)',
    'Recon Type',
    // Contextual Fields
    'Sheet Name',
    'File Name',
    'Export Date',
    // Application Metadata
    'Transaction ID',
    'Side',
    'Status',
  ];
  
  // Dynamically discover all unique metadata keys from all transactions
  const metadataKeys = new Set<string>();
  for (const transaction of transactions) {
    const metadata = transaction.sheetMetadata || {};
    Object.keys(metadata).forEach(key => metadataKeys.add(key));
  }
  
  // Sort metadata keys alphabetically for consistent column ordering
  const sortedMetadataKeys = Array.from(metadataKeys).sort();
  
  // Combine fixed headers with dynamic metadata headers
  return [...fixedHeaders, ...sortedMetadataKeys];
}

/**
 * Builds a CSV row for a single transaction
 * Dynamically includes all metadata fields in the order specified by headers
 */
function buildCSVRow(
  transaction: ExportTransaction,
  options: ExportOptions,
  headers: string[]
): string {
  const metadata = transaction.sheetMetadata || {};
  const exportDate = new Date().toISOString();
  
  // Map transaction fields to CSV columns with fallbacks
  const fixedFields = [
    // Original Excel Columns
    transaction.sn || '',
    transaction.date,
    transaction.description,
    transaction.amount,
    transaction.glRefNo || transaction.reference || '',
    transaction.aging ?? '',
    transaction.recon || '',
    // Contextual Fields
    transaction.sheetName || options.sheetName || '',
    transaction.fileName || options.fileName,
    exportDate,
    // Application Metadata
    transaction.id,
    transaction.side,
    transaction.status,
  ];
  
  // Extract dynamic metadata fields in the order defined by headers
  // Headers after position 13 (0-indexed) are metadata fields
  const metadataFields = headers.slice(13).map(headerKey => {
    // Try to find the metadata value with case-insensitive matching
    const exactMatch = metadata[headerKey];
    if (exactMatch !== undefined) return exactMatch;
    
    // Try case-insensitive match for common variations
    const lowerKey = headerKey.toLowerCase();
    for (const [key, value] of Object.entries(metadata)) {
      if (key.toLowerCase() === lowerKey) {
        return value;
      }
    }
    
    return ''; // Return empty string if metadata field not found
  });
  
  // Combine fixed fields with dynamic metadata fields
  const allFields = [...fixedFields, ...metadataFields];

  // Escape and join fields
  return allFields.map(escapeCSVField).join(',');
}

/**
 * Triggers browser download of CSV file
 */
export function downloadCSV(csvContent: string, fileName: string): void {
  try {
    // Create Blob with UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create temporary download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    // Append to body, click, and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Revoke object URL to free memory
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('CSV download failed:', error);
    throw new Error('Failed to download CSV file');
  }
}

/**
 * Generates filename for export based on scope and timestamp
 */
export function generateExportFileName(options: ExportOptions): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '')
    .replace('T', '_');
  
  // Remove file extension from fileName if present
  const baseFileName = options.fileName.replace(/\.[^/.]+$/, '');
  
  if (options.scope === 'current' && options.sheetName) {
    // Current sheet: [FileName]_[SheetName]_Unmatched_[YYYYMMDD_HHMMSS].csv
    const safeSheetName = options.sheetName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${baseFileName}_${safeSheetName}_Unmatched_${timestamp}.csv`;
  } else {
    // Entire workbook: [FileName]_AllSheets_Unmatched_[YYYYMMDD_HHMMSS].csv
    return `${baseFileName}_AllSheets_Unmatched_${timestamp}.csv`;
  }
}

/**
 * Main export function that handles the complete export process
 */
export function exportTransactionsToCSV(
  transactions: ExportTransaction[],
  options: ExportOptions
): void {
  // Generate CSV content
  const csvContent = generateCSV(transactions, options);
  
  // Generate filename
  const fileName = generateExportFileName(options);
  
  // Trigger download
  downloadCSV(csvContent, fileName);
}
