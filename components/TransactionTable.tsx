"use client";

import React, { useState, useMemo } from 'react';
import { Transaction, Side } from '@/lib/types';
import { Check, AlertCircle, Search, ArrowUpDown, Eye, EyeOff } from 'lucide-react';

type SortDirection = 'asc' | 'desc' | null;
type ColumnKey = 'date' | 'description' | 'amount' | 'reference' | 'drCr' | 'sn' | 'aging';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  sortable: boolean;
  width?: string;
}

interface TransactionTableProps {
  title: string;
  transactions: Transaction[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  side: Side;
  className?: string;
  filterText: string;
  onFilterChange: (text: string) => void;
  metadata?: Record<string, any> | null;
}

// Currency code mappings
const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'CNY': '¥',
  'INR': '₹',
  'AUD': 'A$',
  'CAD': 'C$',
  'CHF': 'Fr',
  'NGN': '₦',
  'ZAR': 'R',
  'KES': 'KSh',
  'GHS': 'GH₵',
};


// Extract currency code from GENERAL LEDGER NAME
function extractCurrencyCode(metadata: Record<string, any> | null | undefined): string | null {
  if (!metadata) return null;
  
  const ledgerName = metadata['GENERAL LEDGER NAME'];
  if (!ledgerName || typeof ledgerName !== 'string') return null;
  
  // Look for common 3-letter currency codes at the end of the name
  const currencies = Object.keys(CURRENCY_SYMBOLS);
  for (const currency of currencies) {
    if (ledgerName.toUpperCase().includes(currency)) {
      return currency;
    }
  }
  
  return null;
}
export const TransactionTable: React.FC<TransactionTableProps> = ({
  title,
  transactions,
  selectedIds,
  onToggleSelect,
  side,
  className,
  filterText,
  onFilterChange,
  metadata
}) => {
  // Debug logging
  React.useEffect(() => {
    if (transactions.length > 0) {
    
      
      // Log recon value distribution
      const reconCounts = transactions.reduce((acc, t) => {
        const recon = t.recon || 'NULL/UNDEFINED';
        acc[recon] = (acc[recon] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }, [transactions, title]);
  // Column visibility and configuration (SN and Aging now visible by default)
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'sn', label: 'SN', visible: true, sortable: true },
    { key: 'date', label: 'Date', visible: true, sortable: true },
    { key: 'description', label: 'Description', visible: true, sortable: true },
    { key: 'amount', label: 'Amount', visible: true, sortable: true },
    { key: 'reference', label: 'Ref', visible: true, sortable: true },
    { key: 'drCr', label: 'Dr/Cr', visible: true, sortable: true },
    { key: 'aging', label: 'Aging', visible: true, sortable: true },
  ]);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<ColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Column-specific filters
  const [columnFilters, setColumnFilters] = useState<Record<ColumnKey, string>>({
    date: '',
    description: '',
    amount: '',
    reference: '',
    drCr: '',
    sn: '',
    aging: '',
  });

  // Get currency symbol from metadata
  const currencyCode = extractCurrencyCode(metadata);
  const currencySymbol = currencyCode ? CURRENCY_SYMBOLS[currencyCode] : null;

  const formatCurrency = (amount: number) => {
    // If we have a currency symbol from metadata, use it
    if (currencySymbol) {
      const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Math.abs(amount));
      return `${currencySymbol}${formatted}`;
    }
    
    // Otherwise, just format the number without currency symbol
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  // Get display amount (ALWAYS negative for DR transactions)
  const getDisplayAmount = (tx: Transaction): number => {
    // Use recon field for DR/CR detection
    const recon = (tx.recon || '').toUpperCase();
    const originalAmount = tx.amount;
    let displayAmount: number;
    
    // Any transaction with DR in the recon field should be negative
    if (recon.includes('DR')) {
      displayAmount = -Math.abs(originalAmount); // Force negative
    } else {
      // CR transactions should always be positive
      displayAmount = Math.abs(originalAmount);
    }
    

    return displayAmount;
  };

  // Get value for column (used for sorting and filtering)
  const getColumnValue = (tx: Transaction, column: ColumnKey): string => {
    switch (column) {
      case 'date':
        return tx.date;
      case 'description':
        return tx.description;
      case 'amount':
        return getDisplayAmount(tx).toString();
      case 'reference':
        return tx.glRefNo || tx.reference || '';
      case 'drCr':
        // Use recon field
        return tx.recon || '';
      case 'sn':
        return tx.sn || '';
      case 'aging':
        return tx.aging?.toString() || '';
      default:
        return '';
    }
  };

  // Comprehensive search across all columns
  const searchAllColumns = (tx: Transaction, searchText: string): boolean => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    
    return (
      tx.date.toLowerCase().includes(search) ||
      tx.description.toLowerCase().includes(search) ||
      getDisplayAmount(tx).toString().includes(search) ||
      (tx.glRefNo || tx.reference || '').toLowerCase().includes(search) ||
      (tx.recon || '').toLowerCase().includes(search) ||
      (tx.sn || '').toLowerCase().includes(search) ||
      (tx.aging?.toString() || '').includes(search)
    );
  };

  // Column-specific filtering
  const matchesColumnFilters = (tx: Transaction): boolean => {
    return columns.every(col => {
      const filter = columnFilters[col.key];
      if (!filter) return true;
      const value = getColumnValue(tx, col.key).toLowerCase();
      return value.includes(filter.toLowerCase());
    });
  };

  // Filter, sort, and organize transactions
  const processedTransactions = useMemo(() => {
    // First, filter by global search and column filters
    let filtered = transactions.filter(tx => 
      searchAllColumns(tx, filterText) && matchesColumnFilters(tx)
    );

    // Sort if a column is selected
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = getColumnValue(a, sortColumn);
        const bVal = getColumnValue(b, sortColumn);
        
        // Handle numeric sorting for amount and aging
        if (sortColumn === 'amount' || sortColumn === 'aging') {
          const aNum = parseFloat(aVal) || 0;
          const bNum = parseFloat(bVal) || 0;
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // String sorting for other columns
        if (sortDirection === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });
    }

    // Move selected transactions to top
    const selected = filtered.filter(tx => selectedIds.has(tx.id));
    const unselected = filtered.filter(tx => !selectedIds.has(tx.id));
    
    return [...selected, ...unselected];
  }, [transactions, filterText, columnFilters, sortColumn, sortDirection, selectedIds]);

  // Toggle column visibility
  const toggleColumnVisibility = (key: ColumnKey) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  // Handle column header click for sorting
  const handleSort = (column: ColumnKey) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Handle column filter change
  const handleColumnFilterChange = (column: ColumnKey, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      <div className={`p-4 border-b border-gray-200 flex flex-col gap-3 ${side === Side.Left ? 'bg-blue-50' : 'bg-green-50'}`}>
        <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                {processedTransactions.length} items
              </span>
              {/* Column visibility controls */}
              <div className="relative group">
                <button className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 flex items-center gap-1">
                  <Eye size={12} />
                  Columns
                </button>
                <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 min-w-[150px]">
                  {columns.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumnVisibility(col.key)}
                        className="rounded border-gray-300"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
        </div>
        
        {/* Global Search Input */}
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <Search size={14} />
            </div>
            <input 
                type="text" 
                placeholder="Search across all columns..."
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
              {columns.filter(col => col.visible).map(col => (
                <th 
                  key={col.key}
                  className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <ArrowUpDown 
                        size={12} 
                        className={sortColumn === col.key ? 'text-indigo-600' : 'text-gray-400'}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
            {/* Column filter row */}
            <tr>
              <th className="px-4 py-2 bg-gray-50"></th>
              {columns.filter(col => col.visible).map(col => (
                <th key={col.key} className="px-4 py-2 bg-gray-50">
                  <input
                    type="text"
                    placeholder={`Filter ${col.label.toLowerCase()}...`}
                    value={columnFilters[col.key]}
                    onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {processedTransactions.length === 0 ? (
               <tr>
                 <td colSpan={columns.filter(col => col.visible).length + 1} className="px-4 py-8 text-center text-gray-400">
                   <div className="flex flex-col items-center justify-center gap-2">
                     <AlertCircle size={24} />
                     <p>No transactions found</p>
                   </div>
                 </td>
               </tr>
            ) : (
              processedTransactions.map((tx) => {
                const isSelected = selectedIds.has(tx.id);
                const displayAmount = getDisplayAmount(tx);
                
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
                    {columns.filter(col => col.visible).map(col => {
                      const value = getColumnValue(tx, col.key);
                      
                      if (col.key === 'date') {
                        return (
                          <td key={col.key} className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {tx.date}
                          </td>
                        );
                      }
                      
                      if (col.key === 'description') {
                        return (
                          <td key={col.key} className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={tx.description}>
                            {tx.description}
                          </td>
                        );
                      }
                      
                      if (col.key === 'amount') {
                        const isNegative = displayAmount < 0;
                        const formattedAmount = formatCurrency(displayAmount);
                        return (
                          <td key={col.key} className={`px-4 py-3 text-right font-mono font-medium ${isNegative ? 'text-red-600' : 'text-gray-800'}`}>
                            {isNegative ? `(${formattedAmount})` : formattedAmount}
                          </td>
                        );
                      }
                      
                      if (col.key === 'reference') {
                        return (
                          <td key={col.key} className="px-4 py-3 text-right text-gray-500 text-xs font-mono">
                            {tx.glRefNo || tx.reference}
                          </td>
                        );
                      }
                      
                      if (col.key === 'drCr') {
                        // Format recon value for better display (DR or CR only)
                        // Use recon field
                        const recon = (tx.recon || '').toUpperCase();
                        const isDr = recon.includes('DR');
                        const isCr = recon.includes('CR');
                        const displayValue = isDr ? 'DR' : isCr ? 'CR' : 'N/A';
                        
                        return (
                          <td key={col.key} className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 text-xs rounded font-medium ${
                              isDr ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {displayValue}
                            </span>
                          </td>
                        );
                      }
                      
                      if (col.key === 'sn') {
                        return (
                          <td key={col.key} className="px-4 py-3 text-gray-600 text-xs">
                            {tx.sn || '-'}
                          </td>
                        );
                      }
                      
                      if (col.key === 'aging') {
                        return (
                          <td key={col.key} className="px-4 py-3 text-right text-gray-600 text-xs">
                            {tx.aging || '-'}
                          </td>
                        );
                      }
                      
                      return <td key={col.key} className="px-4 py-3 text-gray-600">{value}</td>;
                    })}
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