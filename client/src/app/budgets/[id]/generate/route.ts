import { NextRequest, NextResponse } from 'next/server';
import { BudgetSyncService } from '@shared/services/BudgetSyncService';
import { generateProjectBudgetInputSchema } from '@shared/types/budgetSync';

/**
 * POST /api/budgets/[id]/generate
 * 
 * Generate project budget from approved budget lines
 * 
 * Request body:
 * {
 *   budgetId: number,
 *   projectId: number,
 *   mode: 'create_missing' | 'synchronize_existing' | 'full_regeneration'
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Parse and validate input
    const validation = generateProjectBudgetInputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { budgetId, projectId, mode } = validation.data;

    // Call service
    const result = await BudgetSyncService.generateProjectBudget(
      budgetId,
      projectId,
      mode
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Generate budget error:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate budget',
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
