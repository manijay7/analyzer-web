"use client";

import React, { useState } from 'react';
import { RoleRequest, UserRole, RolePermissions } from '@/lib/types';

interface RoleManagementProps {
  roleRequests: RoleRequest[];
  rolePermissions: RolePermissions;
  users: any[];
  onApproveRoleRequest: (reqId: string, approve: boolean) => void;
  onUpdatePermissions: (role: UserRole, permissions: string[]) => void;
  currentUserRole: UserRole;
  hasPermission: (role: UserRole, permission: string) => boolean;
}

export const RoleManagement: React.FC<RoleManagementProps> = ({
  roleRequests,
  rolePermissions,
  users,
  onApproveRoleRequest,
  onUpdatePermissions,
  currentUserRole,
  hasPermission,
}) => {
  const [isRoleRequestOpen, setIsRoleRequestOpen] = useState(false);
  const [roleRequestReason, setRoleRequestReason] = useState("");

  const handleRoleRequest = () => {
    if (!roleRequestReason) return;
    // This would trigger a role request - logic moved to parent
    setIsRoleRequestOpen(false);
    setRoleRequestReason("");
  };

  const handleApproveRoleRequest = (reqId: string, approve: boolean) => {
    if (!hasPermission(currentUserRole, 'manage_users')) return;
    onApproveRoleRequest(reqId, approve);
  };

  const handleUpdatePermissions = (role: UserRole, permissions: string[]) => {
    if (!hasPermission(currentUserRole, 'manage_users')) return;
    onUpdatePermissions(role, permissions);
  };

  return null; // UI handled by existing components
};