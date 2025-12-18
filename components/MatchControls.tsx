"use client";

import React from 'react';
import { X, ArrowRightLeft, MessageCircle, Link2, CheckCircle, ShieldAlert } from 'lucide-react';
import { Transaction, User } from '@/lib/types';
import { WRITE_OFF_LIMIT, ROLE_ADJUSTMENT_LIMITS, UserRole } from '@/lib/constants';

interface MatchControlsProps {
  selectedLeftTxs: Transaction[];
  selectedRightTxs: Transaction[];
  matchComment: string;
  isCommentOpen: boolean;
  currentUser: User;
  onExecuteMatch: () => void;
  onClearSelection: () => void;
  onCommentChange: (comment: string) => void;
  onToggleComment: () => void;
}

export const MatchControls: React.FC<MatchControlsProps> = ({
  selectedLeftTxs,
  selectedRightTxs,
  matchComment,
  isCommentOpen,
  currentUser,
  onExecuteMatch,
  onClearSelection,
  onCommentChange,
  onToggleComment,
}) => {
  const selLeftTotal = selectedLeftTxs.reduce((sum, t) => sum + t.amount, 0);
  const selRightTotal = selectedRightTxs.reduce((sum, t) => sum + t.amount, 0);
  const diff = Math.abs(selLeftTotal - selRightTotal);

  const hasSelection = selectedLeftTxs.length > 0 || selectedRightTxs.length > 0;

  if (!hasSelection) return null;

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 px-6 py-4 flex items-center gap-6 z-50 transition-all duration-300 w-[95%] max-w-5xl`}>
      <button onClick={onClearSelection} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
        <X size={20} />
      </button>
      <div className="h-8 w-px bg-gray-200" />
      <div className="flex items-center gap-8 flex-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Source A</span>
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{selectedLeftTxs.length}</span>
          </div>
          <span className="font-mono text-lg font-medium text-blue-600 leading-tight">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selLeftTotal)}
          </span>
        </div>
        <div className="text-gray-300">
          <ArrowRightLeft size={20} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Source B</span>
            <span className="text-xs font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{selectedRightTxs.length}</span>
          </div>
          <span className="font-mono text-lg font-medium text-green-600 leading-tight">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selRightTotal)}
          </span>
        </div>
        <div className={`flex flex-col px-6 border-l border-gray-100 ${Math.abs(diff) < 0.01 ? 'text-gray-400' : 'text-red-500'}`}>
          <span className="text-[10px] uppercase font-bold tracking-wider">Difference</span>
          <span className="font-mono text-lg font-bold flex items-center gap-2 leading-tight">
            {diff > 0.01 && <span>⚠️</span>}
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(diff)}
          </span>
          {diff > 0 && diff <= WRITE_OFF_LIMIT && <span className="text-[10px] text-green-600 font-medium">Auto-writeoff</span>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={onToggleComment}
            className={`p-2 rounded-lg transition-colors relative ${matchComment ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <MessageCircle size={20} />
            {matchComment && <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full border border-white"></span>}
          </button>
          {isCommentOpen && (
            <div className="absolute bottom-full right-0 mb-3 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 animate-fadeIn">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Match Notes</label>
              <textarea
                className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                rows={3}
                placeholder="Rationale..."
                value={matchComment}
                onChange={(e) => onCommentChange(e.target.value)}
                autoFocus
              />
              <div className="text-right mt-1">
                <button onClick={onToggleComment} className="text-xs text-indigo-600 font-medium hover:text-indigo-800">Done</button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onExecuteMatch}
          disabled={selectedLeftTxs.length === 0 && selectedRightTxs.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg transition-all"
        >
          {diff > 0.01
            ? (diff > ROLE_ADJUSTMENT_LIMITS[currentUser.role]
                ? <><ShieldAlert size={18} />Request Approval</>
                : <><CheckCircle size={18} />Match w/ Adjust</>)
            : <><Link2 size={18} />Match Selected</>}
        </button>
      </div>
    </div>
  );
};