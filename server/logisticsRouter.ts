/**
 * Logistics & Procurement Router
 * Handles all CRUD operations for the Logistics module
 * 
 * PLATFORM-LEVEL ISOLATION: Uses scopedProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */

import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { generatePurchaseRequestApprovalEvidence } from "./evidenceGeneration";
import { getDb } from "./db";
import { eq, and, desc, like, or, sql, isNull, gte, lte, between } from "drizzle-orm";
import {
  purchaseRequests,
  purchaseRequestLineItems,
  purchaseOrders,
  purchaseOrderLineItems,
  goodsReceiptNotes,
  grnLineItems,
  stockItems,
  stockRequests,
  stockRequestLineItems,
  stockIssued,
  stockIssuedLineItems,
  returnedItems,
  returnedItemLineItems,
  vehicles,
  drivers,
  tripLogs,
  fuelLogs,
  vehicleMaintenance,
  vendors,
  contracts,
} from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { purchaseRequestRouter } from "./routers/procurement/purchaseRequest";
import { workflowTrackerRouter } from "./routers/procurement/workflowTracker";
import { rfqRouter } from "./routers/procurement/rfq";
import { quotationAnalysisRouter } from "./routers/procurement/quotationAnalysis";
import { bidAnalysisRouter } from "./routers/procurement/bidAnalysis";
import { bidOpeningMinutesRouter } from "./routers/procurement/bidOpeningMinutes";
import { bidEvaluationRouter } from "./routers/procurement/bidEvaluation";
import { purchaseOrderRouter } from "./routers/procurement/purchaseOrder";
import { grnRouter as procurementGrnRouter } from "./routers/procurement/grn";
import { dnRouter as procurementDnRouter } from "./routers/procurement/dn";
import { packageRouter } from "./routers/procurement/package";
import { analyticsRouter } from "./routers/logistics/analyticsRouter";
import { scheduledReportsRouter } from "./routers/logistics/scheduledReportsRouter";
import { vendorRouter } from "./vendorRouter";
import { prWorkflowDashboardRouter } from "./routers/logistics/prWorkflowDashboard";
import { supplierQuotationRouter } from "./routers/procurement/supplierQuotation";
import { stockManagementRouter } from "./routers/logistics/stockManagementRouter";

// ============================================================================
// PURCHASE REQUESTS ROUTER
// ============================================================================

const purchaseRequestsRouter = router({
  list: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["draft", "submitted", "validated_by_logistic", "rejected_by_logistic", "validated_by_finance", "rejected_by_finance", "approved", "rejected_by_pm"]).optional(),
      category: z.enum(["goods", "services", "works"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      console.log('[PR.list] Scope:', { organizationId, operatingUnitId });
      
      // Build conditions array
      const conditions: any[] = [
        eq(purchaseRequests.organizationId, organizationId),
        isNull(purchaseRequests.deletedAt),
      ];
      
      // Add operating unit condition: match current OU OR NULL (for old PRs)
      const ouCondition = or(
        eq(purchaseRequests.operatingUnitId, operatingUnitId),
        isNull(purchaseRequests.operatingUnitId)
      );
      if (ouCondition) {
        conditions.push(ouCondition);
      }
      
      if (input.status) conditions.push(eq(purchaseRequests.status, input.status));
      if (input.category) conditions.push(eq(purchaseRequests.category, input.category));
      if (input.search) {
        conditions.push(
          or(
            like(purchaseRequests.prNumber, `%${input.search}%`),
            like(purchaseRequests.projectTitle, `%${input.search}%`),
            like(purchaseRequests.requesterName, `%${input.search}%`)
          )!
        );
      }
      
      try {
        const results = await db.select().from(purchaseRequests)
          .where(and(...conditions))
          .orderBy(desc(purchaseRequests.createdAt))
          .limit(input.limit).offset(input.offset);
        console.log('[PR.list] Results count:', results.length);
      
        // Calculate totalAmount from line items for each PR
        // This is the sum of all line item quantities × unit prices × recurrence
        const resultsWithTotals = await Promise.all(
          results.map(async (pr) => {
            const lineItems = await db
              .select()
              .from(purchaseRequestLineItems)
              .where(eq(purchaseRequestLineItems.purchaseRequestId, pr.id));

            const totalAmount = lineItems.reduce((sum, item) => {
              const quantity = parseFloat(item.quantity?.toString() || "0");
              const unitPrice = parseFloat(item.unitPrice?.toString() || "0");
              const recurrence = parseFloat(item.recurrence?.toString() || "1");
              return sum + (quantity * unitPrice * recurrence);
            }, 0);

            return {
              ...pr,
              totalAmount,
            };
          })
        );
        
        const countResult = await db.select({ count: sql<number>`count(*)` })
          .from(purchaseRequests).where(and(...conditions));
        
        return { items: resultsWithTotals, total: countResult[0]?.count || 0 };
      } catch (error) {
        console.error('[PR.list] Query error:', error);
        throw error;
      }
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const pr = await db.select().from(purchaseRequests)
        .where(and(
          eq(purchaseRequests.id, input.id),
          eq(purchaseRequests.organizationId, organizationId),
          sql`${purchaseRequests.isDeleted} = 0`
        ))
        .limit(1);
      
      if (!pr[0]) return null;
      
      const lineItems = await db.select().from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, input.id))
        .orderBy(purchaseRequestLineItems.lineNumber);
      
      // Calculate total amount from line items
      const totalAmount = lineItems.reduce((sum, item) => {
        const qty = parseFloat(item.quantity || '0');
        const price = parseFloat(item.unitPrice || '0');
        return sum + (qty * price);
      }, 0);
      
      return { ...pr[0], lineItems, totalAmount };
    }),

  create: scopedProcedure
    .input(z.object({
      category: z.enum(["goods", "services", "works"]),
      serviceType: z.string().optional(),
      serviceTypeOther: z.string().optional(),
      projectId: z.number().optional(),
      projectTitle: z.string(),
      projectTitleAr: z.string().optional(),
      donorId: z.number().optional(),
      donorName: z.string().optional(),
      donor: z.string().optional(),
      budgetId: z.number().optional(),
      budgetCode: z.string().optional(),
      budgetTitle: z.string().optional(),
      budgetLineId: z.number().optional(),
      subBudgetLine: z.string().optional(),
      activityName: z.string().optional(),
      totalBudgetLine: z.union([z.string(), z.number()]).optional(),
      currency: z.string().optional(),
      exchangeRate: z.string().optional(),
      exchangeTo: z.string().optional(),
      total: z.string().optional(),
      department: z.string().optional(),
      requesterName: z.string(),
      requesterEmail: z.string().optional(),
      neededByDate: z.union([z.date(), z.string()]).optional().transform(v => v ? new Date(v) : undefined),
      urgency: z.enum(["low", "normal", "high", "critical"]).optional(),
      deliveryLocation: z.string().optional(),
      deliveryLocationAr: z.string().optional(),
      procurementLadder: z.string().optional(),
      justification: z.string().optional(),
      justificationAr: z.string().optional(),
      status: z.enum(["draft", "submitted"]).optional(),
      lineItems: z.array(z.object({
        budgetLine: z.string().optional(),
        description: z.string(),
        descriptionAr: z.string().optional(),
        specifications: z.string().optional(),
        specificationsAr: z.string().optional(),
        quantity: z.string(),
        unit: z.string().optional(),
        unitPrice: z.string().optional(),
        recurrence: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Enforce scope values - these MUST come from ctx.scope, never from input
      if (!organizationId || !operatingUnitId) {
        throw new Error("Missing scope context: organizationId or operatingUnitId not provided");
      }
      
      const { lineItems, donor, donorName, exchangeRate, exchangeTo, total, neededByDate, totalBudgetLine, deliveryLocationAr, projectTitleAr, justificationAr, ...prData } = input;
      console.log("[PR Create] Received exchangeRate:", exchangeRate, "Type:", typeof exchangeRate);
      
      // Import auto-numbering service
      const { generatePRNumber } = await import("./services/procurementNumbering");
      const prNumber = await generatePRNumber(organizationId, operatingUnitId);
      
      let totalAmount = 0;
      lineItems.forEach((item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice || "0") || 0;
        const recurrence = parseFloat(item.recurrence || "1") || 1;
        totalAmount += qty * price * recurrence;
      });
      
      const processedExchangeRate = exchangeRate ? parseFloat(exchangeRate).toString() : undefined;
      console.log("[PR Create] Saving with exchangeRate:", processedExchangeRate);
      
      const result = await db.insert(purchaseRequests).values({
        ...prData,
        prNumber,
        donorName: donorName || donor || undefined,
        exchangeRate: processedExchangeRate,
        exchangeTo: exchangeTo || 'USD',
        total: total || totalAmount.toFixed(2),
        neededBy: neededByDate,
        totalBudgetLine: totalBudgetLine ? String(parseFloat(String(totalBudgetLine))) : undefined,
        prTotalUsd: totalAmount.toFixed(2),
        organizationId, operatingUnitId,
        createdBy: ctx.user.id,
      });
      
      const prId = result[0].insertId;
      
      if (lineItems.length > 0) {
        await db.insert(purchaseRequestLineItems).values(
          lineItems.map((item, index) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice || "0") || 0;
            const recurrence = parseFloat(item.recurrence || "1") || 1;
            return {
              purchaseRequestId: prId,
              lineNumber: index + 1,
              budgetLine: item.budgetLine,
              description: item.description,
              descriptionAr: item.descriptionAr,
              specifications: item.specifications,
              specificationsAr: item.specificationsAr,
              quantity: item.quantity,
              unit: item.unit || "Piece",
              unitPrice: item.unitPrice || "0",
              recurrence: item.recurrence || "",
              totalPrice: (qty * price * recurrence).toFixed(2),
            };
          })
        );
      }
      
      return { id: prId };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      category: z.enum(["goods", "services", "works"]).optional(),
      serviceType: z.string().optional(),
      serviceTypeOther: z.string().optional(),
      projectId: z.number().optional(),
      projectTitle: z.string().optional(),
      projectTitleAr: z.string().optional(),
      donorId: z.number().optional(),
      donorName: z.string().optional(),
      donor: z.string().optional(),
      budgetId: z.number().optional(),
      budgetCode: z.string().optional(),
      budgetTitle: z.string().optional(),
      budgetLineId: z.number().optional(),
      subBudgetLine: z.string().optional(),
      activityName: z.string().optional(),
      totalBudgetLine: z.union([z.string(), z.number()]).optional(),
      currency: z.string().optional(),
      exchangeRate: z.string().optional(),
      exchangeTo: z.string().optional(),
      total: z.string().optional(),
      department: z.string().optional(),
      requesterName: z.string().optional(),
      requesterEmail: z.string().optional(),
      neededByDate: z.union([z.date(), z.string()]).optional().transform(v => v ? new Date(v) : undefined),
      urgency: z.enum(["low", "normal", "high", "critical"]).optional(),
      deliveryLocation: z.string().optional(),
      deliveryLocationAr: z.string().optional(),
      justification: z.string().optional(),
      justificationAr: z.string().optional(),
      status: z.enum(["draft", "submitted", "validated_by_logistic", "rejected_by_logistic", "validated_by_finance", "rejected_by_finance", "approved", "rejected_by_pm"]).optional(),
      lineItems: z.array(z.object({
        id: z.number().optional(),
        budgetLine: z.string().optional(),
        description: z.string(),
        descriptionAr: z.string().optional(),
        specifications: z.string().optional(),
        specificationsAr: z.string().optional(),
        quantity: z.string(),
        unit: z.string().optional(),
        unitPrice: z.string().optional(),
        recurrence: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      const { id, lineItems, donor, donorName, exchangeRate, exchangeTo, total, neededByDate, totalBudgetLine, deliveryLocationAr, projectTitleAr, justificationAr, budgetLineId, ...data } = input;
      
      let totalAmount;
      if (lineItems) {
        totalAmount = 0;
        lineItems.forEach((item) => {
          const qty = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.unitPrice || "0") || 0;
          totalAmount += qty * price;
        });
      }
      

      
      await db.update(purchaseRequests).set({
        ...data,
        ...(donorName !== undefined && { donorName }),
        ...(donor !== undefined && !donorName && { donorName: donor }),
        ...(neededByDate !== undefined && { neededBy: neededByDate }),
        ...(totalBudgetLine !== undefined && { totalBudgetLine: String(parseFloat(String(totalBudgetLine))) }),
        ...(exchangeRate !== undefined && { exchangeRate }),
        ...(exchangeTo !== undefined && { exchangeTo }),
        ...(total !== undefined && { total }),
        ...(totalAmount !== undefined && { prTotalUsd: totalAmount.toFixed(2) }),
      }).where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.organizationId, organizationId)));
      
      if (lineItems) {
        await db.delete(purchaseRequestLineItems)
          .where(eq(purchaseRequestLineItems.purchaseRequestId, id));
        
        if (lineItems.length > 0) {
          await db.insert(purchaseRequestLineItems).values(
            lineItems.map((item, index) => {
              const qty = parseFloat(item.quantity) || 0;
              const price = parseFloat(item.unitPrice || "0") || 0;
              const recurrence = parseFloat(item.recurrence || "1") || 1;
              return {
                purchaseRequestId: id,
                lineNumber: index + 1,
                budgetLine: item.budgetLine,
                description: item.description,
                descriptionAr: item.descriptionAr,
                specifications: item.specifications,
                specificationsAr: item.specificationsAr,
                quantity: item.quantity,
                unit: item.unit || "Piece",
                unitPrice: item.unitPrice || "0",
                recurrence: item.recurrence || "",
                totalPrice: (qty * price * recurrence).toFixed(2),
              };
            })
          );
        }
      }
      
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(purchaseRequests).set({
        isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user.id,
      }).where(and(eq(purchaseRequests.id, input.id), eq(purchaseRequests.organizationId, organizationId)));
      return { success: true };
    }),

  approve: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Get purchase request before approval
      const prResult = await db.select().from(purchaseRequests)
        .where(and(eq(purchaseRequests.id, input.id), eq(purchaseRequests.organizationId, organizationId)))
        .limit(1);
      
      const pr = prResult[0];
      if (!pr) throw new Error("Purchase request not found");
      
      await db.update(purchaseRequests).set({
        status: "approved", approvedBy: ctx.user.id, approvedAt: new Date(), updatedBy: ctx.user.id,
      }).where(and(eq(purchaseRequests.id, input.id), eq(purchaseRequests.organizationId, organizationId)));
      
      // Auto-create RFQ after PR approval (async, don't block response)
      rfqRouter.createCaller(ctx).autoCreate({ purchaseRequestId: input.id })
        .catch((err) => console.error("[RFQ] Failed to auto-create RFQ:", err));
      
      // Generate evidence document (async, don't block response)
      generatePurchaseRequestApprovalEvidence(
        pr,
        { organizationId, operatingUnitId, userId: ctx.user?.id || 0 }
      ).catch((err) => console.error("[Evidence] Failed to generate purchase request approval evidence:", err));
      
      return { success: true };
    }),

  reject: scopedProcedure
    .input(z.object({ id: z.number(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(purchaseRequests).set({
        status: "rejected", rejectionReason: input.reason, updatedBy: ctx.user.id,
      }).where(and(eq(purchaseRequests.id, input.id), eq(purchaseRequests.organizationId, organizationId)));
      return { success: true };
    }),

  exportTemplate: scopedProcedure
    .mutation(async () => {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      const worksheet = workbook.addWorksheet("Purchase Requests");
      
      // Define columns
      worksheet.columns = [
        { header: "Category", key: "category", width: 15 },
        { header: "Project Title", key: "projectTitle", width: 30 },
        { header: "Donor", key: "donor", width: 20 },
        { header: "Budget Code", key: "budgetCode", width: 15 },
        { header: "Department", key: "department", width: 20 },
        { header: "Requester Name", key: "requesterName", width: 20 },
        { header: "Requester Email", key: "requesterEmail", width: 25 },
        { header: "Needed By Date", key: "neededByDate", width: 15 },
        { header: "Urgency", key: "urgency", width: 12 },
        { header: "Delivery Location", key: "deliveryLocation", width: 25 },
        { header: "Justification", key: "justification", width: 30 },
        { header: "Line Item Description", key: "lineDescription", width: 30 },
        { header: "Specifications", key: "specifications", width: 30 },
        { header: "Quantity", key: "quantity", width: 12 },
        { header: "Unit", key: "unit", width: 12 },
        { header: "Unit Price", key: "unitPrice", width: 12 },
      ];
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };
      
      // Add sample row with instructions
      worksheet.addRow({
        category: "goods",
        projectTitle: "Example Project",
        donor: "Example Donor",
        budgetCode: "BUD-001",
        department: "Logistics",
        requesterName: "John Doe",
        requesterEmail: "john@example.com",
        neededByDate: "2026-03-01",
        urgency: "normal",
        deliveryLocation: "Main Office",
        justification: "Required for project activities",
        lineDescription: "Laptop Computer",
        specifications: "15 inch, 16GB RAM",
        quantity: "5",
        unit: "Piece",
        unitPrice: "1200",
      });
      
      // Add instructions sheet
      const instructionsSheet = workbook.addWorksheet("Instructions");
      instructionsSheet.getColumn(1).width = 80;
      instructionsSheet.addRow(["Purchase Request Import Template - Instructions"]);
      instructionsSheet.getRow(1).font = { bold: true, size: 14 };
      instructionsSheet.addRow([]);
      instructionsSheet.addRow(["1. Fill in the PR header information (Category, Project Title, etc.)"]);
      instructionsSheet.addRow(["2. For PRs with multiple line items, repeat the header info on each row"]);
      instructionsSheet.addRow(["3. Each row represents one line item"]);
      instructionsSheet.addRow(["4. Category values: goods, services, works"]);
      instructionsSheet.addRow(["5. Urgency values: low, normal, high, critical"]);
      instructionsSheet.addRow(["6. Date format: YYYY-MM-DD"]);
      instructionsSheet.addRow(["7. Prices should be numbers without currency symbols"]);
      instructionsSheet.addRow(["8. Save and upload the file using the Import button"]);
      
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        data: Buffer.from(buffer).toString("base64"),
        filename: "PR_Import_Template.xlsx",
      };
    }),

  exportData: scopedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      // Get all PRs
      const prs = await db.select().from(purchaseRequests)
        .where(and(
          eq(purchaseRequests.organizationId, organizationId),
          sql`${purchaseRequests.isDeleted} = 0`
        ))
        .orderBy(desc(purchaseRequests.createdAt));
      
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      const worksheet = workbook.addWorksheet("Purchase Requests");
      
      // Define columns
      worksheet.columns = [
        { header: "PR Number", key: "prNumber", width: 20 },
        { header: "Category", key: "category", width: 15 },
        { header: "Project Title", key: "projectTitle", width: 30 },
        { header: "Donor", key: "donor", width: 20 },
        { header: "Requester", key: "requester", width: 20 },
        { header: "Status", key: "status", width: 20 },
        { header: "Date", key: "date", width: 15 },
        { header: "Total Amount (USD)", key: "totalAmount", width: 18 },
        { header: "Line #", key: "lineNumber", width: 8 },
        { header: "Description", key: "description", width: 30 },
        { header: "Specifications", key: "specifications", width: 30 },
        { header: "Quantity", key: "quantity", width: 12 },
        { header: "Unit", key: "unit", width: 12 },
        { header: "Unit Price", key: "unitPrice", width: 12 },
        { header: "Line Total", key: "lineTotal", width: 12 },
      ];
      
      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      
      // Add data rows
      for (const pr of prs) {
        const lineItems = await db.select().from(purchaseRequestLineItems)
          .where(eq(purchaseRequestLineItems.purchaseRequestId, pr.id))
          .orderBy(purchaseRequestLineItems.lineNumber);
        
        const totalAmount = lineItems.reduce((sum, item) => {
          const quantity = parseFloat(item.quantity?.toString() || "0");
          const unitPrice = parseFloat(item.unitPrice?.toString() || "0");
          return sum + (quantity * unitPrice);
        }, 0);
        
        if (lineItems.length === 0) {
          // PR without line items
          worksheet.addRow({
            prNumber: pr.prNumber,
            category: pr.category,
            projectTitle: pr.projectTitle,
            donor: pr.donorName,
            requester: pr.requesterName,
            status: pr.status,
            date: (typeof pr.createdAt === 'string' ? pr.createdAt : pr.createdAt?.toISOString?.() || '').split("T")[0],
            totalAmount: totalAmount.toFixed(2),
          });
        } else {
          // Add row for each line item
          lineItems.forEach((item) => {
            const qty = parseFloat(item.quantity?.toString() || "0");
            const price = parseFloat(item.unitPrice?.toString() || "0");
            worksheet.addRow({
              prNumber: pr.prNumber,
              category: pr.category,
              projectTitle: pr.projectTitle,
              donor: pr.donorName,
              requester: pr.requesterName,
              status: pr.status,
              date: (typeof pr.createdAt === 'string' ? pr.createdAt : pr.createdAt?.toISOString?.() || '').split("T")[0],
              totalAmount: totalAmount.toFixed(2),
              lineNumber: item.lineNumber,
              description: item.description,
              specifications: item.specifications,
              quantity: qty,
              unit: item.unit,
              unitPrice: price.toFixed(2),
              lineTotal: (qty * price).toFixed(2),
            });
          });
        }
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        data: Buffer.from(buffer).toString("base64"),
        filename: `PR_Export_${new Date().toISOString().split("T")[0]}.xlsx`,
      };
    }),

  importFromExcel: scopedProcedure
    .input(z.object({
      fileData: z.string(), // base64 encoded Excel file
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      
      // Decode base64 and load workbook
      const buffer = Buffer.from(input.fileData, "base64");
      await workbook.xlsx.load(buffer);
      
      const worksheet = workbook.getWorksheet("طلبات الشراء") || workbook.getWorksheet("Purchase Requests");
      if (!worksheet) {
        throw new Error("Invalid file: 'طلبات الشراء' or 'Purchase Requests' sheet not found");
      }
      
      const results: { success: boolean; row: number; prNumber?: string; error?: string }[] = [];
      const prGroups: Map<string, any[]> = new Map();
      
      // Parse rows and group by PR (rows with same header info = same PR)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (rowNumber === 2) return; // Skip example row
        
        const rowData = {
          category: row.getCell(1).value?.toString().trim(),
          projectTitle: row.getCell(2).value?.toString().trim(),
          donor: row.getCell(3).value?.toString().trim(),
          budgetCode: row.getCell(4).value?.toString().trim(),
          department: row.getCell(5).value?.toString().trim(),
          requesterName: row.getCell(6).value?.toString().trim(),
          requesterEmail: row.getCell(7).value?.toString().trim(),
          neededByDate: row.getCell(8).value?.toString().trim(),
          urgency: row.getCell(9).value?.toString().trim(),
          deliveryLocation: row.getCell(10).value?.toString().trim(),
          justification: row.getCell(11).value?.toString().trim(),
          lineDescription: row.getCell(12).value?.toString().trim(),
          specifications: row.getCell(13).value?.toString().trim(),
          quantity: row.getCell(14).value?.toString().trim(),
          unit: row.getCell(15).value?.toString().trim(),
          unitPrice: row.getCell(16).value?.toString().trim(),
          rowNumber,
        };
        
        // Skip empty rows
        if (!rowData.projectTitle && !rowData.lineDescription) return;
        
        // Group key: combination of PR header fields
        const groupKey = `${rowData.category}|${rowData.projectTitle}|${rowData.requesterName}`;
        
        if (!prGroups.has(groupKey)) {
          prGroups.set(groupKey, []);
        }
        prGroups.get(groupKey)!.push(rowData);
      });
      
      // Create PRs from groups
      for (const [groupKey, rows] of prGroups) {
        try {
          const firstRow = rows[0];
          
          // Validate required fields
          if (!firstRow.category || !firstRow.projectTitle || !firstRow.requesterName) {
            results.push({
              success: false,
              row: firstRow.rowNumber,
              error: "Missing required fields: Category, Project Title, or Requester Name",
            });
            continue;
          }
          
          // Validate category
          if (!["goods", "services", "works"].includes(firstRow.category)) {
            results.push({
              success: false,
              row: firstRow.rowNumber,
              error: `Invalid category: ${firstRow.category}. Must be: goods, services, or works`,
            });
            continue;
          }
          
          // Generate PR number
          const { generatePRNumber } = await import("./services/procurementNumbering");
          const prNumber = await generatePRNumber(organizationId, operatingUnitId || 0);
          
          // Calculate total amount
          let totalAmount = 0;
          const lineItems = rows.map((row) => {
            const qty = parseFloat(row.quantity || "0");
            const price = parseFloat(row.unitPrice || "0");
            totalAmount += qty * price;
            
            return {
              description: row.lineDescription || "",
              specifications: row.specifications,
              quantity: row.quantity || "0",
              unit: row.unit || "Piece",
              unitPrice: row.unitPrice || "0",
            };
          });
          
          // Parse needed by date
          let neededBy: Date | undefined;
          if (firstRow.neededByDate) {
            const parsed = new Date(firstRow.neededByDate);
            if (!isNaN(parsed.getTime())) {
              neededBy = parsed;
            }
          }
          
          // Create PR
          const prResult = await db.insert(purchaseRequests).values({
            prNumber,
            category: firstRow.category as any,
            projectTitle: firstRow.projectTitle,
            donorName: firstRow.donor,
            budgetCode: firstRow.budgetCode,
            department: firstRow.department,
            requesterName: firstRow.requesterName,
            requesterEmail: firstRow.requesterEmail,
            neededBy,
            urgency: firstRow.urgency as any || "normal",
            deliveryLocation: firstRow.deliveryLocation,
            justification: firstRow.justification,
            prTotalUSD: totalAmount.toFixed(2),
            status: "draft",
            organizationId,
            operatingUnitId,
            createdBy: ctx.user.id,
          });
          
          const prId = prResult[0].insertId;
          
          // Create line items
          if (lineItems.length > 0) {
            await db.insert(purchaseRequestLineItems).values(
              lineItems.map((item, index) => {
                const qty = parseFloat(item.quantity) || 0;
                const price = parseFloat(item.unitPrice) || 0;
                return {
                  purchaseRequestId: prId,
                  lineNumber: index + 1,
                  description: item.description,
                  specifications: item.specifications,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPrice: item.unitPrice,
                  totalPrice: (qty * price).toFixed(2),
                };
              })
            );
          }
          
          results.push({
            success: true,
            row: firstRow.rowNumber,
            prNumber,
          });
        } catch (error: any) {
          results.push({
            success: false,
            row: rows[0].rowNumber,
            error: error.message || "Unknown error",
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      return {
        success: errorCount === 0,
        imported: successCount,
        failed: errorCount,
        results,
      };
    }),

  /**
   * Validate budget for PR
   */
  validateBudget: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        budgetLineId: z.number().optional(),
        requestedAmount: z.number(),
        currency: z.string().default("USD"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement actual budget validation logic
      // For now, return mock data structure
      const availableBudget = 50000; // Mock value
      const allocatedBudget = 100000; // Mock value
      const spentBudget = 30000; // Mock value
      
      const isSufficient = availableBudget >= input.requestedAmount;
      const warningLevel = !isSufficient ? "error" : 
                          (availableBudget < input.requestedAmount * 1.2) ? "warning" : "ok";
      
      return {
        available: availableBudget,
        allocated: allocatedBudget,
        spent: spentBudget,
        requested: input.requestedAmount,
        remaining: availableBudget - input.requestedAmount,
        isSufficient,
        warningLevel,
        message: !isSufficient 
          ? `Insufficient budget. Available: $${availableBudget.toLocaleString()}, Requested: $${input.requestedAmount.toLocaleString()}`
          : warningLevel === "warning"
          ? `Budget is tight. Only $${availableBudget.toLocaleString()} available.`
          : `Budget available: $${availableBudget.toLocaleString()}`,
      };
    }),
});

// ============================================================================
// PURCHASE ORDERS ROUTER
// ============================================================================

const purchaseOrdersRouter = router({
  list: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["draft", "sent", "acknowledged", "partially_delivered", "delivered", "completed", "cancelled"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const conditions = [
        eq(purchaseOrders.organizationId, organizationId),
        sql`${purchaseOrders.isDeleted} = 0`,
      ];
      
      if (input.status) conditions.push(eq(purchaseOrders.status, input.status));
      if (input.search) {
        conditions.push(like(purchaseOrders.poNumber, `%${input.search}%`));
      }
      
      const results = await db.select().from(purchaseOrders)
        .where(and(...conditions))
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(input.limit).offset(input.offset);
      
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseOrders).where(and(...conditions));
      
      return { items: results, total: countResult[0]?.count || 0 };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const po = await db.select().from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.id, input.id),
          eq(purchaseOrders.organizationId, organizationId),
          sql`${purchaseOrders.isDeleted} = 0`
        ))
        .limit(1);
      
      if (!po[0]) return null;
      
      const lineItems = await db.select().from(purchaseOrderLineItems)
        .where(eq(purchaseOrderLineItems.purchaseOrderId, input.id))
        .orderBy(purchaseOrderLineItems.lineNumber);
      
      let supplier = null;
      if (po[0].supplierId) {
        const supplierResult = await db.select().from(vendors)
          .where(eq(vendors.id, po[0].supplierId)).limit(1);
        supplier = supplierResult[0] || null;
      }
      
      return { ...po[0], lineItems, supplier };
    }),

  create: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number().optional(),
      supplierId: z.number().optional(),
      poNumber: z.string(),
      category: z.enum(["goods", "services", "works"]).optional(),
      projectTitle: z.string().optional(),
      projectTitleAr: z.string().optional(),
      currency: z.string().optional(),
      exchangeRate: z.string().optional(),
      paymentTerms: z.string().optional(),
      deliveryTerms: z.string().optional(),
      deliveryAddress: z.string().optional(),
      deliveryAddressAr: z.string().optional(),
      expectedDeliveryDate: z.date().optional(),
      notes: z.string().optional(),
      notesAr: z.string().optional(),
      status: z.enum(["draft", "sent", "acknowledged"]).optional(),
      lineItems: z.array(z.object({
        description: z.string(),
        descriptionAr: z.string().optional(),
        specifications: z.string().optional(),
        quantity: z.string(),
        unit: z.string().optional(),
        unitPrice: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Guard: Block PO creation for Services/Works/Consultancy (they use Contract → SAC → Invoice, no PO)
      // For Goods >= $25K: Allow PO but require approved contract + enforce value ceiling
      if (input.purchaseRequestId) {
        const [pr] = await db.select({
          category: purchaseRequests.category,
          total: purchaseRequests.total,
          prTotalUsd: purchaseRequests.prTotalUsd,
        })
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, input.purchaseRequestId))
          .limit(1);
        const contractChainCategories = ['services', 'consultancy', 'works'];
        const isStandardContractChain = pr && contractChainCategories.includes(pr.category || '');
        
        // Services/Works/Consultancy: PO is fully blocked (they use SAC/Invoice chain)
        if (isStandardContractChain) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `PO creation is not allowed for ${pr!.category} PRs. Use the Contract → SAC → Invoice chain instead.`,
          });
        }

        // Goods >= $25K: PO allowed but requires approved contract + value ceiling
        const totalUSD = pr ? parseFloat(pr.prTotalUsd || pr.total || '0') : 0;
        const isGoodsContractRequired = pr && (pr.category || '').toLowerCase() === 'goods' && totalUSD >= 25000;
        if (isGoodsContractRequired) {
          // Check contract exists and is approved
          const [contract] = await db.select()
            .from(contracts)
            .where(
              and(
                eq(contracts.purchaseRequestId, input.purchaseRequestId!),
                eq(contracts.organizationId, organizationId),
                sql`${contracts.isDeleted} = 0`
              )
            )
            .limit(1);

          if (!contract) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'A contract must be created before generating a PO for Goods above $25,000.',
            });
          }
          if (!['approved', 'active'].includes(contract.status)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Contract must be approved before creating a PO. Current status: ${contract.status}`,
            });
          }

          // Contract expiry check
          if (contract.endDate) {
            const endDate = new Date(contract.endDate);
            const now = new Date();
            if (endDate < now) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Contract has expired on ${endDate.toISOString().split('T')[0]}. Please renew or extend the contract before creating a PO.`,
              });
            }
          }

          // Contract value ceiling: PO total must not exceed remaining contract value
          const contractValue = parseFloat(contract.contractValue || '0');
          const existingPOs = await db.select({
            totalAmount: purchaseOrders.totalAmount,
          })
            .from(purchaseOrders)
            .where(
              and(
                eq(purchaseOrders.purchaseRequestId, input.purchaseRequestId!),
                eq(purchaseOrders.organizationId, organizationId),
                sql`${purchaseOrders.isDeleted} = 0`,
                sql`${purchaseOrders.status} != 'cancelled'`
              )
            );

          const existingPOTotal = existingPOs.reduce((sum, po) => sum + parseFloat(po.totalAmount || '0'), 0);
          const remainingContractValue = contractValue - existingPOTotal;

          // Calculate the new PO total from line items
          let newPOTotal = 0;
          input.lineItems.forEach((item) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice || '0') || 0;
            newPOTotal += qty * price;
          });

          if (newPOTotal > remainingContractValue) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `PO amount ($${newPOTotal.toLocaleString()}) exceeds remaining contract value ($${remainingContractValue.toLocaleString()}). Contract value: $${contractValue.toLocaleString()}, existing POs: $${existingPOTotal.toLocaleString()}.`,
            });
          }
        }
      }

      const { lineItems, ...poData } = input;
      
      let totalAmount = 0;
      lineItems.forEach((item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice || "0") || 0;
        const recurrence = parseFloat(item.recurrence || "1") || 1;
        totalAmount += qty * price * recurrence;
      });
      
      const result = await db.insert(purchaseOrders).values({
        ...poData, organizationId, operatingUnitId, totalAmount: totalAmount.toFixed(2),
        createdBy: ctx.user.id, updatedBy: ctx.user.id,
      });
      
      const poId = result[0].insertId;
      
      if (lineItems.length > 0) {
        await db.insert(purchaseOrderLineItems).values(
          lineItems.map((item, index) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice || "0") || 0;
            return {
              purchaseOrderId: poId,
              lineNumber: index + 1,
              description: item.description,
              descriptionAr: item.descriptionAr,
              specifications: item.specifications,
              quantity: item.quantity,
              unit: item.unit || "Piece",
              unitPrice: item.unitPrice || "0",
              totalPrice: (qty * price).toFixed(2),
            };
          })
        );
      }
      
      return { id: poId };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(purchaseOrders).set({
        isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user.id,
      }).where(and(eq(purchaseOrders.id, input.id), eq(purchaseOrders.organizationId, organizationId)));
      return { success: true };
    }),
});

// ============================================================================
// GRN ROUTER
// ============================================================================

const grnRouter = router({
  list: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["pending_inspection", "inspected", "accepted", "partially_accepted", "rejected"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const conditions = [
        eq(goodsReceiptNotes.organizationId, organizationId),
        sql`${goodsReceiptNotes.isDeleted} = 0`,
      ];
      
      if (input.status) conditions.push(eq(goodsReceiptNotes.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(goodsReceiptNotes.grnNumber, `%${input.search}%`),
            like(goodsReceiptNotes.deliveryNoteNumber, `%${input.search}%`)
          )!
        );
      }
      
      const results = await db.select().from(goodsReceiptNotes)
        .where(and(...conditions))
        .orderBy(desc(goodsReceiptNotes.createdAt))
        .limit(input.limit).offset(input.offset);
      
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(goodsReceiptNotes).where(and(...conditions));
      
      return { items: results, total: countResult[0]?.count || 0 };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const grn = await db.select().from(goodsReceiptNotes)
        .where(and(
          eq(goodsReceiptNotes.id, input.id),
          eq(goodsReceiptNotes.organizationId, organizationId),
          sql`${goodsReceiptNotes.isDeleted} = 0`
        ))
        .limit(1);
      
      if (!grn[0]) return null;
      
      const lineItems = await db.select().from(grnLineItems)
        .where(eq(grnLineItems.grnId, input.id))
        .orderBy(grnLineItems.lineNumber);
      
      return { ...grn[0], lineItems };
    }),

  create: scopedProcedure
    .input(z.object({
      purchaseOrderId: z.number().optional(),
      supplierId: z.number().optional(),
      grnNumber: z.string(),
      deliveryNoteNumber: z.string().optional(),
      invoiceNumber: z.string().optional(),
      warehouse: z.string().optional(),
      warehouseAr: z.string().optional(),
      receivedBy: z.string().optional(),
      inspectedBy: z.string().optional(),
      remarks: z.string().optional(),
      remarksAr: z.string().optional(),
      lineItems: z.array(z.object({
        poLineItemId: z.number().optional(),
        description: z.string(),
        unit: z.string().optional(),
        orderedQty: z.string().optional(),
        receivedQty: z.string(),
        acceptedQty: z.string().optional(),
        rejectedQty: z.string().optional(),
        rejectionReason: z.string().optional(),
        remarks: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const { lineItems, ...grnData } = input;
      
      let totalReceived = 0, totalAccepted = 0, totalRejected = 0;
      lineItems.forEach((item) => {
        totalReceived += parseFloat(item.receivedQty) || 0;
        totalAccepted += parseFloat(item.acceptedQty || item.receivedQty) || 0;
        totalRejected += parseFloat(item.rejectedQty || "0") || 0;
      });
      
      const result = await db.insert(goodsReceiptNotes).values({
        ...grnData, organizationId, operatingUnitId,
        totalReceived: Math.round(totalReceived),
        totalAccepted: Math.round(totalAccepted),
        totalRejected: Math.round(totalRejected),
        createdBy: ctx.user.id, updatedBy: ctx.user.id,
      });
      
      const grnId = result[0].insertId;
      
      if (lineItems.length > 0) {
        await db.insert(grnLineItems).values(
          lineItems.map((item, index) => ({
            grnId,
            lineNumber: index + 1,
            poLineItemId: item.poLineItemId,
            description: item.description,
            unit: item.unit || "Piece",
            orderedQty: item.orderedQty || "0",
            receivedQty: item.receivedQty,
            acceptedQty: item.acceptedQty || item.receivedQty,
            rejectedQty: item.rejectedQty || "0",
            rejectionReason: item.rejectionReason,
            remarks: item.remarks,
          }))
        );
      }
      
      return { id: grnId };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(goodsReceiptNotes).set({
        isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user.id,
      }).where(and(eq(goodsReceiptNotes.id, input.id), eq(goodsReceiptNotes.organizationId, organizationId)));
      return { success: true };
    }),
});

// ============================================================================
// STOCK ROUTER
// ============================================================================

const stockRouter = router({
  listItems: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["in_stock", "low_stock", "out_of_stock", "discontinued"]).optional(),
      category: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const conditions = [
        eq(stockItems.organizationId, organizationId),
        sql`${stockItems.isDeleted} = 0`,
      ];
      
      if (input.category) conditions.push(eq(stockItems.category, input.category));
      if (input.search) {
        conditions.push(
          or(
            like(stockItems.itemName, `%${input.search}%`),
            like(stockItems.itemCode, `%${input.search}%`)
          )!
        );
      }
      
      const results = await db.select().from(stockItems)
        .where(and(...conditions))
        .orderBy(desc(stockItems.createdAt))
        .limit(input.limit).offset(input.offset);
      
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(stockItems).where(and(...conditions));
      
      return { items: results, total: countResult[0]?.count || 0 };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const result = await db.select().from(stockItems)
        .where(and(
          eq(stockItems.id, input.id),
          eq(stockItems.organizationId, organizationId),
          sql`${stockItems.isDeleted} = 0`
        ))
        .limit(1);
      return result[0] || null;
    }),

  create: scopedProcedure
    .input(z.object({
      itemCode: z.string(),
      itemName: z.string(),
      itemNameAr: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      unitType: z.string().optional(),
      warehouseLocation: z.string().optional(),
      binLocation: z.string().optional(),
      currentQuantity: z.string().optional(),
      minimumQuantity: z.string().optional(),
      maximumQuantity: z.string().optional(),
      reorderLevel: z.string().optional(),
      unitCost: z.string().optional(),
      currency: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      const qty = parseFloat(input.currentQuantity || "0") || 0;
      const price = parseFloat(input.unitCost || "0") || 0;
      
      const result = await db.insert(stockItems).values({
        ...input, organizationId, totalValue: (qty * price).toFixed(2),
        createdBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      itemName: z.string().optional(),
      itemNameAr: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      unitType: z.string().optional(),
      warehouseLocation: z.string().optional(),
      binLocation: z.string().optional(),
      currentQuantity: z.string().optional(),
      minimumQuantity: z.string().optional(),
      maximumQuantity: z.string().optional(),
      reorderLevel: z.string().optional(),
      unitCost: z.string().optional(),
      currency: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      const { id, ...data } = input;
      
      const updates: Record<string, unknown> = { ...data };
      
      if (data.currentQuantity !== undefined || data.unitCost !== undefined) {
        const current = await db.select().from(stockItems)
          .where(and(eq(stockItems.id, id), eq(stockItems.organizationId, organizationId)))
          .limit(1);
        if (current[0]) {
          const qty = parseFloat(data.currentQuantity || String(current[0].currentQuantity)) || 0;
          const price = parseFloat(data.unitCost || String(current[0].unitCost)) || 0;
          updates.totalValue = (qty * price).toFixed(2);
        }
      }
      
      await db.update(stockItems).set(updates)
        .where(and(eq(stockItems.id, id), eq(stockItems.organizationId, organizationId)));
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(stockItems).set({
        isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user.id,
      }).where(and(eq(stockItems.id, input.id), eq(stockItems.organizationId, organizationId)));
      return { success: true };
    }),

  listRequests: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const conditions: any[] = [
        eq(stockRequests.organizationId, organizationId),
        sql`${stockRequests.isDeleted} = 0`,
      ];
      
      if (input.status) conditions.push(eq(stockRequests.status, input.status as any));
      if (input.search) {
        conditions.push(
          or(
            like(stockRequests.requestNumber, `%${input.search}%`),
            like(stockRequests.requesterName, `%${input.search}%`)
          )!
        );
      }
      
      const results = await db.select().from(stockRequests)
        .where(and(...conditions))
        .orderBy(desc(stockRequests.createdAt))
        .limit(input.limit).offset(input.offset);
      
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(stockRequests).where(and(...conditions));
      
      return { items: results, total: countResult[0]?.count || 0 };
    }),
});

// ============================================================================
// STOCK ISSUED ROUTER
// ============================================================================

const stockIssuedRouter = router({
  list: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["draft", "issued", "acknowledged", "cancelled"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const conditions = [
        eq(stockIssued.organizationId, organizationId),
        sql`${stockIssued.isDeleted} = 0`,
      ];
      
      if (input.status) conditions.push(eq(stockIssued.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(stockIssued.issueNumber, `%${input.search}%`),
            like(stockIssued.issuedTo, `%${input.search}%`)
          )!
        );
      }
      
      const results = await db.select().from(stockIssued)
        .where(and(...conditions))
        .orderBy(desc(stockIssued.createdAt))
        .limit(input.limit).offset(input.offset);
      
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(stockIssued).where(and(...conditions));
      
      return { items: results, total: countResult[0]?.count || 0 };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const result = await db.select().from(stockIssued)
        .where(and(
          eq(stockIssued.id, input.id),
          eq(stockIssued.organizationId, organizationId),
          sql`${stockIssued.isDeleted} = 0`
        ))
        .limit(1);
      
      if (!result[0]) return null;
      
      // Get line items
      const lineItems = await db.select().from(stockIssuedLineItems)
        .where(eq(stockIssuedLineItems.stockIssuedId, input.id))
        .orderBy(stockIssuedLineItems.lineNumber);
      
      return { ...result[0], lineItems };
    }),

  create: scopedProcedure
    .input(z.object({
      issueNumber: z.string(),
      issueDate: z.string().optional(),
      issuedTo: z.string(),
      issuedBy: z.string().optional(),
      department: z.string().optional(),
      remarks: z.string().optional(),
      status: z.enum(["draft", "issued"]).default("draft"),
      lineItems: z.array(z.object({
        stockItemId: z.number().optional(),
        lineNumber: z.number(),
        description: z.string(),
        issuedQty: z.string(),
        unit: z.string().optional(),
        remarks: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const { lineItems, ...issueData } = input;
      
      // Insert stock issued record
      const result = await db.insert(stockIssued).values({
        ...issueData,
        organizationId,
        operatingUnitId,
        issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
        createdBy: ctx.user.id,
      });
      
      const issuedId = result[0].insertId;
      
      // Insert line items
      if (lineItems.length > 0) {
        await db.insert(stockIssuedLineItems).values(
          lineItems.map(item => ({
            stockIssuedId: issuedId,
            ...item,
          }))
        );
      }
      
      // If status is 'issued', update stock quantities
      if (input.status === "issued") {
        for (const item of lineItems) {
          if (item.stockItemId) {
            await db.execute(sql`
              UPDATE stock_items 
              SET currentQuantity = currentQuantity - ${item.issuedQty}
              WHERE id = ${item.stockItemId} AND organizationId = ${organizationId}
            `);
          }
        }
      }
      
      return { id: issuedId };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      issuedTo: z.string().optional(),
      issuedBy: z.string().optional(),
      department: z.string().optional(),
      remarks: z.string().optional(),
      status: z.enum(["draft", "issued", "acknowledged", "cancelled"]).optional(),
      lineItems: z.array(z.object({
        id: z.number().optional(),
        stockItemId: z.number().optional(),
        lineNumber: z.number(),
        description: z.string(),
        issuedQty: z.string(),
        unit: z.string().optional(),
        remarks: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      const { id, lineItems, ...data } = input;
      
      // Get current record to check status change
      const current = await db.select().from(stockIssued)
        .where(and(eq(stockIssued.id, id), eq(stockIssued.organizationId, organizationId)))
        .limit(1);
      
      if (!current[0]) throw new Error("Stock issued record not found");
      
      // Update main record
      await db.update(stockIssued).set({
        ...data,
        updatedBy: ctx.user.id,
      }).where(and(eq(stockIssued.id, id), eq(stockIssued.organizationId, organizationId)));
      
      // If status changed from draft to issued, update stock quantities
      if (current[0].status === "draft" && input.status === "issued" && lineItems) {
        for (const item of lineItems) {
          if (item.stockItemId) {
            await db.execute(sql`
              UPDATE stock_items 
              SET currentQuantity = currentQuantity - ${item.issuedQty}
              WHERE id = ${item.stockItemId} AND organizationId = ${organizationId}
            `);
          }
        }
      }
      
      // Update line items if provided
      if (lineItems) {
        // Delete existing line items
        await db.delete(stockIssuedLineItems).where(eq(stockIssuedLineItems.stockIssuedId, id));
        
        // Insert new line items
        if (lineItems.length > 0) {
          await db.insert(stockIssuedLineItems).values(
            lineItems.map(item => ({
              stockIssuedId: id,
              stockItemId: item.stockItemId,
              lineNumber: item.lineNumber,
              description: item.description,
              issuedQty: item.issuedQty,
              unit: item.unit,
              remarks: item.remarks,
            }))
          );
        }
      }
      
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(stockIssued).set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: ctx.user.id,
      }).where(and(eq(stockIssued.id, input.id), eq(stockIssued.organizationId, organizationId)));
      
      return { success: true };
    }),
});

// ============================================================================
// RETURNED ITEMS ROUTER
// ============================================================================

const returnedItemsRouter = router({
  list: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["draft", "submitted", "inspected", "accepted", "rejected"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const conditions = [
        eq(returnedItems.organizationId, organizationId),
        sql`${returnedItems.isDeleted} = 0`,
      ];
      
      if (input.status) conditions.push(eq(returnedItems.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(returnedItems.returnNumber, `%${input.search}%`),
            like(returnedItems.returnedBy, `%${input.search}%`)
          )!
        );
      }
      
      const results = await db.select().from(returnedItems)
        .where(and(...conditions))
        .orderBy(desc(returnedItems.createdAt))
        .limit(input.limit).offset(input.offset);
      
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(returnedItems).where(and(...conditions));
      
      return { items: results, total: countResult[0]?.count || 0 };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const result = await db.select().from(returnedItems)
        .where(and(
          eq(returnedItems.id, input.id),
          eq(returnedItems.organizationId, organizationId),
          sql`${returnedItems.isDeleted} = 0`
        ))
        .limit(1);
      
      if (!result[0]) return null;
      
      // Get line items
      const lineItems = await db.select().from(returnedItemLineItems)
        .where(eq(returnedItemLineItems.returnedItemId, input.id))
        .orderBy(returnedItemLineItems.lineNumber);
      
      return { ...result[0], lineItems };
    }),

  create: scopedProcedure
    .input(z.object({
      returnNumber: z.string(),
      returnDate: z.string().optional(),
      returnedBy: z.string(),
      department: z.string().optional(),
      reason: z.string().optional(),
      reasonAr: z.string().optional(),
      remarks: z.string().optional(),
      status: z.enum(["draft", "submitted"]).default("draft"),
      lineItems: z.array(z.object({
        stockItemId: z.number().optional(),
        lineNumber: z.number(),
        description: z.string(),
        returnedQty: z.string(),
        condition: z.enum(["good", "damaged", "expired", "defective"]).optional(),
        unit: z.string().optional(),
        remarks: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const { lineItems, ...returnData } = input;
      
      // Insert returned item record
      const result = await db.insert(returnedItems).values({
        ...returnData,
        organizationId,
        operatingUnitId,
        returnDate: input.returnDate ? new Date(input.returnDate) : new Date(),
        createdBy: ctx.user.id,
      });
      
      const returnId = result[0].insertId;
      
      // Insert line items
      if (lineItems.length > 0) {
        await db.insert(returnedItemLineItems).values(
          lineItems.map(item => ({
            returnedItemId: returnId,
            ...item,
          }))
        );
      }
      
      return { id: returnId };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      returnedBy: z.string().optional(),
      department: z.string().optional(),
      reason: z.string().optional(),
      reasonAr: z.string().optional(),
      remarks: z.string().optional(),
      status: z.enum(["draft", "submitted", "inspected", "accepted", "rejected"]).optional(),
      inspectedBy: z.string().optional(),
      lineItems: z.array(z.object({
        id: z.number().optional(),
        stockItemId: z.number().optional(),
        lineNumber: z.number(),
        description: z.string(),
        returnedQty: z.string(),
        acceptedQty: z.string().optional(),
        condition: z.enum(["good", "damaged", "expired", "defective"]).optional(),
        unit: z.string().optional(),
        remarks: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      const { id, lineItems, ...data } = input;
      
      // Get current record
      const current = await db.select().from(returnedItems)
        .where(and(eq(returnedItems.id, id), eq(returnedItems.organizationId, organizationId)))
        .limit(1);
      
      if (!current[0]) throw new Error("Returned item record not found");
      
      // Update main record
      const updates: any = { ...data, updatedBy: ctx.user.id };
      if (input.status === "inspected" && !current[0].inspectedAt) {
        updates.inspectedAt = new Date();
      }
      
      await db.update(returnedItems).set(updates)
        .where(and(eq(returnedItems.id, id), eq(returnedItems.organizationId, organizationId)));
      
      // If status changed to accepted, update stock quantities with accepted quantities
      if (input.status === "accepted" && lineItems) {
        for (const item of lineItems) {
          if (item.stockItemId && item.acceptedQty) {
            await db.execute(sql`
              UPDATE stock_items 
              SET currentQuantity = currentQuantity + ${item.acceptedQty}
              WHERE id = ${item.stockItemId} AND organizationId = ${organizationId}
            `);
          }
        }
      }
      
      // Update line items if provided
      if (lineItems) {
        // Delete existing line items
        await db.delete(returnedItemLineItems).where(eq(returnedItemLineItems.returnedItemId, id));
        
        // Insert new line items
        if (lineItems.length > 0) {
          await db.insert(returnedItemLineItems).values(
            lineItems.map(item => ({
              returnedItemId: id,
              stockItemId: item.stockItemId,
              lineNumber: item.lineNumber,
              description: item.description,
              returnedQty: item.returnedQty,
              acceptedQty: item.acceptedQty,
              condition: item.condition,
              unit: item.unit,
              remarks: item.remarks,
            }))
          );
        }
      }
      
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(returnedItems).set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: ctx.user.id,
      }).where(and(eq(returnedItems.id, input.id), eq(returnedItems.organizationId, organizationId)));
      
      return { success: true };
    }),
});

// ============================================================================
// VEHICLES ROUTER
// ============================================================================

const vehiclesRouter = router({
  list: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["active", "under_maintenance", "retired", "disposed"]).optional(),
      type: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const conditions = [
        eq(vehicles.organizationId, organizationId),
        sql`${vehicles.isDeleted} = 0`,
      ];
      
      if (input.status) conditions.push(eq(vehicles.status, input.status));
      if (input.type) conditions.push(eq(vehicles.vehicleType, input.type));
      if (input.search) {
        conditions.push(
          or(
            like(vehicles.plateNumber, `%${input.search}%`),
            like(vehicles.vehicleId, `%${input.search}%`),
            like(vehicles.brand, `%${input.search}%`),
            like(vehicles.model, `%${input.search}%`)
          )!
        );
      }
      
      const results = await db.select().from(vehicles)
        .where(and(...conditions))
        .orderBy(desc(vehicles.createdAt))
        .limit(input.limit).offset(input.offset);
      
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(vehicles).where(and(...conditions));
      
      return { items: results, total: countResult[0]?.count || 0 };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const result = await db.select().from(vehicles)
        .where(and(
          eq(vehicles.id, input.id),
          eq(vehicles.organizationId, organizationId),
          sql`${vehicles.isDeleted} = 0`
        ))
        .limit(1);
      return result[0] || null;
    }),

  create: scopedProcedure
    .input(z.object({
      vehicleId: z.string().optional(),
      plateNumber: z.string(),
      vehicleType: z.string().optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      year: z.number().optional(),
      color: z.string().optional(),
      chassisNumber: z.string().optional(),
      engineNumber: z.string().optional(),
      fuelType: z.enum(["petrol", "diesel", "electric", "hybrid"]).optional(),
      ownership: z.enum(["owned", "leased", "rented"]).optional(),
      purchaseDate: z.date().optional(),
      purchaseValue: z.string().optional(),
      currency: z.string().optional(),
      currentOdometer: z.string().optional(),
      insuranceExpiry: z.date().optional(),
      licenseExpiry: z.date().optional(),
      inspectionExpiry: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db.insert(vehicles).values({
        ...input, organizationId, operatingUnitId, createdBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      plateNumber: z.string().optional(),
      vehicleType: z.string().optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      year: z.number().optional(),
      color: z.string().optional(),
      chassisNumber: z.string().optional(),
      engineNumber: z.string().optional(),
      fuelType: z.enum(["petrol", "diesel", "electric", "hybrid"]).optional(),
      ownership: z.enum(["owned", "leased", "rented"]).optional(),
      status: z.enum(["active", "under_maintenance", "retired", "disposed"]).optional(),
      currentOdometer: z.string().optional(),
      insuranceExpiry: z.date().optional(),
      licenseExpiry: z.date().optional(),
      inspectionExpiry: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      const { id, ...data } = input;
      
      await db.update(vehicles).set({ ...data })
        .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, organizationId)));
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(vehicles).set({
        isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user.id,
      }).where(and(eq(vehicles.id, input.id), eq(vehicles.organizationId, organizationId)));
      return { success: true };
    }),
});

// ============================================================================
// DRIVERS ROUTER
// ============================================================================

const driversRouter = router({
  list: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["active", "inactive", "on_leave", "terminated"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const conditions = [
        eq(drivers.organizationId, organizationId),
        sql`${drivers.isDeleted} = 0`,
      ];
      
      if (input.status) conditions.push(eq(drivers.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(drivers.fullName, `%${input.search}%`),
            like(drivers.driverId, `%${input.search}%`),
            like(drivers.phone, `%${input.search}%`)
          )!
        );
      }
      
      const results = await db.select().from(drivers)
        .where(and(...conditions))
        .orderBy(desc(drivers.createdAt))
        .limit(input.limit).offset(input.offset);
      
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(drivers).where(and(...conditions));
      
      return { items: results, total: countResult[0]?.count || 0 };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const result = await db.select().from(drivers)
        .where(and(
          eq(drivers.id, input.id),
          eq(drivers.organizationId, organizationId),
          sql`${drivers.isDeleted} = 0`
        ))
        .limit(1);
      return result[0] || null;
    }),

  create: scopedProcedure
    .input(z.object({
      driverId: z.string().optional(),
      fullName: z.string(),
      fullNameAr: z.string().optional(),
      staffId: z.number().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      licenseNumber: z.string().optional(),
      licenseType: z.string().optional(),
      licenseExpiry: z.date().optional(),
      licenseIssuingCountry: z.string().optional(),
      status: z.enum(["active", "inactive", "on_leave", "terminated"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db.insert(drivers).values({
        ...input, organizationId, operatingUnitId, createdBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      fullName: z.string().optional(),
      fullNameAr: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      licenseNumber: z.string().optional(),
      licenseType: z.string().optional(),
      licenseExpiry: z.date().optional(),
      licenseIssuingCountry: z.string().optional(),
      status: z.enum(["active", "inactive", "on_leave", "terminated"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      const { id, ...data } = input;
      
      await db.update(drivers).set({ ...data, updatedBy: ctx.user.id })
        .where(and(eq(drivers.id, id), eq(drivers.organizationId, organizationId)));
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(drivers).set({
        isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user.id,
      }).where(and(eq(drivers.id, input.id), eq(drivers.organizationId, organizationId)));
      return { success: true };
    }),
});

// ============================================================================
// TRIP LOGS ROUTER
// ============================================================================

const tripLogsRouter = router({
  list: scopedProcedure
    .input(z.object({
      vehicleId: z.number().optional(),
      driverId: z.number().optional(),
      status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const conditions = [
        eq(tripLogs.organizationId, organizationId),
        eq(tripLogs.isDeleted, false),
      ];
      
      if (input.vehicleId) conditions.push(eq(tripLogs.vehicleId, input.vehicleId));
      if (input.driverId) conditions.push(eq(tripLogs.driverId, input.driverId));
      if (input.status) conditions.push(eq(tripLogs.status, input.status));
      
      const results = await db.select().from(tripLogs)
        .where(and(...conditions))
        .orderBy(desc(tripLogs.tripDate))
        .limit(input.limit).offset(input.offset);
      
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(tripLogs).where(and(...conditions));
      
      return { items: results, total: countResult[0]?.count || 0 };
    }),

  create: scopedProcedure
    .input(z.object({
      vehicleId: z.number(),
      driverId: z.number().optional(),
      tripNumber: z.string(),
      tripDate: z.date(),
      purpose: z.string().optional(),
      purposeAr: z.string().optional(),
      startLocation: z.string().optional(),
      endLocation: z.string().optional(),
      startMileage: z.string().optional(),
      endMileage: z.string().optional(),
      startTime: z.date().optional(),
      endTime: z.date().optional(),
      passengers: z.string().optional(),
      projectCode: z.string().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const startMileage = parseFloat(input.startMileage || "0") || 0;
      const endMileage = parseFloat(input.endMileage || "0") || 0;
      const distanceTraveled = endMileage > startMileage ? (endMileage - startMileage).toFixed(2) : "0";
      
      const result = await db.insert(tripLogs).values({
        ...input, organizationId, operatingUnitId, distanceTraveled, createdBy: ctx.user.id, updatedBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(tripLogs).set({
        isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user.id,
      }).where(and(eq(tripLogs.id, input.id), eq(tripLogs.organizationId, organizationId)));
      return { success: true };
    }),
});

// ============================================================================
// FUEL LOGS ROUTER
// ============================================================================

const fuelLogsRouter = router({
  list: scopedProcedure
    .input(z.object({
      vehicleId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      const conditions = [
        eq(fuelLogs.organizationId, organizationId),
        eq(fuelLogs.isDeleted, false),
      ];
      
      if (input.vehicleId) conditions.push(eq(fuelLogs.vehicleId, input.vehicleId));
      
      const results = await db.select().from(fuelLogs)
        .where(and(...conditions))
        .orderBy(desc(fuelLogs.fuelDate))
        .limit(input.limit).offset(input.offset);
      
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(fuelLogs).where(and(...conditions));
      
      return { items: results, total: countResult[0]?.count || 0 };
    }),

  create: scopedProcedure
    .input(z.object({
      vehicleId: z.number(),
      driverId: z.number().optional(),
      fuelLogNumber: z.string(),
      fuelDate: z.date(),
      fuelType: z.enum(["petrol", "diesel", "electric"]).optional(),
      quantity: z.string(),
      unitPrice: z.string().optional(),
      currency: z.string().optional(),
      mileageAtFill: z.string().optional(),
      station: z.string().optional(),
      receiptNumber: z.string().optional(),
      projectCode: z.string().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const qty = parseFloat(input.quantity) || 0;
      const price = parseFloat(input.unitPrice || "0") || 0;
      const totalCost = (qty * price).toFixed(2);
      
      const result = await db.insert(fuelLogs).values({
        ...input, organizationId, operatingUnitId, totalCost, createdBy: ctx.user.id, updatedBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      
      await db.update(fuelLogs).set({
        isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user.id,
      }).where(and(eq(fuelLogs.id, input.id), eq(fuelLogs.organizationId, organizationId)));
      return { success: true };
    }),
});

// ============================================================================
// MAINTENANCE ROUTER
// ============================================================================

const maintenanceRouter = router({
  list: scopedProcedure
    .input(z.object({ vehicleId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      let conditions = [
        eq(vehicleMaintenance.organizationId, organizationId),
        sql`${vehicleMaintenance.isDeleted} = 0`,
      ];
      if (input.vehicleId) {
        conditions.push(eq(vehicleMaintenance.vehicleId, input.vehicleId));
      }
      const records = await db.select().from(vehicleMaintenance)
        .where(and(...conditions))
        .orderBy(desc(vehicleMaintenance.maintenanceDate));
      return records;
    }),
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      const record = await db.select().from(vehicleMaintenance)
        .where(and(
          eq(vehicleMaintenance.id, input.id),
          eq(vehicleMaintenance.organizationId, organizationId),
          sql`${vehicleMaintenance.isDeleted} = 0`
        ))
        .limit(1);
      if (!record.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Maintenance record not found' });
      return record[0];
    }),
  create: scopedProcedure
    .input(z.object({
      vehicleId: z.number(),
      maintenanceType: z.string(),
      maintenanceDate: z.string(),
      description: z.string().optional(),
      serviceProvider: z.string().optional(),
      cost: z.string().optional(),
      nextServiceDate: z.string().optional(),
      nextServiceOdometer: z.string().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      const result = await db.insert(vehicleMaintenance).values({
        ...input,
        organizationId,
        operatingUnitId,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      vehicleId: z.number().optional(),
      maintenanceType: z.string().optional(),
      maintenanceDate: z.string().optional(),
      description: z.string().optional(),
      serviceProvider: z.string().optional(),
      cost: z.string().optional(),
      nextServiceDate: z.string().optional(),
      nextServiceOdometer: z.string().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      const { id, ...updateData } = input;
      await db.update(vehicleMaintenance)
        .set({ ...updateData, updatedBy: ctx.user.id, updatedAt: new Date() })
        .where(and(
          eq(vehicleMaintenance.id, id),
          eq(vehicleMaintenance.organizationId, organizationId),
          sql`${vehicleMaintenance.isDeleted} = 0`
        ));
      return { success: true };
    }),
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;
      await db.update(vehicleMaintenance)
        .set({ isDeleted: 1, deletedAt: new Date(), deletedBy: ctx.user.id })
        .where(and(
          eq(vehicleMaintenance.id, input.id),
          eq(vehicleMaintenance.organizationId, organizationId)
        ));
      return { success: true };
    }),
});

// ============================================================================
// DASHBOARD STATS ROUTER
// ============================================================================

const dashboardRouter = router({
  getStats: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Purchase Requests stats
      // Count all PRs that are NOT Approved or Rejected as "Pending"
      // Pending statuses: draft, submitted, validated_by_logistic, validated_by_finance
      // Terminal statuses (NOT pending): approved, rejected_by_pm, rejected_by_logistic, rejected_by_finance
      const prPending = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseRequests)
        .where(and(
          eq(purchaseRequests.organizationId, organizationId),
          sql`${purchaseRequests.isDeleted} = 0`,
          sql`${purchaseRequests.status} NOT IN ('approved', 'rejected_by_pm', 'rejected_by_logistic', 'rejected_by_finance')`
        ));
      // Count only Approved PRs
      const prApproved = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseRequests)
        .where(and(
          eq(purchaseRequests.organizationId, organizationId),
          sql`${purchaseRequests.isDeleted} = 0`,
          eq(purchaseRequests.status, 'approved')
        ));
      
      // Count Rejected PRs (all rejection statuses combined)
      const prRejected = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseRequests)
        .where(and(
          eq(purchaseRequests.organizationId, organizationId),
          sql`${purchaseRequests.isDeleted} = 0`,
          sql`${purchaseRequests.status} IN ('rejected_by_pm', 'rejected_by_logistic', 'rejected_by_finance')`
        ));
      
      // Purchase Orders stats
      const poOpen = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.organizationId, organizationId),
          sql`${purchaseOrders.isDeleted} = 0`,
          or(
            eq(purchaseOrders.status, 'approved'),
            eq(purchaseOrders.status, 'sent_to_supplier'),
            eq(purchaseOrders.status, 'partially_received')
          )
        ));
      const poDelivered = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.organizationId, organizationId),
          sql`${purchaseOrders.isDeleted} = 0`,
          eq(purchaseOrders.status, 'fully_received')
        ));
      
      // GRN stats
      const grnPending = await db.select({ count: sql<number>`count(*)` })
        .from(goodsReceiptNotes)
        .where(and(
          eq(goodsReceiptNotes.organizationId, organizationId),
          sql`${goodsReceiptNotes.isDeleted} = 0`,
          eq(goodsReceiptNotes.status, 'pending_inspection')
        ));
      const grnAccepted = await db.select({ count: sql<number>`count(*)` })
        .from(goodsReceiptNotes)
        .where(and(
          eq(goodsReceiptNotes.organizationId, organizationId),
          sql`${goodsReceiptNotes.isDeleted} = 0`,
          eq(goodsReceiptNotes.status, 'accepted')
        ));
      
      // Stock stats
      const stockInStock = await db.select({ count: sql<number>`count(*)` })
        .from(stockItems)
        .where(and(
          eq(stockItems.organizationId, organizationId),
          sql`${stockItems.isDeleted} = 0`,
          sql`currentQuantity > 0`
        ));
      const stockLow = await db.select({ count: sql<number>`count(*)` })
        .from(stockItems)
        .where(and(
          eq(stockItems.organizationId, organizationId),
          sql`${stockItems.isDeleted} = 0`,
          sql`currentQuantity <= reorderLevel`
        ));
      
      // Vehicles stats
      const vehiclesActive = await db.select({ count: sql<number>`count(*)` })
        .from(vehicles)
        .where(and(
          eq(vehicles.organizationId, organizationId),
          sql`${vehicles.isDeleted} = 0`,
          eq(vehicles.status, 'active')
        ));
      const vehiclesTotal = await db.select({ count: sql<number>`count(*)` })
        .from(vehicles)
        .where(and(
          eq(vehicles.organizationId, organizationId),
          sql`${vehicles.isDeleted} = 0`
        ));
      
      // Drivers stats
      const driversActive = await db.select({ count: sql<number>`count(*)` })
        .from(drivers)
        .where(and(
          eq(drivers.organizationId, organizationId),
          sql`${drivers.isDeleted} = 0`,
          eq(drivers.status, 'active')
        ));
      
      return {
        purchaseRequests: {
          pending: prPending[0]?.count || 0,
          approved: prApproved[0]?.count || 0,
          rejected: prRejected[0]?.count || 0,
        },

        purchaseOrders: {
          open: poOpen[0]?.count || 0,
          delivered: poDelivered[0]?.count || 0,
        },
        grn: {
          pending: grnPending[0]?.count || 0,
          accepted: grnAccepted[0]?.count || 0,
        },
        stock: {
          inStock: stockInStock[0]?.count || 0,
          lowStock: stockLow[0]?.count || 0,
        },
        vehicles: {
          active: vehiclesActive[0]?.count || 0,
          total: vehiclesTotal[0]?.count || 0,
        },
        drivers: {
          active: driversActive[0]?.count || 0,
        },
      };
    }),
});

// ============================================================================
// STOCK KPIs ROUTER
// ============================================================================
const stockKPIsRouter = router({
  getKPIs: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      // Current month boundaries (UTC)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const monthStartStr = monthStart.toISOString().slice(0, 19).replace('T', ' ');
      const monthEndStr = monthEnd.toISOString().slice(0, 19).replace('T', ' ');

      // Issued items this month (status = 'issued' or 'acknowledged')
      const issuedThisMonth = await db.select({ count: sql<number>`count(*)` })
        .from(stockIssued)
        .where(and(
          eq(stockIssued.organizationId, organizationId),
          sql`${stockIssued.isDeleted} = 0`,
          sql`${stockIssued.status} IN ('issued','acknowledged')`,
          sql`${stockIssued.createdAt} >= ${monthStartStr}`,
          sql`${stockIssued.createdAt} <= ${monthEndStr}`,
        ));

      // Pending issued (status = 'draft')
      const pendingIssued = await db.select({ count: sql<number>`count(*)` })
        .from(stockIssued)
        .where(and(
          eq(stockIssued.organizationId, organizationId),
          sql`${stockIssued.isDeleted} = 0`,
          eq(stockIssued.status, 'draft'),
        ));

      // Returns this month
      const returnsThisMonth = await db.select({ count: sql<number>`count(*)` })
        .from(returnedItems)
        .where(and(
          eq(returnedItems.organizationId, organizationId),
          sql`${returnedItems.isDeleted} = 0`,
          sql`${returnedItems.createdAt} >= ${monthStartStr}`,
          sql`${returnedItems.createdAt} <= ${monthEndStr}`,
        ));

      // Under inspection (status = 'submitted' or 'inspected')
      const underInspection = await db.select({ count: sql<number>`count(*)` })
        .from(returnedItems)
        .where(and(
          eq(returnedItems.organizationId, organizationId),
          sql`${returnedItems.isDeleted} = 0`,
          sql`${returnedItems.status} IN ('submitted','inspected')`,
        ));

      return {
        issuedThisMonth: issuedThisMonth[0]?.count || 0,
        pendingIssued: pendingIssued[0]?.count || 0,
        returnsThisMonth: returnsThisMonth[0]?.count || 0,
        underInspection: underInspection[0]?.count || 0,
      };
    }),
});

// ============================================================================
// FLEET KPIs ROUTER
// ============================================================================
const fleetKPIsRouter = router({
  getKPIs: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      // Current month boundaries
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const monthStartStr = monthStart.toISOString().slice(0, 19).replace('T', ' ');
      const monthEndStr = monthEnd.toISOString().slice(0, 19).replace('T', ' ');

      // 30 days from now for "expiring soon"
      const thirtyDaysLater = new Date(now);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const thirtyDaysLaterStr = thirtyDaysLater.toISOString().slice(0, 19).replace('T', ' ');
      const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

      // Trips this month
      const tripsThisMonth = await db.select({ count: sql<number>`count(*)` })
        .from(tripLogs)
        .where(and(
          eq(tripLogs.organizationId, organizationId),
          eq(tripLogs.isDeleted, false),
          sql`${tripLogs.createdAt} >= ${monthStartStr}`,
          sql`${tripLogs.createdAt} <= ${monthEndStr}`,
        ));

      // Ongoing trips
      const ongoingTrips = await db.select({ count: sql<number>`count(*)` })
        .from(tripLogs)
        .where(and(
          eq(tripLogs.organizationId, organizationId),
          eq(tripLogs.isDeleted, false),
          eq(tripLogs.status, 'in_progress'),
        ));

      // Scheduled maintenance
      const scheduledMaintenance = await db.select({ count: sql<number>`count(*)` })
        .from(vehicleMaintenance)
        .where(and(
          eq(vehicleMaintenance.organizationId, organizationId),
          sql`${vehicleMaintenance.isDeleted} = 0`,
          eq(vehicleMaintenance.status, 'scheduled'),
        ));

      // In-progress maintenance
      const inProgressMaintenance = await db.select({ count: sql<number>`count(*)` })
        .from(vehicleMaintenance)
        .where(and(
          eq(vehicleMaintenance.organizationId, organizationId),
          sql`${vehicleMaintenance.isDeleted} = 0`,
          eq(vehicleMaintenance.status, 'in_progress'),
        ));

      // Fuel this month: sum of quantity
      const fuelThisMonth = await db.select({ total: sql<number>`COALESCE(SUM(quantity), 0)` })
        .from(fuelLogs)
        .where(and(
          eq(fuelLogs.organizationId, organizationId),
          eq(fuelLogs.isDeleted, false),
          sql`${fuelLogs.createdAt} >= ${monthStartStr}`,
          sql`${fuelLogs.createdAt} <= ${monthEndStr}`,
        ));

      // Fuel cost this month: sum of totalCost
      const fuelCostThisMonth = await db.select({ total: sql<number>`COALESCE(SUM(totalCost), 0)` })
        .from(fuelLogs)
        .where(and(
          eq(fuelLogs.organizationId, organizationId),
          eq(fuelLogs.isDeleted, false),
          sql`${fuelLogs.createdAt} >= ${monthStartStr}`,
          sql`${fuelLogs.createdAt} <= ${monthEndStr}`,
        ));

      // Compliance: vehicles with any expiry within next 30 days (expiring soon)
      const expiringSoon = await db.select({ count: sql<number>`count(*)` })
        .from(vehicles)
        .where(and(
          eq(vehicles.organizationId, organizationId),
          sql`${vehicles.isDeleted} = 0`,
          sql`(
            (${vehicles.insuranceExpiry} IS NOT NULL AND ${vehicles.insuranceExpiry} >= ${nowStr} AND ${vehicles.insuranceExpiry} <= ${thirtyDaysLaterStr})
            OR (${vehicles.licenseExpiry} IS NOT NULL AND ${vehicles.licenseExpiry} >= ${nowStr} AND ${vehicles.licenseExpiry} <= ${thirtyDaysLaterStr})
            OR (${vehicles.inspectionExpiry} IS NOT NULL AND ${vehicles.inspectionExpiry} >= ${nowStr} AND ${vehicles.inspectionExpiry} <= ${thirtyDaysLaterStr})
          )`,
        ));

      // Compliance: vehicles with any expired document
      const expired = await db.select({ count: sql<number>`count(*)` })
        .from(vehicles)
        .where(and(
          eq(vehicles.organizationId, organizationId),
          sql`${vehicles.isDeleted} = 0`,
          sql`(
            (${vehicles.insuranceExpiry} IS NOT NULL AND ${vehicles.insuranceExpiry} < ${nowStr})
            OR (${vehicles.licenseExpiry} IS NOT NULL AND ${vehicles.licenseExpiry} < ${nowStr})
            OR (${vehicles.inspectionExpiry} IS NOT NULL AND ${vehicles.inspectionExpiry} < ${nowStr})
          )`,
        ));

      return {
        tripsThisMonth: tripsThisMonth[0]?.count || 0,
        ongoingTrips: ongoingTrips[0]?.count || 0,
        scheduledMaintenance: scheduledMaintenance[0]?.count || 0,
        inProgressMaintenance: inProgressMaintenance[0]?.count || 0,
        fuelThisMonthL: Math.round(fuelThisMonth[0]?.total || 0),
        fuelCostThisMonth: parseFloat(String(fuelCostThisMonth[0]?.total || 0)).toFixed(2),
        expiringSoon: expiringSoon[0]?.count || 0,
        expired: expired[0]?.count || 0,
      };
    }),
});

// ============================================================================
// SEED DATA ROUTER
// ============================================================================
import { seedLogisticsData } from "./seedLogisticsData";

const seedRouter = router({
  seedTestData: scopedProcedure
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      return await seedLogisticsData(organizationId, operatingUnitId);
    }),
});

// ============================================================================
// FLEET ROUTER (wraps vehicles and drivers)
// ============================================================================
const fleetRouter = router({
  listVehicles: vehiclesRouter.list,
  listDrivers: driversRouter.list,
  getVehicle: vehiclesRouter.getById,
  getDriver: driversRouter.getById,
  createVehicle: vehiclesRouter.create,
  createDriver: driversRouter.create,
  updateVehicle: vehiclesRouter.update,
  updateDriver: driversRouter.update,
  deleteVehicle: vehiclesRouter.delete,
  deleteDriver: driversRouter.delete,
});

// ============================================================================
// MAIN LOGISTICS ROUTER
// ============================================================================
export const logisticsRouter = router({
  purchaseRequests: purchaseRequestsRouter,
  purchaseOrders: purchaseOrdersRouter,
  grn: grnRouter,
  stock: stockRouter,
  stockIssued: stockIssuedRouter,
  returnedItems: returnedItemsRouter,
  vehicles: vehiclesRouter,
  drivers: driversRouter,
  fleet: fleetRouter,
  tripLogs: tripLogsRouter,
  fuelLogs: fuelLogsRouter,
  maintenance: maintenanceRouter,
  seed: seedRouter,
  dashboard: dashboardRouter,
  
  // Procurement Workspace Architecture
  prWorkspace: purchaseRequestRouter,
  workflowTracker: workflowTrackerRouter,
  rfq: rfqRouter,
  quotationAnalysis: quotationAnalysisRouter,
  bidAnalysis: bidAnalysisRouter,
  bidOpeningMinutes: bidOpeningMinutesRouter,
  bidEvaluation: bidEvaluationRouter,
  po: purchaseOrderRouter,
  procurementGrn: procurementGrnRouter,
  procurementDn: procurementDnRouter,
  package: packageRouter,
  analytics: analyticsRouter,
  scheduledReports: scheduledReportsRouter,
  
  // Supplier Quotation Entry (Goods PRs > $25K)
  supplierQuotation: supplierQuotationRouter,
  
  // PR Workflow Dashboard
  prWorkflowDashboard: prWorkflowDashboardRouter,
  
  // Vendor Management
  vendors: vendorRouter,

  // KPI aggregations for landing pages
  stockKPIs: stockKPIsRouter,
  fleetKPIs: fleetKPIsRouter,

  // Batch-based Stock Management
  stockMgmt: stockManagementRouter,
});

export type LogisticsRouter = typeof logisticsRouter;
