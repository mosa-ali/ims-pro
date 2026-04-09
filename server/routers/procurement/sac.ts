import { z } from 'zod';
import { protectedProcedure, scopedProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import {
  serviceAcceptanceCertificates,
  glPostingEvents,
  contracts,
  contractMilestones,
  purchaseRequests,
  organizations,
  organizationBranding,
  operatingUnits,
  users,
  vendors,
} from '../../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { canCreateSAC } from './type2Guards';
import { storagePut } from '../../storage';
import { createPayableFromSAC } from '../../automation/sacToPayableAutomation';
import crypto from 'crypto';

/**
 * Service Acceptance Certificate (SAC) Management Router
 * Full form support: create, edit, view, submit, approve/sign, PDF export
 */

const DeliverableStatusItem = z.object({
  milestoneId: z.number().int(),
  title: z.string(),
  status: z.enum(['completed', 'achieved', 'received', 'pending', 'in_progress', 'partial_completed']),
  notes: z.string().optional(),
  completionPercent: z.number().min(0).max(100).optional(),
  remainingWork: z.string().optional(),
});

const SACCreateInput = z.object({
  contractId: z.number().int().positive(),
  milestoneId: z.number().int().positive().optional(),
  deliverables: z.string().min(1),
  approvedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  currency: z.string().default('USD'),
  acceptanceDate: z.coerce.date(),
  // New form fields
  acceptanceText: z.string().optional(),
  verifiedBoqs: z.boolean().optional(),
  verifiedContractTerms: z.boolean().optional(),
  verifiedDeliverablesReceived: z.boolean().optional(),
  preparedByName: z.string().optional(),
  preparedByRole: z.string().optional(),
  deliverableStatuses: z.array(DeliverableStatusItem).optional(),
});

const SACUpdateInput = z.object({
  id: z.number().int().positive(),
  deliverables: z.string().optional(),
  approvedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  acceptanceDate: z.coerce.date().optional(),
  // New form fields
  acceptanceText: z.string().optional(),
  verifiedBoqs: z.boolean().optional(),
  verifiedContractTerms: z.boolean().optional(),
  verifiedDeliverablesReceived: z.boolean().optional(),
  preparedByName: z.string().optional(),
  preparedByRole: z.string().optional(),
  deliverableStatuses: z.array(DeliverableStatusItem).optional(),
});

const SACApprovalInput = z.object({
  id: z.number().int().positive(),
  approve: z.boolean(),
  rejectionReason: z.string().optional(),
  // Digital signature (base64 PNG data URL)
  signatureDataUrl: z.string().optional(),
});

export const sacRouter = router({
  /**
   * Check if SAC can be created for a contract
   */
  canCreate: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const result = await canCreateSAC(input.contractId, ctx.scope.organizationId);
      return result;
    }),

  /**
   * Get contract deliverables (milestones) for SAC form
   */
  getContractDeliverables: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const milestones = await db.query.contractMilestones.findMany({
        where: and(
          eq(contractMilestones.contractId, input.contractId),
          eq(contractMilestones.isDeleted, 0)
        ),
        orderBy: contractMilestones.orderIndex,
      });

      return milestones.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        amount: m.amount,
        currency: m.currency,
        dueDate: m.dueDate,
        status: m.status,
      }));
    }),

  /**
   * Get contract + PR header info for SAC form
   */
  getContractHeader: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const orgId = ctx.scope.organizationId;

      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, input.contractId),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }

      // Get vendor info from vendors table
      let vendorName = '';
      let vendorCode = '';
      if (contract.vendorId) {
        const vendor = await db.query.vendors.findFirst({
          where: eq(vendors.id, contract.vendorId),
        });
        if (vendor) {
          vendorName = vendor.name || '';
          vendorCode = vendor.vendorCode || '';
        }
      }

      // Get PR info including budget line data
      let prNumber = '';
      let projectTitle = '';
      let donorName = '';
      let budgetTitle = '';
      let budgetCode = '';
      let subBudgetLine = '';
      let totalBudgetLine = '';
      let prCurrency = '';
      if (contract.purchaseRequestId) {
        const pr = await db.query.purchaseRequests.findFirst({
          where: eq(purchaseRequests.id, contract.purchaseRequestId),
        });
        if (pr) {
          prNumber = pr.prNumber || '';
          projectTitle = pr.projectTitle || '';
          donorName = pr.donorName || '';
          budgetTitle = pr.budgetTitle || '';
          budgetCode = pr.budgetCode || '';
          subBudgetLine = pr.subBudgetLine || '';
          // When PR currency differs from exchangeTo (e.g. EUR -> USD), use converted total
          if (pr.currency && pr.exchangeTo && pr.currency !== pr.exchangeTo) {
            totalBudgetLine = pr.total || pr.totalBudgetLine || '0';
            prCurrency = pr.exchangeTo || 'USD';
          } else {
            totalBudgetLine = pr.totalBudgetLine || '0';
            prCurrency = pr.currency || 'USD';
          }
        }
      }

      // Get SAC totals for this contract
      const sacResult = await db
        .select({
          totalApproved: sql<string>`COALESCE(SUM(CASE WHEN ${serviceAcceptanceCertificates.status} = 'approved' THEN ${serviceAcceptanceCertificates.approvedAmount} ELSE 0 END), 0)`,
          totalAllocated: sql<string>`COALESCE(SUM(${serviceAcceptanceCertificates.approvedAmount}), 0)`,
        })
        .from(serviceAcceptanceCertificates)
        .where(
          and(
            eq(serviceAcceptanceCertificates.contractId, input.contractId),
            sql`${serviceAcceptanceCertificates.isDeleted} = 0`
          )
        );

      const contractValue = parseFloat(contract.contractValue || '0');
      const totalApproved = parseFloat(sacResult[0]?.totalApproved || '0');

      return {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        vendorName,
        vendorCode,
        contractValue: contract.contractValue,
        currency: contract.currency,
        startDate: contract.startDate,
        endDate: contract.endDate,
        prNumber,
        projectTitle,
        donorName,
        budgetTitle,
        budgetCode,
        subBudgetLine,
        totalBudgetLine,
        prCurrency,
        totalApprovedSAC: totalApproved,
        remainingCapacity: contractValue - totalApproved,
      };
    }),

  /**
   * Create a new Service Acceptance Certificate
   */
  create: scopedProcedure
    .input(SACCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const orgId = ctx.scope.organizationId;
        const ouId = ctx.scope.operatingUnitId;

        // Guard: check contract is approved/active + category-specific rules
        const guard = await canCreateSAC(input.contractId, orgId);
        if (!guard.allowed) {
          const errorMessage = guard.data?.message || guard.reason || 'Cannot create SAC';
          throw new TRPCError({ code: 'BAD_REQUEST', message: errorMessage });
        }

        // Validate amount doesn't exceed contract value
        const contractValue = parseFloat(guard.data?.contractValue || '0');
        const requestedAmount = parseFloat(input.approvedAmount);

        // Get existing SAC total for this contract
        const existingSACResult = await db
          .select({
            total: sql<string>`COALESCE(SUM(${serviceAcceptanceCertificates.approvedAmount}), 0)`,
          })
          .from(serviceAcceptanceCertificates)
          .where(
            and(
              eq(serviceAcceptanceCertificates.contractId, input.contractId),
              sql`${serviceAcceptanceCertificates.isDeleted} = 0`
            )
          );

        const existingTotal = parseFloat(existingSACResult[0]?.total || '0');
        if (existingTotal + requestedAmount > contractValue) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `SAC amount (${requestedAmount}) would exceed contract value (${contractValue}). Already allocated: ${existingTotal.toFixed(2)}. Remaining: ${(contractValue - existingTotal).toFixed(2)}`,
          });
        }

        // Generate SAC number
        const sacNumber = `SAC-${orgId}-${Date.now()}`;

        // Auto-detect acceptanceType from PR category
        let acceptanceType: 'SERVICE' | 'WORKS' = 'SERVICE';
        if (guard.data?.purchaseRequestId) {
          const prResult = await db.query.purchaseRequests.findFirst({
            where: eq(purchaseRequests.id, guard.data.purchaseRequestId),
            columns: { category: true },
          });
          if (prResult?.category?.toLowerCase() === 'works') {
            acceptanceType = 'WORKS';
          }
        }

        // Create SAC
        const [sac] = await db
          .insert(serviceAcceptanceCertificates)
          .values({
            organizationId: orgId,
            operatingUnitId: ouId || null,
            contractId: input.contractId,
            sacNumber,
            milestoneId: input.milestoneId || null,
            deliverables: input.deliverables,
            acceptanceText: input.acceptanceText || null,
            verifiedBoqs: input.verifiedBoqs ? 1 : 0,
            verifiedContractTerms: input.verifiedContractTerms ? 1 : 0,
            verifiedDeliverablesReceived: input.verifiedDeliverablesReceived ? 1 : 0,
            preparedByName: input.preparedByName || null,
            preparedByRole: input.preparedByRole || null,
            deliverableStatuses: input.deliverableStatuses ? JSON.stringify(input.deliverableStatuses) : null,
            approvedAmount: input.approvedAmount,
            currency: input.currency,
            acceptanceDate: input.acceptanceDate.toISOString(),
            acceptanceType,
            acceptedBy: ctx.user.id,
            status: 'draft',
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .$returningId();

        return { id: sac.id, sacNumber };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[SAC] Create error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create SAC',
        });
      }
    }),

  /**
   * Get SAC by ID (with contract + milestone details)
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const sac = await db.query.serviceAcceptanceCertificates.findFirst({
        where: and(
          eq(serviceAcceptanceCertificates.id, input.id),
          eq(serviceAcceptanceCertificates.organizationId, orgId),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        ),
      });

      if (!sac) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'SAC not found' });
      }

      // Get signer info if signed
      let signerName: string | null = null;
      if (sac.signedBy) {
        const signer = await db.query.users.findFirst({
          where: eq(users.id, sac.signedBy),
        });
        signerName = signer?.name || null;
      }

      // Get creator info
      let creatorName: string | null = null;
      if (sac.createdBy) {
        const creator = await db.query.users.findFirst({
          where: eq(users.id, sac.createdBy),
        });
        creatorName = creator?.name || null;
      }

      return {
        ...sac,
        deliverableStatuses: sac.deliverableStatuses
          ? (typeof sac.deliverableStatuses === 'string'
            ? JSON.parse(sac.deliverableStatuses)
            : sac.deliverableStatuses)
          : [],
        signerName,
        creatorName,
      };
    }),

  /**
   * List SACs for a contract
   */
  listByContract: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const sacList = await db.query.serviceAcceptanceCertificates.findMany({
        where: and(
          eq(serviceAcceptanceCertificates.organizationId, orgId),
          eq(serviceAcceptanceCertificates.contractId, input.contractId),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        ),
        orderBy: desc(serviceAcceptanceCertificates.createdAt),
      });

      return sacList;
    }),

  /**
   * List SACs for a purchase request (via contract)
   */
  listByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.purchaseRequestId, input.purchaseRequestId),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) return [];

      const sacList = await db.query.serviceAcceptanceCertificates.findMany({
        where: and(
          eq(serviceAcceptanceCertificates.organizationId, orgId),
          eq(serviceAcceptanceCertificates.contractId, contract.id),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        ),
        orderBy: desc(serviceAcceptanceCertificates.createdAt),
      });

      return sacList;
    }),

  /**
   * Update SAC details (Draft only)
   */
  update: scopedProcedure
    .input(SACUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const sac = await db.query.serviceAcceptanceCertificates.findFirst({
        where: and(
          eq(serviceAcceptanceCertificates.id, input.id),
          eq(serviceAcceptanceCertificates.organizationId, orgId),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        ),
      });

      if (!sac) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'SAC not found' });
      }

      if (sac.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft SACs can be edited',
        });
      }

      // If updating amount, validate against contract value
      if (input.approvedAmount) {
        const contract = await db.query.contracts.findFirst({
          where: eq(contracts.id, sac.contractId),
        });
        if (contract) {
          const contractValue = parseFloat(contract.contractValue || '0');
          const newAmount = parseFloat(input.approvedAmount);

          const existingSACResult = await db
            .select({
              total: sql<string>`COALESCE(SUM(${serviceAcceptanceCertificates.approvedAmount}), 0)`,
            })
            .from(serviceAcceptanceCertificates)
            .where(
              and(
                eq(serviceAcceptanceCertificates.contractId, sac.contractId),
                sql`${serviceAcceptanceCertificates.id} != ${input.id}`,
                sql`${serviceAcceptanceCertificates.isDeleted} = 0`
              )
            );

          const otherTotal = parseFloat(existingSACResult[0]?.total || '0');
          if (otherTotal + newAmount > contractValue) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Updated amount would exceed contract value. Remaining: ${(contractValue - otherTotal).toFixed(2)}`,
            });
          }
        }
      }

      const updateData: Record<string, any> = {
        updatedBy: ctx.user.id,
      };

      if (input.deliverables !== undefined) updateData.deliverables = input.deliverables;
      if (input.approvedAmount !== undefined) updateData.approvedAmount = input.approvedAmount;
      if (input.acceptanceDate !== undefined) updateData.acceptanceDate = input.acceptanceDate.toISOString();
      if (input.acceptanceText !== undefined) updateData.acceptanceText = input.acceptanceText;
      if (input.verifiedBoqs !== undefined) updateData.verifiedBoqs = input.verifiedBoqs ? 1 : 0;
      if (input.verifiedContractTerms !== undefined) updateData.verifiedContractTerms = input.verifiedContractTerms ? 1 : 0;
      if (input.verifiedDeliverablesReceived !== undefined) updateData.verifiedDeliverablesReceived = input.verifiedDeliverablesReceived ? 1 : 0;
      if (input.preparedByName !== undefined) updateData.preparedByName = input.preparedByName;
      if (input.preparedByRole !== undefined) updateData.preparedByRole = input.preparedByRole;
      if (input.deliverableStatuses !== undefined) updateData.deliverableStatuses = JSON.stringify(input.deliverableStatuses);

      await db
        .update(serviceAcceptanceCertificates)
        .set(updateData)
        .where(eq(serviceAcceptanceCertificates.id, input.id));

      return { success: true };
    }),

  /**
   * Submit SAC for approval (validates required fields)
   */
  submitForApproval: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const sac = await db.query.serviceAcceptanceCertificates.findFirst({
        where: and(
          eq(serviceAcceptanceCertificates.id, input.id),
          eq(serviceAcceptanceCertificates.organizationId, orgId),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        ),
      });

      if (!sac) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'SAC not found' });
      }

      if (sac.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft SACs can be submitted for approval',
        });
      }

      // Validate required fields for submission
      if (!sac.acceptanceText || sac.acceptanceText.trim().length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'ACCEPTANCE_TEXT_REQUIRED',
        });
      }

      if (!sac.approvedAmount || parseFloat(sac.approvedAmount) <= 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'APPROVED_AMOUNT_REQUIRED',
        });
      }

      // Check at least one deliverable is marked as completed/achieved/received
      let delivStatuses: any[] = [];
      if (sac.deliverableStatuses) {
        delivStatuses = typeof sac.deliverableStatuses === 'string'
          ? JSON.parse(sac.deliverableStatuses)
          : sac.deliverableStatuses;
      }
      const hasCompletedDeliverable = delivStatuses.some(
        (d: any) => ['completed', 'achieved', 'received'].includes(d.status)
      );
      if (!hasCompletedDeliverable) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'AT_LEAST_ONE_DELIVERABLE_COMPLETED',
        });
      }

      await db
        .update(serviceAcceptanceCertificates)
        .set({
          status: 'pending_approval',
          submittedAt: new Date().toISOString(),
          submittedBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .where(eq(serviceAcceptanceCertificates.id, input.id));

      return { success: true };
    }),

  /**
   * Approve SAC with digital signature
   */
  approve: scopedProcedure
    .input(SACApprovalInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;
      const ouId = ctx.scope.operatingUnitId;

      const sac = await db.query.serviceAcceptanceCertificates.findFirst({
        where: and(
          eq(serviceAcceptanceCertificates.id, input.id),
          eq(serviceAcceptanceCertificates.organizationId, orgId),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        ),
      });

      if (!sac) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'SAC not found' });
      }

      if (sac.status !== 'pending_approval') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only submitted SACs can be approved',
        });
      }

      if (input.approve) {
        // Require signature for approval
        if (!input.signatureDataUrl) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'SIGNATURE_REQUIRED',
          });
        }

        // Process signature: extract base64 data, compute hash, upload to S3
        const base64Match = input.signatureDataUrl.match(/^data:image\/png;base64,(.+)$/);
        if (!base64Match) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid signature format',
          });
        }

        const signatureBuffer = Buffer.from(base64Match[1], 'base64');
        const signatureHash = crypto.createHash('sha256').update(signatureBuffer).digest('hex');

        // Upload signature to S3
        const sigKey = `sac-signatures/${orgId}/${sac.id}-${Date.now()}.png`;
        const { url: signatureImageUrl } = await storagePut(sigKey, signatureBuffer, 'image/png');

        const now = new Date().toISOString();
        // Generate verification code for QR
        const verificationCode = `SAC-${sac.sacNumber}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

        await db
          .update(serviceAcceptanceCertificates)
          .set({
            status: 'approved',
            approvedBy: ctx.user.id,
            approvedAt: now,
            signatureImageUrl,
            signatureHash,
            signedAt: now,
            signedBy: ctx.user.id,
            verificationCode,
            updatedBy: ctx.user.id,
          })
          .where(eq(serviceAcceptanceCertificates.id, input.id));

        // Create GL posting event
        const contract = await db.query.contracts.findFirst({
          where: eq(contracts.id, sac.contractId),
        });

        if (contract) {
          await db.insert(glPostingEvents).values({
            organizationId: orgId,
            operatingUnitId: ouId || null,
            purchaseRequestId: contract.purchaseRequestId,
            entityType: 'sac',
            entityId: sac.id,
            eventType: 'approval',
            glAccount: '3000',
            amount: sac.approvedAmount || '0',
            currency: sac.currency || contract.currency,
            fiscalPeriod: new Date().toISOString().split('T')[0],
            postingStatus: 'pending',
            description: `SAC ${sac.sacNumber} approved - Amount: ${sac.approvedAmount} ${sac.currency}`,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
            isDeleted: 0,
          });
        }

        // 🔄 CRITICAL FINANCIAL AUTOMATION: Create Payable from approved SAC
        // Mirrors the GRN→Payable pattern for Goods/Works
        // One SAC = One Payable (for milestone-based payments)
        let payableCreated = false;
        try {
          const payable = await createPayableFromSAC(db, input.id, {
            scope: { organizationId: orgId, operatingUnitId: ouId || 0 },
            user: { id: ctx.user.id },
          });
          payableCreated = !!payable;
        } catch (payableError) {
          // Log but don't fail the approval - payable can be created manually
          console.error(`[SAC→Payable] Failed to auto-create payable for SAC ${input.id}:`, payableError);
        }

        return { success: true, status: 'approved' as const, signatureHash, verificationCode, payableCreated };
      } else {
        // Reject
        await db
          .update(serviceAcceptanceCertificates)
          .set({
            status: 'rejected',
            rejectionReason: input.rejectionReason || null,
            updatedBy: ctx.user.id,
          })
          .where(eq(serviceAcceptanceCertificates.id, input.id));

        return { success: true, status: 'rejected' as const };
      }
    }),

  /**
   * Verify SAC signature (public endpoint for QR code verification)
   */
  verify: scopedProcedure
    .input(z.object({
      sacId: z.number().int().positive(),
      signatureHash: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const sac = await db.query.serviceAcceptanceCertificates.findFirst({
        where: and(
          eq(serviceAcceptanceCertificates.id, input.sacId),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        ),
      });

      if (!sac) {
        return { valid: false, reason: 'SAC not found' };
      }

      // Get contract info
      const contract = await db.query.contracts.findFirst({
        where: eq(contracts.id, sac.contractId),
      });

      // Get vendor info from vendors table
      let vendorName = '';
      if (contract?.vendorId) {
        const vendor = await db.query.vendors.findFirst({
          where: eq(vendors.id, contract.vendorId),
        });
        vendorName = vendor?.name || '';
      }

      // Get signer info
      let signerName: string | null = null;
      if (sac.signedBy) {
        const signer = await db.query.users.findFirst({
          where: eq(users.id, sac.signedBy),
        });
        signerName = signer?.name || null;
      }

      const isValid = sac.status === 'approved' &&
        sac.signatureHash != null &&
        (!input.signatureHash || sac.signatureHash === input.signatureHash);

      return {
        valid: isValid,
        sacNumber: sac.sacNumber,
        contractNumber: contract?.contractNumber || '',
        vendorName,
        amount: sac.approvedAmount,
        currency: sac.currency,
        signedBy: signerName,
        signedAt: sac.signedAt,
        status: sac.status,
      };
    }),

  /**
   * Get SAC summary for a contract (totals)
   */
  summary: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, input.contractId),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }

      const sacResult = await db
        .select({
          totalCount: sql<number>`COUNT(*)`,
          approvedCount: sql<number>`SUM(CASE WHEN ${serviceAcceptanceCertificates.status} = 'approved' THEN 1 ELSE 0 END)`,
          totalApproved: sql<string>`COALESCE(SUM(CASE WHEN ${serviceAcceptanceCertificates.status} = 'approved' THEN ${serviceAcceptanceCertificates.approvedAmount} ELSE 0 END), 0)`,
          totalAllocated: sql<string>`COALESCE(SUM(${serviceAcceptanceCertificates.approvedAmount}), 0)`,
        })
        .from(serviceAcceptanceCertificates)
        .where(
          and(
            eq(serviceAcceptanceCertificates.contractId, input.contractId),
            sql`${serviceAcceptanceCertificates.isDeleted} = 0`
          )
        );

      // Fetch all SACs to calculate effective amounts considering partial completion
      const allSacs = await db
        .select({
          id: serviceAcceptanceCertificates.id,
          approvedAmount: serviceAcceptanceCertificates.approvedAmount,
          status: serviceAcceptanceCertificates.status,
          deliverableStatuses: serviceAcceptanceCertificates.deliverableStatuses,
        })
        .from(serviceAcceptanceCertificates)
        .where(
          and(
            eq(serviceAcceptanceCertificates.contractId, input.contractId),
            sql`${serviceAcceptanceCertificates.isDeleted} = 0`
          )
        );

      // Calculate effective amounts: if any deliverable is partial_completed,
      // use the average completion percentage to scale the approved amount
      let effectiveApproved = 0;
      let effectiveAllocated = 0;
      for (const sac of allSacs) {
        const amount = parseFloat(String(sac.approvedAmount || '0'));
        let completionFactor = 1; // default: 100% completion
        if (sac.deliverableStatuses) {
          const statuses: any[] = typeof sac.deliverableStatuses === 'string'
            ? JSON.parse(sac.deliverableStatuses)
            : (sac.deliverableStatuses as any[]);
          if (statuses && statuses.length > 0) {
            // Calculate weighted completion: average of all deliverable completion percentages
            let totalPercent = 0;
            let count = 0;
            for (const ds of statuses) {
              if (ds.status === 'partial_completed' && typeof ds.completionPercent === 'number') {
                totalPercent += ds.completionPercent;
                count++;
              } else if (ds.status === 'completed' || ds.status === 'achieved' || ds.status === 'received') {
                totalPercent += 100;
                count++;
              } else if (ds.status === 'pending' || ds.status === 'in_progress') {
                totalPercent += 0;
                count++;
              }
            }
            if (count > 0) {
              completionFactor = totalPercent / (count * 100);
            }
          }
        }
        const effectiveAmount = amount * completionFactor;
        effectiveAllocated += effectiveAmount;
        if (sac.status === 'approved') {
          effectiveApproved += effectiveAmount;
        }
      }

      const contractValue = parseFloat(contract.contractValue || '0');
      const totalAllocated = parseFloat(sacResult[0]?.totalAllocated || '0');
      const totalApproved = parseFloat(sacResult[0]?.totalApproved || '0');

      // Get budget line data from PR
      let budgetTitle = '';
      let budgetCode = '';
      let subBudgetLine = '';
      let totalBudgetLine = '0';
      let prCurrency = 'USD';
      if (contract.purchaseRequestId) {
        const pr = await db.query.purchaseRequests.findFirst({
          where: eq(purchaseRequests.id, contract.purchaseRequestId),
        });
        if (pr) {
          budgetTitle = pr.budgetTitle || '';
          budgetCode = pr.budgetCode || '';
          subBudgetLine = pr.subBudgetLine || '';
          // When PR currency differs from exchangeTo (e.g. EUR -> USD), use converted total
          if (pr.currency && pr.exchangeTo && pr.currency !== pr.exchangeTo) {
            totalBudgetLine = pr.total || pr.totalBudgetLine || '0';
            prCurrency = pr.exchangeTo || 'USD';
          } else {
            totalBudgetLine = pr.totalBudgetLine || '0';
            prCurrency = pr.currency || 'USD';
          }
        }
      }

      return {
        contractValue,
        currency: contract.currency,
        totalCount: Number(sacResult[0]?.totalCount || 0),
        approvedCount: Number(sacResult[0]?.approvedCount || 0),
        totalAllocated,
        totalApproved,
        // Effective amounts adjusted for partial completion percentages
        effectiveAllocated: Math.round(effectiveAllocated * 100) / 100,
        effectiveApproved: Math.round(effectiveApproved * 100) / 100,
        remainingToAllocate: contractValue - totalAllocated,
        remainingApproved: contractValue - totalApproved,
        // Effective remaining considers partial completion deductions
        effectiveRemainingAllocated: Math.round((contractValue - effectiveAllocated) * 100) / 100,
        effectiveRemainingApproved: Math.round((contractValue - effectiveApproved) * 100) / 100,
        budgetTitle,
        budgetCode,
        subBudgetLine,
        totalBudgetLine: parseFloat(totalBudgetLine),
        prCurrency,
      };
    }),

  /**
   * Get SAC data for PDF generation
   */
  getPdfData: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const sac = await db.query.serviceAcceptanceCertificates.findFirst({
        where: and(
          eq(serviceAcceptanceCertificates.id, input.id),
          eq(serviceAcceptanceCertificates.organizationId, orgId),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        ),
      });

      if (!sac) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'SAC not found' });
      }

      // Get contract
      const contract = await db.query.contracts.findFirst({
        where: eq(contracts.id, sac.contractId),
      });

      // Get PR
      let prNumber = '';
      let projectTitle = '';
      if (contract?.purchaseRequestId) {
        const pr = await db.query.purchaseRequests.findFirst({
          where: eq(purchaseRequests.id, contract.purchaseRequestId),
        });
        if (pr) {
          prNumber = pr.prNumber || '';
          projectTitle = pr.projectTitle || '';
        }
      }

      // Get org info
      const [org] = await db.select().from(organizations)
        .where(eq(organizations.id, orgId)).limit(1);

      const [branding] = await db.select().from(organizationBranding)
        .where(eq(organizationBranding.organizationId, orgId)).limit(1);

      // Get OU info
      let ouName = '';
      if (sac.operatingUnitId) {
        const [ou] = await db.select().from(operatingUnits)
          .where(eq(operatingUnits.id, sac.operatingUnitId)).limit(1);
        if (ou) ouName = ou.name || '';
      }

      // Get vendor info from vendors table
      let vendorName = '';
      if (contract?.vendorId) {
        const vendor = await db.query.vendors.findFirst({
          where: eq(vendors.id, contract.vendorId),
        });
        vendorName = vendor?.name || '';
      }

      // Get milestones
      const milestones = await db.query.contractMilestones.findMany({
        where: and(
          eq(contractMilestones.contractId, sac.contractId),
          eq(contractMilestones.isDeleted, 0)
        ),
        orderBy: contractMilestones.orderIndex,
      });

      // Get signer info
      let signerName: string | null = null;
      if (sac.signedBy) {
        const signer = await db.query.users.findFirst({
          where: eq(users.id, sac.signedBy),
        });
        signerName = signer?.name || null;
      }

      // Get creator info
      let creatorName: string | null = null;
      if (sac.createdBy) {
        const creator = await db.query.users.findFirst({
          where: eq(users.id, sac.createdBy),
        });
        creatorName = creator?.name || null;
      }

      return {
        sac: {
          ...sac,
          deliverableStatuses: sac.deliverableStatuses
            ? (typeof sac.deliverableStatuses === 'string'
              ? JSON.parse(sac.deliverableStatuses)
              : sac.deliverableStatuses)
            : [],
        },
        contract: contract ? {
          contractNumber: contract.contractNumber,
          vendorName,
          contractValue: contract.contractValue,
          currency: contract.currency,
          startDate: contract.startDate,
          endDate: contract.endDate,
        } : null,
        prNumber,
        projectTitle,
        organization: org ? { name: org.name } : null,
        branding: branding ? { logoUrl: branding.logoUrl } : null,
        operatingUnit: ouName,
        milestones: milestones.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description,
          amount: m.amount,
          dueDate: m.dueDate,
        })),
        signerName,
        creatorName,
      };
    }),

  /**
   * Sign & Complete SAC directly (no approval flow)
   * Project officer/activity supervisor creates, fills, and signs in one step.
   * Status goes from draft -> signed (complete). Logistics can then proceed to invoice.
   */
  signAndComplete: scopedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      signatureDataUrl: z.string().min(1),
      // Allow saving form data at the same time as signing
      acceptanceText: z.string().optional(),
      verifiedBoqs: z.boolean().optional(),
      verifiedContractTerms: z.boolean().optional(),
      verifiedDeliverablesReceived: z.boolean().optional(),
      preparedByName: z.string().optional(),
      preparedByRole: z.string().optional(),
      deliverableStatuses: z.array(DeliverableStatusItem).optional(),
      approvedAmount: z.string().optional(),
      acceptanceDate: z.coerce.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;
      const ouId = ctx.scope.operatingUnitId;

      const sac = await db.query.serviceAcceptanceCertificates.findFirst({
        where: and(
          eq(serviceAcceptanceCertificates.id, input.id),
          eq(serviceAcceptanceCertificates.organizationId, orgId),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        ),
      });

      if (!sac) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'SAC not found' });
      }

      if (sac.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft SACs can be signed',
        });
      }

      // Process signature: extract base64 data, compute hash, upload to S3
      const base64Match = input.signatureDataUrl.match(/^data:image\/png;base64,(.+)$/);
      if (!base64Match) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid signature format',
        });
      }

      const signatureBuffer = Buffer.from(base64Match[1], 'base64');
      const signatureHash = crypto.createHash('sha256').update(signatureBuffer).digest('hex');

      // Upload signature to S3
      const sigKey = `sac-signatures/${orgId}/${sac.id}-${Date.now()}.png`;
      const { url: signatureImageUrl } = await storagePut(sigKey, signatureBuffer, 'image/png');

      const now = new Date().toISOString();
      const verificationCode = `SAC-${sac.sacNumber}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      // Build update data - save form data + signature in one go
      const updateData: Record<string, any> = {
        status: 'approved', // 'approved' = signed/complete in new workflow
        signatureImageUrl,
        signatureHash,
        signedAt: now,
        signedBy: ctx.user.id,
        approvedBy: ctx.user.id,
        approvedAt: now,
        verificationCode,
        updatedBy: ctx.user.id,
      };

      // Also save any form data passed along
      if (input.acceptanceText !== undefined) updateData.acceptanceText = input.acceptanceText;
      if (input.verifiedBoqs !== undefined) updateData.verifiedBoqs = input.verifiedBoqs ? 1 : 0;
      if (input.verifiedContractTerms !== undefined) updateData.verifiedContractTerms = input.verifiedContractTerms ? 1 : 0;
      if (input.verifiedDeliverablesReceived !== undefined) updateData.verifiedDeliverablesReceived = input.verifiedDeliverablesReceived ? 1 : 0;
      if (input.preparedByName !== undefined) updateData.preparedByName = input.preparedByName;
      if (input.preparedByRole !== undefined) updateData.preparedByRole = input.preparedByRole;
      if (input.deliverableStatuses) updateData.deliverableStatuses = JSON.stringify(input.deliverableStatuses);
      if (input.approvedAmount !== undefined) updateData.approvedAmount = input.approvedAmount;
      if (input.acceptanceDate !== undefined) updateData.acceptanceDate = input.acceptanceDate.toISOString();

      await db
        .update(serviceAcceptanceCertificates)
        .set(updateData)
        .where(eq(serviceAcceptanceCertificates.id, input.id));

      // Create GL posting event
      const contract = await db.query.contracts.findFirst({
        where: eq(contracts.id, sac.contractId),
      });

      if (contract) {
        const amount = input.approvedAmount || sac.approvedAmount || '0';
        const currency = sac.currency || contract.currency;
        await db.insert(glPostingEvents).values({
          organizationId: orgId,
          operatingUnitId: ouId || null,
          purchaseRequestId: contract.purchaseRequestId,
          entityType: 'sac',
          entityId: sac.id,
          eventType: 'approval',
          glAccount: '3000',
          amount,
          currency,
          fiscalPeriod: new Date().toISOString().split('T')[0],
          postingStatus: 'pending',
          description: `SAC ${sac.sacNumber} signed - Amount: ${amount} ${currency}`,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
          isDeleted: 0,
        });
      }

      // 🔄 CRITICAL FINANCIAL AUTOMATION: Create Payable from approved SAC
      // Mirrors the GRN→Payable pattern for Goods/Works
      let payableCreated = false;
      try {
        const payable = await createPayableFromSAC(db, input.id, {
          scope: { organizationId: orgId, operatingUnitId: ouId || 0 },
          user: { id: ctx.user.id },
        });
        payableCreated = !!payable;
      } catch (payableError) {
        // Log but don't fail the approval - payable can be created manually
        console.error(`[SAC→Payable] Failed to auto-create payable for SAC ${input.id}:`, payableError);
      }

      return { success: true, signatureHash, verificationCode, payableCreated };
    }),

  /**
   * Soft delete SAC (Draft only)
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const sac = await db.query.serviceAcceptanceCertificates.findFirst({
        where: and(
          eq(serviceAcceptanceCertificates.id, input.id),
          eq(serviceAcceptanceCertificates.organizationId, orgId),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        ),
      });

      if (!sac) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'SAC not found' });
      }

      if (sac.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft SACs can be deleted',
        });
      }

      await db
        .update(serviceAcceptanceCertificates)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user.id,
        })
        .where(eq(serviceAcceptanceCertificates.id, input.id));

      return { success: true };
    }),
});
