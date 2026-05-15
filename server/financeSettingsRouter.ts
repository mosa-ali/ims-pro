/**
 * Finance Settings Router
 * 
 * Full CRUD operations for:
 * - Currencies (with exchange rates)
 * - Fiscal Years
 * - Approval Thresholds
 * - Budget Categories
 * - Finance Roles & Permissions
 * 
 * All with soft delete support
 */

import { z } from "zod";
import { protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  financeCurrencies,
  financeFiscalYears,
  financeApprovalThresholds,
  financeBudgetCategories,
  financeRoles,
  financePermissions,
  financeRolePermissions,
  financeUserRoles,
} from "../drizzle/schema";
import { eq, and, desc, asc, like, or, sql, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

export const financeSettingsRouter = router({
  // ==================== CURRENCIES ====================
  
  listCurrencies: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const results = await db.select().from(financeCurrencies)
        .where(and(
          eq(financeCurrencies.organizationId, organizationId),
          eq(financeCurrencies.isDeleted, 0)
        ))
        .orderBy(asc(financeCurrencies.code));
      
      let filtered = results;
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filtered = filtered.filter(c => 
          c.code.toLowerCase().includes(searchLower) ||
          c.name.toLowerCase().includes(searchLower) ||
          (c.nameAr && c.nameAr.includes(input.search!))
        );
      }
      if (input.isActive !== undefined) {
        filtered = filtered.filter(c => c.isActive === input.isActive);
      }
      
      return filtered;
    }),

  createCurrency: scopedProcedure
    .input(z.object({
      code: z.string().min(1).max(10),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      symbol: z.string().optional(),
      exchangeRateToUsd: z.string().optional(),
      isBaseCurrency: z.boolean().optional(),
      decimalPlaces: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      if (input.isBaseCurrency) {
        await db.update(financeCurrencies)
          .set({ isBaseCurrency: 0 })
          .where(eq(financeCurrencies.organizationId, organizationId));
      }
      
      const [result] = await db.insert(financeCurrencies).values({
        organizationId,
        code: input.code,
        name: input.name,
        nameAr: input.nameAr || null,
        symbol: input.symbol || input.code,
        exchangeRateToUsd: input.exchangeRateToUsd || "1.00",
        isBaseCurrency: input.isBaseCurrency || 0,
        decimalPlaces: input.decimalPlaces || 2,
        isActive: 1,
        isDeleted: 0,
        createdBy: ctx.user?.id || null,
      }).$returningId();
      
      return { id: result.id, success: true };
    }),

  updateCurrency: scopedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      symbol: z.string().optional(),
      exchangeRateToUsd: z.string().optional(),
      isBaseCurrency: z.boolean().optional(),
      decimalPlaces: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { id, ...updates } = input;
      
      if (updates.isBaseCurrency) {
        await db.update(financeCurrencies)
          .set({ isBaseCurrency: 0 })
          .where(eq(financeCurrencies.organizationId, organizationId));
      }
      
      await db.update(financeCurrencies)
        .set({ ...updates, updatedBy: ctx.user?.id || null, updatedAt: nowSql })
        .where(and(eq(financeCurrencies.id, id), eq(financeCurrencies.organizationId, organizationId)));
      
      return { success: true };
    }),

  deleteCurrency: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db.update(financeCurrencies)
        .set({ isDeleted: 0, deletedBy: ctx.user?.id || null, deletedAt: nowSql })
        .where(and(eq(financeCurrencies.id, input.id), eq(financeCurrencies.organizationId, organizationId)));
      
      return { success: true };
    }),

  bulkImportCurrencies: scopedProcedure
    .input(z.object({
      currencies: z.array(z.object({
        code: z.string(),
        name: z.string(),
        nameAr: z.string().optional(),
        symbol: z.string().optional(),
        exchangeRateToUsd: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      let imported = 0;
      for (const curr of input.currencies) {
        await db.insert(financeCurrencies).values({
          organizationId,
          code: curr.code,
          name: curr.name,
          nameAr: curr.nameAr || null,
          symbol: curr.symbol || curr.code,
          exchangeRateToUsd: curr.exchangeRateToUsd || "1.00",
          isActive: 1,
          isDeleted: 0,
          createdBy: ctx.user?.id || null,
        });
        imported++;
      }
      
      return { imported };
    }),

  // ==================== FISCAL YEARS ====================
  
  listFiscalYears: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      return await db.select().from(financeFiscalYears)
        .where(and(
          eq(financeFiscalYears.organizationId, organizationId),
          eq(financeFiscalYears.isDeleted, 0)
        ))
        .orderBy(desc(financeFiscalYears.startDate));
    }),

  createFiscalYear: scopedProcedure
    .input(z.object({
      name: z.string().min(1),
      nameAr: z.string().optional(),
      code: z.string().min(1),
      startDate: z.string(),
      endDate: z.string(),
      status: z.enum(["planning", "active", "closed", "archived"]).optional(),
      isCurrent: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      if (input.isCurrent) {
        await db.update(financeFiscalYears)
          .set({ isCurrent: 0 })
          .where(eq(financeFiscalYears.organizationId, organizationId));
      }
      
      const [result] = await db.insert(financeFiscalYears).values({
        organizationId,
        name: input.name,
        nameAr: input.nameAr || null,
        code: input.code,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: input.status || "planning",
        isCurrent: input.isCurrent || 0,
        isDeleted: 0,
        createdBy: ctx.user?.id || null,
      }).$returningId();
      
      return { id: result.id, success: true };
    }),

  updateFiscalYear: scopedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      code: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(["planning", "active", "closed", "archived"]).optional(),
      isCurrent: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { id, startDate, endDate, ...updates } = input;
      
      if (updates.isCurrent) {
        await db.update(financeFiscalYears)
          .set({ isCurrent: 0 })
          .where(eq(financeFiscalYears.organizationId, organizationId));
      }
      
      const updateData: any = { ...updates, updatedBy: ctx.user?.id || null, updatedAt: new Date() };
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      
      await db.update(financeFiscalYears)
        .set(updateData)
        .where(and(eq(financeFiscalYears.id, id), eq(financeFiscalYears.organizationId, organizationId)));
      
      return { success: true };
    }),

  deleteFiscalYear: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db.update(financeFiscalYears)
        .set({ isDeleted: 1, deletedBy: ctx.user?.id || null, deletedAt: nowSql })
        .where(and(eq(financeFiscalYears.id, input.id), eq(financeFiscalYears.organizationId, organizationId)));
      
      return { success: true };
    }),

  // ==================== APPROVAL THRESHOLDS ====================
  
  listApprovalThresholds: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      return await db.select().from(financeApprovalThresholds)
        .where(and(
          eq(financeApprovalThresholds.organizationId, organizationId),
          eq(financeApprovalThresholds.isDeleted, 0)
        ))
        .orderBy(asc(financeApprovalThresholds.minAmount));
    }),

  createApprovalThreshold: scopedProcedure
    .input(z.object({
      name: z.string().min(1),
      nameAr: z.string().optional(),
      category: z.enum(["expense", "advance", "budget", "asset_disposal", "procurement"]),
      minAmount: z.string(),
      maxAmount: z.string().optional(),
      currency: z.string().optional(),
      approverRole: z.string().optional(),
      requiresMultipleApprovers: z.boolean().optional(),
      minimumApprovers: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [result] = await db.insert(financeApprovalThresholds).values({
        organizationId,
        name: input.name,
        nameAr: input.nameAr || null,
        category: input.category,
        minAmount: input.minAmount,
        maxAmount: input.maxAmount || null,
        currency: input.currency || "USD",
        approverRole: input.approverRole || null,
        requiresMultipleApprovers: input.requiresMultipleApprovers || false,
        minimumApprovers: input.minimumApprovers || 1,
        isActive: 1,
        isDeleted: 0,
        createdBy: ctx.user?.id || null,
      }).$returningId();
      
      return { id: result.id, success: true };
    }),

  updateApprovalThreshold: scopedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      category: z.enum(["expense", "advance", "budget", "asset_disposal", "procurement"]).optional(),
      minAmount: z.string().optional(),
      maxAmount: z.string().optional(),
      currency: z.string().optional(),
      approverRole: z.string().optional(),
      requiresMultipleApprovers: z.boolean().optional(),
      minimumApprovers: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { id, ...updates } = input;
      await db.update(financeApprovalThresholds)
        .set({ ...updates, updatedBy: ctx.user?.id || null, updatedAt: nowSql })
        .where(and(eq(financeApprovalThresholds.id, id), eq(financeApprovalThresholds.organizationId, organizationId)));
      
      return { success: true };
    }),

  deleteApprovalThreshold: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db.update(financeApprovalThresholds)
        .set({ isDeleted: 1, deletedBy: ctx.user?.id || null, deletedAt: nowSql })
        .where(and(eq(financeApprovalThresholds.id, input.id), eq(financeApprovalThresholds.organizationId, organizationId)));
      
      return { success: true };
    }),

  // ==================== BUDGET CATEGORIES ====================
  
  listBudgetCategories: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const results = await db.select().from(financeBudgetCategories)
        .where(and(
          eq(financeBudgetCategories.organizationId, organizationId),
          eq(financeBudgetCategories.isDeleted, 0)
        ))
        .orderBy(asc(financeBudgetCategories.sortOrder), asc(financeBudgetCategories.code));
      
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        return results.filter(c => 
          c.code.toLowerCase().includes(searchLower) ||
          c.name.toLowerCase().includes(searchLower) ||
          (c.nameAr && c.nameAr.includes(input.search!))
        );
      }
      
      return results;
    }),

  createBudgetCategory: scopedProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      parentId: z.number().optional(),
      accountCode: z.string().optional(),
      budgetType: z.enum(["personnel", "operational", "capital", "indirect", "program"]),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [result] = await db.insert(financeBudgetCategories).values({
        organizationId,
        code: input.code,
        name: input.name,
        nameAr: input.nameAr || null,
        description: input.description || null,
        parentId: input.parentId || null,
        accountCode: input.accountCode || null,
        budgetType: input.budgetType,
        sortOrder: input.sortOrder || 0,
        isActive: 1,
        isDeleted: 0,
        createdBy: ctx.user?.id || null,
      }).$returningId();
      
      return { id: result.id, success: true };
    }),

  updateBudgetCategory: scopedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      parentId: z.number().optional(),
      accountCode: z.string().optional(),
      budgetType: z.enum(["personnel", "operational", "capital", "indirect", "program"]).optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { id, ...updates } = input;
      await db.update(financeBudgetCategories)
        .set({ ...updates, updatedBy: ctx.user?.id || null, updatedAt: nowSql })
        .where(and(eq(financeBudgetCategories.id, id), eq(financeBudgetCategories.organizationId, organizationId)));
      
      return { success: true };
    }),

  deleteBudgetCategory: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db.update(financeBudgetCategories)
        .set({ isDeleted: 1, deletedBy: ctx.user?.id || null, deletedAt: nowSql })
        .where(and(eq(financeBudgetCategories.id, input.id), eq(financeBudgetCategories.organizationId, organizationId)));
      
      return { success: true };
    }),

  bulkImportBudgetCategories: scopedProcedure
    .input(z.object({
      categories: z.array(z.object({
        code: z.string(),
        name: z.string(),
        nameAr: z.string().optional(),
        budgetType: z.string().optional(),
        accountCode: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      let imported = 0;
      for (const cat of input.categories) {
        await db.insert(financeBudgetCategories).values({
          organizationId,
          code: cat.code,
          name: cat.name,
          nameAr: cat.nameAr || null,
          budgetType: (cat.budgetType as any) || "operational",
          accountCode: cat.accountCode || null,
          isActive: 1,
          isDeleted: 0,
          createdBy: ctx.user?.id || null,
        });
        imported++;
      }
      
      return { imported };
    }),

  // ==================== FINANCE ROLES ====================
  
  listFinanceRoles: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      return await db.select().from(financeRoles)
        .where(and(
          eq(financeRoles.organizationId, organizationId),
          eq(financeRoles.isDeleted, 0)
        ))
        .orderBy(asc(financeRoles.level), asc(financeRoles.code));
    }),

  createFinanceRole: scopedProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      level: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [result] = await db.insert(financeRoles).values({
        organizationId,
        code: input.code,
        name: input.name,
        nameAr: input.nameAr || null,
        description: input.description || null,
        level: input.level || 1,
        isActive: 1,
        isDeleted: 0,
        createdBy: ctx.user?.id || null,
      }).$returningId();
      
      return { id: result.id, success: true };
    }),

  updateFinanceRole: scopedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      level: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { id, ...updates } = input;
      await db.update(financeRoles)
        .set({ ...updates, updatedBy: ctx.user?.id || null, updatedAt: nowSql })
        .where(and(eq(financeRoles.id, id), eq(financeRoles.organizationId, organizationId)));
      
      return { success: true };
    }),

  deleteFinanceRole: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db.update(financeRoles)
        .set({ isDeleted: 1, deletedBy: ctx.user?.id || null, deletedAt: nowSql })
        .where(and(eq(financeRoles.id, input.id), eq(financeRoles.organizationId, organizationId)));
      
      return { success: true };
    }),

  // ==================== FINANCE PERMISSIONS ====================
  
  listFinancePermissions: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      return await db.select().from(financePermissions)
        .where(and(
          eq(financePermissions.organizationId, organizationId),
          eq(financePermissions.isDeleted, 0)
        ))
        .orderBy(asc(financePermissions.module), asc(financePermissions.action));
    }),

  createFinancePermission: scopedProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      module: z.string().min(1),
      action: z.enum(["view", "create", "edit", "delete", "approve", "export", "import"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [result] = await db.insert(financePermissions).values({
        organizationId,
        code: input.code,
        name: input.name,
        nameAr: input.nameAr || null,
        description: input.description || null,
        module: input.module,
        action: input.action,
        isDeleted: 0,
        createdBy: ctx.user?.id || null,
      }).$returningId();
      
      return { id: result.id, success: true };
    }),

  deleteFinancePermission: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db.update(financePermissions)
        .set({ isDeleted: 1, deletedBy: ctx.user?.id || null, deletedAt: nowSql })
        .where(and(eq(financePermissions.id, input.id), eq(financePermissions.organizationId, organizationId)));
      
      return { success: true };
    }),

  // ==================== STATISTICS ====================
  
  getSettingsStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [currenciesResult] = await db.select({ count: sql<number>`count(*)` })
        .from(financeCurrencies)
        .where(and(
          eq(financeCurrencies.organizationId, organizationId),
          eq(financeCurrencies.isDeleted, 0)
        ));
      
      const [fiscalYearsResult] = await db.select({ count: sql<number>`count(*)` })
        .from(financeFiscalYears)
        .where(and(
          eq(financeFiscalYears.organizationId, organizationId),
          eq(financeFiscalYears.isDeleted, 0)
        ));
      
      const [thresholdsResult] = await db.select({ count: sql<number>`count(*)` })
        .from(financeApprovalThresholds)
        .where(and(
          eq(financeApprovalThresholds.organizationId, organizationId),
          eq(financeApprovalThresholds.isDeleted, 0)
        ));
      
      const [categoriesResult] = await db.select({ count: sql<number>`count(*)` })
        .from(financeBudgetCategories)
        .where(and(
          eq(financeBudgetCategories.organizationId, organizationId),
          eq(financeBudgetCategories.isDeleted, 0)
        ));
      
      const [rolesResult] = await db.select({ count: sql<number>`count(*)` })
        .from(financeRoles)
        .where(and(
          eq(financeRoles.organizationId, organizationId),
          eq(financeRoles.isDeleted, 0)
        ));
      
      const [permissionsResult] = await db.select({ count: sql<number>`count(*)` })
        .from(financePermissions)
        .where(and(
          eq(financePermissions.organizationId, organizationId),
          eq(financePermissions.isDeleted, 0)
        ));
      
      return {
        totalCurrencies: currenciesResult?.count || 0,
        totalFiscalYears: fiscalYearsResult?.count || 0,
        totalThresholds: thresholdsResult?.count || 0,
        totalBudgetCategories: categoriesResult?.count || 0,
        totalRoles: rolesResult?.count || 0,
        totalPermissions: permissionsResult?.count || 0,
      };
    }),
});
