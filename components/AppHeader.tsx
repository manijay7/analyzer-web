"use client";

import React, { useState } from 'react';
import {
  Scale,
  RefreshCw,
  Upload,
  Calendar,
  Link2,
  AlertTriangle,
  ArrowRightLeft,
  TrendingUp,
  DollarSign,
  Activity,
  X,
  RotateCcw,
  RotateCw,
  Download,
  FileText,
  CheckCircle,
  LogOut,
  ChevronDown,
  ShieldAlert,
  LayoutDashboard,
  History,
  Save,
  MessageCircle,
  UserPlus,
  FolderSync,
  KeyRound
} from 'lucide-react';
import { UserRole, Permission } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';
import { PasswordChangeModal } from './PasswordChangeModal';

type ViewMode = 'workspace' | 'admin' | 'import' | 'sync';

interface AppHeaderProps {
  currentView: ViewMode;
  currentUser: {
    id: string;
    name: string;
    role: UserRole;
    avatar?: string;
    mustChangePassword?: boolean;
  };
  canAccessAdmin: boolean;
  isUserMenuOpen: boolean;
  isRoleRequestOpen: boolean;
  roleRequestReason: string;
  onViewChange: (view: ViewMode) => void;
  onUserMenuToggle: () => void;
  onRoleRequestToggle: () => void;
  onRoleRequestSubmit: () => void;
  onRoleRequestReasonChange: (reason: string) => void;
  onLogout: () => void;
  // Toolbar props (only shown in workspace view)
  historyStackLength: number;
  futureStackLength: number;
  selectedSheetId: string;
  onUndo: () => void;
  onRedo: () => void;
  onHistoryModalOpen: () => void;
  onManualSnapshot: () => void;
  onAuditModalOpen: () => void;
  onExport: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentView,
  currentUser,
  canAccessAdmin,
  isUserMenuOpen,
  isRoleRequestOpen,
  roleRequestReason,
  onViewChange,
  onUserMenuToggle,
  onRoleRequestToggle,
  onRoleRequestSubmit,
  onRoleRequestReasonChange,
  onLogout,
  historyStackLength,
  futureStackLength,
  selectedSheetId,
  onUndo,
  onRedo,
  onHistoryModalOpen,
  onManualSnapshot,
  onAuditModalOpen,
  onExport,
}) => {
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  
  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewChange('workspace')}>
              <img src="/logos/arbutus_logo-24x25.png" alt="Arbutus" className="w-6 h-6" />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{APP_NAME}</h1>
            </div>
            {canAccessAdmin && (
              <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                <button
                  onClick={() => onViewChange('workspace')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    currentView === 'workspace' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Workspace
                </button>
                <button
                  onClick={() => onViewChange('import')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    currentView === 'import' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Upload size={14} />
                  Import
                </button>
                <button
                  onClick={() => onViewChange('sync')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    currentView === 'sync' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FolderSync size={14} />
                  Folder Sync
                </button>
                <button
                  onClick={() => onViewChange('admin')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    currentView === 'admin' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LayoutDashboard size={14} />
                  Admin
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative mr-4 border-r border-gray-200 pr-4">
              <button
                onClick={onUserMenuToggle}
                className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentUser.role === UserRole.Admin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {currentUser.avatar || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-gray-700 leading-none">{currentUser.name}</p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide pt-0.5">{currentUser.role}</p>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Account</p>
                  </div>
                  {currentUser.role === UserRole.Analyst && (
                    <button
                      onClick={() => {
                        onUserMenuToggle();
                        onRoleRequestToggle();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <UserPlus size={14} />
                      Request Access
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onUserMenuToggle();
                      setIsPasswordChangeOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <KeyRound size={14} />
                    Change Password
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Toolbar */}
            {currentView === 'workspace' && (
              <>
                <div className="flex items-center gap-1 mr-4 border-r border-gray-200 pr-4">
                  <button
                    onClick={onUndo}
                    disabled={historyStackLength === 0}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={onRedo}
                    disabled={futureStackLength === 0}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    <RotateCw size={18} />
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-1"></div>
                  <button
                    onClick={onHistoryModalOpen}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    <History size={18} />
                  </button>
                  <button
                    onClick={onManualSnapshot}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    <Save size={18} />
                  </button>
                  <button
                    onClick={onAuditModalOpen}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    onClick={onExport}
                    disabled={!selectedSheetId}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export Unmatched Transactions"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Role Request Modal */}
      {isRoleRequestOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-lg mb-2">Request Role Upgrade</h3>
            <p className="text-sm text-gray-500 mb-4">Request upgrade to Manager permissions.</p>
            <textarea
              className="w-full border p-2 rounded mb-4 text-sm"
              placeholder="Reason for request..."
              rows={3}
              value={roleRequestReason}
              onChange={(e) => onRoleRequestReasonChange(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={onRoleRequestToggle}
                className="px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={onRoleRequestSubmit}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Password Change Modal */}
      <PasswordChangeModal 
        isOpen={isPasswordChangeOpen}
        onClose={() => setIsPasswordChangeOpen(false)}
        mustChange={currentUser.mustChangePassword}
      />
    </>
  );
};