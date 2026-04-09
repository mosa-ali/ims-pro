/**
 * Helper function to sync activity.actualSpent and activity.progressPercentage
 * with data from budget_items
 * 
 * This ensures data consistency across all tabs that display activity metrics.
 * Called after any budget item create/update/delete operation.
 */

import { getDb } from "../db";
import { budgetItems, activities } from "../../drizzle/schema";
import { eq, sql, and, isNull } from "drizzle-orm";

export async function syncActivitySpent(activityId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[syncActivitySpent] Database not available");
    return;
  }

  try {
    // Get activity details first
    const [activity] = await db
      .select({
        id: activities.id,
        budgetAllocated: activities.budgetAllocated,
      })
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!activity) {
      console.warn(`[syncActivitySpent] Activity ${activityId} not found`);
      return;
    }

    // Calculate sum of actualSpent from all non-deleted budget items for this activity
    const [result] = await db
      .select({
        totalSpent: sql<number>`COALESCE(SUM(${budgetItems.actualSpent}), 0)`,
      })
      .from(budgetItems)
      .where(
        and(
          eq(budgetItems.activityId, activityId),
          eq(budgetItems.isDeleted, false)
        )
      );

    const totalSpent = result?.totalSpent || 0;

    // Calculate progress percentage based on budget utilization
    const budgetAllocated = parseFloat(activity.budgetAllocated || '0');
    let progressPercentage = '0.00';
    
    if (budgetAllocated > 0) {
      const percentage = Math.min((totalSpent / budgetAllocated) * 100, 100);
      progressPercentage = percentage.toFixed(2);
    }

    // Update activity with calculated values
    await db
      .update(activities)
      .set({
        actualSpent: totalSpent.toFixed(2),
        progressPercentage: progressPercentage,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, activityId));

    console.log(`[syncActivitySpent] Updated activity ${activityId}: spent=${totalSpent.toFixed(2)}, progress=${progressPercentage}%`);
  } catch (error) {
    console.error(`[syncActivitySpent] Error syncing activity ${activityId}:`, error);
  }
}
