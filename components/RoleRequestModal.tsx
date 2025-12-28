"use client";

import React from 'react';

interface RoleRequestModalProps {
  isOpen: boolean;
  reason: string;
  onClose: () => void;
  onSubmit: () => void;
  onReasonChange: (reason: string) => void;
}

export const RoleRequestModal: React.FC<RoleRequestModalProps> = ({
  isOpen,
  reason,
  onClose,
  onSubmit,
  onReasonChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h3 className="font-bold text-lg mb-2">Request Role Upgrade</h3>
        <p className="text-sm text-gray-500 mb-4">Request upgrade to Manager permissions.</p>
        <textarea
          className="w-full border p-2 rounded mb-4 text-sm"
          placeholder="Reason for request..."
          rows={3}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};