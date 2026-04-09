/**
 * Cost Allocation Service
 * 
 * Handles the calculation and execution of cost allocations across projects.
 * Supports multiple allocation key types:
 * - Headcount: Distribute based on number of staff per project
 * - Budget Percentage: Distribute based on project budget as % of total
 * - Direct Costs: Distribute based on direct costs incurred per project
 * - Custom: User-defined percentages per project
 * - Equal: Distribute equally across all projects
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

interface AllocationBasis {
  projectId: number;
  projectName: string;
  projectNameAr?: string;
  basisValue: number; // Raw value (headcount, budget amount, direct costs)
  basisPercentage: number; // Calculated percentage
}

interface AllocationResult {
  projectId: number;
  projectName: string;
  projectNameAr?: string;
  allocationPercentage: number;
  allocatedAmount: number;
}

interface CostPoolTotal {
  costPoolId: number;
  poolName: string;
  poolNameAr?: string;
  totalAmount: number;
}

/**
 * Calculate allocation bases for headcount key
 * Distributes based on number of staff assigned to each project
 */
export async function calculateHeadcountBasis(
  organizationId: number,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<AllocationBasis[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Query to get headcount per project
  // This assumes you have a project_assignments or similar table
  // For now, we'll use a simplified query
  const result = await db.execute(sql`
    SELECT 
      p.id as projectId,
      p.titleEn as projectName,
      p.titleAr as projectNameAr,
      COUNT(DISTINCT pa.employeeId) as headcount
    FROM projects p
    LEFT JOIN project_assignments pa ON p.id = pa.projectId
      AND pa.startDate <= ${periodEndDate}
      AND (pa.endDate IS NULL OR pa.endDate >= ${periodStartDate})
    WHERE p.organizationId = ${organizationId}
      AND p.isDeleted = FALSE
      AND p.status IN ('active', 'in_progress')
    GROUP BY p.id, p.titleEn, p.titleAr
    HAVING headcount > 0
  `);

  const projects = result.rows as any[];
  const totalHeadcount = projects.reduce((sum, p) => sum + Number(p.headcount), 0);

  if (totalHeadcount === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No staff assigned to any projects in the selected period"
    });
  }

  return projects.map(p => ({
    projectId: p.projectId,
    projectName: p.projectName,
    projectNameAr: p.projectNameAr,
    basisValue: Number(p.headcount),
    basisPercentage: (Number(p.headcount) / totalHeadcount) * 100,
  }));
}

/**
 * Calculate allocation bases for budget percentage key
 * Distributes based on project budget as percentage of total
 */
export async function calculateBudgetPercentageBasis(
  organizationId: number,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<AllocationBasis[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Query to get total approved budget per project
  const result = await db.execute(sql`
    SELECT 
      p.id as projectId,
      p.titleEn as projectName,
      p.titleAr as projectNameAr,
      COALESCE(SUM(b.totalAmount), 0) as totalBudget
    FROM projects p
    LEFT JOIN budgets b ON p.id = b.projectId
      AND b.status = 'approved'
      AND b.isDeleted = FALSE
    WHERE p.organizationId = ${organizationId}
      AND p.isDeleted = FALSE
      AND p.status IN ('active', 'in_progress')
      AND p.startDate <= ${periodEndDate}
      AND (p.endDate IS NULL OR p.endDate >= ${periodStartDate})
    GROUP BY p.id, p.titleEn, p.titleAr
    HAVING totalBudget > 0
  `);

  const projects = result.rows as any[];
  const totalBudget = projects.reduce((sum, p) => sum + parseFloat(p.totalBudget || '0'), 0);

  if (totalBudget === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No approved budgets found for projects in the selected period"
    });
  }

  return projects.map(p => ({
    projectId: p.projectId,
    projectName: p.projectName,
    projectNameAr: p.projectNameAr,
    basisValue: parseFloat(p.totalBudget || '0'),
    basisPercentage: (parseFloat(p.totalBudget || '0') / totalBudget) * 100,
  }));
}

/**
 * Calculate allocation bases for direct costs key
 * Distributes based on actual direct costs incurred per project
 */
export async function calculateDirectCostsBasis(
  organizationId: number,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<AllocationBasis[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Query to get total direct costs (approved expenditures) per project
  const result = await db.execute(sql`
    SELECT 
      p.id as projectId,
      p.titleEn as projectName,
      p.titleAr as projectNameAr,
      COALESCE(SUM(e.amount), 0) as totalDirectCosts
    FROM projects p
    LEFT JOIN expenditures e ON p.id = e.projectId
      AND e.status IN ('APPROVED', 'PAID')
      AND e.isDeleted = FALSE
      AND e.expenditureDate >= ${periodStartDate}
      AND e.expenditureDate <= ${periodEndDate}
    WHERE p.organizationId = ${organizationId}
      AND p.isDeleted = FALSE
      AND p.status IN ('active', 'in_progress')
    GROUP BY p.id, p.titleEn, p.titleAr
    HAVING totalDirectCosts > 0
  `);

  const projects = result.rows as any[];
  const totalDirectCosts = projects.reduce((sum, p) => sum + parseFloat(p.totalDirectCosts || '0'), 0);

  if (totalDirectCosts === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No direct costs found for projects in the selected period"
    });
  }

  return projects.map(p => ({
    projectId: p.projectId,
    projectName: p.projectName,
    projectNameAr: p.projectNameAr,
    basisValue: parseFloat(p.totalDirectCosts || '0'),
    basisPercentage: (parseFloat(p.totalDirectCosts || '0') / totalDirectCosts) * 100,
  }));
}

/**
 * Calculate allocation bases for equal distribution
 * Distributes equally across all active projects
 */
export async function calculateEqualBasis(
  organizationId: number,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<AllocationBasis[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Query to get all active projects
  const result = await db.execute(sql`
    SELECT 
      p.id as projectId,
      p.titleEn as projectName,
      p.titleAr as projectNameAr
    FROM projects p
    WHERE p.organizationId = ${organizationId}
      AND p.isDeleted = FALSE
      AND p.status IN ('active', 'in_progress')
      AND p.startDate <= ${periodEndDate}
      AND (p.endDate IS NULL OR p.endDate >= ${periodStartDate})
  `);

  const projects = result.rows as any[];
  
  if (projects.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active projects found in the selected period"
    });
  }

  const equalPercentage = 100 / projects.length;

  return projects.map(p => ({
    projectId: p.projectId,
    projectName: p.projectName,
    projectNameAr: p.projectNameAr,
    basisValue: 1, // Each project counts as 1
    basisPercentage: equalPercentage,
  }));
}

/**
 * Calculate allocation bases based on key type
 */
export async function calculateAllocationBases(
  organizationId: number,
  allocationKeyType: 'headcount' | 'budget_percentage' | 'direct_costs' | 'equal' | 'custom',
  periodStartDate: Date,
  periodEndDate: Date,
  customBases?: AllocationBasis[]
): Promise<AllocationBasis[]> {
  switch (allocationKeyType) {
    case 'headcount':
      return await calculateHeadcountBasis(organizationId, periodStartDate, periodEndDate);
    
    case 'budget_percentage':
      return await calculateBudgetPercentageBasis(organizationId, periodStartDate, periodEndDate);
    
    case 'direct_costs':
      return await calculateDirectCostsBasis(organizationId, periodStartDate, periodEndDate);
    
    case 'equal':
      return await calculateEqualBasis(organizationId, periodStartDate, periodEndDate);
    
    case 'custom':
      if (!customBases || customBases.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Custom allocation bases must be provided"
        });
      }
      // Validate custom bases sum to 100%
      const totalPercentage = customBases.reduce((sum, b) => sum + b.basisPercentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Custom allocation percentages must sum to 100%. Current total: ${totalPercentage.toFixed(2)}%`
        });
      }
      return customBases;
    
    default:
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unsupported allocation key type: ${allocationKeyType}`
      });
  }
}

/**
 * Get cost pool totals for a period
 */
export async function getCostPoolTotals(
  organizationId: number,
  periodStartDate: Date,
  periodEndDate: Date,
  costPoolIds?: number[]
): Promise<CostPoolTotal[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = sql`
    SELECT 
      cp.id as costPoolId,
      cp.poolName,
      cp.poolNameAr,
      COALESCE(SUM(cpt.amount), 0) as totalAmount
    FROM cost_pools cp
    LEFT JOIN cost_pool_transactions cpt ON cp.id = cpt.costPoolId
      AND cpt.transactionDate >= ${periodStartDate}
      AND cpt.transactionDate <= ${periodEndDate}
    WHERE cp.organizationId = ${organizationId}
      AND cp.isActive = TRUE
      AND cp.deletedAt IS NULL
  `;

  if (costPoolIds && costPoolIds.length > 0) {
    query = sql`${query} AND cp.id IN (${sql.join(costPoolIds.map(id => sql`${id}`), sql`, `)})`;
  }

  query = sql`${query} GROUP BY cp.id, cp.poolName, cp.poolNameAr HAVING totalAmount > 0`;

  const result = await db.execute(query);
  
  return (result.rows as any[]).map(row => ({
    costPoolId: row.costPoolId,
    poolName: row.poolName,
    poolNameAr: row.poolNameAr,
    totalAmount: parseFloat(row.totalAmount || '0'),
  }));
}

/**
 * Execute allocation for a cost pool
 * Returns allocation results for each project
 */
export async function executeAllocation(
  costPool: CostPoolTotal,
  allocationBases: AllocationBasis[]
): Promise<AllocationResult[]> {
  return allocationBases.map(basis => ({
    projectId: basis.projectId,
    projectName: basis.projectName,
    projectNameAr: basis.projectNameAr,
    allocationPercentage: basis.basisPercentage,
    allocatedAmount: (costPool.totalAmount * basis.basisPercentage) / 100,
  }));
}

/**
 * Save allocation results to database
 */
export async function saveAllocationResults(
  organizationId: number,
  allocationPeriodId: number,
  costPoolId: number,
  allocationKeyId: number,
  totalPoolAmount: number,
  results: AllocationResult[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert allocation results
  const values = results.map(r => ({
    organizationId,
    allocationPeriodId,
    costPoolId,
    projectId: r.projectId,
    allocationKeyId,
    totalPoolAmount: totalPoolAmount.toFixed(2),
    allocationPercentage: r.allocationPercentage.toFixed(2),
    allocatedAmount: r.allocatedAmount.toFixed(2),
  }));

  for (const value of values) {
    await db.execute(sql`
      INSERT INTO allocation_results 
        (organizationId, allocationPeriodId, costPoolId, projectId, allocationKeyId, 
         totalPoolAmount, allocationPercentage, allocatedAmount)
      VALUES 
        (${value.organizationId}, ${value.allocationPeriodId}, ${value.costPoolId}, 
         ${value.projectId}, ${value.allocationKeyId}, ${value.totalPoolAmount}, 
         ${value.allocationPercentage}, ${value.allocatedAmount})
      ON DUPLICATE KEY UPDATE
        totalPoolAmount = ${value.totalPoolAmount},
        allocationPercentage = ${value.allocationPercentage},
        allocatedAmount = ${value.allocatedAmount},
        updatedAt = CURRENT_TIMESTAMP
    `);
  }
}

/**
 * Save allocation bases to database
 */
export async function saveAllocationBases(
  organizationId: number,
  allocationPeriodId: number,
  allocationKeyId: number,
  bases: AllocationBasis[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert allocation bases
  for (const basis of bases) {
    await db.execute(sql`
      INSERT INTO allocation_bases 
        (organizationId, allocationPeriodId, projectId, allocationKeyId, basisValue, basisPercentage)
      VALUES 
        (${organizationId}, ${allocationPeriodId}, ${basis.projectId}, ${allocationKeyId}, 
         ${basis.basisValue}, ${basis.basisPercentage})
      ON DUPLICATE KEY UPDATE
        basisValue = ${basis.basisValue},
        basisPercentage = ${basis.basisPercentage},
        updatedAt = CURRENT_TIMESTAMP
    `);
  }
}
