import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { financeBankAccounts, financeCashTransactions, financeFundBalances } from "../drizzle/schema";
import { eq, and, desc, sql, gte, lte, like } from "drizzle-orm";

/**
 * Treasury & Cash Management Router
 * Provides CRUD operations for bank accounts, cash transactions, and fund balances
 * Implements SOFT DELETE only - NO HARD DELETE ALLOWED
 */
export const treasuryRouter = router({
  // ============================================================================
  // BANK ACCOUNTS OPERATIONS
  // ============================================================================

  // Get all bank accounts for an organization
  listBankAccounts: scopedProcedure
    .input(z.object({
      accountType: z.enum(['CHECKING', 'SAVINGS', 'MONEY_MARKET', 'PETTY_CASH', 'SAFE']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const results = await db.select().from(financeBankAccounts).where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.isDeleted, false)
        )
      ).orderBy(financeBankAccounts.accountName);
      
      let filtered = results;
      
      if (input.accountType) {
        filtered = filtered.filter((a: any) => a.accountType === input.accountType);
      }
      
      return filtered;
    }),

  // Get single bank account by ID
  getBankAccountById: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.select().from(financeBankAccounts).where(
        and(
          eq(financeBankAccounts.id, input.id),
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.isDeleted, false)
        )
      );
      
      return result[0] || null;
    }),

  // Get bank account statistics
  getBankAccountStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const all = await db.select().from(financeBankAccounts).where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.isDeleted, false)
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

  // Create bank account
  createBankAccount: scopedProcedure
    .input(z.object({
      accountName: z.string().min(1, "Account name is required"),
      accountNameAr: z.string().optional(),
      accountNumber: z.string().min(1, "Account number is required"),
      bankName: z.string().min(1, "Bank name is required"),
      bankNameAr: z.string().optional(),
      branchName: z.string().optional(),
      branchCode: z.string().optional(),
      swiftCode: z.string().optional(),
      iban: z.string().optional(),
      accountType: z.enum(['CHECKING', 'SAVINGS', 'MONEY_MARKET', 'PETTY_CASH', 'SAFE']),
      currency: z.string().default("USD"),
      openingBalance: z.number().default(0),
      openingDate: z.string().optional(),
      accountCode: z.string().optional(),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check for duplicate account number
      const existing = await db.select().from(financeBankAccounts).where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          eq(financeBankAccounts.accountNumber, input.accountNumber),
          eq(financeBankAccounts.isDeleted, false)
        )
      );
      
      if (existing.length > 0) {
        throw new Error(`Account number ${input.accountNumber} already exists`);
      }
      
      const result = await db.insert(financeBankAccounts).values({
        organizationId,
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
        isActive: true,
        createdBy: ctx.user?.id || null,
      });
      
      return { success: true, insertId: result[0].insertId };
    }),

  // Update bank account
  updateBankAccount: scopedProcedure
    .input(z.object({
      id: z.number(),
      accountName: z.string().optional(),
      accountNameAr: z.string().optional(),
      bankName: z.string().optional(),
      bankNameAr: z.string().optional(),
      branchName: z.string().optional(),
      branchCode: z.string().optional(),
      bankCode: z.string().optional(),
      accountType: z.enum(['CHECKING', 'SAVINGS', 'MONEY_MARKET', 'PETTY_CASH', 'SAFE']).optional(),
      glAccountCode: z.string().optional(),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      await db.update(financeBankAccounts)
        .set({
          ...updateData,
          updatedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(financeBankAccounts.id, id),
          eq(financeBankAccounts.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Delete bank account (soft delete)
  deleteBankAccount: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeBankAccounts)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(financeBankAccounts.id, input.id),
          eq(financeBankAccounts.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Bulk import bank accounts
  bulkImportBankAccounts: scopedProcedure
    .input(z.object({
      accounts: z.array(z.object({
        accountName: z.string(),
        accountNameAr: z.string().optional(),
        accountNumber: z.string(),
        bankName: z.string(),
        bankNameAr: z.string().optional(),
        accountType: z.enum(['CHECKING', 'SAVINGS', 'MONEY_MARKET', 'PETTY_CASH', 'SAFE']),
        currency: z.string().optional(),
        openingBalance: z.number().optional(),
        swiftCode: z.string().optional(),
        iban: z.string().optional(),
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
      
      for (let i = 0; i < input.accounts.length; i++) {
        const account = input.accounts[i];
        const rowNum = i + 2;
        
        try {
          if (!account.accountNumber) {
            results.errors.push({
              row: rowNum,
              field: 'accountNumber',
              message: 'Account number is required',
              suggestedFix: 'Provide a unique account number',
            });
            results.skipped++;
            continue;
          }
          
          if (!input.allowDuplicates) {
            const existing = await db.select().from(financeBankAccounts).where(
              and(
                eq(financeBankAccounts.organizationId, organizationId),
                eq(financeBankAccounts.accountNumber, account.accountNumber),
                eq(financeBankAccounts.isDeleted, false)
              )
            );
            
            if (existing.length > 0) {
              results.errors.push({
                row: rowNum,
                field: 'accountNumber',
                message: `Account number ${account.accountNumber} already exists`,
                suggestedFix: 'Use a different account number or enable "Allow duplicates"',
              });
              results.skipped++;
              continue;
            }
          }
          
          const balance = account.openingBalance || 0;
          
          await db.insert(financeBankAccounts).values({
            organizationId,
            accountName: account.accountName,
            accountNameAr: account.accountNameAr || null,
            accountNumber: account.accountNumber,
            bankName: account.bankName,
            bankNameAr: account.bankNameAr || null,
            accountType: account.accountType,
            currency: account.currency || 'USD',
            openingBalance: String(balance),
            currentBalance: String(balance),
            bankCode: account.swiftCode || null,
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

  // ============================================================================
  // CASH TRANSACTIONS OPERATIONS
  // ============================================================================

  // Get all cash transactions
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
          eq(financeCashTransactions.isDeleted, false)
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

  // Get next transaction number
  getNextTransactionNumber: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const year = new Date().getFullYear();
      const prefix = `TXN-${year}-`;
      
      const existing = await db.select().from(financeCashTransactions).where(
        and(
          eq(financeCashTransactions.organizationId, organizationId),
          like(financeCashTransactions.transactionNumber, `${prefix}%`)
        )
      );
      
      const maxNum = existing.reduce((max: number, t: any) => {
        const num = parseInt(t.transactionNumber.replace(prefix, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      
      return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
    }),

  // Create cash transaction
  createCashTransaction: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      transactionNumber: z.string().min(1, "Transaction number is required"),
      transactionDate: z.string(),
      transactionType: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'BANK_CHARGE', 'INTEREST', 'ADJUSTMENT']),
      amount: z.number().positive("Amount must be positive"),
      currency: z.string().default("USD"),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      referenceNumber: z.string().optional(),
      payee: z.string().optional(),
      accountCode: z.string().optional(),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get bank account to update balance
      const bankAccount = await db.select().from(financeBankAccounts).where(
        and(
          eq(financeBankAccounts.id, input.bankAccountId),
          eq(financeBankAccounts.organizationId, organizationId)
        )
      );
      
      if (!bankAccount[0]) {
        throw new Error("Bank account not found");
      }
      
      // Calculate new balance
      const currentBalance = parseFloat(bankAccount[0].currentBalance || "0");
      let newBalance = currentBalance;
      
      if (['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(input.transactionType)) {
        newBalance = currentBalance + input.amount;
      } else if (['WITHDRAWAL', 'TRANSFER_OUT', 'BANK_CHARGE'].includes(input.transactionType)) {
        newBalance = currentBalance - input.amount;
      } else if (input.transactionType === 'ADJUSTMENT') {
        newBalance = input.amount; // Direct adjustment to balance
      }
      
      // Create transaction
      const result = await db.insert(financeCashTransactions).values({
        organizationId,
        bankAccountId: input.bankAccountId,
        transactionNumber: input.transactionNumber,
        transactionDate: new Date(input.transactionDate),
        transactionType: input.transactionType,
        amount: String(input.amount),
        currency: input.currency,
        description: input.description || null,
        descriptionAr: input.descriptionAr || null,
        referenceNumber: input.referenceNumber || null,
        payee: input.payee || null,
        accountCode: input.accountCode || null,
        projectId: input.projectId || null,
        balanceAfter: String(newBalance),
        status: 'POSTED',
        createdBy: ctx.user?.id || null,
      });
      
      // Update bank account balance
      await db.update(financeBankAccounts)
        .set({
          currentBalance: String(newBalance),
          updatedBy: ctx.user?.id || null,
        })
        .where(eq(financeBankAccounts.id, input.bankAccountId));
      
      return { success: true, insertId: result[0].insertId, newBalance };
    }),

  // Delete cash transaction (soft delete and reverse balance)
  deleteCashTransaction: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get transaction to reverse balance
      const transaction = await db.select().from(financeCashTransactions).where(
        and(
          eq(financeCashTransactions.id, input.id),
          eq(financeCashTransactions.organizationId, organizationId)
        )
      );
      
      if (transaction[0] && transaction[0].status === 'POSTED') {
        const bankAccount = await db.select().from(financeBankAccounts).where(
          eq(financeBankAccounts.id, transaction[0].bankAccountId)
        );
        
        if (bankAccount[0]) {
          const currentBalance = parseFloat(bankAccount[0].currentBalance || "0");
          const txnAmount = parseFloat(transaction[0].amount || "0");
          let newBalance = currentBalance;
          
          // Reverse the transaction effect
          if (['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(transaction[0].transactionType)) {
            newBalance = currentBalance - txnAmount;
          } else if (['WITHDRAWAL', 'TRANSFER_OUT', 'BANK_CHARGE'].includes(transaction[0].transactionType)) {
            newBalance = currentBalance + txnAmount;
          }
          
          await db.update(financeBankAccounts)
            .set({
              currentBalance: String(newBalance),
              updatedBy: ctx.user?.id || null,
            })
            .where(eq(financeBankAccounts.id, transaction[0].bankAccountId));
        }
      }
      
      await db.update(financeCashTransactions)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(eq(financeCashTransactions.id, input.id));
      
      return { success: true };
    }),

  // ============================================================================
  // FUND BALANCES OPERATIONS
  // ============================================================================

  // Get all fund balances
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
          eq(financeFundBalances.isDeleted, false)
        )
      ).orderBy(financeFundBalances.fundName);
      
      if (input.fundType) {
        return results.filter((f: any) => f.fundType === input.fundType);
      }
      
      return results;
    }),

  // Get fund balance statistics
  getFundBalanceStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const all = await db.select().from(financeFundBalances).where(
        and(
          eq(financeFundBalances.organizationId, organizationId),
          eq(financeFundBalances.isDeleted, false)
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

  // Create fund balance
  createFundBalance: scopedProcedure
    .input(z.object({
      fundCode: z.string().min(1, "Fund code is required"),
      fundName: z.string().min(1, "Fund name is required"),
      fundNameAr: z.string().optional(),
      fundType: z.enum(['RESTRICTED', 'UNRESTRICTED', 'TEMPORARILY_RESTRICTED', 'DONOR_DESIGNATED']),
      currency: z.string().default("USD"),
      openingBalance: z.number().default(0),
      projectId: z.number().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      restrictionDetails: z.string().optional(),
      expirationDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check for duplicate fund code
      const existing = await db.select().from(financeFundBalances).where(
        and(
          eq(financeFundBalances.organizationId, organizationId),
          eq(financeFundBalances.fundCode, input.fundCode),
          eq(financeFundBalances.isDeleted, false)
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
        startDate: input.expirationDate ? new Date(input.expirationDate) : null,
        isActive: true,
        createdBy: ctx.user?.id || null,
      });
      
      return { success: true, insertId: result[0].insertId };
    }),

  // Update fund balance
  updateFundBalance: scopedProcedure
    .input(z.object({
      id: z.number(),
      fundName: z.string().optional(),
      fundNameAr: z.string().optional(),
      fundType: z.enum(['RESTRICTED', 'UNRESTRICTED', 'TEMPORARILY_RESTRICTED', 'DONOR_DESIGNATED']).optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      restrictionDetails: z.string().optional(),
      expirationDate: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, expirationDate, ...rest } = input;
      
      const updateData: any = { ...rest, updatedBy: ctx.user?.id || null };
      
      if (expirationDate) {
        updateData.expirationDate = new Date(expirationDate);
      }
      
      await db.update(financeFundBalances)
        .set(updateData)
        .where(and(
          eq(financeFundBalances.id, id),
          eq(financeFundBalances.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Adjust fund balance
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
      
      const currentBalance = parseFloat(fund[0].currentBalance || "0");
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

  // Delete fund balance (soft delete)
  deleteFundBalance: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeFundBalances)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id || null,
        })
        .where(and(
          eq(financeFundBalances.id, input.id),
          eq(financeFundBalances.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Bulk import fund balances
  bulkImportFundBalances: scopedProcedure
    .input(z.object({
      funds: z.array(z.object({
        fundCode: z.string(),
        fundName: z.string(),
        fundNameAr: z.string().optional(),
        fundType: z.enum(['RESTRICTED', 'UNRESTRICTED', 'TEMPORARILY_RESTRICTED', 'DONOR_DESIGNATED']),
        currency: z.string().optional(),
        openingBalance: z.number().optional(),
        description: z.string().optional(),
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
      
      for (let i = 0; i < input.funds.length; i++) {
        const fund = input.funds[i];
        const rowNum = i + 2;
        
        try {
          if (!fund.fundCode) {
            results.errors.push({
              row: rowNum,
              field: 'fundCode',
              message: 'Fund code is required',
              suggestedFix: 'Provide a unique fund code',
            });
            results.skipped++;
            continue;
          }
          
          if (!input.allowDuplicates) {
            const existing = await db.select().from(financeFundBalances).where(
              and(
                eq(financeFundBalances.organizationId, organizationId),
                eq(financeFundBalances.fundCode, fund.fundCode),
                eq(financeFundBalances.isDeleted, false)
              )
            );
            
            if (existing.length > 0) {
              results.errors.push({
                row: rowNum,
                field: 'fundCode',
                message: `Fund code ${fund.fundCode} already exists`,
                suggestedFix: 'Use a different fund code or enable "Allow duplicates"',
              });
              results.skipped++;
              continue;
            }
          }
          
          const balance = fund.openingBalance || 0;
          
          await db.insert(financeFundBalances).values({
            organizationId,
            fundCode: fund.fundCode,
            fundName: fund.fundName,
            fundNameAr: fund.fundNameAr || null,
            fundType: fund.fundType,
            currency: fund.currency || 'USD',
            totalBudget: String(balance),
            currentBalance: String(balance),
            notes: fund.description || null,
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
