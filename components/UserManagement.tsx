"use client";

import React from 'react';
import { User, UserRole } from '@/lib/types';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'> & { password: string }) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  currentUserRole: UserRole;
  hasPermission: (role: UserRole, permission: string) => boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  currentUserRole,
  hasPermission,
}) => {
  // This component can render user management UI
  // For now, it's a placeholder - the actual UI is in AdminOperations
  // But we can use this to encapsulate logic

  const handleAddUser = async (userData: any) => {
    if (!hasPermission(currentUserRole, 'manage_users')) return;
    try {
      await onAddUser(userData);
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const handleUpdateUser = async (user: User) => {
    if (!hasPermission(currentUserRole, 'manage_users')) return;
    try {
      await onUpdateUser(user);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!hasPermission(currentUserRole, 'manage_users')) return;
    try {
      await onDeleteUser(id);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return null; // UI is handled by AdminOperations
};