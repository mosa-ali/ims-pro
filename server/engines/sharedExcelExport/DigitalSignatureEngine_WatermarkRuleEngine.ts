/**
 * DigitalSignatureEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Digital Signature Support
 *
 * ENTERPRISE REPORTING & DOCUMENT GENERATION PLATFORM
 * Enhancement #1
 *
 * Signs PDF reports and tracks signing metadata:
 *  - PKCS#12 certificate support
 *  - X.509 certificate support
 *  - Organization-level certificates
 *  - Signing status in export history
 *  - Certificate metadata (no private key exposure)
 *
 * Use cases:
 *  - Audited financial statements
 *  - Donor submissions
 *  - Procurement reports
 *  - Board approvals
 *
 * Integration: Called by MultiFormatExportEngine after PDF generation.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type CertificateType = 'pkcs12' | 'x509';
export type SigningStatus = 'unsigned' | 'pending' | 'signed' | 'failed' | 'revoked';

export interface SigningCertificate {
  certificateId: string;
  organizationId: number;
  name: string;
  certificateType: CertificateType;
  issuer: string;
  subject: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  thumbprint: string;
  /** Certificate stored in secure vault — never in this record */
  vaultReference: string;
  isActive: boolean;
  createdAt: string;
  createdBy: number;
}

export interface SigningRequest {
  exportId: string;
  certificateId: string;
  fileBuffer: Buffer;
  fileName: string;
  reason: string;
  location?: string;
  contactInfo?: string;
  signedBy: number;
}

export interface SigningResult {
  signatureId: string;
  exportId: string;
  status: SigningStatus;
  certificateId: string;
  certificateSubject: string;
  certificateIssuer: string;
  signedAt?: string;
  signedBy: number;
  signatureHash?: string;
  signedFileBuffer?: Buffer;
  error?: string;
}

export interface SigningRecord {
  signatureId: string;
  exportId: string;
  status: SigningStatus;
  certificateId: string;
  certificateSubject: string;
  certificateIssuer: string;
  certificateThumbprint: string;
  signedAt: string;
  signedBy: number;
  signatureHash: string;
  reason: string;
  organizationId: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface ISignatureRepository {
  getCertificate(certificateId: string, scope: RepositoryScope): Promise<SigningCertificate | null>;
  listCertificates(scope: RepositoryScope): Promise<SigningCertificate[]>;
  saveSigningRecord(record: SigningRecord): Promise<void>;
  getSigningRecord(exportId: string): Promise<SigningRecord | null>;
}

export interface ICertificateVault {
  /** Load certificate from secure storage for signing */
  loadCertificate(vaultReference: string): Promise<{ cert: Buffer; key: Buffer }>;
}

export interface IPDFSigner {
  /** Sign a PDF buffer and return the signed buffer */
  sign(pdfBuffer: Buffer, cert: Buffer, key: Buffer, options: {
    reason: string;
    location?: string;
    contactInfo?: string;
  }): Promise<Buffer>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class DigitalSignatureEngine {
  private repo: ISignatureRepository;
  private vault: ICertificateVault;
  private pdfSigner: IPDFSigner;
  private logger: ILogger;

  constructor(deps: {
    signatureRepo: ISignatureRepository;
    vault: ICertificateVault;
    pdfSigner: IPDFSigner;
    logger: ILogger;
  }) {
    this.repo = deps.signatureRepo;
    this.vault = deps.vault;
    this.pdfSigner = deps.pdfSigner;
    this.logger = deps.logger.child({ service: 'DigitalSignatureEngine' });
  }

  /**
   * Sign a PDF report.
   */
  async signPDF(request: SigningRequest, scope: RepositoryScope): Promise<SigningResult> {
    const certificate = await this.repo.getCertificate(request.certificateId, scope);
    if (!certificate) throw new Error(`Certificate ${request.certificateId} not found`);
    if (!certificate.isActive) throw new Error('Certificate is inactive');

    // Check validity
    const now = new Date();
    if (now < new Date(certificate.validFrom) || now > new Date(certificate.validTo)) {
      throw new Error(`Certificate expired or not yet valid (${certificate.validFrom} - ${certificate.validTo})`);
    }

    const signatureId = uuidv4();

    try {
      // Load certificate from vault
      const { cert, key } = await this.vault.loadCertificate(certificate.vaultReference);

      // Sign PDF
      const signedBuffer = await this.pdfSigner.sign(request.fileBuffer, cert, key, {
        reason: request.reason,
        location: request.location,
        contactInfo: request.contactInfo,
      });

      const signatureHash = require('crypto').createHash('sha256').update(signedBuffer).digest('hex');

      // Record signing
      await this.repo.saveSigningRecord({
        signatureId,
        exportId: request.exportId,
        status: 'signed',
        certificateId: certificate.certificateId,
        certificateSubject: certificate.subject,
        certificateIssuer: certificate.issuer,
        certificateThumbprint: certificate.thumbprint,
        signedAt: new Date().toISOString(),
        signedBy: request.signedBy,
        signatureHash,
        reason: request.reason,
        organizationId: scope.organizationId,
      });

      this.logger.info('PDF signed successfully', {
        signatureId,
        exportId: request.exportId,
        certificateSubject: certificate.subject,
      });

      return {
        signatureId,
        exportId: request.exportId,
        status: 'signed',
        certificateId: certificate.certificateId,
        certificateSubject: certificate.subject,
        certificateIssuer: certificate.issuer,
        signedAt: new Date().toISOString(),
        signedBy: request.signedBy,
        signatureHash,
        signedFileBuffer: signedBuffer,
      };

    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error('PDF signing failed', { signatureId, exportId: request.exportId, error });

      return {
        signatureId,
        exportId: request.exportId,
        status: 'failed',
        certificateId: certificate.certificateId,
        certificateSubject: certificate.subject,
        certificateIssuer: certificate.issuer,
        signedBy: request.signedBy,
        error,
      };
    }
  }

  /**
   * Get signing status for an export.
   */
  async getSigningStatus(exportId: string): Promise<SigningRecord | null> {
    return this.repo.getSigningRecord(exportId);
  }
}


// ════════════════════════════════════════════════════════════════════════════
// WatermarkRuleEngine.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * WatermarkRuleEngine
 *
 * Enhancement #4
 *
 * Auto-applies watermarks based on configurable rules:
 *   Draft | Internal | Confidential | Restricted | Submitted | Approved | Final
 *
 * Rules configurable by: report status, template, donor, document type,
 * confidentiality level, approval status.
 *
 * Applied to: PDF, Excel, Word, PowerPoint.
 */

export type WatermarkText = 'DRAFT' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'SUBMITTED' | 'APPROVED' | 'FINAL' | string;

export interface WatermarkRule {
  ruleId: string;
  name: string;
  priority: number;
  conditions: {
    reportStatus?: string[];
    confidentialityLevel?: string[];
    donorId?: number;
    templateId?: string;
    documentType?: string[];
    approvalStatus?: string[];
  };
  watermarkText: WatermarkText;
  watermarkTextAR?: string;
  watermarkTextIT?: string;
  style: {
    fontSize: number;
    opacity: number;         // 0-1
    rotation: number;        // degrees
    color: string;           // hex
    position: 'center' | 'diagonal' | 'top' | 'bottom';
  };
  isActive: boolean;
  organizationId: number;
}

export interface WatermarkResolution {
  watermarkText: string;
  watermarkTextLocalized: string;
  style: WatermarkRule['style'];
  ruleId: string;
  ruleName: string;
}

export interface IWatermarkRuleRepository {
  listActive(scope: RepositoryScope): Promise<WatermarkRule[]>;
  save(rule: WatermarkRule): Promise<void>;
}

export class WatermarkRuleEngine {
  private repo: IWatermarkRuleRepository;
  private logger: ILogger;

  constructor(repo: IWatermarkRuleRepository, logger: ILogger) {
    this.repo = repo;
    this.logger = logger.child({ service: 'WatermarkRuleEngine' });
  }

  /**
   * Resolve which watermark to apply based on context.
   */
  async resolve(
    context: {
      reportStatus?: string;
      confidentialityLevel?: string;
      donorId?: number;
      templateId?: string;
      documentType?: string;
      approvalStatus?: string;
      locale: 'en' | 'ar' | 'it';
    },
    scope: RepositoryScope,
  ): Promise<WatermarkResolution | null> {
    const rules = await this.repo.listActive(scope);
    const sorted = rules.sort((a, b) => a.priority - b.priority);

    for (const rule of sorted) {
      if (this.matchesRule(rule, context)) {
        const localized = context.locale === 'ar' ? (rule.watermarkTextAR || rule.watermarkText)
          : context.locale === 'it' ? (rule.watermarkTextIT || rule.watermarkText)
          : rule.watermarkText;

        this.logger.info('Watermark resolved', {
          ruleId: rule.ruleId,
          watermark: rule.watermarkText,
        });

        return {
          watermarkText: rule.watermarkText,
          watermarkTextLocalized: localized,
          style: rule.style,
          ruleId: rule.ruleId,
          ruleName: rule.name,
        };
      }
    }

    return null;
  }

  private matchesRule(rule: WatermarkRule, ctx: Record<string, unknown>): boolean {
    const c = rule.conditions;
    if (c.reportStatus?.length && !c.reportStatus.includes(ctx.reportStatus as string)) return false;
    if (c.confidentialityLevel?.length && !c.confidentialityLevel.includes(ctx.confidentialityLevel as string)) return false;
    if (c.donorId && c.donorId !== ctx.donorId) return false;
    if (c.templateId && c.templateId !== ctx.templateId) return false;
    if (c.documentType?.length && !c.documentType.includes(ctx.documentType as string)) return false;
    if (c.approvalStatus?.length && !c.approvalStatus.includes(ctx.approvalStatus as string)) return false;
    return true;
  }
}
