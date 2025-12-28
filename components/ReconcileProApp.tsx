"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Transaction, Side, TransactionStatus, MatchGroup, AuditLogEntry, User, UserRole, Permission, RolePermissions, MatchStatus, SystemSnapshot, RoleRequest } from '@/lib/types';
import { AuditLogModal } from './AuditLogModal';
import { AdminDashboard } from './AdminDashboard';
import { SnapshotHistoryModal } from './SnapshotHistoryModal';
import { ExportScopeModal, ExportFormat } from './ExportScopeModal';
import { ReconciliationReportPreviewModal } from './ReconciliationReportPreviewModal';
import { ReconciliationLayout } from './ReconciliationLayout';
import { WorkspaceContainer } from './WorkspaceContainer';
import { WRITE_OFF_LIMIT, DATE_WARNING_THRESHOLD_DAYS, DEFAULT_ROLE_PERMISSIONS, STORAGE_KEY, APP_NAME, ROLE_ADJUSTMENT_LIMITS, IDLE_TIMEOUT_MS } from '@/lib/constants';
import { TransactionImportWorkspace } from './TransactionImportWorkspace';
import { FolderSyncManager } from './FolderSyncManager';
import { exportTransactionsToCSV, ExportTransaction } from '@/lib/csv-export';
import { exportCustomReconciliationReport } from '@/lib/reconciliation-report-export';
import { useReconciliationState } from '@/hooks/useReconciliationState';
import { useFileManagement } from '@/hooks/useFileManagement';
import {
  Scale, RefreshCw, Upload, Calendar, Link2, AlertTriangle, ArrowRightLeft,
  TrendingUp, DollarSign, Activity, X, RotateCcw, RotateCw,
  Download, FileText, CheckCircle, LogOut, ChevronDown, ShieldAlert,
  LayoutDashboard, History, Save, MessageCircle, UserPlus, FolderSync
} from 'lucide-react';

// Undo Stack Limit
const MAX_UNDO_STACK = 20;

type ViewMode = 'workspace' | 'admin' | 'import' | 'sync';

// Simple Schema Validation Helper
const validateTransaction = (tx: Transaction): boolean => {
  if (!tx.id || !tx.date || !tx.description || typeof tx.amount !== 'number') return false;
  // Ensure date is YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(tx.date)) return false;
  return true;
};

export const AnalyzerWebApp: React.FC = () => {
  // --- Auth Session ---
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isLoadingSession = status === 'loading';

  // --- Derived User Object from Session ---
  // Default to a fallback object if needed for types, but logic is guarded by isAuthenticated
  const currentUser: User = session?.user ? {
    id: session.user.id,
    name: session.user.name || 'Unknown',
    email: session.user.email || '',
    role: session.user.role || UserRole.Analyst,
    avatar: session.user.avatar || 'U',
    status: 'active'
  } : { id: 'guest', name: 'Guest', role: UserRole.Analyst, avatar: 'G', email: '' };

  // --- Custom Hooks (after currentUser is defined) ---
  const [reconciliationState, reconciliationActions] = useReconciliationState(currentUser);
  const [fileState, fileActions] = useFileManagement(status);

  // --- State ---
  const [users, setUsers] = useState<User[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);

  const [currentView, setCurrentView] = useState<ViewMode>('workspace');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRoleRequestOpen, setIsRoleRequestOpen] = useState(false);
  const [roleRequestReason, setRoleRequestReason] = useState("");

  // Permissions State
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);

  // UI State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [previewTransactions, setPreviewTransactions] = useState<ExportTransaction[]>([]);
  const [previewOptions, setPreviewOptions] = useState<any>(null);

  // --- Idle Timeout Logic ---
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkIdle = () => {
      if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS) {
        console.log("Idle timeout reached. Signing out.");
        handleLogout();
      }
    };

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    // Events to track activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    const interval = setInterval(checkIdle, 60000); // Check every minute

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      clearInterval(interval);
    };
  }, [isAuthenticated]);


  // --- Persistence & Initialization ---


  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // We will try to fetch users from API, if fail use storage
        if (parsed.users) setUsers(parsed.users);
        if (parsed.rolePermissions) setRolePermissions(parsed.rolePermissions);
        if (parsed.roleRequests) setRoleRequests(parsed.roleRequests);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }

    // Attempt to fetch real users if authenticated and has permission
    if (status === 'authenticated') {
        fetch('/api/admin/users')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch users');
            })
            .then(apiUsers => {
                if (Array.isArray(apiUsers) && apiUsers.length > 0) {
                    // Normalize the roles from DB string to Enum if needed
                    const normalized = apiUsers.map((u: any) => ({
                        ...u,
                        role: u.role as UserRole
                    }));
                    setUsers(normalized);
                }
            })
            .catch(err => {
                // If permission denied or DB error, we just don't update the user list for admin panel
                console.log("Could not fetch user list (likely insufficient permissions or first run)");
            });
    }
  }, [status]);

  // Refresh imported files when switching back to workspace view
  useEffect(() => {
    if ((currentView === 'workspace' || currentView === 'sync') && isAuthenticated) {
      fileActions.fetchImportedFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, isAuthenticated]);

  // Save to local storage on change
  useEffect(() => {
    if (!fileState.isInitialized) return;
    const stateToSave = {
      users,
      rolePermissions,
      roleRequests,
      timestamp: Date.now()
    };
    // Merge with existing storage to preserve hook-managed data
    const existingData = localStorage.getItem(STORAGE_KEY);
    let parsed = {};
    if (existingData) {
      try {
        parsed = JSON.parse(existingData);
      } catch (e) {
        console.error("Failed to parse existing storage", e);
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, ...stateToSave }));
  }, [users, rolePermissions, roleRequests, fileState.isInitialized]);


  // --- Helper Functions ---

  const hasPermission = (role: UserRole, permission: Permission): boolean => {
    return rolePermissions[role]?.includes(permission) ?? false;
  };

  const isPeriodLocked = (dateStr: string): boolean => {
    if (!fileState.lockedDate) return false;
    return new Date(dateStr) <= new Date(fileState.lockedDate);
  };

  const handleLogout = async () => {
    // Explicitly do not redirect automatically, wait for manual window location change
    // This ensures client state is fully wiped by browser navigation
    await signOut({ redirect: false });
    window.location.href = '/login';
  };


  // --- Role Requests ---
  const handleRoleRequest = () => {
    if (!roleRequestReason) return;
    reconciliationActions.saveCheckpoint();
    const request: RoleRequest = {
        id: Math.random().toString(36).substring(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        requestedRole: UserRole.Manager, // Default upgrade request
        reason: roleRequestReason,
        status: 'PENDING',
        timestamp: Date.now()
    };
    setRoleRequests(prev => [...prev, request]);
    setIsRoleRequestOpen(false);
    setRoleRequestReason("");
    alert("Role upgrade request sent to Admins.");
    reconciliationActions.addAuditLog("Role Request", "User requested upgrade to Manager.");
  };

  const handleExport = () => {
    if (!hasPermission(currentUser.role, 'export_data')) {
      alert("Permission Denied.");
      return;
    }

    // Check if sheet is selected
    if (!fileState.selectedSheetId) {
      alert("Please select a sheet first.");
      return;
    }

    // Open export scope modal
    setIsExportModalOpen(true);
  };

  const executeExport = async (scope: 'current' | 'workbook', format: ExportFormat) => {
    try {
      const selectedFile = fileState.importedFiles.find(f => f.id === fileState.selectedFileId);
      const selectedSheet = fileState.availableSheets.find(s => s.id === fileState.selectedSheetId);

      if (!selectedFile) {
        throw new Error('File not found');
      }

      let exportTransactions: ExportTransaction[] = [];

      if (scope === 'current') {
        // Export current sheet - use in-memory transactions
        const unmatchedTxs = reconciliationState.transactions.filter(t => t.status === TransactionStatus.Unmatched);

        exportTransactions = unmatchedTxs.map(tx => ({
          ...tx,
          sheetName: selectedSheet?.name || '',
          fileName: selectedFile.filename,
          sheetMetadata: fileState.sheetMetadata || {},
        }));

        // Export based on selected format
        if (format === 'reconciliation') {
          exportCustomReconciliationReport(exportTransactions, {
            scope: 'current',
            fileName: selectedFile.filename,
            sheetName: selectedSheet?.name,
            metadata: fileState.sheetMetadata || {},
            reviewedBy: currentUser.name, // Current user is reviewing/exporting
            sheetImport: {
              metaData: {
                bankName: fileState.sheetMetadata?.['bank name'] || fileState.sheetMetadata?.['BANK NAME'] || '',
                bankAccountNumber: fileState.sheetMetadata?.['BANK ACCOUNT NUMBER'] || '',
                generalLedgerName: fileState.sheetMetadata?.['GENERAL LEDGER NAME'] || '',
                generalLedgerNumber: fileState.sheetMetadata?.['GENERAL LEDGER NUMBER'] || '',
                balancePerBankStatement: fileState.sheetMetadata?.['BALANCE PER BANK STATEMENT'] || 0,
                internalAccountBalance: fileState.sheetMetadata?.['INTERNAL ACCOUNT BALANCE AS AT'] || 0,
                reportingDate: selectedSheet?.reportingDate || '',
              }
            }
          });
        } else {
          exportTransactionsToCSV(exportTransactions, {
            scope: 'current',
            fileName: selectedFile.filename,
            sheetName: selectedSheet?.name,
          });
        }

        reconciliationActions.addAuditLog(
          "Export",
          `Exported ${exportTransactions.length} unmatched transactions from sheet "${selectedSheet?.name}" (Format: ${format})`
        );
      } else {
        // Export entire workbook - fetch from API
        const response = await fetch('/api/transactions/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: fileState.selectedFileId,
            scope: 'workbook',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch workbook data');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Export failed');
        }

        exportTransactions = result.data.transactions;

        // Export based on selected format
        if (format === 'reconciliation') {
          exportCustomReconciliationReport(exportTransactions, {
            scope: 'workbook',
            fileName: selectedFile.filename,
            metadata: fileState.sheetMetadata || {},
            reviewedBy: currentUser.name, // Current user is reviewing/exporting
            sheetImport: {
              metaData: {
                bankName: fileState.sheetMetadata?.['GENERAL LEDGER NAME'] || fileState.sheetMetadata?.['BANK NAME'] || '',
                bankAccountNumber: fileState.sheetMetadata?.['BANK ACCOUNT NUMBER'] || '',
                generalLedgerName: fileState.sheetMetadata?.['GENERAL LEDGER NAME'] || '',
                generalLedgerNumber: fileState.sheetMetadata?.['GENERAL LEDGER NUMBER'] || '',
                balancePerBankStatement: fileState.sheetMetadata?.['BALANCE PER BANK STATEMENT'] || 0,
                reportingDate: '',
              }
            }
          });
        } else {
          exportTransactionsToCSV(exportTransactions, {
            scope: 'workbook',
            fileName: selectedFile.filename,
          });
        }

        reconciliationActions.addAuditLog(
          "Export",
          `Exported ${exportTransactions.length} unmatched transactions from ${result.data.metadata.totalSheets} sheets in workbook "${selectedFile.filename}" (Format: ${format})`
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
      throw error;
    }
  };
  // Wrapper functions for hook actions
  const handleUnmatch = (matchId: string) => reconciliationActions.handleUnmatch(matchId, currentUser, hasPermission, isPeriodLocked);
  const handleUpdateMatchComment = (matchId: string, newComment: string) => reconciliationActions.handleUpdateMatchComment(matchId, newComment, isPeriodLocked);
  const toggleSelect = (id: string, side: Side) => reconciliationActions.toggleSelect(id, side);
  const clearSelection = () => reconciliationActions.clearSelection();
  const toggleHistorySelect = (id: string) => reconciliationActions.toggleHistorySelect(id);
  const toggleHistorySelectAll = () => reconciliationActions.toggleHistorySelectAll();
  const handleBatchUnmatch = () => reconciliationActions.handleBatchUnmatch(currentUser, hasPermission, isPeriodLocked);
  const handleBatchApprove = () => reconciliationActions.handleBatchApprove(currentUser, hasPermission);

  // --- Admin Logic Hooks (API Integrated) ---
  const handleAddUser = async (u: Omit<User, 'id'>) => { 
      if (!hasPermission(currentUser.role, 'manage_users')) return; 
      
      reconciliationActions.saveCheckpoint();
      
      try {
          const res = await fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(u)
          });
          
          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to create user');
          }
          
          const newUser = await res.json();
          setUsers(prev => [...prev, { ...newUser, role: newUser.role as UserRole }]);
          reconciliationActions.addAuditLog("User Mgmt", `Created user ${u.name} via API`);
      } catch (e: any) {
          alert(`Error: ${e.message}`);
      }
  };

  const handleUpdateUser = async (u: User) => { 
      if (!hasPermission(currentUser.role, 'manage_users')) return; 
      reconciliationActions.saveCheckpoint();
      
      try {
          const res = await fetch(`/api/admin/users/${u.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(u)
          });
          
          if (res.ok) {
            const updated = await res.json();
            setUsers(prev => prev.map(x => x.id === u.id ? { ...updated, role: updated.role as UserRole } : x));
            reconciliationActions.addAuditLog("User Mgmt", `Updated user ${u.name} via API`);
            return;
          }
      } catch (e) {
         console.warn("API error", e);
      }
  };

  const handleDeleteUser = async (id: string) => { 
      if (!hasPermission(currentUser.role, 'manage_users')) return; 
      reconciliationActions.saveCheckpoint();
      
      try {
          const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
          if (res.ok) {
              setUsers(prev => prev.filter(x => x.id !== id));
              reconciliationActions.addAuditLog("User Mgmt", `Deleted user ID ${id} via API`);
              return;
          }
      } catch (e) {
          console.warn("API error", e);
      }
  };
  
  const handleUpdatePermissions = (r: UserRole, p: Permission[]) => { if (hasPermission(currentUser.role, 'manage_users')) { reconciliationActions.saveCheckpoint(); setRolePermissions(prev => ({...prev, [r]: p})); } };
  const handleSetLockedDate = (d: string | null) => { if (hasPermission(currentUser.role, 'manage_periods')) { reconciliationActions.saveCheckpoint(); fileActions.setLockedDate(d); } };
  const handleApproveRoleRequest = (reqId: string, approve: boolean) => {
      if (!hasPermission(currentUser.role, 'manage_users')) return;
      reconciliationActions.saveCheckpoint();
      setRoleRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: approve ? 'APPROVED' : 'REJECTED' } : r));
      if (approve) {
          const req = roleRequests.find(r => r.id === reqId);
          if (req) {
              // Also update the actual user role
              const targetUser = users.find(u => u.id === req.userId);
              if (targetUser) {
                  handleUpdateUser({ ...targetUser, role: req.requestedRole });
              }
              reconciliationActions.addAuditLog("User Mgmt", `Approved role upgrade for ${req.userName}`);
          }
      }
  };

  const handlePreview = (scope: 'current' | 'workbook') => {
    const selectedFile = fileState.importedFiles.find(f => f.id === fileState.selectedFileId);
    const selectedSheet = fileState.availableSheets.find(s => s.id === fileState.selectedSheetId);

    if (!selectedFile) {
      alert('File not found');
      return;
    }

    // For preview, we only support current sheet (workbook preview would be too complex)
    if (scope === 'workbook') {
      alert('Preview is only available for current sheet. Workbook exports can be downloaded directly.');
      return;
    }

    // Prepare transactions for preview
    const unmatchedTxs = reconciliationState.transactions.filter(t => t.status === TransactionStatus.Unmatched);

    const exportTransactions: ExportTransaction[] = unmatchedTxs.map(tx => ({
      ...tx,
      sheetName: selectedSheet?.name || '',
      fileName: selectedFile.filename,
      sheetMetadata: fileState.sheetMetadata || {},
    }));

    // Prepare options
    const options = {
      scope: 'current' as const,
      fileName: selectedFile.filename,
      sheetName: selectedSheet?.name,
      metadata: fileState.sheetMetadata || {},
      reviewedBy: currentUser.name,
      sheetImport: {
        metaData: {
          bankName: fileState.sheetMetadata?.['bank name'] || fileState.sheetMetadata?.['BANK NAME'] || '',
          bankAccountNumber: fileState.sheetMetadata?.['BANK ACCOUNT NUMBER'] || '',
          generalLedgerName: fileState.sheetMetadata?.['GENERAL LEDGER NAME'] || '',
          generalLedgerNumber: fileState.sheetMetadata?.['GENERAL LEDGER NUMBER'] || '',
          balancePerBankStatement: fileState.sheetMetadata?.['BALANCE PER BANK STATEMENT'] || 0,
          internalAccountBalance: fileState.sheetMetadata?.['INTERNAL ACCOUNT BALANCE AS AT'] || 0,
          reportingDate: selectedSheet?.reportingDate || '',
        }
      }
    };

    setPreviewTransactions(exportTransactions);
    setPreviewOptions(options);
    setIsPreviewModalOpen(true);
  };
  
  const handleConfirmExportFromPreview = () => {
    setIsPreviewModalOpen(false);

    // Execute the export with the same data
    if (previewTransactions.length > 0 && previewOptions) {
      exportCustomReconciliationReport(previewTransactions, previewOptions);

      reconciliationActions.addAuditLog(
        "Export",
        `Exported ${previewTransactions.length} unmatched transactions from sheet "${previewOptions.sheetName}" (Format: reconciliation)`
      );
    }
  };



  // Prevent flashing login content if loading, but handle unauthenticated explicitly
  if (isLoadingSession || !fileState.isInitialized) return <div className="h-screen flex items-center justify-center text-gray-500">Loading {APP_NAME}...</div>;
  if (!isAuthenticated) return null; // Middleware handles the redirect

  // Computed values for rendering
  const activeLeft = reconciliationState.transactions.filter(t => t.side === Side.Left && t.status === TransactionStatus.Unmatched && t.description.toLowerCase().includes(reconciliationState.leftFilter.toLowerCase()));
  const activeRight = reconciliationState.transactions.filter(t => t.side === Side.Right && t.status === TransactionStatus.Unmatched && t.description.toLowerCase().includes(reconciliationState.rightFilter.toLowerCase()));
  const totalMatchedValue = reconciliationState.matches.reduce((acc, m) => acc + m.totalLeft, 0);

  const selectedLeftTxs = reconciliationState.transactions.filter(t => reconciliationState.selectedLeftIds.has(t.id));
  const selectedRightTxs = reconciliationState.transactions.filter(t => reconciliationState.selectedRightIds.has(t.id));

  // Helper function to get actual amount (negative for DR transactions)
  const getActualAmount = (t: Transaction): number => {
    const recon = t.recon?.toUpperCase() || '';
    if (recon.includes('DR')) {
      return -Math.abs(t.amount); // DR transactions are negative
    }
    return Math.abs(t.amount); // CR transactions are positive
  };

  const selLeftTotal = selectedLeftTxs.reduce((sum, t) => sum + getActualAmount(t), 0);
  const selRightTotal = selectedRightTxs.reduce((sum, t) => sum + getActualAmount(t), 0);
  const diff = Math.abs(selLeftTotal + selRightTotal);

  const canAccessAdmin = hasPermission(currentUser.role, 'view_admin_panel');
  const canUnmatch = hasPermission(currentUser.role, 'unmatch_transactions');
  const canApprove = hasPermission(currentUser.role, 'approve_adjustments');

  return (
    <ReconciliationLayout
      currentView={currentView}
      currentUser={currentUser}
      canAccessAdmin={canAccessAdmin}
      isUserMenuOpen={isUserMenuOpen}
      isRoleRequestOpen={isRoleRequestOpen}
      roleRequestReason={roleRequestReason}
      onViewChange={setCurrentView}
      onUserMenuToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
      onRoleRequestToggle={() => setIsRoleRequestOpen(!isRoleRequestOpen)}
      onRoleRequestSubmit={handleRoleRequest}
      onRoleRequestReasonChange={setRoleRequestReason}
      onLogout={handleLogout}
      historyStackLength={reconciliationState.historyStack.length}
      futureStackLength={reconciliationState.futureStack.length}
      selectedSheetId={fileState.selectedSheetId}
      onUndo={reconciliationActions.undo}
      onRedo={reconciliationActions.redo}
      onHistoryModalOpen={() => setIsHistoryModalOpen(true)}
      onManualSnapshot={reconciliationActions.handleManualSnapshot}
      onAuditModalOpen={() => setIsAuditModalOpen(true)}
      onExport={handleExport}
      isPreviewModalOpen={isPreviewModalOpen}
      onPreviewModalClose={() => setIsPreviewModalOpen(false)}
      onConfirmExportFromPreview={handleConfirmExportFromPreview}
      previewTransactions={previewTransactions}
      previewOptions={previewOptions}
      isAuditModalOpen={isAuditModalOpen}
      onAuditModalClose={() => setIsAuditModalOpen(false)}
      auditLogs={reconciliationState.auditLog}
      isHistoryModalOpen={isHistoryModalOpen}
      onHistoryModalClose={() => setIsHistoryModalOpen(false)}
      snapshots={reconciliationState.snapshots}
      onRestoreSnapshot={reconciliationActions.restoreSnapshot}
      users={users}
      isExportModalOpen={isExportModalOpen}
      onExportModalClose={() => setIsExportModalOpen(false)}
      onExecuteExport={executeExport}
      onPreview={handlePreview}
      currentSheetName={fileState.availableSheets.find(s => s.id === fileState.selectedSheetId)?.name || ''}
      currentSheetUnmatchedCount={reconciliationState.transactions.filter(t => t.status === TransactionStatus.Unmatched).length}
      workbookName={fileState.importedFiles.find(f => f.id === fileState.selectedFileId)?.filename || ''}
      totalSheetsCount={fileState.availableSheets.length}
      totalWorkbookUnmatchedCount={undefined}
    >
      {currentView === 'admin' && canAccessAdmin ? (
        <AdminDashboard
          users={users}
          onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser}
          currentUser={currentUser} auditLogs={reconciliationState.auditLog} rolePermissions={rolePermissions} onUpdatePermissions={handleUpdatePermissions}
          lockedDate={fileState.lockedDate} onSetLockedDate={handleSetLockedDate}
          roleRequests={roleRequests} onApproveRoleRequest={handleApproveRoleRequest}
        />
      ) : currentView === 'import' ? (
        <div className="flex-1 h-[calc(100vh-4rem)] overflow-hidden">
          <TransactionImportWorkspace />
        </div>
      ) : currentView === 'sync' ? (
        <div className="flex-1 h-[calc(100vh-4rem)] overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            <FolderSyncManager />
          </div>
        </div>
      ) : (
        <WorkspaceContainer
          importedFiles={fileState.importedFiles}
          selectedFileId={fileState.selectedFileId}
          availableSheets={fileState.availableSheets}
          selectedSheetId={fileState.selectedSheetId}
          isLoading={fileState.isLoading}
          sheetMetadata={fileState.sheetMetadata}
          onFileChange={fileActions.handleFileChange}
          onSheetChange={(sheetId) => fileActions.handleSheetChange(sheetId, currentUser, reconciliationActions.setTransactions, reconciliationActions.setSelectedLeftIds, reconciliationActions.setSelectedRightIds, reconciliationActions.setSelectedHistoryIds, reconciliationActions.setMatches, reconciliationActions.setMatchComment, reconciliationActions.setHistoryStack, reconciliationActions.setFutureStack, reconciliationActions.createSnapshot, reconciliationActions.addAuditLog, isPeriodLocked)}
          transactions={reconciliationState.transactions}
          matches={reconciliationState.matches}
          selectedLeftIds={reconciliationState.selectedLeftIds}
          selectedRightIds={reconciliationState.selectedRightIds}
          selectedHistoryIds={reconciliationState.selectedHistoryIds}
          leftFilter={reconciliationState.leftFilter}
          rightFilter={reconciliationState.rightFilter}
          matchComment={reconciliationState.matchComment}
          isCommentOpen={reconciliationState.isCommentOpen}
          currentUser={currentUser}
          canUnmatch={canUnmatch}
          canApprove={canApprove}
          onToggleSelect={reconciliationActions.toggleSelect}
          onFilterChange={(side, filter) => {
            if (side === Side.Left) reconciliationActions.setLeftFilter(filter);
            else reconciliationActions.setRightFilter(filter);
          }}
          onExecuteMatch={() => reconciliationActions.executeMatch(currentUser, hasPermission, isPeriodLocked)}
          onClearSelection={reconciliationActions.clearSelection}
          onToggleComment={() => reconciliationActions.setIsCommentOpen(!reconciliationState.isCommentOpen)}
          onCommentChange={reconciliationActions.setMatchComment}
          onUnmatch={handleUnmatch}
          onApprove={(matchId) => reconciliationActions.handleApproveMatch(matchId, currentUser, hasPermission)}
          onToggleHistorySelect={reconciliationActions.toggleHistorySelect}
          onToggleHistorySelectAll={reconciliationActions.toggleHistorySelectAll}
          onBatchUnmatch={handleBatchUnmatch}
          onBatchApprove={handleBatchApprove}
          onUpdateMatchComment={handleUpdateMatchComment}
          activeLeft={activeLeft}
          activeRight={activeRight}
          totalMatchedValue={totalMatchedValue}
          selectedLeftTxs={selectedLeftTxs}
          selectedRightTxs={selectedRightTxs}
          selLeftTotal={selLeftTotal}
          selRightTotal={selRightTotal}
          diff={diff}
        />
      )}
    </ReconciliationLayout>
  );
};
