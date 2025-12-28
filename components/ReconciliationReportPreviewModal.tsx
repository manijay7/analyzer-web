"use client";

import React, { useMemo } from 'react';
import { X, Download, FileText, Eye } from 'lucide-react';
import { ExportTransaction } from '@/lib/csv-export';
import { ReconciliationReportOptions, generateCustomReconciliationReport } from '@/lib/reconciliation-report-export';

interface ReconciliationReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: () => void;
  transactions: ExportTransaction[];
  options: ReconciliationReportOptions;
}

export const ReconciliationReportPreviewModal: React.FC<ReconciliationReportPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmExport,
  transactions,
  options,
}) => {
  // Generate preview data
  const previewData = useMemo(() => {
    if (!isOpen || transactions.length === 0) return [];
    
    // Generate the CSV content
    const csvContent = generateCustomReconciliationReport(transactions, options);
    
    // Parse CSV into rows and cells
    const rows = csvContent.split('\r\n').filter(line => line.trim());
    return rows.map(row => {
      // Simple CSV parsing (handles quoted fields)
      const cells: string[] = [];
      let currentCell = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentCell += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of cell
          cells.push(currentCell);
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      // Add last cell
      cells.push(currentCell);
      
      return cells;
    });
  }, [isOpen, transactions, options]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Helper to determine if a cell contains a formula
  const isFormula = (value: string): boolean => {
    return value.startsWith('=');
  };

  // Helper to determine cell styling based on content
  const getCellStyle = (value: string, rowIndex: number, colIndex: number): string => {
    const baseStyle = 'px-3 py-2 text-sm border-r border-b border-gray-200';
    
    // Header row
    if (rowIndex === 0) {
      return `${baseStyle} bg-gray-100 font-semibold text-gray-700`;
    }
    
    // Empty first column
    if (colIndex === 0) {
      return `${baseStyle} bg-gray-50 w-8`;
    }
    
    // Formula cells
    if (isFormula(value)) {
      return `${baseStyle} bg-blue-50 font-mono text-blue-700 text-xs`;
    }
    
    // Section headers (contain "ADD:" or "LESS:")
    if (value.includes('ADD:') || value.includes('LESS:')) {
      return `${baseStyle} bg-indigo-50 font-bold text-indigo-900`;
    }
    
    // Total rows
    if (value.includes('TOTAL:') || value.includes('GRAND TOTAL')) {
      return `${baseStyle} bg-yellow-50 font-bold text-gray-900`;
    }
    
    // Metadata fields (DEPT, BRANCH, etc.)
    if (value.includes('DEPT') || value.includes('BRANCH') || value.includes('REPORTING') || 
        value.includes('BALANCE PER') || value.includes('INTERNAL ACCOUNT') ||
        value.includes('PREPARED BY') || value.includes('REVIEWED BY') || value.includes('DIFFERENCE')) {
      return `${baseStyle} bg-green-50 font-semibold text-green-900`;
    }
    
    // Regular cells
    return `${baseStyle} text-gray-700`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col transform transition-all animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div>
            <h2 id="preview-modal-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-6 h-6 text-indigo-600" />
              Reconciliation Report Preview
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Review the report format before exporting to CSV
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <tbody>
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                      {row.map((cell, colIndex) => (
                        <td
                          key={colIndex}
                          className={getCellStyle(cell, rowIndex, colIndex)}
                        >
                          {cell || (colIndex === 0 ? '' : '\u00A0')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Preview Legend
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span className="text-gray-600">Header Row</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50 border border-gray-300 rounded"></div>
                <span className="text-gray-600">Metadata Fields</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-indigo-50 border border-gray-300 rounded"></div>
                <span className="text-gray-600">Section Headers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-50 border border-gray-300 rounded"></div>
                <span className="text-gray-600">Totals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-50 border border-gray-300 rounded"></div>
                <span className="text-gray-600">Formulas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-50 border border-gray-300 rounded"></div>
                <span className="text-gray-600">Empty Column</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <strong>{previewData.length}</strong> rows • 
            <strong className="ml-2">{transactions.length}</strong> transactions • 
            <span className="ml-2">Format: Reconciliation Report (CSV)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmExport}
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
