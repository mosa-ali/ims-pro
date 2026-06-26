import { NextRequest, NextResponse } from 'next/server';
import { BudgetSyncService } from '@shared/services/BudgetSyncService';
import { recalculateFinancialsInputSchema } from '@shared/types/budgetSync';

/**
 * POST /api/budgets/[id]/recalculate
 * 
 * Recalculate all financial summary metrics
 * Calculates: totalBudget, totalSpent, burnRate, variance
 * 
 * Request body:
 * {
 *   budgetId: number,
 *   projectId: number
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Parse and validate input
    const validation = recalculateFinancialsInputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { budgetId, projectId } = validation.data;

    // Call service
    const result = await BudgetSyncService.recalculateFinancialSummary(
      budgetId,
      projectId
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Recalculate financials error:', errorMsg);

    return NextResponse.json(
      {
        error: 'Failed to recalculate financial summary',
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
