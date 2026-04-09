import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  budgetItems,
  forecastPlan,
  expenses,
  forecastAuditLog,
  projects,
  activities,
} from "../drizzle/schema";
import { protectedProcedure, scopedProcedure, router } from "./_core/trpc";

/**
 * Forecast Plan Router
 * Handles all forecast planning operations with donor-grade compliance
 * 
 * PLATFORM-LEVEL ISOLATION: Uses scopedProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */

export const forecastRouter = router({
  /**
   * Get all budget items for a project (Financial Overview data)
   * Includes Activity Code and Activity Name from linked activity
   */
  getBudgetItems: scopedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { organizationId } = ctx.scope;

      const { projectId } = input;

      const project = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.isDeleted, false)
        ))
        .limit(1);

      if (!project || project.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Left join with activities to get Activity Code and Activity Name
      const items = await db
        .select({
          // All budget item fields
          id: budgetItems.id,
          projectId: budgetItems.projectId,
          organizationId: budgetItems.organizationId,
          operatingUnitId: budgetItems.operatingUnitId,
          activityId: budgetItems.activityId,
          fiscalYear: budgetItems.fiscalYear,
          budgetCode: budgetItems.budgetCode,
          subBL: budgetItems.subBL,
          subBudgetLine: budgetItems.subBudgetLine,
          activityName: budgetItems.activityName,
          budgetItem: budgetItems.budgetItem,
          category: budgetItems.category,
          quantity: budgetItems.quantity,
          unitType: budgetItems.unitType,
          unitCost: budgetItems.unitCost,
          recurrence: budgetItems.recurrence,
          totalBudgetLine: budgetItems.totalBudgetLine,
          actualSpent: budgetItems.actualSpent,
          currency: budgetItems.currency,
          startDate: budgetItems.startDate,
          endDate: budgetItems.endDate,
          notes: budgetItems.notes,
          createdAt: budgetItems.createdAt,
          updatedAt: budgetItems.updatedAt,
          createdBy: budgetItems.createdBy,
          updatedBy: budgetItems.updatedBy,
          // Activity fields from join
          activityCode: activities.activityCode,
          linkedActivityName: activities.activityName,
        })
        .from(budgetItems)
        .leftJoin(activities, eq(budgetItems.activityId, activities.id))
        .where(eq(budgetItems.projectId, projectId))
        .orderBy(budgetItems.budgetCode);

      return items;
    }),

  /**
   * Get all forecasts for a project
   */
  getByProject: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      fiscalYear: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { organizationId } = ctx.scope;

      const { projectId, fiscalYear } = input;

      const project = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.isDeleted, false)
        ))
        .limit(1);

      if (!project || project.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const conditions = [eq(forecastPlan.projectId, projectId)];
      if (fiscalYear) {
        conditions.push(eq(forecastPlan.fiscalYear, fiscalYear));
      }

      const forecasts = await db
        .select()
        .from(forecastPlan)
        .where(and(...conditions))
        .orderBy(forecastPlan.fiscalYear, forecastPlan.budgetItemId);

      return forecasts;
    }),

  /**
   * Get expenses for budget items
   */
  getExpenses: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      budgetItemId: z.number().optional(),
      fiscalYear: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { projectId, budgetItemId, fiscalYear } = input;

      const conditions = [
        eq(expenses.projectId, projectId),
        eq(expenses.status, "approved"),
      ];

      if (budgetItemId) {
        conditions.push(eq(expenses.budgetItemId, budgetItemId));
      }

      if (fiscalYear) {
        conditions.push(eq(expenses.fiscalYear, fiscalYear));
      }

      const expenseRecords = await db
        .select()
        .from(expenses)
        .where(and(...conditions))
        .orderBy(desc(expenses.expenseDate));

      return expenseRecords;
    }),

  /**
   * Update monthly forecast values with validation
   */
  update: scopedProcedure
    .input(z.object({
      forecastId: z.number(),
      updates: z.object({
        m1: z.number().optional(),
        m2: z.number().optional(),
        m3: z.number().optional(),
        m4: z.number().optional(),
        m5: z.number().optional(),
        m6: z.number().optional(),
        m7: z.number().optional(),
        m8: z.number().optional(),
        m9: z.number().optional(),
        m10: z.number().optional(),
        m11: z.number().optional(),
        m12: z.number().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { organizationId, operatingUnitId } = ctx.scope;

      const { forecastId, updates } = input;
      const userId = ctx.user.id;

      const existing = await db
        .select()
        .from(forecastPlan)
        .where(eq(forecastPlan.id, forecastId))
        .limit(1);

      if (!existing || existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Forecast not found" });
      }

      const forecast = existing[0];

      const budgetItem = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.id, forecast.budgetItemId))
        .limit(1);

      if (!budgetItem || budgetItem.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget item not found" });
      }

      const item = budgetItem[0];

      const monthlyValues = {
        m1: updates.m1 ?? parseFloat(forecast.m1.toString()),
        m2: updates.m2 ?? parseFloat(forecast.m2.toString()),
        m3: updates.m3 ?? parseFloat(forecast.m3.toString()),
        m4: updates.m4 ?? parseFloat(forecast.m4.toString()),
        m5: updates.m5 ?? parseFloat(forecast.m5.toString()),
        m6: updates.m6 ?? parseFloat(forecast.m6.toString()),
        m7: updates.m7 ?? parseFloat(forecast.m7.toString()),
        m8: updates.m8 ?? parseFloat(forecast.m8.toString()),
        m9: updates.m9 ?? parseFloat(forecast.m9.toString()),
        m10: updates.m10 ?? parseFloat(forecast.m10.toString()),
        m11: updates.m11 ?? parseFloat(forecast.m11.toString()),
        m12: updates.m12 ?? parseFloat(forecast.m12.toString()),
      };

      const newTotalForecast = Object.values(monthlyValues).reduce((sum, val) => sum + val, 0);
      const totalBudgetLine = parseFloat(item.totalBudgetLine.toString());

      if (newTotalForecast > totalBudgetLine) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Total Forecast ($${newTotalForecast.toFixed(2)}) exceeds Total Budget Line ($${totalBudgetLine.toFixed(2)})`,
        });
      }

      // Year 2+ validation
      if (forecast.yearNumber > 1) {
        const currentYearNum = parseInt(forecast.fiscalYear.replace("FY", ""));
        const previousYearEnd = new Date(currentYearNum - 1, 11, 31);

        const cumulativeExpenses = await db
          .select()
          .from(expenses)
          .where(
            and(
              eq(expenses.budgetItemId, forecast.budgetItemId),
              eq(expenses.status, "approved"),
              sql`${expenses.expenseDate} <= ${previousYearEnd.toISOString().split("T")[0]}`
            )
          );

        const cumulativeActualSpent = cumulativeExpenses.reduce(
          (sum, exp) => sum + parseFloat(exp.amount.toString()),
          0
        );

        const previousYearBudgetBalance = totalBudgetLine - cumulativeActualSpent;

        if (newTotalForecast > previousYearBudgetBalance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Year ${forecast.yearNumber} Forecast ($${newTotalForecast.toFixed(2)}) exceeds Previous Year Budget Balance ($${previousYearBudgetBalance.toFixed(2)})`,
          });
        }
      }

      await db
        .update(forecastPlan)
        .set({
          ...updates,
          totalForecast: newTotalForecast.toString(),
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(forecastPlan.id, forecastId));

      // Audit logging
      for (const [field, newValue] of Object.entries(updates)) {
        if (newValue !== undefined) {
          const oldValue = forecast[field as keyof typeof forecast];
          await db.insert(forecastAuditLog).values({
            forecastId,
            userId,
            action: "update",
            fieldChanged: field,
            beforeValue: oldValue?.toString() ?? "0",
            afterValue: newValue.toString(),
            organizationId,
            operatingUnitId: operatingUnitId ?? null,
          });
        }
      }

      return { success: true, newTotalForecast };
    }),

  /**
   * Auto-generate forecast rows when budget items are created
   */
  generateForecasts: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      budgetItemId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { projectId, budgetItemId } = input;
      const userId = ctx.user.id;

      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project || project.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const proj = project[0];

      const budgetItem = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.id, budgetItemId))
        .limit(1);

      if (!budgetItem || budgetItem.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget item not found" });
      }

      const item = budgetItem[0];

      const startDate = new Date(proj.startDate);
      const endDate = new Date(proj.endDate);
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      const forecastRows = [];

      for (let year = startYear; year <= endYear; year++) {
        const yearNumber = year - startYear + 1;
        const fiscalYear = `FY${year}`;

        const startMonth = year === startYear ? startDate.getMonth() : 0;
        const endMonth = year === endYear ? endDate.getMonth() : 11;
        const activeMonthsCount = endMonth - startMonth + 1;

        const monthlyAmount =
          activeMonthsCount > 0
            ? parseFloat(item.totalBudgetLine.toString()) / activeMonthsCount
            : 0;

        const monthlyValues: any = {
          m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
          m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0,
        };

        for (let m = startMonth; m <= endMonth; m++) {
          monthlyValues[`m${m + 1}`] = monthlyAmount;
        }

        if (activeMonthsCount > 0) {
          const currentTotal = Object.values(monthlyValues).reduce(
            (sum: number, val: number) => sum + val,
            0
          );
          const lastActiveKey = `m${endMonth + 1}`;
          monthlyValues[lastActiveKey] =
            parseFloat(item.totalBudgetLine.toString()) -
            (currentTotal - monthlyValues[lastActiveKey]);
        }

        const totalForecast = Object.values(monthlyValues).reduce(
          (sum: number, val: number) => sum + val,
          0
        );

        forecastRows.push({
          budgetItemId,
          projectId,
          organizationId: proj.organizationId,
          operatingUnitId: proj.operatingUnitId ?? null,
          fiscalYear,
          yearNumber,
          ...monthlyValues,
          totalForecast: totalForecast.toString(),
          createdBy: userId,
          updatedBy: userId,
        });
      }

      await db.insert(forecastPlan).values(forecastRows);

      return { success: true, rowsCreated: forecastRows.length };
    }),

  /**
   * Bulk update forecasts from Excel import
   * Supports "Allow Duplicates" option: replace existing or skip
   */
  bulkUpdateForecasts: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        fiscalYear: z.number(),
        allowDuplicates: z.boolean(),
        forecasts: z.array(
          z.object({
            budgetItemId: z.number(),
            m1: z.number(),
            m2: z.number(),
            m3: z.number(),
            m4: z.number(),
            m5: z.number(),
            m6: z.number(),
            m7: z.number(),
            m8: z.number(),
            m9: z.number(),
            m10: z.number(),
            m11: z.number(),
            m12: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { organizationId, operatingUnitId } = ctx.scope;

      const { projectId, fiscalYear, allowDuplicates, forecasts } = input;
      const userId = ctx.user.id;

      // Verify project exists
      const project = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.isDeleted, false)
        ))
        .limit(1);

      if (!project || project.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const proj = project[0];

      let updatedCount = 0;
      let skippedCount = 0;

      for (const forecast of forecasts) {
        const { budgetItemId, ...monthlyValues } = forecast;

        // Check if forecast already exists
        const existing = await db
          .select()
          .from(forecastPlan)
          .where(
            and(
              eq(forecastPlan.projectId, projectId),
              eq(forecastPlan.budgetItemId, budgetItemId),
              eq(forecastPlan.fiscalYear, fiscalYear)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          if (allowDuplicates) {
            // Replace existing
            const totalForecast = Object.values(monthlyValues).reduce((sum, val) => sum + val, 0);

            await db
              .update(forecastPlan)
              .set({
                ...monthlyValues,
                totalForecast: totalForecast.toString(),
                updatedBy: userId,
                updatedAt: new Date(),
              })
              .where(eq(forecastPlan.id, existing[0].id));

            // Log audit trail
            await db.insert(forecastAuditLog).values({
              forecastPlanId: existing[0].id,
              userId,
              action: 'bulk_import_update',
              oldValue: JSON.stringify(existing[0]),
              newValue: JSON.stringify({ ...monthlyValues, totalForecast }),
              timestamp: new Date(),
            });

            updatedCount++;
          } else {
            // Skip duplicates
            skippedCount++;
          }
        } else {
          // Insert new forecast
          const totalForecast = Object.values(monthlyValues).reduce((sum, val) => sum + val, 0);

          // Determine year number
          const projectStartYear = new Date(proj.startDate).getFullYear();
          const yearNumber = fiscalYear - projectStartYear + 1;

          await db.insert(forecastPlan).values({
            projectId,
            budgetItemId,
            organizationId: proj.organizationId,
            operatingUnitId: proj.operatingUnitId ?? null,
            fiscalYear,
            yearNumber,
            ...monthlyValues,
            totalForecast: totalForecast.toString(),
            createdBy: userId,
            updatedBy: userId,
          });

          updatedCount++;
        }
      }

      return {
        success: true,
        updatedCount,
        skippedCount,
        totalProcessed: forecasts.length,
      };

    }),
  // BULK IMPORT FROM EXCEL
  bulkImport: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      rows: z.array(z.record(z.string(), z.any())),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId, operatingUnitId } = ctx.scope;

      const { validateRow } = await import('../shared/importFramework');
      const { FORECAST_CONFIG } = await import('../shared/importConfigs/forecast');

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{
          row: number;
          field: string;
          value: any;
          errorType: string;
          message: string;
          suggestedFix?: string;
          originalData: Record<string, any>;
        }>,
      };

      for (let i = 0; i < input.rows.length; i++) {
        const rowData = input.rows[i];
        const rowNumber = i + 2;

        try {
          const validation = validateRow(rowData, rowNumber, { ...FORECAST_CONFIG, language: 'en' });

          if (!validation.isValid) {
            validation.errors.forEach(error => {
              results.errors.push({
                row: rowNumber,
                field: error.field,
                value: error.value,
                errorType: error.errorType,
                message: error.message,
                suggestedFix: error.suggestedFix,
                originalData: rowData,
              });
            });
            results.skipped++;
            continue;
          }

          await db.insert(forecastPlan).values({
            projectId: input.projectId,
            organizationId,
            operatingUnitId,
            budgetItemId: validation.data.budgetItemId,
            fiscalYear: validation.data.fiscalYear,
            yearNumber: validation.data.yearNumber,
            month1: validation.data.month1?.toString() || '0.00',
            month2: validation.data.month2?.toString() || '0.00',
            month3: validation.data.month3?.toString() || '0.00',
            month4: validation.data.month4?.toString() || '0.00',
            month5: validation.data.month5?.toString() || '0.00',
            month6: validation.data.month6?.toString() || '0.00',
            month7: validation.data.month7?.toString() || '0.00',
            month8: validation.data.month8?.toString() || '0.00',
            month9: validation.data.month9?.toString() || '0.00',
            month10: validation.data.month10?.toString() || '0.00',
            month11: validation.data.month11?.toString() || '0.00',
            month12: validation.data.month12?.toString() || '0.00',
            totalForecast: validation.data.totalForecast.toString(),
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          results.imported++;
        } catch (error: any) {
          results.errors.push({
            row: rowNumber,
            field: 'system',
            value: null,
            errorType: 'system',
            message: 'A system error occurred while processing this record',
            suggestedFix: 'Please contact support if this error persists',
            originalData: rowData,
          });
          results.skipped++;
        }
      }

      return results;
    }),
});
