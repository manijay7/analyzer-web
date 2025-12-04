import { User, UserRole, RolePermissions } from "./types";

export const APP_NAME = "Analyzer Web";

export const WRITE_OFF_LIMIT = 0.50; // Allow matching with differences up to $0.50 (Auto-approve)

// Security Constants
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes

export const DATE_WARNING_THRESHOLD_DAYS = 10;

// Updated storage key to force reset for new features
export const STORAGE_KEY = 'analyzerWeb_v3_sec';

export const ROLE_ADJUSTMENT_LIMITS: Record<UserRole, number> = {
  [UserRole.Admin]: Infinity,
  [UserRole.Manager]: 500.00,
  [UserRole.Analyst]: 10.00,
  [UserRole.Auditor]: 0.00
};

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  [UserRole.Admin]: [
    'manage_users', 
    'view_admin_panel', 
    'unmatch_transactions', 
    'view_all_logs', 
    'export_data', 
    'perform_matching', 
    'manage_periods',
    'approve_adjustments'
  ],
  [UserRole.Manager]: [
    'unmatch_transactions', 
    'view_all_logs', 
    'export_data', 
    'perform_matching',
    'approve_adjustments'
  ],
  [UserRole.Analyst]: [
    'export_data', 
    'perform_matching'
  ],
  [UserRole.Auditor]: [
    'view_all_logs',
    'export_data'
  ]
};