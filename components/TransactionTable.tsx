"use client";

import React from 'react';
import { Transaction, Side } from '@/lib/types';
import { Check, AlertCircle, Search } from 'lucide-react';

interface TransactionTableProps {
  title: string;
  transactions: Transaction[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  side: Side;
  className?: string;
  filterText: string;
  onFilterChange: (text: string) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  title,
  transactions,
  selectedIds,
  onToggleSelect,
  side,
  className,
  filterText,
  onFilterChange
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      <div className={`p-4 border-b border-gray-200 flex flex-col gap-3 ${side === Side.Left ? 'bg-blue-50' : 'bg-green-50'}`}>
        <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
            {transactions.length} items
            </span>
        </div>
        
        {/* Search Input */}
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <Search size={14} />
            </div>
            <input 
                type="text" 
                placeholder="Search description, ref, or amount..."
                value={filterText}
                onChange={(e) => onFilterChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
        </div>
      </div>
      
      {/* Container with both vertical and horizontal scrolling capability */}
      <div className="flex-1 overflow-auto custom-scrollbar p-0">
        <table className="w-full text-sm text-left min-w-[500px]">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 w-10 bg-gray-50">
                {/* Header checkbox could go here for select all */}
              </th>
              <th className="px-4 py-3 bg-gray-50">Date</th>
              <th className="px-4 py-3 bg-gray-50">Description</th>
              <th className="px-4 py-3 text-right bg-gray-50">Amount</th>
              <th className="px-4 py-3 text-right bg-gray-50">Ref</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.length === 0 ? (
               <tr>
                 <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                   <div className="flex flex-col items-center justify-center gap-2">
                     <AlertCircle size={24} />
                     <p>No transactions found</p>
                   </div>
                 </td>
               </tr>
            ) : (
              transactions.map((tx) => {
                const isSelected = selectedIds.has(tx.id);
                return (
                  <tr 
                    key={tx.id}
                    onClick={() => onToggleSelect(tx.id)}
                    className={`
                      cursor-pointer transition-colors duration-150 hover:bg-gray-50
                      ${isSelected ? (side === Side.Left ? 'bg-blue-50 hover:bg-blue-100' : 'bg-green-50 hover:bg-green-100') : ''}
                    `}
                  >
                    <td className="px-4 py-3">
                      <div className={`
                        w-5 h-5 rounded border flex items-center justify-center transition-all
                        ${isSelected 
                          ? (side === Side.Left ? 'bg-blue-500 border-blue-500' : 'bg-green-500 border-green-500') 
                          : 'border-gray-300 bg-white'}
                      `}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${tx.amount < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs font-mono">{tx.reference}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};