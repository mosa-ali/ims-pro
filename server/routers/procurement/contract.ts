import { z } from 'zod';
import { scopedProcedure, router } from '../../_core/trpc';
import { storagePut } from '../../storage';
import { getDb } from '../../db';
import { contracts, contractMilestones, glPostingEvents, vendors, purchaseRequests } from '../../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { canCreateContract, getWinnerData } from './type2Guards';
import { generateContractNumber } from '../../services/procurementNumbering';

/**
 * Contract Management Router
 * Handles CRUD operations, approval workflows, and GL posting for contracts
 * Phase A: Services Flow (Contract → SAC → Invoice → Payment)
 */

const ContractCreateInput = z.object({
  purchaseRequestId: z.number().int().positive(),
  // vendorId, contractNumber, contractValue, currency are now auto-populated from winner data
  // They are optional in input - backend will resolve them from the procurement path
  vendorId: z.number().int().positive().optional(),
  contractValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().default('USD').optional(),
  paymentStructure: z.enum(['lump_sum', 'percentage_based', 'fixed_amount', 'deliverable_based']),
  retentionPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  signedFileUrl: z.string().optional(),
});

const ContractUpdateInput = z.object({
  id: z.number().int().positive(),
  contractValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  retentionPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  endDate: z.coerce.date().optional(),
  signedFileUrl: z.string().optional(),
});

const ContractApprovalInput = z.object({
  id: z.number().int().positive(),
  approve: z.boolean(),
  // Digital signature fields (required when approving)
  signatureDataUrl: z.string().optional(), // Base64 PNG of drawn signature
  signerName: z.string().optional(),
  signerTitle: z.string().optional(),
});

const MilestoneInput = z.object({
  contractId: z.number().int().positive(),
  milestones: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    currency: z.string().default('USD'),
    dueDate: z.coerce.date().optional(),
    orderIndex: z.number().int().min(0),
  })),
});

export const contractRouter = router({
  /**
   * Check if contract can be created for a PR
   */
  canCreate: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const result = await canCreateContract(input.purchaseRequestId, ctx.scope.organizationId);
      return result;
    }),

  /**
   * Get winner data for auto-populating contract fields
   * Returns vendorId, vendorName, quotedAmount, currency based on procurement path
   */
  getWinnerData: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const result = await getWinnerData(input.purchaseRequestId, ctx.scope.organizationId);
      return result;
    }),

  /**
   * Create a new contract (after CBA approval for Type 2)
   */
  create: scopedProcedure
    .input(ContractCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const orgId = ctx.scope.organizationId;
        const ouId = ctx.scope.operatingUnitId;

        // Guard: check prerequisites for this PR (CBA/QA/RFQ based on amount)
        const guard = await canCreateContract(input.purchaseRequestId, orgId);
        if (!guard.allowed) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: guard.reason || 'Cannot create contract' });
        }

        // Auto-populate vendor and value from winner data
        const winnerData = await getWinnerData(input.purchaseRequestId, orgId);
        if (!winnerData) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No winner data found for this PR' });
        }

        const resolvedVendorId = winnerData.vendorId;
        const resolvedContractValue = winnerData.quotedAmount;
        const resolvedCurrency = winnerData.currency;

        // Auto-generate contract number: CON-[OU]-[Year]-[Seq]
        if (!ouId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Operating Unit is required for contract creation' });
        }
        const contractNumber = await generateContractNumber(orgId, ouId);

        // Create contract with auto-populated fields
        const [contract] = await db
          .insert(contracts)
          .values({
            organizationId: orgId,
            operatingUnitId: ouId,
            purchaseRequestId: input.purchaseRequestId,
            vendorId: resolvedVendorId,
            contractNumber: contractNumber,
            contractValue: resolvedContractValue,
            currency: resolvedCurrency,
            paymentStructure: input.paymentStructure,
            retentionPercentage: input.retentionPercentage,
            startDate: input.startDate.toISOString().split('T')[0],
            endDate: input.endDate.toISOString().split('T')[0],
            signedFileUrl: input.signedFileUrl || null,
            status: 'draft',
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .$returningId();

        return {
          id: contract.id,
          contractNumber,
          vendorId: resolvedVendorId,
          vendorName: winnerData.vendorName,
          contractValue: resolvedContractValue,
          currency: resolvedCurrency,
          path: winnerData.path,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Contract] Create error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create contract',
        });
      }
    }),

  /**
   * Get contract by ID
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, input.id),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }

      // Fetch PR data for project, donor, budget line
      let prData: {
        projectTitle: string | null;
        donorName: string | null;
        budgetTitle: string | null;
        budgetCode: string | null;
        subBudgetLine: string | null;
        totalBudgetLine: string | null;
        prCurrency: string | null;
      } = {
        projectTitle: null,
        donorName: null,
        budgetTitle: null,
        budgetCode: null,
        subBudgetLine: null,
        totalBudgetLine: null,
        prCurrency: null,
      };

      if (contract.purchaseRequestId) {
        const pr = await db.query.purchaseRequests.findFirst({
          where: eq(purchaseRequests.id, contract.purchaseRequestId),
          columns: {
            projectTitle: true,
            donorName: true,
            budgetTitle: true,
            budgetCode: true,
            subBudgetLine: true,
            totalBudgetLine: true,
            currency: true,
            exchangeTo: true,
            total: true,
          },
        });
        if (pr) {
          // When PR currency differs from exchangeTo (e.g. EUR -> USD), use converted total
          const useConverted = pr.currency && pr.exchangeTo && pr.currency !== pr.exchangeTo;
          prData = {
            projectTitle: pr.projectTitle || null,
            donorName: pr.donorName || null,
            budgetTitle: pr.budgetTitle || null,
            budgetCode: pr.budgetCode || null,
            subBudgetLine: pr.subBudgetLine || null,
            totalBudgetLine: useConverted ? (pr.total || pr.totalBudgetLine || null) : (pr.totalBudgetLine || null),
            prCurrency: useConverted ? (pr.exchangeTo || 'USD') : (pr.currency || 'USD'),
          };
        }
      }

      return { ...contract, ...prData };
    }),

  /**
   * Get contract by purchase request ID
   * Returns contract with vendor name resolved from vendors table
   */
  getByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.organizationId, orgId),
          eq(contracts.purchaseRequestId, input.purchaseRequestId),
          sql`${contracts.isDeleted} = 0`
        ),
        orderBy: desc(contracts.createdAt),
      });

      if (!contract) return null;

      // Resolve vendor name from vendors table
      let vendorName: string | null = null;
      if (contract.vendorId) {
        const vendor = await db.query.vendors.findFirst({
          where: eq(vendors.id, contract.vendorId),
        });
        vendorName = vendor?.name || null;
      }

      // Get project, donor, budget line data from linked PR
      let projectTitle: string | null = null;
      let donorName: string | null = null;
      let budgetTitle: string | null = null;
      let budgetCode: string | null = null;
      let subBudgetLine: string | null = null;
      let totalBudgetLine: string | null = null;
      let prCurrency: string | null = null;
      if (contract.purchaseRequestId) {
        const pr = await db.query.purchaseRequests.findFirst({
          where: eq(purchaseRequests.id, contract.purchaseRequestId),
        });
        if (pr) {
          projectTitle = pr.projectTitle || null;
          donorName = pr.donorName || null;
          budgetTitle = pr.budgetTitle || null;
          budgetCode = pr.budgetCode || null;
          subBudgetLine = pr.subBudgetLine || null;
          // When PR currency is not the same as exchangeTo (e.g. EUR -> USD), use the converted total
          if (pr.currency && pr.exchangeTo && pr.currency !== pr.exchangeTo) {
            totalBudgetLine = pr.total || pr.totalBudgetLine || null;
            prCurrency = pr.exchangeTo || 'USD';
          } else {
            totalBudgetLine = pr.totalBudgetLine || null;
            prCurrency = pr.currency || 'USD';
          }
        }
      }

      return { ...contract, vendorName, projectTitle, donorName, budgetTitle, budgetCode, subBudgetLine, totalBudgetLine, prCurrency };
    }),

  /**
   * List contracts for a purchase request
   */
  listByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const contractList = await db.query.contracts.findMany({
        where: and(
          eq(contracts.organizationId, orgId),
          eq(contracts.purchaseRequestId, input.purchaseRequestId),
          sql`${contracts.isDeleted} = 0`
        ),
        orderBy: desc(contracts.createdAt),
      });

      return contractList;
    }),

  /**
   * Update contract details (before approval)
   */
  update: scopedProcedure
    .input(ContractUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, input.id),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }

      if (!['draft', 'pending_approval'].includes(contract.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot update contract in ${contract.status} status`,
        });
      }

      await db
        .update(contracts)
        .set({
          ...(input.contractValue && { contractValue: input.contractValue }),
          ...(input.retentionPercentage && { retentionPercentage: input.retentionPercentage }),
          ...(input.endDate && { endDate: input.endDate.toISOString().split('T')[0] }),
          ...(input.signedFileUrl && { signedFileUrl: input.signedFileUrl }),
          updatedBy: ctx.user.id,
        })
        .where(eq(contracts.id, input.id));

      return { success: true };
    }),

  /**
   * Add milestones to a contract
   */
  addMilestones: scopedProcedure
    .input(MilestoneInput)
    .mutation(async ({ ctx, input }) => {
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

      if (!['draft', 'pending_approval'].includes(contract.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only add milestones to draft or pending contracts',
        });
      }

      // Validate total milestone amounts don't exceed contract value
      const totalMilestoneAmount = input.milestones.reduce(
        (sum, m) => sum + parseFloat(m.amount),
        0
      );
      const contractValue = parseFloat(contract.contractValue || '0');
      if (totalMilestoneAmount > contractValue) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Total milestone amounts (${totalMilestoneAmount}) exceed contract value (${contractValue})`,
        });
      }

      // Insert milestones
      for (const milestone of input.milestones) {
        await db.insert(contractMilestones).values({
          organizationId: orgId,
          contractId: input.contractId,
          title: milestone.title,
          description: milestone.description || null,
          amount: milestone.amount,
          currency: milestone.currency,
          dueDate: milestone.dueDate 
          ? milestone.dueDate.toISOString().split('T')[0] 
          : null,
          orderIndex: milestone.orderIndex,
          status: 'pending',
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });
      }

      return { success: true, count: input.milestones.length };
    }),

  /**
   * Get milestones for a contract
   */
  getMilestones: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const milestones = await db.query.contractMilestones.findMany({
        where: and(
          eq(contractMilestones.contractId, input.contractId),
          eq(contractMilestones.organizationId, orgId),
          sql`${contractMilestones.isDeleted} = 0`
        ),
        orderBy: contractMilestones.orderIndex,
      });

      return milestones;
    }),

  /**
   * Submit contract for approval
   */
  submitForApproval: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, input.id),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }

      if (contract.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft contracts can be submitted for approval',
        });
      }

      await db
        .update(contracts)
        .set({
          status: 'pending_approval',
          updatedBy: ctx.user.id,
        })
        .where(eq(contracts.id, input.id));

      return { success: true };
    }),

  /**
   * Approve or reject contract
   */
  approve: scopedProcedure
    .input(ContractApprovalInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;
      const ouId = ctx.scope.operatingUnitId;

      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, input.id),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }

      if (!['draft', 'pending_approval'].includes(contract.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft or pending contracts can be approved',
        });
      }

      const newStatus = input.approve ? 'approved' : 'draft';

      // Handle digital signature upload when approving
      let signatureUrl: string | null = null;
      let verificationCode: string | null = null;
      if (input.approve && input.signatureDataUrl) {
        try {
          // Convert base64 data URL to buffer
          const base64Data = input.signatureDataUrl.replace(/^data:image\/png;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Generate verification code
          const timestamp = Date.now();
          verificationCode = `IMS-SIG-${contract.contractNumber}-${timestamp.toString(36).toUpperCase()}`;
          
          // Upload to S3
          const fileKey = `signatures/contract-${contract.id}-${timestamp}.png`;
          const result = await storagePut(fileKey, buffer, 'image/png');
          signatureUrl = result.url;
        } catch (err) {
          console.error('Failed to upload signature:', err);
          // Continue with approval even if signature upload fails
        }
      }

      const updateData: Record<string, any> = {
        status: newStatus,
        approvedBy: input.approve ? ctx.user.id : null,
        approvedAt: input.approve ? new Date().toISOString().split('T')[0] : null,
        updatedBy: ctx.user.id,
      };
      
      // Add signature fields if available
      if (input.approve && signatureUrl) {
        updateData.signatureImageUrl = signatureUrl;
        updateData.signatureSignerName = input.signerName || ctx.user.name || '';
        updateData.signatureSignerTitle = input.signerTitle || '';
        updateData.signatureTimestamp = new Date().toISOString().split('T')[0];
        updateData.signatureVerificationCode = verificationCode;
      }

      await db
        .update(contracts)
        .set(updateData)
        .where(eq(contracts.id, input.id));

      // If approved, create GL posting event
      if (input.approve) {
        await db.insert(glPostingEvents).values({
          organizationId: orgId,
          operatingUnitId: ouId || null,
          purchaseRequestId: contract.purchaseRequestId,
          entityType: 'contract',
          entityId: contract.id,
          eventType: 'approval',
          glAccount: '2000',
          amount: contract.contractValue,
          currency: contract.currency,
          fiscalPeriod: new Date().toISOString().split('T')[0],
          postingStatus: 'pending',
          description: `Contract ${contract.contractNumber} approved`,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
          isDeleted: 0,
        });
      }

      return { 
        success: true, 
        status: newStatus,
        signatureUrl: signatureUrl || undefined,
        verificationCode: verificationCode || undefined,
      };
    }),

  /**
   * Soft delete contract
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, input.id),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }

      if (!['draft', 'pending_approval'].includes(contract.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot delete contract in ${contract.status} status`,
        });
      }

      await db
        .update(contracts)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString().split('T')[0],
          deletedBy: ctx.user.id,
        })
        .where(eq(contracts.id, input.id));

      return { success: true };
    }),
});
