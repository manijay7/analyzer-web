"use client";

import React, { useState } from 'react';
import { User, UserRole, Permission, RolePermissions, RoleRequest } from '@/lib/types';

interface AdminOperationsProps {
  currentUser: User;
  rolePermissions: RolePermissions;
  users: User[];
  roleRequests: RoleRequest[];
  lockedDate: string | null;
  onAddUser: (user: Omit<User, 'id'>) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onUpdatePermissions: (role: UserRole, permissions: Permission[]) => void;
  onSetLockedDate: (date: string | null) => void;
  onApproveRoleRequest: (reqId: string, approve: boolean) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const AdminOperations: React.FC<AdminOperationsProps> = ({
  currentUser,
  rolePermissions,
  users,
  roleRequests,
  lockedDate,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onUpdatePermissions,
  onSetLockedDate,
  onApproveRoleRequest,
  onAuditLog,
}) => {
  const [localUsers, setLocalUsers] = useState<User[]>(users);
  const [localRoleRequests, setLocalRoleRequests] = useState<RoleRequest[]>(roleRequests);

  // Update local state when props change
  React.useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  React.useEffect(() => {
    setLocalRoleRequests(roleRequests);
  }, [roleRequests]);

  const hasPermission = (role: UserRole, permission: Permission): boolean => {
    return rolePermissions[role]?.includes(permission) ?? false;
  };

  const handleAddUser = async (user: Omit<User, 'id'>) => {
    if (!hasPermission(currentUser.role, 'manage_users')) return;

    try {
      await onAddUser(user);
      onAuditLog("User Mgmt", `Created user ${user.name} via API`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleUpdateUser = async (user: User) => {
    if (!hasPermission(currentUser.role, 'manage_users')) return;

    try {
      await onUpdateUser(user);
      onAuditLog("User Mgmt", `Updated user ${user.name} via API`);
    } catch (error) {
      console.warn("API error", error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!hasPermission(currentUser.role, 'manage_users')) return;

    try {
      await onDeleteUser(id);
      onAuditLog("User Mgmt", `Deleted user ID ${id} via API`);
    } catch (error) {
      console.warn("API error", error);
    }
  };

  const handleUpdatePermissions = (role: UserRole, permissions: Permission[]) => {
    if (hasPermission(currentUser.role, 'manage_users')) {
      onUpdatePermissions(role, permissions);
    }
  };

  const handleSetLockedDate = (date: string | null) => {
    if (hasPermission(currentUser.role, 'manage_periods')) {
      onSetLockedDate(date);
    }
  };

  const handleApproveRoleRequest = (reqId: string, approve: boolean) => {
    if (!hasPermission(currentUser.role, 'manage_users')) return;

    onApproveRoleRequest(reqId, approve);

    if (approve) {
      const req = localRoleRequests.find(r => r.id === reqId);
      if (req) {
        // Also update the actual user role
        const targetUser = localUsers.find(u => u.id === req.userId);
        if (targetUser) {
          handleUpdateUser({ ...targetUser, role: req.requestedRole });
        }
        onAuditLog("User Mgmt", `Approved role upgrade for ${req.userName}`);
      }
    }
  };

  // This component provides the admin operations logic
  // The actual UI rendering is handled by AdminDashboard component
  return null;
};