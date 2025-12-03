
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
  Analyst = 'ANALYST',
  Auditor = 'AUDITOR'
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
  status?: 'active' | 'inactive' | 'locked';
  lastLogin?: number;
  failedLoginAttempts?: number;
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
  importedBy?: string; // For Separation of Duties
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

export interface RoleRequest {
  id: string;
  userId: string;
  userName: string;
  requestedRole: UserRole;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: number;
}

export interface DeviceSession {
  id: string;
  userId: string;
  device: string;
  ip: string;
  lastActive: number;
  location: string;
  isCurrent: boolean;
}
