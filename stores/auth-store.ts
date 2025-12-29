import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { User, Permission } from "@/lib/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  permissions: Permission[];
  sessionExpiry: number | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  updatePermissions: (permissions: Permission[]) => void;
  setError: (error: string | null) => void;
  checkSessionExpiry: () => boolean;
  initializeAuth: () => Promise<void>;
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
        // Removed broken login method - use next-auth instead
        login: async () => {
          throw new Error(
            "Login handled by next-auth. Use signIn from next-auth/react"
          );
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
          fetch("/api/auth/logout", { method: "POST" }).catch(() => {
            // Ignore logout errors
          });
        },

        refreshSession: async () => {
          try {
            const response = await fetch("/api/auth/refresh");
            if (response.ok) {
              const { user, expiresAt } = await response.json();
              set({
                user: {
                  ...user,
                  role: user.role as User["role"],
                },
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

        initializeAuth: async () => {
          // Check if we have a valid session on app start
          try {
            const response = await fetch("/api/auth/session");
            if (response.ok) {
              const { user, expiresAt } = await response.json();
              if (user && expiresAt && Date.now() < expiresAt) {
                set({
                  user: {
                    ...user,
                    role: user.role as User["role"],
                  },
                  isAuthenticated: true,
                  permissions: user.permissions || [],
                  sessionExpiry: expiresAt,
                });
              }
            }
          } catch {
            // Ignore initialization errors
          }
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

// Selectors for common auth checks
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useUserPermissions = () =>
  useAuthStore((state) => state.permissions);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

export const useHasPermission = (permission: Permission) =>
  useAuthStore((state) => state.permissions.includes(permission));

export const useHasAnyPermission = (permissions: Permission[]) =>
  useAuthStore((state) =>
    permissions.some((perm) => state.permissions.includes(perm))
  );

export const useHasAllPermissions = (permissions: Permission[]) =>
  useAuthStore((state) =>
    permissions.every((perm) => state.permissions.includes(perm))
  );
