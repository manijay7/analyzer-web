"use client";

import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff } from 'lucide-react';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mustChange?: boolean; // If true, user is forced to change password
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ 
  isOpen, 
  onClose, 
  mustChange = false 
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    if (!mustChange && currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setIsChanging(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: mustChange ? "" : currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || "Password changed successfully");
        onClose();
        
        // Reset form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to change password");
      }
    } catch (error: any) {
      setError(error.message || "An error occurred");
    } finally {
      setIsChanging(false);
    }
  };

  const handleClose = () => {
    if (mustChange) {
      alert("You must change your password before continuing.");
      return;
    }
    onClose();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <KeyRound className="text-blue-600" size={20} />
            {mustChange ? "Change Your Password" : "Change Password"}
          </h3>
          {!mustChange && (
            <button onClick={handleClose}>
              <X size={20} />
            </button>
          )}
        </div>

        {mustChange && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Password Change Required:</strong> You must change your password before you can continue using the system.
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!mustChange && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new password"
              minLength={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm new password"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            {!mustChange && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isChanging}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isChanging || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isChanging ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Changing...
                </>
              ) : (
                <>
                  <KeyRound size={14} />
                  {mustChange ? "Change Password" : "Update Password"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
