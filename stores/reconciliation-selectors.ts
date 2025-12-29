import { useReconciliationStore } from "./reconciliation-store";

// Selectors for computed values and better performance

// Basic state selectors
export const useTransactions = () =>
  useReconciliationStore((state) => state.transactions);
export const useMatches = () =>
  useReconciliationStore((state) => state.matches);
export const useSnapshots = () =>
  useReconciliationStore((state) => state.snapshots);
export const useIsLoading = () =>
  useReconciliationStore((state) => state.isLoading);
export const useError = () => useReconciliationStore((state) => state.error);

// Selection selectors
export const useSelectedLeftIds = () =>
  useReconciliationStore((state) => state.selectedLeftIds);
export const useSelectedRightIds = () =>
  useReconciliationStore((state) => state.selectedRightIds);
export const useSelectedHistoryIds = () =>
  useReconciliationStore((state) => state.selectedHistoryIds);

// Filter selectors
export const useLeftFilter = () =>
  useReconciliationStore((state) => state.leftFilter);
export const useRightFilter = () =>
  useReconciliationStore((state) => state.rightFilter);
export const useMatchComment = () =>
  useReconciliationStore((state) => state.matchComment);
export const useIsCommentOpen = () =>
  useReconciliationStore((state) => state.isCommentOpen);

// History selectors
export const useHistoryStack = () =>
  useReconciliationStore((state) => state.historyStack);
export const useFutureStack = () =>
  useReconciliationStore((state) => state.futureStack);
export const useCanUndo = () =>
  useReconciliationStore((state) => state.historyStack.length > 0);
export const useCanRedo = () =>
  useReconciliationStore((state) => state.futureStack.length > 0);

// Computed selectors for filtered data
export const useUnmatchedTransactions = () =>
  useReconciliationStore((state) =>
    state.transactions.filter((t) => t.status === "UNMATCHED")
  );

export const useMatchedTransactions = () =>
  useReconciliationStore((state) =>
    state.transactions.filter((t) => t.status === "MATCHED")
  );

export const useFilteredLeftTransactions = () =>
  useReconciliationStore((state) =>
    state.transactions
      .filter((t) => t.side === "LEFT" && t.status === "UNMATCHED")
      .filter((t) =>
        t.description.toLowerCase().includes(state.leftFilter.toLowerCase())
      )
  );

export const useFilteredRightTransactions = () =>
  useReconciliationStore((state) =>
    state.transactions
      .filter((t) => t.side === "RIGHT" && t.status === "UNMATCHED")
      .filter((t) =>
        t.description.toLowerCase().includes(state.rightFilter.toLowerCase())
      )
  );

// Selection-based computed values
export const useSelectedTransactions = () =>
  useReconciliationStore((state) => {
    const leftSelected = state.transactions.filter((t) =>
      state.selectedLeftIds.has(t.id)
    );
    const rightSelected = state.transactions.filter((t) =>
      state.selectedRightIds.has(t.id)
    );
    return { leftSelected, rightSelected };
  });

export const useSelectionTotals = () =>
  useReconciliationStore((state) => {
    const { leftSelected, rightSelected } = useSelectedTransactions();

    const leftTotal = leftSelected.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const rightTotal = rightSelected.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const difference = Math.abs(leftTotal - rightTotal);

    return { leftTotal, rightTotal, difference };
  });

// Validation selectors
export const useCanCreateMatch = () =>
  useReconciliationStore((state) => {
    const { leftSelected, rightSelected } = useSelectedTransactions();
    const { difference } = useSelectionTotals();

    return (
      leftSelected.length > 0 && rightSelected.length > 0 && difference <= 0.01
    ); // Allow for floating point precision
  });

export const useHasSelections = () =>
  useReconciliationStore(
    (state) => state.selectedLeftIds.size > 0 || state.selectedRightIds.size > 0
  );

// Statistics selectors
export const useReconciliationStats = () =>
  useReconciliationStore((state) => {
    const totalTransactions = state.transactions.length;
    const unmatchedCount = state.transactions.filter(
      (t) => t.status === "UNMATCHED"
    ).length;
    const matchedCount = state.transactions.filter(
      (t) => t.status === "MATCHED"
    ).length;
    const totalMatches = state.matches.length;
    const matchedValue = state.matches.reduce(
      (sum, match) => sum + match.totalLeft,
      0
    );

    return {
      totalTransactions,
      unmatchedCount,
      matchedCount,
      totalMatches,
      matchedValue,
      matchRate:
        totalTransactions > 0 ? (matchedCount / totalTransactions) * 100 : 0,
    };
  });

// Current context selectors
export const useCurrentFileId = () =>
  useReconciliationStore((state) => state.currentFileId);
export const useCurrentSheetId = () =>
  useReconciliationStore((state) => state.currentSheetId);
export const useCurrentContext = () =>
  useReconciliationStore((state) => ({
    fileId: state.currentFileId,
    sheetId: state.currentSheetId,
  }));
