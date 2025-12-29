"use client";

import React from 'react';
import { User, UserRole } from '@/lib/types';
import { AdminDashboard } from './AdminDashboard';
import { TransactionImportWorkspace } from './TransactionImportWorkspace';
import { FolderSyncManager } from './FolderSyncManager';
import { WorkspaceContainer } from './WorkspaceContainer';
import { usePermissions } from './PermissionProvider';

type ViewMode = 'workspace' | 'admin' | 'import' | 'sync';

interface ViewRouterProps {
  currentView: ViewMode;
  currentUser: User;
  canAccessAdmin: boolean;
  // Workspace props
  importedFiles: any[];
  selectedFileId: string | null;
  availableSheets: any[];
  selectedSheetId: string | null;
  isLoading: boolean;
  sheetMetadata: any;
  onFileChange: (fileId: string) => void;
  onSheetChange: (sheetId: string) => void;
  transactions: any[];
  matches: any[];
  selectedLeftIds: Set<string>;
  selectedRightIds: Set<string>;
  selectedHistoryIds: Set<string>;
  leftFilter: string;
  rightFilter: string;
  matchComment: string;
  isCommentOpen: boolean;
  onToggleSelect: (id: string, side: any) => void;
  onFilterChange: (side: any, filter: string) => void;
  onExecuteMatch: () => void;
  onClearSelection: () => void;
  onToggleComment: () => void;
  onCommentChange: (comment: string) => void;
  onUnmatch: (matchId: string) => void;
  onApprove: (matchId: string) => void;
  onToggleHistorySelect: (id: string) => void;
  onToggleHistorySelectAll: () => void;
  onBatchUnmatch: () => void;
  onBatchApprove: () => void;
  onUpdateMatchComment: (matchId: string, comment: string) => void;
  activeLeft: any[];
  activeRight: any[];
  totalMatchedValue: number;
  selectedLeftTxs: any[];
  selectedRightTxs: any[];
  selLeftTotal: number;
  selRightTotal: number;
  diff: number;
  // Admin props
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  auditLogs: any[];
  rolePermissions: any;
  onUpdatePermissions: (role: UserRole, permissions: any[]) => void;
  lockedDate: string | null;
  onSetLockedDate: (date: string | null) => void;
  roleRequests: any[];
  onApproveRoleRequest: (reqId: string, approve: boolean) => void;
}

export const ViewRouter: React.FC<ViewRouterProps> = ({
  currentView,
  currentUser,
  canAccessAdmin,
  // Workspace props
  importedFiles,
  selectedFileId,
  availableSheets,
  selectedSheetId,
  isLoading,
  sheetMetadata,
  onFileChange,
  onSheetChange,
  transactions,
  matches,
  selectedLeftIds,
  selectedRightIds,
  selectedHistoryIds,
  leftFilter,
  rightFilter,
  matchComment,
  isCommentOpen,
  onToggleSelect,
  onFilterChange,
  onExecuteMatch,
  onClearSelection,
  onToggleComment,
  onCommentChange,
  onUnmatch,
  onApprove,
  onToggleHistorySelect,
  onToggleHistorySelectAll,
  onBatchUnmatch,
  onBatchApprove,
  onUpdateMatchComment,
  activeLeft,
  activeRight,
  totalMatchedValue,
  selectedLeftTxs,
  selectedRightTxs,
  selLeftTotal,
  selRightTotal,
  diff,
  // Admin props
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  auditLogs,
  rolePermissions,
  onUpdatePermissions,
  lockedDate,
  onSetLockedDate,
  roleRequests,
  onApproveRoleRequest,
}) => {
  const { canUnmatch, canApprove } = usePermissions();

  switch (currentView) {
    case 'admin':
      if (!canAccessAdmin) {
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access the admin panel.</p>
            </div>
          </div>
        );
      }
      return (
        <AdminDashboard
          users={users}
          onAddUser={onAddUser}
          onUpdateUser={onUpdateUser}
          onDeleteUser={onDeleteUser}
          currentUser={currentUser}
          auditLogs={auditLogs}
          rolePermissions={rolePermissions}
          onUpdatePermissions={onUpdatePermissions}
          lockedDate={lockedDate}
          onSetLockedDate={onSetLockedDate}
          roleRequests={roleRequests}
          onApproveRoleRequest={onApproveRoleRequest}
        />
      );

    case 'import':
      return (
        <div className="flex-1 h-[calc(100vh-4rem)] overflow-hidden">
          <TransactionImportWorkspace />
        </div>
      );

    case 'sync':
      return (
        <div className="flex-1 h-[calc(100vh-4rem)] overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            <FolderSyncManager />
          </div>
        </div>
      );

    case 'workspace':
    default:
      return (
        <WorkspaceContainer
          importedFiles={importedFiles}
          selectedFileId={selectedFileId || ''}
          availableSheets={availableSheets}
          selectedSheetId={selectedSheetId || ''}
          isLoading={isLoading}
          sheetMetadata={sheetMetadata}
          onFileChange={onFileChange}
          onSheetChange={onSheetChange}
          transactions={transactions}
          matches={matches}
          selectedLeftIds={selectedLeftIds}
          selectedRightIds={selectedRightIds}
          selectedHistoryIds={selectedHistoryIds}
          leftFilter={leftFilter}
          rightFilter={rightFilter}
          matchComment={matchComment}
          isCommentOpen={isCommentOpen}
          currentUser={currentUser}
          canUnmatch={canUnmatch}
          canApprove={canApprove}
          onToggleSelect={onToggleSelect}
          onFilterChange={onFilterChange}
          onExecuteMatch={onExecuteMatch}
          onClearSelection={onClearSelection}
          onToggleComment={onToggleComment}
          onCommentChange={onCommentChange}
          onUnmatch={onUnmatch}
          onApprove={onApprove}
          onToggleHistorySelect={onToggleHistorySelect}
          onToggleHistorySelectAll={onToggleHistorySelectAll}
          onBatchUnmatch={onBatchUnmatch}
          onBatchApprove={onBatchApprove}
          onUpdateMatchComment={onUpdateMatchComment}
          activeLeft={activeLeft}
          activeRight={activeRight}
          totalMatchedValue={totalMatchedValue}
          selectedLeftTxs={selectedLeftTxs}
          selectedRightTxs={selectedRightTxs}
          selLeftTotal={selLeftTotal}
          selRightTotal={selRightTotal}
          diff={diff}
        />
      );
  }
};