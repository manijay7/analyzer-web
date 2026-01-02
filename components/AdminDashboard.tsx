
"use client";

import React, { useState } from 'react';
import { User, UserRole, AuditLogEntry, RolePermissions, Permission, RoleRequest } from '@/lib/types';
import { Users, Plus, Edit2, Trash2, Shield, Search, X, Check, Key, Lock, FileText, Calendar, KeyRound } from 'lucide-react';

interface AdminDashboardProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: User;
  
  auditLogs: AuditLogEntry[];
  rolePermissions: RolePermissions;
  onUpdatePermissions: (role: UserRole, permissions: Permission[]) => void;
  
  lockedDate: string | null;
  onSetLockedDate: (date: string | null) => void;
  
  roleRequests: RoleRequest[];
  onApproveRoleRequest: (reqId: string, approve: boolean) => void;
}

type Tab = 'users' | 'roles' | 'logs' | 'periods' | 'password-reset';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, onAddUser, onUpdateUser, onDeleteUser, currentUser,
  auditLogs, rolePermissions, onUpdatePermissions,
  lockedDate, onSetLockedDate,
  roleRequests, onApproveRoleRequest
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: UserRole.Analyst, status: 'active' });

  // Logs filters
  const [logFilterUser, setLogFilterUser] = useState("all");
  const [logFilterAction, setLogFilterAction] = useState("all");
  const [logSearchTerm, setLogSearchTerm] = useState("");
  
  // Password reset state
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  

  const handleEditClick = (user: User) => { setEditingUser(user); setFormData({ name: user.name, email: user.email || '', role: user.role, status: user.status || 'active' }); setIsModalOpen(true); };
  const handleAddClick = () => { setEditingUser(null); setFormData({ name: '', email: '', role: UserRole.Analyst, status: 'active' }); setIsModalOpen(true); };
  
  const handlePasswordResetClick = (user: User) => {
    setSelectedUserForReset(user);
    setNewPassword("");
    setConfirmPassword("");
    setIsResetModalOpen(true);
  };
  
  const handlePasswordReset = async () => {
    if (!selectedUserForReset || newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    
    setIsResetting(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUserForReset.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setIsResetModalOpen(false);
        setSelectedUserForReset(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset password');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const avatar = formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (editingUser) onUpdateUser({ ...editingUser, name: formData.name, email: formData.email, role: formData.role, status: formData.status as any, avatar });
    else onAddUser({ name: formData.name, email: formData.email, role: formData.role, status: formData.status as any, avatar });
    setIsModalOpen(false);
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredLogs = auditLogs.filter(log => {
    const matchesUser = logFilterUser === "all" || log.userId === logFilterUser;
    const matchesAction = logFilterAction === "all" || log.action === logFilterAction;
    const matchesSearch = logSearchTerm === "" || 
      log.userName?.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(logSearchTerm.toLowerCase());
    return matchesUser && matchesAction && matchesSearch;
  });
  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action)));

  const PERMISSION_LABELS: Record<Permission, string> = {
    manage_users: "Manage Users (Create/Delete)", view_admin_panel: "Access Admin Dashboard", unmatch_transactions: "Unmatch / Delete Matches",
    view_all_logs: "View Global Audit Logs", export_data: "Export CSV Reports", perform_matching: "Perform Matching Actions",
    manage_periods: "Manage Financial Periods", approve_adjustments: "Approve High-Value Adjustments"
  };



  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><Shield className="text-indigo-600" />Admin Panel</h2><p className="text-gray-500 mt-1">Manage system security, users, and logs.</p></div>
        <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
           {['users', 'roles', 'periods', 'logs', 'password-reset'].map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab as Tab)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize flex items-center gap-2 ${activeTab === tab ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                   {tab === 'users' && <Users size={16} />}
                   {tab === 'roles' && <Key size={16} />}
                   {tab === 'periods' && <Calendar size={16} />}
                   {tab === 'logs' && <FileText size={16} />}
                   {tab === 'password-reset' && <KeyRound size={16} />}
                   {tab === 'password-reset' ? 'Password Reset' : tab}
               </button>
           ))}
        </div>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">User Directory</h3>
              <div className="flex items-center gap-4">
                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64" /></div>
                <button onClick={handleAddClick} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 text-sm"><Plus size={16} />Add User</button>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200"><tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm">{user.avatar}</div><div><p className="font-medium text-gray-900">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></div></div></td>
                    <td className="px-6 py-4"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-800">{user.role}</span></td>
                    <td className="px-6 py-4"><span className={`flex items-center gap-1.5 text-sm ${user.status === 'active' ? 'text-green-600' : 'text-red-500'}`}><span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>{user.status}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEditClick(user)} className="p-2 text-gray-400 hover:text-indigo-600" title="Edit User">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handlePasswordResetClick(user)} className="p-2 text-gray-400 hover:text-orange-600" title="Reset Password">
                          <KeyRound size={16} />
                        </button>
                        {user.id !== currentUser.id && (
                          <button onClick={() => onDeleteUser(user.id)} className="p-2 text-gray-400 hover:text-red-600" title="Delete User">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'roles' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-auto">
             <h3 className="text-lg font-bold text-gray-800 mb-4">Role Permissions</h3>
             <table className="w-full text-left">
                <thead><tr className="border-b"><th className="pb-3 w-1/3">Permission</th><th className="pb-3 text-center">Auditor</th><th className="pb-3 text-center">Analyst</th><th className="pb-3 text-center">Manager</th><th className="pb-3 text-center">Admin</th></tr></thead>
                <tbody>{(Object.keys(PERMISSION_LABELS) as Permission[]).map(p => (<tr key={p} className="hover:bg-gray-50"><td className="py-3 px-2 border-b"><span className="font-medium block">{PERMISSION_LABELS[p]}</span><span className="text-xs text-gray-400">{p}</span></td>{[UserRole.Auditor, UserRole.Analyst, UserRole.Manager, UserRole.Admin].map(r => <td key={r} className="text-center border-b"><div className={`w-4 h-4 rounded-full mx-auto ${rolePermissions[r].includes(p) ? 'bg-green-500' : 'bg-gray-200'}`}></div></td>)}</tr>))}</tbody>
             </table>
        </div>
      )}



      {activeTab === 'logs' && (
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="mb-4">
              <h3 className="font-bold mb-4">Global Audit Trail</h3>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="relative flex-1 min-w-64">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={logSearchTerm} 
                    onChange={(e) => setLogSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                  />
                </div>
                <select 
                  value={logFilterUser} 
                  onChange={(e) => setLogFilterUser(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Users</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                <select 
                  value={logFilterAction} 
                  onChange={(e) => setLogFilterAction(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Actions</option>
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="h-[500px] overflow-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0"><tr><th className="px-4 py-2">Time</th><th className="px-4 py-2">User</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Details</th></tr></thead>
                 <tbody>
                   {filteredLogs.length === 0 ? (
                     <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No logs found matching your criteria.</td></tr>
                   ) : (
                     filteredLogs.slice().reverse().map(l => (
                       <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                         <td className="px-4 py-2 text-gray-500 text-xs">{new Date(l.timestamp).toLocaleString()}</td>
                         <td className="px-4 py-2 font-medium">{l.userName || 'Unknown'}</td>
                         <td className="px-4 py-2 text-indigo-600">{l.action}</td>
                         <td className="px-4 py-2 text-gray-600">{l.details}</td>
                       </tr>
                     ))
                   )}
                 </tbody>
              </table>
            </div>
            <div className="mt-4 text-xs text-gray-500 text-center">
              Showing {filteredLogs.length} of {auditLogs.length} total log entries
            </div>
         </div>
      )}

      {activeTab === 'periods' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="font-bold text-lg mb-4">Financial Close</h3>
              <div className={`inline-block p-4 rounded-full mb-4 ${lockedDate ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{lockedDate ? <Lock size={32} /> : <Check size={32} />}</div>
              <p className="mb-6">{lockedDate ? `Books closed through ${lockedDate}` : 'All periods open.'}</p>
              <div className="flex justify-center gap-2"><input type="date" className="border p-2 rounded" value={lockedDate||''} onChange={e=>onSetLockedDate(e.target.value||null)} /><button onClick={()=>onSetLockedDate(null)} className="p-2 border rounded">Reopen</button></div>
          </div>
      )}

      {activeTab === 'password-reset' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-bold text-lg text-gray-800 mb-2 flex items-center gap-2">
              <KeyRound className="text-orange-600" size={20} />
              Password Reset Management
            </h3>
            <p className="text-gray-600 text-sm">
              Reset user passwords. When using the default password, users will be forced to change it on next login.
            </p>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none w-full max-w-md"
                />
              </div>
            </div>
            
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-3 text-left">User</th>
                    <th className="px-6 py-3 text-left">Role</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm">
                            {user.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-sm ${user.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handlePasswordResetClick(user)}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center gap-2 mx-auto"
                        >
                          <KeyRound size={14} />
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found matching your search criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for User Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
             <div className="flex justify-between mb-4"><h3 className="font-bold">{editingUser ? 'Edit User' : 'Add User'}</h3><button onClick={()=>setIsModalOpen(false)}><X size={20}/></button></div>
             <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input placeholder="Name" required className="border p-2 rounded" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                <input placeholder="Email" required className="border p-2 rounded" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} />
                <select className="border p-2 rounded bg-white" value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value as any})}><option value="ANALYST">Analyst</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option><option value="AUDITOR">Auditor</option></select>
                <select className="border p-2 rounded bg-white" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option><option value="locked">Locked</option></select>
                <button type="submit" className="bg-indigo-600 text-white py-2 rounded">Save</button>
             </form>
           </div>
        </div>
      )}

      {/* Modal for Password Reset */}
      {isResetModalOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <KeyRound className="text-orange-600" size={20} />
                Reset Password
              </h3>
              <button onClick={() => setIsResetModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Reset password for <span className="font-semibold">{selectedUserForReset.name}</span>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (leave empty for default)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter new password"
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Default password will be "Welcome123!" if left empty
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                </div>
                
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
                
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <p className="text-sm text-red-600">Password must be at least 6 characters long</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordReset}
                disabled={isResetting || (newPassword && confirmPassword && newPassword !== confirmPassword) || (newPassword && newPassword.length < 6)}
                className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isResetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Resetting...
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    Reset Password
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
