
export enum Side {
  Left = 'LEFT',
  Right = 'RIGHT'
}

export enum TransactionStatus {
  Unmatched = 'UNMATCHED',
  Matched = 'MATCHED'
}

export enum UserRole {
  Admin = 'ADMIN',
  Manager = 'MANAGER',
  Analyst = 'ANALYST'
}

export type Permission = 
  | 'manage_users' 
  | 'view_admin_panel'
  | 'unmatch_transactions'
  | 'view_all_logs'
  | 'export_data'
  | 'perform_matching'
  | 'manage_periods'
  | 'approve_adjustments';

export type RolePermissions = Record<UserRole, Permission[]>;

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  email?: string;
  status?: 'active' | 'inactive';
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  reference: string;
  side: Side;
  status: TransactionStatus;
  matchId?: string;
}

export type MatchStatus = 'APPROVED' | 'PENDING_APPROVAL';

export interface MatchGroup {
  id: string;
  timestamp: number;
  leftTransactions: Transaction[];
  rightTransactions: Transaction[];
  totalLeft: number;
  totalRight: number;
  difference: number;
  adjustment?: number;
  comment?: string;
  matchByUserId?: string;
  status: MatchStatus;
  approvedBy?: string;
  approvedAt?: number;
}

export interface DailySummary {
  date: string;
  totalUnmatchedCount: number;
  totalUnmatchedValue: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  details: string;
  userId: string;
  userName: string;
}

export interface FilterState {
  text: string;
}

export interface SystemSnapshot {
  id: string;
  timestamp: number;
  label: string;
  type: 'IMPORT' | 'MANUAL' | 'AUTO';
  transactions: Transaction[];
  matches: MatchGroup[];
  selectedDate: string;
  createdByUserId: string;
  stats: {
    totalTransactions: number;
    totalMatches: number;
    matchedValue: number;
  };
}
