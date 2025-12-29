"use client";

import { useState, useEffect } from "react";
import { User, RoleRequest, RolePermissions } from "@/lib/types";
import { DEFAULT_ROLE_PERMISSIONS, STORAGE_KEY } from "@/lib/constants";

export const useAppState = (status: string) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(
    DEFAULT_ROLE_PERMISSIONS
  );

  // Persistence & Initialization
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.users) setUsers(parsed.users);
        // Removed: rolePermissions persistence for security
        if (parsed.roleRequests) setRoleRequests(parsed.roleRequests);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }

    // Attempt to fetch real users if authenticated
    if (status === "authenticated") {
      fetch("/api/admin/users")
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((apiUsers) => {
          if (Array.isArray(apiUsers) && apiUsers.length > 0) {
            const normalized = apiUsers.map((u: any) => ({
              ...u,
              role: u.role as any,
            }));
            setUsers(normalized);
          }
        })
        .catch(() => {
          console.log("Could not fetch user list");
        });
    }
  }, [status]);

  // Save to local storage
  useEffect(() => {
    const stateToSave = {
      users,
      // Removed: rolePermissions persistence for security
      roleRequests,
      timestamp: Date.now(),
    };
    const existingData = localStorage.getItem(STORAGE_KEY);
    let parsed = {};
    if (existingData) {
      try {
        parsed = JSON.parse(existingData);
      } catch (e) {
        console.error("Failed to parse existing storage", e);
      }
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...parsed, ...stateToSave })
    );
  }, [users, roleRequests]);

  return {
    users,
    setUsers,
    roleRequests,
    setRoleRequests,
    rolePermissions,
    setRolePermissions,
  };
};
