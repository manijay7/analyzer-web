import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import {
  Transaction,
  MatchGroup,
  SystemSnapshot,
  Side,
  TransactionStatus,
} from "@/lib/types";

interface ReconciliationState {
  // Core data
  transactions: Transaction[];
  matches: MatchGroup[];
  snapshots: SystemSnapshot[];

  // Selection state
  selectedLeftIds: Set<string>;
  selectedRightIds: Set<string>;
  selectedHistoryIds: Set<string>;

  // UI state
  leftFilter: string;
  rightFilter: string;
  matchComment: string;
  isCommentOpen: boolean;

  // History management
  historyStack: string[];
  futureStack: string[];
  currentFileId: string | null;
  currentSheetId: string | null;

  // Loading and error states
  isLoading: boolean;
  error: string | null;
}

interface ReconciliationActions {
  // Data loading
  loadTransactions: (fileId: string, sheetId: string) => Promise<void>;
  loadMatches: (fileId: string, sheetId: string) => Promise<void>;

  // Matching operations
  createMatch: (
    leftIds: string[],
    rightIds: string[],
    comment?: string
  ) => Promise<void>;
  unmatch: (matchId: string) => Promise<void>;
  approveMatch: (matchId: string) => Promise<void>;
  updateMatchComment: (matchId: string, comment: string) => Promise<void>;

  // Selection management
  selectLeft: (ids: string[]) => void;
  selectRight: (ids: string[]) => void;
  selectHistory: (ids: string[]) => void;
  clearSelection: () => void;

  // Filtering
  setLeftFilter: (filter: string) => void;
  setRightFilter: (filter: string) => void;
  setMatchComment: (comment: string) => void;
  toggleComment: () => void;

  // History management
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  saveSnapshot: (label: string, type: "MANUAL" | "AUTO") => void;
  restoreSnapshot: (snapshotId: string) => void;

  // Utility
  reset: () => void;
  setError: (error: string | null) => void;
}

type ReconciliationStore = ReconciliationState & ReconciliationActions;

export const useReconciliationStore = create<ReconciliationStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      transactions: [],
      matches: [],
      snapshots: [],
      selectedLeftIds: new Set(),
      selectedRightIds: new Set(),
      selectedHistoryIds: new Set(),
      leftFilter: "",
      rightFilter: "",
      matchComment: "",
      isCommentOpen: false,
      historyStack: [],
      futureStack: [],
      currentFileId: null,
      currentSheetId: null,
      isLoading: false,
      error: null,

      // Actions implementation
      loadTransactions: async (fileId, sheetId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(
            `/api/transactions?fileId=${fileId}&sheetId=${sheetId}`
          );
          if (!response.ok) throw new Error("Failed to load transactions");

          const transactions = await response.json();
          set({
            transactions,
            currentFileId: fileId,
            currentSheetId: sheetId,
            isLoading: false,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load transactions",
            isLoading: false,
          });
        }
      },

      loadMatches: async (fileId, sheetId) => {
        try {
          const response = await fetch(
            `/api/matches?fileId=${fileId}&sheetId=${sheetId}`
          );
          if (!response.ok) throw new Error("Failed to load matches");

          const matches = await response.json();
          set({ matches });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to load matches",
          });
        }
      },

      createMatch: async (leftIds, rightIds, comment) => {
        const { transactions } = get();

        // Calculate match totals
        const leftTxs = transactions.filter((t) => leftIds.includes(t.id));
        const rightTxs = transactions.filter((t) => rightIds.includes(t.id));

        const totalLeft = leftTxs.reduce(
          (sum, t) => sum + Math.abs(t.amount),
          0
        );
        const totalRight = rightTxs.reduce(
          (sum, t) => sum + Math.abs(t.amount),
          0
        );

        if (Math.abs(totalLeft - totalRight) > 0.01) {
          throw new Error("Match totals must be equal");
        }

        try {
          const response = await fetch("/api/matches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leftTransactionIds: leftIds,
              rightTransactionIds: rightIds,
              totalLeft,
              totalRight,
              comment,
            }),
          });

          if (!response.ok) throw new Error("Failed to create match");

          const newMatch = await response.json();

          // Update local state
          set((state) => ({
            matches: [...state.matches, newMatch],
            transactions: state.transactions.map((t) =>
              leftIds.includes(t.id) || rightIds.includes(t.id)
                ? {
                    ...t,
                    status: TransactionStatus.Matched,
                    matchId: newMatch.id,
                  }
                : t
            ),
            selectedLeftIds: new Set(),
            selectedRightIds: new Set(),
            matchComment: "",
            isCommentOpen: false,
          }));

          // Save to history
          get().saveToHistory();
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to create match",
          });
          throw error;
        }
      },

      unmatch: async (matchId) => {
        try {
          const response = await fetch(`/api/matches/${matchId}`, {
            method: "DELETE",
          });

          if (!response.ok) throw new Error("Failed to unmatch");

          // Update local state
          set((state) => ({
            transactions: state.transactions.map((t) =>
              t.matchId === matchId
                ? {
                    ...t,
                    status: TransactionStatus.Unmatched,
                    matchId: undefined,
                  }
                : t
            ),
            matches: state.matches.filter((m) => m.id !== matchId),
            selectedHistoryIds: new Set(),
          }));

          get().saveToHistory();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to unmatch",
          });
          throw error;
        }
      },

      approveMatch: async (matchId) => {
        try {
          const response = await fetch(`/api/matches/${matchId}/approve`, {
            method: "POST",
          });

          if (!response.ok) throw new Error("Failed to approve match");

          const updatedMatch = await response.json();

          set((state) => ({
            matches: state.matches.map((m) =>
              m.id === matchId ? updatedMatch : m
            ),
          }));
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to approve match",
          });
          throw error;
        }
      },

      updateMatchComment: async (matchId, comment) => {
        try {
          const response = await fetch(`/api/matches/${matchId}/comment`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comment }),
          });

          if (!response.ok) throw new Error("Failed to update comment");

          set((state) => ({
            matches: state.matches.map((m) =>
              m.id === matchId ? { ...m, comment } : m
            ),
          }));
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to update comment",
          });
          throw error;
        }
      },

      // Selection management
      selectLeft: (ids) =>
        set((state) => ({
          selectedLeftIds: new Set(ids),
        })),

      selectRight: (ids) =>
        set((state) => ({
          selectedRightIds: new Set(ids),
        })),

      selectHistory: (ids) =>
        set((state) => ({
          selectedHistoryIds: new Set(ids),
        })),

      clearSelection: () =>
        set({
          selectedLeftIds: new Set(),
          selectedRightIds: new Set(),
          matchComment: "",
          isCommentOpen: false,
        }),

      // Filtering
      setLeftFilter: (filter) => set({ leftFilter: filter }),
      setRightFilter: (filter) => set({ rightFilter: filter }),
      setMatchComment: (comment) => set({ matchComment: comment }),
      toggleComment: () =>
        set((state) => ({ isCommentOpen: !state.isCommentOpen })),

      // History management
      saveToHistory: () => {
        const state = get();
        const snapshot = JSON.stringify({
          transactions: state.transactions,
          matches: state.matches,
          selectedLeftIds: Array.from(state.selectedLeftIds),
          selectedRightIds: Array.from(state.selectedRightIds),
          selectedHistoryIds: Array.from(state.selectedHistoryIds),
          leftFilter: state.leftFilter,
          rightFilter: state.rightFilter,
          matchComment: state.matchComment,
          isCommentOpen: state.isCommentOpen,
        });

        set((state) => ({
          historyStack: [...state.historyStack, snapshot].slice(-20), // Keep last 20
          futureStack: [],
        }));
      },

      undo: () => {
        const { historyStack, futureStack } = get();
        if (historyStack.length === 0) return;

        const currentState = JSON.stringify({
          transactions: get().transactions,
          matches: get().matches,
          selectedLeftIds: Array.from(get().selectedLeftIds),
          selectedRightIds: Array.from(get().selectedRightIds),
          selectedHistoryIds: Array.from(get().selectedHistoryIds),
          leftFilter: get().leftFilter,
          rightFilter: get().rightFilter,
          matchComment: get().matchComment,
          isCommentOpen: get().isCommentOpen,
        });

        const previousState = historyStack[historyStack.length - 1];
        const parsedState = JSON.parse(previousState);

        set({
          ...parsedState,
          selectedLeftIds: new Set(parsedState.selectedLeftIds),
          selectedRightIds: new Set(parsedState.selectedRightIds),
          selectedHistoryIds: new Set(parsedState.selectedHistoryIds),
          historyStack: historyStack.slice(0, -1),
          futureStack: [currentState, ...futureStack],
        });
      },

      redo: () => {
        const { futureStack } = get();
        if (futureStack.length === 0) return;

        const nextState = futureStack[0];
        const parsedState = JSON.parse(nextState);

        set({
          ...parsedState,
          selectedLeftIds: new Set(parsedState.selectedLeftIds),
          selectedRightIds: new Set(parsedState.selectedRightIds),
          selectedHistoryIds: new Set(parsedState.selectedHistoryIds),
          futureStack: futureStack.slice(1),
        });
      },

      saveSnapshot: (label, type) => {
        const { transactions, matches, currentFileId, currentSheetId } = get();

        const matchedValue = matches.reduce((acc, m) => acc + m.totalLeft, 0);
        const newSnapshot: SystemSnapshot = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          label,
          type,
          transactions,
          matches,
          selectedDate: "", // This will be passed from parent
          createdByUserId: "", // This will come from auth store
          stats: {
            totalTransactions: transactions.length,
            totalMatches: matches.length,
            matchedValue,
          },
        };

        set((state) => ({
          snapshots: [...state.snapshots, newSnapshot],
        }));
      },

      restoreSnapshot: (snapshotId) => {
        const { snapshots } = get();
        const snapshot = snapshots.find((s) => s.id === snapshotId);
        if (!snapshot) return;

        if (!window.confirm(`Restore "${snapshot.label}"?`)) return;

        get().saveToHistory();
        set({
          transactions: snapshot.transactions,
          matches: snapshot.matches,
          selectedLeftIds: new Set(),
          selectedRightIds: new Set(),
          matchComment: "",
          isCommentOpen: false,
        });
      },

      reset: () =>
        set({
          transactions: [],
          matches: [],
          snapshots: [],
          selectedLeftIds: new Set(),
          selectedRightIds: new Set(),
          selectedHistoryIds: new Set(),
          leftFilter: "",
          rightFilter: "",
          matchComment: "",
          isCommentOpen: false,
          historyStack: [],
          futureStack: [],
          currentFileId: null,
          currentSheetId: null,
          isLoading: false,
          error: null,
        }),

      setError: (error) => set({ error }),
    })),
    { name: "reconciliation-store" }
  )
);
