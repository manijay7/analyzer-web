"use client";

import React, { useState } from 'react';
import { TransactionImporter, TransactionSet } from './TransactionImporter';
import { DualPaneTransactionView } from './DualPaneTransactionView';
import { Upload, FileSpreadsheet, ArrowLeft } from 'lucide-react';

export const TransactionImportWorkspace: React.FC = () => {
  const [transactionSets, setTransactionSets] = useState<TransactionSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<TransactionSet | null>(null);
  const [showImporter, setShowImporter] = useState(true);

  const handleImportComplete = (sets: TransactionSet[]) => {
    setTransactionSets(sets);
    if (sets.length > 0) {
      setSelectedSet(sets[0]);
      setShowImporter(false);
    }
  };

  const handleSelectSet = (set: TransactionSet) => {
    setSelectedSet(set);
    setShowImporter(false);
  };

  const resetImporter = () => {
    setShowImporter(true);
    setSelectedSet(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Transaction Import & Reconciliation
              </h1>
              <p className="text-sm text-gray-500">
                Import Excel files and view GL vs Statement transactions
              </p>
            </div>
          </div>

          {!showImporter && selectedSet && (
            <button
              onClick={resetImporter}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Change Import
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {showImporter || !selectedSet ? (
          <div className="h-full flex items-center justify-center p-6 bg-gray-50">
            <div className="w-full max-w-2xl">
              <TransactionImporter
                onImportComplete={handleImportComplete}
                onSelectSet={handleSelectSet}
              />
            </div>
          </div>
        ) : (
          <div className="h-full p-6">
            <DualPaneTransactionView
              glTransactions={selectedSet.glTransactions}
              statementTransactions={selectedSet.statementTransactions}
            />
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {!showImporter && selectedSet && (
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6 text-gray-600">
              <span>
                <strong className="text-gray-900">Set:</strong> {selectedSet.name}
              </span>
              <span>
                <strong className="text-gray-900">Date:</strong> {selectedSet.date}
              </span>
              <span>
                <strong className="text-gray-900">Total:</strong> {selectedSet.totalTransactions} transactions
              </span>
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-gray-600">
                  GL: {selectedSet.glTransactions?.intCr?.length + selectedSet.glTransactions?.intDr?.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-600">
                  Statement: {selectedSet.statementTransactions?.extDr?.length + selectedSet.statementTransactions?.extCr?.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
