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
  "Direct Deposit - Payroll",
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
  "Payroll Batch #221",
];

export const WRITE_OFF_LIMIT = 0.5; // Allow matching with differences up to $0.50 (Auto-approve)
export const APPROVAL_THRESHOLD = 10.0; // Adjustments > $10 require approval
export const DATE_WARNING_THRESHOLD_DAYS = 10;

// Updated storage key to force reset for new snapshot feature
export const STORAGE_KEY = "reconcilePro_v6_prod";

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  [UserRole.Admin]: [
    "manage_users",
    "view_admin_panel",
    "unmatch_transactions",
    "view_all_logs",
    "export_data",
    "perform_matching",
    "manage_periods",
    "approve_adjustments",
  ],
  [UserRole.Manager]: [
    "unmatch_transactions",
    "view_all_logs",
    "export_data",
    "perform_matching",
    "approve_adjustments",
  ],
  [UserRole.Analyst]: ["export_data", "perform_matching"],
};

export const MOCK_USERS: User[] = [
  {
    id: "u0",
    name: "System Admin",
    role: UserRole.Admin,
    avatar: "AD",
    email: "admin@reconcilepro.com",
    status: "active",
  },
  {
    id: "u1",
    name: "Sarah Manager",
    role: UserRole.Manager,
    avatar: "SM",
    email: "sarah@reconcilepro.com",
    status: "active",
  },
  {
    id: "u2",
    name: "John Analyst",
    role: UserRole.Analyst,
    avatar: "JA",
    email: "john@reconcilepro.com",
    status: "active",
  },
  {
    id: "u3",
    name: "Mike Intern",
    role: UserRole.Analyst,
    avatar: "MI",
    email: "mike@reconcilepro.com",
    status: "inactive",
  },
];
