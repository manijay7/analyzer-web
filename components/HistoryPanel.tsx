"use client";

import React, { useState } from 'react';
import { MatchGroup, User } from '@/lib/types';
import { Trash2, TrendingUp, ArrowRight, Layers, MessageSquareText, ShieldAlert, CheckCircle, Clock, Lock, Square, CheckSquare, XCircle, Pencil, MessageCircle } from 'lucide-react';

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
             <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                   <th className="px-6 py-3 w-10">
                       <button 
                         onClick={onToggleSelectAll}
                         className="text-gray-400 hover:text-gray-600 transition-colors"
                       >
                           {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                       </button>
                   </th>
                   <th className="px-6 py-3 w-24">Match ID</th>
                   <th className="px-6 py-3">Source A (Ledger)</th>
                   <th className="px-6 py-3 w-8"></th>
                   <th className="px-6 py-3">Source B (Bank)</th>
                   <th className="px-6 py-3 w-48">Notes</th>
                   <th className="px-6 py-3">Status</th>
                   <th className="px-6 py-3 text-right">Total Value</th>
                   <th className="px-6 py-3 text-right">Difference</th>
                   <th className="px-6 py-3 text-right">Action</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {matches.slice().reverse().map((match) => {
                  const txDates = [...match.leftTransactions, ...match.rightTransactions].map(t => t.date);
                  const isLocked = isPeriodLocked(txDates);
                  const isPending = match.status === 'PENDING_APPROVAL';
                  const isSelected = selectedIds.has(match.id);
                  const isEditing = editingId === match.id;

                  return (
                    <tr 
                        key={match.id} 
                        className={`hover:bg-gray-50 transition-colors group ${isSelected ? 'bg-indigo-50/50' : ''}`}
                    >
                       <td className="px-6 py-4 align-top">
                           <button 
                               onClick={() => onToggleSelect(match.id)}
                               className={`${isSelected ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500'}`}
                           >
                               {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                           </button>
                       </td>

                       <td className="px-6 py-4 font-mono text-xs text-gray-500 align-top">
                           #{match.id}
                           {isLocked && (
                               <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400" title="Period Closed">
                                   <Lock size={10} /> Locked
                               </div>
                           )}
                       </td>
                       
                       <td className="px-6 py-4 align-top">
                          <div className="flex flex-col gap-1">
                             <span className="font-medium text-blue-700">{match.leftTransactions.length} items</span>
                             <ul className="text-xs text-gray-500 list-disc list-inside">
                                {match.leftTransactions.slice(0, 2).map(t => (
                                   <li key={t.id} className="truncate max-w-[200px]" title={t.description}>{t.description}</li>
                                ))}
                                {match.leftTransactions.length > 2 && <li className="italic">+{match.leftTransactions.length - 2} more</li>}
                             </ul>
                          </div>
                       </td>
  
                       <td className="px-6 py-4 text-gray-300 align-top pt-8">
                          <ArrowRight size={16} />
                       </td>
  
                       <td className="px-6 py-4 align-top">
                          <div className="flex flex-col gap-1">
                             <span className="font-medium text-green-700">{match.rightTransactions.length} items</span>
                             <ul className="text-xs text-gray-500 list-disc list-inside">
                                {match.rightTransactions.slice(0, 2).map(t => (
                                   <li key={t.id} className="truncate max-w-[200px]" title={t.description}>{t.description}</li>
                                ))}
                                {match.rightTransactions.length > 2 && <li className="italic">+{match.rightTransactions.length - 2} more</li>}
                             </ul>
                          </div>
                       </td>
  
                       <td className="px-6 py-4 align-top">
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
                                    <div className="flex items-start gap-2 text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-100 max-w-[200px]">
                                        <MessageSquareText size={14} className="mt-0.5 text-yellow-600 flex-shrink-0" />
                                        <span className="text-xs italic leading-snug">{match.comment}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-gray-300 text-xs italic">
                                        {!isLocked && <Pencil size={12} className="opacity-0 group-hover/edit:opacity-100 transition-opacity" />}
                                        <span className={`${!isLocked && 'group-hover/edit:text-gray-500'}`}>No notes</span>
                                    </div>
                                )}
                              </div>
                          )}
                       </td>

                       <td className="px-6 py-4 align-top">
                           {isPending ? (
                               <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                   <Clock size={12} /> Pending
                               </span>
                           ) : (
                               <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                   <CheckCircle size={12} /> Approved
                               </span>
                           )}
                           {match.approvedBy && (
                               <div className="text-[10px] text-gray-400 mt-1">
                                   by {match.approvedBy}
                               </div>
                           )}
                       </td>
  
                       <td className="px-6 py-4 text-right font-mono font-medium text-gray-900 align-top">
                          {formatCurrency(match.totalLeft)}
                       </td>
  
                       <td className="px-6 py-4 text-right align-top">
                          {match.difference > 0 ? (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                {formatCurrency(match.difference)}
                             </span>
                          ) : (
                             <span className="text-gray-400 font-mono text-xs">-</span>
                          )}
                       </td>
  
                       <td className="px-6 py-4 text-right align-top flex justify-end gap-2">
                          {isPending && canApprove && (
                              <button 
                                onClick={() => onApprove(match.id)}
                                className="text-green-600 hover:text-green-800 transition-colors p-2 hover:bg-green-50 rounded-full"
                                title="Approve Adjustment"
                             >
                                <CheckCircle size={16} />
                             </button>
                          )}
                          
                          {/* Only allow unmatch if NOT locked, and has permission */}
                          {!isLocked && canUnmatch ? (
                            <button 
                               onClick={() => onUnmatch(match.id)}
                               className="text-gray-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"
                               title="Unmatch Transaction"
                            >
                               <Trash2 size={16} />
                            </button>
                          ) : (
                            <div className="p-2 text-gray-300 cursor-not-allowed" title={isLocked ? "Period Closed" : "Permission Denied"}>
                               {isLocked ? <Lock size={16} /> : <ShieldAlert size={16} />}
                            </div>
                          )}
                       </td>
                    </tr>
                  );
                })}
             </tbody>
          </table>
        )}
      </div>
    </div>
  );
};