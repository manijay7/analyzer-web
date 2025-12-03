
import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, Side, TransactionStatus, MatchGroup, AuditLogEntry, User, UserRole, Permission, RolePermissions, MatchStatus, SystemSnapshot, RoleRequest } from '@/lib/types';
import { fetchTransactionsForDate } from '@/lib/dataService';
import { TransactionTable } from './components/TransactionTable';
import { HistoryPanel } from './components/HistoryPanel';
import { AuditLogModal } from './components/AuditLogModal';
import { AdminDashboard } from './components/AdminDashboard';
import { SnapshotHistoryModal } from './components/SnapshotHistoryModal';
import { WRITE_OFF_LIMIT, DATE_WARNING_THRESHOLD_DAYS, MOCK_USERS, DEFAULT_ROLE_PERMISSIONS, STORAGE_KEY } from '@/lib/constants';
import { 
  Scale, RefreshCw, Upload, Calendar, Link2, AlertTriangle, ArrowRightLeft, 
  TrendingUp, DollarSign, Activity, X, MessageSquare, RotateCcw, 
  Download, FileText, CheckCircle, User as UserIcon, LogOut, ChevronDown, ShieldAlert,
  LayoutDashboard, Lock, History, Save
} from 'lucide-react';

// Undo Stack Limit
const MAX_UNDO_STACK = 20;
const APPROVAL_THRESHOLD = 10.00;

type ViewMode = 'workspace' | 'admin';

// Simple Schema Validation Helper
const validateTransaction = (tx: Transaction): boolean => {
  if (!tx.id || !tx.date || !tx.description || typeof tx.amount !== 'number') return false;
  // Ensure date is YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(tx.date)) return false;
  return true;
};

const App: React.FC = () => {
  // --- State ---
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]); // Default to Admin
  const [currentView, setCurrentView] = useState<ViewMode>('workspace');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Permissions State
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [lockedDate, setLockedDate] = useState<string | null>(null); // Transactions on or before this date are locked
  const [isLoading, setIsLoading] = useState(false);
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [matches, setMatches] = useState<MatchGroup[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  
  // Snapshots State
  const [snapshots, setSnapshots] = useState<SystemSnapshot[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // New: Role Requests (Added to satisfy AdminDashboard props)
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);

  // Selection state
  const [selectedLeftIds, setSelectedLeftIds] = useState<Set<string>>(new Set());
  const [selectedRightIds, setSelectedRightIds] = useState<Set<string>>(new Set());
  
  // History Batch Selection State
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  
  // Filters
  const [leftFilter, setLeftFilter] = useState("");
  const [rightFilter, setRightFilter] = useState("");

  // Match Input state
  const [matchComment, setMatchComment] = useState("");
  
  // Undo Stack
  const [historyStack, setHistoryStack] = useState<string[]>([]);

  // UI State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // --- Persistence & Initialization ---

  // Load from local storage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.matches) setMatches(parsed.matches);
        if (parsed.auditLog) setAuditLog(parsed.auditLog);
        if (parsed.selectedDate) setSelectedDate(parsed.selectedDate);
        if (parsed.currentUser) setCurrentUser(parsed.currentUser);
        if (parsed.users) setUsers(parsed.users);
        if (parsed.rolePermissions) setRolePermissions(parsed.rolePermissions);
        if (parsed.lockedDate) setLockedDate(parsed.lockedDate);
        if (parsed.snapshots) setSnapshots(parsed.snapshots);
        if (parsed.roleRequests) setRoleRequests(parsed.roleRequests);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    const stateToSave = {
      transactions,
      matches,
      auditLog,
      selectedDate,
      currentUser,
      users,
      rolePermissions,
      lockedDate,
      snapshots,
      roleRequests,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [transactions, matches, auditLog, selectedDate, currentUser, users, rolePermissions, lockedDate, snapshots, roleRequests]);


  // --- Helper Functions ---

  const addAuditLog = (action: string, details: string) => {
    const newEntry: AuditLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      action,
      details,
      userId: currentUser.id,
      userName: currentUser.name
    };
    setAuditLog(prev => [...prev, newEntry]);
  };

  const hasPermission = (role: UserRole, permission: Permission): boolean => {
    return rolePermissions[role]?.includes(permission) ?? false;
  };

  const isPeriodLocked = (dateStr: string): boolean => {
    if (!lockedDate) return false;
    return new Date(dateStr) <= new Date(lockedDate);
  };

  const saveCheckpoint = () => {
    const currentState = JSON.stringify({
      transactions,
      matches,
      auditLog,
      users,
      rolePermissions,
      lockedDate,
      roleRequests
    });
    setHistoryStack(prev => {
      const newStack = [...prev, currentState];
      if (newStack.length > MAX_UNDO_STACK) newStack.shift();
      return newStack;
    });
  };

  const undo = () => {
    if (historyStack.length === 0) return;
    
    const previousStateString = historyStack[historyStack.length - 1];
    try {
      const previousState = JSON.parse(previousStateString);
      setTransactions(previousState.transactions);
      setMatches(previousState.matches);
      setAuditLog(previousState.auditLog);
      if (previousState.users) setUsers(previousState.users);
      if (previousState.rolePermissions) setRolePermissions(previousState.rolePermissions);
      if (previousState.lockedDate !== undefined) setLockedDate(previousState.lockedDate);
      if (previousState.roleRequests) setRoleRequests(previousState.roleRequests);
      
      setHistoryStack(prev => prev.slice(0, -1));
      
      // Clear current selection to avoid ghost selections
      setSelectedLeftIds(new Set());
      setSelectedRightIds(new Set());
      setSelectedHistoryIds(new Set());
    } catch (e) {
      console.error("Undo failed", e);
    }
  };

  // --- Snapshot / History Logic ---

  const createSnapshot = (label: string, type: 'IMPORT' | 'MANUAL' | 'AUTO', txs: Transaction[], matchGroups: MatchGroup[]) => {
      const matchedValue = matchGroups.reduce((acc, m) => acc + m.totalLeft, 0);
      
      const newSnapshot: SystemSnapshot = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          label,
          type,
          transactions: txs,
          matches: matchGroups,
          selectedDate,
          createdByUserId: currentUser.id,
          stats: {
              totalTransactions: txs.length,
              totalMatches: matchGroups.length,
              matchedValue
          }
      };
      
      setSnapshots(prev => [...prev, newSnapshot]);
      return newSnapshot;
  };

  const handleManualSnapshot = () => {
      saveCheckpoint();
      const label = prompt("Enter a label for this version:", "Manual Save");
      if (!label) return;
      
      createSnapshot(label, 'MANUAL', transactions, matches);
      addAuditLog("Version Save", `Created manual snapshot: ${label}`);
  };

  const restoreSnapshot = (snapshot: SystemSnapshot) => {
      // 1. Confirm
      if (!window.confirm(`Are you sure you want to restore "${snapshot.label}"? Current unsaved work will be lost.`)) return;
      
      saveCheckpoint(); // Save current state to undo stack before overwriting
      
      // 2. Restore State
      setTransactions(snapshot.transactions);
      setMatches(snapshot.matches);
      setSelectedDate(snapshot.selectedDate);
      
      // 3. Clear Selections
      setSelectedLeftIds(new Set());
      setSelectedRightIds(new Set());
      setSelectedHistoryIds(new Set());
      setMatchComment("");
      
      // 4. Log
      addAuditLog("Restoration", `Restored snapshot: ${snapshot.label} (from ${new Date(snapshot.timestamp).toLocaleString()})`);
      setIsHistoryModalOpen(false);
  };

  // --- Export ---

  const handleExport = () => {
    if (!hasPermission(currentUser.role, 'export_data')) {
      alert("Permission Denied: You do not have permission to export data.");
      return;
    }

    const headers = ["MatchID", "Date", "Status", "Difference", "Adjustment", "Comment", "ApprovedBy", "LeftItems", "RightItems"];
    const rows = matches.map(m => [
      m.id,
      new Date(m.timestamp).toLocaleDateString(),
      m.status,
      m.difference.toFixed(2),
      m.adjustment?.toFixed(2) || "0.00",
      `"${m.comment || ''}"`,
      m.approvedBy || '',
      `"${m.leftTransactions.map(t => `${t.description} (${t.amount})`).join('; ')}"`,
      `"${m.rightTransactions.map(t => `${t.description} (${t.amount})`).join('; ')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reconcile_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addAuditLog("Export", "User downloaded CSV report");
  };

  const switchUser = (user: User) => {
    setCurrentUser(user);
    setIsUserMenuOpen(false);
    addAuditLog("Login", `User switched to ${user.name}`);
    
    // Check permission for admin view, if not allowed, switch to workspace
    if (!hasPermission(user.role, 'view_admin_panel')) {
      setCurrentView('workspace');
    }
  };

  // --- User Management Logic ---

  const handleAddUser = (userData: Omit<User, 'id'>) => {
    if (!hasPermission(currentUser.role, 'manage_users')) return;
    saveCheckpoint();
    const newUser: User = {
      ...userData,
      id: Math.random().toString(36).substring(2, 9)
    };
    setUsers(prev => [...prev, newUser]);
    addAuditLog("User Mgmt", `Created user ${userData.name} (${userData.role})`);
  };

  const handleUpdateUser = (updatedUser: User) => {
    if (!hasPermission(currentUser.role, 'manage_users')) return;
    saveCheckpoint();
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    addAuditLog("User Mgmt", `Updated profile for ${updatedUser.name}`);
    
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (!hasPermission(currentUser.role, 'manage_users')) return;
    saveCheckpoint();
    const userToDelete = users.find(u => u.id === userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    addAuditLog("User Mgmt", `Deleted user ${userToDelete?.name || userId}`);
  };

  const handleUpdatePermissions = (role: UserRole, permissions: Permission[]) => {
    if (!hasPermission(currentUser.role, 'manage_users')) return;
    saveCheckpoint();
    setRolePermissions(prev => ({
      ...prev,
      [role]: permissions
    }));
    addAuditLog("Security", `Updated permissions for role ${role}`);
  };

  const handleApproveRoleRequest = (reqId: string, approve: boolean) => {
      // Stub implementation
      if (!hasPermission(currentUser.role, 'manage_users')) return;
      saveCheckpoint();
      setRoleRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: approve ? 'APPROVED' : 'REJECTED' } : r));
      addAuditLog("User Mgmt", `${approve ? 'Approved' : 'Rejected'} role request ${reqId}`);
  };

  // --- Period Management ---

  const handleSetLockedDate = (date: string | null) => {
    if (!hasPermission(currentUser.role, 'manage_periods')) {
        alert("Permission Denied: Only Admins can close periods.");
        return;
    }
    saveCheckpoint();
    setLockedDate(date);
    addAuditLog("Period Mgmt", `Books closed through ${date || 'None'}`);
  };

  // --- Core Logic ---

  const loadData = useCallback(async () => {
    if (!selectedDate) return;
    
    // Check if loading into a locked period (warning only, as viewing is fine)
    if (isPeriodLocked(selectedDate)) {
        console.log("Loading data for a closed period");
    }
    
    saveCheckpoint(); 
    
    setIsLoading(true);
    try {
      const { left, right } = await fetchTransactionsForDate(selectedDate);
      
      // Data Validation Step
      const validLeft = left.filter(validateTransaction);
      const validRight = right.filter(validateTransaction);
      const invalidCount = (left.length + right.length) - (validLeft.length + validRight.length);
      const allTxs = [...validLeft, ...validRight];
      
      setTransactions(allTxs);
      setSelectedLeftIds(new Set());
      setSelectedRightIds(new Set());
      setSelectedHistoryIds(new Set());
      setMatches([]); 
      setMatchComment("");
      setHistoryStack([]);
      
      // AUTO-SNAPSHOT ON IMPORT
      createSnapshot(`Import: ${selectedDate}`, 'IMPORT', allTxs, []);
      
      addAuditLog("Import", `Loaded ${allTxs.length} transactions for ${selectedDate}. ${invalidCount > 0 ? `Skipped ${invalidCount} invalid rows.` : ''}`);
    } catch (e) {
      console.error("Failed to load transactions", e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, currentUser, lockedDate]); // Dependency on lockedDate if we want to prevent loading, but viewing is ok.

  const toggleSelect = (id: string, side: Side) => {
    if (side === Side.Left) {
      setSelectedLeftIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedRightIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const clearSelection = () => {
    setSelectedLeftIds(new Set());
    setSelectedRightIds(new Set());
    setMatchComment("");
  };

  const executeMatch = () => {
    if (!hasPermission(currentUser.role, 'perform_matching')) {
      alert("Permission Denied: Your role cannot perform matches.");
      return;
    }

    const leftTxs = transactions.filter(t => selectedLeftIds.has(t.id));
    const rightTxs = transactions.filter(t => selectedRightIds.has(t.id));
    
    // Check Period Locking
    const allDates = [...leftTxs, ...rightTxs].map(t => t.date);
    const hasLockedTransaction = allDates.some(d => isPeriodLocked(d));
    
    if (hasLockedTransaction) {
        alert(`Cannot match transactions in a closed period (Locked Date: ${lockedDate})`);
        return;
    }

    saveCheckpoint();

    const totalLeft = leftTxs.reduce((sum, t) => sum + t.amount, 0);
    const totalRight = rightTxs.reduce((sum, t) => sum + t.amount, 0);
    const diff = Math.abs(totalLeft - totalRight);

    const adjustment = diff > 0 ? diff : undefined;
    
    // Workflow Logic
    let status: MatchStatus = 'APPROVED';
    if (adjustment && adjustment > APPROVAL_THRESHOLD) {
        status = 'PENDING_APPROVAL';
    }

    const newMatch: MatchGroup = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      leftTransactions: leftTxs,
      rightTransactions: rightTxs,
      totalLeft,
      totalRight,
      difference: diff,
      adjustment: adjustment,
      comment: matchComment.trim() || undefined,
      matchByUserId: currentUser.id,
      status: status
    };

    setMatches(prev => [...prev, newMatch]);

    setTransactions(prev => prev.map(t => {
      if (selectedLeftIds.has(t.id) || selectedRightIds.has(t.id)) {
        return { ...t, status: TransactionStatus.Matched, matchId: newMatch.id };
      }
      return t;
    }));

    addAuditLog("Match", `Matched ${leftTxs.length} left items with ${rightTxs.length} right items. Diff: ${diff.toFixed(2)}. Status: ${status}`);

    clearSelection();
  };

  const handleUnmatch = (matchId: string) => {
    if (!hasPermission(currentUser.role, 'unmatch_transactions')) {
      alert("Permission Denied: Your role cannot unmatch transactions.");
      return;
    }

    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    // Check Period Locking
    const allDates = [...match.leftTransactions, ...match.rightTransactions].map(t => t.date);
    const hasLockedTransaction = allDates.some(d => isPeriodLocked(d));
    
    if (hasLockedTransaction) {
        alert("Cannot unmatch transactions in a closed period.");
        return;
    }

    saveCheckpoint();
    
    setTransactions(prev => prev.map(t => {
      if (t.matchId === matchId) {
        return { ...t, status: TransactionStatus.Unmatched, matchId: undefined };
      }
      return t;
    }));
    
    setMatches(prev => prev.filter(m => m.id !== matchId));
    
    addAuditLog("Unmatch", `Unmatched group #${matchId}`);
  };
  
  const handleApproveMatch = (matchId: string) => {
      if (!hasPermission(currentUser.role, 'approve_adjustments')) {
          alert("Permission Denied: You cannot approve adjustments.");
          return;
      }
      
      saveCheckpoint();
      setMatches(prev => prev.map(m => {
          if (m.id === matchId) {
              return {
                  ...m,
                  status: 'APPROVED',
                  approvedBy: currentUser.name,
                  approvedAt: Date.now()
              };
          }
          return m;
      }));
      addAuditLog("Approval", `Approved adjustment for match #${matchId}`);
  };

  const handleUpdateMatchComment = (matchId: string, newComment: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const allDates = [...match.leftTransactions, ...match.rightTransactions].map(t => t.date);
    if (allDates.some(d => isPeriodLocked(d))) {
        alert("Cannot modify comments in a closed period.");
        return;
    }
    
    saveCheckpoint();

    setMatches(prev => prev.map(m => {
        if (m.id === matchId) {
            return { ...m, comment: newComment };
        }
        return m;
    }));
    
    addAuditLog("Update", `Updated comment for match #${matchId}`);
  };

  // --- Batch Operations (New) ---
  const toggleHistorySelect = (id: string) => {
      setSelectedHistoryIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const toggleHistorySelectAll = () => {
      if (selectedHistoryIds.size === matches.length) {
          setSelectedHistoryIds(new Set());
      } else {
          setSelectedHistoryIds(new Set(matches.map(m => m.id)));
      }
  };

  const handleBatchUnmatch = () => {
      if (!hasPermission(currentUser.role, 'unmatch_transactions')) {
          alert("Permission Denied.");
          return;
      }

      const validMatchIds: string[] = [];
      const lockedMatchIds: string[] = [];
      
      matches.forEach(m => {
          if (selectedHistoryIds.has(m.id)) {
              const allDates = [...m.leftTransactions, ...m.rightTransactions].map(t => t.date);
              if (allDates.some(d => isPeriodLocked(d))) {
                  lockedMatchIds.push(m.id);
              } else {
                  validMatchIds.push(m.id);
              }
          }
      });

      if (validMatchIds.length === 0) {
          alert("No valid matches selected or all selected matches are in a locked period.");
          return;
      }

      if (lockedMatchIds.length > 0) {
          alert(`Skipping ${lockedMatchIds.length} locked matches.`);
      }

      saveCheckpoint();

      setTransactions(prev => prev.map(t => {
          if (t.matchId && validMatchIds.includes(t.matchId)) {
              return { ...t, status: TransactionStatus.Unmatched, matchId: undefined };
          }
          return t;
      }));

      setMatches(prev => prev.filter(m => !validMatchIds.includes(m.id)));
      setSelectedHistoryIds(new Set());

      addAuditLog("Batch Unmatch", `Unmatched ${validMatchIds.length} groups.`);
  };

  const handleBatchApprove = () => {
      if (!hasPermission(currentUser.role, 'approve_adjustments')) {
          alert("Permission Denied.");
          return;
      }
      
      saveCheckpoint();
      let count = 0;
      setMatches(prev => prev.map(m => {
          if (selectedHistoryIds.has(m.id) && m.status === 'PENDING_APPROVAL') {
              count++;
              return {
                  ...m,
                  status: 'APPROVED',
                  approvedBy: currentUser.name,
                  approvedAt: Date.now()
              };
          }
          return m;
      }));
      setSelectedHistoryIds(new Set());
      addAuditLog("Batch Approval", `Approved ${count} pending adjustments.`);
  };

  // --- Filtering Logic ---
  const filterTransaction = (t: Transaction, filter: string) => {
    if (!filter) return true;
    const search = filter.toLowerCase();
    return (
      t.description.toLowerCase().includes(search) ||
      t.reference.toLowerCase().includes(search) ||
      t.amount.toString().includes(search)
    );
  };

  // --- Derived Data for Render ---
  
  const activeLeftTransactions = transactions
    .filter(t => t.side === Side.Left && t.status === TransactionStatus.Unmatched)
    .filter(t => filterTransaction(t, leftFilter));
    
  const activeRightTransactions = transactions
    .filter(t => t.side === Side.Right && t.status === TransactionStatus.Unmatched)
    .filter(t => filterTransaction(t, rightFilter));

  const leftUnmatchedCount = activeLeftTransactions.length;
  const rightUnmatchedCount = activeRightTransactions.length;
  const totalMatchedCount = matches.length;
  const totalMatchedValue = matches.reduce((acc, m) => acc + m.totalLeft, 0);

  const selectedLeftTxs = transactions.filter(t => selectedLeftIds.has(t.id));
  const selectedRightTxs = transactions.filter(t => selectedRightIds.has(t.id));

  const selectedLeftTotal = selectedLeftTxs.reduce((sum, t) => sum + t.amount, 0);
  const selectedRightTotal = selectedRightTxs.reduce((sum, t) => sum + t.amount, 0);

  const difference = Math.abs(selectedLeftTotal - selectedRightTotal);
  
  const isSelectionEmpty = selectedLeftIds.size === 0 && selectedRightIds.size === 0;
  // Diff acceptable if 0, or if user is trying to make an adjustment match (which might go to Pending)
  const isMatchDisabled = isSelectionEmpty; 

  const allSelectedDates = [...selectedLeftTxs, ...selectedRightTxs].map(t => new Date(t.date).getTime());
  const minSelectedDate = Math.min(...allSelectedDates);
  const maxSelectedDate = Math.max(...allSelectedDates);
  const dateDiffDays = allSelectedDates.length > 0 ? (maxSelectedDate - minSelectedDate) / (1000 * 3600 * 24) : 0;
  const showDateWarning = dateDiffDays > DATE_WARNING_THRESHOLD_DAYS;
  
  // Check if any selected transaction is locked
  const isSelectionLocked = [...selectedLeftTxs, ...selectedRightTxs].some(t => isPeriodLocked(t.date));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const canAccessAdmin = hasPermission(currentUser.role, 'view_admin_panel');
  const canUnmatch = hasPermission(currentUser.role, 'unmatch_transactions');
  const canApprove = hasPermission(currentUser.role, 'approve_adjustments');

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-[#f8fafc]">
      <AuditLogModal 
        isOpen={isAuditModalOpen} 
        onClose={() => setIsAuditModalOpen(false)} 
        logs={auditLog}
        currentUser={currentUser}
      />
      
      <SnapshotHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        snapshots={snapshots}
        onRestore={restoreSnapshot}
        users={users}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setCurrentView('workspace')}
            >
              <div className="bg-blue-600 p-2 rounded-lg">
                <Scale className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Analyzer Web</h1>
            </div>

            {/* View Switcher (Permissions Based) */}
            {canAccessAdmin && (
              <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setCurrentView('workspace')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    currentView === 'workspace' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Workspace
                </button>
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    currentView === 'admin' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LayoutDashboard size={14} />
                  Admin
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            
            {/* User Profile & Role Switcher */}
            <div className="relative mr-4 border-r border-gray-200 pr-4">
               <button 
                 onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                 className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
               >
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                   currentUser.role === UserRole.Admin ? 'bg-red-100 text-red-700' :
                   currentUser.role === UserRole.Manager ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                 }`}>
                   {currentUser.avatar}
                 </div>
                 <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-gray-700 leading-none">{currentUser.name}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide pt-0.5">{currentUser.role}</p>
                 </div>
                 <ChevronDown size={14} className="text-gray-400" />
               </button>

               {isUserMenuOpen && (
                 <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 overflow-hidden">
                   <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                     <p className="text-xs text-gray-500 font-semibold uppercase">Switch User (Demo)</p>
                   </div>
                   {users.map(u => (
                     <button
                       key={u.id}
                       onClick={() => switchUser(u)}
                       className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-50 ${currentUser.id === u.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                     >
                       <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                         {u.avatar}
                       </div>
                       <div>
                         <p className="font-medium">{u.name}</p>
                         <p className="text-xs text-gray-500">{u.role}</p>
                       </div>
                       {currentUser.id === u.id && <CheckCircle size={14} className="ml-auto" />}
                     </button>
                   ))}
                   <div className="border-t border-gray-100 mt-1 pt-1">
                      <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <LogOut size={14} />
                        Logout
                      </button>
                   </div>
                 </div>
               )}
            </div>

            {/* Toolbar - Only show in Workspace mode */}
            {currentView === 'workspace' && (
              <>
                <div className="flex items-center gap-1 mr-4 border-r border-gray-200 pr-4">
                   <button 
                     onClick={undo}
                     disabled={historyStack.length === 0}
                     className={`p-2 rounded-md hover:bg-gray-100 transition-colors relative group ${historyStack.length === 0 ? 'text-gray-300' : 'text-gray-600'}`}
                     title="Undo last action (Ctrl+Z)"
                   >
                     <RotateCcw size={18} />
                   </button>
                   
                   <button 
                     onClick={() => setIsHistoryModalOpen(true)}
                     className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors relative"
                     title="Version History / Restore Snapshots"
                   >
                     <History size={18} />
                   </button>
                   
                   <button 
                     onClick={handleManualSnapshot}
                     className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors relative"
                     title="Save Current Version"
                   >
                     <Save size={18} />
                   </button>
                   
                   <button 
                     onClick={() => setIsAuditModalOpen(true)}
                     className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors relative"
                     title="View Session Log"
                   >
                     <FileText size={18} />
                     {hasPermission(currentUser.role, 'view_all_logs') && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                     )}
                   </button>
                   
                   <button 
                     onClick={handleExport}
                     disabled={matches.length === 0}
                     className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${matches.length === 0 ? 'text-gray-300' : 'text-gray-600'}`}
                     title="Download Report CSV"
                   >
                     <Download size={18} />
                   </button>
                </div>

                <div className="flex items-center bg-gray-100 rounded-md p-1 border border-gray-200">
                   <Calendar className="w-4 h-4 ml-2 text-gray-500" />
                   <input 
                     type="date" 
                     value={selectedDate}
                     onChange={(e) => setSelectedDate(e.target.value)}
                     className="bg-transparent border-none text-sm focus:ring-0 text-gray-700 px-2 py-1 outline-none"
                   />
                </div>
                
                <button 
                  onClick={loadData}
                  disabled={isLoading}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${isLoading 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}
                  `}
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isLoading ? 'Loading...' : 'Import'}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {currentView === 'admin' && canAccessAdmin ? (
        <AdminDashboard 
          users={users} 
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
          currentUser={currentUser}
          auditLogs={auditLog}
          rolePermissions={rolePermissions}
          onUpdatePermissions={handleUpdatePermissions}
          lockedDate={lockedDate}
          onSetLockedDate={handleSetLockedDate}
          roleRequests={roleRequests}
          onApproveRoleRequest={handleApproveRoleRequest}
        />
      ) : (
        /* Workspace View */
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
          
          {/* Statistics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
                 <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                    <Activity size={20} />
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Left Unmatched</p>
                    <p className="text-xl font-bold text-gray-800">{leftUnmatchedCount}</p>
                 </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
                 <div className="p-3 bg-green-50 rounded-full text-green-600">
                    <Activity size={20} />
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Right Unmatched</p>
                    <p className="text-xl font-bold text-gray-800">{rightUnmatchedCount}</p>
                 </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
                 <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                    <TrendingUp size={20} />
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Matches</p>
                    <p className="text-xl font-bold text-gray-800">{totalMatchedCount}</p>
                 </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
                 <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                    <DollarSign size={20} />
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Matched Value</p>
                    <p className="text-xl font-bold text-gray-800">{formatCurrency(totalMatchedValue)}</p>
                 </div>
              </div>
          </div>
  
          {/* Matching Panes (Side by Side) */}
          <div className="flex flex-row gap-6 h-[55vh]">
              <div className="w-1/2 h-full">
                <TransactionTable 
                  title="Internal Ledger (A)"
                  transactions={activeLeftTransactions}
                  selectedIds={selectedLeftIds}
                  onToggleSelect={(id) => toggleSelect(id, Side.Left)}
                  side={Side.Left}
                  className="h-full"
                  filterText={leftFilter}
                  onFilterChange={setLeftFilter}
                />
              </div>
              <div className="w-1/2 h-full">
                <TransactionTable 
                  title="Bank Statement (B)"
                  transactions={activeRightTransactions}
                  selectedIds={selectedRightIds}
                  onToggleSelect={(id) => toggleSelect(id, Side.Right)}
                  side={Side.Right}
                  className="h-full"
                  filterText={rightFilter}
                  onFilterChange={setRightFilter}
                />
              </div>
          </div>
  
          {/* History Panel (Full Width Below) */}
          <div className="w-full pb-36">
             <HistoryPanel 
               matches={matches} 
               onUnmatch={handleUnmatch} 
               currentUser={currentUser}
               canUnmatch={canUnmatch}
               canApprove={canApprove}
               onApprove={handleApproveMatch}
               lockedDate={lockedDate}
               selectedIds={selectedHistoryIds}
               onToggleSelect={toggleHistorySelect}
               onToggleSelectAll={toggleHistorySelectAll}
               onBatchUnmatch={handleBatchUnmatch}
               onBatchApprove={handleBatchApprove}
               onUpdateComment={handleUpdateMatchComment}
             />
          </div>
        </main>
      )}

      {/* Sticky Action Bar - Only show in Workspace */}
      {currentView === 'workspace' && (
        <div className={`
          fixed bottom-6 left-1/2 transform -translate-x-1/2 
          bg-white rounded-xl shadow-2xl border border-gray-200 
          px-6 py-4 flex items-center gap-6 z-50 transition-all duration-300 w-[95%] max-w-5xl
          ${(selectedLeftIds.size > 0 || selectedRightIds.size > 0) ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0 pointer-events-none'}
        `}>
          
          {/* Clear Button */}
          <button 
            onClick={clearSelection}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear Selection"
          >
            <X size={20} />
          </button>
  
          <div className="h-8 w-px bg-gray-200" />
  
          {/* Summaries Container */}
          <div className="flex items-center gap-8 flex-1">
            {/* Left Summary */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Source A</span>
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{selectedLeftIds.size}</span>
              </div>
              <span className="font-mono text-lg font-medium text-blue-600 leading-tight">{formatCurrency(selectedLeftTotal)}</span>
            </div>
  
            {/* Connector */}
            <div className="text-gray-300">
               <ArrowRightLeft size={20} />
            </div>
  
            {/* Right Summary */}
            <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Source B</span>
                 <span className="text-xs font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{selectedRightIds.size}</span>
               </div>
              <span className="font-mono text-lg font-medium text-green-600 leading-tight">{formatCurrency(selectedRightTotal)}</span>
            </div>
  
            {/* Difference Indicator */}
            <div className={`flex flex-col px-6 border-l border-gray-100 ${Math.abs(difference) < 0.01 ? 'text-gray-400' : 'text-red-500'}`}>
               <span className="text-[10px] uppercase font-bold tracking-wider">Difference</span>
               <span className="font-mono text-lg font-bold flex items-center gap-2 leading-tight">
                 {difference > 0.01 && <AlertTriangle size={16} />}
                 {formatCurrency(difference)}
               </span>
               {difference > 0 && difference <= WRITE_OFF_LIMIT && (
                 <span className="text-[10px] text-green-600 font-medium">Auto-writeoff available</span>
               )}
            </div>
            
            {/* Date Warning */}
            {showDateWarning && (
              <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1 rounded text-xs border border-yellow-100 animate-pulse">
                 <AlertTriangle size={14} />
                 <span>Date mismatch &gt; 10d</span>
              </div>
            )}
            
            {/* Period Lock Warning */}
            {isSelectionLocked && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded text-xs border border-red-100">
                 <Lock size={14} />
                 <span>Period Closed</span>
              </div>
            )}
          </div>
  
          {/* Right Action Section */}
          <div className="flex items-center gap-3">
            {/* Comment Input */}
            <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <MessageSquare size={16} className="text-gray-400" />
               </div>
               <input
                 type="text"
                 value={matchComment}
                 onChange={(e) => setMatchComment(e.target.value)}
                 placeholder="Add notes..."
                 className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-32 transition-all focus:w-64"
               />
            </div>
  
            {/* Match Action */}
            <button
              onClick={executeMatch}
              disabled={isMatchDisabled || isSelectionLocked}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap
                ${(isMatchDisabled || isSelectionLocked)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 transform hover:-translate-y-0.5'}
              `}
            >
              {difference > 0.01 ? (
                  <>
                      {difference > APPROVAL_THRESHOLD ? <ShieldAlert size={18} /> : <CheckCircle size={18} />}
                      {difference > APPROVAL_THRESHOLD ? "Request Approval" : "Match w/ Adjust"}
                  </>
              ) : (
                  <>
                      <Link2 size={18} />
                      Match Selected
                  </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
