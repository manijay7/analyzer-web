"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Transaction, Side, TransactionStatus, User, UserRole, RolePermissions, RoleRequest } from '@/lib/types';
import { AuditLogModal } from './AuditLogModal';
import { SnapshotHistoryModal } from './SnapshotHistoryModal';
import { ReconciliationLayout } from './ReconciliationLayout';
import { DEFAULT_ROLE_PERMISSIONS, STORAGE_KEY, APP_NAME } from '@/lib/constants';
import { useReconciliationState } from '@/hooks/useReconciliationState';
import { useFileManagement } from '@/hooks/useFileManagement';
import { useReconciliationActions } from '@/hooks/useReconciliationActions';
import { useAppState } from '@/hooks/useAppState';
import { AuthenticationGuard } from './AuthenticationGuard';
import { PermissionProvider } from './PermissionProvider';
import { ViewRouter } from './ViewRouter';
import { ExportManager } from './ExportManager';
import { AdminOperations } from './AdminOperations';
import { UserManagement } from './UserManagement';
import { RoleManagement } from './RoleManagement';

type ViewMode = 'workspace' | 'admin' | 'import' | 'sync';

export const AnalyzerWebApp: React.FC = () => {
  const { data: session, status } = useSession();

  // Derived User Object from Session
  const currentUser: User = session?.user ? {
    id: session.user.id,
    name: session.user.name || 'Unknown',
    email: session.user.email || '',
    role: session.user.role || UserRole.Analyst,
    avatar: session.user.avatar || 'U',
    status: 'active',
    mustChangePassword: (session.user as any).mustChangePassword || false
  } : { id: 'guest', name: 'Guest', role: UserRole.Analyst, avatar: 'G', email: '', mustChangePassword: false };

  // Custom Hooks
  const [reconciliationState, reconciliationActions] = useReconciliationState(currentUser);
  const [fileState, fileActions] = useFileManagement(status);
  const { users, setUsers, roleRequests, setRoleRequests, rolePermissions, setRolePermissions } = useAppState(status);

  // State
  const [currentView, setCurrentView] = useState<ViewMode>('workspace');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRoleRequestOpen, setIsRoleRequestOpen] = useState(false);
  const [roleRequestReason, setRoleRequestReason] = useState("");

  // UI State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Reconciliation Actions Hook
  const reconciliationActionHandlers = useReconciliationActions({
    currentUser,
    rolePermissions,
    lockedDate: fileState.lockedDate,
    onAuditLog: reconciliationActions.addAuditLog,
    reconciliationActions,
  });

  // Refresh imported files when switching views
  useEffect(() => {
    if ((currentView === 'workspace' || currentView === 'sync') && status === 'authenticated') {
      fileActions.fetchImportedFiles();
    }
  }, [currentView, status]);

  // Role Requests Handler
  const handleRoleRequest = () => {
    if (!roleRequestReason) return;
    reconciliationActions.saveCheckpoint();
    const request: RoleRequest = {
      id: Math.random().toString(36).substring(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      requestedRole: UserRole.Manager,
      reason: roleRequestReason,
      status: 'PENDING',
      timestamp: Date.now()
    };
    setRoleRequests(prev => [...prev, request]);
    setIsRoleRequestOpen(false);
    setRoleRequestReason("");
    reconciliationActions.addAuditLog("Role Request", "User requested upgrade to Manager.");
  };

  // Computed values for rendering
  const activeLeft = reconciliationState.transactions.filter(t =>
    t.side === 'LEFT' && t.status === 'UNMATCHED' &&
    t.description.toLowerCase().includes(reconciliationState.leftFilter.toLowerCase())
  );
  const activeRight = reconciliationState.transactions.filter(t =>
    t.side === 'RIGHT' && t.status === 'UNMATCHED' &&
    t.description.toLowerCase().includes(reconciliationState.rightFilter.toLowerCase())
  );
  const totalMatchedValue = reconciliationState.matches.reduce((acc, m) => acc + m.totalLeft, 0);

  const selectedLeftTxs = reconciliationState.transactions.filter(t => reconciliationState.selectedLeftIds.has(t.id));
  const selectedRightTxs = reconciliationState.transactions.filter(t => reconciliationState.selectedRightIds.has(t.id));

  const getActualAmount = (t: Transaction): number => {
    const recon = t.recon?.toUpperCase() || '';
    if (recon.includes('DR')) return -Math.abs(t.amount);
    return Math.abs(t.amount);
  };

  const selLeftTotal = selectedLeftTxs.reduce((sum, t) => sum + getActualAmount(t), 0);
  const selRightTotal = selectedRightTxs.reduce((sum, t) => sum + getActualAmount(t), 0);
  const diff = Math.abs(selLeftTotal + selRightTotal);

  return (
    <AuthenticationGuard>
      <PermissionProvider currentUser={currentUser} rolePermissions={rolePermissions}>
        <ReconciliationLayout
          currentView={currentView}
          currentUser={currentUser}
          isUserMenuOpen={isUserMenuOpen}
          isRoleRequestOpen={isRoleRequestOpen}
          roleRequestReason={roleRequestReason}
          onViewChange={setCurrentView}
          onUserMenuToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
          onRoleRequestToggle={() => setIsRoleRequestOpen(!isRoleRequestOpen)}
          onRoleRequestSubmit={handleRoleRequest}
          onRoleRequestReasonChange={setRoleRequestReason}
          onLogout={async () => {
            await import('next-auth/react').then(({ signOut }) => {
              signOut({ redirect: false });
              window.location.href = '/login';
            });
          }}
          historyStackLength={reconciliationState.historyStack.length}
          futureStackLength={reconciliationState.futureStack.length}
          selectedSheetId={fileState.selectedSheetId}
          onUndo={reconciliationActions.undo}
          onRedo={reconciliationActions.redo}
          onHistoryModalOpen={() => setIsHistoryModalOpen(true)}
          onManualSnapshot={reconciliationActions.handleManualSnapshot}
          onAuditModalOpen={() => setIsAuditModalOpen(true)}
          onExport={() => {
            // Export trigger - handled by ExportManager component
            const trigger = document.getElementById('export-trigger') as HTMLButtonElement;
            trigger?.click();
          }}
          isPreviewModalOpen={false}
          onPreviewModalClose={() => {}}
          onConfirmExportFromPreview={() => {}}
          previewTransactions={[]}
          previewOptions={null}
          isAuditModalOpen={isAuditModalOpen}
          onAuditModalClose={() => setIsAuditModalOpen(false)}
          auditLogs={reconciliationState.auditLog}
          isHistoryModalOpen={isHistoryModalOpen}
          onHistoryModalClose={() => setIsHistoryModalOpen(false)}
          snapshots={reconciliationState.snapshots}
          onRestoreSnapshot={reconciliationActions.restoreSnapshot}
          users={users}
          isExportModalOpen={false}
          onExportModalClose={() => {}}
          onExecuteExport={async () => {}}
          onPreview={() => {}}
          currentSheetName={fileState.availableSheets.find(s => s.id === fileState.selectedSheetId)?.name || ''}
          currentSheetUnmatchedCount={reconciliationState.transactions.filter(t => t.status === 'UNMATCHED').length}
          workbookName={fileState.importedFiles.find(f => f.id === fileState.selectedFileId)?.filename || ''}
          totalSheetsCount={fileState.availableSheets.length}
          totalWorkbookUnmatchedCount={undefined}
        >
          <ViewRouter
            currentView={currentView}
            currentUser={currentUser}
            canAccessAdmin={reconciliationActionHandlers.hasPermission(currentUser.role, 'view_admin_panel')}
            // Workspace props
            importedFiles={fileState.importedFiles}
            selectedFileId={fileState.selectedFileId}
            availableSheets={fileState.availableSheets}
            selectedSheetId={fileState.selectedSheetId}
            isLoading={fileState.isLoading}
            sheetMetadata={fileState.sheetMetadata}
            onFileChange={fileActions.handleFileChange}
            onSheetChange={(sheetId) => fileActions.handleSheetChange(
              sheetId, currentUser, reconciliationActions.setTransactions,
              reconciliationActions.setSelectedLeftIds, reconciliationActions.setSelectedRightIds,
              reconciliationActions.setSelectedHistoryIds, reconciliationActions.setMatches,
              reconciliationActions.setMatchComment, reconciliationActions.setHistoryStack,
              reconciliationActions.setFutureStack, reconciliationActions.createSnapshot,
              reconciliationActions.addAuditLog, reconciliationActionHandlers.isPeriodLocked
            )}
            transactions={reconciliationState.transactions}
            matches={reconciliationState.matches}
            selectedLeftIds={reconciliationState.selectedLeftIds}
            selectedRightIds={reconciliationState.selectedRightIds}
            selectedHistoryIds={reconciliationState.selectedHistoryIds}
            leftFilter={reconciliationState.leftFilter}
            rightFilter={reconciliationState.rightFilter}
            matchComment={reconciliationState.matchComment}
            isCommentOpen={reconciliationState.isCommentOpen}
            onToggleSelect={reconciliationActions.toggleSelect}
            onFilterChange={(side, filter) => {
              if (side === 'LEFT') reconciliationActions.setLeftFilter(filter);
              else reconciliationActions.setRightFilter(filter);
            }}
            onExecuteMatch={() => reconciliationActions.executeMatch(
              currentUser, reconciliationActionHandlers.hasPermission, reconciliationActionHandlers.isPeriodLocked
            )}
            onClearSelection={reconciliationActions.clearSelection}
            onToggleComment={() => reconciliationActions.setIsCommentOpen(!reconciliationState.isCommentOpen)}
            onCommentChange={reconciliationActions.setMatchComment}
            onUnmatch={reconciliationActionHandlers.handleUnmatch}
            onApprove={reconciliationActionHandlers.handleApproveMatch}
            onToggleHistorySelect={reconciliationActions.toggleHistorySelect}
            onToggleHistorySelectAll={reconciliationActions.toggleHistorySelectAll}
            onBatchUnmatch={reconciliationActionHandlers.handleBatchUnmatch}
            onBatchApprove={reconciliationActionHandlers.handleBatchApprove}
            onUpdateMatchComment={reconciliationActionHandlers.handleUpdateMatchComment}
            activeLeft={activeLeft}
            activeRight={activeRight}
            totalMatchedValue={totalMatchedValue}
            selectedLeftTxs={selectedLeftTxs}
            selectedRightTxs={selectedRightTxs}
            selLeftTotal={selLeftTotal}
            selRightTotal={selRightTotal}
            diff={diff}
            // Admin props
            users={users}
            onAddUser={async (user) => {
              if (!reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_users')) return;
              reconciliationActions.saveCheckpoint();
              try {
                const res = await fetch('/api/admin/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(user)
                });
                if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.error || 'Failed to create user');
                }
                const newUser = await res.json();
                setUsers(prev => [...prev, { ...newUser, role: newUser.role as UserRole }]);
                reconciliationActions.addAuditLog("User Mgmt", `Created user ${user.name} via API`);
              } catch (error: any) {
                alert(`Error: ${error.message}`);
              }
            }}
            onUpdateUser={async (user) => {
              if (!reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_users')) return;
              reconciliationActions.saveCheckpoint();
              try {
                const res = await fetch(`/api/admin/users/${user.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(user)
                });
                if (res.ok) {
                  const updated = await res.json();
                  setUsers(prev => prev.map(x => x.id === user.id ? { ...updated, role: updated.role as UserRole } : x));
                  reconciliationActions.addAuditLog("User Mgmt", `Updated user ${user.name} via API`);
                }
              } catch (error) {
                console.warn("API error", error);
              }
            }}
            onDeleteUser={async (id) => {
              if (!reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_users')) return;
              reconciliationActions.saveCheckpoint();
              try {
                const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
                if (res.ok) {
                  setUsers(prev => prev.filter(x => x.id !== id));
                  reconciliationActions.addAuditLog("User Mgmt", `Deleted user ID ${id} via API`);
                }
              } catch (error) {
                console.warn("API error", error);
              }
            }}
            auditLogs={reconciliationState.auditLog}
            rolePermissions={rolePermissions}
            onUpdatePermissions={(role, permissions) => {
              if (reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_users')) {
                reconciliationActions.saveCheckpoint();
                setRolePermissions(prev => ({ ...prev, [role]: permissions }));
              }
            }}
            lockedDate={fileState.lockedDate}
            onSetLockedDate={(date) => {
              if (reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_periods')) {
                reconciliationActions.saveCheckpoint();
                fileActions.setLockedDate(date);
              }
            }}
            roleRequests={roleRequests}
            onApproveRoleRequest={(reqId, approve) => {
              if (!reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_users')) return;
              reconciliationActions.saveCheckpoint();
              setRoleRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: approve ? 'APPROVED' : 'REJECTED' } : r));
              if (approve) {
                const req = roleRequests.find(r => r.id === reqId);
                if (req) {
                  const targetUser = users.find(u => u.id === req.userId);
                  if (targetUser) {
                    // Update user role - this would be handled by AdminOperations
                  }
                  reconciliationActions.addAuditLog("User Mgmt", `Approved role upgrade for ${req.userName}`);
                }
              }
            }}
          />

          <ExportManager
            currentUser={currentUser}
            rolePermissions={rolePermissions}
            transactions={reconciliationState.transactions}
            selectedFileId={fileState.selectedFileId}
            selectedSheetId={fileState.selectedSheetId}
            importedFiles={fileState.importedFiles}
            availableSheets={fileState.availableSheets}
            sheetMetadata={fileState.sheetMetadata}
            onAuditLog={reconciliationActions.addAuditLog}
          />

          <AdminOperations
            currentUser={currentUser}
            rolePermissions={rolePermissions}
            users={users}
            roleRequests={roleRequests}
            lockedDate={fileState.lockedDate}
            onAddUser={async (user) => {
              if (!reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_users')) return;
              reconciliationActions.saveCheckpoint();
              try {
                const res = await fetch('/api/admin/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(user)
                });
                if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.error || 'Failed to create user');
                }
                const newUser = await res.json();
                setUsers(prev => [...prev, { ...newUser, role: newUser.role as UserRole }]);
                reconciliationActions.addAuditLog("User Mgmt", `Created user ${user.name} via API`);
              } catch (error: any) {
                alert(`Error: ${error.message}`);
              }
            }}
            onUpdateUser={async (user) => {
              if (!reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_users')) return;
              reconciliationActions.saveCheckpoint();
              try {
                const res = await fetch(`/api/admin/users/${user.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(user)
                });
                if (res.ok) {
                  const updated = await res.json();
                  setUsers(prev => prev.map(x => x.id === user.id ? { ...updated, role: updated.role as UserRole } : x));
                  reconciliationActions.addAuditLog("User Mgmt", `Updated user ${user.name} via API`);
                }
              } catch (error) {
                console.warn("API error", error);
              }
            }}
            onDeleteUser={async (id) => {
              if (!reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_users')) return;
              reconciliationActions.saveCheckpoint();
              try {
                const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
                if (res.ok) {
                  setUsers(prev => prev.filter(x => x.id !== id));
                  reconciliationActions.addAuditLog("User Mgmt", `Deleted user ID ${id} via API`);
                }
              } catch (error) {
                console.warn("API error", error);
              }
            }}
            onUpdatePermissions={(role, permissions) => {
              if (reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_users')) {
                reconciliationActions.saveCheckpoint();
                setRolePermissions(prev => ({ ...prev, [role]: permissions }));
              }
            }}
            onSetLockedDate={(date) => {
              if (reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_periods')) {
                reconciliationActions.saveCheckpoint();
                fileActions.setLockedDate(date);
              }
            }}
            onApproveRoleRequest={(reqId, approve) => {
              if (!reconciliationActionHandlers.hasPermission(currentUser.role, 'manage_users')) return;
              reconciliationActions.saveCheckpoint();
              setRoleRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: approve ? 'APPROVED' : 'REJECTED' } : r));
              if (approve) {
                const req = roleRequests.find(r => r.id === reqId);
                if (req) {
                  const targetUser = users.find(u => u.id === req.userId);
                  if (targetUser) {
                    // Update user role
                    const updatedUser = { ...targetUser, role: req.requestedRole };
                    // This would trigger the onUpdateUser callback
                  }
                  reconciliationActions.addAuditLog("User Mgmt", `Approved role upgrade for ${req.userName}`);
                }
              }
            }}
            onAuditLog={reconciliationActions.addAuditLog}
          />

          <AuditLogModal
            isOpen={isAuditModalOpen}
            onClose={() => setIsAuditModalOpen(false)}
            logs={reconciliationState.auditLog}
            currentUser={currentUser}
          />

          <SnapshotHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            snapshots={reconciliationState.snapshots}
            onRestore={reconciliationActions.restoreSnapshot}
            users={users}
          />
        </ReconciliationLayout>
      </PermissionProvider>
    </AuthenticationGuard>
  );
};
