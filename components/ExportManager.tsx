"use client";

import React, { useState } from 'react';
import { User, UserRole, Permission, RolePermissions, Transaction, TransactionStatus } from '@/lib/types';
import { ExportScopeModal, ExportFormat } from './ExportScopeModal';
import { ReconciliationReportPreviewModal } from './ReconciliationReportPreviewModal';
import { exportTransactionsToCSV, ExportTransaction } from '@/lib/csv-export';
import { exportCustomReconciliationReport } from '@/lib/reconciliation-report-export';

interface ExportManagerProps {
  currentUser: User;
  rolePermissions: RolePermissions;
  transactions: Transaction[];
  selectedFileId: string | null;
  selectedSheetId: string | null;
  importedFiles: any[];
  availableSheets: any[];
  sheetMetadata: any;
  onAuditLog: (action: string, details: string) => void;
}

export const ExportManager: React.FC<ExportManagerProps> = ({
  currentUser,
  rolePermissions,
  transactions,
  selectedFileId,
  selectedSheetId,
  importedFiles,
  availableSheets,
  sheetMetadata,
  onAuditLog,
}) => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewTransactions, setPreviewTransactions] = useState<ExportTransaction[]>([]);
  const [previewOptions, setPreviewOptions] = useState<any>(null);

  const hasPermission = (role: UserRole, permission: Permission): boolean => {
    return rolePermissions[role]?.includes(permission) ?? false;
  };

  const handleExport = () => {
    if (!hasPermission(currentUser.role, 'export_data')) {
      alert("Permission Denied.");
      return;
    }

    // Check if sheet is selected
    if (!selectedSheetId) {
      alert("Please select a sheet first.");
      return;
    }

    // Open export scope modal
    setIsExportModalOpen(true);
  };

  const executeExport = async (scope: 'current' | 'workbook', format: ExportFormat) => {
    try {
      const selectedFile = importedFiles.find(f => f.id === selectedFileId);
      const selectedSheet = availableSheets.find(s => s.id === selectedSheetId);

      if (!selectedFile) {
        throw new Error('File not found');
      }

      let exportTransactions: ExportTransaction[] = [];

      if (scope === 'current') {
        // Export current sheet - use in-memory transactions
        const unmatchedTxs = transactions.filter(t => t.status === TransactionStatus.Unmatched);

        exportTransactions = unmatchedTxs.map(tx => ({
          ...tx,
          sheetName: selectedSheet?.name || '',
          fileName: selectedFile.filename,
          sheetMetadata: sheetMetadata || {},
        }));

        // Export based on selected format
        if (format === 'reconciliation') {
          exportCustomReconciliationReport(exportTransactions, {
            scope: 'current',
            fileName: selectedFile.filename,
            sheetName: selectedSheet?.name,
            metadata: sheetMetadata || {},
            reviewedBy: currentUser.name,
            sheetImport: {
              metaData: {
                bankName: sheetMetadata?.['bank name'] || sheetMetadata?.['BANK NAME'] || '',
                bankAccountNumber: sheetMetadata?.['BANK ACCOUNT NUMBER'] || '',
                generalLedgerName: sheetMetadata?.['GENERAL LEDGER NAME'] || '',
                generalLedgerNumber: sheetMetadata?.['GENERAL LEDGER NUMBER'] || '',
                balancePerBankStatement: sheetMetadata?.['BALANCE PER BANK STATEMENT'] || 0,
                internalAccountBalance: sheetMetadata?.['INTERNAL ACCOUNT BALANCE AS AT'] || 0,
                reportingDate: selectedSheet?.reportingDate || '',
              }
            }
          });
        } else {
          exportTransactionsToCSV(exportTransactions, {
            scope: 'current',
            fileName: selectedFile.filename,
            sheetName: selectedSheet?.name,
          });
        }

        onAuditLog(
          "Export",
          `Exported ${exportTransactions.length} unmatched transactions from sheet "${selectedSheet?.name}" (Format: ${format})`
        );
      } else {
        // Export entire workbook - fetch from API
        const response = await fetch('/api/transactions/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: selectedFileId,
            scope: 'workbook',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch workbook data');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Export failed');
        }

        exportTransactions = result.data.transactions;

        // Export based on selected format
        if (format === 'reconciliation') {
          exportCustomReconciliationReport(exportTransactions, {
            scope: 'workbook',
            fileName: selectedFile.filename,
            metadata: sheetMetadata || {},
            reviewedBy: currentUser.name,
            sheetImport: {
              metaData: {
                bankName: sheetMetadata?.['GENERAL LEDGER NAME'] || sheetMetadata?.['BANK NAME'] || '',
                bankAccountNumber: sheetMetadata?.['BANK ACCOUNT NUMBER'] || '',
                generalLedgerName: sheetMetadata?.['GENERAL LEDGER NAME'] || '',
                generalLedgerNumber: sheetMetadata?.['GENERAL LEDGER NUMBER'] || '',
                balancePerBankStatement: sheetMetadata?.['BALANCE PER BANK STATEMENT'] || 0,
                reportingDate: '',
              }
            }
          });
        } else {
          exportTransactionsToCSV(exportTransactions, {
            scope: 'workbook',
            fileName: selectedFile.filename,
          });
        }

        onAuditLog(
          "Export",
          `Exported ${exportTransactions.length} unmatched transactions from ${result.data.metadata.totalSheets} sheets in workbook "${selectedFile.filename}" (Format: ${format})`
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
      throw error;
    }
  };

  const handlePreview = (scope: 'current' | 'workbook') => {
    const selectedFile = importedFiles.find(f => f.id === selectedFileId);
    const selectedSheet = availableSheets.find(s => s.id === selectedSheetId);

    if (!selectedFile) {
      alert('File not found');
      return;
    }

    // For preview, we only support current sheet (workbook preview would be too complex)
    if (scope === 'workbook') {
      alert('Preview is only available for current sheet. Workbook exports can be downloaded directly.');
      return;
    }

    // Prepare transactions for preview
    const unmatchedTxs = transactions.filter(t => t.status === TransactionStatus.Unmatched);

    const exportTransactions: ExportTransaction[] = unmatchedTxs.map(tx => ({
      ...tx,
      sheetName: selectedSheet?.name || '',
      fileName: selectedFile.filename,
      sheetMetadata: sheetMetadata || {},
    }));

    // Prepare options
    const options = {
      scope: 'current' as const,
      fileName: selectedFile.filename,
      sheetName: selectedSheet?.name,
      metadata: sheetMetadata || {},
      reviewedBy: currentUser.name,
      sheetImport: {
        metaData: {
          bankName: sheetMetadata?.['bank name'] || sheetMetadata?.['BANK NAME'] || '',
          bankAccountNumber: sheetMetadata?.['BANK ACCOUNT NUMBER'] || '',
          generalLedgerName: sheetMetadata?.['GENERAL LEDGER NAME'] || '',
          generalLedgerNumber: sheetMetadata?.['GENERAL LEDGER NUMBER'] || '',
          balancePerBankStatement: sheetMetadata?.['BALANCE PER BANK STATEMENT'] || 0,
          internalAccountBalance: sheetMetadata?.['INTERNAL ACCOUNT BALANCE AS AT'] || 0,
          reportingDate: selectedSheet?.reportingDate || '',
        }
      }
    };

    setPreviewTransactions(exportTransactions);
    setPreviewOptions(options);
    setIsPreviewModalOpen(true);
  };

  const handleConfirmExportFromPreview = () => {
    setIsPreviewModalOpen(false);

    // Execute the export with the same data
    if (previewTransactions.length > 0 && previewOptions) {
      exportCustomReconciliationReport(previewTransactions, previewOptions);

      onAuditLog(
        "Export",
        `Exported ${previewTransactions.length} unmatched transactions from sheet "${previewOptions.sheetName}" (Format: reconciliation)`
      );
    }
  };

  return (
    <>
      <ExportScopeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={executeExport}
        onPreview={handlePreview}
        currentSheetName={availableSheets.find(s => s.id === selectedSheetId)?.name || ''}
        currentSheetUnmatchedCount={transactions.filter(t => t.status === TransactionStatus.Unmatched).length}
        workbookName={importedFiles.find(f => f.id === selectedFileId)?.filename || ''}
        totalSheetsCount={availableSheets.length}
        totalWorkbookUnmatchedCount={undefined}
      />

      <ReconciliationReportPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onConfirmExport={handleConfirmExportFromPreview}
        transactions={previewTransactions}
        options={previewOptions}
      />

      {/* Export trigger - this would be called by parent component */}
      <button onClick={handleExport} style={{ display: 'none' }} id="export-trigger" />
    </>
  );
};