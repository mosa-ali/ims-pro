/**
 * System Health Service
 * 
 * Manages the readiness state of the system and tracks detected health issues.
 * Implements the "System Health, Readiness, and Regression Protection Layer".
 */

export type HealthStatus = 'READY' | 'NOT_READY' | 'INITIALIZING';

export interface HealthIssue {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  module: string;
  issue: string;
  cause: string;
  suggestedFix: string;
  autoFixAvailable: boolean;
  timestamp: string;
}

export interface ReadinessResponse {
  status: HealthStatus;
  services: {
    api: boolean;
    database: boolean;
    auth: boolean;
    environment: boolean;
  };
  timestamp: string;
}

class SystemHealthService {
  private issues: HealthIssue[] = [];
  private isSimulatingFailure = false;

  constructor() {
    // Initialize with some mock regression rules/issues if any are detected
    this.runRegressionChecks();
  }

  /**
   * Mock backend readiness check
   * In a real environment, this would call GET /health/ready
   */
  async checkBackendReady(): Promise<ReadinessResponse> {
    // Simulate a small delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (this.isSimulatingFailure) {
      return {
        status: 'NOT_READY',
        services: {
          api: true,
          database: false,
          auth: true,
          environment: true
        },
        timestamp: new Date().toISOString()
      };
    }

    // Check environment variables (mock)
    const envReady = true; // In real app: !!process.env.VITE_SUPABASE_URL;

    return {
      status: 'READY',
      services: {
        api: true,
        database: true,
        auth: true,
        environment: envReady
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Run system-wide regression and logic checks
   */
  runRegressionChecks() {
    this.issues = [];

    // Rule 1: RTL Layout Consistency Check (Mock)
    // In a real scenario, this would check computed styles or configuration
    const isArabic = localStorage.getItem('language') === 'ar';
    const isRtl = document.dir === 'rtl';
    
    if (isArabic && !isRtl) {
      this.addIssue({
        id: 'RTL-001',
        severity: 'CRITICAL',
        module: 'UI Core',
        issue: 'RTL Layout Inconsistency',
        cause: 'Language set to Arabic but document direction is LTR',
        suggestedFix: 'Apply dir="rtl" to root element',
        autoFixAvailable: true
      });
    }

    // Rule 2: Core Data Presence (Mock)
    // Check if critical services are initialized
    if (!localStorage.getItem('ims_auth_user')) {
      this.addIssue({
        id: 'AUTH-001',
        severity: 'INFO',
        module: 'Security',
        issue: 'No Active Session',
        cause: 'System initialized but no user is logged in',
        suggestedFix: 'Redirect to login page',
        autoFixAvailable: false
      });
    }

    // Rule 3: Project Plan Duration (Mock logic)
    // This would normally check actual project records
    this.addIssue({
      id: 'REG-042',
      severity: 'WARNING',
      module: 'Project Plan',
      issue: 'Plan duration mismatch placeholder',
      cause: 'Timeline not bound to project dates in some modules',
      suggestedFix: 'Bind timeline generator to project start/end',
      autoFixAvailable: true
    });
  }

  private addIssue(issue: Omit<HealthIssue, 'timestamp'>) {
    this.issues.push({
      ...issue,
      timestamp: new Date().toISOString()
    });
  }

  getIssues(): HealthIssue[] {
    return this.issues;
  }

  setSimulateFailure(fail: boolean) {
    this.isSimulatingFailure = fail;
  }

  async applyAutoFix(issueId: string): Promise<boolean> {
    const issue = this.issues.find(i => i.id === issueId);
    if (!issue || !issue.autoFixAvailable) return false;

    console.log(`Applying auto-fix for ${issueId}...`);
    
    // Simulate fix
    if (issueId === 'RTL-001') {
      document.dir = 'rtl';
    }

    this.issues = this.issues.filter(i => i.id !== issueId);
    return true;
  }
}

export const systemHealthService = new SystemHealthService();
