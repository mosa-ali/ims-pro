/**
 * Finance Expenditure Procedures
 * Handles CRUD operations for non-procurement expenses (utilities, petty cash, reimbursements, etc.)
 * Part of Phase 1: Payment Table Consolidation & financeExpenditures Creation
 */

import { z } from 'zod';
import { eq, and, desc, gte, lte, like } from 'drizzle-orm';
import { db } from './db';
import { financeExpenditures, financeExpenditureCategories } from '../drizzle/schema';
import { protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';

// Validation schemas
const createExpenditureSchema = z.object({
  expenditureNumber: z.string().min(1),
  expenditureDate: z.string().date(),
  payeeType: z.enum(['employee', 'vendor', 'other']),
  payeeName: z.string().min(1),
  payeeNameAr: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currencyId: z.number().optional(),
  categoryId: z.number().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  referenceNumber: z.string().optional(),
  projectId: z.number().optional(),
  budgetLineId: z.number().optional(),
  receiptUrl: z.string().optional(),
});

const updateExpenditureSchema = createExpenditureSchema.partial();

const approveExpenditureSchema = z.object({
  expenditureId: z.number(),
  approvalStatus: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
  rejectionReasonAr: z.string().optional(),
});

const listExpendituresSchema = z.object({
  status: z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'paid', 'cancelled']).optional(),
  categoryId: z.number().optional(),
  payeeType: z.enum(['employee', 'vendor', 'other']).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  minAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  searchTerm: z.string().optional(),
  limit: z.number().default(50),
  offset: z.number().default(0),
});

// Procedures
export const expenditureProcedures = {
  /**
   * Create a new expenditure record
   * Status: draft (requires approval)
   */
  createExpenditure: protectedProcedure
    .input(createExpenditureSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check for duplicate expenditure number
        const existing = await db
          .select()
          .from(financeExpenditures)
          .where(
            and(
              eq(financeExpenditures.organizationId, ctx.organizationId),
              eq(financeExpenditures.expenditureNumber, input.expenditureNumber)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Expenditure number ${input.expenditureNumber} already exists`,
          });
        }

        const result = await db.insert(financeExpenditures).values({
          organizationId: ctx.organizationId,
          operatingUnitId: ctx.operatingUnitId,
          expenditureNumber: input.expenditureNumber,
          expenditureDate: input.expenditureDate,
          payeeType: input.payeeType,
          payeeName: input.payeeName,
          payeeNameAr: input.payeeNameAr,
          amount: input.amount,
          currencyId: input.currencyId,
          categoryId: input.categoryId,
          description: input.description,
          descriptionAr: input.descriptionAr,
          referenceNumber: input.referenceNumber,
          projectId: input.projectId,
          budgetLineId: input.budgetLineId,
          receiptUrl: input.receiptUrl,
          status: 'draft',
          approvalStatus: 'pending',
          createdBy: ctx.user.id,
        });

        return {
          id: result.insertId,
          expenditureNumber: input.expenditureNumber,
          status: 'draft',
          message: 'Expenditure created successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create expenditure',
        });
      }
    }),

  /**
   * Update an expenditure record (draft only)
   */
  updateExpenditure: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updateExpenditureSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify expenditure exists and belongs to organization
        const expenditure = await db
          .select()
          .from(financeExpenditures)
          .where(
            and(
              eq(financeExpenditures.id, input.id),
              eq(financeExpenditures.organizationId, ctx.organizationId)
            )
          )
          .limit(1);

        if (expenditure.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Expenditure not found',
          });
        }

        // Only allow updates if status is draft
        if (expenditure[0].status !== 'draft') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Can only update expenditures in draft status',
          });
        }

        await db
          .update(financeExpenditures)
          .set({
            ...input.data,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(financeExpenditures.id, input.id));

        return {
          id: input.id,
          message: 'Expenditure updated successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update expenditure',
        });
      }
    }),

  /**
   * Get expenditure details
   */
  getExpenditure: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const expenditure = await db
        .select()
        .from(financeExpenditures)
        .where(
          and(
            eq(financeExpenditures.id, input.id),
            eq(financeExpenditures.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (expenditure.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Expenditure not found',
        });
      }

      return expenditure[0];
    }),

  /**
   * List expenditures with filtering
   */
  listExpenditures: protectedProcedure
    .input(listExpendituresSchema)
    .query(async ({ ctx, input }) => {
      let query = db
        .select()
        .from(financeExpenditures)
        .where(
          and(
            eq(financeExpenditures.organizationId, ctx.organizationId),
            eq(financeExpenditures.deletedAt, null)
          )
        );

      // Apply filters
      if (input.status) {
        query = query.where(eq(financeExpenditures.status, input.status));
      }

      if (input.categoryId) {
        query = query.where(eq(financeExpenditures.categoryId, input.categoryId));
      }

      if (input.payeeType) {
        query = query.where(eq(financeExpenditures.payeeType, input.payeeType));
      }

      if (input.startDate) {
        query = query.where(gte(financeExpenditures.expenditureDate, input.startDate));
      }

      if (input.endDate) {
        query = query.where(lte(financeExpenditures.expenditureDate, input.endDate));
      }

      if (input.minAmount) {
        query = query.where(gte(financeExpenditures.amount, input.minAmount));
      }

      if (input.maxAmount) {
        query = query.where(lte(financeExpenditures.amount, input.maxAmount));
      }

      if (input.searchTerm) {
        query = query.where(
          like(financeExpenditures.payeeName, `%${input.searchTerm}%`)
        );
      }

      // Get total count
      const countResult = await query;
      const total = countResult.length;

      // Apply pagination
      const expenditures = await query
        .orderBy(desc(financeExpenditures.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        data: expenditures,
        total,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Approve or reject expenditure
   */
  approveExpenditure: protectedProcedure
    .input(approveExpenditureSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify expenditure exists
        const expenditure = await db
          .select()
          .from(financeExpenditures)
          .where(
            and(
              eq(financeExpenditures.id, input.expenditureId),
              eq(financeExpenditures.organizationId, ctx.organizationId)
            )
          )
          .limit(1);

        if (expenditure.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Expenditure not found',
          });
        }

        // Only allow approval if status is pending_approval
        if (expenditure[0].status !== 'pending_approval') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Can only approve expenditures in pending_approval status',
          });
        }

        const updateData =
          input.approvalStatus === 'approved'
            ? {
                status: 'approved',
                approvalStatus: 'approved',
                approvedBy: ctx.user.id,
                approvedAt: new Date(),
              }
            : {
                status: 'rejected',
                approvalStatus: 'rejected',
                rejectionReason: input.rejectionReason,
                rejectionReasonAr: input.rejectionReasonAr,
              };

        await db
          .update(financeExpenditures)
          .set({
            ...updateData,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(financeExpenditures.id, input.expenditureId));

        return {
          id: input.expenditureId,
          status: updateData.status,
          message: `Expenditure ${input.approvalStatus} successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve expenditure',
        });
      }
    }),

  /**
   * Delete expenditure (soft delete)
   */
  deleteExpenditure: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const expenditure = await db
          .select()
          .from(financeExpenditures)
          .where(
            and(
              eq(financeExpenditures.id, input.id),
              eq(financeExpenditures.organizationId, ctx.organizationId)
            )
          )
          .limit(1);

        if (expenditure.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Expenditure not found',
          });
        }

        // Only allow deletion if status is draft
        if (expenditure[0].status !== 'draft') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Can only delete expenditures in draft status',
          });
        }

        await db
          .update(financeExpenditures)
          .set({
            deletedAt: new Date(),
            deletedBy: ctx.user.id,
          })
          .where(eq(financeExpenditures.id, input.id));

        return {
          id: input.id,
          message: 'Expenditure deleted successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete expenditure',
        });
      }
    }),

  /**
   * Get expenditure categories
   */
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const categories = await db
      .select()
      .from(financeExpenditureCategories)
      .where(
        and(
          eq(financeExpenditureCategories.organizationId, ctx.organizationId),
          eq(financeExpenditureCategories.isActive, true)
        )
      )
      .orderBy(financeExpenditureCategories.categoryName);

    return categories;
  }),

  /**
   * Create expenditure category
   */
  createCategory: protectedProcedure
    .input(
      z.object({
        categoryName: z.string().min(1),
        categoryNameAr: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        glAccountId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await db.insert(financeExpenditureCategories).values({
          organizationId: ctx.organizationId,
          categoryName: input.categoryName,
          categoryNameAr: input.categoryNameAr,
          description: input.description,
          descriptionAr: input.descriptionAr,
          glAccountId: input.glAccountId,
          isActive: true,
        });

        return {
          id: result.insertId,
          categoryName: input.categoryName,
          message: 'Category created successfully',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create category',
        });
      }
    }),
};
