"use client";

import React from 'react';
import { ReconciliationReportPreviewModal } from './ReconciliationReportPreviewModal';
import { AuditLogModal } from './AuditLogModal';
import { SnapshotHistoryModal } from './SnapshotHistoryModal';
import { ExportScopeModal, ExportFormat } from './ExportScopeModal';
import { AppHeader } from './AppHeader';
import { User, AuditLogEntry, SystemSnapshot } from '@/lib/types';
import { ExportTransaction } from '@/lib/csv-export';

type ViewMode = 'workspace' | 'admin' | 'import' | 'sync';

interface ReconciliationLayoutProps {
  currentView: ViewMode;
  currentUser: User;
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
  historyStackLength: number;
  futureStackLength: number;
  selectedSheetId: string;
  onUndo: () => void;
  onRedo: () => void;
  onHistoryModalOpen: () => void;
  onManualSnapshot: () => void;
  onAuditModalOpen: () => void;
  onExport: () => void;
  children: React.ReactNode;
  // Modal states
  isPreviewModalOpen: boolean;
  onPreviewModalClose: () => void;
  onConfirmExportFromPreview: () => void;
  previewTransactions: ExportTransaction[];
  previewOptions: any;
  isAuditModalOpen: boolean;
  onAuditModalClose: () => void;
  auditLogs: AuditLogEntry[];
  isHistoryModalOpen: boolean;
  onHistoryModalClose: () => void;
  snapshots: SystemSnapshot[];
  onRestoreSnapshot: (snapshot: SystemSnapshot) => void;
  users: User[];
  isExportModalOpen: boolean;
  onExportModalClose: () => void;
  onExecuteExport: (scope: 'current' | 'workbook', format: ExportFormat) => Promise<void>;
  onPreview: (scope: 'current' | 'workbook') => void;
  currentSheetName: string;
  currentSheetUnmatchedCount: number;
  workbookName: string;
  totalSheetsCount: number;
  totalWorkbookUnmatchedCount: number | undefined;
}

export const ReconciliationLayout: React.FC<ReconciliationLayoutProps> = ({
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
  children,
  isPreviewModalOpen,
  onPreviewModalClose,
  onConfirmExportFromPreview,
  previewTransactions,
  previewOptions,
  isAuditModalOpen,
  onAuditModalClose,
  auditLogs,
  isHistoryModalOpen,
  onHistoryModalClose,
  snapshots,
  onRestoreSnapshot,
  users,
  isExportModalOpen,
  onExportModalClose,
  onExecuteExport,
  onPreview,
  currentSheetName,
  currentSheetUnmatchedCount,
  workbookName,
  totalSheetsCount,
  totalWorkbookUnmatchedCount
}) => {
  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-[#f8fafc]">
      <ReconciliationReportPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={onPreviewModalClose}
        onConfirmExport={onConfirmExportFromPreview}
        transactions={previewTransactions}
        options={previewOptions}
      />
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={onAuditModalClose}
        logs={auditLogs}
        currentUser={currentUser}
      />
      <SnapshotHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={onHistoryModalClose}
        snapshots={snapshots}
        onRestore={onRestoreSnapshot}
        users={users}
      />
      <ExportScopeModal
        isOpen={isExportModalOpen}
        onClose={onExportModalClose}
        onExport={onExecuteExport}
        onPreview={onPreview}
        currentSheetName={currentSheetName}
        currentSheetUnmatchedCount={currentSheetUnmatchedCount}
        workbookName={workbookName}
        totalSheetsCount={totalSheetsCount}
        totalWorkbookUnmatchedCount={totalWorkbookUnmatchedCount}
      />

      <AppHeader
        currentView={currentView}
        currentUser={currentUser}
        canAccessAdmin={canAccessAdmin}
        isUserMenuOpen={isUserMenuOpen}
        isRoleRequestOpen={isRoleRequestOpen}
        roleRequestReason={roleRequestReason}
        onViewChange={onViewChange}
        onUserMenuToggle={onUserMenuToggle}
        onRoleRequestToggle={onRoleRequestToggle}
        onRoleRequestSubmit={onRoleRequestSubmit}
        onRoleRequestReasonChange={onRoleRequestReasonChange}
        onLogout={onLogout}
        historyStackLength={historyStackLength}
        futureStackLength={futureStackLength}
        selectedSheetId={selectedSheetId}
        onUndo={onUndo}
        onRedo={onRedo}
        onHistoryModalOpen={onHistoryModalOpen}
        onManualSnapshot={onManualSnapshot}
        onAuditModalOpen={onAuditModalOpen}
        onExport={onExport}
      />

      {children}
    </div>
  );
};