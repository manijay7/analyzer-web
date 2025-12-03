"use client";

import React, { useState } from 'react';
import { ArrowRightLeft, FileText, DollarSign } from 'lucide-react';
import { ImportedTransaction } from './TransactionImporter';

interface DualPaneTransactionViewProps {
  glTransactions: {
    intCr: ImportedTransaction[];
    intDr: ImportedTransaction[];
  };
  statementTransactions: {
    extDr: ImportedTransaction[];
    extCr: ImportedTransaction[];
  };
}

export const DualPaneTransactionView: React.FC<DualPaneTransactionViewProps> = ({
  glTransactions,
  statementTransactions,
}) => {
  const [selectedGLIds, setSelectedGLIds] = useState<Set<string>>(new Set());
  const [selectedStatementIds, setSelectedStatementIds] = useState<Set<string>>(new Set());

  // Safely access transactions with fallback to empty arrays
  const safeGLTransactions = {
    intCr: glTransactions?.intCr || [],
    intDr: glTransactions?.intDr || [],
  };
  
  const safeStatementTransactions = {
    extDr: statementTransactions?.extDr || [],
    extCr: statementTransactions?.extCr || [],
  };

  // Combine GL transactions for display
  const allGLTransactions = [
    ...safeGLTransactions.intCr.map(t => ({ ...t, subType: 'INT CR' as const })),
    ...safeGLTransactions.intDr.map(t => ({ ...t, subType: 'INT DR' as const })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Combine Statement transactions for display
  const allStatementTransactions = [
    ...safeStatementTransactions.extDr.map(t => ({ ...t, subType: 'EXT DR' as const })),
    ...safeStatementTransactions.extCr.map(t => ({ ...t, subType: 'EXT CR' as const })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const toggleGLSelection = (id: string) => {
    const newSet = new Set(selectedGLIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedGLIds(newSet);
  };

  const toggleStatementSelection = (id: string) => {
    const newSet = new Set(selectedStatementIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedStatementIds(newSet);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateTotal = (transactions: ImportedTransaction[]) => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const getTypeColor = (subType: string) => {
    switch (subType) {
      case 'INT CR':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'INT DR':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'EXT DR':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'EXT CR':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const TransactionCard = ({
    transaction,
    subType,
    isSelected,
    onToggle,
  }: {
    transaction: ImportedTransaction;
    subType: string;
    isSelected: boolean;
    onToggle: () => void;
  }) => {
    const txId = `${transaction.reference}-${transaction.date}`;
    
    return (
      <div
        className={`p-3 border rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50 shadow-md'
            : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm bg-white'
        }`}
        onClick={onToggle}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getTypeColor(subType)}`}>
              {subType}
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(transaction.amount)}
          </span>
        </div>
        
        <div className="ml-6">
          <p className="text-sm font-medium text-gray-800 mb-1">
            {transaction.description}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{transaction.date}</span>
            <span className="font-mono">{transaction.reference}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left Pane: GL Transactions */}
      <div className="flex flex-col h-full">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <h2 className="text-lg font-semibold">GL Transactions</h2>
            </div>
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {allGLTransactions.length} items
            </span>
          </div>
          
          <div className="mt-3 flex gap-4 text-sm">
            <div>
              <span className="opacity-80">INT CR: </span>
              <span className="font-semibold">{safeGLTransactions.intCr.length}</span>
            </div>
            <div>
              <span className="opacity-80">INT DR: </span>
              <span className="font-semibold">{safeGLTransactions.intDr.length}</span>
            </div>
            <div>
              <span className="opacity-80">Total: </span>
              <span className="font-semibold">
                {formatCurrency(
                  calculateTotal([...safeGLTransactions.intCr, ...safeGLTransactions.intDr])
                )}
              </span>
            </div>
          </div>
          
          {selectedGLIds.size > 0 && (
            <div className="mt-2 text-sm bg-white/10 px-3 py-1 rounded inline-block">
              {selectedGLIds.size} selected
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-2 border-l border-r border-b border-gray-200 rounded-b-lg custom-scrollbar">
          {allGLTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FileText className="w-12 h-12 mb-2" />
              <p>No GL transactions to display</p>
            </div>
          ) : (
            allGLTransactions.map((transaction, index) => (
              <TransactionCard
                key={`gl-${index}-${transaction.reference}`}
                transaction={transaction}
                subType={transaction.subType}
                isSelected={selectedGLIds.has(`gl-${index}-${transaction.reference}`)}
                onToggle={() => toggleGLSelection(`gl-${index}-${transaction.reference}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Statement Transactions */}
      <div className="flex flex-col h-full">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Statement Transactions</h2>
            </div>
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {allStatementTransactions.length} items
            </span>
          </div>
          
          <div className="mt-3 flex gap-4 text-sm">
            <div>
              <span className="opacity-80">EXT DR: </span>
              <span className="font-semibold">{safeStatementTransactions.extDr.length}</span>
            </div>
            <div>
              <span className="opacity-80">EXT CR: </span>
              <span className="font-semibold">{safeStatementTransactions.extCr.length}</span>
            </div>
            <div>
              <span className="opacity-80">Total: </span>
              <span className="font-semibold">
                {formatCurrency(
                  calculateTotal([...safeStatementTransactions.extDr, ...safeStatementTransactions.extCr])
                )}
              </span>
            </div>
          </div>
          
          {selectedStatementIds.size > 0 && (
            <div className="mt-2 text-sm bg-white/10 px-3 py-1 rounded inline-block">
              {selectedStatementIds.size} selected
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-2 border-l border-r border-b border-gray-200 rounded-b-lg custom-scrollbar">
          {allStatementTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <DollarSign className="w-12 h-12 mb-2" />
              <p>No statement transactions to display</p>
            </div>
          ) : (
            allStatementTransactions.map((transaction, index) => (
              <TransactionCard
                key={`stmt-${index}-${transaction.reference}`}
                transaction={transaction}
                subType={transaction.subType}
                isSelected={selectedStatementIds.has(`stmt-${index}-${transaction.reference}`)}
                onToggle={() => toggleStatementSelection(`stmt-${index}-${transaction.reference}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* Floating Match Button */}
      {selectedGLIds.size > 0 && selectedStatementIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <button
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow-lg transition-all hover:shadow-xl"
            onClick={() => {
              console.log('Match transactions:', {
                gl: Array.from(selectedGLIds),
                statement: Array.from(selectedStatementIds),
              });
              // TODO: Implement matching logic
            }}
          >
            <ArrowRightLeft className="w-5 h-5" />
            <span className="font-medium">
              Match Selected ({selectedGLIds.size} GL + {selectedStatementIds.size} Statement)
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
