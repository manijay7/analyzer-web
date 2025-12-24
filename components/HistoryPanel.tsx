"use client";

import React, { useState } from 'react';
import { MatchGroup, User, Transaction } from '@/lib/types';
import { Trash2, TrendingUp, ArrowRight, Layers, MessageSquareText, ShieldAlert, CheckCircle, Clock, Lock, Square, CheckSquare, XCircle, Pencil, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface HistoryPanelProps {
  matches: MatchGroup[];
  onUnmatch: (matchId: string) => void;
  currentUser: User;
  canUnmatch: boolean;
  canApprove: boolean;
  onApprove: (matchId: string) => void;
  lockedDate: string | null;
  
  // Batch Props
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBatchUnmatch: () => void;
  onBatchApprove: () => void;

  // New Prop for Comment Editing
  onUpdateComment: (matchId: string, newComment: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  matches, 
  onUnmatch, 
  currentUser, 
  canUnmatch,
  canApprove,
  onApprove,
  lockedDate,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onBatchUnmatch,
  onBatchApprove,
  onUpdateComment
}) => {
  // State for handling inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  // State for expanded matches (to show transaction details)
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const toggleExpanded = (matchId: string) => {
    const newExpanded = new Set(expandedMatches);
    if (newExpanded.has(matchId)) {
      newExpanded.delete(matchId);
    } else {
      newExpanded.add(matchId);
    }
    setExpandedMatches(newExpanded);
  };

  const getMatchType = (leftCount: number, rightCount: number): string => {
    if (leftCount === 1 && rightCount === 1) return '1:1';
    if (leftCount === 1) return `1:${rightCount}`;
    if (rightCount === 1) return `${leftCount}:1`;
    return `${leftCount}:${rightCount}`;
  };

  const getDisplayAmount = (tx: Transaction): number => {
    const recon = (tx.recon || '').toUpperCase();
    if (recon.includes('DR')) {
      return -Math.abs(tx.amount);
    }
    return Math.abs(tx.amount);
  };
  
  const isPeriodLocked = (txDates: string[]) => {
      if (!lockedDate) return false;
      const locked = new Date(lockedDate);
      return txDates.some(d => new Date(d) <= locked);
  };

  const allSelected = matches.length > 0 && selectedIds.size === matches.length;
  const someSelected = selectedIds.size > 0;

  // Edit Handlers
  const handleStartEdit = (match: MatchGroup) => {
      setEditingId(match.id);
      setEditValue(match.comment || "");
  };

  const handleSaveEdit = (matchId: string) => {
      onUpdateComment(matchId, editValue);
      setEditingId(null);
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setEditValue("");
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col w-full relative">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 h-16">
        {someSelected ? (
           <div className="flex items-center gap-4 w-full animate-fadeIn">
               <div className="flex items-center gap-2">
                   <button onClick={onToggleSelectAll} className="text-indigo-600">
                       <CheckSquare size={18} />
                   </button>
                   <span className="text-sm font-semibold text-gray-700">{selectedIds.size} selected</span>
               </div>
               <div className="h-6 w-px bg-gray-300" />
               <div className="flex items-center gap-2">
                   {canUnmatch && (
                       <button 
                           onClick={onBatchUnmatch}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors"
                       >
                           <Trash2 size={14} /> Unmatch Selected
                       </button>
                   )}
                   {canApprove && (
                       <button 
                           onClick={onBatchApprove}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors"
                       >
                           <CheckCircle size={14} /> Approve Selected
                       </button>
                   )}
               </div>
           </div>
        ) : (
            <>
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Layers size={18} />
                  Matched History
                </h3>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                  {matches.length} matches
                </span>
            </>
        )}
      </div>

      <div className="overflow-x-auto">
        {matches.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm flex flex-col items-center">
             <TrendingUp size={32} className="mb-2 opacity-50"/>
             No matches created yet. Start matching transactions above.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
             <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                   <th className="px-4 py-3 w-10">
                       <button 
                         onClick={onToggleSelectAll}
                         className="text-gray-400 hover:text-gray-600 transition-colors"
                       >
                           {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                       </button>
                   </th>
                   <th className="px-4 py-3 w-8"></th>
                   <th className="px-4 py-3 w-32">Match ID</th>
                   <th className="px-4 py-3 w-16 text-center">Type</th>
                   <th className="px-4 py-3">Match Details</th>
                   <th className="px-4 py-3 w-56">Notes</th>
                   <th className="px-4 py-3 w-32">Status</th>
                   <th className="px-4 py-3 w-32 text-right">Total</th>
                   <th className="px-4 py-3 w-32 text-right">Action</th>
                </tr>
             </thead>
             <tbody>
                {matches.slice().reverse().map((match) => {
                  const txDates = [...match.leftTransactions, ...match.rightTransactions].map(t => t.date);
                  const isLocked = isPeriodLocked(txDates);
                  const isPending = match.status === 'PENDING_APPROVAL';
                  const isSelected = selectedIds.has(match.id);
                  const isEditing = editingId === match.id;
                  const isExpanded = expandedMatches.has(match.id);
                  const matchType = getMatchType(match.leftTransactions.length, match.rightTransactions.length);

                  return (
                    <React.Fragment key={match.id}>
                      {/* Main Match Row */}
                      <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => onToggleSelect(match.id)}
                            className={`${isSelected ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>

                        {/* Expand/Collapse Button */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpanded(match.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>

                        {/* Match ID */}
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          <div className="flex flex-col gap-1">
                            <span>#{match.id.slice(0, 8)}</span>
                            {isLocked && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-400" title="Period Closed">
                                <Lock size={10} /> Locked
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Match Type Badge */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                            {matchType}
                          </span>
                        </td>

                        {/* Match Summary */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-blue-700">
                                {match.leftTransactions.length} Ledger {match.leftTransactions.length === 1 ? 'item' : 'items'}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                {formatCurrency(match.totalLeft)}
                              </span>
                            </div>
                            <ArrowRight size={14} className="text-gray-300" />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-green-700">
                                {match.rightTransactions.length} Bank {match.rightTransactions.length === 1 ? 'item' : 'items'}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                {formatCurrency(match.totalRight)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveEdit(match.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(match.id);
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                className="w-full text-xs p-1.5 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="Add notes..."
                              />
                            </div>
                          ) : (
                            <div 
                              onClick={() => !isLocked && handleStartEdit(match)}
                              className={`group/edit relative p-1.5 -ml-1.5 rounded cursor-pointer transition-colors ${!isLocked ? 'hover:bg-gray-100' : 'cursor-default'}`}
                            >
                              {match.comment ? (
                                <div className="flex items-start gap-2 text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-100">
                                  <MessageSquareText size={12} className="mt-0.5 text-yellow-600 flex-shrink-0" />
                                  <span className="text-xs italic leading-snug line-clamp-2">{match.comment}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-gray-300 text-xs italic">
                                  {!isLocked && <Pencil size={11} className="opacity-0 group-hover/edit:opacity-100 transition-opacity" />}
                                  <span className={`${!isLocked && 'group-hover/edit:text-gray-500'}`}>No notes</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                              <Clock size={11} /> Pending
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                <CheckCircle size={11} /> Approved
                              </span>
                              {match.approvedBy && (
                                <div className="text-[10px] text-gray-400">
                                  by {match.approvedBy}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-semibold text-sm text-gray-900">
                              {formatCurrency(match.totalLeft)}
                            </span>
                            {match.difference > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                                Diff: {formatCurrency(match.difference)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {isPending && canApprove && (
                              <button 
                                onClick={() => onApprove(match.id)}
                                className="text-green-600 hover:text-green-800 transition-colors p-1.5 hover:bg-green-50 rounded-full"
                                title="Approve Match"
                              >
                                <CheckCircle size={15} />
                              </button>
                            )}
                            {!isLocked && canUnmatch ? (
                              <button 
                                onClick={() => onUnmatch(match.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-full"
                                title="Unmatch"
                              >
                                <Trash2 size={15} />
                              </button>
                            ) : (
                              <div className="p-1.5 text-gray-300 cursor-not-allowed" title={isLocked ? "Period Closed" : "Permission Denied"}>
                                {isLocked ? <Lock size={15} /> : <ShieldAlert size={15} />}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Transaction Details */}
                      {isExpanded && (
                        <tr className={`bg-gray-50/50 border-b border-gray-200 ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                          <td colSpan={9} className="px-4 py-4">
                            <div className="grid grid-cols-2 gap-6">
                              {/* Left Side - Ledger Transactions */}
                              <div className="bg-white rounded-lg border border-blue-100 p-4">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <h4 className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                                    Internal Ledger ({match.leftTransactions.length})
                                  </h4>
                                </div>
                                <div className="space-y-2">
                                  {match.leftTransactions.map((tx, idx) => (
                                    <div key={tx.id} className="flex items-start gap-3 p-2 rounded hover:bg-blue-50/50 transition-colors">
                                      <span className="text-[10px] font-mono text-gray-400 mt-0.5">{idx + 1}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs text-gray-900 font-medium truncate" title={tx.description}>
                                          {tx.description}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                                          <span>{tx.date}</span>
                                          {tx.glRefNo && (
                                            <>
                                              <span>•</span>
                                              <span className="font-mono">Ref: {tx.glRefNo}</span>
                                            </>
                                          )}
                                          {tx.recon && (
                                            <>
                                              <span>•</span>
                                              <span className={`px-1.5 py-0.5 rounded font-medium ${
                                                tx.recon.toUpperCase().includes('DR') 
                                                  ? 'bg-red-100 text-red-700' 
                                                  : 'bg-green-100 text-green-700'
                                              }`}>
                                                {tx.recon.toUpperCase().includes('DR') ? 'DR' : 'CR'}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs font-mono font-semibold text-gray-900 whitespace-nowrap">
                                        {formatCurrency(getDisplayAmount(tx))}
                                      </div>
                                    </div>
                                  ))}
                                  <div className="pt-2 mt-2 border-t border-blue-100 flex justify-between items-center">
                                    <span className="text-xs font-semibold text-blue-900">Subtotal:</span>
                                    <span className="text-sm font-mono font-bold text-blue-900">
                                      {formatCurrency(match.totalLeft)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Side - Bank Transactions */}
                              <div className="bg-white rounded-lg border border-green-100 p-4">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-100">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <h4 className="text-xs font-semibold text-green-900 uppercase tracking-wide">
                                    Bank Statement ({match.rightTransactions.length})
                                  </h4>
                                </div>
                                <div className="space-y-2">
                                  {match.rightTransactions.map((tx, idx) => (
                                    <div key={tx.id} className="flex items-start gap-3 p-2 rounded hover:bg-green-50/50 transition-colors">
                                      <span className="text-[10px] font-mono text-gray-400 mt-0.5">{idx + 1}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs text-gray-900 font-medium truncate" title={tx.description}>
                                          {tx.description}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                                          <span>{tx.date}</span>
                                          {tx.glRefNo && (
                                            <>
                                              <span>•</span>
                                              <span className="font-mono">Ref: {tx.glRefNo}</span>
                                            </>
                                          )}
                                          {tx.recon && (
                                            <>
                                              <span>•</span>
                                              <span className={`px-1.5 py-0.5 rounded font-medium ${
                                                tx.recon.toUpperCase().includes('DR') 
                                                  ? 'bg-red-100 text-red-700' 
                                                  : 'bg-green-100 text-green-700'
                                              }`}>
                                                {tx.recon.toUpperCase().includes('DR') ? 'DR' : 'CR'}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs font-mono font-semibold text-gray-900 whitespace-nowrap">
                                        {formatCurrency(getDisplayAmount(tx))}
                                      </div>
                                    </div>
                                  ))}
                                  <div className="pt-2 mt-2 border-t border-green-100 flex justify-between items-center">
                                    <span className="text-xs font-semibold text-green-900">Subtotal:</span>
                                    <span className="text-sm font-mono font-bold text-green-900">
                                      {formatCurrency(match.totalRight)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Match Metadata */}
                            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                              <div className="flex items-center gap-4">
                                <span>Matched: {new Date(match.timestamp).toLocaleString()}</span>
                                {match.matchByUserId && (
                                  <span>• By: {match.matchByUserId}</span>
                                )}
                              </div>
                              {match.difference === 0 ? (
                                <span className="text-green-600 font-medium flex items-center gap-1">
                                  <CheckCircle size={12} /> Perfect Match (Zero Difference)
                                </span>
                              ) : (
                                <span className="text-red-600 font-medium">
                                  Difference: {formatCurrency(match.difference)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
             </tbody>
          </table>
        )}
      </div>
    </div>
  );
};