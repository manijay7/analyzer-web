"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { User, UserRole, Permission, RolePermissions } from '@/lib/types';

interface PermissionContextType {
  hasPermission: (role: UserRole, permission: Permission) => boolean;
  canAccessAdmin: boolean;
  canUnmatch: boolean;
  canApprove: boolean;
  canExport: boolean;
  canManageUsers: boolean;
  canManagePeriods: boolean;
  canViewAudit: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
  currentUser: User;
  rolePermissions: RolePermissions;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({
  children,
  currentUser,
  rolePermissions,
}) => {
  const hasPermission = (role: UserRole, permission: Permission): boolean => {
    return rolePermissions[role]?.includes(permission) ?? false;
  };

  const canAccessAdmin = hasPermission(currentUser.role, 'view_admin_panel');
  const canUnmatch = hasPermission(currentUser.role, 'unmatch_transactions');
  const canApprove = hasPermission(currentUser.role, 'approve_adjustments');
  const canExport = hasPermission(currentUser.role, 'export_data');
  const canManageUsers = hasPermission(currentUser.role, 'manage_users');
  const canManagePeriods = hasPermission(currentUser.role, 'manage_periods');
  const canViewAudit = hasPermission(currentUser.role, 'view_all_logs');

  const value: PermissionContextType = {
    hasPermission,
    canAccessAdmin,
    canUnmatch,
    canApprove,
    canExport,
    canManageUsers,
    canManagePeriods,
    canViewAudit,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};