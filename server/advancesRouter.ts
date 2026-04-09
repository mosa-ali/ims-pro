import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { financeAdvances, financeSettlements } from "../drizzle/schema";
import { eq, and, desc, sql, gte, lte, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Advances & Settlements Router
 * Provides CRUD operations for staff advance requests and liquidation tracking
 * Implements SOFT DELETE only - NO HARD DELETE ALLOWED
 */
export const advancesRouter = router({
  // Create revision (versioning)
  createRevision: scopedProcedure
    .input(z.object({
      id: z.number(),
      revisionReason: z.string(),
      changes: z.object({
        advanceAmount: z.string().optional(),
        purpose: z.string().optional(),
        requestDate: z.string().optional(),
        status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_SETTLED', 'FULLY_SETTLED', 'CANCELLED']).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get current advance
      const current = await db.select().from(financeAdvances).where(
        and(
          eq(financeAdvances.id, input.id),
          eq(financeAdvances.organizationId, organizationId)
        )
      ).limit(1);
      if (current.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Advance not found" });
      }
      
      // Mark current version as not latest
      await db.update(financeAdvances).set({ isLatestVersion: false }).where(eq(financeAdvances.id, input.id));
      
      // Create new version
      const newVersion = {
        ...current[0],
        ...input.changes,
        id: undefined,
        version: (current[0].version || 1) + 1,
        parentId: current[0].parentId || input.id,
        revisionReason: input.revisionReason,
        isLatestVersion: true,
        createdBy: ctx.user?.id,
      };
      
      const result = await db.insert(financeAdvances).values(newVersion);
      return { id: result[0].insertId, version: newVersion.version };
    }),
  
  // Get version history
  getVersionHistory: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get the advance to find its parentId
      const current = await db.select().from(financeAdvances).where(
        and(
          eq(financeAdvances.id, input.id),
          eq(financeAdvances.organizationId, organizationId)
        )
      ).limit(1);
      if (current.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Advance not found" });
      }
      
      const rootId = current[0].parentId || input.id;
      
      // Get all versions
      const versions = await db.select().from(financeAdvances)
        .where(
          and(
            sql`(id = ${rootId} OR parent_id = ${rootId})`,
            eq(financeAdvances.organizationId, organizationId),
            eq(financeAdvances.isDeleted, false)
          )
        )
        .orderBy(desc(financeAdvances.version));
      
      return versions;
    }),

  // ============================================================================
  // ADVANCES OPERATIONS
  // ============================================================================

  // Get all advances for an organization (excludes soft-deleted)
  list: scopedProcedure
    .input(z.object({
      status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_SETTLED', 'FULLY_SETTLED', 'CANCELLED']).optional(),
      advanceType: z.enum(['TRAVEL', 'PROJECT', 'OPERATIONAL', 'SALARY', 'OTHER']).optional(),
      employeeName: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let query = db.select().from(financeAdvances).where(
        and(
          eq(financeAdvances.organizationId, organizationId),
          eq(financeAdvances.isDeleted, false)
        )
      );
      
      const results = await query.orderBy(desc(financeAdvances.requestDate));
      
      // Apply filters in memory (for complex filters)
      let filtered = results;
      
      if (input.status) {
        filtered = filtered.filter((a: any) => a.status === input.status);
      }
      
      if (input.advanceType) {
        filtered = filtered.filter((a: any) => a.advanceType === input.advanceType);
      }
      
      if (input.employeeName) {
        const searchTerm = input.employeeName.toLowerCase();
        filtered = filtered.filter((a: any) => 
          a.employeeName?.toLowerCase().includes(searchTerm) ||
          a.employeeNameAr?.toLowerCase().includes(searchTerm)
        );
      }
      
      if (input.dateFrom) {
        const fromDate = new Date(input.dateFrom);
        filtered = filtered.filter((a: any) => new Date(a.requestDate) >= fromDate);
      }
      
      if (input.dateTo) {
        const toDate = new Date(input.dateTo);
        filtered = filtered.filter((a: any) => new Date(a.requestDate) <= toDate);
      }
      
      return filtered;
    }),

  // Get single advance by ID with settlements
  getById: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const advance = await db.select().from(financeAdvances).where(
        and(
          eq(financeAdvances.id, input.id),
          eq(financeAdvances.organizationId, organizationId),
          eq(financeAdvances.isDeleted, false)
        )
      );
      
      if (!advance[0]) return null;
      
      // Get related settlements
      const settlements = await db.select().from(financeSettlements).where(
        and(
          eq(financeSettlements.advanceId, input.id),
          eq(financeSettlements.isDeleted, false)
        )
      ).orderBy(desc(financeSettlements.settlementDate));
      
      return { ...advance[0], settlements };
    }),

  // Get statistics for dashboard
  getStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const all = await db.select().from(financeAdvances).where(
        and(
          eq(financeAdvances.organizationId, organizationId),
          eq(financeAdvances.isDeleted, false)
        )
      );
      
      const pending = all.filter((a: any) => a.status === 'PENDING');
      const approved = all.filter((a: any) => a.status === 'APPROVED');
      const partiallySettled = all.filter((a: any) => a.status === 'PARTIALLY_SETTLED');
      const fullySettled = all.filter((a: any) => a.status === 'FULLY_SETTLED');
      
      const totalRequested = all.reduce((sum: number, a: any) => sum + parseFloat(a.requestedAmount || 0), 0);
      const totalApproved = all.reduce((sum: number, a: any) => sum + parseFloat(a.approvedAmount || 0), 0);
      const totalSettled = all.reduce((sum: number, a: any) => sum + parseFloat(a.settledAmount || 0), 0);
      const totalOutstanding = all.reduce((sum: number, a: any) => sum + parseFloat(a.outstandingBalance || 0), 0);
      
      return { 
        total: all.length,
        pending: pending.length,
        approved: approved.length,
        partiallySettled: partiallySettled.length,
        fullySettled: fullySettled.length,
        totalRequested,
        totalApproved,
        totalSettled,
        totalOutstanding,
      };
    }),

  // Generate next advance number
  getNextNumber: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const year = new Date().getFullYear();
      const prefix = `ADV-${year}-`;
      
      const existing = await db.select().from(financeAdvances).where(
        and(
          eq(financeAdvances.organizationId, organizationId),
          like(financeAdvances.advanceNumber, `${prefix}%`)
        )
      );
      
      const maxNum = existing.reduce((max: number, a: any) => {
        const num = parseInt(a.advanceNumber.replace(prefix, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      
      return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
    }),

  // Create new advance request
  create: scopedProcedure
    .input(z.object({
      advanceNumber: z.string().min(1, "Advance number is required"),
      employeeId: z.number().optional(),
      employeeName: z.string().min(1, "Employee name is required"),
      employeeNameAr: z.string().optional(),
      department: z.string().optional(),
      advanceType: z.enum(['TRAVEL', 'PROJECT', 'OPERATIONAL', 'SALARY', 'OTHER']),
      purpose: z.string().min(1, "Purpose is required"),
      purposeAr: z.string().optional(),
      requestedAmount: z.number().positive("Amount must be positive"),
      currency: z.string().default("USD"),
      requestDate: z.string(),
      expectedSettlementDate: z.string().optional(),
      projectId: z.number().optional(),
      accountCode: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check for duplicate advance number
      const existing = await db.select().from(financeAdvances).where(
        and(
          eq(financeAdvances.organizationId, organizationId),
          eq(financeAdvances.advanceNumber, input.advanceNumber)
        )
      );
      
      if (existing.length > 0) {
        throw new Error(`Advance number ${input.advanceNumber} already exists`);
      }
      
      const result = await db.insert(financeAdvances).values({
        organizationId,
        advanceNumber: input.advanceNumber,
        employeeId: input.employeeId || null,
        employeeName: input.employeeName,
        employeeNameAr: input.employeeNameAr || null,
        department: input.department || null,
        advanceType: input.advanceType,
        purpose: input.purpose,
        purposeAr: input.purposeAr || null,
        requestedAmount: String(input.requestedAmount),
        currency: input.currency,
        requestDate: new Date(input.requestDate),
        expectedSettlementDate: input.expectedSettlementDate ? new Date(input.expectedSettlementDate) : null,
        projectId: input.projectId || null,
        accountCode: input.accountCode || null,
        notes: input.notes || null,
        status: 'DRAFT',
        outstandingBalance: String(input.requestedAmount),
        createdBy: ctx.user?.id || null,
      });
      
      return { success: true, insertId: result[0].insertId };
    }),

  // Update existing advance
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      employeeName: z.string().optional(),
      employeeNameAr: z.string().optional(),
      department: z.string().optional(),
      advanceType: z.enum(['TRAVEL', 'PROJECT', 'OPERATIONAL', 'SALARY', 'OTHER']).optional(),
      purpose: z.string().optional(),
      purposeAr: z.string().optional(),
      requestedAmount: z.number().optional(),
      currency: z.string().optional(),
      requestDate: z.string().optional(),
      expectedSettlementDate: z.string().optional(),
      projectId: z.number().optional(),
      accountCode: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, requestDate, expectedSettlementDate, requestedAmount, ...rest } = input;
      
      const updateData: any = { ...rest, updatedBy: ctx.user?.id || null };
      
      if (requestDate) updateData.requestDate = new Date(requestDate);
      if (expectedSettlementDate) updateData.expectedSettlementDate = new Date(expectedSettlementDate);
      if (requestedAmount !== undefined) {
        updateData.requestedAmount = String(requestedAmount);
        // Update outstanding balance if not yet approved
        const current = await db.select().from(financeAdvances).where(
          and(
            eq(financeAdvances.id, id),
            eq(financeAdvances.organizationId, organizationId)
          )
        );
        if (current[0] && current[0].status === 'DRAFT') {
          updateData.outstandingBalance = String(requestedAmount);
        }
      }
      
      await db.update(financeAdvances)
        .set(updateData)
        .where(and(
          eq(financeAdvances.id, id),
          eq(financeAdvances.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Submit advance for approval
  submit: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeAdvances)
        .set({
          status: 'PENDING',
          updatedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(financeAdvances.id, input.id),
          eq(financeAdvances.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Approve advance
  approve: scopedProcedure
    .input(z.object({
      id: z.number(),
      approvedAmount: z.number().positive("Approved amount must be positive"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { generatePDFEvidence } = await import('./evidenceGeneration');
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get advance details
      const [advance] = await db.select().from(financeAdvances)
        .where(and(
          eq(financeAdvances.id, input.id),
          eq(financeAdvances.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!advance) {
        throw new Error('Advance not found');
      }
      
      // Update advance status
      const approvedAt = new Date();
      await db.update(financeAdvances)
        .set({
          status: 'APPROVED',
          approvedAmount: String(input.approvedAmount),
          outstandingBalance: String(input.approvedAmount),
          approvedBy: ctx.user?.id || null,
          approvedAt,
          updatedBy: ctx.user?.id || null,
        })
        .where(eq(financeAdvances.id, input.id));
      
      // Generate automated journal entry
      try {
        const { generateAdvanceJournalEntry } = await import('./services/autoJournalEntryService');
        const advanceWithAmount = { ...advance, advanceAmount: String(input.approvedAmount) };
        const journalEntryId = await generateAdvanceJournalEntry(advanceWithAmount, ctx.user?.id || 'system');
        
        // Link journal entry to advance
        await db.update(financeAdvances)
          .set({ journalEntryId })
          .where(eq(financeAdvances.id, input.id));
      } catch (error) {
        // Log error but don't fail the approval
        console.error('Failed to generate journal entry for advance:', error);
      }
      
      // Generate evidence document
      try {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Advance Approval</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #16a34a; }
              .header { background-color: #f0fdf4; padding: 15px; margin-bottom: 20px; border: 2px solid #16a34a; }
              .approval-badge { background-color: #16a34a; color: white; padding: 5px 10px; border-radius: 4px; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #666; }
              .value { color: #333; }
              .amount { font-size: 24px; font-weight: bold; color: #16a34a; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Advance Approval <span class="approval-badge">APPROVED</span></h1>
              <p><strong>Advance ID:</strong> ${input.id}</p>
              <p><strong>Approved:</strong> ${approvedAt.toLocaleString()}</p>
              <p><strong>Approved By:</strong> User ${ctx.user?.id || 'Unknown'}</p>
            </div>
            <div class="field">
              <div class="label">Approved Amount:</div>
              <div class="amount">$${input.approvedAmount.toFixed(2)}</div>
            </div>
            <div class="field">
              <div class="label">Employee:</div>
              <div class="value">${advance.employeeName || advance.employeeId || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Purpose:</div>
              <div class="value">${advance.purpose || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Requested Amount:</div>
              <div class="value">$${advance.requestedAmount || '0.00'}</div>
            </div>
          </body>
          </html>
        `;
        
        await generatePDFEvidence({
          module: 'finance',
          screen: 'advances',
          triggerEvent: 'approve',
          entityType: 'Advance',
          entityId: String(input.id),
          htmlContent,
          variables: { advanceId: String(input.id), entityId: String(input.id) },
          context: {
            organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
            userId: ctx.user?.id || 0,
          },
        });
      } catch (error) {
        console.error('Failed to generate advance approval evidence:', error);
      }
      
      return { success: true };
    }),

  // Reject advance
  reject: scopedProcedure
    .input(z.object({
      id: z.number(),
      rejectionReason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeAdvances)
        .set({
          status: 'REJECTED',
          rejectionReason: input.rejectionReason,
          updatedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(financeAdvances.id, input.id),
          eq(financeAdvances.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Cancel advance
  cancel: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeAdvances)
        .set({
          status: 'CANCELLED',
          updatedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(financeAdvances.id, input.id),
          eq(financeAdvances.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // SOFT DELETE - NO HARD DELETE ALLOWED
  delete: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeAdvances)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(financeAdvances.id, input.id),
          eq(financeAdvances.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Bulk import from Excel
  bulkImport: scopedProcedure
    .input(z.object({
      advances: z.array(z.object({
        advanceNumber: z.string(),
        employeeName: z.string(),
        employeeNameAr: z.string().optional(),
        department: z.string().optional(),
        advanceType: z.enum(['TRAVEL', 'PROJECT', 'OPERATIONAL', 'SALARY', 'OTHER']),
        purpose: z.string(),
        purposeAr: z.string().optional(),
        requestedAmount: z.number(),
        currency: z.string().optional(),
        requestDate: z.string(),
        expectedSettlementDate: z.string().optional(),
        status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_SETTLED', 'FULLY_SETTLED', 'CANCELLED']).optional(),
      })),
      allowDuplicates: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; field: string; message: string; suggestedFix: string }>,
      };
      
      for (let i = 0; i < input.advances.length; i++) {
        const advance = input.advances[i];
        const rowNum = i + 2;
        
        try {
          if (!advance.advanceNumber) {
            results.errors.push({
              row: rowNum,
              field: 'advanceNumber',
              message: 'Advance number is required',
              suggestedFix: 'Provide a unique advance number (e.g., ADV-2026-0001)',
            });
            results.skipped++;
            continue;
          }
          
          if (!advance.employeeName) {
            results.errors.push({
              row: rowNum,
              field: 'employeeName',
              message: 'Employee name is required',
              suggestedFix: 'Provide the employee name',
            });
            results.skipped++;
            continue;
          }
          
          if (!input.allowDuplicates) {
            const existing = await db.select().from(financeAdvances).where(
              and(
                eq(financeAdvances.organizationId, organizationId),
                eq(financeAdvances.advanceNumber, advance.advanceNumber)
              )
            );
            
            if (existing.length > 0) {
              results.errors.push({
                row: rowNum,
                field: 'advanceNumber',
                message: `Advance number ${advance.advanceNumber} already exists`,
                suggestedFix: 'Use a different advance number or enable "Allow duplicates"',
              });
              results.skipped++;
              continue;
            }
          }
          
          await db.insert(financeAdvances).values({
            organizationId,
            advanceNumber: advance.advanceNumber,
            employeeName: advance.employeeName,
            employeeNameAr: advance.employeeNameAr || null,
            department: advance.department || null,
            advanceType: advance.advanceType,
            purpose: advance.purpose,
            purposeAr: advance.purposeAr || null,
            requestedAmount: String(advance.requestedAmount),
            currency: advance.currency || 'USD',
            requestDate: new Date(advance.requestDate),
            expectedSettlementDate: advance.expectedSettlementDate ? new Date(advance.expectedSettlementDate) : null,
            status: advance.status || 'DRAFT',
            outstandingBalance: String(advance.requestedAmount),
            createdBy: ctx.user?.id || null,
          });
          
          results.imported++;
        } catch (error: any) {
          results.errors.push({
            row: rowNum,
            field: 'unknown',
            message: error.message || 'Unknown error',
            suggestedFix: 'Check the data format and try again',
          });
          results.skipped++;
        }
      }
      
      return results;
    }),

  // ============================================================================
  // SETTLEMENTS OPERATIONS
  // ============================================================================

  // Get settlements for an advance
  getSettlements: scopedProcedure
    .input(z.object({
      advanceId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return await db.select().from(financeSettlements).where(
        and(
          eq(financeSettlements.advanceId, input.advanceId),
          eq(financeSettlements.organizationId, organizationId),
          eq(financeSettlements.isDeleted, false)
        )
      ).orderBy(desc(financeSettlements.settlementDate));
    }),

  // Get next settlement number
  getNextSettlementNumber: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const year = new Date().getFullYear();
      const prefix = `SET-${year}-`;
      
      const existing = await db.select().from(financeSettlements).where(
        and(
          eq(financeSettlements.organizationId, organizationId),
          like(financeSettlements.settlementNumber, `${prefix}%`)
        )
      );
      
      const maxNum = existing.reduce((max: number, s: any) => {
        const num = parseInt(s.settlementNumber.replace(prefix, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      
      return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
    }),

  // Create settlement (liquidation)
  createSettlement: scopedProcedure
    .input(z.object({
      advanceId: z.number(),
      settlementNumber: z.string().min(1, "Settlement number is required"),
      settlementDate: z.string(),
      settledAmount: z.number().positive("Amount must be positive"),
      currency: z.string().default("USD"),
      receiptNumber: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      expenseCategory: z.string().optional(),
      accountCode: z.string().optional(),
      refundAmount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get the advance
      const advance = await db.select().from(financeAdvances).where(
        and(
          eq(financeAdvances.id, input.advanceId),
          eq(financeAdvances.organizationId, organizationId)
        )
      );
      
      if (!advance[0]) {
        throw new Error("Advance not found");
      }
      
      // Create settlement
      const result = await db.insert(financeSettlements).values({
        organizationId,
        advanceId: input.advanceId,
        settlementNumber: input.settlementNumber,
        settlementDate: new Date(input.settlementDate),
        settledAmount: String(input.settledAmount),
        currency: input.currency,
        receiptNumber: input.receiptNumber || null,
        description: input.description || null,
        descriptionAr: input.descriptionAr || null,
        expenseCategory: input.expenseCategory || null,
        accountCode: input.accountCode || null,
        refundAmount: input.refundAmount ? String(input.refundAmount) : "0",
        status: 'PENDING',
        createdBy: ctx.user?.id || null,
      });
      
      // Update advance totals
      const currentSettled = parseFloat(advance[0].settledAmount || "0");
      const newSettled = currentSettled + input.settledAmount;
      const approvedAmount = parseFloat(advance[0].approvedAmount || advance[0].requestedAmount || "0");
      const newOutstanding = approvedAmount - newSettled;
      
      let newStatus = advance[0].status;
      if (newOutstanding <= 0) {
        newStatus = 'FULLY_SETTLED';
      } else if (newSettled > 0) {
        newStatus = 'PARTIALLY_SETTLED';
      }
      
      await db.update(financeAdvances)
        .set({
          settledAmount: String(newSettled),
          outstandingBalance: String(Math.max(0, newOutstanding)),
          status: newStatus,
          actualSettlementDate: newStatus === 'FULLY_SETTLED' ? new Date() : null,
          updatedBy: ctx.user?.id || null,
        })
        .where(eq(financeAdvances.id, input.advanceId));
      
      return { success: true, insertId: result[0].insertId };
    }),

  // Approve settlement
  approveSettlement: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeSettlements)
        .set({
          status: 'APPROVED',
          approvedBy: ctx.user?.id || null,
          approvedAt: new Date(),
          updatedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(financeSettlements.id, input.id),
          eq(financeSettlements.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Reject settlement
  rejectSettlement: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get settlement to reverse the advance totals
      const settlement = await db.select().from(financeSettlements).where(
        and(
          eq(financeSettlements.id, input.id),
          eq(financeSettlements.organizationId, organizationId)
        )
      );
      
      if (settlement[0]) {
        const advance = await db.select().from(financeAdvances).where(
          eq(financeAdvances.id, settlement[0].advanceId)
        );
        
        if (advance[0]) {
          const currentSettled = parseFloat(advance[0].settledAmount || "0");
          const settlementAmount = parseFloat(settlement[0].settledAmount || "0");
          const newSettled = Math.max(0, currentSettled - settlementAmount);
          const approvedAmount = parseFloat(advance[0].approvedAmount || advance[0].requestedAmount || "0");
          const newOutstanding = approvedAmount - newSettled;
          
          let newStatus = 'APPROVED';
          if (newSettled > 0) {
            newStatus = 'PARTIALLY_SETTLED';
          }
          
          await db.update(financeAdvances)
            .set({
              settledAmount: String(newSettled),
              outstandingBalance: String(newOutstanding),
              status: newStatus,
              actualSettlementDate: null,
              updatedBy: ctx.user?.id || null,
            })
            .where(eq(financeAdvances.id, settlement[0].advanceId));
        }
      }
      
      await db.update(financeSettlements)
        .set({
          status: 'REJECTED',
          updatedBy: ctx.user?.id || null,
        })
        .where(eq(financeSettlements.id, input.id));
      
      return { success: true };
    }),

  // Delete settlement (soft delete)
  deleteSettlement: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get settlement to reverse the advance totals
      const settlement = await db.select().from(financeSettlements).where(
        and(
          eq(financeSettlements.id, input.id),
          eq(financeSettlements.organizationId, organizationId)
        )
      );
      
      if (settlement[0] && settlement[0].status === 'APPROVED') {
        const advance = await db.select().from(financeAdvances).where(
          eq(financeAdvances.id, settlement[0].advanceId)
        );
        
        if (advance[0]) {
          const currentSettled = parseFloat(advance[0].settledAmount || "0");
          const settlementAmount = parseFloat(settlement[0].settledAmount || "0");
          const newSettled = Math.max(0, currentSettled - settlementAmount);
          const approvedAmount = parseFloat(advance[0].approvedAmount || advance[0].requestedAmount || "0");
          const newOutstanding = approvedAmount - newSettled;
          
          let newStatus = 'APPROVED';
          if (newSettled > 0) {
            newStatus = 'PARTIALLY_SETTLED';
          }
          
          await db.update(financeAdvances)
            .set({
              settledAmount: String(newSettled),
              outstandingBalance: String(newOutstanding),
              status: newStatus,
              actualSettlementDate: null,
              updatedBy: ctx.user?.id || null,
            })
            .where(eq(financeAdvances.id, settlement[0].advanceId));
        }
      }
      
      await db.update(financeSettlements)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(eq(financeSettlements.id, input.id));
      
      return { success: true };
    }),
});
