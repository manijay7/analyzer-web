import { useState, useCallback } from "react";
import {
  Transaction,
  MatchGroup,
  AuditLogEntry,
  SystemSnapshot,
  Side,
  TransactionStatus,
  User,
} from "@/lib/types";
import { MAX_UNDO_STACK } from "@/lib/constants";

export interface ReconciliationState {
  transactions: Transaction[];
  matches: MatchGroup[];
  auditLog: AuditLogEntry[];
  snapshots: SystemSnapshot[];
  selectedLeftIds: Set<string>;
  selectedRightIds: Set<string>;
  selectedHistoryIds: Set<string>;
  leftFilter: string;
  rightFilter: string;
  matchComment: string;
  isCommentOpen: boolean;
  historyStack: string[];
  futureStack: string[];
}

export interface ReconciliationActions {
  setTransactions: (transactions: Transaction[]) => void;
  setMatches: (matches: MatchGroup[]) => void;
  setAuditLog: (auditLog: AuditLogEntry[]) => void;
  setSnapshots: (snapshots: SystemSnapshot[]) => void;
  setSelectedLeftIds: (ids: Set<string>) => void;
  setSelectedRightIds: (ids: Set<string>) => void;
  setSelectedHistoryIds: (ids: Set<string>) => void;
  setLeftFilter: (filter: string) => void;
  setRightFilter: (filter: string) => void;
  setMatchComment: (comment: string) => void;
  setIsCommentOpen: (open: boolean) => void;
  setHistoryStack: (stack: string[]) => void;
  setFutureStack: (stack: string[]) => void;
  addAuditLog: (action: string, details: string) => void;
  saveCheckpoint: () => void;
  undo: () => void;
  redo: () => void;
  executeMatch: (
    currentUser: User,
    hasPermission: (role: any, permission: any) => boolean,
    isPeriodLocked: (date: string) => boolean
  ) => void;
  handleApproveMatch: (
    matchId: string,
    currentUser: User,
    hasPermission: (role: any, permission: any) => boolean
  ) => void;
  handleUnmatch: (
    matchId: string,
    currentUser: User,
    hasPermission: (role: any, permission: any) => boolean,
    isPeriodLocked: (date: string) => boolean
  ) => void;
  handleUpdateMatchComment: (
    matchId: string,
    newComment: string,
    isPeriodLocked: (date: string) => boolean
  ) => void;
  toggleSelect: (id: string, side: Side) => void;
  clearSelection: () => void;
  toggleHistorySelect: (id: string) => void;
  toggleHistorySelectAll: () => void;
  handleBatchUnmatch: (
    currentUser: User,
    hasPermission: (role: any, permission: any) => boolean,
    isPeriodLocked: (date: string) => boolean
  ) => void;
  handleBatchApprove: (
    currentUser: User,
    hasPermission: (role: any, permission: any) => boolean
  ) => void;
  createSnapshot: (
    label: string,
    type: "IMPORT" | "MANUAL" | "AUTO",
    txs: Transaction[],
    matchGroups: MatchGroup[]
  ) => SystemSnapshot;
  restoreSnapshot: (snapshot: SystemSnapshot) => void;
  handleManualSnapshot: () => void;
}

export const useReconciliationState = (
  currentUser: User
): [ReconciliationState, ReconciliationActions] => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [matches, setMatches] = useState<MatchGroup[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [snapshots, setSnapshots] = useState<SystemSnapshot[]>([]);
  const [selectedLeftIds, setSelectedLeftIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedRightIds, setSelectedRightIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(
    new Set()
  );
  const [leftFilter, setLeftFilter] = useState("");
  const [rightFilter, setRightFilter] = useState("");
  const [matchComment, setMatchComment] = useState("");
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [futureStack, setFutureStack] = useState<string[]>([]);

  const addAuditLog = useCallback(
    (action: string, details: string) => {
      const newEntry: AuditLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        action,
        details,
        userId: currentUser.id,
        userName: currentUser.name,
      };
      setAuditLog((prev) => [...prev, newEntry]);
    },
    [currentUser]
  );

  const saveCheckpoint = useCallback(() => {
    const currentState = JSON.stringify({
      transactions,
      matches,
      auditLog,
      snapshots,
      selectedLeftIds: Array.from(selectedLeftIds),
      selectedRightIds: Array.from(selectedRightIds),
      selectedHistoryIds: Array.from(selectedHistoryIds),
      leftFilter,
      rightFilter,
      matchComment,
      isCommentOpen,
    });
    setHistoryStack((prev) => {
      const newStack = [...prev, currentState];
      if (newStack.length > MAX_UNDO_STACK) newStack.shift();
      return newStack;
    });
    setFutureStack([]);
  }, [
    transactions,
    matches,
    auditLog,
    snapshots,
    selectedLeftIds,
    selectedRightIds,
    selectedHistoryIds,
    leftFilter,
    rightFilter,
    matchComment,
    isCommentOpen,
  ]);

  const undo = useCallback(() => {
    if (historyStack.length === 0) return;

    const currentState = JSON.stringify({
      transactions,
      matches,
      auditLog,
      snapshots,
      selectedLeftIds: Array.from(selectedLeftIds),
      selectedRightIds: Array.from(selectedRightIds),
      selectedHistoryIds: Array.from(selectedHistoryIds),
      leftFilter,
      rightFilter,
      matchComment,
      isCommentOpen,
    });
    setFutureStack((prev) => [currentState, ...prev]);

    const previousStateString = historyStack[historyStack.length - 1];
    restoreState(previousStateString);

    setHistoryStack((prev) => prev.slice(0, -1));
  }, [
    transactions,
    matches,
    auditLog,
    snapshots,
    selectedLeftIds,
    selectedRightIds,
    selectedHistoryIds,
    leftFilter,
    rightFilter,
    matchComment,
    isCommentOpen,
    historyStack,
  ]);

  const redo = useCallback(() => {
    if (futureStack.length === 0) return;

    const currentState = JSON.stringify({
      transactions,
      matches,
      auditLog,
      snapshots,
      selectedLeftIds: Array.from(selectedLeftIds),
      selectedRightIds: Array.from(selectedRightIds),
      selectedHistoryIds: Array.from(selectedHistoryIds),
      leftFilter,
      rightFilter,
      matchComment,
      isCommentOpen,
    });
    setHistoryStack((prev) => [...prev, currentState]);

    const nextStateString = futureStack[0];
    restoreState(nextStateString);

    setFutureStack((prev) => prev.slice(1));
  }, [
    transactions,
    matches,
    auditLog,
    snapshots,
    selectedLeftIds,
    selectedRightIds,
    selectedHistoryIds,
    leftFilter,
    rightFilter,
    matchComment,
    isCommentOpen,
    futureStack,
  ]);

  const restoreState = useCallback((stateString: string) => {
    try {
      const state = JSON.parse(stateString);
      setTransactions(state.transactions);
      setMatches(state.matches);
      setAuditLog(state.auditLog);
      setSnapshots(state.snapshots);
      setSelectedLeftIds(new Set(state.selectedLeftIds));
      setSelectedRightIds(new Set(state.selectedRightIds));
      setSelectedHistoryIds(new Set(state.selectedHistoryIds));
      setLeftFilter(state.leftFilter);
      setRightFilter(state.rightFilter);
      setMatchComment(state.matchComment);
      setIsCommentOpen(state.isCommentOpen);
    } catch (e) {
      console.error("State restore failed", e);
    }
  }, []);

  const executeMatch = useCallback(
    (
      currentUser: User,
      hasPermission: (role: any, permission: any) => boolean,
      isPeriodLocked: (date: string) => boolean
    ) => {
      if (!hasPermission(currentUser.role, "perform_matching")) {
        alert("Permission Denied: Your role cannot perform matches.");
        return;
      }

      const leftTxs = transactions.filter((t) => selectedLeftIds.has(t.id));
      const rightTxs = transactions.filter((t) => selectedRightIds.has(t.id));

      const allDates = [...leftTxs, ...rightTxs].map((t) => t.date);
      if (allDates.some((d) => isPeriodLocked(d))) {
        alert(
          `Cannot match transactions in a closed period (Locked Date: ${null})`
        );
        return;
      }

      saveCheckpoint();

      // Helper function to get actual amount (negative for DR transactions)
      const getActualAmount = (t: Transaction): number => {
        const recon = t.recon?.toUpperCase() || "";
        if (recon.includes("DR")) {
          return -Math.abs(t.amount); // DR transactions are negative
        }
        return Math.abs(t.amount); // CR transactions are positive
      };

      const totalLeft = leftTxs.reduce((sum, t) => sum + getActualAmount(t), 0);
      const totalRight = rightTxs.reduce(
        (sum, t) => sum + getActualAmount(t),
        0
      );
      const diff = Math.abs(totalLeft + totalRight);

      // Strict matching: only allow exact matches (zero difference)
      if (diff !== 0) {
        alert(
          `Cannot match: Difference must be exactly zero. Current difference: ${diff.toFixed(
            2
          )}`
        );
        return;
      }

      const newMatch: MatchGroup = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        leftTransactions: leftTxs,
        rightTransactions: rightTxs,
        totalLeft,
        totalRight,
        difference: 0,
        adjustment: undefined,
        comment: matchComment.trim() || undefined,
        matchByUserId: currentUser.id,
        status: "APPROVED",
      };

      setMatches((prev) => [...prev, newMatch]);
      setTransactions((prev) =>
        prev.map((t) => {
          if (selectedLeftIds.has(t.id) || selectedRightIds.has(t.id)) {
            return {
              ...t,
              status: TransactionStatus.Matched,
              matchId: newMatch.id,
            };
          }
          return t;
        })
      );

      addAuditLog(
        "Match",
        `Matched ${leftTxs.length} vs ${rightTxs.length}. Diff: ${diff.toFixed(
          2
        )}. Status: APPROVED`
      );
      clearSelection();
    },
    [
      transactions,
      selectedLeftIds,
      selectedRightIds,
      matchComment,
      saveCheckpoint,
      addAuditLog,
    ]
  );

  const handleApproveMatch = useCallback(
    (
      matchId: string,
      currentUser: User,
      hasPermission: (role: any, permission: any) => boolean
    ) => {
      if (!hasPermission(currentUser.role, "approve_adjustments")) {
        alert("Permission Denied: You cannot approve adjustments.");
        return;
      }

      const match = matches.find((m) => m.id === matchId);
      if (!match) return;

      // Separation of Duties Check
      const txs = [...match.leftTransactions, ...match.rightTransactions];
      const isImporter = txs.some((t) => t.importedBy === currentUser.id);

      if (isImporter && currentUser.role !== "ADMIN") {
        alert(
          "Separation of Duties Conflict: You imported these transactions, so you cannot approve their adjustments. Please ask another Manager."
        );
        return;
      }

      saveCheckpoint();
      setMatches((prev) =>
        prev.map((m) => {
          if (m.id === matchId) {
            return {
              ...m,
              status: "APPROVED",
              approvedBy: currentUser.name,
              approvedAt: Date.now(),
            };
          }
          return m;
        })
      );
      addAuditLog("Approval", `Approved adjustment for match #${matchId}`);
    },
    [matches, saveCheckpoint, addAuditLog]
  );

  const handleUnmatch = useCallback(
    (
      matchId: string,
      currentUser: User,
      hasPermission: (role: any, permission: any) => boolean,
      isPeriodLocked: (date: string) => boolean
    ) => {
      if (!hasPermission(currentUser.role, "unmatch_transactions")) {
        alert("Permission Denied.");
        return;
      }
      const match = matches.find((m) => m.id === matchId);
      if (!match) return;
      const allDates = [
        ...match.leftTransactions,
        ...match.rightTransactions,
      ].map((t) => t.date);
      if (allDates.some((d) => isPeriodLocked(d))) {
        alert("Cannot unmatch in closed period.");
        return;
      }
      saveCheckpoint();
      setTransactions((prev) =>
        prev.map((t) =>
          t.matchId === matchId
            ? { ...t, status: TransactionStatus.Unmatched, matchId: undefined }
            : t
        )
      );
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      addAuditLog("Unmatch", `Unmatched group #${matchId}`);
    },
    [matches, saveCheckpoint, addAuditLog]
  );

  const handleUpdateMatchComment = useCallback(
    (
      matchId: string,
      newComment: string,
      isPeriodLocked: (date: string) => boolean
    ) => {
      const match = matches.find((m) => m.id === matchId);
      if (!match) return;
      const allDates = [
        ...match.leftTransactions,
        ...match.rightTransactions,
      ].map((t) => t.date);
      if (allDates.some((d) => isPeriodLocked(d))) {
        alert("Cannot modify in closed period.");
        return;
      }
      saveCheckpoint();
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, comment: newComment } : m))
      );
      addAuditLog("Update", `Updated comment for match #${matchId}`);
    },
    [matches, saveCheckpoint, addAuditLog]
  );

  const toggleSelect = useCallback((id: string, side: Side) => {
    if (side === Side.Left)
      setSelectedLeftIds((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });
    else
      setSelectedRightIds((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLeftIds(new Set());
    setSelectedRightIds(new Set());
    setMatchComment("");
    setIsCommentOpen(false);
  }, []);

  const toggleHistorySelect = useCallback((id: string) => {
    setSelectedHistoryIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const toggleHistorySelectAll = useCallback(() => {
    if (selectedHistoryIds.size === matches.length)
      setSelectedHistoryIds(new Set());
    else setSelectedHistoryIds(new Set(matches.map((m) => m.id)));
  }, [selectedHistoryIds.size, matches]);

  const handleBatchUnmatch = useCallback(
    (
      currentUser: User,
      hasPermission: (role: any, permission: any) => boolean,
      isPeriodLocked: (date: string) => boolean
    ) => {
      if (!hasPermission(currentUser.role, "unmatch_transactions")) {
        alert("Permission Denied.");
        return;
      }
      const validMatchIds: string[] = [];
      matches.forEach((m) => {
        if (
          selectedHistoryIds.has(m.id) &&
          !isPeriodLocked(m.leftTransactions[0].date)
        )
          validMatchIds.push(m.id);
      });
      if (validMatchIds.length === 0) {
        alert("No valid matches selected.");
        return;
      }
      saveCheckpoint();
      setTransactions((prev) =>
        prev.map((t) =>
          t.matchId && validMatchIds.includes(t.matchId)
            ? { ...t, status: TransactionStatus.Unmatched, matchId: undefined }
            : t
        )
      );
      setMatches((prev) => prev.filter((m) => !validMatchIds.includes(m.id)));
      setSelectedHistoryIds(new Set());
      addAuditLog("Batch Unmatch", `Unmatched ${validMatchIds.length} groups.`);
    },
    [matches, selectedHistoryIds, saveCheckpoint, addAuditLog]
  );

  const handleBatchApprove = useCallback(
    (
      currentUser: User,
      hasPermission: (role: any, permission: any) => boolean
    ) => {
      if (!hasPermission(currentUser.role, "approve_adjustments")) {
        alert("Permission Denied.");
        return;
      }
      saveCheckpoint();
      setMatches((prev) =>
        prev.map((m) =>
          selectedHistoryIds.has(m.id) && m.status === "PENDING_APPROVAL"
            ? {
                ...m,
                status: "APPROVED",
                approvedBy: currentUser.name,
                approvedAt: Date.now(),
              }
            : m
        )
      );
      setSelectedHistoryIds(new Set());
      addAuditLog("Batch Approval", "Batch approved selected items.");
    },
    [selectedHistoryIds, saveCheckpoint, addAuditLog]
  );

  const createSnapshot = useCallback(
    (
      label: string,
      type: "IMPORT" | "MANUAL" | "AUTO",
      txs: Transaction[],
      matchGroups: MatchGroup[]
    ) => {
      const matchedValue = matchGroups.reduce((acc, m) => acc + m.totalLeft, 0);
      const newSnapshot: SystemSnapshot = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        label,
        type,
        transactions: txs,
        matches: matchGroups,
        selectedDate: "", // This will be passed from parent
        createdByUserId: currentUser.id,
        stats: {
          totalTransactions: txs.length,
          totalMatches: matchGroups.length,
          matchedValue,
        },
      };
      setSnapshots((prev) => [...prev, newSnapshot]);
      return newSnapshot;
    },
    [currentUser.id]
  );

  const restoreSnapshot = useCallback(
    (snapshot: SystemSnapshot) => {
      if (!window.confirm(`Restore "${snapshot.label}"?`)) return;
      saveCheckpoint();
      setTransactions(snapshot.transactions);
      setMatches(snapshot.matches);
      setSelectedLeftIds(new Set());
      setSelectedRightIds(new Set());
      setMatchComment("");
      addAuditLog("Restoration", `Restored snapshot: ${snapshot.label}`);
    },
    [saveCheckpoint, addAuditLog]
  );

  const handleManualSnapshot = useCallback(() => {
    saveCheckpoint();
    const label = prompt("Enter a label for this version:", "Manual Save");
    if (!label) return;
    createSnapshot(label, "MANUAL", transactions, matches);
    addAuditLog("Version Save", `Created manual snapshot: ${label}`);
  }, [saveCheckpoint, createSnapshot, transactions, matches, addAuditLog]);

  const state: ReconciliationState = {
    transactions,
    matches,
    auditLog,
    snapshots,
    selectedLeftIds,
    selectedRightIds,
    selectedHistoryIds,
    leftFilter,
    rightFilter,
    matchComment,
    isCommentOpen,
    historyStack,
    futureStack,
  };

  const actions: ReconciliationActions = {
    setTransactions,
    setMatches,
    setAuditLog,
    setSnapshots,
    setSelectedLeftIds,
    setSelectedRightIds,
    setSelectedHistoryIds,
    setLeftFilter,
    setRightFilter,
    setMatchComment,
    setIsCommentOpen,
    setHistoryStack,
    setFutureStack,
    addAuditLog,
    saveCheckpoint,
    undo,
    redo,
    executeMatch,
    handleApproveMatch,
    handleUnmatch,
    handleUpdateMatchComment,
    toggleSelect,
    clearSelection,
    toggleHistorySelect,
    toggleHistorySelectAll,
    handleBatchUnmatch,
    handleBatchApprove,
    createSnapshot,
    restoreSnapshot,
    handleManualSnapshot,
  };

  return [state, actions];
};
