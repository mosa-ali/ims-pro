'use client';

import React from 'react';
import { SyncStatus } from '@shared/types/budgetSync';
import { formatDistanceToNow } from 'date-fns';

interface BudgetSyncStatusProps {
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  budgetVersion?: number;
  recordsAffected?: number;
}

/**
 * BudgetSyncStatus Component
 * 
 * Displays current sync status with color-coded badge and metadata.
 * Shows budget version, records affected, and time since last sync.
 * 
 * Status colors:
 * - Pending: Gray
 * - Syncing: Blue
 * - Completed: Green
 * - Failed: Red
 */
export function BudgetSyncStatus({
  syncStatus,
  lastSyncedAt,
  budgetVersion = 1,
  recordsAffected = 0,
}: BudgetSyncStatusProps) {
  const getStatusColor = (status: SyncStatus) => {
    switch (status) {
      case SyncStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case SyncStatus.SYNCING:
        return 'bg-blue-100 text-blue-800';
      case SyncStatus.FAILED:
        return 'bg-red-100 text-red-800';
      case SyncStatus.PENDING:
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case SyncStatus.COMPLETED:
        return '✓';
      case SyncStatus.SYNCING:
        return '⟳';
      case SyncStatus.FAILED:
        return '✕';
      case SyncStatus.PENDING:
      default:
        return '○';
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center gap-4">
        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-full font-medium flex items-center gap-2 ${getStatusColor(syncStatus)}`}>
          <span className="text-lg">{getStatusIcon(syncStatus)}</span>
          <span className="capitalize">{syncStatus}</span>
        </div>

        {/* Metadata Grid */}
        <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Version</p>
            <p className="font-medium">{budgetVersion}</p>
          </div>

          <div>
            <p className="text-gray-600">Records</p>
            <p className="font-medium">{recordsAffected}</p>
          </div>

          <div>
            <p className="text-gray-600">Last Sync</p>
            <p className="font-medium">
              {lastSyncedAt ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true }) : 'Never'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
