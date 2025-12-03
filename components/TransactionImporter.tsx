"use client";

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X, Download } from 'lucide-react';

export interface ImportedTransaction {
  date: string;
  description: string;
  amount: number;
  reference: string;
  type: 'int cr' | 'int dr' | 'ext dr' | 'ext cr';
  [key: string]: any;
}

export interface TransactionSet {
  id: string;
  name: string;
  date: string;
  totalTransactions: number;
  glTransactions: {
    intCr: ImportedTransaction[];
    intDr: ImportedTransaction[];
  };
  statementTransactions: {
    extDr: ImportedTransaction[];
    extCr: ImportedTransaction[];
  };
  metadata?: Record<string, any>; // Sheet metadata (DEPT, BRANCH, etc.)
}

interface TransactionImporterProps {
  onImportComplete: (transactionSets: TransactionSet[]) => void;
  onSelectSet: (set: TransactionSet) => void;
}

export const TransactionImporter: React.FC<TransactionImporterProps> = ({
  onImportComplete,
  onSelectSet,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [transactionSets, setTransactionSets] = useState<TransactionSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, override = false) => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setStatusMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (override) {
        formData.append('override', 'true');
      }

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.status === 409 && result.duplicate) {
        // Handle duplicate file
        setUploadStatus('duplicate');
        setStatusMessage(result.message);
        setDuplicateInfo(result.existingImport);
        setPendingFile(file);
      } else if (response.ok && result.success) {
        const sets = result.data.transactionSets;
        setTransactionSets(sets);
        setUploadStatus('success');
        setStatusMessage(result.message);
        setPendingFile(null);
        setDuplicateInfo(null);
        onImportComplete(sets);

        // Auto-select first set if available - fetch full data
        if (sets.length > 0) {
          setSelectedSetId(sets[0].id);
          
          // Fetch full sheet data for first sheet
          try {
            const sheetResponse = await fetch(`/api/transactions/sheets?sheetId=${sets[0].id}`);
            const sheetResult = await sheetResponse.json();
            
            if (sheetResult.success && sheetResult.data) {
              const fullSet: TransactionSet = {
                id: sheetResult.data.id,
                name: sheetResult.data.name,
                date: sheetResult.data.reportingDate || sets[0].date,
                totalTransactions: sheetResult.data.totalTransactions,
                glTransactions: sheetResult.data.glTransactions,
                statementTransactions: sheetResult.data.statementTransactions,
                metadata: sheetResult.data.metadata,
              };
              
              // Update first set with full data
              setTransactionSets(prev => 
                prev.map((s, idx) => idx === 0 ? fullSet : s)
              );
              
              onSelectSet(fullSet);
            }
          } catch (error) {
            console.error('Error loading first sheet data:', error);
            // Fallback to basic set if fetch fails
            onSelectSet(sets[0]);
          }
        }
      } else {
        setUploadStatus('error');
        setStatusMessage(result.error || 'Failed to import file');
      }
    } catch (error) {
      setUploadStatus('error');
      setStatusMessage('An error occurred while uploading the file');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOverride = () => {
    if (pendingFile) {
      handleFileUpload(pendingFile, true);
    }
  };

  const handleSkip = () => {
    setPendingFile(null);
    setDuplicateInfo(null);
    setUploadStatus('idle');
    setStatusMessage('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileUpload(file);
    } else {
      setUploadStatus('error');
      setStatusMessage('Please drop a valid Excel file (.xlsx or .xls)');
    }
  };

  const handleSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const setId = e.target.value;
    setSelectedSetId(setId);
    
    const selectedSet = transactionSets.find(set => set.id === setId);
    if (selectedSet) {
      // If the set already has transaction data, use it
      if (selectedSet.glTransactions && selectedSet.statementTransactions) {
        onSelectSet(selectedSet);
      } else {
        // Fetch full sheet data from database
        try {
          const response = await fetch(`/api/transactions/sheets?sheetId=${setId}`);
          const result = await response.json();
          
          if (result.success && result.data) {
            // Update the transaction set with full data
            const fullSet: TransactionSet = {
              id: result.data.id,
              name: result.data.name,
              date: result.data.reportingDate || selectedSet.date,
              totalTransactions: result.data.totalTransactions,
              glTransactions: result.data.glTransactions,
              statementTransactions: result.data.statementTransactions,
              metadata: result.data.metadata,
            };
            
            // Update the transaction sets array with full data
            setTransactionSets(prev => 
              prev.map(s => s.id === setId ? fullSet : s)
            );
            
            onSelectSet(fullSet);
          }
        } catch (error) {
          console.error('Error loading sheet data:', error);
        }
      }
    }
  };

  const clearImport = () => {
    setTransactionSets([]);
    setSelectedSetId('');
    setUploadStatus('idle');
    setStatusMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />

        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-3" />
              <p className="text-sm text-gray-600">Uploading and processing...</p>
            </>
          ) : (
            <>
              <div className="bg-indigo-100 p-3 rounded-full mb-3">
                <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Drop your Excel file here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supported formats: .xlsx, .xls
              </p>
            </>
          )}
        </label>
      </div>

      {/* Status Messages */}
      {uploadStatus !== 'idle' && (
        <div
          className={`flex items-start gap-2 p-4 rounded-lg ${
            uploadStatus === 'success'
              ? 'bg-green-50 border border-green-200'
              : uploadStatus === 'duplicate'
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {uploadStatus === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : uploadStatus === 'duplicate' ? (
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p
              className={`text-sm font-medium ${
                uploadStatus === 'success'
                  ? 'text-green-800'
                  : uploadStatus === 'duplicate'
                  ? 'text-yellow-800'
                  : 'text-red-800'
              }`}
            >
              {statusMessage}
            </p>
            {uploadStatus === 'duplicate' && duplicateInfo && (
              <div className="mt-2 text-xs text-yellow-700">
                <p>Previous import: {new Date(duplicateInfo.uploadedAt).toLocaleString()}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleOverride}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Override Existing
                  </button>
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Skip Import
                  </button>
                </div>
              </div>
            )}
          </div>
          {uploadStatus !== 'duplicate' && (
            <button
              onClick={clearImport}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Transaction Set Selector */}
      {transactionSets.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Transaction Set to View
          </label>
          <select
            value={selectedSetId}
            onChange={handleSelectChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {transactionSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name} - {set.date} ({set.totalTransactions} transactions)
              </option>
            ))}
          </select>

          {/* Transaction Set Summary */}
          {selectedSetId && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-blue-600 font-medium mb-1">GL Transactions</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Int CR:</span>
                  <span className="font-semibold text-blue-700">
                    {transactionSets.find(s => s.id === selectedSetId)?.glTransactions.intCr.length || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Int DR:</span>
                  <span className="font-semibold text-blue-700">
                    {transactionSets.find(s => s.id === selectedSetId)?.glTransactions.intDr.length || 0}
                  </span>
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-xs text-green-600 font-medium mb-1">Statement Transactions</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ext DR:</span>
                  <span className="font-semibold text-green-700">
                    {transactionSets.find(s => s.id === selectedSetId)?.statementTransactions.extDr.length || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Ext CR:</span>
                  <span className="font-semibold text-green-700">
                    {transactionSets.find(s => s.id === selectedSetId)?.statementTransactions.extCr.length || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
