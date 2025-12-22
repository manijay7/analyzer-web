"use client";

import React from 'react';
import { TransactionTable } from './TransactionTable';
import { Transaction, Side } from '@/lib/types';

interface TransactionWorkspaceProps {
  activeLeft: Transaction[];
  activeRight: Transaction[];
  selectedLeftIds: Set<string>;
  selectedRightIds: Set<string>;
  leftFilter: string;
  rightFilter: string;
  onToggleSelect: (id: string, side: Side) => void;
  onFilterChange: (side: Side, filter: string) => void;
  metadata?: Record<string, any> | null;
}

export const TransactionWorkspace: React.FC<TransactionWorkspaceProps> = ({
  activeLeft,
  activeRight,
  selectedLeftIds,
  selectedRightIds,
  leftFilter,
  rightFilter,
  onToggleSelect,
  onFilterChange,
  metadata,
}) => {
  return (
    <div className="flex flex-row gap-6 h-[55vh]">
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
          metadata={metadata}
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
          metadata={metadata}
        />
      </div>
    </div>
  );
};