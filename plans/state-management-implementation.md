# State Management Overhaul: Implementation Plan

## Overview

Replace the current custom hooks approach with Zustand for predictable, scalable state management with server state integration.

## Current State Issues

### Problems with Current Approach

1. **Multiple Hooks with Complex Dependencies**:

   - `useReconciliationState`: 661 lines of complex state logic
   - `useFileManagement`: File and sheet management
   - Tight coupling between hooks

2. **In-Memory State Limitations**:

   - No persistence across browser sessions
   - No server synchronization
   - Race conditions in concurrent updates

3. **Testing Difficulties**:
   - Hard to mock hook dependencies
   - Complex setup for integration tests

## Proposed Zustand Architecture

### Store Structure

```
stores/
├── index.ts                 # Store exports
├── auth-store.ts           # Authentication & user management
├── reconciliation-store.ts # Transaction & matching logic
├── file-store.ts          # File import & sheet management
├── audit-store.ts         # Audit logging & compliance
└── ui-store.ts            # UI state (modals, loading, etc.)
```

### Store Design Principles

1. **Single Source of Truth**: Each domain has one store
2. **Immutability**: All state updates create new state
3. **Selectors**: Computed values extracted from state
4. **Actions**: Pure functions for state updates
5. **Middleware**: Logging, persistence, synchronization

## Implementation Details

### 1. Auth Store (`stores/auth-store.ts`)

```typescript
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  permissions: Permission[];
  sessionExpiry: number | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  updatePermissions: (permissions: Permission[]) => void;
  setError: (error: string | null) => void;
  checkSessionExpiry: () => boolean;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        permissions: [],
        sessionExpiry: null,
        isLoading: false,
        error: null,

        // Actions
        login: async (credentials) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(credentials),
            });

            if (!response.ok) {
              throw new Error("Login failed");
            }

            const { user, token, expiresAt } = await response.json();

            set({
              user,
              isAuthenticated: true,
              permissions: user.permissions || [],
              sessionExpiry: expiresAt,
              isLoading: false,
            });

            // Store token in httpOnly cookie via API
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Login failed",
              isLoading: false,
            });
          }
        },

        logout: () => {
          set({
            user: null,
            isAuthenticated: false,
            permissions: [],
            sessionExpiry: null,
            error: null,
          });
          // Clear server session
          fetch("/api/auth/logout", { method: "POST" });
        },

        refreshSession: async () => {
          try {
            const response = await fetch("/api/auth/refresh");
            if (response.ok) {
              const { user, expiresAt } = await response.json();
              set({
                user,
                permissions: user.permissions || [],
                sessionExpiry: expiresAt,
              });
            } else {
              get().logout();
            }
          } catch {
            get().logout();
          }
        },

        updatePermissions: (permissions) => set({ permissions }),
        setError: (error) => set({ error }),

        checkSessionExpiry: () => {
          const { sessionExpiry } = get();
          if (!sessionExpiry) return false;
          return Date.now() > sessionExpiry;
        },
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({
          user: state.user,
          permissions: state.permissions,
        }),
      }
    ),
    { name: "auth-store" }
  )
);
```

### 2. Reconciliation Store (`stores/reconciliation-store.ts`)

```typescript
import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { Transaction, MatchGroup, SystemSnapshot } from "@/lib/types";

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

      createMatch: async (leftIds, rightIds, comment) => {
        const { transactions, selectedLeftIds, selectedRightIds } = get();

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
                ? { ...t, status: "MATCHED", matchId: newMatch.id }
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

      // ... other actions implementation

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
```

### 3. Selectors and Computed Values

```typescript
// selectors/reconciliation-selectors.ts
import { ReconciliationStore } from "@/stores/reconciliation-store";

export const useUnmatchedTransactions = () =>
  useReconciliationStore((state) =>
    state.transactions.filter((t) => t.status === "UNMATCHED")
  );

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

export const useMatchTotals = () =>
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

export const useCanCreateMatch = () =>
  useReconciliationStore((state) => {
    const { leftSelected, rightSelected } = useSelectedTransactions();
    const { difference } = useMatchTotals();

    return (
      leftSelected.length > 0 && rightSelected.length > 0 && difference <= 0.01
    ); // Allow for floating point precision
  });
```

## Migration Strategy

### Phase 1: Setup and Infrastructure

1. Install dependencies: `npm install zustand @tanstack/react-query`
2. Create store files with basic structure
3. Set up TypeScript types for stores

### Phase 2: Core Store Implementation

1. Implement auth store (simpler, good starting point)
2. Implement reconciliation store (complex, iterative approach)
3. Add selectors for computed values
4. Implement persistence middleware

### Phase 3: Component Migration

1. Start with leaf components (TransactionTable, MatchControls)
2. Migrate container components (WorkspaceContainer)
3. Update main app component
4. Remove old custom hooks

### Phase 4: Server State Integration

1. Add React Query for API state
2. Implement optimistic updates
3. Add error handling and retry logic
4. Set up background refetching

### Phase 5: Testing and Optimization

1. Add unit tests for stores
2. Add integration tests
3. Performance optimization
4. Memory leak prevention

## Benefits of New Architecture

### 1. **Predictable State Updates**

- Single source of truth per domain
- Immutable state updates
- Clear action boundaries

### 2. **Better Performance**

- Selective subscriptions
- Computed values with selectors
- Efficient re-renders

### 3. **Improved Developer Experience**

- Type-safe state access
- Easy debugging with devtools
- Simple testing setup

### 4. **Scalability**

- Easy to add new features
- Clear separation of concerns
- Server state synchronization

### 5. **Maintainability**

- Centralized business logic
- Easy to refactor and extend
- Clear data flow patterns

## Error Handling and Recovery

### Store-Level Error Handling

```typescript
// Error boundary for stores
const errorHandler = (error: Error, action: string) => {
  console.error(`Store error in ${action}:`, error);
  // Log to monitoring service
  // Update error state
  // Trigger user notification
};
```

### Recovery Strategies

1. **Automatic Retry**: For transient failures
2. **Graceful Degradation**: Fallback to cached data
3. **User Notification**: Clear error messages
4. **State Reset**: Recovery to known good state

## Monitoring and Debugging

### Development Tools

- Zustand devtools integration
- Redux DevTools compatibility
- State logging middleware

### Production Monitoring

- Error tracking with Sentry
- Performance monitoring
- State consistency checks

This implementation provides a solid foundation for scalable, maintainable state management that will support the application's growth and complexity.
