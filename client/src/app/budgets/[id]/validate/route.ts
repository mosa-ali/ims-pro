import { NextRequest, NextResponse } from 'next/server';
import { BudgetSyncService } from '@shared/services/BudgetSyncService';
import { validateBudgetInputSchema } from '@shared/types/budgetSync';

/**
 * GET /api/budgets/[id]/validate
 * POST /api/budgets/[id]/validate
 * 
 * Validate budget integrity and data consistency
 * 
 * Query params or request body:
 * {
 *   budgetId: number
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const budgetId = request.nextUrl.searchParams.get('budgetId');

    if (!budgetId) {
      return NextResponse.json(
        { error: 'budgetId parameter required' },
        { status: 400 }
      );
    }

    // Parse and validate input
    const validation = validateBudgetInputSchema.safeParse({
      budgetId: parseInt(budgetId, 10),
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { budgetId: budgetIdNum } = validation.data;

    // Call service
    const result = await BudgetSyncService.validateBudgetIntegrity(budgetIdNum);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Validate budget error:', errorMsg);

    return NextResponse.json(
      {
        isValid: false,
        errors: [errorMsg],
        warnings: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Parse and validate input
    const validation = validateBudgetInputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { budgetId } = validation.data;

    // Call service
    const result = await BudgetSyncService.validateBudgetIntegrity(budgetId);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Validate budget error:', errorMsg);

    return NextResponse.json(
      {
        isValid: false,
        errors: [errorMsg],
        warnings: [],
      },
      { status: 500 }
    );
  }
}
