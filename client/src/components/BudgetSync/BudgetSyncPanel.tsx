'use client';

import React from 'react';

interface SyncHistoryItem {
  id: string;
  action: string;
  status: 'completed' | 'failed' | 'in_progress';
  recordsAffected: number;
  timestamp: Date;
  details?: string;
}

interface BudgetSyncPanelProps {
  history: SyncHistoryItem[];
  isLoading?: boolean;
}

export function BudgetSyncPanel({ history = [], isLoading = false }: BudgetSyncPanelProps) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <h3 className="font-bold text-lg mb-4">Sync History</h3>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="ml-2">Syncing...</span>
        </div>
      )}

      {history.length === 0 && !isLoading && (
        <p className="text-gray-500 text-center py-8">No sync history yet</p>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="p-3 border border-gray-100 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">{item.action}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>

                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    item.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : item.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {item.status === 'completed'
                    ? '✓ Completed'
                    : item.status === 'in_progress'
                    ? '⟳ In Progress'
                    : '✕ Failed'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-600">
                  Records affected: <span className="font-medium">{item.recordsAffected}</span>
                </p>
                {item.details && (
                  <p className="text-gray-600">{item.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
