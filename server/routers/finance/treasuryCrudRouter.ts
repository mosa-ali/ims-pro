import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { financeBankAccounts, financeCashTransactions, financeFundBalances } from "../../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Treasury CRUD Router
 * Provides database-backed CRUD operations for:
 * - Bank Accounts
 * - Cash Transactions
 * - Fund Balances
 * 
 * All operations use scopedProcedure for Org/OU isolation
 * Implements SOFT DELETE only - NO HARD DELETE ALLOWED
 */

export const treasuryCrudRouter = router({
  // ============================================================================
  // BANK ACCOUNTS OPERATIONS
  // ============================================================================

  listBankAccounts: scopedProcedure
    .input(z.object({
      accountType: z.enum(['CHECKING', 'SAVINGS', 'MONEY_MARKET', 'PETTY_CASH', 'SAFE']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const results = await db.select().from(financeBankAccounts).where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.operatingUnitId, operatingUnitId),
          eq(financeBankAccounts.isDeleted, 0)
        )
      ).orderBy(financeBankAccounts.accountName);
      
      let filtered = results;
      
      if (input.accountType) {
        filtered = filtered.filter((a: any) => a.accountType === input.accountType);
      }
      
      return filtered;
    }),

  getBankAccountById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.select().from(financeBankAccounts).where(
        and(
          eq(financeBankAccounts.id, input.id),
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.operatingUnitId, operatingUnitId),
          eq(financeBankAccounts.isDeleted, 0)
        )
      );
      
      return result[0] || null;
    }),

  getBankAccountStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const all = await db.select().from(financeBankAccounts).where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.operatingUnitId, operatingUnitId),
          eq(financeBankAccounts.isDeleted, 0)
        )
      );
      
      const active = all.filter((a: any) => a.isActive === true);
      const totalBalance = all.reduce((sum: number, a: any) => sum + parseFloat(a.currentBalance || 0), 0);
      
      return {
        total: all.length,
        active: active.length,
        inactive: all.filter((a: any) => a.isActive === false).length,
        totalBalance,
      };
    }),

  createBankAccount: scopedProcedure
    .input(z.object({
      accountName: z.string().min(1),
      accountNameAr: z.string().optional(),
      accountNumber: z.string().min(1),
      bankName: z.string().min(1),
      bankNameAr: z.string().optional(),
      branchName: z.string().optional(),
      branchCode: z.string().optional(),
      swiftCode: z.string().optional(),
      iban: z.string().optional(),
      accountType: z.enum(['CHECKING', 'SAVINGS', 'MONEY_MARKET', 'PETTY_CASH', 'SAFE']),
      currency: z.string().default("USD"),
      openingBalance: z.number().default(0),
      accountCode: z.string().optional(),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const existing = await db.select().from(financeBankAccounts).where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.operatingUnitId, operatingUnitId),
          eq(financeBankAccounts.accountNumber, input.accountNumber),
          eq(financeBankAccounts.isDeleted, 0)
        )
      );
      
      if (existing.length > 0) {
        throw new Error(`Account number ${input.accountNumber} already exists`);
      }
      
      const result = await db.insert(financeBankAccounts).values({
        organizationId,
        operatingUnitId,
        accountName: input.accountName,
        accountNameAr: input.accountNameAr || null,
        accountNumber: input.accountNumber,
        bankName: input.bankName,
        bankNameAr: input.bankNameAr || null,
        branchName: input.branchName || null,
        branchCode: input.branchCode || null,
        bankCode: input.swiftCode || null,
        accountType: input.accountType,
        currency: input.currency,
        openingBalance: String(input.openingBalance),
        currentBalance: String(input.openingBalance),
        glAccountCode: input.accountCode || null,
        contactPerson: input.contactPerson || null,
        contactPhone: input.contactPhone || null,
        notes: input.notes || null,
        isActive: 1,
        createdBy: ctx.user?.id || null,
      });
      
      return { success: true, insertId: (result as any)[0].insertId };
    }),

  updateBankAccount: scopedProcedure
    .input(z.object({
      id: z.number(),
      accountName: z.string().optional(),
      bankName: z.string().optional(),
      accountType: z.enum(['CHECKING', 'SAVINGS', 'MONEY_MARKET', 'PETTY_CASH', 'SAFE']).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, isActive, ...updateData } = input;
      
      const setData: any = { ...updateData, updatedBy: ctx.user?.id || null };
      if (isActive !== undefined) {
        setData.isActive = isActive ? 1 : 0;
      }
      
      await db.update(financeBankAccounts)
        .set(setData)
        .where(and(
          eq(financeBankAccounts.id, id),
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.operatingUnitId, operatingUnitId),
        ));
      
      return { success: true };
    }),

  deleteBankAccount: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeBankAccounts)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(financeBankAccounts.id, input.id),
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.operatingUnitId, operatingUnitId),
        ));
      
      return { success: true };
    }),

  // ============================================================================
  // CASH TRANSACTIONS OPERATIONS
  // ============================================================================

  listCashTransactions: scopedProcedure
    .input(z.object({
      bankAccountId: z.number().optional(),
      transactionType: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'BANK_CHARGE', 'INTEREST', 'ADJUSTMENT']).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const results = await db.select().from(financeCashTransactions).where(
        and(
          eq(financeCashTransactions.organizationId, organizationId),
          eq(financeCashTransactions.isDeleted, 0)
        )
      ).orderBy(desc(financeCashTransactions.transactionDate));
      
      let filtered = results;
      
      if (input.bankAccountId) {
        filtered = filtered.filter((t: any) => t.bankAccountId === input.bankAccountId);
      }
      
      if (input.transactionType) {
        filtered = filtered.filter((t: any) => t.transactionType === input.transactionType);
      }
      
      if (input.dateFrom) {
        const fromDate = new Date(input.dateFrom);
        filtered = filtered.filter((t: any) => new Date(t.transactionDate) >= fromDate);
      }
      
      if (input.dateTo) {
        const toDate = new Date(input.dateTo);
        filtered = filtered.filter((t: any) => new Date(t.transactionDate) <= toDate);
      }
      
      return filtered;
    }),

  createCashTransaction: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      transactionNumber: z.string(),
      transactionDate: z.string(),
      transactionType: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'BANK_CHARGE', 'INTEREST', 'ADJUSTMENT']),
      amount: z.number().positive(),
      currency: z.string().default("USD"),
      description: z.string().optional(),
      referenceNumber: z.string().optional(),
      payee: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const bankAccount = await db.select().from(financeBankAccounts).where(
        and(
          eq(financeBankAccounts.id, input.bankAccountId),
          eq(financeBankAccounts.organizationId, organizationId)
        )
      );
      
      if (!bankAccount[0]) {
        throw new Error("Bank account not found");
      }
      
      const currentBalance = parseFloat((bankAccount[0] as any).currentBalance || "0");
      let newBalance = currentBalance;
      
      if (['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(input.transactionType)) {
        newBalance = currentBalance + input.amount;
      } else if (['WITHDRAWAL', 'TRANSFER_OUT', 'BANK_CHARGE'].includes(input.transactionType)) {
        newBalance = currentBalance - input.amount;
      } else if (input.transactionType === 'ADJUSTMENT') {
        newBalance = input.amount;
      }
      
      const result = await db.insert(financeCashTransactions).values({
        organizationId,
        bankAccountId: input.bankAccountId,
        transactionNumber: input.transactionNumber,
        transactionDate: new Date(input.transactionDate).toISOString(),
        transactionType: input.transactionType,
        amount: String(input.amount),
        currency: input.currency,
        description: input.description || null,
        referenceNumber: input.referenceNumber || null,
        payee: input.payee || null,
        balanceAfter: String(newBalance),
        status: 'POSTED',
        createdBy: ctx.user?.id || null,
      });
      
      await db.update(financeBankAccounts)
        .set({
          currentBalance: String(newBalance),
          updatedBy: ctx.user?.id || null,
        })
        .where(eq(financeBankAccounts.id, input.bankAccountId));
      
      return { success: true, insertId: (result as any)[0].insertId, newBalance };
    }),

  deleteCashTransaction: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const transaction = await db.select().from(financeCashTransactions).where(
        and(
          eq(financeCashTransactions.id, input.id),
          eq(financeCashTransactions.organizationId, organizationId)
        )
      );
      
      if ((transaction[0] as any)?.status === 'POSTED') {
        const bankAccount = await db.select().from(financeBankAccounts).where(
          eq(financeBankAccounts.id, (transaction[0] as any).bankAccountId)
        );
        
        if (bankAccount[0]) {
          const currentBalance = parseFloat((bankAccount[0] as any).currentBalance || "0");
          const txnAmount = parseFloat((transaction[0] as any).amount || "0");
          let newBalance = currentBalance;
          
          if (['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes((transaction[0] as any).transactionType)) {
            newBalance = currentBalance - txnAmount;
          } else if (['WITHDRAWAL', 'TRANSFER_OUT', 'BANK_CHARGE'].includes((transaction[0] as any).transactionType)) {
            newBalance = currentBalance + txnAmount;
          }
          
          await db.update(financeBankAccounts)
            .set({
              currentBalance: String(newBalance),
              updatedBy: ctx.user?.id || null,
            })
            .where(eq(financeBankAccounts.id, (transaction[0] as any).bankAccountId));
        }
      }
      
      await db.update(financeCashTransactions)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user?.id || null,
        })
        .where(eq(financeCashTransactions.id, input.id));
      
      return { success: true };
    }),

  // ============================================================================
  // FUND BALANCES OPERATIONS
  // ============================================================================

  listFundBalances: scopedProcedure
    .input(z.object({
      fundType: z.enum(['RESTRICTED', 'UNRESTRICTED', 'TEMPORARILY_RESTRICTED', 'DONOR_DESIGNATED']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const results = await db.select().from(financeFundBalances).where(
        and(
          eq(financeFundBalances.organizationId, organizationId),
          eq(financeFundBalances.isDeleted, 0)
        )
      ).orderBy(financeFundBalances.fundName);
      
      if (input.fundType) {
        return results.filter((f: any) => f.fundType === input.fundType);
      }
      
      return results;
    }),

  getFundBalanceStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const all = await db.select().from(financeFundBalances).where(
        and(
          eq(financeFundBalances.organizationId, organizationId),
          eq(financeFundBalances.isDeleted, 0)
        )
      );
      
      const restricted = all.filter((f: any) => f.fundType === 'RESTRICTED');
      const unrestricted = all.filter((f: any) => f.fundType === 'UNRESTRICTED');
      
      const totalBalance = all.reduce((sum: number, f: any) => sum + parseFloat(f.currentBalance || 0), 0);
      const restrictedBalance = restricted.reduce((sum: number, f: any) => sum + parseFloat(f.currentBalance || 0), 0);
      const unrestrictedBalance = unrestricted.reduce((sum: number, f: any) => sum + parseFloat(f.currentBalance || 0), 0);
      
      return {
        total: all.length,
        restricted: restricted.length,
        unrestricted: unrestricted.length,
        totalBalance,
        restrictedBalance,
        unrestrictedBalance,
      };
    }),

  createFundBalance: scopedProcedure
    .input(z.object({
      fundCode: z.string().min(1),
      fundName: z.string().min(1),
      fundNameAr: z.string().optional(),
      fundType: z.enum(['RESTRICTED', 'UNRESTRICTED', 'TEMPORARILY_RESTRICTED', 'DONOR_DESIGNATED']),
      currency: z.string().default("USD"),
      openingBalance: z.number().default(0),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const existing = await db.select().from(financeFundBalances).where(
        and(
          eq(financeFundBalances.organizationId, organizationId),
          eq(financeFundBalances.fundCode, input.fundCode),
          eq(financeFundBalances.isDeleted, 0)
        )
      );
      
      if (existing.length > 0) {
        throw new Error(`Fund code ${input.fundCode} already exists`);
      }
      
      const result = await db.insert(financeFundBalances).values({
        organizationId,
        fundCode: input.fundCode,
        fundName: input.fundName,
        fundNameAr: input.fundNameAr || null,
        fundType: input.fundType,
        currency: input.currency,
        totalBudget: String(input.openingBalance),
        currentBalance: String(input.openingBalance),
        notes: input.description || null,
        isActive: 1,
        createdBy: ctx.user?.id || null,
      });
      
      return { success: true, insertId: (result as any)[0].insertId };
    }),

  updateFundBalance: scopedProcedure
    .input(z.object({
      id: z.number(),
      fundName: z.string().optional(),
      fundType: z.enum(['RESTRICTED', 'UNRESTRICTED', 'TEMPORARILY_RESTRICTED', 'DONOR_DESIGNATED']).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, isActive, ...rest } = input;
      
      const setData: any = { ...rest, updatedBy: ctx.user?.id || null };
      if (isActive !== undefined) {
        setData.isActive = isActive ? 1 : 0;
      }
      
      await db.update(financeFundBalances)
        .set(setData)
        .where(and(
          eq(financeFundBalances.id, id),
          eq(financeFundBalances.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  adjustFundBalance: scopedProcedure
    .input(z.object({
      id: z.number(),
      adjustmentAmount: z.number(),
      adjustmentType: z.enum(['ADD', 'SUBTRACT', 'SET']),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const fund = await db.select().from(financeFundBalances).where(
        and(
          eq(financeFundBalances.id, input.id),
          eq(financeFundBalances.organizationId, organizationId)
        )
      );
      
      if (!fund[0]) {
        throw new Error("Fund not found");
      }
      
      const currentBalance = parseFloat((fund[0] as any).currentBalance || "0");
      let newBalance = currentBalance;
      
      if (input.adjustmentType === 'ADD') {
        newBalance = currentBalance + input.adjustmentAmount;
      } else if (input.adjustmentType === 'SUBTRACT') {
        newBalance = currentBalance - input.adjustmentAmount;
      } else if (input.adjustmentType === 'SET') {
        newBalance = input.adjustmentAmount;
      }
      
      await db.update(financeFundBalances)
        .set({
          currentBalance: String(newBalance),
          updatedBy: ctx.user?.id || null,
        })
        .where(eq(financeFundBalances.id, input.id));
      
      return { success: true, newBalance };
    }),

  deleteFundBalance: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeFundBalances)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(financeFundBalances.id, input.id),
          eq(financeFundBalances.organizationId, organizationId)
        ));
      
      return { success: true };
    }),
});
