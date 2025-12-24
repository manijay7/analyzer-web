"use client";

import React, { useState } from 'react';
import { X, FileText, FolderOpen, Download, AlertCircle, Loader2 } from 'lucide-react';

interface ExportScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (scope: 'current' | 'workbook') => Promise<void>;
  currentSheetName: string;
  currentSheetUnmatchedCount: number;
  workbookName: string;
  totalSheetsCount: number;
  totalWorkbookUnmatchedCount?: number;
}

export const ExportScopeModal: React.FC<ExportScopeModalProps> = ({
  isOpen,
  onClose,
  onExport,
  currentSheetName,
  currentSheetUnmatchedCount,
  workbookName,
  totalSheetsCount,
  totalWorkbookUnmatchedCount,
}) => {
  const [selectedScope, setSelectedScope] = useState<'current' | 'workbook'>('current');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await onExport(selectedScope);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isExporting) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full transform transition-all animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="export-modal-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Download className="w-6 h-6 text-indigo-600" />
            Export Unmatched Transactions
          </h2>
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Choose the scope of transactions to export:
          </p>

          {/* Scope Options */}
          <div className="space-y-3">
            {/* Current Sheet Option */}
            <button
              onClick={() => setSelectedScope('current')}
              disabled={isExporting}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedScope === 'current'
                  ? 'border-indigo-600 bg-indigo-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-pressed={selectedScope === 'current'}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedScope === 'current' ? 'bg-indigo-100' : 'bg-gray-100'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    selectedScope === 'current' ? 'text-indigo-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Current Sheet Only</div>
                  <div className="text-sm text-gray-600 mb-2">
                    Export unmatched transactions from <span className="font-medium">{currentSheetName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Transaction Count:</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                      selectedScope === 'current' 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {currentSheetUnmatchedCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedScope === 'current'
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedScope === 'current' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* Entire Workbook Option */}
            <button
              onClick={() => setSelectedScope('workbook')}
              disabled={isExporting}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedScope === 'workbook'
                  ? 'border-indigo-600 bg-indigo-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-pressed={selectedScope === 'workbook'}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedScope === 'workbook' ? 'bg-indigo-100' : 'bg-gray-100'
                }`}>
                  <FolderOpen className={`w-5 h-5 ${
                    selectedScope === 'workbook' ? 'text-indigo-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Entire Workbook</div>
                  <div className="text-sm text-gray-600 mb-2">
                    Export unmatched transactions from all sheets in <span className="font-medium">{workbookName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Total Sheets:</span>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                        selectedScope === 'workbook' 
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {totalSheetsCount}
                      </span>
                    </div>
                    {totalWorkbookUnmatchedCount !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Transactions:</span>
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                          selectedScope === 'workbook' 
                            ? 'bg-indigo-100 text-indigo-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {totalWorkbookUnmatchedCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedScope === 'workbook'
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedScope === 'workbook' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Warning for empty export */}
          {((selectedScope === 'current' && currentSheetUnmatchedCount === 0) ||
            (selectedScope === 'workbook' && totalWorkbookUnmatchedCount === 0)) && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>No unmatched transactions found.</strong> The export will generate a file with headers only.
              </div>
            </div>
          )}

          {/* Export info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <strong>Export includes:</strong> All original Excel columns (SN, Date, Description, Amount, GL Reference, Aging, Recon Type) + Sheet metadata (Department, Branch, Account, Currency) + Application metadata
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {selectedScope === 'current' ? 'Current Sheet' : 'Entire Workbook'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
