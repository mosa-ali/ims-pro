/**
 * EventRegistry.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Central catalog of all financial event schemas
 *
 * PHASE 3: Enterprise Event Platform
 *
 * Provides:
 *  - Schema registration for every event type
 *  - Version tracking (event schema evolution)
 *  - Deprecation management
 *  - Runtime payload validation
 *  - Discovery (list, search, filter events)
 *
 * Per event versioning requirement:
 *   Every event carries schemaVersion ("1.0.0").
 *   When a payload changes, bump the version.
 *   Old handlers still receive old-version events unchanged.
 *   New handlers can detect version and adapt.
 */

import { z, type ZodTypeAny } from 'zod';
import { FinancialEventType } from './FinancialEventTypes';

// ────────────────────────────────────────────────────────────────────────────
// SCHEMA DEFINITION
// ────────────────────────────────────────────────────────────────────────────

export interface EventSchemaDefinition {
  eventType: FinancialEventType;
  version: string;        // semver "1.0.0"
  description: string;
  domain: string;         // "gl" | "budget" | "advance" | "payment" | ...
  requiredFields: string[];
  zodSchema?: ZodTypeAny; // optional runtime validator
  deprecated: boolean;
  supersededBy?: FinancialEventType;
  changelog?: string;     // what changed in this version
  registeredAt: string;   // ISO-8601
}

// ────────────────────────────────────────────────────────────────────────────
// REGISTRY
// ────────────────────────────────────────────────────────────────────────────

export class EventRegistry {
  /** key = "eventType::version" */
  private schemas = new Map<string, EventSchemaDefinition>();
  /** eventType → latest version string */
  private latestVersions = new Map<FinancialEventType, string>();

  constructor() {
    this.seedCoreEvents();
  }

  // ── REGISTRATION ──

  register(def: EventSchemaDefinition): void {
    const key = `${def.eventType}::${def.version}`;
    this.schemas.set(key, def);

    // Track latest version
    const current = this.latestVersions.get(def.eventType);
    if (!current || this.semverGt(def.version, current)) {
      this.latestVersions.set(def.eventType, def.version);
    }
  }

  // ── LOOKUP ──

  get(eventType: FinancialEventType, version?: string): EventSchemaDefinition | null {
    const ver = version || this.latestVersions.get(eventType);
    if (!ver) return null;
    return this.schemas.get(`${eventType}::${ver}`) ?? null;
  }

  getLatestVersion(eventType: FinancialEventType): string | null {
    return this.latestVersions.get(eventType) ?? null;
  }

  getAllVersions(eventType: FinancialEventType): EventSchemaDefinition[] {
    return [...this.schemas.values()]
      .filter(s => s.eventType === eventType)
      .sort((a, b) => (this.semverGt(a.version, b.version) ? 1 : -1));
  }

  // ── DISCOVERY ──

  listAll(): EventSchemaDefinition[] {
    return [...this.schemas.values()];
  }

  listActive(): EventSchemaDefinition[] {
    const active: EventSchemaDefinition[] = [];
    for (const [type, ver] of this.latestVersions) {
      const def = this.schemas.get(`${type}::${ver}`);
      if (def && !def.deprecated) active.push(def);
    }
    return active;
  }

  listByDomain(domain: string): EventSchemaDefinition[] {
    return this.listActive().filter(s => s.domain === domain);
  }

  listDeprecated(): EventSchemaDefinition[] {
    return [...this.schemas.values()].filter(s => s.deprecated);
  }

  // ── VALIDATION ──

  /**
   * Validate a payload against the registered schema.
   * Returns { valid, errors } if a zodSchema is registered.
   */
  validate(
    eventType: FinancialEventType,
    payload: Record<string, unknown>,
    version?: string,
  ): { valid: boolean; errors?: string[] } {
    const def = this.get(eventType, version);
    if (!def) {
      return { valid: false, errors: [`No schema registered for ${eventType} v${version || 'latest'}`] };
    }

    // Check required fields
    const missing = def.requiredFields.filter(f => !(f in payload));
    if (missing.length > 0) {
      return { valid: false, errors: missing.map(f => `Missing required field: ${f}`) };
    }

    // Zod validation (if available)
    if (def.zodSchema) {
      const result = def.zodSchema.safeParse(payload);
      if (!result.success) {
        return {
          valid: false,
          errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        };
      }
    }

    return { valid: true };
  }

  // ── PRIVATE: SEED CORE EVENTS ──

  private seedCoreEvents(): void {
    const now = new Date().toISOString();

    // GL Events
    this.register({
      eventType: FinancialEventType.GL_POSTED,
      version: '1.0.0',
      description: 'Journal entry posted to GL. Immutable once posted (ADR-003).',
      domain: 'gl',
      requiredFields: ['journalEntryId', 'entryNumber', 'totalDebit', 'totalCredit', 'postedAt', 'postedBy'],
      deprecated: false,
      registeredAt: now,
    });

    this.register({
      eventType: FinancialEventType.GL_REVERSED,
      version: '1.0.0',
      description: 'Journal entry reversed. Creates a new reversing entry (never deletes original).',
      domain: 'gl',
      requiredFields: ['journalEntryId', 'reversalEntryId', 'reason', 'reversedAt', 'reversedBy'],
      deprecated: false,
      registeredAt: now,
    });

    // Budget Events
    this.register({
      eventType: FinancialEventType.BUDGET_ALLOCATED,
      version: '1.0.0',
      description: 'Monthly budget allocation recorded.',
      domain: 'budget',
      requiredFields: ['budgetId', 'allocationAmount', 'fiscalMonth', 'allocatedBy', 'allocatedAt'],
      deprecated: false,
      registeredAt: now,
    });

    this.register({
      eventType: FinancialEventType.BUDGET_EXCEEDED,
      version: '1.0.0',
      description: 'Budget actual exceeds approved amount. Triggers notifications.',
      domain: 'budget',
      requiredFields: ['budgetId', 'approvedAmount', 'actualAmount', 'excessAmount'],
      deprecated: false,
      registeredAt: now,
    });

    // Advance Events
    this.register({
      eventType: FinancialEventType.ADVANCE_ISSUED,
      version: '1.0.0',
      description: 'Staff advance disbursed.',
      domain: 'advance',
      requiredFields: ['advanceId', 'employeeId', 'issuedAmount', 'currency', 'issuedAt', 'issuedBy'],
      deprecated: false,
      registeredAt: now,
    });

    this.register({
      eventType: FinancialEventType.ADVANCE_LIQUIDATED,
      version: '1.0.0',
      description: 'Staff advance settled with receipts.',
      domain: 'advance',
      requiredFields: ['advanceId', 'settlementAmount', 'settlementDate', 'liquidatedBy'],
      deprecated: false,
      registeredAt: now,
    });

    // Payment Events
    this.register({
      eventType: FinancialEventType.PAYMENT_COMPLETED,
      version: '1.0.0',
      description: 'Payment successfully processed and confirmed by bank.',
      domain: 'payment',
      requiredFields: ['paymentId', 'paymentNumber', 'actualAmount', 'currency', 'completedAt'],
      deprecated: false,
      registeredAt: now,
    });

    this.register({
      eventType: FinancialEventType.PAYMENT_FAILED,
      version: '1.0.0',
      description: 'Payment processing failed. May trigger retry.',
      domain: 'payment',
      requiredFields: ['paymentId', 'paymentNumber', 'failureReason', 'failedAt', 'retryCount'],
      deprecated: false,
      registeredAt: now,
    });

    // Treasury Events
    this.register({
      eventType: FinancialEventType.CASH_THRESHOLD_BREACHED,
      version: '1.0.0',
      description: 'Cash balance fell below minimum threshold. Alerts treasury team.',
      domain: 'treasury',
      requiredFields: ['bankAccountId', 'currentBalance', 'minimumThreshold', 'shortfall', 'breachedAt'],
      deprecated: false,
      registeredAt: now,
    });

    // Donor Events
    this.register({
      eventType: FinancialEventType.DONOR_COMPLIANCE_VIOLATION,
      version: '1.0.0',
      description: 'Donor compliance rule violated. Requires immediate attention.',
      domain: 'donor',
      requiredFields: ['donorId', 'grantId', 'violationType', 'severity', 'description', 'detectedAt'],
      deprecated: false,
      registeredAt: now,
    });

    // Orchestration Events
    this.register({
      eventType: FinancialEventType.ORCHESTRATION_FAILED,
      version: '1.0.0',
      description: 'Multi-step saga failed. Compensation initiated.',
      domain: 'orchestration',
      requiredFields: ['orchestrationId', 'failedStep', 'failureReason', 'failedAt'],
      deprecated: false,
      registeredAt: now,
    });
  }

  // ── PRIVATE: SEMVER COMPARE ──

  private semverGt(a: string, b: string): boolean {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return true;
      if ((pa[i] || 0) < (pb[i] || 0)) return false;
    }
    return false;
  }
}
