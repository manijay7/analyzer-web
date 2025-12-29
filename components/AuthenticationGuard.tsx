"use client";

import React, { useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { User, UserRole } from '@/lib/types';
import { IDLE_TIMEOUT_MS, APP_NAME } from '@/lib/constants';

interface AuthenticationGuardProps {
  children: React.ReactNode;
  onIdleTimeout?: () => void;
}

export const AuthenticationGuard: React.FC<AuthenticationGuardProps> = ({
  children,
  onIdleTimeout,
}) => {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isLoadingSession = status === 'loading';

  // Idle timeout logic
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkIdle = () => {
      if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS) {
        console.log("Idle timeout reached. Signing out.");
        handleLogout();
        onIdleTimeout?.();
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
  }, [isAuthenticated, onIdleTimeout]);

  const handleLogout = async () => {
    // Explicitly do not redirect automatically, wait for manual window location change
    // This ensures client state is fully wiped by browser navigation
    await signOut({ redirect: false });
    window.location.href = '/login';
  };

  // Prevent flashing login content if loading, but handle unauthenticated explicitly
  if (isLoadingSession) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Loading {APP_NAME}...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Middleware handles the redirect
  }

  return <>{children}</>;
};