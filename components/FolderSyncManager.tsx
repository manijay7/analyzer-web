"use client";

import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2, FileSpreadsheet } from 'lucide-react';

interface FileResult {
  fileName: string;
  status: "success" | "error" | "duplicate" | "skipped";
  message: string;
  sheetsImported?: number;
  transactionsImported?: number;
  error?: string;
}

interface SyncSummary {
  total: number;
  succeeded: number;
  failed: number;
  duplicates: number;
  skipped: number;
}

const FOLDER_SYNC_STORAGE_KEY = 'folderSync:lastPath';

export const FolderSyncManager: React.FC = () => {
  const [folderPath, setFolderPath] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filesFound, setFilesFound] = useState<any[]>([]);
  const [results, setResults] = useState<FileResult[]>([]);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [error, setError] = useState('');

  // Load saved folder path on mount
  useEffect(() => {
    const savedPath = localStorage.getItem(FOLDER_SYNC_STORAGE_KEY);
    if (savedPath) {
      setFolderPath(savedPath);
    }
  }, []);

  // Save folder path to localStorage whenever it changes
  useEffect(() => {
    if (folderPath.trim()) {
      localStorage.setItem(FOLDER_SYNC_STORAGE_KEY, folderPath);
    }
  }, [folderPath]);

  const handleScan = async () => {
    if (!folderPath.trim()) {
      setError('Please enter a folder path');
      return;
    }

    setIsScanning(true);
    setError('');
    setFilesFound([]);
    setResults([]);
    setSummary(null);

    try {
      const response = await fetch(
        `/api/sync/folders?path=${encodeURIComponent(folderPath)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan folder');
      }

      setFilesFound(data.files || []);
      
      if (data.files.length === 0) {
        setError('No Excel files found in the specified folder');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan folder');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSync = async () => {
    if (filesFound.length === 0) {
      setError('Please scan a folder first');
      return;
    }

    setIsSyncing(true);
    setError('');
    setResults([]);
    setSummary(null);

    try {
      const response = await fetch('/api/sync/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath,
          skipDuplicates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync folder');
      }

      setResults(data.results || []);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync folder');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'duplicate':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'skipped':
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'duplicate':
        return 'bg-yellow-50 border-yellow-200';
      case 'skipped':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 -m-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <FolderOpen className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Folder Synchronization
            </h1>
            <p className="text-sm text-gray-500">
              Import all Excel files from a folder automatically
            </p>
          </div>
        </div>
      </div>

      {/* Folder Path Input */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder Path
            </label>
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="C:\path\to\excel\files"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isSyncing}
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter the absolute path to the folder containing Excel files
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="skipDuplicates"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              disabled={isSyncing}
            />
            <label htmlFor="skipDuplicates" className="text-sm text-gray-700">
              Skip duplicate files (already imported)
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleScan}
              disabled={isScanning || isSyncing || !folderPath.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Folder className="w-4 h-4" />
                  Scan Folder
                </>
              )}
            </button>

            {filesFound.length > 0 && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Import All Files
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Files Found */}
      {filesFound.length > 0 && results.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Files Found: {filesFound.length}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filesFound.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB • Modified:{' '}
                    {new Date(file.modified).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {summary && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Synchronization Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {summary.total}
              </div>
              <div className="text-xs text-gray-600 mt-1">Total Files</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {summary.succeeded}
              </div>
              <div className="text-xs text-green-600 mt-1">Succeeded</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {summary.failed}
              </div>
              <div className="text-xs text-red-600 mt-1">Failed</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {summary.duplicates}
              </div>
              <div className="text-xs text-yellow-600 mt-1">Duplicates</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {summary.skipped}
              </div>
              <div className="text-xs text-gray-600 mt-1">Skipped</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Details */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Import Results
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-4 rounded-lg border ${getStatusColor(
                  result.status
                )}`}
              >
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {result.fileName}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  {result.sheetsImported !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">
                      {result.sheetsImported} sheet(s) •{' '}
                      {result.transactionsImported} transaction(s)
                    </p>
                  )}
                  {result.error && (
                    <p className="text-xs text-red-600 mt-1">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
