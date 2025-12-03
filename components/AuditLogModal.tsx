"use client";

import React from 'react';
import { AuditLogEntry, User, UserRole } from '@/lib/types';
import { X, Clock, FileText, Shield } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
  currentUser: User;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, logs, currentUser }) => {
  if (!isOpen) return null;

  // Filter Logic: Managers see all, Analysts only see their own.
  const isManager = currentUser.role === UserRole.Manager;
  const filteredLogs = isManager 
    ? logs 
    : logs.filter(log => log.userId === currentUser.id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" />
                Session Audit Log
            </h2>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Shield size={12} />
                Viewing as: <span className="font-semibold">{currentUser.role}</span>
                {!isManager && " (Restricted View)"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded p-1 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
                {isManager 
                    ? "No actions recorded yet." 
                    : "No actions found for your user account."}
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.slice().reverse().map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap text-xs font-semibold">
                      {log.userName || 'Unknown'}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-800">
                      {log.action}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg text-right flex justify-between items-center">
           <span className="text-xs text-gray-400 italic">
             {isManager ? `Total System Events: ${logs.length}` : `Your Events: ${filteredLogs.length}`}
           </span>
           <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">
             Close
           </button>
        </div>
      </div>
    </div>
  );
};