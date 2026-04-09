/**
 * Logistics Analytics Router
 * Provides comprehensive reporting and analytics for procurement, suppliers, inventory, and fleet
 */

import { z } from "zod";
import { publicProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  purchaseRequests, 
  purchaseOrders, 
  goodsReceiptNotes,
  vendors,
  stockItems,
  vehicles 
} from "../../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, count, sum, avg } from "drizzle-orm";

export const analyticsRouter = router({
  /**
   * Get procurement cycle time metrics
   * Measures time from PR creation to payment completion
   */
  getProcurementCycleTime: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { organizationId, operatingUnitId, startDate, endDate } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Build where conditions
      const conditions = [eq(purchaseRequests.organizationId, organizationId)];
      if (operatingUnitId) {
        conditions.push(eq(purchaseRequests.operatingUnitId, operatingUnitId));
      }
      if (startDate) {
        conditions.push(gte(purchaseRequests.createdAt, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(purchaseRequests.createdAt, new Date(endDate)));
      }

      // Get PRs with their completion times
      const prs = await db
        .select({
          id: purchaseRequests.id,
          prNumber: purchaseRequests.prNumber,
          createdAt: purchaseRequests.createdAt,
          approvedAt: purchaseRequests.approvedAt,
          status: purchaseRequests.status,
        })
        .from(purchaseRequests)
        .where(and(...conditions))
        .orderBy(desc(purchaseRequests.createdAt))
        .limit(1000);

      // Calculate average cycle times
      const cycleData = prs
        .filter((pr) => pr.approvedAt)
        .map((pr) => {
          const prToApproval = pr.approvedAt
            ? Math.floor((new Date(pr.approvedAt).getTime() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          return {
            prNumber: pr.prNumber,
            prToApproval,
            status: pr.status,
          };
        });

      const avgPrToApproval = cycleData.reduce((sum, item) => sum + (item.prToApproval || 0), 0) / (cycleData.length || 1);

      return {
        totalPRs: prs.length,
        completedPRs: cycleData.length,
        avgPrToApproval: Math.round(avgPrToApproval),
        cycleData: cycleData.slice(0, 50), // Return top 50 for chart
      };
    }),

  /**
   * Get supplier performance metrics
   */
  getSupplierPerformance: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { organizationId, operatingUnitId, startDate, endDate } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(purchaseOrders.organizationId, organizationId)];
      if (operatingUnitId) {
        conditions.push(eq(purchaseOrders.operatingUnitId, operatingUnitId));
      }
      if (startDate) {
        conditions.push(gte(purchaseOrders.poDate, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(purchaseOrders.poDate, new Date(endDate)));
      }

      // Get PO data with supplier info
      const pos = await db
        .select({
          supplierId: purchaseOrders.supplierId,
          supplierName: vendors.name,
          totalAmount: purchaseOrders.totalAmount,
          status: purchaseOrders.status,
          poDate: purchaseOrders.poDate,
          deliveryDate: purchaseOrders.deliveryDate,
        })
        .from(purchaseOrders)
        .leftJoin(vendors, eq(purchaseOrders.supplierId, vendors.id))
        .where(and(...conditions))
        .limit(1000);

      // Aggregate by supplier
      const supplierStats = pos.reduce((acc: any, po) => {
        const supplierId = po.supplierId || 0;
        const supplierName = po.supplierName || "Unknown";

        if (!acc[supplierId]) {
          acc[supplierId] = {
            supplierId,
            supplierName,
            totalOrders: 0,
            totalValue: 0,
            completedOrders: 0,
            onTimeDeliveries: 0,
          };
        }

        acc[supplierId].totalOrders++;
        acc[supplierId].totalValue += parseFloat(po.totalAmount || "0");

        if (po.status === "completed" || po.status === "delivered") {
          acc[supplierId].completedOrders++;
        }

        // Check on-time delivery (simplified: if delivered status exists)
        if (po.status === "delivered" || po.status === "completed") {
          acc[supplierId].onTimeDeliveries++;
        }

        return acc;
      }, {});

      const supplierList = Object.values(supplierStats)
        .map((s: any) => ({
          ...s,
          avgOrderValue: s.totalOrders > 0 ? s.totalValue / s.totalOrders : 0,
          completionRate: s.totalOrders > 0 ? (s.completedOrders / s.totalOrders) * 100 : 0,
          onTimeRate: s.totalOrders > 0 ? (s.onTimeDeliveries / s.totalOrders) * 100 : 0,
        }))
        .sort((a: any, b: any) => b.totalValue - a.totalValue);

      return {
        totalSuppliers: supplierList.length,
        topSuppliers: supplierList.slice(0, 10),
        allSuppliers: supplierList,
      };
    }),

  /**
   * Get spending analysis by category/department
   */
  getSpendingAnalysis: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        groupBy: z.enum(["month", "quarter", "category", "department"]).default("month"),
      })
    )
    .query(async ({ input }) => {
      const { organizationId, operatingUnitId, startDate, endDate, groupBy } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(purchaseOrders.organizationId, organizationId)];
      if (operatingUnitId) {
        conditions.push(eq(purchaseOrders.operatingUnitId, operatingUnitId));
      }
      if (startDate) {
        conditions.push(gte(purchaseOrders.poDate, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(purchaseOrders.poDate, new Date(endDate)));
      }

      const pos = await db
        .select({
          poDate: purchaseOrders.poDate,
          totalAmount: purchaseOrders.totalAmount,
          currency: purchaseOrders.currency,
          status: purchaseOrders.status,
        })
        .from(purchaseOrders)
        .where(and(...conditions))
        .limit(1000);

      // Group by month
      const monthlyData = pos.reduce((acc: any, po) => {
        const month = new Date(po.poDate).toISOString().slice(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { month, totalSpending: 0, orderCount: 0 };
        }
        acc[month].totalSpending += parseFloat(po.totalAmount || "0");
        acc[month].orderCount++;
        return acc;
      }, {});

      const spendingByMonth = Object.values(monthlyData).sort((a: any, b: any) =>
        a.month.localeCompare(b.month)
      );

      const totalSpending = pos.reduce((sum, po) => sum + parseFloat(po.totalAmount || "0"), 0);

      return {
        totalSpending,
        totalOrders: pos.length,
        avgOrderValue: pos.length > 0 ? totalSpending / pos.length : 0,
        spendingByMonth,
      };
    }),

  /**
   * Get purchase order aging report
   */
  getPOAgingReport: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const { organizationId, operatingUnitId } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        eq(purchaseOrders.organizationId, organizationId),
        sql`${purchaseOrders.status} IN ('draft', 'sent', 'acknowledged', 'partially_delivered')`,
      ];
      if (operatingUnitId) {
        conditions.push(eq(purchaseOrders.operatingUnitId, operatingUnitId));
      }

      const openPOs = await db
        .select({
          id: purchaseOrders.id,
          poNumber: purchaseOrders.poNumber,
          poDate: purchaseOrders.poDate,
          totalAmount: purchaseOrders.totalAmount,
          status: purchaseOrders.status,
          supplierName: vendors.name,
        })
        .from(purchaseOrders)
        .leftJoin(vendors, eq(purchaseOrders.supplierId, vendors.id))
        .where(and(...conditions))
        .orderBy(purchaseOrders.poDate)
        .limit(500);

      const today = new Date();
      const agingData = openPOs.map((po) => {
        const ageInDays = Math.floor((today.getTime() - new Date(po.poDate).getTime()) / (1000 * 60 * 60 * 24));
        let ageBucket = "0-30 days";
        if (ageInDays > 90) ageBucket = "90+ days";
        else if (ageInDays > 60) ageBucket = "60-90 days";
        else if (ageInDays > 30) ageBucket = "30-60 days";

        return {
          ...po,
          ageInDays,
          ageBucket,
        };
      });

      // Group by age bucket
      const ageBuckets = agingData.reduce((acc: any, po) => {
        if (!acc[po.ageBucket]) {
          acc[po.ageBucket] = { bucket: po.ageBucket, count: 0, totalValue: 0 };
        }
        acc[po.ageBucket].count++;
        acc[po.ageBucket].totalValue += parseFloat(po.totalAmount || "0");
        return acc;
      }, {});

      return {
        totalOpenPOs: openPOs.length,
        agingData,
        ageBucketSummary: Object.values(ageBuckets),
      };
    }),

  /**
   * Get inventory/stock summary
   */
  getInventorySummary: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const { organizationId, operatingUnitId } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(stockItems.organizationId, organizationId)];
      if (operatingUnitId) {
        conditions.push(eq(stockItems.operatingUnitId, operatingUnitId));
      }

      const items = await db
        .select()
        .from(stockItems)
        .where(and(...conditions))
        .limit(1000);

      const totalItems = items.length;
      const lowStockItems = items.filter((item) => item.quantity <= (item.reorderLevel || 0)).length;
      const outOfStockItems = items.filter((item) => item.quantity === 0).length;
      const totalValue = items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitCost || "0")), 0);

      return {
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalValue,
        items: items.slice(0, 50), // Top 50 for display
      };
    }),

  /**
   * Get dashboard overview with key metrics
   */
  getDashboardOverview: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const { organizationId, operatingUnitId } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get counts for various entities
      const prConditions = [eq(purchaseRequests.organizationId, organizationId)];
      const poConditions = [eq(purchaseOrders.organizationId, organizationId)];
      const supplierConditions = [eq(vendors.organizationId, organizationId)];

      if (operatingUnitId) {
        prConditions.push(eq(purchaseRequests.operatingUnitId, operatingUnitId));
        poConditions.push(eq(purchaseOrders.operatingUnitId, operatingUnitId));
        supplierConditions.push(eq(vendors.operatingUnitId, operatingUnitId));
      }

      const [prStats, poStats, supplierStats] = await Promise.all([
        db
          .select({
            total: count(),
            pending: sql<number>`SUM(CASE WHEN ${purchaseRequests.status} = 'pending' THEN 1 ELSE 0 END)`,
            approved: sql<number>`SUM(CASE WHEN ${purchaseRequests.status} = 'approved' THEN 1 ELSE 0 END)`,
          })
          .from(purchaseRequests)
          .where(and(...prConditions)),
        db
          .select({
            total: count(),
            open: sql<number>`SUM(CASE WHEN ${purchaseOrders.status} IN ('draft', 'sent', 'acknowledged') THEN 1 ELSE 0 END)`,
            totalValue: sum(purchaseOrders.totalAmount),
          })
          .from(purchaseOrders)
          .where(and(...poConditions)),
        db
          .select({
            total: count(),
            active: sql<number>`SUM(CASE WHEN ${vendors.isActive} = 1 THEN 1 ELSE 0 END)`,
          })
          .from(vendors)
          .where(and(...supplierConditions)),
      ]);

      return {
        purchaseRequests: {
          total: prStats[0]?.total || 0,
          pending: Number(prStats[0]?.pending) || 0,
          approved: Number(prStats[0]?.approved) || 0,
        },
        purchaseOrders: {
          total: poStats[0]?.total || 0,
          open: Number(poStats[0]?.open) || 0,
          totalValue: parseFloat(poStats[0]?.totalValue || "0"),
        },
        suppliers: {
          total: supplierStats[0]?.total || 0,
          active: Number(supplierStats[0]?.active) || 0,
        },
      };
    }),
});
