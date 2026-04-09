import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { chartOfAccounts } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Chart of Accounts Router
 * Provides CRUD operations for financial account management
 * Implements SOFT DELETE only - NO HARD DELETE ALLOWED
 */
export const chartOfAccountsRouter = router({
  // Get all accounts for an organization (excludes soft-deleted)
  getAll: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return await db.select().from(chartOfAccounts).where(
        and(
          eq(chartOfAccounts.organizationId, organizationId),
          eq(chartOfAccounts.isDeleted, false)
        )
      ).orderBy(chartOfAccounts.accountCode);
    }),

  // Get single account by ID
  getById: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.select().from(chartOfAccounts).where(
        and(
          eq(chartOfAccounts.id, input.id),
          eq(chartOfAccounts.organizationId, organizationId),
          eq(chartOfAccounts.isDeleted, false)
        )
      );
      
      return result[0] || null;
    }),

  // Get statistics for dashboard
  getStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const all = await db.select().from(chartOfAccounts).where(
        and(
          eq(chartOfAccounts.organizationId, organizationId),
          eq(chartOfAccounts.isDeleted, false)
        )
      );
      
      const assets = all.filter((a: any) => a.accountType === 'ASSET').length;
      const liabilities = all.filter((a: any) => a.accountType === 'LIABILITY').length;
      const equity = all.filter((a: any) => a.accountType === 'EQUITY').length;
      const income = all.filter((a: any) => a.accountType === 'INCOME').length;
      const expenses = all.filter((a: any) => a.accountType === 'EXPENSE').length;
      const active = all.filter((a: any) => a.isActive).length;
      const inactive = all.filter((a: any) => !a.isActive).length;
      
      return { 
        total: all.length, 
        assets, 
        liabilities, 
        equity, 
        income, 
        expenses,
        active,
        inactive
      };
    }),

  // Create new account
  create: scopedProcedure
    .input(z.object({
      accountCode: z.string().min(1, "Account code is required"),
      accountNameEn: z.string().min(1, "English name is required"),
      accountNameAr: z.string().optional(),
      accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
      parentAccountCode: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check for duplicate account code within organization
      const existing = await db.select().from(chartOfAccounts).where(
        and(
          eq(chartOfAccounts.organizationId, organizationId),
          eq(chartOfAccounts.accountCode, input.accountCode),
          eq(chartOfAccounts.isDeleted, false)
        )
      );
      
      if (existing.length > 0) {
        throw new Error(`Account code ${input.accountCode} already exists`);
      }
      
      const result = await db.insert(chartOfAccounts).values({
        organizationId: organizationId,
        accountCode: input.accountCode,
        accountNameEn: input.accountNameEn,
        accountNameAr: input.accountNameAr || null,
        accountType: input.accountType,
        parentAccountCode: input.parentAccountCode || null,
        description: input.description || null,
        isActive: input.isActive,
        createdBy: ctx.user?.id || null,
      });
      
      return { success: true, insertId: result[0].insertId };
    }),

  // Update existing account
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      accountCode: z.string().min(1, "Account code is required").optional(),
      accountNameEn: z.string().min(1, "English name is required").optional(),
      accountNameAr: z.string().optional(),
      accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']).optional(),
      parentAccountCode: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      // If updating account code, check for duplicates
      if (updateData.accountCode) {
        const current = await db.select().from(chartOfAccounts).where(
          and(
            eq(chartOfAccounts.id, id),
            eq(chartOfAccounts.organizationId, organizationId)
          )
        );
        if (current.length > 0) {
          const existing = await db.select().from(chartOfAccounts).where(
            and(
              eq(chartOfAccounts.organizationId, organizationId),
              eq(chartOfAccounts.accountCode, updateData.accountCode),
              eq(chartOfAccounts.isDeleted, false)
            )
          );
          
          if (existing.length > 0 && existing[0].id !== id) {
            throw new Error(`Account code ${updateData.accountCode} already exists`);
          }
        }
      }
      
      await db.update(chartOfAccounts)
        .set({
          ...updateData,
          updatedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // SOFT DELETE - NO HARD DELETE ALLOWED
  delete: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Soft delete: set isDeleted = true, record deletion timestamp and user
      await db.update(chartOfAccounts)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(chartOfAccounts.id, input.id),
          eq(chartOfAccounts.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Bulk import from Excel
  bulkImport: scopedProcedure
    .input(z.object({
      accounts: z.array(z.object({
        accountCode: z.string(),
        accountNameEn: z.string(),
        accountNameAr: z.string().optional(),
        accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
        parentAccountCode: z.string().optional(),
        description: z.string().optional(),
      })),
      allowDuplicates: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; field: string; message: string; suggestedFix: string }>,
      };
      
      for (let i = 0; i < input.accounts.length; i++) {
        const account = input.accounts[i];
        const rowNum = i + 2; // Excel row (1-indexed + header)
        
        try {
          // Validate required fields
          if (!account.accountCode) {
            results.errors.push({
              row: rowNum,
              field: 'accountCode',
              message: 'Account code is required',
              suggestedFix: 'Provide a unique account code (e.g., 1000, 2100)',
            });
            results.skipped++;
            continue;
          }
          
          if (!account.accountNameEn) {
            results.errors.push({
              row: rowNum,
              field: 'accountNameEn',
              message: 'English account name is required',
              suggestedFix: 'Provide an English name for the account',
            });
            results.skipped++;
            continue;
          }
          
          // Check for duplicates
          if (!input.allowDuplicates) {
            const existing = await db.select().from(chartOfAccounts).where(
              and(
                eq(chartOfAccounts.organizationId, organizationId),
                eq(chartOfAccounts.accountCode, account.accountCode),
                eq(chartOfAccounts.isDeleted, false)
              )
            );
            
            if (existing.length > 0) {
              results.errors.push({
                row: rowNum,
                field: 'accountCode',
                message: `Account code ${account.accountCode} already exists`,
                suggestedFix: 'Use a different account code or enable "Allow duplicates"',
              });
              results.skipped++;
              continue;
            }
          }
          
          // Insert account
          await db.insert(chartOfAccounts).values({
            organizationId: organizationId,
            accountCode: account.accountCode,
            accountNameEn: account.accountNameEn,
            accountNameAr: account.accountNameAr || null,
            accountType: account.accountType,
            parentAccountCode: account.parentAccountCode || null,
            description: account.description || null,
            isActive: true,
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
});
