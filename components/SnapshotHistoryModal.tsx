"use client";

import React from 'react';
import { SystemSnapshot, User } from '@/lib/types';
import { X, History, RotateCcw, Calendar, FileBox, Tag, CheckCircle2 } from 'lucide-react';

interface SnapshotHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: SystemSnapshot[];
  onRestore: (snapshot: SystemSnapshot) => void;
  users: User[];
}

export const SnapshotHistoryModal: React.FC<SnapshotHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  snapshots, 
  onRestore,
  users 
}) => {
  if (!isOpen) return null;

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown User';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <History className="text-indigo-600" />
                Version History
            </h2>
            <p className="text-sm text-gray-500 mt-1">
                Restore previous import batches or saved checkpoints.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg p-2 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-gray-50/50">
          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                <FileBox size={48} className="opacity-20" />
                <p>No snapshots found.</p>
                <p className="text-xs">Snapshots are created automatically when importing data.</p>
            </div>
          ) : (
            <div className="space-y-4 p-6">
                {snapshots.slice().reverse().map((snap) => (
                    <div key={snap.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        {/* Type Indicator Strip */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            snap.type === 'IMPORT' ? 'bg-blue-500' : 
                            snap.type === 'MANUAL' ? 'bg-purple-500' : 'bg-gray-400'
                        }`} />
                        
                        <div className="flex justify-between items-start pl-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${
                                        snap.type === 'IMPORT' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                        snap.type === 'MANUAL' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                        {snap.type}
                                    </span>
                                    <h3 className="font-bold text-gray-800">{snap.label}</h3>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        Batch Date: {snap.selectedDate}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        Created by {getUserName(snap.createdByUserId)}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        {new Date(snap.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => onRestore(snap)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 font-medium text-sm transition-all flex items-center gap-2 shadow-sm"
                            >
                                <RotateCcw size={16} />
                                Restore
                            </button>
                        </div>

                        <div className="mt-4 flex items-center gap-6 pl-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Transactions</span>
                                <span className="font-mono font-medium text-gray-800">{snap.stats.totalTransactions} items</span>
                            </div>
                            <div className="w-px h-8 bg-gray-200" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Matches</span>
                                <span className="font-mono font-medium text-gray-800 flex items-center gap-1">
                                    {snap.stats.totalMatches} groups
                                    {snap.stats.totalMatches > 0 && <CheckCircle2 size={12} className="text-green-500" />}
                                </span>
                            </div>
                            <div className="w-px h-8 bg-gray-200" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Matched Value</span>
                                <span className="font-mono font-medium text-gray-800">{formatCurrency(snap.stats.matchedValue)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};