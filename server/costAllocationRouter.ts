import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  costPools,
  allocationKeys,
  allocationRules,
  allocationPeriods,
  allocationBases,
  allocationResults,
  costPoolTransactions,
  projects,
  chartOfAccounts,
  journalEntries,
  journalLines,
  allocationTemplates,
  allocationTemplateRules,
  allocationReversals,
  budgetReallocations,
  budgetReallocationLines,
  budgetItems,
  financeExchangeRates,
} from "../drizzle/schema";
import { eq, and, isNull, desc, sql, gte, lte } from "drizzle-orm";

// ============================================
// COST ALLOCATION ROUTER
// ============================================

export const costAllocationRouter = router({
  // ============================================
  // COST POOLS CRUD
  // ============================================
  
  listCostPools: scopedProcedure
    .input(z.object({
      includeDeleted: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [eq(costPools.organizationId, organizationId)];
      
      if (operatingUnitId) {
        conditions.push(eq(costPools.operatingUnitId, operatingUnitId));
      }
      
      if (!input.includeDeleted) {
        conditions.push(isNull(costPools.deletedAt));
      }
      
      const result = await db
        .select()
        .from(costPools)
        .where(and(...conditions))
        .orderBy(desc(costPools.createdAt));
      
      return result;
    }),

  getCostPool: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const result = await db
        .select()
        .from(costPools)
        .where(eq(costPools.id, input.id))
        .limit(1);
      
      return result[0] || null;
    }),

  createCostPool: scopedProcedure
    .input(z.object({
      poolCode: z.string().min(1).max(50),
      poolName: z.string().min(1).max(255),
      description: z.string().optional(),
      poolType: z.enum(["overhead", "shared_service", "administrative", "facility", "other"]).optional(),
      glAccountId: z.number().optional(),
      isActive: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const result = await db.insert(costPools).values({
        organizationId,
        operatingUnitId,
        ...input,
        createdBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  updateCostPool: scopedProcedure
    .input(z.object({
      id: z.number(),
      poolCode: z.string().min(1).max(50).optional(),
      poolName: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      poolType: z.enum(["overhead", "shared_service", "administrative", "facility", "other"]).optional(),
      glAccountId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...updateData } = input;
      await db
        .update(costPools)
        .set({ ...updateData, updatedBy: ctx.user.id })
        .where(eq(costPools.id, id));
      return { success: true };
    }),

  deleteCostPool: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Soft delete
      await db
        .update(costPools)
        .set({ deletedAt: new Date(), deletedBy: ctx.user.id })
        .where(eq(costPools.id, input.id));
      return { success: true };
    }),

  // ============================================
  // ALLOCATION KEYS CRUD
  // ============================================
  
  listAllocationKeys: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const result = await db
        .select()
        .from(allocationKeys)
        .where(eq(allocationKeys.organizationId, organizationId))
        .orderBy(desc(allocationKeys.createdAt));
      
      return result;
    }),

  createAllocationKey: scopedProcedure
    .input(z.object({
      keyCode: z.string().min(1).max(50),
      keyName: z.string().min(1).max(255),
      keyType: z.enum(["headcount", "budget_percentage", "direct_costs", "custom", "equal", "revenue"]).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const result = await db.insert(allocationKeys).values({
        organizationId,
        ...input,
        createdBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  updateAllocationKey: scopedProcedure
    .input(z.object({
      id: z.number(),
      keyCode: z.string().min(1).max(50).optional(),
      keyName: z.string().min(1).max(255).optional(),
      keyType: z.enum(["headcount", "budget_percentage", "direct_costs", "custom", "equal", "revenue"]).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...updateData } = input;
      await db
        .update(allocationKeys)
        .set({ ...updateData, updatedBy: ctx.user.id })
        .where(eq(allocationKeys.id, id));
      return { success: true };
    }),

  deleteAllocationKey: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      // Hard delete for allocation keys (no soft delete column)
      await db.delete(allocationKeys).where(eq(allocationKeys.id, input.id));
      return { success: true };
    }),

  // ============================================
  // ALLOCATION RULES CRUD
  // ============================================
  
  listAllocationRules: scopedProcedure
    .input(z.object({
      costPoolId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const conditions = [eq(allocationRules.organizationId, organizationId)];
      
      if (input.costPoolId) {
        conditions.push(eq(allocationRules.costPoolId, input.costPoolId));
      }
      
      const result = await db
        .select({
          rule: allocationRules,
          costPool: costPools,
          allocationKey: allocationKeys,
        })
        .from(allocationRules)
        .leftJoin(costPools, eq(allocationRules.costPoolId, costPools.id))
        .leftJoin(allocationKeys, eq(allocationRules.allocationKeyId, allocationKeys.id))
        .where(and(...conditions))
        .orderBy(desc(allocationRules.createdAt));
      
      return result;
    }),

  createAllocationRule: scopedProcedure
    .input(z.object({
      costPoolId: z.number(),
      allocationKeyId: z.number(),
      effectiveFrom: z.string(),
      effectiveTo: z.string().optional(),
      isActive: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const result = await db.insert(allocationRules).values({
        organizationId,
        ...input,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        createdBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  updateAllocationRule: scopedProcedure
    .input(z.object({
      id: z.number(),
      costPoolId: z.number().optional(),
      allocationKeyId: z.number().optional(),
      effectiveFrom: z.string().optional(),
      effectiveTo: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, effectiveFrom, effectiveTo, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest, updatedBy: ctx.user.id };
      
      if (effectiveFrom) {
        updateData.effectiveFrom = new Date(effectiveFrom);
      }
      if (effectiveTo !== undefined) {
        updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;
      }
      
      await db
        .update(allocationRules)
        .set(updateData)
        .where(eq(allocationRules.id, id));
      return { success: true };
    }),

  deleteAllocationRule: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(allocationRules).where(eq(allocationRules.id, input.id));
      return { success: true };
    }),

  // ============================================
  // ALLOCATION PERIODS CRUD
  // ============================================
  
  listAllocationPeriods: scopedProcedure
    .input(z.object({
      status: z.enum(["draft", "in_progress", "completed", "reversed"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const conditions = [eq(allocationPeriods.organizationId, organizationId)];
      
      if (input.status) {
        conditions.push(eq(allocationPeriods.status, input.status));
      }
      
      const result = await db
        .select()
        .from(allocationPeriods)
        .where(and(...conditions))
        .orderBy(desc(allocationPeriods.startDate));
      
      return result;
    }),

  createAllocationPeriod: scopedProcedure
    .input(z.object({
      periodCode: z.string().min(1).max(50),
      periodName: z.string().min(1).max(255),
      periodType: z.enum(["monthly", "quarterly", "annual", "custom"]).optional(),
      startDate: z.string(),
      endDate: z.string(),
      fiscalYearId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const result = await db.insert(allocationPeriods).values({
        organizationId,
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "draft",
        createdBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  updateAllocationPeriod: scopedProcedure
    .input(z.object({
      id: z.number(),
      periodCode: z.string().min(1).max(50).optional(),
      periodName: z.string().min(1).max(255).optional(),
      periodType: z.enum(["monthly", "quarterly", "annual", "custom"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      fiscalYearId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, startDate, endDate, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest, updatedBy: ctx.user.id };
      
      if (startDate) {
        updateData.startDate = new Date(startDate);
      }
      if (endDate) {
        updateData.endDate = new Date(endDate);
      }
      
      await db
        .update(allocationPeriods)
        .set(updateData)
        .where(eq(allocationPeriods.id, id));
      return { success: true };
    }),

  deleteAllocationPeriod: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      // Only allow deletion of draft periods
      await db
        .delete(allocationPeriods)
        .where(and(
          eq(allocationPeriods.id, input.id),
          eq(allocationPeriods.status, "draft")
        ));
      return { success: true };
    }),

  // ============================================
  // COST POOL TRANSACTIONS
  // ============================================
  
  listCostPoolTransactions: scopedProcedure
    .input(z.object({
      costPoolId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const conditions = [eq(costPoolTransactions.organizationId, organizationId)];
      
      if (input.costPoolId) {
        conditions.push(eq(costPoolTransactions.costPoolId, input.costPoolId));
      }
      if (input.startDate) {
        conditions.push(gte(costPoolTransactions.transactionDate, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(costPoolTransactions.transactionDate, new Date(input.endDate)));
      }
      
      const result = await db
        .select({
          transaction: costPoolTransactions,
          costPool: costPools,
        })
        .from(costPoolTransactions)
        .leftJoin(costPools, eq(costPoolTransactions.costPoolId, costPools.id))
        .where(and(...conditions))
        .orderBy(desc(costPoolTransactions.transactionDate));
      
      return result;
    }),

  createCostPoolTransaction: scopedProcedure
    .input(z.object({
      costPoolId: z.number(),
      transactionDate: z.string(),
      amount: z.number(),
      description: z.string().optional(),
      sourceModule: z.enum(["manual", "expense", "payment", "journal_entry", "import"]).optional(),
      sourceDocumentId: z.number().optional(),
      sourceDocumentType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const result = await db.insert(costPoolTransactions).values({
        organizationId,
        ...input,
        transactionDate: new Date(input.transactionDate),
        amount: String(input.amount),
        createdBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  // ============================================
  // ALLOCATION EXECUTION
  // ============================================
  
  calculateAllocationBases: scopedProcedure
    .input(z.object({
      allocationPeriodId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Get the period
      const period = await db
        .select()
        .from(allocationPeriods)
        .where(eq(allocationPeriods.id, input.allocationPeriodId))
        .limit(1);
      
      if (!period[0]) {
        throw new Error("Allocation period not found");
      }
      
      // Get all active projects for the organization
      const activeProjects = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.organizationId, organizationId),
          eq(projects.isDeleted, false)
        ));
      
      // Get all active allocation keys
      const keys = await db
        .select()
        .from(allocationKeys)
        .where(and(
          eq(allocationKeys.organizationId, organizationId),
          eq(allocationKeys.isActive, true)
        ));
      
      // Clear existing bases for this period
      await db
        .delete(allocationBases)
        .where(eq(allocationBases.allocationPeriodId, input.allocationPeriodId));
      
      // Calculate bases for each project and key
      const basesData: Array<{
        organizationId: number;
        allocationPeriodId: number;
        projectId: number;
        allocationKeyId: number;
        basisValue: string;
        basisPercentage: string;
      }> = [];
      
      for (const key of keys) {
        let totalBasis = 0;
        const projectBases: Array<{ projectId: number; value: number }> = [];
        
        for (const project of activeProjects) {
          let basisValue = 0;
          
          switch (key.keyType) {
            case "budget_percentage":
              // Use project budget as basis
              basisValue = Number(project.totalBudget) || 0;
              break;
            case "equal":
              // Equal distribution
              basisValue = 1;
              break;
            case "headcount":
              // Would need staff count - using 1 as placeholder
              basisValue = 1;
              break;
            case "direct_costs":
              // Would need actual expenditure data - using budget as proxy
              basisValue = Number(project.totalBudget) || 0;
              break;
            default:
              basisValue = 1;
          }
          
          projectBases.push({ projectId: project.id, value: basisValue });
          totalBasis += basisValue;
        }
        
        // Calculate percentages and create base records
        for (const pb of projectBases) {
          const percentage = totalBasis > 0 ? (pb.value / totalBasis) * 100 : 0;
          basesData.push({
            organizationId,
            allocationPeriodId: input.allocationPeriodId,
            projectId: pb.projectId,
            allocationKeyId: key.id,
            basisValue: String(pb.value),
            basisPercentage: String(percentage.toFixed(2)),
          });
        }
      }
      
      if (basesData.length > 0) {
        await db.insert(allocationBases).values(basesData);
      }
      
      return { success: true, basesCalculated: basesData.length };
    }),

  executeAllocation: scopedProcedure
    .input(z.object({
      allocationPeriodId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Get the period
      const period = await db
        .select()
        .from(allocationPeriods)
        .where(eq(allocationPeriods.id, input.allocationPeriodId))
        .limit(1);
      
      if (!period[0]) {
        throw new Error("Allocation period not found");
      }
      
      if (period[0].status === "completed") {
        throw new Error("Allocation period already completed");
      }
      
      // Update period status to in_progress
      await db
        .update(allocationPeriods)
        .set({ status: "in_progress" })
        .where(eq(allocationPeriods.id, input.allocationPeriodId));
      
      // Get all active rules with their cost pools and keys
      const rules = await db
        .select({
          rule: allocationRules,
          costPool: costPools,
          allocationKey: allocationKeys,
        })
        .from(allocationRules)
        .leftJoin(costPools, eq(allocationRules.costPoolId, costPools.id))
        .leftJoin(allocationKeys, eq(allocationRules.allocationKeyId, allocationKeys.id))
        .where(and(
          eq(allocationRules.organizationId, organizationId),
          eq(allocationRules.isActive, true)
        ));
      
      // Get allocation bases for this period
      const bases = await db
        .select()
        .from(allocationBases)
        .where(eq(allocationBases.allocationPeriodId, input.allocationPeriodId));
      
      // Clear existing results for this period
      await db
        .delete(allocationResults)
        .where(eq(allocationResults.allocationPeriodId, input.allocationPeriodId));
      
      const resultsData: Array<{
        organizationId: number;
        allocationPeriodId: number;
        costPoolId: number;
        projectId: number;
        allocationKeyId: number;
        totalPoolAmount: string;
        allocationPercentage: string;
        allocatedAmount: string;
      }> = [];
      
      for (const { rule, costPool } of rules) {
        if (!costPool) continue;
        
        // Get total pool amount from transactions
        const poolTransactions = await db
          .select({
            total: sql<string>`COALESCE(SUM(amount), 0)`,
          })
          .from(costPoolTransactions)
          .where(and(
            eq(costPoolTransactions.costPoolId, costPool.id),
            gte(costPoolTransactions.transactionDate, period[0].startDate!),
            lte(costPoolTransactions.transactionDate, period[0].endDate!)
          ));
        
        const totalPoolAmount = Number(poolTransactions[0]?.total) || 0;
        
        // Get bases for this allocation key
        const keyBases = bases.filter(b => b.allocationKeyId === rule.allocationKeyId);
        
        for (const base of keyBases) {
          const percentage = Number(base.basisPercentage) || 0;
          const allocatedAmount = (totalPoolAmount * percentage) / 100;
          
          resultsData.push({
            organizationId,
            allocationPeriodId: input.allocationPeriodId,
            costPoolId: costPool.id,
            projectId: base.projectId,
            allocationKeyId: rule.allocationKeyId,
            totalPoolAmount: String(totalPoolAmount),
            allocationPercentage: String(percentage.toFixed(2)),
            allocatedAmount: String(allocatedAmount.toFixed(2)),
          });
        }
      }
      
      if (resultsData.length > 0) {
        await db.insert(allocationResults).values(resultsData);
      }
      
      // ============================================
      // GENERATE JOURNAL ENTRIES FOR ALLOCATIONS
      // ============================================
      
      // Group results by project to create one journal entry per project
      const resultsByProject = new Map<number, typeof resultsData>();
      for (const result of resultsData) {
        const existing = resultsByProject.get(result.projectId) || [];
        existing.push(result);
        resultsByProject.set(result.projectId, existing);
      }
      
      const journalEntryIds: number[] = [];
      
      // Generate entry number prefix
      const entryPrefix = `ALLOC-${period[0].periodCode || period[0].id}`;
      let entryCounter = 1;
      
      for (const [projectId, projectResults] of resultsByProject) {
        const totalAllocated = projectResults.reduce(
          (sum, r) => sum + Number(r.allocatedAmount),
          0
        );
        
        if (totalAllocated <= 0) continue;
        
        // Create journal entry header
        const entryNumber = `${entryPrefix}-${String(entryCounter).padStart(3, '0')}`;
        const journalEntryResult = await db.insert(journalEntries).values({
          organizationId,
          entryNumber,
          entryDate: period[0].endDate!,
          entryType: 'standard',
          sourceModule: 'budget' as const,
          sourceDocumentId: input.allocationPeriodId,
          sourceDocumentType: 'cost_allocation',
          description: `Cost allocation for period ${period[0].periodCode || period[0].id}`,
          descriptionAr: `توزيع التكاليف للفترة ${period[0].periodCode || period[0].id}`,
          totalDebit: String(totalAllocated.toFixed(2)),
          totalCredit: String(totalAllocated.toFixed(2)),
          status: 'posted',
          postedAt: new Date(),
          postedBy: ctx.user.id,
          projectId,
          createdBy: ctx.user.id,
        });
        
        const journalEntryId = journalEntryResult[0].insertId;
        journalEntryIds.push(journalEntryId);
        entryCounter++;
        
        // Create journal lines
        const journalLinesData: Array<{
          organizationId: number;
          journalEntryId: number;
          lineNumber: number;
          glAccountId: number;
          description: string;
          descriptionAr: string;
          debitAmount: string;
          creditAmount: string;
          projectId: number;
        }> = [];
        
        let lineNumber = 1;
        
        // Debit lines - one per cost pool allocation (expense to project)
        for (const result of projectResults) {
          const pool = rules.find(r => r.costPool?.id === result.costPoolId)?.costPool;
          const glAccountId = pool?.glAccountId || 1;
          
          journalLinesData.push({
            organizationId,
            journalEntryId,
            lineNumber,
            glAccountId,
            description: `Allocated cost from pool: ${pool?.poolName || 'Unknown'}`,
            descriptionAr: `تكلفة موزعة من مجمع: ${pool?.poolName || 'غير معروف'}`,
            debitAmount: result.allocatedAmount,
            creditAmount: '0.00',
            projectId: result.projectId,
          });
          lineNumber++;
        }
        
        // Credit lines - one per cost pool (clearing the pool)
        const poolTotals = new Map<number, { amount: number; pool: typeof rules[0]['costPool'] }>();
        for (const result of projectResults) {
          const pool = rules.find(r => r.costPool?.id === result.costPoolId)?.costPool;
          const existing = poolTotals.get(result.costPoolId);
          if (existing) {
            existing.amount += Number(result.allocatedAmount);
          } else {
            poolTotals.set(result.costPoolId, { amount: Number(result.allocatedAmount), pool });
          }
        }
        
        for (const [poolId, { amount, pool }] of poolTotals) {
          const glAccountId = pool?.glAccountId || 1;
          
          journalLinesData.push({
            organizationId,
            journalEntryId,
            lineNumber,
            glAccountId,
            description: `Clear allocated cost from pool: ${pool?.poolName || 'Unknown'}`,
            descriptionAr: `تصفية التكلفة الموزعة من مجمع: ${pool?.poolName || 'غير معروف'}`,
            debitAmount: '0.00',
            creditAmount: String(amount.toFixed(2)),
            projectId,
          });
          lineNumber++;
        }
        
        if (journalLinesData.length > 0) {
          await db.insert(journalLines).values(journalLinesData);
        }
        
        // Update allocation results with journal entry ID
        for (const result of projectResults) {
          await db
            .update(allocationResults)
            .set({ journalEntryId })
            .where(and(
              eq(allocationResults.allocationPeriodId, input.allocationPeriodId),
              eq(allocationResults.projectId, result.projectId),
              eq(allocationResults.costPoolId, result.costPoolId)
            ));
        }
      }
      
      // Update period status to completed
      await db
        .update(allocationPeriods)
        .set({
          status: "completed",
          executedAt: new Date(),
          executedBy: ctx.user.id,
        })
        .where(eq(allocationPeriods.id, input.allocationPeriodId));
      
      return { 
        success: true, 
        resultsCreated: resultsData.length,
        journalEntriesCreated: journalEntryIds.length,
      };
    }),

  // ============================================
  // ALLOCATION RESULTS
  // ============================================
  
  listAllocationResults: scopedProcedure
    .input(z.object({
      allocationPeriodId: z.number().optional(),
      projectId: z.number().optional(),
      costPoolId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const conditions = [eq(allocationResults.organizationId, organizationId)];
      
      if (input.allocationPeriodId) {
        conditions.push(eq(allocationResults.allocationPeriodId, input.allocationPeriodId));
      }
      if (input.projectId) {
        conditions.push(eq(allocationResults.projectId, input.projectId));
      }
      if (input.costPoolId) {
        conditions.push(eq(allocationResults.costPoolId, input.costPoolId));
      }
      
      const result = await db
        .select({
          result: allocationResults,
          costPool: costPools,
          project: projects,
          allocationKey: allocationKeys,
          period: allocationPeriods,
        })
        .from(allocationResults)
        .leftJoin(costPools, eq(allocationResults.costPoolId, costPools.id))
        .leftJoin(projects, eq(allocationResults.projectId, projects.id))
        .leftJoin(allocationKeys, eq(allocationResults.allocationKeyId, allocationKeys.id))
        .leftJoin(allocationPeriods, eq(allocationResults.allocationPeriodId, allocationPeriods.id))
        .where(and(...conditions))
        .orderBy(desc(allocationResults.createdAt));
      
      return result;
    }),

  // ============================================
  // DASHBOARD STATISTICS
  // ============================================
  
  getDashboardStats: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Count cost pools
      const poolsCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(costPools)
        .where(and(
          eq(costPools.organizationId, organizationId),
          isNull(costPools.deletedAt)
        ));
      
      // Count allocation keys
      const keysCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(allocationKeys)
        .where(eq(allocationKeys.organizationId, organizationId));
      
      // Count active rules
      const rulesCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(allocationRules)
        .where(and(
          eq(allocationRules.organizationId, organizationId),
          eq(allocationRules.isActive, true)
        ));
      
      // Count completed periods
      const completedPeriods = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(allocationPeriods)
        .where(and(
          eq(allocationPeriods.organizationId, organizationId),
          eq(allocationPeriods.status, "completed")
        ));
      
      // Total allocated amount
      const totalAllocated = await db
        .select({ total: sql<string>`COALESCE(SUM(allocatedAmount), 0)` })
        .from(allocationResults)
        .where(eq(allocationResults.organizationId, organizationId));
      
      return {
        costPoolsCount: Number(poolsCount[0]?.count) || 0,
        allocationKeysCount: Number(keysCount[0]?.count) || 0,
        activeRulesCount: Number(rulesCount[0]?.count) || 0,
        completedPeriodsCount: Number(completedPeriods[0]?.count) || 0,
        totalAllocatedAmount: Number(totalAllocated[0]?.total) || 0,
      };
    }),

  // ============================================
  // ALLOCATION REVERSAL
  // ============================================
  
  reverseAllocation: scopedProcedure
    .input(z.object({
      allocationPeriodId: z.number(),
      reversalReason: z.string().min(1),
      reversalReasonAr: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Get the period and verify it's completed
      const period = await db
        .select()
        .from(allocationPeriods)
        .where(eq(allocationPeriods.id, input.allocationPeriodId))
        .limit(1);
      
      if (!period[0]) {
        throw new Error("Allocation period not found");
      }
      
      if (period[0].status !== "completed") {
        throw new Error("Only completed allocations can be reversed");
      }
      
      // Get all allocation results for this period
      const results = await db
        .select({
          result: allocationResults,
          costPool: costPools,
          project: projects,
        })
        .from(allocationResults)
        .leftJoin(costPools, eq(allocationResults.costPoolId, costPools.id))
        .leftJoin(projects, eq(allocationResults.projectId, projects.id))
        .where(eq(allocationResults.allocationPeriodId, input.allocationPeriodId));
      
      if (results.length === 0) {
        throw new Error("No allocation results found for this period");
      }
      
      // Collect original journal entry IDs
      const originalJournalEntryIds = [...new Set(results.map(r => r.result.journalEntryId).filter(Boolean))];
      
      // Create reversing journal entries (one per project)
      const projectGroups = new Map<number, typeof results>();
      for (const r of results) {
        const projectId = r.result.projectId;
        if (!projectGroups.has(projectId)) {
          projectGroups.set(projectId, []);
        }
        projectGroups.get(projectId)!.push(r);
      }
      
      const reversalJournalEntryIds: number[] = [];
      let totalReversedAmount = 0;
      let entryCounter = 1;
      
      for (const [projectId, projectResults] of projectGroups) {
        const projectTotal = projectResults.reduce((sum, r) => sum + Number(r.result.allocatedAmount), 0);
        totalReversedAmount += projectTotal;
        
        // Create reversing journal entry
        const entryNumber = `REV-${period[0].periodCode}-${String(entryCounter).padStart(3, '0')}`;
        const [journalEntry] = await db.insert(journalEntries).values({
          organizationId,
          entryNumber,
          entryDate: new Date(),
          description: `Reversal of cost allocation for period: ${period[0].periodName}`,
          descriptionAr: `عكس توزيع التكاليف للفترة: ${period[0].periodName}`,
          status: "posted",
          sourceModule: "budget",
          sourceDocumentType: "cost_allocation_reversal",
          sourceDocumentId: input.allocationPeriodId,
          totalDebit: String(projectTotal.toFixed(2)),
          totalCredit: String(projectTotal.toFixed(2)),
          postedAt: new Date(),
          postedBy: ctx.user.id,
          createdBy: ctx.user.id,
        });
        
        const journalEntryId = journalEntry.insertId;
        reversalJournalEntryIds.push(journalEntryId);
        entryCounter++;
        
        // Create reversing journal lines (swap debit/credit)
        let lineNumber = 1;
        
        // Credit lines (reverse of original debits) - expense reduction
        for (const r of projectResults) {
          const glAccountId = r.costPool?.glAccountId || 1;
          await db.insert(journalLines).values({
            organizationId,
            journalEntryId,
            lineNumber,
            glAccountId,
            description: `Reversal: Allocated cost from pool: ${r.costPool?.poolName || 'Unknown'}`,
            descriptionAr: `عكس: تكلفة موزعة من مجمع: ${r.costPool?.poolName || 'غير معروف'}`,
            debitAmount: '0.00',
            creditAmount: String(Number(r.result.allocatedAmount).toFixed(2)),
            projectId: r.result.projectId,
          });
          lineNumber++;
        }
        
        // Debit lines (reverse of original credits) - restore pool balance
        const poolTotals = new Map<number, { amount: number; pool: typeof results[0]['costPool'] }>();
        for (const r of projectResults) {
          const existing = poolTotals.get(r.result.costPoolId);
          if (existing) {
            existing.amount += Number(r.result.allocatedAmount);
          } else {
            poolTotals.set(r.result.costPoolId, { amount: Number(r.result.allocatedAmount), pool: r.costPool });
          }
        }
        
        for (const [poolId, { amount, pool }] of poolTotals) {
          const glAccountId = pool?.glAccountId || 1;
          await db.insert(journalLines).values({
            organizationId,
            journalEntryId,
            lineNumber,
            glAccountId,
            description: `Reversal: Clear allocated cost from pool: ${pool?.poolName || 'Unknown'}`,
            descriptionAr: `عكس: تصفية التكلفة الموزعة من مجمع: ${pool?.poolName || 'غير معروف'}`,
            debitAmount: String(amount.toFixed(2)),
            creditAmount: '0.00',
            projectId,
          });
          lineNumber++;
        }
      }
      
      // Create reversal record
      await db.insert(allocationReversals).values({
        organizationId,
        allocationPeriodId: input.allocationPeriodId,
        reversalDate: new Date(),
        reversalReason: input.reversalReason,
        reversalReasonAr: input.reversalReasonAr,
        originalJournalEntryIds: JSON.stringify(originalJournalEntryIds),
        reversalJournalEntryIds: JSON.stringify(reversalJournalEntryIds),
        totalReversedAmount: String(totalReversedAmount.toFixed(2)),
        reversedBy: ctx.user.id,
      });
      
      // Update period status to reversed
      await db
        .update(allocationPeriods)
        .set({ status: "reversed" })
        .where(eq(allocationPeriods.id, input.allocationPeriodId));
      
      return {
        success: true,
        reversalJournalEntriesCreated: reversalJournalEntryIds.length,
        totalReversedAmount,
      };
    }),

  // ============================================
  // ALLOCATION TEMPLATES CRUD
  // ============================================
  
  listTemplates: scopedProcedure
    .input(z.object({
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const conditions = [eq(allocationTemplates.organizationId, organizationId)];
      
      if (input.isActive !== undefined) {
        conditions.push(eq(allocationTemplates.isActive, input.isActive));
      }
      
      const templates = await db
        .select()
        .from(allocationTemplates)
        .where(and(...conditions))
        .orderBy(desc(allocationTemplates.createdAt));
      
      // Get rules for each template
      const templatesWithRules = await Promise.all(
        templates.map(async (template) => {
          const rules = await db
            .select({
              rule: allocationTemplateRules,
              costPool: costPools,
              allocationKey: allocationKeys,
            })
            .from(allocationTemplateRules)
            .leftJoin(costPools, eq(allocationTemplateRules.costPoolId, costPools.id))
            .leftJoin(allocationKeys, eq(allocationTemplateRules.allocationKeyId, allocationKeys.id))
            .where(eq(allocationTemplateRules.templateId, template.id))
            .orderBy(allocationTemplateRules.priority);
          
          return { ...template, rules };
        })
      );
      
      return templatesWithRules;
    }),

  createTemplate: scopedProcedure
    .input(z.object({
      templateCode: z.string().min(1).max(50),
      templateName: z.string().min(1).max(255),
      templateNameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      periodType: z.enum(["monthly", "quarterly", "annual", "custom"]).optional(),
      rules: z.array(z.object({
        costPoolId: z.number(),
        allocationKeyId: z.number(),
        priority: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      const [template] = await db.insert(allocationTemplates).values({
        organizationId,
        templateCode: input.templateCode,
        templateName: input.templateName,
        templateNameAr: input.templateNameAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        periodType: input.periodType || "monthly",
        createdBy: ctx.user.id,
      });
      
      const templateId = template.insertId;
      
      // Create template rules if provided
      if (input.rules && input.rules.length > 0) {
        await db.insert(allocationTemplateRules).values(
          input.rules.map((rule, index) => ({
            organizationId,
            templateId,
            costPoolId: rule.costPoolId,
            allocationKeyId: rule.allocationKeyId,
            priority: rule.priority || index + 1,
          }))
        );
      }
      
      return { id: templateId };
    }),

  updateTemplate: scopedProcedure
    .input(z.object({
      id: z.number(),
      templateCode: z.string().min(1).max(50).optional(),
      templateName: z.string().min(1).max(255).optional(),
      templateNameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      periodType: z.enum(["monthly", "quarterly", "annual", "custom"]).optional(),
      isActive: z.boolean().optional(),
      rules: z.array(z.object({
        costPoolId: z.number(),
        allocationKeyId: z.number(),
        priority: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { id, rules, ...updateData } = input;
      
      await db
        .update(allocationTemplates)
        .set({ ...updateData, updatedBy: ctx.user.id })
        .where(eq(allocationTemplates.id, id));
      
      // Update rules if provided
      if (rules !== undefined) {
        // Get template to get organizationId
        const template = await db.select().from(allocationTemplates).where(eq(allocationTemplates.id, id)).limit(1);
        if (template[0]) {
          // Delete existing rules
          await db.delete(allocationTemplateRules).where(eq(allocationTemplateRules.templateId, id));
          
          // Insert new rules
          if (rules.length > 0) {
            await db.insert(allocationTemplateRules).values(
              rules.map((rule, index) => ({
                organizationId: template[0].organizationId,
                templateId: id,
                costPoolId: rule.costPoolId,
                allocationKeyId: rule.allocationKeyId,
                priority: rule.priority || index + 1,
              }))
            );
          }
        }
      }
      
      return { success: true };
    }),

  deleteTemplate: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Delete template rules first
      await db.delete(allocationTemplateRules).where(eq(allocationTemplateRules.templateId, input.id));
      
      // Delete template
      await db.delete(allocationTemplates).where(eq(allocationTemplates.id, input.id));
      
      return { success: true };
    }),

  applyTemplate: scopedProcedure
    .input(z.object({
      templateId: z.number(),
      periodCode: z.string().min(1).max(50),
      periodName: z.string().min(1).max(255),
      startDate: z.string(),
      endDate: z.string(),
      fiscalYearId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Get template with rules
      const template = await db
        .select()
        .from(allocationTemplates)
        .where(eq(allocationTemplates.id, input.templateId))
        .limit(1);
      
      if (!template[0]) {
        throw new Error("Template not found");
      }
      
      const templateRules = await db
        .select()
        .from(allocationTemplateRules)
        .where(eq(allocationTemplateRules.templateId, input.templateId));
      
      // Create allocation period
      const [period] = await db.insert(allocationPeriods).values({
        organizationId,
        periodCode: input.periodCode,
        periodName: input.periodName,
        periodType: template[0].periodType,
        startDate: input.startDate,
        endDate: input.endDate,
        fiscalYearId: input.fiscalYearId,
        status: "draft",
        createdBy: ctx.user.id,
      });
      
      const periodId = period.insertId;
      
      // Create allocation rules from template
      if (templateRules.length > 0) {
        await db.insert(allocationRules).values(
          templateRules.map(rule => ({
            organizationId,
            costPoolId: rule.costPoolId,
            allocationKeyId: rule.allocationKeyId,
            effectiveFrom: input.startDate,
            effectiveTo: input.endDate,
            isActive: true,
            createdBy: String(ctx.user.id),
          }))
        );
      }
      
      return { periodId, rulesCreated: templateRules.length };
    }),

  // ============================================
  // BUDGET REALLOCATION WORKFLOW
  // ============================================
  
  listBudgetReallocations: scopedProcedure
    .input(z.object({
      status: z.enum(["draft", "pending_approval", "approved", "rejected", "executed", "cancelled"]).optional(),
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const conditions = [eq(budgetReallocations.organizationId, organizationId)];
      
      if (input.status) {
        conditions.push(eq(budgetReallocations.status, input.status));
      }
      
      const reallocations = await db
        .select()
        .from(budgetReallocations)
        .where(and(...conditions))
        .orderBy(desc(budgetReallocations.createdAt));
      
      // Get lines for each reallocation
      const reallocationsWithLines = await Promise.all(
        reallocations.map(async (reallocation) => {
          const lines = await db
            .select({
              line: budgetReallocationLines,
              project: projects,
              budgetItem: budgetItems,
              glAccount: chartOfAccounts,
            })
            .from(budgetReallocationLines)
            .leftJoin(projects, eq(budgetReallocationLines.projectId, projects.id))
            .leftJoin(budgetItems, eq(budgetReallocationLines.budgetItemId, budgetItems.id))
            .leftJoin(chartOfAccounts, eq(budgetReallocationLines.glAccountId, chartOfAccounts.id))
            .where(eq(budgetReallocationLines.reallocationId, reallocation.id))
            .orderBy(budgetReallocationLines.lineNumber);
          
          return { ...reallocation, lines };
        })
      );
      
      return reallocationsWithLines;
    }),

  createBudgetReallocation: scopedProcedure
    .input(z.object({
      reallocationCode: z.string().min(1).max(50),
      reallocationDate: z.string(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      currency: z.string().optional(),
      justification: z.string().optional(),
      justificationAr: z.string().optional(),
      lines: z.array(z.object({
        lineType: z.enum(["source", "destination"]),
        projectId: z.number(),
        budgetItemId: z.number().optional(),
        glAccountId: z.number().optional(),
        amount: z.string(),
        currency: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Calculate total amount from source lines
      const totalAmount = input.lines
        .filter(l => l.lineType === "source")
        .reduce((sum, l) => sum + Number(l.amount), 0);
      
      // Get exchange rate if currency is not USD
      let exchangeRate = 1;
      let baseCurrencyAmount = totalAmount;
      
      if (input.currency && input.currency !== "USD") {
        const rate = await db
          .select()
          .from(financeExchangeRates)
          .where(and(
            eq(financeExchangeRates.organizationId, organizationId),
            eq(financeExchangeRates.fromCurrencyCode, input.currency),
            eq(financeExchangeRates.toCurrencyCode, "USD"),
            eq(financeExchangeRates.isDeleted, false)
          ))
          .orderBy(desc(financeExchangeRates.effectiveDate))
          .limit(1);
        
        if (rate[0]) {
          exchangeRate = Number(rate[0].rate);
          baseCurrencyAmount = totalAmount * exchangeRate;
        }
      }
      
      const [reallocation] = await db.insert(budgetReallocations).values({
        organizationId,
        reallocationCode: input.reallocationCode,
        reallocationDate: input.reallocationDate,
        description: input.description,
        descriptionAr: input.descriptionAr,
        totalAmount: String(totalAmount.toFixed(2)),
        currency: input.currency || "USD",
        exchangeRate: String(exchangeRate.toFixed(6)),
        baseCurrencyAmount: String(baseCurrencyAmount.toFixed(2)),
        justification: input.justification,
        justificationAr: input.justificationAr,
        status: "draft",
        createdBy: ctx.user.id,
      });
      
      const reallocationId = reallocation.insertId;
      
      // Create lines
      if (input.lines.length > 0) {
        await db.insert(budgetReallocationLines).values(
          input.lines.map((line, index) => ({
            organizationId,
            reallocationId,
            lineNumber: index + 1,
            lineType: line.lineType,
            projectId: line.projectId,
            budgetItemId: line.budgetItemId,
            glAccountId: line.glAccountId,
            amount: line.amount,
            currency: line.currency || input.currency || "USD",
            exchangeRate: String(exchangeRate.toFixed(6)),
            baseCurrencyAmount: String((Number(line.amount) * exchangeRate).toFixed(2)),
            description: line.description,
            descriptionAr: line.descriptionAr,
          }))
        );
      }
      
      return { id: reallocationId };
    }),

  updateBudgetReallocation: scopedProcedure
    .input(z.object({
      id: z.number(),
      reallocationDate: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      justification: z.string().optional(),
      justificationAr: z.string().optional(),
      lines: z.array(z.object({
        lineType: z.enum(["source", "destination"]),
        projectId: z.number(),
        budgetItemId: z.number().optional(),
        glAccountId: z.number().optional(),
        amount: z.string(),
        currency: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { id, lines, ...updateData } = input;
      
      // Check if reallocation is in draft status
      const existing = await db.select().from(budgetReallocations).where(eq(budgetReallocations.id, id)).limit(1);
      if (!existing[0] || existing[0].status !== "draft") {
        throw new Error("Only draft reallocations can be updated");
      }
      
      await db
        .update(budgetReallocations)
        .set({ ...updateData, updatedBy: ctx.user.id })
        .where(eq(budgetReallocations.id, id));
      
      // Update lines if provided
      if (lines !== undefined) {
        // Delete existing lines
        await db.delete(budgetReallocationLines).where(eq(budgetReallocationLines.reallocationId, id));
        
        // Recalculate total
        const totalAmount = lines
          .filter(l => l.lineType === "source")
          .reduce((sum, l) => sum + Number(l.amount), 0);
        
        await db
          .update(budgetReallocations)
          .set({ totalAmount: String(totalAmount.toFixed(2)) })
          .where(eq(budgetReallocations.id, id));
        
        // Insert new lines
        if (lines.length > 0) {
          await db.insert(budgetReallocationLines).values(
            lines.map((line, index) => ({
              organizationId: existing[0].organizationId,
              reallocationId: id,
              lineNumber: index + 1,
              lineType: line.lineType,
              projectId: line.projectId,
              budgetItemId: line.budgetItemId,
              glAccountId: line.glAccountId,
              amount: line.amount,
              currency: line.currency || existing[0].currency || "USD",
              exchangeRate: existing[0].exchangeRate || "1.000000",
              baseCurrencyAmount: String((Number(line.amount) * Number(existing[0].exchangeRate || 1)).toFixed(2)),
              description: line.description,
              descriptionAr: line.descriptionAr,
            }))
          );
        }
      }
      
      return { success: true };
    }),

  submitBudgetReallocation: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const existing = await db.select().from(budgetReallocations).where(eq(budgetReallocations.id, input.id)).limit(1);
      if (!existing[0] || existing[0].status !== "draft") {
        throw new Error("Only draft reallocations can be submitted");
      }
      
      await db
        .update(budgetReallocations)
        .set({
          status: "pending_approval",
          submittedAt: new Date(),
          submittedBy: ctx.user.id,
        })
        .where(eq(budgetReallocations.id, input.id));
      
      return { success: true };
    }),

  approveBudgetReallocation: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const existing = await db.select().from(budgetReallocations).where(eq(budgetReallocations.id, input.id)).limit(1);
      if (!existing[0] || existing[0].status !== "pending_approval") {
        throw new Error("Only pending reallocations can be approved");
      }
      
      await db
        .update(budgetReallocations)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: ctx.user.id,
        })
        .where(eq(budgetReallocations.id, input.id));
      
      return { success: true };
    }),

  rejectBudgetReallocation: scopedProcedure
    .input(z.object({
      id: z.number(),
      rejectionReason: z.string().min(1),
      rejectionReasonAr: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const existing = await db.select().from(budgetReallocations).where(eq(budgetReallocations.id, input.id)).limit(1);
      if (!existing[0] || existing[0].status !== "pending_approval") {
        throw new Error("Only pending reallocations can be rejected");
      }
      
      await db
        .update(budgetReallocations)
        .set({
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: ctx.user.id,
          rejectionReason: input.rejectionReason,
          rejectionReasonAr: input.rejectionReasonAr,
        })
        .where(eq(budgetReallocations.id, input.id));
      
      return { success: true };
    }),

  executeBudgetReallocation: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const existing = await db.select().from(budgetReallocations).where(eq(budgetReallocations.id, input.id)).limit(1);
      if (!existing[0] || existing[0].status !== "approved") {
        throw new Error("Only approved reallocations can be executed");
      }
      
      // Get lines
      const lines = await db
        .select({
          line: budgetReallocationLines,
          project: projects,
          budgetItem: budgetItems,
        })
        .from(budgetReallocationLines)
        .leftJoin(projects, eq(budgetReallocationLines.projectId, projects.id))
        .leftJoin(budgetItems, eq(budgetReallocationLines.budgetItemId, budgetItems.id))
        .where(eq(budgetReallocationLines.reallocationId, input.id));
      
      // Create journal entry
      const entryNumber = `REALLOC-${existing[0].reallocationCode}`;
      const [journalEntry] = await db.insert(journalEntries).values({
        organizationId: existing[0].organizationId,
        entryNumber,
        entryDate: new Date(),
        description: `Budget Reallocation: ${existing[0].description || existing[0].reallocationCode}`,
        descriptionAr: `إعادة توزيع الميزانية: ${existing[0].descriptionAr || existing[0].reallocationCode}`,
        status: "posted",
        sourceModule: "budget",
        sourceDocumentType: "budget_reallocation",
        sourceDocumentId: input.id,
        totalDebit: existing[0].baseCurrencyAmount,
        totalCredit: existing[0].baseCurrencyAmount,
        currency: existing[0].currency,
        exchangeRate: existing[0].exchangeRate,
        postedAt: new Date(),
        postedBy: ctx.user.id,
        createdBy: ctx.user.id,
      });
      
      const journalEntryId = journalEntry.insertId;
      
      // Create journal lines
      let lineNumber = 1;
      for (const { line, project, budgetItem } of lines) {
        const glAccountId = line.glAccountId || budgetItem?.glAccountId || 1;
        const isSource = line.lineType === "source";
        
        await db.insert(journalLines).values({
          organizationId: existing[0].organizationId,
          journalEntryId,
          lineNumber,
          glAccountId,
          description: `${isSource ? 'From' : 'To'}: ${project?.title || 'Unknown'} - ${line.description || ''}`,
          descriptionAr: `${isSource ? 'من' : 'إلى'}: ${project?.title || 'غير معروف'} - ${line.descriptionAr || ''}`,
          debitAmount: isSource ? '0.00' : line.baseCurrencyAmount,
          creditAmount: isSource ? line.baseCurrencyAmount : '0.00',
          projectId: line.projectId,
          currency: line.currency,
          exchangeRate: line.exchangeRate,
        });
        lineNumber++;
        
        // Update budget item amounts
        if (line.budgetItemId) {
          const budgetItemRecord = await db.select().from(budgetItems).where(eq(budgetItems.id, line.budgetItemId)).limit(1);
          if (budgetItemRecord[0]) {
            const currentAmount = Number(budgetItemRecord[0].budgetedAmount || 0);
            const changeAmount = Number(line.baseCurrencyAmount);
            const newAmount = isSource ? currentAmount - changeAmount : currentAmount + changeAmount;
            
            await db
              .update(budgetItems)
              .set({ budgetedAmount: String(newAmount.toFixed(2)) })
              .where(eq(budgetItems.id, line.budgetItemId));
          }
        }
      }
      
      // Update reallocation status
      await db
        .update(budgetReallocations)
        .set({
          status: "executed",
          executedAt: new Date(),
          executedBy: ctx.user.id,
          journalEntryId,
        })
        .where(eq(budgetReallocations.id, input.id));
      
      return { success: true, journalEntryId };
    }),

  deleteBudgetReallocation: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const existing = await db.select().from(budgetReallocations).where(eq(budgetReallocations.id, input.id)).limit(1);
      if (!existing[0] || existing[0].status !== "draft") {
        throw new Error("Only draft reallocations can be deleted");
      }
      
      // Delete lines first
      await db.delete(budgetReallocationLines).where(eq(budgetReallocationLines.reallocationId, input.id));
      
      // Delete reallocation
      await db.delete(budgetReallocations).where(eq(budgetReallocations.id, input.id));
      
      return { success: true };
    }),
});

export type CostAllocationRouter = typeof costAllocationRouter;
