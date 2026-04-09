import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { glAccounts, glAccountCategories } from "../drizzle/schema";
import { eq, and, isNull, like, or, sql, desc, asc } from "drizzle-orm";

// GL Account Categories Router
export const glAccountCategoriesRouter = router({
  list: scopedProcedure
    .input(z.object({
      parentId: z.number().optional().nullable(),
      accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(glAccountCategories.organizationId, organizationId),
        isNull(glAccountCategories.deletedAt),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(glAccountCategories.operatingUnitId, operatingUnitId));
      }
      if (input.parentId !== undefined) {
        if (input.parentId === null) {
          conditions.push(isNull(glAccountCategories.parentId));
        } else {
          conditions.push(eq(glAccountCategories.parentId, input.parentId));
        }
      }
      if (input.accountType) {
        conditions.push(eq(glAccountCategories.accountType, input.accountType));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(glAccountCategories.isActive, input.isActive));
      }
      
      return db.select().from(glAccountCategories)
        .where(and(...conditions))
        .orderBy(asc(glAccountCategories.sortOrder), asc(glAccountCategories.code));
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const result = await db.select().from(glAccountCategories)
        .where(and(
          eq(glAccountCategories.id, input.id),
          eq(glAccountCategories.organizationId, organizationId),
          isNull(glAccountCategories.deletedAt)
        ))
        .limit(1);
      return result[0] || null;
    }),

  create: scopedProcedure
    .input(z.object({
      code: z.string().min(1).max(20),
      name: z.string().min(1).max(255),
      nameAr: z.string().max(255).optional(),
      parentId: z.number().optional().nullable(),
      level: z.number().default(1),
      accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
      normalBalance: z.enum(['debit', 'credit']),
      isActive: z.boolean().default(true),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const result = await db.insert(glAccountCategories).values({
        ...input,
        organizationId,
        operatingUnitId: operatingUnitId || null,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      return { id: Number(result.insertId), success: true };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1).max(20).optional(),
      name: z.string().min(1).max(255).optional(),
      nameAr: z.string().max(255).optional().nullable(),
      parentId: z.number().optional().nullable(),
      level: z.number().optional(),
      accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
      normalBalance: z.enum(['debit', 'credit']).optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const { id, ...updateData } = input;
      await db.update(glAccountCategories)
        .set({ ...updateData, updatedBy: ctx.user?.id })
        .where(and(
          eq(glAccountCategories.id, id),
          eq(glAccountCategories.organizationId, organizationId)
        ));
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      // Soft delete
      await db.update(glAccountCategories)
        .set({ 
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(glAccountCategories.id, input.id),
          eq(glAccountCategories.organizationId, organizationId)
        ));
      return { success: true };
    }),

  // Get hierarchical tree structure
  getTree: scopedProcedure
    .input(z.object({
      accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(glAccountCategories.organizationId, organizationId),
        isNull(glAccountCategories.deletedAt),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(glAccountCategories.operatingUnitId, operatingUnitId));
      }
      if (input.accountType) {
        conditions.push(eq(glAccountCategories.accountType, input.accountType));
      }
      
      const allCategories = await db.select().from(glAccountCategories)
        .where(and(...conditions))
        .orderBy(asc(glAccountCategories.sortOrder), asc(glAccountCategories.code));
      
      // Build tree structure
      const buildTree = (parentId: number | null): any[] => {
        return allCategories
          .filter(cat => cat.parentId === parentId)
          .map(cat => ({
            ...cat,
            children: buildTree(cat.id),
          }));
      };
      
      return buildTree(null);
    }),
});

// GL Accounts Router
export const glAccountsRouter = router({
  list: scopedProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
      isActive: z.boolean().optional(),
      isBankAccount: z.boolean().optional(),
      isCashAccount: z.boolean().optional(),
      isPostable: z.boolean().optional(),
      search: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(glAccounts.organizationId, organizationId),
        isNull(glAccounts.deletedAt),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(glAccounts.operatingUnitId, operatingUnitId));
      }
      if (input.categoryId) {
        conditions.push(eq(glAccounts.categoryId, input.categoryId));
      }
      if (input.accountType) {
        conditions.push(eq(glAccounts.accountType, input.accountType));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(glAccounts.isActive, input.isActive));
      }
      if (input.isBankAccount !== undefined) {
        conditions.push(eq(glAccounts.isBankAccount, input.isBankAccount));
      }
      if (input.isCashAccount !== undefined) {
        conditions.push(eq(glAccounts.isCashAccount, input.isCashAccount));
      }
      if (input.isPostable !== undefined) {
        conditions.push(eq(glAccounts.isPostable, input.isPostable));
      }
      if (input.search) {
        conditions.push(or(
          like(glAccounts.accountCode, `%${input.search}%`),
          like(glAccounts.name, `%${input.search}%`),
          like(glAccounts.nameAr, `%${input.search}%`)
        )!);
      }
      
      const [accounts, countResult] = await Promise.all([
        db.select().from(glAccounts)
          .where(and(...conditions))
          .orderBy(asc(glAccounts.accountCode))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: sql<number>`count(*)` }).from(glAccounts)
          .where(and(...conditions)),
      ]);
      
      return {
        accounts,
        total: countResult[0]?.count || 0,
      };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const result = await db.select().from(glAccounts)
        .where(and(
          eq(glAccounts.id, input.id),
          eq(glAccounts.organizationId, organizationId),
          isNull(glAccounts.deletedAt)
        ))
        .limit(1);
      return result[0] || null;
    }),

  create: scopedProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      accountCode: z.string().min(1).max(50),
      name: z.string().min(1).max(255),
      nameAr: z.string().max(255).optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
      normalBalance: z.enum(['debit', 'credit']),
      parentAccountId: z.number().optional().nullable(),
      level: z.number().default(1),
      isControlAccount: z.boolean().default(false),
      isBankAccount: z.boolean().default(false),
      isCashAccount: z.boolean().default(false),
      isReceivable: z.boolean().default(false),
      isPayable: z.boolean().default(false),
      currencyId: z.number().optional(),
      openingBalance: z.string().default('0.00'),
      isActive: z.boolean().default(true),
      isPostable: z.boolean().default(true),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const result = await db.insert(glAccounts).values({
        ...input,
        organizationId,
        operatingUnitId: operatingUnitId || null,
        currentBalance: input.openingBalance,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      return { id: Number(result.insertId), success: true };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      categoryId: z.number().optional().nullable(),
      accountCode: z.string().min(1).max(50).optional(),
      name: z.string().min(1).max(255).optional(),
      nameAr: z.string().max(255).optional().nullable(),
      description: z.string().optional().nullable(),
      descriptionAr: z.string().optional().nullable(),
      accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
      normalBalance: z.enum(['debit', 'credit']).optional(),
      parentAccountId: z.number().optional().nullable(),
      level: z.number().optional(),
      isControlAccount: z.boolean().optional(),
      isBankAccount: z.boolean().optional(),
      isCashAccount: z.boolean().optional(),
      isReceivable: z.boolean().optional(),
      isPayable: z.boolean().optional(),
      currencyId: z.number().optional().nullable(),
      openingBalance: z.string().optional(),
      isActive: z.boolean().optional(),
      isPostable: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const { id, ...updateData } = input;
      await db.update(glAccounts)
        .set({ ...updateData, updatedBy: ctx.user?.id })
        .where(and(
          eq(glAccounts.id, id),
          eq(glAccounts.organizationId, organizationId)
        ));
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      // Soft delete
      await db.update(glAccounts)
        .set({ 
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(glAccounts.id, input.id),
          eq(glAccounts.organizationId, organizationId)
        ));
      return { success: true };
    }),

  // Get accounts by type for dropdowns
  getByType: scopedProcedure
    .input(z.object({
      accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
      isPostable: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      return db.select({
        id: glAccounts.id,
        accountCode: glAccounts.accountCode,
        name: glAccounts.name,
        nameAr: glAccounts.nameAr,
      }).from(glAccounts)
        .where(and(
          eq(glAccounts.organizationId, organizationId),
          eq(glAccounts.accountType, input.accountType),
          eq(glAccounts.isPostable, input.isPostable),
          eq(glAccounts.isActive, true),
          isNull(glAccounts.deletedAt)
        ))
        .orderBy(asc(glAccounts.accountCode));
    }),

  // Get bank accounts for dropdowns
  getBankAccounts: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(glAccounts.organizationId, organizationId),
        eq(glAccounts.isBankAccount, true),
        eq(glAccounts.isActive, true),
        isNull(glAccounts.deletedAt),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(glAccounts.operatingUnitId, operatingUnitId));
      }
      
      return db.select({
        id: glAccounts.id,
        accountCode: glAccounts.accountCode,
        name: glAccounts.name,
        nameAr: glAccounts.nameAr,
        currentBalance: glAccounts.currentBalance,
      }).from(glAccounts)
        .where(and(...conditions))
        .orderBy(asc(glAccounts.accountCode));
    }),

  // Get cash accounts for dropdowns
  getCashAccounts: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(glAccounts.organizationId, organizationId),
        eq(glAccounts.isCashAccount, true),
        eq(glAccounts.isActive, true),
        isNull(glAccounts.deletedAt),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(glAccounts.operatingUnitId, operatingUnitId));
      }
      
      return db.select({
        id: glAccounts.id,
        accountCode: glAccounts.accountCode,
        name: glAccounts.name,
        nameAr: glAccounts.nameAr,
        currentBalance: glAccounts.currentBalance,
      }).from(glAccounts)
        .where(and(...conditions))
        .orderBy(asc(glAccounts.accountCode));
    }),

  // Get hierarchical account tree
  getTree: scopedProcedure
    .input(z.object({
      accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(glAccounts.organizationId, organizationId),
        isNull(glAccounts.deletedAt),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(glAccounts.operatingUnitId, operatingUnitId));
      }
      if (input.accountType) {
        conditions.push(eq(glAccounts.accountType, input.accountType));
      }
      
      const allAccounts = await db.select().from(glAccounts)
        .where(and(...conditions))
        .orderBy(asc(glAccounts.sortOrder), asc(glAccounts.accountCode));
      
      // Build tree structure
      const buildTree = (parentId: number | null): any[] => {
        return allAccounts
          .filter(acc => acc.parentAccountId === parentId)
          .map(acc => ({
            ...acc,
            children: buildTree(acc.id),
          }));
      };
      
      return buildTree(null);
    }),
});
