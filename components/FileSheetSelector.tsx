"use client";

import React from 'react';
import { RefreshCw, FileText } from 'lucide-react';

interface ImportedFile {
  id: string;
  filename: string;
  sheetCount: number;
  totalTransactions: number;
  sheets?: Sheet[];
}

interface Sheet {
  id: string;
  name: string;
  reportingDate: string;
  transactionCount: number;
}

interface FileSheetSelectorProps {
  importedFiles: ImportedFile[];
  selectedFileId: string;
  selectedSheetId: string;
  availableSheets: Sheet[];
  isLoading: boolean;
  sheetMetadata: Record<string, any> | null;
  onFileChange: (fileId: string) => void;
  onSheetChange: (sheetId: string) => void;
}

export const FileSheetSelector: React.FC<FileSheetSelectorProps> = ({
  importedFiles,
  selectedFileId,
  selectedSheetId,
  availableSheets,
  isLoading,
  sheetMetadata,
  onFileChange,
  onSheetChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-6">
        {/* Left: File & Sheet Selectors */}
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Import File
            </label>
            <select
              value={selectedFileId}
              onChange={(e) => onFileChange(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg text-sm px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">-- Select a file --</option>
              {importedFiles.map(file => (
                <option key={file.id} value={file.id}>
                  {file.filename} ({file.sheetCount} sheets, {file.totalTransactions} transactions)
                </option>
              ))}
            </select>
          </div>

          {availableSheets.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Sheet
              </label>
              <select
                value={selectedSheetId}
                onChange={(e) => onSheetChange(e.target.value)}
                disabled={isLoading}
                className="w-full bg-white border border-gray-300 rounded-lg text-sm px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Select a sheet --</option>
                {availableSheets.map(sheet => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.name} - {sheet.reportingDate} ({sheet.transactionCount} transactions)
                  </option>
                ))}
              </select>

              {isLoading && (
                <div className="flex items-center gap-2 mt-2 text-sm text-indigo-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading sheet data...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sheet Metadata */}
        {sheetMetadata && Object.keys(sheetMetadata).length > 0 && (
          <div className="flex-1 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Sheet Metadata
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {Object.entries(sheetMetadata).map(([key, value]) => (
                <div key={key} className="text-xs">
                  <span className="font-semibold text-gray-600">{key}:</span>
                  <span className="ml-2 text-gray-900">{value || 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};