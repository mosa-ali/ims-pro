/**
 * Donor Budget Export Router
 * Export budgets in donor-specific formats (EU, UN, ECHO)
 */

import { z } from "zod";
import { protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { budgets, budgetLines, budgetMonthlyAllocations, financeBudgetCategories } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Donor format configurations
const DONOR_FORMATS = {
  EU: {
    name: "European Union",
    nameAr: "الاتحاد الأوروبي",
    categories: [
      { code: "1", name: "Human Resources", nameAr: "الموارد البشرية" },
      { code: "2", name: "Travel", nameAr: "السفر" },
      { code: "3", name: "Equipment and supplies", nameAr: "المعدات واللوازم" },
      { code: "4", name: "Local office", nameAr: "المكتب المحلي" },
      { code: "5", name: "Other costs, services", nameAr: "تكاليف وخدمات أخرى" },
      { code: "6", name: "Other", nameAr: "أخرى" },
      { code: "7", name: "Indirect costs", nameAr: "التكاليف غير المباشرة" },
    ],
  },
  UN: {
    name: "United Nations",
    nameAr: "الأمم المتحدة",
    categories: [
      { code: "A", name: "Staff and other personnel costs", nameAr: "تكاليف الموظفين والأفراد" },
      { code: "B", name: "Supplies, Commodities, Materials", nameAr: "اللوازم والسلع والمواد" },
      { code: "C", name: "Equipment, Vehicles, and Furniture", nameAr: "المعدات والمركبات والأثاث" },
      { code: "D", name: "Contractual Services", nameAr: "الخدمات التعاقدية" },
      { code: "E", name: "Travel", nameAr: "السفر" },
      { code: "F", name: "Transfers and Grants", nameAr: "التحويلات والمنح" },
      { code: "G", name: "General Operating and Other Direct Costs", nameAr: "التكاليف التشغيلية العامة" },
      { code: "H", name: "Indirect Programme Support Costs", nameAr: "تكاليف دعم البرنامج غير المباشرة" },
    ],
  },
  ECHO: {
    name: "ECHO (EU Humanitarian)",
    nameAr: "إيكو (المساعدات الإنسانية الأوروبية)",
    categories: [
      { code: "1", name: "Human Resources", nameAr: "الموارد البشرية" },
      { code: "2", name: "Travel", nameAr: "السفر" },
      { code: "3", name: "Equipment, Materials and Supplies", nameAr: "المعدات والمواد واللوازم" },
      { code: "4", name: "Office/Accommodation Costs", nameAr: "تكاليف المكتب/الإقامة" },
      { code: "5", name: "Other Costs and Services", nameAr: "تكاليف وخدمات أخرى" },
      { code: "6", name: "Transfers and Grants to Partners", nameAr: "التحويلات والمنح للشركاء" },
      { code: "7", name: "Indirect Costs", nameAr: "التكاليف غير المباشرة" },
    ],
  },
  AICS: {
    name: "AICS (Italian Cooperation)",
    nameAr: "التعاون الإيطالي",
    categories: [
      { code: "A", name: "Personnel", nameAr: "الموظفون" },
      { code: "B", name: "Equipment", nameAr: "المعدات" },
      { code: "C", name: "Services", nameAr: "الخدمات" },
      { code: "D", name: "Operating Costs", nameAr: "تكاليف التشغيل" },
      { code: "E", name: "Administrative Costs", nameAr: "التكاليف الإدارية" },
    ],
  },
};

export const donorBudgetExportRouter = router({
  /**
   * Get available donor formats
   */
  getDonorFormats: scopedProcedure.query(async () => {
    return Object.entries(DONOR_FORMATS).map(([key, value]) => ({
      code: key,
      name: value.name,
      nameAr: value.nameAr,
      categoryCount: value.categories.length,
    }));
  }),

  /**
   * Get donor format categories
   */
  getDonorCategories: scopedProcedure
    .input(z.object({ donorFormat: z.enum(["EU", "UN", "ECHO", "AICS"]) }))
    .query(async ({ input }) => {
      const format = DONOR_FORMATS[input.donorFormat];
      return format.categories;
    }),

  /**
   * Export budget in donor format
   */
  exportBudget: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        donorFormat: z.enum(["EU", "UN", "ECHO", "AICS"]),
        includeMonthlyBreakdown: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId, donorFormat, includeMonthlyBreakdown } = input;

      // Get budget header
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId)));

      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      // Get budget lines with categories
      const lines = await db
        .select({
          line: budgetLines,
          category: financeBudgetCategories,
        })
        .from(budgetLines)
        .leftJoin(financeBudgetCategories, eq(budgetLines.categoryId, financeBudgetCategories.id))
        .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)));

      // Get monthly allocations if requested
      let monthlyData: any[] = [];
      if (includeMonthlyBreakdown) {
        monthlyData = await db
          .select()
          .from(budgetMonthlyAllocations)
          .where(eq(budgetMonthlyAllocations.budgetId, budgetId));
      }

      // Map lines to donor categories
      const donorCategories = DONOR_FORMATS[donorFormat].categories;
      const mappedData = donorCategories.map((donorCat) => {
        // Find lines that map to this donor category
        // For now, use a simple mapping based on category name similarity
        const matchingLines = lines.filter((l) => {
          const catName = l.category?.name?.toLowerCase() || "";
          const donorCatName = donorCat.name.toLowerCase();
          return (
            catName.includes(donorCatName.split(" ")[0]) ||
            donorCatName.includes(catName.split(" ")[0])
          );
        });

        const totalAmount = matchingLines.reduce(
          (sum, l) => sum + parseFloat(l.line.totalAmount || "0"),
          0
        );

        const donorEligibleAmount = matchingLines.reduce(
          (sum, l) => sum + parseFloat(l.line.donorEligibleAmount || l.line.totalAmount || "0"),
          0
        );

        return {
          categoryCode: donorCat.code,
          categoryName: donorCat.name,
          categoryNameAr: donorCat.nameAr,
          totalAmount,
          donorEligibleAmount,
          lineCount: matchingLines.length,
          lines: matchingLines.map((l) => ({
            lineCode: l.line.lineCode,
            description: l.line.description,
            descriptionAr: l.line.descriptionAr,
            unitCost: parseFloat(l.line.unitCost || "0"),
            quantity: l.line.quantity,
            durationMonths: l.line.durationMonths,
            totalAmount: parseFloat(l.line.totalAmount || "0"),
            donorEligibleAmount: parseFloat(l.line.donorEligibleAmount || l.line.totalAmount || "0"),
          })),
        };
      });

      // Calculate totals
      const grandTotal = mappedData.reduce((sum, cat) => sum + cat.totalAmount, 0);
      const donorEligibleTotal = mappedData.reduce((sum, cat) => sum + cat.donorEligibleAmount, 0);

      return {
        budget: {
          id: budget.id,
          budgetCode: budget.budgetCode,
          budgetTitle: budget.budgetTitle,
          budgetTitleAr: budget.budgetTitleAr,
          fiscalYear: budget.fiscalYear,
          currency: budget.currency,
          periodStart: budget.periodStart,
          periodEnd: budget.periodEnd,
          status: budget.status,
          versionNumber: budget.versionNumber,
        },
        donorFormat: {
          code: donorFormat,
          name: DONOR_FORMATS[donorFormat].name,
          nameAr: DONOR_FORMATS[donorFormat].nameAr,
        },
        categories: mappedData,
        totals: {
          grandTotal,
          donorEligibleTotal,
          indirectCostPercentage: grandTotal > 0 ? ((grandTotal - donorEligibleTotal) / grandTotal) * 100 : 0,
        },
        monthlyBreakdown: includeMonthlyBreakdown ? monthlyData : null,
        exportedAt: new Date().toISOString(),
      };
    }),

  /**
   * Generate Excel export data
   */
  generateExcelData: scopedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        donorFormat: z.enum(["EU", "UN", "ECHO", "AICS"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { budgetId, donorFormat } = input;

      // Get budget header
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId)));

      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      // Get budget lines
      const lines = await db
        .select()
        .from(budgetLines)
        .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)));

      // Get monthly allocations
      const allocations = await db
        .select()
        .from(budgetMonthlyAllocations)
        .where(eq(budgetMonthlyAllocations.budgetId, budgetId));

      // Format data for Excel export
      const excelData = {
        sheetName: `Budget_${budget.budgetCode}`,
        headers: [
          "Line Code",
          "Description",
          "Category",
          "Unit Type",
          "Unit Cost",
          "Quantity",
          "Duration (Months)",
          "Total Amount",
          "Donor Eligible %",
          "Donor Eligible Amount",
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ],
        rows: lines.map((line) => {
          const lineAllocations = allocations.filter((a) => a.budgetLineId === line.id);
          const monthlyValues = Array.from({ length: 12 }, (_, i) => {
            const alloc = lineAllocations.find((a) => a.monthNumber === i + 1);
            return alloc ? parseFloat(alloc.plannedAmount || "0") : 0;
          });

          return [
            line.lineCode,
            line.description,
            line.categoryId || "-",
            line.unitType,
            parseFloat(line.unitCost || "0"),
            line.quantity,
            line.durationMonths,
            parseFloat(line.totalAmount || "0"),
            line.donorEligibilityPercentage || 100,
            parseFloat(line.donorEligibleAmount || line.totalAmount || "0"),
            ...monthlyValues,
          ];
        }),
        metadata: {
          budgetCode: budget.budgetCode,
          budgetTitle: budget.budgetTitle,
          fiscalYear: budget.fiscalYear,
          currency: budget.currency,
          donorFormat,
          exportedBy: ctx.user.name,
          exportedAt: new Date().toISOString(),
        },
      };

      return excelData;
    }),
});
