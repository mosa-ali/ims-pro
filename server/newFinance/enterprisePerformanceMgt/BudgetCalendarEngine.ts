/**
 * BudgetCalendarEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Budget Calendar — Enterprise Planning Lifecycle
 *
 * PHASE 6: Enterprise Performance Management
 *
 * Manages the complete annual/multi-year budget lifecycle:
 *
 *   Preparation → Submission → Review → Approval → Execution → Revision → Close
 *
 * Each phase has:
 *  - Defined window (start/end dates)
 *  - Responsible roles
 *  - Notification triggers
 *  - Lock behavior (who can edit what and when)
 *  - Donor submission deadlines
 *  - Escalation rules
 *
 * Standard in Oracle EPM, Workday Adaptive, Anaplan.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type CalendarPhase =
  | 'preparation'
  | 'submission'
  | 'review'
  | 'revision'
  | 'approval'
  | 'execution'
  | 'mid_year_review'
  | 'year_end_close'
  | 'donor_reporting';

export type CalendarPhaseStatus = 'upcoming' | 'active' | 'overdue' | 'completed' | 'skipped';

export interface BudgetCalendar {
  calendarId: string;
  organizationId: number;
  fiscalYear: string;
  name: string;
  status: 'draft' | 'published' | 'active' | 'completed';
  phases: CalendarPhaseEntry[];
  createdBy: number;
  createdAt: string;
  publishedAt?: string;
}

export interface CalendarPhaseEntry {
  phaseId: string;
  phase: CalendarPhase;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: CalendarPhaseStatus;
  responsibleRole: string;
  lockBehavior: LockBehavior;
  notifications: PhaseNotification[];
  donorDeadlines: DonorDeadline[];
  completedAt?: string;
  completedBy?: number;
}

export interface LockBehavior {
  /** Who can edit during this phase */
  allowedRoles: string[];
  /** What entities are locked */
  lockedEntities: ('budget_header' | 'budget_lines' | 'allocations' | 'commitments')[];
  /** Override permission role */
  overrideRole: string;
  /** Auto-lock when phase ends */
  autoLockOnClose: boolean;
}

export interface PhaseNotification {
  notificationId: string;
  trigger: 'phase_start' | 'phase_end' | 'deadline_approaching' | 'overdue' | 'custom';
  daysBefore?: number;
  recipientRoles: string[];
  messageKey: string;       // Translation key for IMS i18n
  channel: ('email' | 'in_app' | 'teams')[];
  sent: boolean;
  sentAt?: string;
}

export interface DonorDeadline {
  donorId: number;
  donorName: string;
  grantId?: number;
  deadlineDate: string;
  deadlineType: 'budget_submission' | 'narrative_report' | 'financial_report' | 'audit';
  description: string;
  status: 'pending' | 'submitted' | 'overdue' | 'waived';
}

export interface CalendarDashboard {
  calendarId: string;
  fiscalYear: string;
  currentPhase: CalendarPhaseEntry | null;
  nextPhase: CalendarPhaseEntry | null;
  upcomingDeadlines: DonorDeadline[];
  overdueItems: Array<{ type: string; description: string; dueDate: string; daysOverdue: number }>;
  phaseProgress: Array<{ phase: string; status: CalendarPhaseStatus; percentComplete: number }>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IBudgetCalendarRepository {
  save(calendar: BudgetCalendar): Promise<void>;
  getById(calendarId: string, scope: RepositoryScope): Promise<BudgetCalendar | null>;
  getByFiscalYear(fiscalYear: string, scope: RepositoryScope): Promise<BudgetCalendar | null>;
  update(calendarId: string, fields: Partial<BudgetCalendar>): Promise<void>;
  updatePhase(calendarId: string, phaseId: string, fields: Partial<CalendarPhaseEntry>): Promise<void>;
  listActive(scope: RepositoryScope): Promise<BudgetCalendar[]>;
  getDonorDeadlines(scope: RepositoryScope, daysAhead?: number): Promise<DonorDeadline[]>;
  getPendingNotifications(asOfDate: string): Promise<PhaseNotification[]>;
  markNotificationSent(notificationId: string): Promise<void>;
}

export interface BudgetCalendarDependencies {
  calendarRepo: IBudgetCalendarRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class BudgetCalendarEngine {
  private repo: IBudgetCalendarRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: BudgetCalendarDependencies) {
    this.repo = deps.calendarRepo;
    this.logger = deps.logger.child({ service: 'BudgetCalendarEngine' });
    this.config = deps.config;
  }

  /**
   * Create a budget calendar for a fiscal year.
   * Generates default phases based on organizational template.
   */
  async createCalendar(
    fiscalYear: string,
    userId: number,
    scope: RepositoryScope,
    customPhases?: Partial<CalendarPhaseEntry>[],
  ): Promise<BudgetCalendar> {
    const existing = await this.repo.getByFiscalYear(fiscalYear, scope);
    if (existing) throw new Error(`Calendar already exists for fiscal year ${fiscalYear}`);

    const phases = customPhases
      ? this.buildCustomPhases(customPhases)
      : this.buildDefaultPhases(fiscalYear);

    const calendar: BudgetCalendar = {
      calendarId: uuidv4(),
      organizationId: scope.organizationId,
      fiscalYear,
      name: `Budget Calendar ${fiscalYear}`,
      status: 'draft',
      phases,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    await this.repo.save(calendar);
    this.logger.info('Budget calendar created', { calendarId: calendar.calendarId, fiscalYear });
    return calendar;
  }

  /**
   * Publish a calendar (makes it active, triggers notifications).
   */
  async publish(calendarId: string, userId: number, scope: RepositoryScope): Promise<void> {
    const cal = await this.repo.getById(calendarId, scope);
    if (!cal) throw new Error(`Calendar ${calendarId} not found`);
    if (cal.status !== 'draft') throw new Error('Only draft calendars can be published');

    await this.repo.update(calendarId, {
      status: 'active',
      publishedAt: new Date().toISOString(),
    });

    this.logger.info('Budget calendar published', { calendarId, fiscalYear: cal.fiscalYear });
  }

  /**
   * Advance to the next phase.
   */
  async advancePhase(
    calendarId: string,
    currentPhaseId: string,
    userId: number,
    scope: RepositoryScope,
  ): Promise<CalendarPhaseEntry | null> {
    const cal = await this.repo.getById(calendarId, scope);
    if (!cal) throw new Error(`Calendar ${calendarId} not found`);

    const currentIdx = cal.phases.findIndex(p => p.phaseId === currentPhaseId);
    if (currentIdx === -1) throw new Error(`Phase ${currentPhaseId} not found`);

    // Complete current phase
    await this.repo.updatePhase(calendarId, currentPhaseId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: userId,
    });

    // Activate next phase
    const nextPhase = cal.phases[currentIdx + 1];
    if (nextPhase) {
      await this.repo.updatePhase(calendarId, nextPhase.phaseId, { status: 'active' });
      this.logger.info('Calendar phase advanced', {
        calendarId,
        from: cal.phases[currentIdx].phase,
        to: nextPhase.phase,
      });
      return nextPhase;
    }

    // No more phases — calendar complete
    await this.repo.update(calendarId, { status: 'completed' });
    this.logger.info('Budget calendar completed', { calendarId });
    return null;
  }

  /**
   * Get calendar dashboard (current state, deadlines, overdue items).
   */
  async getDashboard(fiscalYear: string, scope: RepositoryScope): Promise<CalendarDashboard> {
    const cal = await this.repo.getByFiscalYear(fiscalYear, scope);
    if (!cal) throw new Error(`No calendar for fiscal year ${fiscalYear}`);

    const today = new Date().toISOString().split('T')[0];
    const currentPhase = cal.phases.find(p => p.status === 'active') || null;
    const nextIdx = currentPhase
      ? cal.phases.findIndex(p => p.phaseId === currentPhase.phaseId) + 1
      : 0;
    const nextPhase = cal.phases[nextIdx] || null;

    // Collect upcoming donor deadlines (next 30 days)
    const upcomingDeadlines = cal.phases
      .flatMap(p => p.donorDeadlines)
      .filter(d => d.status === 'pending' && d.deadlineDate >= today)
      .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))
      .slice(0, 10);

    // Collect overdue items
    const overdueItems: CalendarDashboard['overdueItems'] = [];
    for (const phase of cal.phases) {
      if (phase.status !== 'completed' && phase.endDate < today && phase.status !== 'skipped') {
        overdueItems.push({
          type: 'phase',
          description: `${phase.name} was due ${phase.endDate}`,
          dueDate: phase.endDate,
          daysOverdue: Math.floor((Date.now() - new Date(phase.endDate).getTime()) / 86400000),
        });
      }
      for (const dl of phase.donorDeadlines) {
        if (dl.status === 'pending' && dl.deadlineDate < today) {
          overdueItems.push({
            type: 'donor_deadline',
            description: `${dl.donorName}: ${dl.description}`,
            dueDate: dl.deadlineDate,
            daysOverdue: Math.floor((Date.now() - new Date(dl.deadlineDate).getTime()) / 86400000),
          });
        }
      }
    }

    const phaseProgress = cal.phases.map(p => ({
      phase: p.name,
      status: p.status,
      percentComplete: p.status === 'completed' ? 100
        : p.status === 'active' ? this.calculatePhaseProgress(p)
        : 0,
    }));

    return {
      calendarId: cal.calendarId,
      fiscalYear,
      currentPhase,
      nextPhase,
      upcomingDeadlines,
      overdueItems,
      phaseProgress,
    };
  }

  /**
   * Check if editing is allowed based on calendar phase and user role.
   */
  async isEditingAllowed(
    fiscalYear: string,
    entityType: 'budget_header' | 'budget_lines' | 'allocations' | 'commitments',
    userRole: string,
    scope: RepositoryScope,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const cal = await this.repo.getByFiscalYear(fiscalYear, scope);
    if (!cal || cal.status !== 'active') {
      return { allowed: true }; // No active calendar = no restrictions
    }

    const activePhase = cal.phases.find(p => p.status === 'active');
    if (!activePhase) return { allowed: true };

    const lock = activePhase.lockBehavior;

    if (lock.lockedEntities.includes(entityType)) {
      if (lock.allowedRoles.includes(userRole) || userRole === lock.overrideRole) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `${entityType} is locked during ${activePhase.name}. Allowed roles: ${lock.allowedRoles.join(', ')}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Process pending notifications (called by scheduler).
   */
  async processNotifications(scope: RepositoryScope): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const pending = await this.repo.getPendingNotifications(today);
    let sent = 0;

    for (const notif of pending) {
      if (!notif.sent) {
        // In production: route to NotificationGateway
        await this.repo.markNotificationSent(notif.notificationId);
        sent++;
      }
    }

    if (sent > 0) {
      this.logger.info('Calendar notifications processed', { sent });
    }
    return sent;
  }

  // ── PRIVATE ──

  private buildDefaultPhases(fiscalYear: string): CalendarPhaseEntry[] {
    const year = parseInt(fiscalYear);
    const prevYear = year - 1;

    return [
      this.createPhase('preparation', `Budget Preparation ${fiscalYear}`,
        'Departments prepare budget proposals',
        `${prevYear}-09-01`, `${prevYear}-10-15`,
        'Finance Manager', ['budget_header', 'budget_lines']),
      this.createPhase('submission', `Budget Submission ${fiscalYear}`,
        'Submit consolidated budget for review',
        `${prevYear}-10-16`, `${prevYear}-10-31`,
        'Country Director', ['budget_lines']),
      this.createPhase('review', `Budget Review ${fiscalYear}`,
        'Finance and leadership review submissions',
        `${prevYear}-11-01`, `${prevYear}-11-30`,
        'CFO', ['budget_header', 'budget_lines']),
      this.createPhase('approval', `Budget Approval ${fiscalYear}`,
        'Final approval of organization budget',
        `${prevYear}-12-01`, `${prevYear}-12-15`,
        'Executive Director', ['budget_header', 'budget_lines', 'allocations']),
      this.createPhase('execution', `Budget Execution ${fiscalYear}`,
        'Budget is active and being executed',
        `${year}-01-01`, `${year}-12-31`,
        'All Finance Roles', []),
      this.createPhase('mid_year_review', `Mid-Year Review ${fiscalYear}`,
        'Mid-year budget performance review',
        `${year}-06-01`, `${year}-06-30`,
        'Finance Manager', []),
      this.createPhase('year_end_close', `Year-End Close ${fiscalYear}`,
        'Final period closing and reconciliation',
        `${year + 1}-01-01`, `${year + 1}-01-31`,
        'Controller', ['budget_header', 'budget_lines', 'allocations', 'commitments']),
    ];
  }

  private createPhase(
    phase: CalendarPhase,
    name: string,
    description: string,
    startDate: string,
    endDate: string,
    responsibleRole: string,
    lockedEntities: LockBehavior['lockedEntities'],
  ): CalendarPhaseEntry {
    return {
      phaseId: uuidv4(),
      phase,
      name,
      description,
      startDate,
      endDate,
      status: 'upcoming',
      responsibleRole,
      lockBehavior: {
        allowedRoles: [responsibleRole, 'CFO', 'Admin'],
        lockedEntities,
        overrideRole: 'Admin',
        autoLockOnClose: true,
      },
      notifications: [
        {
          notificationId: uuidv4(),
          trigger: 'phase_start',
          recipientRoles: [responsibleRole],
          messageKey: `calendar.notification.${phase}_start`,
          channel: ['email', 'in_app'],
          sent: false,
        },
        {
          notificationId: uuidv4(),
          trigger: 'deadline_approaching',
          daysBefore: 5,
          recipientRoles: [responsibleRole],
          messageKey: `calendar.notification.${phase}_deadline`,
          channel: ['email', 'in_app'],
          sent: false,
        },
      ],
      donorDeadlines: [],
    };
  }

  private buildCustomPhases(custom: Partial<CalendarPhaseEntry>[]): CalendarPhaseEntry[] {
    return custom.map(c => ({
      phaseId: c.phaseId || uuidv4(),
      phase: c.phase || 'preparation',
      name: c.name || 'Custom Phase',
      description: c.description || '',
      startDate: c.startDate || new Date().toISOString().split('T')[0],
      endDate: c.endDate || new Date().toISOString().split('T')[0],
      status: 'upcoming' as CalendarPhaseStatus,
      responsibleRole: c.responsibleRole || 'Finance Manager',
      lockBehavior: c.lockBehavior || {
        allowedRoles: ['Finance Manager', 'Admin'],
        lockedEntities: [],
        overrideRole: 'Admin',
        autoLockOnClose: true,
      },
      notifications: c.notifications || [],
      donorDeadlines: c.donorDeadlines || [],
    }));
  }

  private calculatePhaseProgress(phase: CalendarPhaseEntry): number {
    const start = new Date(phase.startDate).getTime();
    const end = new Date(phase.endDate).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }
}
