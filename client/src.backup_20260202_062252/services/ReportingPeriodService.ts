/**
 * REPORTING PERIOD SERVICE
 * 
 * System-wide controller for fiscal reporting periods
 * Affects: Budgets, Expenses, Indicators, Reports, Forecasts, Grants
 * 
 * CRITICAL REQUIREMENTS:
 * - Auto-links to projects and grants
 * - Prevents deletion if data is linked
 * - Enforces single active FY rule
 * - Prevents overlapping periods
 * - Full audit trail
 */

export interface ReportingPeriod {
  id: string;
  name: string;
  type: 'FY' | 'QUARTER' | 'CUSTOM';
  start_date: string;
  end_date: string;
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  notes?: string;
  project_id?: string; // Optional - for project-specific periods
  created_by: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReportingPeriodParams {
  name: string;
  type: 'FY' | 'QUARTER' | 'CUSTOM';
  start_date: string;
  end_date: string;
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  notes?: string;
  project_id?: string;
  created_by: string;
  created_by_id?: string;
}

export interface UpdateReportingPeriodParams {
  id: string;
  name?: string;
  type?: 'FY' | 'QUARTER' | 'CUSTOM';
  start_date?: string;
  end_date?: string;
  status?: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  notes?: string;
}

export interface ReportingPeriodFilter {
  type?: 'FY' | 'QUARTER' | 'CUSTOM';
  status?: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  project_id?: string;
}

export interface LinkageCheck {
  has_budgets: boolean;
  has_expenses: boolean;
  has_indicators: boolean;
  has_reports: boolean;
  total_links: number;
  can_delete: boolean;
}

class ReportingPeriodServiceClass {
  private readonly STORAGE_KEY = 'pms_reporting_periods';
  private readonly AUDIT_KEY = 'pms_reporting_periods_audit';

  /**
   * Create a new reporting period
   */
  createReportingPeriod(params: CreateReportingPeriodParams): ReportingPeriod | null {
    try {
      // Validation: End date must be after start date
      if (new Date(params.end_date) <= new Date(params.start_date)) {
        throw new Error('End date must be after start date');
      }

      // Validation: Check for overlapping periods of the same type
      if (this.hasOverlappingPeriod(params.start_date, params.end_date, params.type, params.project_id)) {
        throw new Error('Overlapping periods of the same type are not allowed');
      }

      // Validation: Only one active Fiscal Year allowed
      if (params.type === 'FY' && params.status === 'ACTIVE') {
        const existingActiveFY = this.getReportingPeriods({ type: 'FY', status: 'ACTIVE', project_id: params.project_id });
        if (existingActiveFY.length > 0) {
          throw new Error('Only one Active Fiscal Year is allowed');
        }
      }

      // Validation: Only one active Quarter per Fiscal Year
      if (params.type === 'QUARTER' && params.status === 'ACTIVE') {
        const existingActiveQuarter = this.getReportingPeriods({ type: 'QUARTER', status: 'ACTIVE', project_id: params.project_id });
        if (existingActiveQuarter.length > 0) {
          throw new Error('Only one Active Quarter per Fiscal Year is allowed');
        }
      }

      // Create reporting period
      const reportingPeriod: ReportingPeriod = {
        id: `rp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: params.name,
        type: params.type,
        start_date: params.start_date,
        end_date: params.end_date,
        status: params.status,
        notes: params.notes,
        project_id: params.project_id,
        created_by: params.created_by,
        created_by_id: params.created_by_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to storage
      this.saveReportingPeriod(reportingPeriod);

      // Log audit trail
      this.logAudit({
        period_id: reportingPeriod.id,
        action: 'CREATE',
        user: params.created_by,
        timestamp: new Date().toISOString(),
        changes: {
          new_values: reportingPeriod
        }
      });

      return reportingPeriod;
    } catch (error) {
      console.error('Failed to create reporting period:', error);
      throw error;
    }
  }

  /**
   * Update an existing reporting period
   */
  updateReportingPeriod(params: UpdateReportingPeriodParams, updated_by: string): ReportingPeriod | null {
    try {
      const periods = this.getAllReportingPeriods();
      const periodIndex = periods.findIndex(p => p.id === params.id);

      if (periodIndex === -1) {
        throw new Error('Reporting period not found');
      }

      const oldPeriod = { ...periods[periodIndex] };

      // Validation: If changing dates, check end date is after start date
      const newStartDate = params.start_date || oldPeriod.start_date;
      const newEndDate = params.end_date || oldPeriod.end_date;
      if (new Date(newEndDate) <= new Date(newStartDate)) {
        throw new Error('End date must be after start date');
      }

      // Validation: If changing to ACTIVE status for FY, check no other active FY exists
      if (params.type === 'FY' && params.status === 'ACTIVE') {
        const existingActiveFY = this.getReportingPeriods({ 
          type: 'FY', 
          status: 'ACTIVE',
          project_id: oldPeriod.project_id 
        }).filter(p => p.id !== params.id);
        
        if (existingActiveFY.length > 0) {
          throw new Error('Only one Active Fiscal Year is allowed');
        }
      }

      // Validation: Cannot reopen closed period if it has linked data
      if (oldPeriod.status === 'CLOSED' && params.status && params.status !== 'CLOSED') {
        const linkage = this.checkLinkage(params.id);
        if (linkage.total_links > 0) {
          throw new Error('Cannot reopen closed period with linked financial data');
        }
      }

      // Update period
      periods[periodIndex] = {
        ...oldPeriod,
        ...params,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(periods));

      // Log audit trail
      this.logAudit({
        period_id: params.id,
        action: 'UPDATE',
        user: updated_by,
        timestamp: new Date().toISOString(),
        changes: {
          old_values: oldPeriod,
          new_values: periods[periodIndex]
        }
      });

      return periods[periodIndex];
    } catch (error) {
      console.error('Failed to update reporting period:', error);
      throw error;
    }
  }

  /**
   * Delete a reporting period (only if no linked data)
   */
  deleteReportingPeriod(id: string, deleted_by: string): boolean {
    try {
      // Check linkage before deletion
      const linkage = this.checkLinkage(id);
      if (!linkage.can_delete) {
        throw new Error('Cannot delete reporting period with linked data');
      }

      const periods = this.getAllReportingPeriods();
      const period = periods.find(p => p.id === id);

      if (!period) {
        throw new Error('Reporting period not found');
      }

      // Log audit trail before deletion
      this.logAudit({
        period_id: id,
        action: 'DELETE',
        user: deleted_by,
        timestamp: new Date().toISOString(),
        changes: {
          old_values: period
        }
      });

      // Remove from storage
      const filteredPeriods = periods.filter(p => p.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredPeriods));

      return true;
    } catch (error) {
      console.error('Failed to delete reporting period:', error);
      throw error;
    }
  }

  /**
   * Get all reporting periods matching filter
   */
  getReportingPeriods(filter?: ReportingPeriodFilter): ReportingPeriod[] {
    const allPeriods = this.getAllReportingPeriods();

    if (!filter) {
      return allPeriods;
    }

    return allPeriods.filter(period => {
      if (filter.type && period.type !== filter.type) return false;
      if (filter.status && period.status !== filter.status) return false;
      if (filter.project_id && period.project_id !== filter.project_id) return false;
      return true;
    });
  }

  /**
   * Get a single reporting period by ID
   */
  getReportingPeriod(id: string): ReportingPeriod | null {
    const periods = this.getAllReportingPeriods();
    return periods.find(p => p.id === id) || null;
  }

  /**
   * Check if a reporting period has linked data
   */
  checkLinkage(period_id: string): LinkageCheck {
    // Check budgets
    const budgets = this.getLinkedRecords('pms_budgets', period_id);
    
    // Check expenses
    const expenses = this.getLinkedRecords('pms_expenses', period_id);
    
    // Check indicators
    const indicators = this.getLinkedRecords('pms_indicators', period_id);
    
    // Check reports
    const reports = this.getLinkedRecords('pms_reports', period_id);

    const total_links = budgets + expenses + indicators + reports;

    return {
      has_budgets: budgets > 0,
      has_expenses: expenses > 0,
      has_indicators: indicators > 0,
      has_reports: reports > 0,
      total_links: total_links,
      can_delete: total_links === 0
    };
  }

  /**
   * Auto-create default reporting periods for a new project
   */
  autoCreateForProject(project_id: string, project_start_date: string, project_end_date: string, created_by: string): ReportingPeriod[] {
    try {
      const createdPeriods: ReportingPeriod[] = [];

      // Determine fiscal year from project start date
      const startYear = new Date(project_start_date).getFullYear();
      const endYear = new Date(project_end_date).getFullYear();

      // Create Fiscal Year period
      const fyPeriod = this.createReportingPeriod({
        name: `FY ${startYear}`,
        type: 'FY',
        start_date: `${startYear}-01-01`,
        end_date: `${startYear}-12-31`,
        status: this.suggestStatus(`${startYear}-01-01`, `${startYear}-12-31`),
        project_id: project_id,
        created_by: created_by,
        notes: 'Auto-generated for project'
      });

      if (fyPeriod) {
        createdPeriods.push(fyPeriod);
      }

      // Create quarterly periods
      const quarters = [
        { name: 'Q1', start: '01-01', end: '03-31' },
        { name: 'Q2', start: '04-01', end: '06-30' },
        { name: 'Q3', start: '07-01', end: '09-30' },
        { name: 'Q4', start: '10-01', end: '12-31' }
      ];

      for (const quarter of quarters) {
        try {
          const quarterPeriod = this.createReportingPeriod({
            name: `${quarter.name} ${startYear}`,
            type: 'QUARTER',
            start_date: `${startYear}-${quarter.start}`,
            end_date: `${startYear}-${quarter.end}`,
            status: this.suggestStatus(`${startYear}-${quarter.start}`, `${startYear}-${quarter.end}`),
            project_id: project_id,
            created_by: created_by,
            notes: 'Auto-generated for project'
          });

          if (quarterPeriod) {
            createdPeriods.push(quarterPeriod);
          }
        } catch (error) {
          console.warn(`Failed to create ${quarter.name}:`, error);
        }
      }

      return createdPeriods;
    } catch (error) {
      console.error('Failed to auto-create reporting periods:', error);
      return [];
    }
  }

  /**
   * Link reporting periods to a grant
   */
  linkToGrant(grant_id: string, project_id: string): void {
    // This method ensures grants inherit project reporting periods
    // Implementation depends on grant data structure
    try {
      const grants = JSON.parse(localStorage.getItem('pms_active_grants') || '[]');
      const updatedGrants = grants.map((grant: any) => {
        if (grant.id === grant_id) {
          return {
            ...grant,
            project_id: project_id,
            reporting_periods_linked: true,
            updated_at: new Date().toISOString()
          };
        }
        return grant;
      });
      localStorage.setItem('pms_active_grants', JSON.stringify(updatedGrants));
    } catch (error) {
      console.error('Failed to link reporting periods to grant:', error);
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private getAllReportingPeriods(): ReportingPeriod[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve reporting periods:', error);
      return [];
    }
  }

  private saveReportingPeriod(period: ReportingPeriod): void {
    const periods = this.getAllReportingPeriods();
    periods.push(period);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(periods));
  }

  private hasOverlappingPeriod(start_date: string, end_date: string, type: string, project_id?: string, excludeId?: string): boolean {
    const periods = this.getReportingPeriods({ type: type as any, project_id });
    
    const newStart = new Date(start_date);
    const newEnd = new Date(end_date);

    return periods.some(period => {
      if (excludeId && period.id === excludeId) return false;

      const existingStart = new Date(period.start_date);
      const existingEnd = new Date(period.end_date);

      // Check for overlap
      return (newStart <= existingEnd && newEnd >= existingStart);
    });
  }

  private suggestStatus(start_date: string, end_date: string): 'UPCOMING' | 'ACTIVE' | 'CLOSED' {
    const now = new Date();
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (now < start) return 'UPCOMING';
    if (now > end) return 'CLOSED';
    return 'ACTIVE';
  }

  private getLinkedRecords(storageKey: string, period_id: string): number {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return 0;

      const records = JSON.parse(stored);
      return records.filter((record: any) => record.reporting_period_id === period_id).length;
    } catch (error) {
      return 0;
    }
  }

  private logAudit(entry: {
    period_id: string;
    action: string;
    user: string;
    timestamp: string;
    changes?: any;
  }): void {
    try {
      const stored = localStorage.getItem(this.AUDIT_KEY);
      const auditTrail = stored ? JSON.parse(stored) : [];
      
      auditTrail.push(entry);
      
      // Keep only last 1000 entries
      if (auditTrail.length > 1000) {
        auditTrail.shift();
      }
      
      localStorage.setItem(this.AUDIT_KEY, JSON.stringify(auditTrail));
    } catch (error) {
      console.error('Failed to log audit trail:', error);
    }
  }

  /**
   * Get audit trail for a reporting period
   */
  getAuditTrail(period_id: string): any[] {
    try {
      const stored = localStorage.getItem(this.AUDIT_KEY);
      const auditTrail = stored ? JSON.parse(stored) : [];
      return auditTrail.filter((entry: any) => entry.period_id === period_id);
    } catch (error) {
      console.error('Failed to retrieve audit trail:', error);
      return [];
    }
  }

  /**
   * Clear all reporting periods (for testing only)
   */
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.AUDIT_KEY);
  }
}

// Export singleton instance
export const ReportingPeriodService = new ReportingPeriodServiceClass();
