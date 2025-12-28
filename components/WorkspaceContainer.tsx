"use client";

import React from 'react';
import { TransactionTable } from './TransactionTable';
import { HistoryPanel } from './HistoryPanel';
import { FileSheetSelector } from './FileSheetSelector';
import { ReconciliationStats } from './ReconciliationStats';
import { ReconciliationActions } from './ReconciliationActions';
import { Transaction, MatchGroup, Side, User } from '@/lib/types';

interface WorkspaceContainerProps {
  // File/Sheet state
  importedFiles: any[];
  selectedFileId: string;
  availableSheets: any[];
  selectedSheetId: string;
  isLoading: boolean;
  sheetMetadata: Record<string, any> | null;
  onFileChange: (fileId: string) => void;
  onSheetChange: (sheetId: string) => void;

  // Transaction state
  transactions: Transaction[];
  matches: MatchGroup[];
  selectedLeftIds: Set<string>;
  selectedRightIds: Set<string>;
  selectedHistoryIds: Set<string>;
  leftFilter: string;
  rightFilter: string;
  matchComment: string;
  isCommentOpen: boolean;

  // User and permissions
  currentUser: User;
  canUnmatch: boolean;
  canApprove: boolean;

  // Actions
  onToggleSelect: (id: string, side: Side) => void;
  onFilterChange: (side: Side, filter: string) => void;
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

  // Computed values
  activeLeft: Transaction[];
  activeRight: Transaction[];
  totalMatchedValue: number;
  selectedLeftTxs: Transaction[];
  selectedRightTxs: Transaction[];
  selLeftTotal: number;
  selRightTotal: number;
  diff: number;
}

export const WorkspaceContainer: React.FC<WorkspaceContainerProps> = ({
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
  currentUser,
  canUnmatch,
  canApprove,
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
  diff
}) => {
  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* File and Sheet Selection Panel */}
      <FileSheetSelector
        importedFiles={importedFiles}
        selectedFileId={selectedFileId}
        availableSheets={availableSheets}
        selectedSheetId={selectedSheetId}
        isLoading={isLoading}
        sheetMetadata={sheetMetadata}
        onFileChange={onFileChange}
        onSheetChange={onSheetChange}
      />

      {/* Only show data when a sheet is selected */}
      {selectedSheetId ? (
        <>
          {/* Stats Cards */}
          <ReconciliationStats
            leftUnmatchedCount={activeLeft.length}
            rightUnmatchedCount={activeRight.length}
            totalMatches={matches.length}
            matchedValue={totalMatchedValue}
          />

          <div className="flex flex-row gap-6 h-[85vh]">
            <div className="w-1/2 h-full">
              <TransactionTable
                title="Internal Ledger (A)"
                transactions={activeLeft}
                selectedIds={selectedLeftIds}
                onToggleSelect={(id) => onToggleSelect(id, Side.Left)}
                side={Side.Left}
                className="h-full"
                filterText={leftFilter}
                onFilterChange={(filter) => onFilterChange(Side.Left, filter)}
                metadata={sheetMetadata}
              />
            </div>
            <div className="w-1/2 h-full">
              <TransactionTable
                title="Bank Statement (B)"
                transactions={activeRight}
                selectedIds={selectedRightIds}
                onToggleSelect={(id) => onToggleSelect(id, Side.Right)}
                side={Side.Right}
                className="h-full"
                filterText={rightFilter}
                onFilterChange={(filter) => onFilterChange(Side.Right, filter)}
                metadata={sheetMetadata}
              />
            </div>
          </div>

          <div className="w-full pb-36">
            <HistoryPanel
              matches={matches}
              onUnmatch={onUnmatch}
              currentUser={currentUser}
              canUnmatch={canUnmatch}
              canApprove={canApprove}
              onApprove={onApprove}
              lockedDate={null} // This will be passed from parent
              selectedIds={selectedHistoryIds}
              onToggleSelect={onToggleHistorySelect}
              onToggleSelectAll={onToggleHistorySelectAll}
              onBatchUnmatch={onBatchUnmatch}
              onBatchApprove={onBatchApprove}
              onUpdateComment={onUpdateMatchComment}
            />
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 text-gray-400">📄</div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sheet Selected</h3>
            <p className="text-sm text-gray-500">
              Please select an imported file and sheet from the dropdowns above to view transaction data and perform reconciliation.
            </p>
          </div>
        </div>
      )}

      {/* Sticky Action Bar */}
      <ReconciliationActions
        selectedLeftCount={selectedLeftIds.size}
        selectedRightCount={selectedRightIds.size}
        leftTotal={selLeftTotal}
        rightTotal={selRightTotal}
        difference={diff}
        matchComment={matchComment}
        isCommentOpen={isCommentOpen}
        currentUserRole={currentUser.role}
        onClearSelection={onClearSelection}
        onToggleComment={onToggleComment}
        onCommentChange={onCommentChange}
        onExecuteMatch={onExecuteMatch}
      />
    </main>
  );
};