"use client";

import React from 'react';
import { Activity, TrendingUp, DollarSign } from 'lucide-react';

interface ReconciliationStatsProps {
  activeLeft: number;
  activeRight: number;
  totalMatches: number;
  totalMatchedValue: number;
}

export const ReconciliationStats: React.FC<ReconciliationStatsProps> = ({
  activeLeft,
  activeRight,
  totalMatches,
  totalMatchedValue,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="p-3 bg-blue-50 rounded-full text-blue-600">
          <Activity size={20} />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">Left Unmatched</p>
          <p className="text-xl font-bold text-gray-800">{activeLeft}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="p-3 bg-green-50 rounded-full text-green-600">
          <Activity size={20} />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">Right Unmatched</p>
          <p className="text-xl font-bold text-gray-800">{activeRight}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
          <TrendingUp size={20} />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Matches</p>
          <p className="text-xl font-bold text-gray-800">{totalMatches}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="p-3 bg-purple-50 rounded-full text-purple-600">
          <DollarSign size={20} />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">Matched Value</p>
          <p className="text-xl font-bold text-gray-800">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalMatchedValue)}
          </p>
        </div>
      </div>
    </div>
  );
};