import { NextRequest, NextResponse } from 'next/server';
import { BudgetSyncService } from '@shared/services/BudgetSyncService';
import { syncExpensesInputSchema } from '@shared/types/budgetSync';

/**
 * POST /api/budgets/[id]/sync-expenses
 * 
 * Sync expenses to budget items with cascading updates
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
    const validation = syncExpensesInputSchema.safeParse(body);
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
    const result = await BudgetSyncService.syncExpenses(budgetId, projectId);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Sync expenses error:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to sync expenses',
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
