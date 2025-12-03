
"use client";

import React, { useState } from 'react';
import { User, UserRole, AuditLogEntry, RolePermissions, Permission, RoleRequest, DeviceSession } from '@/lib/types';
import { Users, Plus, Edit2, Trash2, Shield, Search, X, Check, Key, Lock, FileText, Filter, Calendar, Laptop, AlertOctagon, UserCheck } from 'lucide-react';

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

type Tab = 'users' | 'roles' | 'logs' | 'periods' | 'security';

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

  const handleEditClick = (user: User) => { setEditingUser(user); setFormData({ name: user.name, email: user.email || '', role: user.role, status: user.status || 'active' }); setIsModalOpen(true); };
  const handleAddClick = () => { setEditingUser(null); setFormData({ name: '', email: '', role: UserRole.Analyst, status: 'active' }); setIsModalOpen(true); };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const avatar = formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (editingUser) onUpdateUser({ ...editingUser, name: formData.name, email: formData.email, role: formData.role, status: formData.status as any, avatar });
    else onAddUser({ name: formData.name, email: formData.email, role: formData.role, status: formData.status as any, avatar });
    setIsModalOpen(false);
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredLogs = auditLogs.filter(log => (logFilterUser === "all" || log.userId === logFilterUser) && (logFilterAction === "all" || log.action === logFilterAction));
  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action)));

  const PERMISSION_LABELS: Record<Permission, string> = {
    manage_users: "Manage Users (Create/Delete)", view_admin_panel: "Access Admin Dashboard", unmatch_transactions: "Unmatch / Delete Matches",
    view_all_logs: "View Global Audit Logs", export_data: "Export CSV Reports", perform_matching: "Perform Matching Actions",
    manage_periods: "Manage Financial Periods", approve_adjustments: "Approve High-Value Adjustments"
  };

  // Mock Active Sessions
  const mockSessions: DeviceSession[] = [
      { id: 'd1', userId: currentUser.id, device: 'Chrome / Windows', ip: '192.168.1.5', lastActive: Date.now(), location: 'New York, US', isCurrent: true },
      { id: 'd2', userId: currentUser.id, device: 'Safari / iPhone', ip: '10.0.0.1', lastActive: Date.now() - 3600000, location: 'New York, US', isCurrent: false }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><Shield className="text-indigo-600" />Admin Panel</h2><p className="text-gray-500 mt-1">Manage system security, users, and logs.</p></div>
        <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
           {['users', 'roles', 'periods', 'logs', 'security'].map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab as Tab)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize flex items-center gap-2 ${activeTab === tab ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                   {tab === 'users' && <Users size={16} />}
                   {tab === 'roles' && <Key size={16} />}
                   {tab === 'periods' && <Calendar size={16} />}
                   {tab === 'logs' && <FileText size={16} />}
                   {tab === 'security' && <AlertOctagon size={16} />}
                   {tab}
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
                    <td className="px-6 py-4 text-right"><button onClick={() => handleEditClick(user)} className="p-2 text-gray-400 hover:text-indigo-600"><Edit2 size={16} /></button>{user.id !== currentUser.id && <button onClick={() => onDeleteUser(user.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>}</td>
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

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Laptop size={18} />Active Sessions</h3>
                <div className="space-y-4">
                    {mockSessions.map(s => (
                        <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded border border-gray-200"><Laptop size={16} /></div>
                                <div><p className="font-medium text-sm text-gray-900">{s.device}</p><p className="text-xs text-gray-500">{s.location} • {s.ip}</p></div>
                            </div>
                            {s.isCurrent ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Current</span> : <button className="text-xs text-red-600 hover:underline">Revoke</button>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18} />Role Requests</h3>
                {roleRequests.filter(r => r.status === 'PENDING').length === 0 ? <p className="text-sm text-gray-400">No pending requests.</p> : (
                    <div className="space-y-3">
                        {roleRequests.filter(r => r.status === 'PENDING').map(r => (
                            <div key={r.id} className="p-3 border border-gray-200 rounded-lg">
                                <div className="flex justify-between">
                                    <span className="font-semibold text-sm">{r.userName}</span>
                                    <span className="text-xs text-gray-500">{new Date(r.timestamp).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">Requested: <span className="font-bold text-indigo-600">{r.requestedRole}</span></p>
                                <p className="text-xs italic text-gray-500 mt-1">"{r.reason}"</p>
                                <div className="flex gap-2 mt-3 justify-end">
                                    <button onClick={() => onApproveRoleRequest(r.id, false)} className="px-3 py-1 text-xs border rounded hover:bg-gray-50">Reject</button>
                                    <button onClick={() => onApproveRoleRequest(r.id, true)} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Approve</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-red-600"><AlertOctagon size={18} />Suspicious Activity</h3>
                <div className="p-3 bg-red-50 text-red-800 text-sm rounded border border-red-100 flex items-center gap-2">
                    <Shield size={16} /> No recent alerts detected.
                </div>
            </div>
        </div>
      )}

      {activeTab === 'logs' && (
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-[600px] overflow-auto custom-scrollbar">
            <h3 className="font-bold mb-4">Global Audit Trail</h3>
            <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="px-4 py-2">Time</th><th className="px-4 py-2">User</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Details</th></tr></thead>
               <tbody>{filteredLogs.slice().reverse().map(l => <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50"><td className="px-4 py-2 text-gray-500 text-xs">{new Date(l.timestamp).toLocaleString()}</td><td className="px-4 py-2 font-medium">{l.userName}</td><td className="px-4 py-2 text-indigo-600">{l.action}</td><td className="px-4 py-2 text-gray-600">{l.details}</td></tr>)}</tbody>
            </table>
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
    </div>
  );
};
