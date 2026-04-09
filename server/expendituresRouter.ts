import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";

// Expenditure schema (matching database table) - without organizationId/operatingUnitId
const expenditureSchema = z.object({
  expenditureNumber: z.string(),
  expenditureDate: z.string(), // ISO date string
  vendorId: z.number().optional(),
  vendorName: z.string(),
  vendorNameAr: z.string().optional(),
  expenditureType: z.enum(['OPERATIONAL', 'PROJECT', 'ADMINISTRATIVE', 'TRAVEL', 'PROCUREMENT', 'OTHER']),
  category: z.string().optional(),
  description: z.string(),
  descriptionAr: z.string().optional(),
  amount: z.string(), // Decimal as string
  currencyId: z.number().optional(),
  exchangeRateId: z.number().optional(),
  amountInBaseCurrency: z.string().optional(),
  projectId: z.number().optional(),
  grantId: z.number().optional(),
  budgetLineId: z.number().optional(),
  glAccountId: z.number().optional(),
  accountCode: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']).default('DRAFT'),
  attachments: z.string().optional(), // JSON array of S3 URLs
});

export const expendituresRouter = router({
  // List expenditures (latest versions only, not deleted)
  list: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = getDb();
      
      const conditions = [
        sql`organizationId = ${organizationId}`,
        sql`isLatestVersion = TRUE`,
        sql`isDeleted = FALSE`,
      ];
      
      if (operatingUnitId) {
        conditions.push(sql`operatingUnitId = ${operatingUnitId}`);
      }
      
      if (input.projectId) {
        conditions.push(sql`projectId = ${input.projectId}`);
      }
      
      if (input.status) {
        conditions.push(sql`status = ${input.status}`);
      }
      
      const result = await db.execute(
        sql`SELECT * FROM expenditures WHERE ${sql.join(conditions, sql` AND `)} ORDER BY expenditureDate DESC, id DESC`
      );
      
      return result.rows;
    }),

  // Get single expenditure by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      
      const result = await db.execute(
        sql`SELECT * FROM expenditures WHERE id = ${input.id} AND organizationId = ${organizationId} AND isDeleted = FALSE LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Expenditure not found" });
      }
      
      return result.rows[0];
    }),

  // Create new expenditure
  create: scopedProcedure
    .input(expenditureSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = getDb();
      
      const result = await db.execute(
        sql`INSERT INTO expenditures (
          organizationId, operatingUnitId, expenditureNumber, expenditureDate,
          vendorId, vendorName, vendorNameAr, expenditureType, category,
          description, descriptionAr, amount, currencyId, exchangeRateId,
          amountInBaseCurrency, projectId, grantId, budgetLineId,
          glAccountId, accountCode, status, attachments,
          version, isLatestVersion, createdBy
        ) VALUES (
          ${organizationId}, ${operatingUnitId}, ${input.expenditureNumber}, ${input.expenditureDate},
          ${input.vendorId}, ${input.vendorName}, ${input.vendorNameAr}, ${input.expenditureType}, ${input.category},
          ${input.description}, ${input.descriptionAr}, ${input.amount}, ${input.currencyId}, ${input.exchangeRateId},
          ${input.amountInBaseCurrency}, ${input.projectId}, ${input.grantId}, ${input.budgetLineId},
          ${input.glAccountId}, ${input.accountCode}, ${input.status}, ${input.attachments},
          1, TRUE, ${ctx.user.id}
        )`
      );
      
      return { id: result.insertId, ...input };
    }),

  // Update expenditure (simple update, not versioning)
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      data: expenditureSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      
      // Build SET clause dynamically
      const updates: string[] = [];
      const values: any[] = [];
      
      Object.entries(input.data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      updates.push('updatedBy = ?');
      values.push(ctx.user.id);
      values.push(input.id);
      values.push(organizationId);
      
      await db.execute(
        sql.raw(`UPDATE expenditures SET ${updates.join(', ')} WHERE id = ? AND organizationId = ? AND isDeleted = FALSE`, values)
      );
      
      return { success: true };
    }),

  // Create revision (versioning)
  createRevision: scopedProcedure
    .input(z.object({
      id: z.number(),
      revisionReason: z.string(),
      changes: expenditureSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = getDb();
      
      // Get current expenditure
      const currentResult = await db.execute(
        sql`SELECT * FROM expenditures WHERE id = ${input.id} AND organizationId = ${organizationId} AND isDeleted = FALSE LIMIT 1`
      );
      
      if (currentResult.rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Expenditure not found" });
      }
      
      const current: any = currentResult.rows[0];
      
      // Mark current version as not latest
      await db.execute(
        sql`UPDATE expenditures SET isLatestVersion = FALSE WHERE id = ${input.id}`
      );
      
      // Create new version with changes
      const newVersion = {
        ...current,
        ...input.changes,
        id: undefined, // Let DB auto-increment
        version: current.version + 1,
        parentId: current.parentId || input.id, // Reference original
        revisionReason: input.revisionReason,
        isLatestVersion: true,
        createdBy: ctx.user.id,
        createdAt: undefined, // Let DB set timestamp
        updatedAt: undefined,
      };
      
      const result = await db.execute(
        sql`INSERT INTO expenditures (
          organizationId, operatingUnitId, expenditureNumber, expenditureDate,
          vendorId, vendorName, vendorNameAr, expenditureType, category,
          description, descriptionAr, amount, currencyId, exchangeRateId,
          amountInBaseCurrency, projectId, grantId, budgetLineId,
          glAccountId, accountCode, status, attachments,
          version, parentId, revisionReason, isLatestVersion, createdBy
        ) VALUES (
          ${organizationId}, ${operatingUnitId}, ${newVersion.expenditureNumber}, ${newVersion.expenditureDate},
          ${newVersion.vendorId}, ${newVersion.vendorName}, ${newVersion.vendorNameAr}, ${newVersion.expenditureType}, ${newVersion.category},
          ${newVersion.description}, ${newVersion.descriptionAr}, ${newVersion.amount}, ${newVersion.currencyId}, ${newVersion.exchangeRateId},
          ${newVersion.amountInBaseCurrency}, ${newVersion.projectId}, ${newVersion.grantId}, ${newVersion.budgetLineId},
          ${newVersion.glAccountId}, ${newVersion.accountCode}, ${newVersion.status}, ${newVersion.attachments},
          ${newVersion.version}, ${newVersion.parentId}, ${newVersion.revisionReason}, TRUE, ${ctx.user.id}
        )`
      );
      
      return { id: result.insertId, version: newVersion.version };
    }),

  // Get version history
  getVersionHistory: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      
      // Get the expenditure to find its parentId
      const currentResult = await db.execute(
        sql`SELECT parentId FROM expenditures WHERE id = ${input.id} AND organizationId = ${organizationId} LIMIT 1`
      );
      
      if (currentResult.rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Expenditure not found" });
      }
      
      const current: any = currentResult.rows[0];
      const rootId = current.parentId || input.id;
      
      // Get all versions
      const result = await db.execute(
        sql`SELECT * FROM expenditures 
            WHERE (id = ${rootId} OR parentId = ${rootId}) AND organizationId = ${organizationId} AND isDeleted = FALSE 
            ORDER BY version DESC`
      );
      
      return result.rows;
    }),

  // Soft delete
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      
      await db.execute(
        sql`UPDATE expenditures 
            SET isDeleted = TRUE, deletedAt = NOW(), deletedBy = ${ctx.user.id} 
            WHERE id = ${input.id} AND organizationId = ${organizationId}`
      );
      
      return { success: true };
    }),

  // Submit for approval
  submit: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      
      await db.execute(
        sql`UPDATE expenditures 
            SET status = 'PENDING_APPROVAL', submittedBy = ${ctx.user.id}, submittedAt = NOW() 
            WHERE id = ${input.id} AND organizationId = ${organizationId} AND isDeleted = FALSE`
      );
      
      return { success: true };
    }),

  // Approve expenditure
  approve: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { generatePDFEvidence } = await import('./evidenceGeneration');
      const { organizationId } = ctx.scope;
      const db = getDb();
      
      // Get expenditure details
      const result = await db.execute(
        sql`SELECT * FROM expenditures WHERE id = ${input.id} AND organizationId = ${organizationId} AND isDeleted = FALSE LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Expenditure not found" });
      }
      
      const expenditure = result.rows[0];
      
      // Check if already approved
      if (expenditure.status === 'APPROVED') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Expenditure is already approved" });
      }
      
      // Update expenditure status
      await db.execute(
        sql`UPDATE expenditures 
            SET status = 'APPROVED', approvedBy = ${ctx.user.id}, approvedAt = NOW() 
            WHERE id = ${input.id} AND organizationId = ${organizationId} AND isDeleted = FALSE`
      );
      
      // Generate automated journal entry
      try {
        const { generateExpenseJournalEntry } = await import('./services/autoJournalEntryService');
        const journalEntryId = await generateExpenseJournalEntry(expenditure, ctx.user.id);
        
        // Link journal entry to expenditure
        await db.execute(
          sql`UPDATE expenditures SET journalEntryId = ${journalEntryId} WHERE id = ${input.id}`
        );
      } catch (error) {
        // Log error but don't fail the approval
        console.error('Failed to generate journal entry for expenditure:', error);
      }
      
      // Generate evidence document
      try {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Expenditure Approval</title>
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
              <h1>Expenditure Approval <span class="approval-badge">APPROVED</span></h1>
              <p><strong>Expenditure ID:</strong> ${input.id}</p>
              <p><strong>Approved:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Approved By:</strong> User ${ctx.user.id}</p>
            </div>
            <div class="field">
              <div class="label">Amount:</div>
              <div class="amount">$${expenditure.amount || '0.00'}</div>
            </div>
            <div class="field">
              <div class="label">Description:</div>
              <div class="value">${expenditure.description || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Category:</div>
              <div class="value">${expenditure.category || 'N/A'}</div>
            </div>
          </body>
          </html>
        `;
        
        await generatePDFEvidence({
          module: 'finance',
          screen: 'expenditures',
          triggerEvent: 'approve',
          entityType: 'Expenditure',
          entityId: String(input.id),
          htmlContent,
          variables: { expenditureId: String(input.id), entityId: String(input.id) },
          context: {
            organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
            userId: ctx.user.id,
          },
        });
      } catch (error) {
        console.error('Failed to generate expenditure approval evidence:', error);
      }
      
      return { success: true };
    }),

  // Reject expenditure
  reject: scopedProcedure
    .input(z.object({ id: z.number(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      
      await db.execute(
        sql`UPDATE expenditures 
            SET status = 'REJECTED', rejectionReason = ${input.reason} 
            WHERE id = ${input.id} AND organizationId = ${organizationId} AND isDeleted = FALSE`
      );
      
      return { success: true };
    }),
});
