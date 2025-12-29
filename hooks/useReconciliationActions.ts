"use client";

import { useCallback } from "react";
import {
  User,
  UserRole,
  Permission,
  RolePermissions,
  Side,
  TransactionStatus,
} from "@/lib/types";

interface UseReconciliationActionsProps {
  currentUser: User;
  rolePermissions: RolePermissions;
  lockedDate: string | null;
  onAuditLog: (action: string, details: string) => void;
  reconciliationActions: any; // From useReconciliationState hook
}

export const useReconciliationActions = ({
  currentUser,
  rolePermissions,
  lockedDate,
  onAuditLog,
  reconciliationActions,
}: UseReconciliationActionsProps) => {
  const hasPermission = useCallback(
    (role: UserRole, permission: Permission): boolean => {
      return rolePermissions[role]?.includes(permission) ?? false;
    },
    [rolePermissions]
  );

  const isPeriodLocked = useCallback(
    (dateStr: string): boolean => {
      if (!lockedDate) return false;
      return new Date(dateStr) <= new Date(lockedDate);
    },
    [lockedDate]
  );

  const handleUnmatch = useCallback(
    (matchId: string) => {
      reconciliationActions.handleUnmatch(
        matchId,
        currentUser,
        hasPermission,
        isPeriodLocked
      );
    },
    [reconciliationActions, currentUser, hasPermission, isPeriodLocked]
  );

  const handleUpdateMatchComment = useCallback(
    (matchId: string, newComment: string) => {
      reconciliationActions.handleUpdateMatchComment(
        matchId,
        newComment,
        isPeriodLocked
      );
    },
    [reconciliationActions, isPeriodLocked]
  );

  const toggleSelect = useCallback(
    (id: string, side: Side) => {
      reconciliationActions.toggleSelect(id, side);
    },
    [reconciliationActions]
  );

  const clearSelection = useCallback(() => {
    reconciliationActions.clearSelection();
  }, [reconciliationActions]);

  const toggleHistorySelect = useCallback(
    (id: string) => {
      reconciliationActions.toggleHistorySelect(id);
    },
    [reconciliationActions]
  );

  const toggleHistorySelectAll = useCallback(() => {
    reconciliationActions.toggleHistorySelectAll();
  }, [reconciliationActions]);

  const handleBatchUnmatch = useCallback(() => {
    reconciliationActions.handleBatchUnmatch(
      currentUser,
      hasPermission,
      isPeriodLocked
    );
  }, [reconciliationActions, currentUser, hasPermission, isPeriodLocked]);

  const handleBatchApprove = useCallback(() => {
    reconciliationActions.handleBatchApprove(currentUser, hasPermission);
  }, [reconciliationActions, currentUser, hasPermission]);

  const executeMatch = useCallback(() => {
    reconciliationActions.executeMatch(
      currentUser,
      hasPermission,
      isPeriodLocked
    );
  }, [reconciliationActions, currentUser, hasPermission, isPeriodLocked]);

  const handleApproveMatch = useCallback(
    (matchId: string) => {
      reconciliationActions.handleApproveMatch(
        matchId,
        currentUser,
        hasPermission
      );
    },
    [reconciliationActions, currentUser, hasPermission]
  );

  return {
    handleUnmatch,
    handleUpdateMatchComment,
    toggleSelect,
    clearSelection,
    toggleHistorySelect,
    toggleHistorySelectAll,
    handleBatchUnmatch,
    handleBatchApprove,
    executeMatch,
    handleApproveMatch,
    hasPermission,
    isPeriodLocked,
  };
};
