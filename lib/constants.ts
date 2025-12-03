import { User, UserRole, RolePermissions } from "./types";

export const APP_NAME = "Analyzer Web";

export const MOCK_DESCRIPTIONS_LEFT = [
  "INV-2023-001 Supply Co",
  "Payment Received - Client A",
  "Service Fee - Oct",
  "Transfer to Savings",
  "Consulting Services",
  "Software Subscription",
  "Office Rent",
  "Utility Bill - Power",
  "Refund #9921",
  "Direct Deposit - Payroll"
];

export const MOCK_DESCRIPTIONS_RIGHT = [
  "ACH Credit: Supply Company",
  "Deposit: Client A Ref 992",
  "Bank Fee",
  "Internal Trf 20223",
  "Incoming Wire: Consulting",
  "Recurring Debit: SaaS",
  "Check #402 Rent",
  "DD: Utility Corp",
  "Refund Processed",
  "Payroll Batch #221"
];

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

export const MOCK_USERS: User[] = [
  { id: 'u0', name: 'System Admin', role: UserRole.Admin, avatar: 'AD', email: 'admin@reconcilepro.com', status: 'active' },
  { id: 'u1', name: 'Sarah Manager', role: UserRole.Manager, avatar: 'SM', email: 'sarah@reconcilepro.com', status: 'active' },
  { id: 'u2', name: 'John Analyst', role: UserRole.Analyst, avatar: 'JA', email: 'john@reconcilepro.com', status: 'active' },
  { id: 'u3', name: 'Mike Intern', role: UserRole.Analyst, avatar: 'MI', email: 'mike@reconcilepro.com', status: 'inactive' },
];