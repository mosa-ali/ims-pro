/**
 * Helper function to sync project.spent with sum of budget_items.actualSpent
 * 
 * This ensures data consistency across all tabs that display spent amounts.
 * Called after any budget item create/update/delete operation.
 */

import { getDb } from "../db";
import { budgetItems, projects } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export async function syncProjectSpent(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[syncProjectSpent] Database not available");
    return;
  }

  try {
    // Calculate sum of actualSpent from all budget items for this project
    const [result] = await db
      .select({
        totalSpent: sql<number>`COALESCE(SUM(${budgetItems.actualSpent}), 0)`,
      })
      .from(budgetItems)
      .where(eq(budgetItems.projectId, projectId));

    const totalSpent = result?.totalSpent || 0;

    // Update project.spent with the calculated sum
    await db
      .update(projects)
      .set({
        spent: totalSpent,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    console.log(`[syncProjectSpent] Updated project ${projectId} spent to ${totalSpent}`);
  } catch (error) {
    console.error(`[syncProjectSpent] Error syncing project ${projectId}:`, error);
  }
}
