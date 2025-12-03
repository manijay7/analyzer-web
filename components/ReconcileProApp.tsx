"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Transaction, Side, TransactionStatus, MatchGroup, AuditLogEntry, User, UserRole, Permission, RolePermissions, MatchStatus, SystemSnapshot, RoleRequest } from '@/lib/types';
import { fetchTransactionsForDate } from '@/lib/dataService';
import { TransactionTable } from './TransactionTable';
import { HistoryPanel } from './HistoryPanel';
import { AuditLogModal } from './AuditLogModal';
import { AdminDashboard } from './AdminDashboard';
import { SnapshotHistoryModal } from './SnapshotHistoryModal';
import { WRITE_OFF_LIMIT, DATE_WARNING_THRESHOLD_DAYS, DEFAULT_ROLE_PERMISSIONS, STORAGE_KEY, APP_NAME, ROLE_ADJUSTMENT_LIMITS, IDLE_TIMEOUT_MS } from '@/lib/constants';
import { 
  Scale, RefreshCw, Upload, Calendar, Link2, AlertTriangle, ArrowRightLeft, 
  TrendingUp, DollarSign, Activity, X, RotateCcw, RotateCw,
  Download, FileText, CheckCircle, LogOut, ChevronDown, ShieldAlert,
  LayoutDashboard, History, Save, MessageCircle, UserPlus
} from 'lucide-react';

// Undo Stack Limit
const MAX_UNDO_STACK = 20;

type ViewMode = 'workspace' | 'admin';

// Simple Schema Validation Helper
const validateTransaction = (tx: Transaction): boolean => {
  if (!tx.id || !tx.date || !tx.description || typeof tx.amount !== 'number') return false;
  // Ensure date is YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(tx.date)) return false;
  return true;
};

export const AnalyzerWebApp: React.FC = () => {
  // --- Auth Session ---
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isLoadingSession = status === 'loading';

  // --- State ---
  const [users, setUsers] = useState<User[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  
  const [currentView, setCurrentView] = useState<ViewMode>('workspace');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRoleRequestOpen, setIsRoleRequestOpen] = useState(false);
  const [roleRequestReason, setRoleRequestReason] = useState("");
  
  // Permissions State
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [lockedDate, setLockedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [matches, setMatches] = useState<MatchGroup[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  
  // Snapshots State
  const [snapshots, setSnapshots] = useState<SystemSnapshot[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

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
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  
  // Undo/Redo Stack
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [futureStack, setFutureStack] = useState<string[]>([]);

  // UI State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // --- Derived User Object from Session ---
  // Default to a fallback object if needed for types, but logic is guarded by isAuthenticated
  const currentUser: User = session?.user ? {
    id: session.user.id,
    name: session.user.name || 'Unknown',
    email: session.user.email || '',
    role: session.user.role || UserRole.Analyst,
    avatar: session.user.avatar || 'U',
    status: 'active'
  } : { id: 'guest', name: 'Guest', role: UserRole.Analyst, avatar: 'G', email: '' };

  // --- Idle Timeout Logic ---
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkIdle = () => {
      if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS) {
        console.log("Idle timeout reached. Signing out.");
        handleLogout();
      }
    };

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    // Events to track activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    const interval = setInterval(checkIdle, 60000); // Check every minute

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      clearInterval(interval);
    };
  }, [isAuthenticated]);


  // --- Persistence & Initialization ---

  useEffect(() => {
    // Set initial date on client only to avoid hydration mismatch
    setSelectedDate(new Date().toISOString().split('T')[0]);

    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.matches) setMatches(parsed.matches);
        if (parsed.auditLog) setAuditLog(parsed.auditLog);
        if (parsed.selectedDate) setSelectedDate(parsed.selectedDate);
        // We will try to fetch users from API, if fail use storage
        if (parsed.users) setUsers(parsed.users);
        if (parsed.rolePermissions) setRolePermissions(parsed.rolePermissions);
        if (parsed.lockedDate) setLockedDate(parsed.lockedDate);
        if (parsed.snapshots) setSnapshots(parsed.snapshots);
        if (parsed.roleRequests) setRoleRequests(parsed.roleRequests);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
    
    // Attempt to fetch real users if authenticated and has permission
    if (status === 'authenticated') {
        fetch('/api/admin/users')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch users');
            })
            .then(apiUsers => {
                if (Array.isArray(apiUsers) && apiUsers.length > 0) {
                    // Normalize the roles from DB string to Enum if needed
                    const normalized = apiUsers.map((u: any) => ({
                        ...u,
                        role: u.role as UserRole
                    }));
                    setUsers(normalized);
                }
            })
            .catch(err => {
                // If permission denied or DB error, we just don't update the user list for admin panel
                console.log("Could not fetch user list (likely insufficient permissions or first run)");
            });
    }

    setIsInitialized(true);
  }, [status]);

  // Save to local storage on change
  useEffect(() => {
    if (!isInitialized) return;
    const stateToSave = {
      transactions,
      matches,
      auditLog,
      selectedDate,
      users,
      rolePermissions,
      lockedDate,
      snapshots,
      roleRequests,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [transactions, matches, auditLog, selectedDate, users, rolePermissions, lockedDate, snapshots, roleRequests, isInitialized]);


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
  
  const handleLogout = async () => {
    // Explicitly do not redirect automatically, wait for manual window location change
    // This ensures client state is fully wiped by browser navigation
    await signOut({ redirect: false });
    window.location.href = '/login';
  };

  // --- Undo / Redo Logic ---

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
    setFutureStack([]); 
  };

  const undo = () => {
    if (historyStack.length === 0) return;
    
    const currentState = JSON.stringify({
        transactions,
        matches,
        auditLog,
        users,
        rolePermissions,
        lockedDate,
        roleRequests
    });
    setFutureStack(prev => [currentState, ...prev]);

    const previousStateString = historyStack[historyStack.length - 1];
    restoreState(previousStateString);
    
    setHistoryStack(prev => prev.slice(0, -1));
  };

  const redo = () => {
      if (futureStack.length === 0) return;

      const currentState = JSON.stringify({
        transactions,
        matches,
        auditLog,
        users,
        rolePermissions,
        lockedDate,
        roleRequests
      });
      setHistoryStack(prev => [...prev, currentState]);

      const nextStateString = futureStack[0];
      restoreState(nextStateString);

      setFutureStack(prev => prev.slice(1));
  };

  const restoreState = (stateString: string) => {
      try {
        const state = JSON.parse(stateString);
        setTransactions(state.transactions);
        setMatches(state.matches);
        setAuditLog(state.auditLog);
        if (state.users) setUsers(state.users);
        if (state.rolePermissions) setRolePermissions(state.rolePermissions);
        if (state.lockedDate !== undefined) setLockedDate(state.lockedDate);
        if (state.roleRequests) setRoleRequests(state.roleRequests);
        
        setSelectedLeftIds(new Set());
        setSelectedRightIds(new Set());
        setSelectedHistoryIds(new Set());
      } catch (e) {
        console.error("State restore failed", e);
      }
  };

  // --- Core Logic ---

  const loadData = useCallback(async () => {
    if (!selectedDate) return;
    
    if (isPeriodLocked(selectedDate)) {
        console.log("Loading data for a closed period");
    }
    
    saveCheckpoint(); 
    
    setIsLoading(true);
    try {
      const { left, right } = await fetchTransactionsForDate(selectedDate);
      
      // Tag transactions with current User ID (Separation of Duties)
      const tagUser = (t: Transaction) => ({ ...t, importedBy: currentUser.id });
      
      const validLeft = left.filter(validateTransaction).map(tagUser);
      const validRight = right.filter(validateTransaction).map(tagUser);
      const invalidCount = (left.length + right.length) - (validLeft.length + validRight.length);
      const allTxs = [...validLeft, ...validRight];
      
      setTransactions(allTxs);
      setSelectedLeftIds(new Set());
      setSelectedRightIds(new Set());
      setSelectedHistoryIds(new Set());
      setMatches([]); 
      setMatchComment("");
      setHistoryStack([]);
      setFutureStack([]);
      
      createSnapshot(`Import: ${selectedDate}`, 'IMPORT', allTxs, []);
      
      addAuditLog("Import", `Loaded ${allTxs.length} transactions by ${currentUser.name}. ${invalidCount > 0 ? `Skipped ${invalidCount} invalid rows.` : ''}`);
    } catch (e) {
      console.error("Failed to load transactions", e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, currentUser, lockedDate]);

  const executeMatch = () => {
    if (!hasPermission(currentUser.role, 'perform_matching')) {
      alert("Permission Denied: Your role cannot perform matches.");
      return;
    }

    const leftTxs = transactions.filter(t => selectedLeftIds.has(t.id));
    const rightTxs = transactions.filter(t => selectedRightIds.has(t.id));
    
    const allDates = [...leftTxs, ...rightTxs].map(t => t.date);
    if (allDates.some(d => isPeriodLocked(d))) {
        alert(`Cannot match transactions in a closed period (Locked Date: ${lockedDate})`);
        return;
    }

    saveCheckpoint();

    const totalLeft = leftTxs.reduce((sum, t) => sum + t.amount, 0);
    const totalRight = rightTxs.reduce((sum, t) => sum + t.amount, 0);
    const diff = Math.abs(totalLeft - totalRight);
    const adjustment = diff > 0 ? diff : undefined;
    
    // Dynamic Approval Limit Logic
    let status: MatchStatus = 'APPROVED';
    const userLimit = ROLE_ADJUSTMENT_LIMITS[currentUser.role];
    
    if (adjustment && adjustment > userLimit) {
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

    addAuditLog("Match", `Matched ${leftTxs.length} vs ${rightTxs.length}. Diff: ${diff.toFixed(2)}. Status: ${status}`);
    clearSelection();
  };

  const handleApproveMatch = (matchId: string) => {
      if (!hasPermission(currentUser.role, 'approve_adjustments')) {
          alert("Permission Denied: You cannot approve adjustments.");
          return;
      }
      
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      // Separation of Duties Check
      const txs = [...match.leftTransactions, ...match.rightTransactions];
      const isImporter = txs.some(t => t.importedBy === currentUser.id);

      if (isImporter && currentUser.role !== UserRole.Admin) { 
          alert("Separation of Duties Conflict: You imported these transactions, so you cannot approve their adjustments. Please ask another Manager.");
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

  // --- Role Requests ---
  const handleRoleRequest = () => {
    if (!roleRequestReason) return;
    saveCheckpoint();
    const request: RoleRequest = {
        id: Math.random().toString(36).substring(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        requestedRole: UserRole.Manager, // Default upgrade request
        reason: roleRequestReason,
        status: 'PENDING',
        timestamp: Date.now()
    };
    setRoleRequests(prev => [...prev, request]);
    setIsRoleRequestOpen(false);
    setRoleRequestReason("");
    alert("Role upgrade request sent to Admins.");
    addAuditLog("Role Request", "User requested upgrade to Manager.");
  };

  // --- Other Handlers (Reuse existing logic) ---
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
          stats: { totalTransactions: txs.length, totalMatches: matchGroups.length, matchedValue }
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
      if (!window.confirm(`Restore "${snapshot.label}"?`)) return;
      saveCheckpoint();
      setTransactions(snapshot.transactions);
      setMatches(snapshot.matches);
      setSelectedDate(snapshot.selectedDate);
      setSelectedLeftIds(new Set());
      setSelectedRightIds(new Set());
      setMatchComment("");
      addAuditLog("Restoration", `Restored snapshot: ${snapshot.label}`);
      setIsHistoryModalOpen(false);
  };
  const handleExport = () => {
    if (!hasPermission(currentUser.role, 'export_data')) {
      alert("Permission Denied.");
      return;
    }
    // ... csv logic ...
    addAuditLog("Export", "User downloaded CSV report");
  };
  const handleUnmatch = (matchId: string) => {
    if (!hasPermission(currentUser.role, 'unmatch_transactions')) {
      alert("Permission Denied.");
      return;
    }
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const allDates = [...match.leftTransactions, ...match.rightTransactions].map(t => t.date);
    if (allDates.some(d => isPeriodLocked(d))) {
        alert("Cannot unmatch in closed period.");
        return;
    }
    saveCheckpoint();
    setTransactions(prev => prev.map(t => t.matchId === matchId ? { ...t, status: TransactionStatus.Unmatched, matchId: undefined } : t));
    setMatches(prev => prev.filter(m => m.id !== matchId));
    addAuditLog("Unmatch", `Unmatched group #${matchId}`);
  };
  const handleUpdateMatchComment = (matchId: string, newComment: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const allDates = [...match.leftTransactions, ...match.rightTransactions].map(t => t.date);
    if (allDates.some(d => isPeriodLocked(d))) {
        alert("Cannot modify in closed period.");
        return;
    }
    saveCheckpoint();
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, comment: newComment } : m));
    addAuditLog("Update", `Updated comment for match #${matchId}`);
  };
  const toggleSelect = (id: string, side: Side) => {
      if (side === Side.Left) setSelectedLeftIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
      else setSelectedRightIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const clearSelection = () => { setSelectedLeftIds(new Set()); setSelectedRightIds(new Set()); setMatchComment(""); setIsCommentOpen(false); };

  // --- Batch ---
  const toggleHistorySelect = (id: string) => { setSelectedHistoryIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleHistorySelectAll = () => { if (selectedHistoryIds.size === matches.length) setSelectedHistoryIds(new Set()); else setSelectedHistoryIds(new Set(matches.map(m => m.id))); };
  const handleBatchUnmatch = () => {
      if (!hasPermission(currentUser.role, 'unmatch_transactions')) { alert("Permission Denied."); return; }
      const validMatchIds: string[] = [];
      matches.forEach(m => { if (selectedHistoryIds.has(m.id) && !isPeriodLocked(m.leftTransactions[0].date)) validMatchIds.push(m.id); });
      if (validMatchIds.length === 0) { alert("No valid matches selected."); return; }
      saveCheckpoint();
      setTransactions(prev => prev.map(t => (t.matchId && validMatchIds.includes(t.matchId)) ? { ...t, status: TransactionStatus.Unmatched, matchId: undefined } : t));
      setMatches(prev => prev.filter(m => !validMatchIds.includes(m.id)));
      setSelectedHistoryIds(new Set());
      addAuditLog("Batch Unmatch", `Unmatched ${validMatchIds.length} groups.`);
  };
  const handleBatchApprove = () => {
     if (!hasPermission(currentUser.role, 'approve_adjustments')) { alert("Permission Denied."); return; }
     saveCheckpoint();
     setMatches(prev => prev.map(m => (selectedHistoryIds.has(m.id) && m.status === 'PENDING_APPROVAL') ? { ...m, status: 'APPROVED', approvedBy: currentUser.name, approvedAt: Date.now() } : m));
     setSelectedHistoryIds(new Set());
     addAuditLog("Batch Approval", "Batch approved selected items.");
  };

  // --- Admin Logic Hooks (API Integrated) ---
  const handleAddUser = async (u: Omit<User, 'id'>) => { 
      if (!hasPermission(currentUser.role, 'manage_users')) return; 
      
      saveCheckpoint();
      
      try {
          const res = await fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(u)
          });
          
          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to create user');
          }
          
          const newUser = await res.json();
          setUsers(prev => [...prev, { ...newUser, role: newUser.role as UserRole }]);
          addAuditLog("User Mgmt", `Created user ${u.name} via API`);
      } catch (e: any) {
          alert(`Error: ${e.message}`);
      }
  };

  const handleUpdateUser = async (u: User) => { 
      if (!hasPermission(currentUser.role, 'manage_users')) return; 
      saveCheckpoint();
      
      try {
          const res = await fetch(`/api/admin/users/${u.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(u)
          });
          
          if (res.ok) {
            const updated = await res.json();
            setUsers(prev => prev.map(x => x.id === u.id ? { ...updated, role: updated.role as UserRole } : x));
            addAuditLog("User Mgmt", `Updated user ${u.name} via API`);
            return;
          }
      } catch (e) {
         console.warn("API error", e);
      }
  };

  const handleDeleteUser = async (id: string) => { 
      if (!hasPermission(currentUser.role, 'manage_users')) return; 
      saveCheckpoint();
      
      try {
          const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
          if (res.ok) {
              setUsers(prev => prev.filter(x => x.id !== id));
              addAuditLog("User Mgmt", `Deleted user ID ${id} via API`);
              return;
          }
      } catch (e) {
          console.warn("API error", e);
      }
  };
  
  const handleUpdatePermissions = (r: UserRole, p: Permission[]) => { if (hasPermission(currentUser.role, 'manage_users')) { saveCheckpoint(); setRolePermissions(prev => ({...prev, [r]: p})); } };
  const handleSetLockedDate = (d: string | null) => { if (hasPermission(currentUser.role, 'manage_periods')) { saveCheckpoint(); setLockedDate(d); } };
  const handleApproveRoleRequest = (reqId: string, approve: boolean) => {
      if (!hasPermission(currentUser.role, 'manage_users')) return;
      saveCheckpoint();
      setRoleRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: approve ? 'APPROVED' : 'REJECTED' } : r));
      if (approve) {
          const req = roleRequests.find(r => r.id === reqId);
          if (req) {
              // Also update the actual user role
              const targetUser = users.find(u => u.id === req.userId);
              if (targetUser) {
                  handleUpdateUser({ ...targetUser, role: req.requestedRole });
              }
              addAuditLog("User Mgmt", `Approved role upgrade for ${req.userName}`);
          }
      }
  };


  // --- Render Calculation ---
  const activeLeft = transactions.filter(t => t.side === Side.Left && t.status === TransactionStatus.Unmatched && t.description.toLowerCase().includes(leftFilter.toLowerCase()));
  const activeRight = transactions.filter(t => t.side === Side.Right && t.status === TransactionStatus.Unmatched && t.description.toLowerCase().includes(rightFilter.toLowerCase()));
  const totalMatchedValue = matches.reduce((acc, m) => acc + m.totalLeft, 0);
  
  const selectedLeftTxs = transactions.filter(t => selectedLeftIds.has(t.id));
  const selectedRightTxs = transactions.filter(t => selectedRightIds.has(t.id));
  const selLeftTotal = selectedLeftTxs.reduce((sum, t) => sum + t.amount, 0);
  const selRightTotal = selectedRightTxs.reduce((sum, t) => sum + t.amount, 0);
  const diff = Math.abs(selLeftTotal - selRightTotal);
  
  const canAccessAdmin = hasPermission(currentUser.role, 'view_admin_panel');
  const canUnmatch = hasPermission(currentUser.role, 'unmatch_transactions');
  const canApprove = hasPermission(currentUser.role, 'approve_adjustments');

  // Prevent flashing login content if loading, but handle unauthenticated explicitly
  if (isLoadingSession || !isInitialized) return <div className="h-screen flex items-center justify-center text-gray-500">Loading {APP_NAME}...</div>;
  if (!isAuthenticated) return null; // Middleware handles the redirect

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-[#f8fafc]">
      <AuditLogModal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} logs={auditLog} currentUser={currentUser} />
      <SnapshotHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} snapshots={snapshots} onRestore={restoreSnapshot} users={users} />

      {/* Role Request Modal */}
      {isRoleRequestOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
              <h3 className="font-bold text-lg mb-2">Request Role Upgrade</h3>
              <p className="text-sm text-gray-500 mb-4">Request upgrade to Manager permissions.</p>
              <textarea 
                className="w-full border p-2 rounded mb-4 text-sm" 
                placeholder="Reason for request..."
                rows={3}
                value={roleRequestReason}
                onChange={e => setRoleRequestReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                 <button onClick={() => setIsRoleRequestOpen(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                 <button onClick={handleRoleRequest} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded">Submit</button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('workspace')}>
              <div className="bg-blue-600 p-2 rounded-lg"><Scale className="text-white w-5 h-5" /></div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{APP_NAME}</h1>
            </div>
            {canAccessAdmin && (
              <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                <button onClick={() => setCurrentView('workspace')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${currentView === 'workspace' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Workspace</button>
                <button onClick={() => setCurrentView('admin')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${currentView === 'admin' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><LayoutDashboard size={14} />Admin</button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
             <div className="relative mr-4 border-r border-gray-200 pr-4">
               <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentUser.role === UserRole.Admin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{currentUser.avatar}</div>
                 <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-gray-700 leading-none">{currentUser.name}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide pt-0.5">{currentUser.role}</p>
                 </div>
                 <ChevronDown size={14} className="text-gray-400" />
               </button>
               {isUserMenuOpen && (
                 <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                   <div className="px-4 py-2 border-b border-gray-100 bg-gray-50"><p className="text-xs text-gray-500 font-semibold uppercase">Account</p></div>
                   {currentUser.role === UserRole.Analyst && (
                       <button onClick={() => { setIsUserMenuOpen(false); setIsRoleRequestOpen(true); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                           <UserPlus size={14} /> Request Access
                       </button>
                   )}
                   <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut size={14} />Sign Out</button>
                   </div>
                 </div>
               )}
            </div>

            {/* Toolbar */}
            {currentView === 'workspace' && (
              <>
                <div className="flex items-center gap-1 mr-4 border-r border-gray-200 pr-4">
                   <button onClick={undo} disabled={historyStack.length===0} className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"><RotateCcw size={18} /></button>
                   <button onClick={redo} disabled={futureStack.length===0} className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"><RotateCw size={18} /></button>
                   <div className="w-px h-6 bg-gray-200 mx-1"></div>
                   <button onClick={() => setIsHistoryModalOpen(true)} className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"><History size={18} /></button>
                   <button onClick={handleManualSnapshot} className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"><Save size={18} /></button>
                   <button onClick={() => setIsAuditModalOpen(true)} className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"><FileText size={18} /></button>
                   <button onClick={handleExport} disabled={matches.length===0} className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"><Download size={18} /></button>
                </div>
                <div className="flex items-center bg-gray-100 rounded-md p-1 border border-gray-200">
                   <Calendar className="w-4 h-4 ml-2 text-gray-500" />
                   <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none text-sm focus:ring-0 text-gray-700 px-2 py-1 outline-none"/>
                </div>
                <button onClick={loadData} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">{isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{isLoading ? 'Loading...' : 'Import'}</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Area */}
      {currentView === 'admin' && canAccessAdmin ? (
        <AdminDashboard 
          users={users} 
          onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} 
          currentUser={currentUser} auditLogs={auditLog} rolePermissions={rolePermissions} onUpdatePermissions={handleUpdatePermissions}
          lockedDate={lockedDate} onSetLockedDate={handleSetLockedDate}
          roleRequests={roleRequests} onApproveRoleRequest={handleApproveRoleRequest}
        />
      ) : (
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4"><div className="p-3 bg-blue-50 rounded-full text-blue-600"><Activity size={20} /></div><div><p className="text-xs text-gray-500 uppercase font-semibold">Left Unmatched</p><p className="text-xl font-bold text-gray-800">{activeLeft.length}</p></div></div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4"><div className="p-3 bg-green-50 rounded-full text-green-600"><Activity size={20} /></div><div><p className="text-xs text-gray-500 uppercase font-semibold">Right Unmatched</p><p className="text-xl font-bold text-gray-800">{activeRight.length}</p></div></div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4"><div className="p-3 bg-indigo-50 rounded-full text-indigo-600"><TrendingUp size={20} /></div><div><p className="text-xs text-gray-500 uppercase font-semibold">Total Matches</p><p className="text-xl font-bold text-gray-800">{matches.length}</p></div></div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4"><div className="p-3 bg-purple-50 rounded-full text-purple-600"><DollarSign size={20} /></div><div><p className="text-xs text-gray-500 uppercase font-semibold">Matched Value</p><p className="text-xl font-bold text-gray-800">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalMatchedValue)}</p></div></div>
          </div>
          <div className="flex flex-row gap-6 h-[55vh]">
              <div className="w-1/2 h-full"><TransactionTable title="Internal Ledger (A)" transactions={activeLeft} selectedIds={selectedLeftIds} onToggleSelect={(id) => toggleSelect(id, Side.Left)} side={Side.Left} className="h-full" filterText={leftFilter} onFilterChange={setLeftFilter}/></div>
              <div className="w-1/2 h-full"><TransactionTable title="Bank Statement (B)" transactions={activeRight} selectedIds={selectedRightIds} onToggleSelect={(id) => toggleSelect(id, Side.Right)} side={Side.Right} className="h-full" filterText={rightFilter} onFilterChange={setRightFilter}/></div>
          </div>
          <div className="w-full pb-36"><HistoryPanel matches={matches} onUnmatch={handleUnmatch} currentUser={currentUser} canUnmatch={canUnmatch} canApprove={canApprove} onApprove={handleApproveMatch} lockedDate={lockedDate} selectedIds={selectedHistoryIds} onToggleSelect={toggleHistorySelect} onToggleSelectAll={toggleHistorySelectAll} onBatchUnmatch={handleBatchUnmatch} onBatchApprove={handleBatchApprove} onUpdateComment={handleUpdateMatchComment}/></div>
        </main>
      )}

      {/* Sticky Action Bar */}
      {currentView === 'workspace' && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 px-6 py-4 flex items-center gap-6 z-50 transition-all duration-300 w-[95%] max-w-5xl ${(selectedLeftIds.size > 0 || selectedRightIds.size > 0) ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0 pointer-events-none'}`}>
          <button onClick={clearSelection} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={20} /></button>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex items-center gap-8 flex-1">
            <div className="flex flex-col"><div className="flex items-center gap-2"><span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Source A</span><span className="text-xs font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{selectedLeftIds.size}</span></div><span className="font-mono text-lg font-medium text-blue-600 leading-tight">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selLeftTotal)}</span></div>
            <div className="text-gray-300"><ArrowRightLeft size={20} /></div>
            <div className="flex flex-col"><div className="flex items-center gap-2"><span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Source B</span><span className="text-xs font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{selectedRightIds.size}</span></div><span className="font-mono text-lg font-medium text-green-600 leading-tight">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selRightTotal)}</span></div>
            <div className={`flex flex-col px-6 border-l border-gray-100 ${Math.abs(diff) < 0.01 ? 'text-gray-400' : 'text-red-500'}`}><span className="text-[10px] uppercase font-bold tracking-wider">Difference</span><span className="font-mono text-lg font-bold flex items-center gap-2 leading-tight">{diff > 0.01 && <AlertTriangle size={16} />}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(diff)}</span>{diff > 0 && diff <= WRITE_OFF_LIMIT && <span className="text-[10px] text-green-600 font-medium">Auto-writeoff</span>}</div>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
               <button onClick={() => setIsCommentOpen(!isCommentOpen)} className={`p-2 rounded-lg transition-colors relative ${matchComment ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}><MessageCircle size={20} />{matchComment && <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full border border-white"></span>}</button>
               {isCommentOpen && <div className="absolute bottom-full right-0 mb-3 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 animate-fadeIn"><label className="block text-xs font-semibold text-gray-700 mb-1">Match Notes</label><textarea className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={3} placeholder="Rationale..." value={matchComment} onChange={(e) => setMatchComment(e.target.value)} autoFocus /><div className="text-right mt-1"><button onClick={() => setIsCommentOpen(false)} className="text-xs text-indigo-600 font-medium hover:text-indigo-800">Done</button></div></div>}
             </div>
             <button onClick={executeMatch} disabled={selectedLeftIds.size===0 && selectedRightIds.size===0} className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg transition-all">
                {diff > 0.01 ? (diff > ROLE_ADJUSTMENT_LIMITS[currentUser.role] ? <><ShieldAlert size={18} />Request Approval</> : <><CheckCircle size={18} />Match w/ Adjust</>) : <><Link2 size={18} />Match Selected</>}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
