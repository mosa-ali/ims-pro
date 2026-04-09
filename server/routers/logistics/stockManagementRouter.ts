/**
 * Stock Management Router
 * Batch-based stock management with FEFO/FIFO issuing, stock ledger,
 * stock requests, returns, and enhanced KPIs.
 *
 * Architecture: GRN → Stock Batch → Issue/Transfer/Return/Adjustment → Ledger
 * Available qty is ALWAYS computed: acceptedQty - issuedQty - reservedQty - lossAdjustments + returnsAccepted
 */

import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and, desc, asc, like, or, sql, isNull, isNotNull, gte, lte } from "drizzle-orm";
import {
  stockBatches,
  stockItems,
  stockIssues,
  stockIssueLines,
  stockLedger,
  stockRequests,
  stockRequestLineItems,
  stockReservations,
  returnedItems,
  returnedItemLineItems,
  warehouseTransfers,
  warehouseTransferLines,
  projects,
  stockAdjustments,
  stockAdjustmentLines,
  physicalCountSessions,
  physicalCountLines,
  expiryAlertHistory,
  warehouseAlertConfigs,
} from "../../../drizzle/schema";
import { notifyOwner } from "../../_core/notification";
import { TRPCError } from "@trpc/server";

// ============================================================================
// HELPER: Compute available qty for a batch
// ============================================================================
function computeAvailableQty(batch: {
  acceptedQty: string | number | null;
  issuedQty: string | number | null;
  reservedQty: string | number | null;
  lossAdjustments: string | number | null;
  returnsAccepted: string | number | null;
}): number {
  return (
    parseFloat(String(batch.acceptedQty || 0)) -
    parseFloat(String(batch.issuedQty || 0)) -
    parseFloat(String(batch.reservedQty || 0)) -
    parseFloat(String(batch.lossAdjustments || 0)) +
    parseFloat(String(batch.returnsAccepted || 0))
  );
}

// ============================================================================
// HELPER: FEFO/FIFO batch allocation
// ============================================================================
async function allocateBatches(
  db: any,
  itemId: number,
  organizationId: number,
  requestedQty: number,
  warehouseId?: number | null
): Promise<Array<{ batchId: number; batchNumber: string; qty: number; expiryDate: string | null; unitCost: number }>> {
  const conditions: any[] = [
    eq(stockBatches.itemId, itemId),
    eq(stockBatches.organizationId, organizationId),
    eq(stockBatches.batchStatus, "available"),
  ];
  if (warehouseId) {
    conditions.push(eq(stockBatches.warehouseId, warehouseId));
  }

  // Get all available batches
  const batches = await db
    .select()
    .from(stockBatches)
    .where(and(...conditions));

  // Separate into expiry and non-expiry batches
  const expiryBatches = batches
    .filter((b: any) => b.expiryDate)
    .sort((a: any, b: any) => {
      const dateA = new Date(a.expiryDate).getTime();
      const dateB = new Date(b.expiryDate).getTime();
      if (dateA !== dateB) return dateA - dateB; // FEFO: earliest expiry first
      return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
    });

  const noExpiryBatches = batches
    .filter((b: any) => !b.expiryDate)
    .sort((a: any, b: any) => {
      return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime(); // FIFO
    });

  // Prefer expiry batches first (FEFO), then non-expiry (FIFO)
  const sortedBatches = [...expiryBatches, ...noExpiryBatches];

  const allocations: Array<{ batchId: number; batchNumber: string; qty: number; expiryDate: string | null; unitCost: number }> = [];
  let remaining = requestedQty;

  for (const batch of sortedBatches) {
    if (remaining <= 0) break;
    const available = computeAvailableQty(batch);
    if (available <= 0) continue;

    const allocateQty = Math.min(remaining, available);
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      qty: allocateQty,
      expiryDate: batch.expiryDate,
      unitCost: parseFloat(String(batch.unitCost || 0)),
    });
    remaining -= allocateQty;
  }

  return allocations;
}

// ============================================================================
// STOCK BATCHES SUB-ROUTER
// ============================================================================
const batchesRouter = router({
  /** List batches for an item (with computed available qty) */
  listByItem: scopedProcedure
    .input(z.object({
      itemId: z.number(),
      warehouseId: z.number().optional(),
      includeEmpty: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const conditions: any[] = [
        eq(stockBatches.itemId, input.itemId),
        eq(stockBatches.organizationId, organizationId),
      ];
      if (!input.includeEmpty) {
        conditions.push(eq(stockBatches.batchStatus, "available"));
      }
      if (input.warehouseId) {
        conditions.push(eq(stockBatches.warehouseId, input.warehouseId));
      }

      const batches = await db
        .select()
        .from(stockBatches)
        .where(and(...conditions))
        .orderBy(asc(stockBatches.expiryDate), asc(stockBatches.receivedDate));

      return batches.map((b: any) => ({
        ...b,
        availableQty: computeAvailableQty(b),
      }));
    }),

  /** List all batches with item info (for stock overview) */
  listAll: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      warehouseId: z.number().optional(),
      status: z.enum(["available", "reserved", "depleted", "expired", "quarantined"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const conditions: any[] = [
        eq(stockBatches.organizationId, organizationId),
      ];
      if (input.status) conditions.push(eq(stockBatches.batchStatus, input.status));
      if (input.warehouseId) conditions.push(eq(stockBatches.warehouseId, input.warehouseId));

      const batches = await db
        .select({
          batch: stockBatches,
          itemName: stockItems.itemName,
          itemCode: stockItems.itemCode,
          category: stockItems.category,
          unitType: stockItems.unitType,
        })
        .from(stockBatches)
        .leftJoin(stockItems, eq(stockBatches.itemId, stockItems.id))
        .where(and(...conditions))
        .orderBy(desc(stockBatches.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockBatches)
        .where(and(...conditions));

      return {
        items: batches.map((row: any) => ({
          ...row.batch,
          itemName: row.itemName,
          itemCode: row.itemCode,
          category: row.category,
          unitType: row.unitType,
          availableQty: computeAvailableQty(row.batch),
        })),
        total: countResult[0]?.count || 0,
      };
    }),

  /** Get FEFO/FIFO suggested batches for issuing */
  getSuggested: scopedProcedure
    .input(z.object({
      itemId: z.number(),
      requestedQty: z.number(),
      warehouseId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const allocations = await allocateBatches(
        db,
        input.itemId,
        organizationId,
        input.requestedQty,
        input.warehouseId
      );

      const totalAllocated = allocations.reduce((sum, a) => sum + a.qty, 0);
      const shortfall = input.requestedQty - totalAllocated;

      return {
        allocations,
        totalAllocated,
        shortfall: shortfall > 0 ? shortfall : 0,
        allocationMethod: allocations.some(a => a.expiryDate) ? "FEFO" : "FIFO",
      };
    }),
});

// ============================================================================
// STOCK ISSUES SUB-ROUTER (Batch-based)
// ============================================================================
const issuesRouter = router({
  /** List all stock issues */
  list: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["draft", "submitted", "issued", "acknowledged", "cancelled"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const conditions: any[] = [
        eq(stockIssues.organizationId, organizationId),
      ];
      if (input.status) conditions.push(eq(stockIssues.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(stockIssues.issueNumber, `%${input.search}%`),
            like(stockIssues.issuedTo, `%${input.search}%`)
          )!
        );
      }

      const results = await db
        .select()
        .from(stockIssues)
        .where(and(...conditions))
        .orderBy(desc(stockIssues.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockIssues)
        .where(and(...conditions));

      return { items: results, total: countResult[0]?.count || 0 };
    }),

  /** Get issue by ID with lines */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const [issue] = await db
        .select()
        .from(stockIssues)
        .where(and(
          eq(stockIssues.id, input.id),
          eq(stockIssues.organizationId, organizationId)
        ))
        .limit(1);

      if (!issue) return null;

      // Get issue lines with batch and item info
      const lines = await db
        .select({
          line: stockIssueLines,
          batchNumber: stockBatches.batchNumber,
          expiryDate: stockBatches.expiryDate,
          itemName: stockItems.itemName,
          itemCode: stockItems.itemCode,
        })
        .from(stockIssueLines)
        .leftJoin(stockBatches, eq(stockIssueLines.batchId, stockBatches.id))
        .leftJoin(stockItems, eq(stockIssueLines.itemId, stockItems.id))
        .where(eq(stockIssueLines.issueId, input.id));

      return {
        ...issue,
        lines: lines.map((row: any) => ({
          ...row.line,
          batchNumber: row.batchNumber,
          expiryDate: row.expiryDate,
          itemName: row.itemName,
          itemCode: row.itemCode,
        })),
      };
    }),

  /** Create a new stock issue with batch-level lines */
  create: scopedProcedure
    .input(z.object({
      issuedTo: z.string(),
      issuedToType: z.enum(["person", "department", "project", "activity"]).default("person"),
      projectId: z.number().optional(),
      warehouseId: z.number().optional(),
      warehouseName: z.string().optional(),
      purpose: z.string().optional(),
      remarks: z.string().optional(),
      lines: z.array(z.object({
        itemId: z.number(),
        batchId: z.number(),
        qtyIssued: z.number(),
        unit: z.string().default("Piece"),
        notes: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Generate issue number
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockIssues)
        .where(eq(stockIssues.organizationId, organizationId));
      const seq = (countResult[0]?.count || 0) + 1;
      const issueNumber = `ISS-${String(seq).padStart(5, "0")}`;

      // Validate all batches have sufficient available qty
      for (const line of input.lines) {
        const [batch] = await db
          .select()
          .from(stockBatches)
          .where(and(
            eq(stockBatches.id, line.batchId),
            eq(stockBatches.organizationId, organizationId)
          ))
          .limit(1);

        if (!batch) {
          throw new TRPCError({ code: "NOT_FOUND", message: `Batch ${line.batchId} not found` });
        }

        const available = computeAvailableQty(batch);
        if (line.qtyIssued > available) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient stock in batch ${batch.batchNumber}. Available: ${available}, Requested: ${line.qtyIssued}`,
          });
        }
      }

      // Create issue header
      const [issueResult] = await db
        .insert(stockIssues)
        .values({
          organizationId,
          operatingUnitId,
          issueNumber,
          issueDate: new Date(),
          issuedTo: input.issuedTo,
          issuedToType: input.issuedToType,
          projectId: input.projectId,
          warehouseId: input.warehouseId,
          warehouseName: input.warehouseName,
          purpose: input.purpose,
          remarks: input.remarks,
          status: "issued",
          issuedBy: ctx.user.id,
        })
        .$returningId();

      const issueId = issueResult.id;

      // Create issue lines, update batch quantities, and create ledger entries
      for (const line of input.lines) {
        // Insert issue line
        await db.insert(stockIssueLines).values({
          issueId,
          itemId: line.itemId,
          batchId: line.batchId,
          qtyIssued: String(line.qtyIssued),
          unit: line.unit,
          notes: line.notes,
        });

        // Update batch issuedQty
        await db.execute(sql`
          UPDATE stock_batches
          SET issuedQty = issuedQty + ${line.qtyIssued}
          WHERE id = ${line.batchId} AND organizationId = ${organizationId}
        `);

        // Check if batch is now depleted
        const [updatedBatch] = await db
          .select()
          .from(stockBatches)
          .where(eq(stockBatches.id, line.batchId))
          .limit(1);

        if (updatedBatch && computeAvailableQty(updatedBatch) <= 0) {
          await db
            .update(stockBatches)
            .set({ batchStatus: "depleted" })
            .where(eq(stockBatches.id, line.batchId));
        }

        // Get batch info for ledger
        const [batch] = await db
          .select()
          .from(stockBatches)
          .where(eq(stockBatches.id, line.batchId))
          .limit(1);

        // Create stock ledger entry
        await db.insert(stockLedger).values({
          organizationId,
          operatingUnitId,
          movementType: "ISSUE_OUT",
          referenceType: "ISSUE",
          referenceId: issueId,
          referenceNumber: issueNumber,
          warehouseId: batch?.warehouseId || input.warehouseId,
          warehouseName: batch?.warehouseName || input.warehouseName,
          batchId: line.batchId,
          itemId: line.itemId,
          qtyChange: String(-line.qtyIssued), // Negative for OUT
          unit: line.unit,
          unitCost: String(batch?.unitCost || 0),
          totalValue: String(line.qtyIssued * parseFloat(String(batch?.unitCost || 0))),
          userId: ctx.user.id,
          notes: `Issue to ${input.issuedTo}: ${input.purpose || ""}`,
          transactionDate: new Date(),
        });
      }

      return { id: issueId, issueNumber };
    }),
});

// ============================================================================
// STOCK REQUESTS SUB-ROUTER
// ============================================================================
const requestsRouter = router({
  /** List stock requests */
  list: scopedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["draft", "submitted", "approved", "partially_issued", "issued", "rejected", "cancelled"]).optional(),
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
      if (input.status) conditions.push(eq(stockRequests.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(stockRequests.requestNumber, `%${input.search}%`),
            like(stockRequests.requesterName, `%${input.search}%`)
          )!
        );
      }

      const results = await db
        .select()
        .from(stockRequests)
        .where(and(...conditions))
        .orderBy(desc(stockRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockRequests)
        .where(and(...conditions));

      return { items: results, total: countResult[0]?.count || 0 };
    }),

  /** Get request by ID with lines */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const [request] = await db
        .select()
        .from(stockRequests)
        .where(and(
          eq(stockRequests.id, input.id),
          eq(stockRequests.organizationId, organizationId),
          sql`${stockRequests.isDeleted} = 0`
        ))
        .limit(1);

      if (!request) return null;

      const lines = await db
        .select({
          line: stockRequestLineItems,
          itemName: stockItems.itemName,
          itemCode: stockItems.itemCode,
        })
        .from(stockRequestLineItems)
        .leftJoin(stockItems, eq(stockRequestLineItems.stockItemId, stockItems.id))
        .where(eq(stockRequestLineItems.stockRequestId, input.id))
        .orderBy(asc(stockRequestLineItems.lineNumber));

      return {
        ...request,
        lines: lines.map((row: any) => ({
          ...row.line,
          itemName: row.itemName,
          itemCode: row.itemCode,
        })),
      };
    }),

  /** Create a new stock request */
  create: scopedProcedure
    .input(z.object({
      requesterName: z.string(),
      requesterDepartment: z.string().optional(),
      purpose: z.string().optional(),
      neededByDate: z.string().optional(),
      lines: z.array(z.object({
        stockItemId: z.number(),
        description: z.string(),
        requestedQty: z.string(),
        unit: z.string().default("Piece"),
        remarks: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Generate request number
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockRequests)
        .where(eq(stockRequests.organizationId, organizationId));
      const seq = (countResult[0]?.count || 0) + 1;
      const requestNumber = `SR-${String(seq).padStart(5, "0")}`;

      const [result] = await db
        .insert(stockRequests)
        .values({
          organizationId,
          operatingUnitId,
          requestNumber,
          requesterName: input.requesterName,
          requesterDepartment: input.requesterDepartment,
          purpose: input.purpose,
          neededByDate: input.neededByDate ? new Date(input.neededByDate) : null,
          status: "submitted",
          createdBy: ctx.user.id,
        })
        .$returningId();

      const requestId = result.id;

      // Insert line items
      for (let i = 0; i < input.lines.length; i++) {
        const line = input.lines[i];
        await db.insert(stockRequestLineItems).values({
          stockRequestId: requestId,
          stockItemId: line.stockItemId,
          lineNumber: i + 1,
          description: line.description,
          requestedQty: line.requestedQty,
          unit: line.unit,
          remarks: line.remarks,
        });
      }

      return { id: requestId, requestNumber };
    }),

  /** Approve a stock request */
  approve: scopedProcedure
    .input(z.object({
      id: z.number(),
      approvedLines: z.array(z.object({
        lineId: z.number(),
        approvedQty: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      // Update request status
      await db
        .update(stockRequests)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(and(
          eq(stockRequests.id, input.id),
          eq(stockRequests.organizationId, organizationId)
        ));

      // Update approved quantities on each line
      for (const line of input.approvedLines) {
        await db
          .update(stockRequestLineItems)
          .set({ approvedQty: line.approvedQty })
          .where(eq(stockRequestLineItems.id, line.lineId));
      }

      return { success: true };
    }),

  /** Reject a stock request */
  reject: scopedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      await db
        .update(stockRequests)
        .set({
          status: "rejected",
          updatedBy: ctx.user.id,
        })
        .where(and(
          eq(stockRequests.id, input.id),
          eq(stockRequests.organizationId, organizationId)
        ));

      return { success: true };
    }),
});

// ============================================================================
// STOCK RETURNS SUB-ROUTER
// ============================================================================
const returnsRouter = router({
  /** List returns */
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

      const conditions: any[] = [
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

      const results = await db
        .select()
        .from(returnedItems)
        .where(and(...conditions))
        .orderBy(desc(returnedItems.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(returnedItems)
        .where(and(...conditions));

      return { items: results, total: countResult[0]?.count || 0 };
    }),

  /** Get return by ID with lines */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const [returnRecord] = await db
        .select()
        .from(returnedItems)
        .where(and(
          eq(returnedItems.id, input.id),
          eq(returnedItems.organizationId, organizationId),
          sql`${returnedItems.isDeleted} = 0`
        ))
        .limit(1);

      if (!returnRecord) return null;

      const lines = await db
        .select()
        .from(returnedItemLineItems)
        .where(eq(returnedItemLineItems.returnedItemId, input.id))
        .orderBy(returnedItemLineItems.lineNumber);

      return { ...returnRecord, lines };
    }),

  /** Accept a return: update batch quantities and create ledger entries */
  accept: scopedProcedure
    .input(z.object({
      id: z.number(),
      acceptedLines: z.array(z.object({
        lineId: z.number(),
        stockItemId: z.number(),
        acceptedQty: z.number(),
        batchId: z.number().optional(), // If returning to a specific batch
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Update return status
      await db
        .update(returnedItems)
        .set({
          status: "accepted",
          inspectedBy: ctx.user.name || String(ctx.user.id),
          inspectedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(and(
          eq(returnedItems.id, input.id),
          eq(returnedItems.organizationId, organizationId)
        ));

      // Get the return record for reference
      const [returnRecord] = await db
        .select()
        .from(returnedItems)
        .where(eq(returnedItems.id, input.id))
        .limit(1);

      for (const line of input.acceptedLines) {
        if (line.acceptedQty <= 0) continue;

        // Update line accepted qty
        await db
          .update(returnedItemLineItems)
          .set({ acceptedQty: String(line.acceptedQty) })
          .where(eq(returnedItemLineItems.id, line.lineId));

        if (line.batchId) {
          // Update batch returnsAccepted
          await db.execute(sql`
            UPDATE stock_batches
            SET returnsAccepted = returnsAccepted + ${line.acceptedQty},
                batchStatus = 'available'
            WHERE id = ${line.batchId} AND organizationId = ${organizationId}
          `);

          // Get batch for ledger entry
          const [batch] = await db
            .select()
            .from(stockBatches)
            .where(eq(stockBatches.id, line.batchId))
            .limit(1);

          // Create ledger entry
          await db.insert(stockLedger).values({
            organizationId,
            operatingUnitId,
            movementType: "RETURN_IN",
            referenceType: "RETURN",
            referenceId: input.id,
            referenceNumber: returnRecord?.returnNumber || "",
            warehouseId: batch?.warehouseId,
            warehouseName: batch?.warehouseName,
            batchId: line.batchId,
            itemId: line.stockItemId,
            qtyChange: String(line.acceptedQty), // Positive for IN
            unit: "Piece",
            unitCost: String(batch?.unitCost || 0),
            totalValue: String(line.acceptedQty * parseFloat(String(batch?.unitCost || 0))),
            userId: ctx.user.id,
            notes: `Return accepted: ${returnRecord?.returnNumber}`,
            transactionDate: new Date(),
          });
        }
      }

      return { success: true };
    }),
});

// ============================================================================
// STOCK LEDGER SUB-ROUTER
// ============================================================================
const ledgerRouter = router({
  /** List ledger entries with filtering */
  list: scopedProcedure
    .input(z.object({
      itemId: z.number().optional(),
      batchId: z.number().optional(),
      warehouseId: z.number().optional(),
      movementType: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const conditions: any[] = [
        eq(stockLedger.organizationId, organizationId),
      ];
      if (input.itemId) conditions.push(eq(stockLedger.itemId, input.itemId));
      if (input.batchId) conditions.push(eq(stockLedger.batchId, input.batchId));
      if (input.warehouseId) conditions.push(eq(stockLedger.warehouseId, input.warehouseId));

      const results = await db
        .select({
          ledger: stockLedger,
          itemName: stockItems.itemName,
          itemCode: stockItems.itemCode,
          batchNumber: stockBatches.batchNumber,
        })
        .from(stockLedger)
        .leftJoin(stockItems, eq(stockLedger.itemId, stockItems.id))
        .leftJoin(stockBatches, eq(stockLedger.batchId, stockBatches.id))
        .where(and(...conditions))
        .orderBy(desc(stockLedger.transactionDate))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockLedger)
        .where(and(...conditions));

      return {
        items: results.map((row: any) => ({
          ...row.ledger,
          itemName: row.itemName,
          itemCode: row.itemCode,
          batchNumber: row.batchNumber,
        })),
        total: countResult[0]?.count || 0,
      };
    }),
});

// ============================================================================
// ENHANCED KPIs SUB-ROUTER
// ============================================================================
const kpisRouter = router({
  /** Get comprehensive stock KPIs */
  getDashboard: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      const now = new Date();
      const thirtyDaysLater = new Date(now);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const nowStr = now.toISOString().slice(0, 19).replace("T", " ");
      const thirtyDaysStr = thirtyDaysLater.toISOString().slice(0, 19).replace("T", " ");

      // Total unique stock items
      const totalItemsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockItems)
        .where(and(
          eq(stockItems.organizationId, organizationId),
          sql`${stockItems.isDeleted} = 0`
        ));

      // Total available batches (with stock)
      const availableBatches = await db
        .select()
        .from(stockBatches)
        .where(and(
          eq(stockBatches.organizationId, organizationId),
          eq(stockBatches.batchStatus, "available")
        ));

      const inStockBatches = availableBatches.filter(
        (b: any) => computeAvailableQty(b) > 0
      );

      // Low stock items (currentQuantity <= minimumQuantity)
      const lowStockResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockItems)
        .where(and(
          eq(stockItems.organizationId, organizationId),
          sql`${stockItems.isDeleted} = 0`,
          sql`CAST(${stockItems.currentQuantity} AS DECIMAL(15,2)) <= CAST(${stockItems.minimumQuantity} AS DECIMAL(15,2))`,
          sql`CAST(${stockItems.minimumQuantity} AS DECIMAL(15,2)) > 0`
        ));

      // Pending requests
      const pendingRequestsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockRequests)
        .where(and(
          eq(stockRequests.organizationId, organizationId),
          sql`${stockRequests.isDeleted} = 0`,
          sql`${stockRequests.status} IN ('submitted','approved')`
        ));

      // Near expiry (within 30 days)
      const nearExpiryResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockBatches)
        .where(and(
          eq(stockBatches.organizationId, organizationId),
          eq(stockBatches.batchStatus, "available"),
          isNotNull(stockBatches.expiryDate),
          sql`${stockBatches.expiryDate} > ${nowStr}`,
          sql`${stockBatches.expiryDate} <= ${thirtyDaysStr}`
        ));

      // Expired batches
      const expiredResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockBatches)
        .where(and(
          eq(stockBatches.organizationId, organizationId),
          isNotNull(stockBatches.expiryDate),
          sql`${stockBatches.expiryDate} <= ${nowStr}`,
          sql`${stockBatches.batchStatus} != 'depleted'`
        ));

      // In transit (dispatched but not received transfers)
      const inTransitResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(warehouseTransfers)
        .where(and(
          eq(warehouseTransfers.organizationId, organizationId),
          eq(warehouseTransfers.status, "dispatched")
        ));

      // Stock value: SUM(availableQty * unitCost) across all available batches
      const stockValue = inStockBatches.reduce((sum: number, b: any) => {
        const available = computeAvailableQty(b);
        const cost = parseFloat(String(b.unitCost || 0));
        return sum + available * cost;
      }, 0);

      // Recent issues this month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().slice(0, 19).replace("T", " ");
      const issuedThisMonthResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockIssues)
        .where(and(
          eq(stockIssues.organizationId, organizationId),
          sql`${stockIssues.status} IN ('issued','acknowledged')`,
          sql`${stockIssues.createdAt} >= ${monthStartStr}`
        ));

      return {
        totalItems: totalItemsResult[0]?.count || 0,
        inStockBatches: inStockBatches.length,
        lowStock: lowStockResult[0]?.count || 0,
        pendingRequests: pendingRequestsResult[0]?.count || 0,
        nearExpiry: nearExpiryResult[0]?.count || 0,
        expired: expiredResult[0]?.count || 0,
        inTransit: inTransitResult[0]?.count || 0,
        stockValue: Math.round(stockValue * 100) / 100,
        issuedThisMonth: issuedThisMonthResult[0]?.count || 0,
      };
    }),
});

// ============================================================================
// STOCK ITEMS WITH BATCH BREAKDOWN
// ============================================================================
const itemsWithBatchesRouter = router({
  /** Get stock item detail with batch breakdown */
  getDetail: scopedProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      // Get item
      const [item] = await db
        .select()
        .from(stockItems)
        .where(and(
          eq(stockItems.id, input.itemId),
          eq(stockItems.organizationId, organizationId),
          sql`${stockItems.isDeleted} = 0`
        ))
        .limit(1);

      if (!item) return null;

      // Get all batches for this item
      const batches = await db
        .select()
        .from(stockBatches)
        .where(and(
          eq(stockBatches.itemId, input.itemId),
          eq(stockBatches.organizationId, organizationId)
        ))
        .orderBy(asc(stockBatches.expiryDate), asc(stockBatches.receivedDate));

      // Compute totals
      const totalAccepted = batches.reduce((sum: number, b: any) => sum + parseFloat(String(b.acceptedQty || 0)), 0);
      const totalIssued = batches.reduce((sum: number, b: any) => sum + parseFloat(String(b.issuedQty || 0)), 0);
      const totalAvailable = batches.reduce((sum: number, b: any) => sum + computeAvailableQty(b), 0);
      const totalReserved = batches.reduce((sum: number, b: any) => sum + parseFloat(String(b.reservedQty || 0)), 0);

      return {
        item,
        batches: batches.map((b: any) => ({
          ...b,
          availableQty: computeAvailableQty(b),
        })),
        totals: {
          totalAccepted,
          totalIssued,
          totalAvailable,
          totalReserved,
        },
      };
    }),
});

// ============================================================================
// ADJUSTMENTS ROUTER (Admin-only with approval workflow)
// ============================================================================
const adjustmentsRouter = router({
  list: scopedProcedure
    .input(z.object({
      status: z.string().optional(),
      type: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId, operatingUnitId } = ctx;
      const conditions: any[] = [
        eq(stockAdjustments.organizationId, organizationId),
      ];
      if (input?.status) conditions.push(eq(stockAdjustments.status, input.status as any));
      if (input?.type) conditions.push(eq(stockAdjustments.type, input.type as any));
      if (input?.search) conditions.push(like(stockAdjustments.adjustmentNumber, `%${input.search}%`));

      const rows = await db
        .select()
        .from(stockAdjustments)
        .where(and(...conditions))
        .orderBy(desc(stockAdjustments.createdAt))
        .limit(200);

      // Get lines for each adjustment
      const result = await Promise.all(rows.map(async (adj: any) => {
        const lines = await db
          .select()
          .from(stockAdjustmentLines)
          .where(eq(stockAdjustmentLines.adjustmentId, adj.id));
        return { ...adj, lines };
      }));

      return result;
    }),

  create: scopedProcedure
    .input(z.object({
      type: z.enum(['write_off', 'physical_count', 'damage', 'correction', 'donation', 'other']),
      warehouse: z.string().optional(),
      reason: z.string(),
      notes: z.string().optional(),
      lines: z.array(z.object({
        itemId: z.number(),
        batchId: z.number().optional(),
        itemName: z.string(),
        batchNumber: z.string().optional(),
        qtyBefore: z.number(),
        qtyAdjusted: z.number(),
        qtyAfter: z.number(),
        unitCost: z.number().optional(),
        notes: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId, operatingUnitId } = ctx;
      const adjustmentNumber = `ADJ-${organizationId}-${Date.now()}`;

      const [result] = await db.insert(stockAdjustments).values({
        adjustmentNumber,
        type: input.type,
        status: 'draft',
        warehouse: input.warehouse || null,
        reason: input.reason,
        notes: input.notes || null,
        createdBy: ctx.user?.openId || null,
        createdByName: ctx.user?.name || null,
        organizationId,
        operatingUnitId: operatingUnitId || null,
      });

      const adjId = result.insertId;

      for (const line of input.lines) {
        await db.insert(stockAdjustmentLines).values({
          adjustmentId: Number(adjId),
          itemId: line.itemId || null,
          batchId: line.batchId || null,
          itemName: line.itemName || null,
          batchNumber: line.batchNumber || null,
          qtyBefore: String(line.qtyBefore),
          qtyAdjusted: String(line.qtyAdjusted),
          qtyAfter: String(line.qtyAfter),
          unitCost: String(line.unitCost || 0),
          notes: line.notes || null,
        });
      }

      return { id: adjId, adjustmentNumber };
    }),

  submit: scopedProcedure
    .input(z.object({ adjustmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [adj] = await db.select().from(stockAdjustments).where(eq(stockAdjustments.id, input.adjustmentId)).limit(1);
      if (!adj) throw new TRPCError({ code: 'NOT_FOUND', message: 'Adjustment not found' });
      if ((adj as any).status !== 'draft') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft adjustments can be submitted' });

      await db.update(stockAdjustments)
        .set({ status: 'pending_approval', updatedAt: Date.now() })
        .where(eq(stockAdjustments.id, input.adjustmentId));

      return { success: true };
    }),

  approve: scopedProcedure
    .input(z.object({ adjustmentId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [adj] = await db.select().from(stockAdjustments).where(eq(stockAdjustments.id, input.adjustmentId)).limit(1);
      if (!adj) throw new TRPCError({ code: 'NOT_FOUND', message: 'Adjustment not found' });
      if ((adj as any).status !== 'pending_approval') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only pending adjustments can be approved' });

      // Update adjustment status
      await db.update(stockAdjustments)
        .set({
          status: 'approved',
          approvedBy: ctx.user?.openId || null,
          approvedByName: ctx.user?.name || null,
          approvedAt: Date.now(),
          updatedAt: Date.now(),
        })
        .where(eq(stockAdjustments.id, input.adjustmentId));

      // Get lines and create ledger entries
      const lines = await db.select().from(stockAdjustmentLines).where(eq(stockAdjustmentLines.adjustmentId, input.adjustmentId));
      const { organizationId, operatingUnitId } = ctx;

      for (const line of lines) {
        const qtyAdj = parseFloat(String((line as any).qtyAdjusted || 0));
        if (qtyAdj === 0) continue;

        // Create ledger entry
        await db.insert(stockLedger).values({
          organizationId,
          operatingUnitId: operatingUnitId || 0,
          batchId: (line as any).batchId || 0,
          itemId: (line as any).itemId || 0,
          movementType: 'ADJUSTMENT',
          referenceType: 'stock_adjustment',
          referenceId: input.adjustmentId,
          qtyChange: String(qtyAdj),
          balanceAfter: String(parseFloat(String((line as any).qtyAfter || 0))),
          performedBy: ctx.user?.name || 'System',
          notes: `Adjustment ${(adj as any).adjustmentNumber}: ${(adj as any).type} - ${(line as any).itemName || ''}`,
        });

        // Update batch qty if batchId exists
        if ((line as any).batchId) {
          if (qtyAdj < 0) {
            // Loss: increase lossAdjustments
            await db.execute(sql`UPDATE stock_batches SET loss_adjustments = COALESCE(loss_adjustments, 0) + ${Math.abs(qtyAdj)} WHERE id = ${(line as any).batchId}`);
          } else {
            // Gain: increase returnsAccepted (or decrease lossAdjustments)
            await db.execute(sql`UPDATE stock_batches SET returns_accepted = COALESCE(returns_accepted, 0) + ${qtyAdj} WHERE id = ${(line as any).batchId}`);
          }
        }
      }

      return { success: true };
    }),

  reject: scopedProcedure
    .input(z.object({ adjustmentId: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [adj] = await db.select().from(stockAdjustments).where(eq(stockAdjustments.id, input.adjustmentId)).limit(1);
      if (!adj) throw new TRPCError({ code: 'NOT_FOUND', message: 'Adjustment not found' });
      if ((adj as any).status !== 'pending_approval') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only pending adjustments can be rejected' });

      await db.update(stockAdjustments)
        .set({ status: 'rejected', rejectionReason: input.reason, updatedAt: Date.now() })
        .where(eq(stockAdjustments.id, input.adjustmentId));

      return { success: true };
    }),
});

// ============================================================================
// WAREHOUSE TRANSFERS ROUTER (Draft → Submitted → Dispatched → Received)
// ============================================================================
const warehouseTransfersRouter = router({
  list: scopedProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const conditions: any[] = [
        eq(warehouseTransfers.organizationId, organizationId),
      ];
      if (input?.status) conditions.push(eq(warehouseTransfers.status, input.status as any));
      if (input?.search) conditions.push(like(warehouseTransfers.transferNumber, `%${input.search}%`));

      const rows = await db
        .select()
        .from(warehouseTransfers)
        .where(and(...conditions))
        .orderBy(desc(warehouseTransfers.createdAt))
        .limit(200);

      const result = await Promise.all(rows.map(async (t: any) => {
        const lines = await db
          .select()
          .from(warehouseTransferLines)
          .where(eq(warehouseTransferLines.transferId, t.id));
        return { ...t, lines };
      }));

      return result;
    }),

  create: scopedProcedure
    .input(z.object({
      sourceWarehouse: z.string(),
      destinationWarehouse: z.string(),
      notes: z.string().optional(),
      lines: z.array(z.object({
        itemId: z.number(),
        batchId: z.number().optional(),
        itemName: z.string(),
        batchNumber: z.string().optional(),
        qtyRequested: z.number().positive(),
        unit: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId, operatingUnitId } = ctx;

      if (input.sourceWarehouse === input.destinationWarehouse) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Source and destination warehouses must be different' });
      }

      const transferNumber = `TRF-${organizationId}-${Date.now()}`;

      const [result] = await db.insert(warehouseTransfers).values({
        organizationId,
        operatingUnitId: operatingUnitId || null,
        transferNumber,
        sourceWarehouse: input.sourceWarehouse,
        destinationWarehouse: input.destinationWarehouse,
        status: 'draft',
        requestedBy: ctx.user?.name || 'Unknown',
        notes: input.notes || null,
      });

      const transferId = result.insertId;

      for (const line of input.lines) {
        await db.insert(warehouseTransferLines).values({
          transferId: Number(transferId),
          itemId: line.itemId,
          batchId: line.batchId || null,
          itemName: line.itemName,
          batchNumber: line.batchNumber || null,
          qtyRequested: String(line.qtyRequested),
          unit: line.unit || 'Piece',
        });
      }

      return { id: transferId, transferNumber };
    }),

  submit: scopedProcedure
    .input(z.object({ transferId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [t] = await db.select().from(warehouseTransfers).where(eq(warehouseTransfers.id, input.transferId)).limit(1);
      if (!t) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
      if ((t as any).status !== 'draft') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft transfers can be submitted' });

      await db.update(warehouseTransfers)
        .set({ status: 'submitted', updatedAt: sql`NOW()` })
        .where(eq(warehouseTransfers.id, input.transferId));

      return { success: true };
    }),

  dispatch: scopedProcedure
    .input(z.object({ transferId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [t] = await db.select().from(warehouseTransfers).where(eq(warehouseTransfers.id, input.transferId)).limit(1);
      if (!t) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
      if ((t as any).status !== 'submitted') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only submitted transfers can be dispatched' });

      const { organizationId, operatingUnitId } = ctx;

      // Create TRANSFER_OUT ledger entries
      const lines = await db.select().from(warehouseTransferLines).where(eq(warehouseTransferLines.transferId, input.transferId));
      for (const line of lines) {
        const qty = parseFloat(String((line as any).qtyRequested || 0));
        if (qty <= 0) continue;

        await db.insert(stockLedger).values({
          organizationId,
          operatingUnitId: operatingUnitId || 0,
          batchId: (line as any).batchId || 0,
          itemId: (line as any).itemId || 0,
          movementType: 'TRANSFER',
          referenceType: 'warehouse_transfer',
          referenceId: input.transferId,
          qtyChange: String(-qty),
          balanceAfter: '0',
          performedBy: ctx.user?.name || 'System',
          notes: `Transfer OUT: ${(t as any).transferNumber} from ${(t as any).sourceWarehouse} to ${(t as any).destinationWarehouse}`,
        });

        // Deduct from source batch
        if ((line as any).batchId) {
          await db.execute(sql`UPDATE stock_batches SET issued_qty = COALESCE(issued_qty, 0) + ${qty} WHERE id = ${(line as any).batchId}`);
        }
      }

      await db.update(warehouseTransfers)
        .set({ status: 'dispatched', dispatchedAt: sql`NOW()`, updatedAt: sql`NOW()` })
        .where(eq(warehouseTransfers.id, input.transferId));

      return { success: true };
    }),

  receive: scopedProcedure
    .input(z.object({ transferId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [t] = await db.select().from(warehouseTransfers).where(eq(warehouseTransfers.id, input.transferId)).limit(1);
      if (!t) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
      if ((t as any).status !== 'dispatched') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only dispatched transfers can be received' });

      const { organizationId, operatingUnitId } = ctx;

      // Create TRANSFER_IN ledger entries
      const lines = await db.select().from(warehouseTransferLines).where(eq(warehouseTransferLines.transferId, input.transferId));
      for (const line of lines) {
        const qty = parseFloat(String((line as any).qtyRequested || 0));
        if (qty <= 0) continue;

        await db.insert(stockLedger).values({
          organizationId,
          operatingUnitId: operatingUnitId || 0,
          batchId: (line as any).batchId || 0,
          itemId: (line as any).itemId || 0,
          movementType: 'TRANSFER',
          referenceType: 'warehouse_transfer',
          referenceId: input.transferId,
          qtyChange: String(qty),
          balanceAfter: '0',
          performedBy: ctx.user?.name || 'System',
          notes: `Transfer IN: ${(t as any).transferNumber} received at ${(t as any).destinationWarehouse}`,
        });

        // Credit to destination (reverse the issued qty deduction)
        if ((line as any).batchId) {
          await db.execute(sql`UPDATE stock_batches SET returns_accepted = COALESCE(returns_accepted, 0) + ${qty} WHERE id = ${(line as any).batchId}`);
        }
      }

      await db.update(warehouseTransfers)
        .set({ status: 'received', receivedAt: sql`NOW()`, receivedBy: ctx.user?.name || null, updatedAt: sql`NOW()` })
        .where(eq(warehouseTransfers.id, input.transferId));

      return { success: true };
    }),
});

// ============================================================================
// EXPIRY ALERTS ROUTER
// ============================================================================
const expiryAlertsRouter = router({
  check: scopedProcedure
    .input(z.object({ thresholdDays: z.number().default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const thresholdDays = input?.thresholdDays || 30;
      const now = new Date();
      const thresholdDate = new Date(now.getTime() + thresholdDays * 86400000);

      // Get all batches with expiry dates
      const allBatches = await db
        .select()
        .from(stockBatches)
        .where(and(
          eq(stockBatches.organizationId, organizationId),
          isNotNull(stockBatches.expiryDate)
        ))
        .orderBy(asc(stockBatches.expiryDate));

      const nearExpiry: any[] = [];
      const expired: any[] = [];

      for (const batch of allBatches) {
        const available = computeAvailableQty(batch as any);
        if (available <= 0) continue;

        const expiryDate = new Date(String((batch as any).expiryDate));
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000);

        const batchData = {
          ...batch,
          availableQty: available,
          daysLeft,
        };

        if (expiryDate < now) {
          expired.push(batchData);
        } else if (expiryDate <= thresholdDate) {
          nearExpiry.push(batchData);
        }
      }

      return { nearExpiry, expired, thresholdDays };
    }),

  sendAlert: scopedProcedure
    .input(z.object({ thresholdDays: z.number().default(30) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const thresholdDays = input.thresholdDays;
      const now = new Date();
      const thresholdDate = new Date(now.getTime() + thresholdDays * 86400000);

      const allBatches = await db
        .select()
        .from(stockBatches)
        .where(and(
          eq(stockBatches.organizationId, organizationId),
          isNotNull(stockBatches.expiryDate)
        ))
        .orderBy(asc(stockBatches.expiryDate));

      const nearExpiry: any[] = [];
      const expired: any[] = [];

      for (const batch of allBatches) {
        const available = computeAvailableQty(batch as any);
        if (available <= 0) continue;

        const expiryDate = new Date(String((batch as any).expiryDate));
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000);

        if (expiryDate < now) {
          expired.push({ batch: (batch as any).batchNumber, item: (batch as any).itemName || `Item #${(batch as any).itemId}`, qty: available, daysLeft });
        } else if (expiryDate <= thresholdDate) {
          nearExpiry.push({ batch: (batch as any).batchNumber, item: (batch as any).itemName || `Item #${(batch as any).itemId}`, qty: available, daysLeft });
        }
      }

      if (nearExpiry.length === 0 && expired.length === 0) {
        return { sent: false, message: 'No batches near expiry or expired' };
      }

      let content = `Stock Expiry Alert Report\n\n`;
      if (expired.length > 0) {
        content += `EXPIRED BATCHES (${expired.length}):\n`;
        expired.forEach((b: any) => {
          content += `- ${b.batch} (${b.item}) - Qty: ${b.qty} - Expired ${Math.abs(b.daysLeft)} days ago\n`;
        });
        content += `\n`;
      }
      if (nearExpiry.length > 0) {
        content += `NEAR EXPIRY (${nearExpiry.length} batches within ${thresholdDays} days):\n`;
        nearExpiry.forEach((b: any) => {
          content += `- ${b.batch} (${b.item}) - Qty: ${b.qty} - ${b.daysLeft} days left\n`;
        });
      }

      const sent = await notifyOwner({
        title: `Stock Expiry Alert: ${expired.length} expired, ${nearExpiry.length} near expiry`,
        content,
      });

      return { sent, nearExpiryCount: nearExpiry.length, expiredCount: expired.length };
    }),
});

// ============================================================================
// PHYSICAL COUNT RECONCILIATION ROUTER
// ============================================================================
const physicalCountRouter = router({
  list: scopedProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const conditions: any[] = [eq(physicalCountSessions.organizationId, organizationId)];
      if (input?.status) conditions.push(eq(physicalCountSessions.status, input.status as any));
      if (input?.search) conditions.push(like(physicalCountSessions.sessionNumber, `%${input.search}%`));

      const rows = await db
        .select()
        .from(physicalCountSessions)
        .where(and(...conditions))
        .orderBy(desc(physicalCountSessions.createdAt))
        .limit(200);

      return rows;
    }),

  getDetail: scopedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [session] = await db.select().from(physicalCountSessions)
        .where(eq(physicalCountSessions.id, input.sessionId)).limit(1);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Count session not found' });

      const lines = await db.select().from(physicalCountLines)
        .where(eq(physicalCountLines.sessionId, input.sessionId))
        .orderBy(asc(physicalCountLines.id));

      return { ...session, lines };
    }),

  // Create a new physical count session
  create: scopedProcedure
    .input(z.object({
      warehouse: z.string().optional(),
      countDate: z.number(),
      countedBy: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId, operatingUnitId } = ctx;
      const sessionNumber = `PC-${organizationId}-${Date.now()}`;

      const [result] = await db.insert(physicalCountSessions).values({
        organizationId,
        operatingUnitId: operatingUnitId || null,
        sessionNumber,
        warehouse: input.warehouse || null,
        status: 'draft',
        countDate: input.countDate,
        countedBy: input.countedBy || ctx.user?.name || null,
        notes: input.notes || null,
        createdBy: ctx.user?.openId || null,
        createdByName: ctx.user?.name || null,
      });

      return { id: result.insertId, sessionNumber };
    }),

  // Upload count data (parsed CSV/Excel from frontend)
  uploadCountData: scopedProcedure
    .input(z.object({
      sessionId: z.number(),
      lines: z.array(z.object({
        itemCode: z.string().optional(),
        itemName: z.string(),
        batchNumber: z.string().optional(),
        countedQty: z.number(),
        unit: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;

      // Verify session exists and is draft
      const [session] = await db.select().from(physicalCountSessions)
        .where(eq(physicalCountSessions.id, input.sessionId)).limit(1);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Count session not found' });
      if ((session as any).status !== 'draft' && (session as any).status !== 'in_progress') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session is not in a state that accepts count data' });
      }

      // Delete existing lines for this session
      await db.delete(physicalCountLines).where(eq(physicalCountLines.sessionId, input.sessionId));

      let totalItems = 0;
      let discrepancyCount = 0;
      let surplusCount = 0;
      let shortageCount = 0;

      for (const line of input.lines) {
        // Try to match item by code or name
        let matchedItem: any = null;
        let matchedBatch: any = null;

        if (line.itemCode) {
          const items = await db.select().from(stockItems)
            .where(and(
              eq(stockItems.organizationId, organizationId),
              like(stockItems.itemCode, line.itemCode)
            )).limit(1);
          if (items.length > 0) matchedItem = items[0];
        }
        if (!matchedItem && line.itemName) {
          const items = await db.select().from(stockItems)
            .where(and(
              eq(stockItems.organizationId, organizationId),
              like(stockItems.itemName, `%${line.itemName}%`)
            )).limit(1);
          if (items.length > 0) matchedItem = items[0];
        }

        // Try to match batch
        if (matchedItem && line.batchNumber) {
          const batches = await db.select().from(stockBatches)
            .where(and(
              eq(stockBatches.organizationId, organizationId),
              eq(stockBatches.itemId, matchedItem.id),
              like(stockBatches.batchNumber, line.batchNumber)
            )).limit(1);
          if (batches.length > 0) matchedBatch = batches[0];
        }

        // Compute system qty
        let systemQty = 0;
        if (matchedBatch) {
          systemQty = computeAvailableQty(matchedBatch);
        } else if (matchedItem) {
          // Sum all batches for this item
          const batches = await db.select().from(stockBatches)
            .where(and(
              eq(stockBatches.organizationId, organizationId),
              eq(stockBatches.itemId, matchedItem.id)
            ));
          systemQty = batches.reduce((sum: number, b: any) => sum + computeAvailableQty(b), 0);
        }

        const varianceQty = line.countedQty - systemQty;
        let varianceType: 'match' | 'surplus' | 'shortage' = 'match';
        if (varianceQty > 0.001) { varianceType = 'surplus'; surplusCount++; discrepancyCount++; }
        else if (varianceQty < -0.001) { varianceType = 'shortage'; shortageCount++; discrepancyCount++; }

        const unitCost = matchedBatch ? parseFloat(String(matchedBatch.unitCost || 0)) : (matchedItem ? parseFloat(String(matchedItem.unitCost || 0)) : 0);

        await db.insert(physicalCountLines).values({
          sessionId: input.sessionId,
          itemId: matchedItem?.id || null,
          batchId: matchedBatch?.id || null,
          itemCode: line.itemCode || matchedItem?.itemCode || null,
          itemName: line.itemName,
          batchNumber: line.batchNumber || null,
          systemQty: String(systemQty),
          countedQty: String(line.countedQty),
          varianceQty: String(varianceQty),
          varianceType,
          unit: line.unit || 'Piece',
          unitCost: String(unitCost),
          varianceValue: String(Math.abs(varianceQty) * unitCost),
          notes: line.notes || null,
        });

        totalItems++;
      }

      // Update session stats
      await db.update(physicalCountSessions)
        .set({
          status: 'in_progress',
          totalItems,
          discrepancyCount,
          surplusCount,
          shortageCount,
          updatedAt: Date.now(),
        })
        .where(eq(physicalCountSessions.id, input.sessionId));

      return { totalItems, discrepancyCount, surplusCount, shortageCount };
    }),

  // Mark as reviewed
  review: scopedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [session] = await db.select().from(physicalCountSessions)
        .where(eq(physicalCountSessions.id, input.sessionId)).limit(1);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND' });
      if ((session as any).status !== 'in_progress') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session must be in progress to review' });

      await db.update(physicalCountSessions)
        .set({
          status: 'reviewed',
          reviewedBy: ctx.user?.name || null,
          reviewedAt: Date.now(),
          updatedAt: Date.now(),
        })
        .where(eq(physicalCountSessions.id, input.sessionId));

      return { success: true };
    }),

  // Generate adjustment from discrepancies
  generateAdjustment: scopedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId, operatingUnitId } = ctx;

      const [session] = await db.select().from(physicalCountSessions)
        .where(eq(physicalCountSessions.id, input.sessionId)).limit(1);
      if (!session) throw new TRPCError({ code: 'NOT_FOUND' });
      if ((session as any).status !== 'reviewed') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session must be reviewed before generating adjustments' });

      // Get lines with discrepancies
      const lines = await db.select().from(physicalCountLines)
        .where(and(
          eq(physicalCountLines.sessionId, input.sessionId),
          or(
            eq(physicalCountLines.varianceType, 'surplus'),
            eq(physicalCountLines.varianceType, 'shortage')
          )
        ));

      if (lines.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No discrepancies found to generate adjustments' });
      }

      // Create stock adjustment
      const adjustmentNumber = `ADJ-PC-${organizationId}-${Date.now()}`;
      const [adjResult] = await db.insert(stockAdjustments).values({
        adjustmentNumber,
        type: 'physical_count',
        status: 'draft',
        warehouse: (session as any).warehouse || null,
        reason: `Physical count reconciliation from session ${(session as any).sessionNumber}`,
        notes: `Auto-generated from physical count session ${(session as any).sessionNumber}. ${lines.length} discrepancies found.`,
        createdBy: ctx.user?.openId || null,
        createdByName: ctx.user?.name || null,
        organizationId,
        operatingUnitId: operatingUnitId || null,
      });

      const adjId = Number(adjResult.insertId);

      // Create adjustment lines
      for (const line of lines) {
        const systemQty = parseFloat(String((line as any).systemQty || 0));
        const countedQty = parseFloat(String((line as any).countedQty || 0));
        const varianceQty = parseFloat(String((line as any).varianceQty || 0));

        await db.insert(stockAdjustmentLines).values({
          adjustmentId: adjId,
          itemId: (line as any).itemId || null,
          batchId: (line as any).batchId || null,
          itemName: (line as any).itemName || null,
          batchNumber: (line as any).batchNumber || null,
          qtyBefore: String(systemQty),
          qtyAdjusted: String(varianceQty),
          qtyAfter: String(countedQty),
          unitCost: String((line as any).unitCost || 0),
          notes: `Physical count: system=${systemQty}, counted=${countedQty}, variance=${varianceQty}`,
        });
      }

      // Update session
      await db.update(physicalCountSessions)
        .set({
          status: 'adjustments_generated',
          adjustmentId: adjId,
          updatedAt: Date.now(),
        })
        .where(eq(physicalCountSessions.id, input.sessionId));

      return { adjustmentId: adjId, adjustmentNumber, lineCount: lines.length };
    }),

  // Download template for CSV upload
  getTemplate: scopedProcedure
    .input(z.object({ warehouse: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;

      // Get all stock items with their batches
      const conditions: any[] = [eq(stockBatches.organizationId, organizationId)];

      const batches = await db.select().from(stockBatches)
        .where(and(...conditions))
        .orderBy(asc(stockBatches.itemName));

      const templateRows = batches
        .filter((b: any) => computeAvailableQty(b) > 0)
        .map((b: any) => ({
          itemCode: b.itemCode || '',
          itemName: b.itemName || '',
          batchNumber: b.batchNumber || '',
          systemQty: computeAvailableQty(b),
          countedQty: 0,
          unit: b.unit || 'Piece',
          notes: '',
        }));

      return templateRows;
    }),

  // Barcode/QR code lookup: find batch or item by scanned code
  scanLookup: scopedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const code = input.code.trim();

      // 1. Try exact match on batchNumber
      const [batchMatch] = await db.select()
        .from(stockBatches)
        .where(and(
          eq(stockBatches.organizationId, organizationId),
          eq(stockBatches.batchNumber, code)
        ))
        .limit(1);

      if (batchMatch) {
        // Also get the item name
        const [item] = await db.select()
          .from(stockItems)
          .where(eq(stockItems.id, (batchMatch as any).itemId))
          .limit(1);
        return {
          found: true,
          itemId: (batchMatch as any).itemId,
          batchId: (batchMatch as any).id,
          itemCode: (item as any)?.itemCode || '',
          itemName: (item as any)?.itemName || '',
          batchNumber: (batchMatch as any).batchNumber,
          unit: (item as any)?.unitType || 'Piece',
          systemQty: computeAvailableQty(batchMatch as any),
        };
      }

      // 2. Try exact match on lotNumber or serialNumber
      const [lotMatch] = await db.select()
        .from(stockBatches)
        .where(and(
          eq(stockBatches.organizationId, organizationId),
          or(
            eq(stockBatches.lotNumber, code),
            eq(stockBatches.serialNumber, code)
          )
        ))
        .limit(1);

      if (lotMatch) {
        const [item] = await db.select()
          .from(stockItems)
          .where(eq(stockItems.id, (lotMatch as any).itemId))
          .limit(1);
        return {
          found: true,
          itemId: (lotMatch as any).itemId,
          batchId: (lotMatch as any).id,
          itemCode: (item as any)?.itemCode || '',
          itemName: (item as any)?.itemName || '',
          batchNumber: (lotMatch as any).batchNumber,
          unit: (item as any)?.unitType || 'Piece',
          systemQty: computeAvailableQty(lotMatch as any),
        };
      }

      // 3. Try exact match on itemCode
      const [itemMatch] = await db.select()
        .from(stockItems)
        .where(and(
          eq(stockItems.organizationId, organizationId),
          eq(stockItems.itemCode, code)
        ))
        .limit(1);

      if (itemMatch) {
        // Get total available qty across all batches for this item
        const batches = await db.select()
          .from(stockBatches)
          .where(and(
            eq(stockBatches.organizationId, organizationId),
            eq(stockBatches.itemId, (itemMatch as any).id)
          ));
        const totalQty = batches.reduce((sum: number, b: any) => sum + computeAvailableQty(b), 0);

        return {
          found: true,
          itemId: (itemMatch as any).id,
          batchId: null,
          itemCode: (itemMatch as any).itemCode,
          itemName: (itemMatch as any).itemName,
          batchNumber: null,
          unit: (itemMatch as any).unitType || 'Piece',
          systemQty: totalQty,
        };
      }

      // 4. Try partial/fuzzy match on item name
      const [fuzzyMatch] = await db.select()
        .from(stockItems)
        .where(and(
          eq(stockItems.organizationId, organizationId),
          like(stockItems.itemName, `%${code}%`)
        ))
        .limit(1);

      if (fuzzyMatch) {
        return {
          found: true,
          itemId: (fuzzyMatch as any).id,
          batchId: null,
          itemCode: (fuzzyMatch as any).itemCode,
          itemName: (fuzzyMatch as any).itemName,
          batchNumber: null,
          unit: (fuzzyMatch as any).unitType || 'Piece',
          systemQty: 0,
        };
      }

      return { found: false };
    }),
});

// ============================================================================
// TRANSFER TRACKING ROUTER (extends warehouseTransfersRouter)
// ============================================================================
const transferTrackingRouter = router({
  // Update tracking info on a transfer
  updateTracking: scopedProcedure
    .input(z.object({
      transferId: z.number(),
      estimatedArrivalDate: z.string().optional(),
      carrierName: z.string().optional(),
      trackingReference: z.string().optional(),
      trackingNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [t] = await db.select().from(warehouseTransfers)
        .where(eq(warehouseTransfers.id, input.transferId)).limit(1);
      if (!t) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });

      const updates: any = { updatedAt: sql`NOW()` };
      if (input.estimatedArrivalDate !== undefined) updates.estimatedArrivalDate = input.estimatedArrivalDate || null;
      if (input.carrierName !== undefined) updates.carrierName = input.carrierName || null;
      if (input.trackingReference !== undefined) updates.trackingReference = input.trackingReference || null;
      if (input.trackingNotes !== undefined) {
        // Append to existing notes with timestamp
        const existingNotes = (t as any).trackingNotes || '';
        const timestamp = new Date().toISOString().slice(0, 16);
        const newNote = `[${timestamp}] ${input.trackingNotes}`;
        updates.trackingNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;
      }

      await db.update(warehouseTransfers)
        .set(updates)
        .where(eq(warehouseTransfers.id, input.transferId));

      return { success: true };
    }),

  // Get in-transit transfers (dispatched but not received)
  getInTransit: scopedProcedure
    .query(async ({ ctx }) => {
      const db = getDb();
      const { organizationId } = ctx;

      const transfers = await db.select().from(warehouseTransfers)
        .where(and(
          eq(warehouseTransfers.organizationId, organizationId),
          eq(warehouseTransfers.status, 'dispatched')
        ))
        .orderBy(asc(warehouseTransfers.estimatedArrivalDate));

      const result = await Promise.all(transfers.map(async (t: any) => {
        const lines = await db.select().from(warehouseTransferLines)
          .where(eq(warehouseTransferLines.transferId, t.id));

        // Calculate ETA status
        let etaStatus: 'on_time' | 'delayed' | 'no_eta' | 'arrived' = 'no_eta';
        if (t.estimatedArrivalDate) {
          const eta = new Date(t.estimatedArrivalDate);
          const now = new Date();
          if (eta < now) etaStatus = 'delayed';
          else etaStatus = 'on_time';
        }

        return { ...t, lines, etaStatus, itemCount: lines.length };
      }));

      return result;
    }),

  // Get transfer detail with full tracking history
  getDetail: scopedProcedure
    .input(z.object({ transferId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [t] = await db.select().from(warehouseTransfers)
        .where(eq(warehouseTransfers.id, input.transferId)).limit(1);
      if (!t) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });

      const lines = await db.select().from(warehouseTransferLines)
        .where(eq(warehouseTransferLines.transferId, input.transferId));

      // Parse tracking notes into timeline
      const trackingTimeline: { timestamp: string; note: string }[] = [];
      if ((t as any).trackingNotes) {
        const noteLines = String((t as any).trackingNotes).split('\n');
        for (const noteLine of noteLines) {
          const match = noteLine.match(/^\[(.+?)\]\s*(.+)$/);
          if (match) {
            trackingTimeline.push({ timestamp: match[1], note: match[2] });
          } else if (noteLine.trim()) {
            trackingTimeline.push({ timestamp: '', note: noteLine.trim() });
          }
        }
      }

      return { ...t, lines, trackingTimeline };
    }),
});

// ============================================================================
// SCHEDULED EXPIRY ALERTS ROUTER (extends expiryAlertsRouter)
// ============================================================================
const scheduledExpiryRouter = router({
  // Get alert history
  getHistory: scopedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;

      const rows = await db.select().from(expiryAlertHistory)
        .where(eq(expiryAlertHistory.organizationId, organizationId))
        .orderBy(desc(expiryAlertHistory.sentAt))
        .limit(input?.limit || 50);

      return rows;
    }),

  // Scheduled check endpoint (called by cron or manual trigger)
  runScheduledCheck: scopedProcedure
    .input(z.object({ thresholdDays: z.number().default(30) }).optional())
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId, operatingUnitId } = ctx;
      const thresholdDays = input?.thresholdDays || 30;
      const now = new Date();
      const thresholdDate = new Date(now.getTime() + thresholdDays * 86400000);

      // Get all batches with expiry dates
      const allBatches = await db.select().from(stockBatches)
        .where(and(
          eq(stockBatches.organizationId, organizationId),
          isNotNull(stockBatches.expiryDate)
        ))
        .orderBy(asc(stockBatches.expiryDate));

      const nearExpiry: any[] = [];
      const expired: any[] = [];

      for (const batch of allBatches) {
        const available = computeAvailableQty(batch as any);
        if (available <= 0) continue;

        const expiryDate = new Date(String((batch as any).expiryDate));
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000);

        const batchData = {
          batch: (batch as any).batchNumber,
          item: (batch as any).itemName,
          qty: available,
          daysLeft,
          expiryDate: String((batch as any).expiryDate),
        };

        if (expiryDate < now) {
          expired.push(batchData);
        } else if (expiryDate <= thresholdDate) {
          nearExpiry.push(batchData);
        }
      }

      // Only send if there are alerts
      if (expired.length === 0 && nearExpiry.length === 0) {
        return { sent: false, nearExpiryCount: 0, expiredCount: 0, message: 'No batches need attention' };
      }

      // Build notification content
      let content = `Scheduled Stock Expiry Alert (Threshold: ${thresholdDays} days)\n\n`;
      if (expired.length > 0) {
        content += `EXPIRED BATCHES (${expired.length}):\n`;
        expired.forEach((b: any) => {
          content += `- ${b.batch} (${b.item}) - Qty: ${b.qty} - Expired ${Math.abs(b.daysLeft)} days ago\n`;
        });
        content += `\n`;
      }
      if (nearExpiry.length > 0) {
        content += `NEAR EXPIRY (${nearExpiry.length} batches within ${thresholdDays} days):\n`;
        nearExpiry.forEach((b: any) => {
          content += `- ${b.batch} (${b.item}) - Qty: ${b.qty} - ${b.daysLeft} days left\n`;
        });
      }

      const sent = await notifyOwner({
        title: `[Scheduled] Stock Expiry Alert: ${expired.length} expired, ${nearExpiry.length} near expiry`,
        content,
      });

      // Record in alert history
      await db.insert(expiryAlertHistory).values({
        organizationId,
        operatingUnitId: operatingUnitId || null,
        alertType: 'scheduled',
        thresholdDays,
        nearExpiryCount: nearExpiry.length,
        expiredCount: expired.length,
        batchDetails: JSON.stringify({ expired, nearExpiry }),
        sentBy: 'System (Scheduled)',
        sentAt: Date.now(),
        notificationSent: sent ? 1 : 0,
      });

      return { sent, nearExpiryCount: nearExpiry.length, expiredCount: expired.length };
    }),
});

// ============================================================================
// WAREHOUSE ALERT CONFIGS ROUTER
// ============================================================================
const warehouseAlertConfigsRouter = router({
  // List all configs for the organization
  list: scopedProcedure
    .query(async ({ ctx }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const rows = await db.select().from(warehouseAlertConfigs)
        .where(eq(warehouseAlertConfigs.organizationId, organizationId))
        .orderBy(asc(warehouseAlertConfigs.warehouseName));
      return rows;
    }),

  // Create or update a config
  upsert: scopedProcedure
    .input(z.object({
      id: z.number().optional(),
      warehouseId: z.number().optional().nullable(),
      warehouseName: z.string(),
      category: z.string().optional().nullable(),
      thresholdDays: z.number().min(1).max(365),
      frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
      enabled: z.boolean(),
      notifyEmail: z.boolean().optional(),
      notifyInApp: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId, operatingUnitId } = ctx;

      if (input.id) {
        // Update existing
        await db.update(warehouseAlertConfigs)
          .set({
            warehouseName: input.warehouseName,
            warehouseId: input.warehouseId ?? null,
            category: input.category ?? null,
            thresholdDays: input.thresholdDays,
            frequency: input.frequency,
            enabled: input.enabled ? 1 : 0,
            notifyEmail: input.notifyEmail ? 1 : 0,
            notifyInApp: input.notifyInApp !== false ? 1 : 0,
            updatedAt: Date.now(),
          })
          .where(eq(warehouseAlertConfigs.id, input.id));
        return { id: input.id, action: 'updated' };
      } else {
        // Create new
        const [result] = await db.insert(warehouseAlertConfigs).values({
          organizationId,
          operatingUnitId: operatingUnitId || null,
          warehouseId: input.warehouseId ?? null,
          warehouseName: input.warehouseName,
          category: input.category ?? null,
          thresholdDays: input.thresholdDays,
          frequency: input.frequency,
          enabled: input.enabled ? 1 : 0,
          notifyEmail: input.notifyEmail ? 1 : 0,
          notifyInApp: input.notifyInApp !== false ? 1 : 0,
          createdBy: ctx.user?.name || null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { id: result.insertId, action: 'created' };
      }
    }),

  // Delete a config
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(warehouseAlertConfigs)
        .where(eq(warehouseAlertConfigs.id, input.id));
      return { success: true };
    }),

  // Get unique warehouses from stock batches for dropdown
  getWarehouses: scopedProcedure
    .query(async ({ ctx }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const rows = await db.selectDistinct({
        warehouseId: stockBatches.warehouseId,
        warehouseName: stockBatches.warehouseName,
      })
        .from(stockBatches)
        .where(eq(stockBatches.organizationId, organizationId));
      return rows.filter((r: any) => r.warehouseName);
    }),

  // Get unique categories from stock items for dropdown
  getCategories: scopedProcedure
    .query(async ({ ctx }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const rows = await db.selectDistinct({ category: stockItems.category })
        .from(stockItems)
        .where(and(
          eq(stockItems.organizationId, organizationId),
          isNotNull(stockItems.category)
        ));
      return rows.filter((r: any) => r.category).map((r: any) => r.category);
    }),
});

// ============================================================================
// STOCK ANALYTICS ROUTER
// ============================================================================
const stockAnalyticsRouter = router({
  // Issuance trends over time
  issuanceTrends: scopedProcedure
    .input(z.object({
      months: z.number().min(1).max(24).default(6),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const months = input?.months || 6;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const rows = await db.select({
        month: sql<string>`DATE_FORMAT(${stockLedger.transactionDate}, '%Y-%m')`,
        movementType: stockLedger.movementType,
        totalQty: sql<string>`SUM(ABS(${stockLedger.qtyChange}))`,
        totalValue: sql<string>`SUM(ABS(${stockLedger.totalValue}))`,
        txCount: sql<number>`COUNT(*)`,
      })
        .from(stockLedger)
        .where(and(
          eq(stockLedger.organizationId, organizationId),
          gte(stockLedger.transactionDate, startDate.toISOString().slice(0, 19))
        ))
        .groupBy(
          sql`DATE_FORMAT(${stockLedger.transactionDate}, '%Y-%m')`,
          stockLedger.movementType
        )
        .orderBy(sql`DATE_FORMAT(${stockLedger.transactionDate}, '%Y-%m')`);

      return rows;
    }),

  // Transfer volume summary
  transferVolume: scopedProcedure
    .input(z.object({
      months: z.number().min(1).max(24).default(6),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const months = input?.months || 6;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const rows = await db.select({
        month: sql<string>`DATE_FORMAT(${warehouseTransfers.requestDate}, '%Y-%m')`,
        status: warehouseTransfers.status,
        count: sql<number>`COUNT(*)`,
      })
        .from(warehouseTransfers)
        .where(and(
          eq(warehouseTransfers.organizationId, organizationId),
          gte(warehouseTransfers.requestDate, startDate.toISOString().slice(0, 19))
        ))
        .groupBy(
          sql`DATE_FORMAT(${warehouseTransfers.requestDate}, '%Y-%m')`,
          warehouseTransfers.status
        )
        .orderBy(sql`DATE_FORMAT(${warehouseTransfers.requestDate}, '%Y-%m')`);

      return rows;
    }),

  // Adjustment frequency
  adjustmentFrequency: scopedProcedure
    .input(z.object({
      months: z.number().min(1).max(24).default(6),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const months = input?.months || 6;
      const cutoff = Date.now() - months * 30 * 86400000;

      const rows = await db.select({
        type: stockAdjustments.type,
        status: stockAdjustments.status,
        count: sql<number>`COUNT(*)`,
      })
        .from(stockAdjustments)
        .where(and(
          eq(stockAdjustments.organizationId, organizationId),
          gte(stockAdjustments.createdAt, cutoff)
        ))
        .groupBy(stockAdjustments.type, stockAdjustments.status);

      return rows;
    }),

  // Top items by movement
  topItems: scopedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      movementType: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const limit = input?.limit || 10;

      const conditions: any[] = [eq(stockLedger.organizationId, organizationId)];
      if (input?.movementType) {
        conditions.push(eq(stockLedger.movementType, input.movementType as any));
      }

      const rows = await db.select({
        itemId: stockLedger.itemId,
        totalQty: sql<string>`SUM(ABS(${stockLedger.qtyChange}))`,
        totalValue: sql<string>`SUM(ABS(${stockLedger.totalValue}))`,
        txCount: sql<number>`COUNT(*)`,
      })
        .from(stockLedger)
        .where(and(...conditions))
        .groupBy(stockLedger.itemId)
        .orderBy(desc(sql`SUM(ABS(${stockLedger.qtyChange}))`))
        .limit(limit);

      // Enrich with item names
      const enriched = await Promise.all(rows.map(async (row: any) => {
        const [item] = await db.select({ itemCode: stockItems.itemCode, itemName: stockItems.itemName })
          .from(stockItems)
          .where(eq(stockItems.id, row.itemId))
          .limit(1);
        return { ...row, itemCode: item?.itemCode || '', itemName: item?.itemName || 'Unknown' };
      }));

      return enriched;
    }),

  // Stock value by warehouse
  stockValueByWarehouse: scopedProcedure
    .query(async ({ ctx }) => {
      const db = getDb();
      const { organizationId } = ctx;

      const rows = await db.select({
        warehouseName: stockBatches.warehouseName,
        totalValue: sql<string>`SUM(${stockBatches.unitCost} * (${stockBatches.acceptedQty} - ${stockBatches.issuedQty} - ${stockBatches.reservedQty} - ${stockBatches.lossAdjustments} + ${stockBatches.returnsAccepted}))`,
        batchCount: sql<number>`COUNT(*)`,
        itemCount: sql<number>`COUNT(DISTINCT ${stockBatches.itemId})`,
      })
        .from(stockBatches)
        .where(and(
          eq(stockBatches.organizationId, organizationId),
          eq(stockBatches.batchStatus, 'available')
        ))
        .groupBy(stockBatches.warehouseName);

      return rows;
    }),

  // Monthly summary for dashboard
  monthlySummary: scopedProcedure
    .input(z.object({
      months: z.number().min(1).max(24).default(6),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      const months = input?.months || 6;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Get all ledger entries grouped by month
      const rows = await db.select({
        month: sql<string>`DATE_FORMAT(${stockLedger.transactionDate}, '%Y-%m')`,
        issueQty: sql<string>`SUM(CASE WHEN ${stockLedger.movementType} = 'ISSUE_OUT' THEN ABS(${stockLedger.qtyChange}) ELSE 0 END)`,
        grnQty: sql<string>`SUM(CASE WHEN ${stockLedger.movementType} = 'GRN_IN' THEN ABS(${stockLedger.qtyChange}) ELSE 0 END)`,
        transferOutQty: sql<string>`SUM(CASE WHEN ${stockLedger.movementType} = 'TRANSFER_OUT' THEN ABS(${stockLedger.qtyChange}) ELSE 0 END)`,
        transferInQty: sql<string>`SUM(CASE WHEN ${stockLedger.movementType} = 'TRANSFER_IN' THEN ABS(${stockLedger.qtyChange}) ELSE 0 END)`,
        adjustmentQty: sql<string>`SUM(CASE WHEN ${stockLedger.movementType} IN ('ADJUSTMENT_IN','ADJUSTMENT_OUT') THEN ABS(${stockLedger.qtyChange}) ELSE 0 END)`,
        returnQty: sql<string>`SUM(CASE WHEN ${stockLedger.movementType} = 'RETURN_IN' THEN ABS(${stockLedger.qtyChange}) ELSE 0 END)`,
        totalValue: sql<string>`SUM(ABS(${stockLedger.totalValue}))`,
        txCount: sql<number>`COUNT(*)`,
      })
        .from(stockLedger)
        .where(and(
          eq(stockLedger.organizationId, organizationId),
          gte(stockLedger.transactionDate, startDate.toISOString().slice(0, 19))
        ))
        .groupBy(sql`DATE_FORMAT(${stockLedger.transactionDate}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${stockLedger.transactionDate}, '%Y-%m')`);

      return rows;
    }),
});

// ============================================================================
// PDF GENERATION ROUTER
// ============================================================================
import { generateStockPdf, StockDocumentData } from "../../stockPdfGenerator";

const pdfRouter = router({
  // Generate PDF for StockRequest
  stockRequest: scopedProcedure
    .input(z.object({
      requestId: z.number(),
      language: z.enum(["en", "ar"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      
      const [request] = await db.select().from(stockRequests)
        .where(and(eq(stockRequests.id, input.requestId), eq(stockRequests.organizationId, organizationId)))
        .limit(1);
      
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Stock request not found" });
      
      const lines = await db.select().from(stockRequestLines)
        .where(eq(stockRequestLines.requestId, input.requestId));
      
      const docData: StockDocumentData = {
        documentNumber: (request as any).requestNumber,
        documentDate: new Date((request as any).createdAt).toLocaleDateString(),
        organizationName: organizationId,
        department: "Stock Management",
        status: (request as any).status,
        lines: lines.map((line: any) => ({
          itemCode: line.itemCode || "",
          itemName: line.itemName || "",
          batchNumber: line.batchNumber,
          quantity: line.quantity,
          unit: line.unit || "Piece",
          unitCost: line.unitCost || 0,
          totalValue: (line.quantity || 0) * (line.unitCost || 0),
        })),
        requestedBy: (request as any).requestedByName,
        notes: (request as any).notes,
      };
      
      const pdf = await generateStockPdf("request", docData, input.language || "en");
      return { pdf: pdf.toString("base64"), filename: `stock-request-${(request as any).requestNumber}.pdf` };
    }),

  // Generate PDF for StockIssue
  stockIssue: scopedProcedure
    .input(z.object({
      issueId: z.number(),
      language: z.enum(["en", "ar"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      
      const [issue] = await db.select().from(stockIssues)
        .where(and(eq(stockIssues.id, input.issueId), eq(stockIssues.organizationId, organizationId)))
        .limit(1);
      
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Stock issue not found" });
      
      const lines = await db.select().from(stockIssueLines)
        .where(eq(stockIssueLines.issueId, input.issueId));
      
      const docData: StockDocumentData = {
        documentNumber: (issue as any).issueNumber,
        documentDate: new Date((issue as any).createdAt).toLocaleDateString(),
        organizationName: organizationId,
        department: "Stock Management",
        status: (issue as any).status,
        lines: lines.map((line: any) => ({
          itemCode: line.itemCode || "",
          itemName: line.itemName || "",
          batchNumber: line.batchNumber,
          quantity: line.quantity,
          unit: line.unit || "Piece",
          unitCost: line.unitCost || 0,
          totalValue: (line.quantity || 0) * (line.unitCost || 0),
        })),
        warehouse: (issue as any).warehouse,
        requestedBy: (issue as any).issuedByName,
        notes: (issue as any).notes,
      };
      
      const pdf = await generateStockPdf("issue", docData, input.language || "en");
      return { pdf: pdf.toString("base64"), filename: `stock-issue-${(issue as any).issueNumber}.pdf` };
    }),

  // Generate PDF for StockReturn
  stockReturn: scopedProcedure
    .input(z.object({
      returnId: z.number(),
      language: z.enum(["en", "ar"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      
      const [ret] = await db.select().from(stockReturns)
        .where(and(eq(stockReturns.id, input.returnId), eq(stockReturns.organizationId, organizationId)))
        .limit(1);
      
      if (!ret) throw new TRPCError({ code: "NOT_FOUND", message: "Stock return not found" });
      
      const lines = await db.select().from(stockReturnLines)
        .where(eq(stockReturnLines.returnId, input.returnId));
      
      const docData: StockDocumentData = {
        documentNumber: (ret as any).returnNumber,
        documentDate: new Date((ret as any).createdAt).toLocaleDateString(),
        organizationName: organizationId,
        department: "Stock Management",
        status: (ret as any).status,
        lines: lines.map((line: any) => ({
          itemCode: line.itemCode || "",
          itemName: line.itemName || "",
          batchNumber: line.batchNumber,
          quantity: line.quantity,
          unit: line.unit || "Piece",
          unitCost: line.unitCost || 0,
          totalValue: (line.quantity || 0) * (line.unitCost || 0),
        })),
        warehouse: (ret as any).warehouse,
        requestedBy: (ret as any).returnedByName,
        approvedBy: (ret as any).approvedByName,
        notes: (ret as any).notes,
      };
      
      const pdf = await generateStockPdf("return", docData, input.language || "en");
      return { pdf: pdf.toString("base64"), filename: `stock-return-${(ret as any).returnNumber}.pdf` };
    }),

  // Generate PDF for Adjustment
  adjustment: scopedProcedure
    .input(z.object({
      adjustmentId: z.number(),
      language: z.enum(["en", "ar"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      
      const [adj] = await db.select().from(stockAdjustments)
        .where(and(eq(stockAdjustments.id, input.adjustmentId), eq(stockAdjustments.organizationId, organizationId)))
        .limit(1);
      
      if (!adj) throw new TRPCError({ code: "NOT_FOUND", message: "Adjustment not found" });
      
      const lines = await db.select().from(stockAdjustmentLines)
        .where(eq(stockAdjustmentLines.adjustmentId, input.adjustmentId));
      
      const docData: StockDocumentData = {
        documentNumber: (adj as any).adjustmentNumber,
        documentDate: new Date((adj as any).createdAt).toLocaleDateString(),
        organizationName: organizationId,
        department: "Stock Management",
        status: (adj as any).status,
        lines: lines.map((line: any) => ({
          itemCode: line.itemCode || "",
          itemName: line.itemName || "",
          batchNumber: line.batchNumber,
          quantity: Math.abs(line.qtyChange || 0),
          unit: line.unit || "Piece",
          unitCost: line.unitCost || 0,
          totalValue: Math.abs((line.qtyChange || 0) * (line.unitCost || 0)),
        })),
        warehouse: (adj as any).warehouse,
        requestedBy: (adj as any).createdByName,
        approvedBy: (adj as any).approvedByName,
        notes: (adj as any).notes,
      };
      
      const pdf = await generateStockPdf("adjustment", docData, input.language || "en");
      return { pdf: pdf.toString("base64"), filename: `adjustment-${(adj as any).adjustmentNumber}.pdf` };
    }),

  // Generate PDF for Transfer
  transfer: scopedProcedure
    .input(z.object({
      transferId: z.number(),
      language: z.enum(["en", "ar"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      
      const [transfer] = await db.select().from(warehouseTransfers)
        .where(and(eq(warehouseTransfers.id, input.transferId), eq(warehouseTransfers.organizationId, organizationId)))
        .limit(1);
      
      if (!transfer) throw new TRPCError({ code: "NOT_FOUND", message: "Transfer not found" });
      
      const lines = await db.select().from(warehouseTransferLines)
        .where(eq(warehouseTransferLines.transferId, input.transferId));
      
      const docData: StockDocumentData = {
        documentNumber: (transfer as any).transferNumber,
        documentDate: new Date((transfer as any).createdAt).toLocaleDateString(),
        organizationName: organizationId,
        department: "Stock Management",
        status: (transfer as any).status,
        lines: lines.map((line: any) => ({
          itemCode: line.itemCode || "",
          itemName: line.itemName || "",
          batchNumber: line.batchNumber,
          quantity: line.quantity,
          unit: line.unit || "Piece",
          unitCost: line.unitCost || 0,
          totalValue: (line.quantity || 0) * (line.unitCost || 0),
        })),
        warehouse: (transfer as any).sourceWarehouse,
        requestedBy: (transfer as any).requestedByName,
        receivedBy: (transfer as any).receivedByName,
        notes: (transfer as any).notes,
      };
      
      const pdf = await generateStockPdf("transfer", docData, input.language || "en");
      return { pdf: pdf.toString("base64"), filename: `transfer-${(transfer as any).transferNumber}.pdf` };
    }),

  // Generate PDF for PhysicalCount
  physicalCount: scopedProcedure
    .input(z.object({
      sessionId: z.number(),
      language: z.enum(["en", "ar"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      
      const [session] = await db.select().from(physicalCountSessions)
        .where(and(eq(physicalCountSessions.id, input.sessionId), eq(physicalCountSessions.organizationId, organizationId)))
        .limit(1);
      
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Physical count session not found" });
      
      const lines = await db.select().from(physicalCountLines)
        .where(eq(physicalCountLines.sessionId, input.sessionId));
      
      const docData: StockDocumentData = {
        documentNumber: (session as any).sessionNumber,
        documentDate: new Date((session as any).countDate).toLocaleDateString(),
        organizationName: organizationId,
        department: "Stock Management",
        status: (session as any).status,
        lines: lines.map((line: any) => ({
          itemCode: line.itemCode || "",
          itemName: line.itemName || "",
          batchNumber: line.batchNumber,
          quantity: line.countedQty,
          unit: line.unit || "Piece",
          unitCost: 0,
          totalValue: 0,
        })),
        warehouse: (session as any).warehouse,
        requestedBy: (session as any).countedBy,
        notes: (session as any).notes,
      };
      
      const pdf = await generateStockPdf("physicalCount", docData, input.language || "en");
      return { pdf: pdf.toString("base64"), filename: `physical-count-${(session as any).sessionNumber}.pdf` };
    }),
});

// ============================================================================
// EXCEL EXPORT ROUTER
// ============================================================================
const exportsRouter = router({
  // Export IssuedItems to Excel
  issuedItems: scopedProcedure
    .input(z.object({
      filters: z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      let query = db.select().from(stockIssues).where(eq(stockIssues.organizationId, organizationId));
      
      if (input.filters?.search) {
        query = query.where(like(stockIssues.issueNumber, `%${input.filters.search}%`));
      }
      if (input.filters?.status) {
        query = query.where(eq(stockIssues.status, input.filters.status));
      }
      
      const issues = await query;
      return { data: issues, filename: `issued-items-${Date.now()}.xlsx` };
    }),

  // Export Returns to Excel
  returns: scopedProcedure
    .input(z.object({
      filters: z.object({
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      let query = db.select().from(stockReturns).where(eq(stockReturns.organizationId, organizationId));
      
      if (input.filters?.search) {
        query = query.where(like(stockReturns.returnNumber, `%${input.filters.search}%`));
      }
      if (input.filters?.status) {
        query = query.where(eq(stockReturns.status, input.filters.status));
      }
      
      const returns = await query;
      return { data: returns, filename: `returns-${Date.now()}.xlsx` };
    }),

  // Export Adjustments to Excel
  adjustments: scopedProcedure
    .input(z.object({
      filters: z.object({
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      let query = db.select().from(stockAdjustments).where(eq(stockAdjustments.organizationId, organizationId));
      
      if (input.filters?.search) {
        query = query.where(like(stockAdjustments.adjustmentNumber, `%${input.filters.search}%`));
      }
      if (input.filters?.status) {
        query = query.where(eq(stockAdjustments.status, input.filters.status));
      }
      
      const adjustments = await query;
      return { data: adjustments, filename: `adjustments-${Date.now()}.xlsx` };
    }),

  // Export Transfers to Excel
  transfers: scopedProcedure
    .input(z.object({
      filters: z.object({
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      let query = db.select().from(warehouseTransfers).where(eq(warehouseTransfers.organizationId, organizationId));
      
      if (input.filters?.search) {
        query = query.where(like(warehouseTransfers.transferNumber, `%${input.filters.search}%`));
      }
      if (input.filters?.status) {
        query = query.where(eq(warehouseTransfers.status, input.filters.status));
      }
      
      const transfers = await query;
      return { data: transfers, filename: `transfers-${Date.now()}.xlsx` };
    }),

  // Export PhysicalCount to Excel
  physicalCount: scopedProcedure
    .input(z.object({
      filters: z.object({
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { organizationId } = ctx;
      let query = db.select().from(physicalCountSessions).where(eq(physicalCountSessions.organizationId, organizationId));
      
      if (input.filters?.search) {
        query = query.where(like(physicalCountSessions.sessionNumber, `%${input.filters.search}%`));
      }
      if (input.filters?.status) {
        query = query.where(eq(physicalCountSessions.status, input.filters.status));
      }
      
      const sessions = await query;
      return { data: sessions, filename: `physical-count-${Date.now()}.xlsx` };
    }),
});

// ============================================================================
// GRN-TO-STOCK AUTOMATION ROUTER
// ============================================================================
import { retroactivelyProcessAcceptedGrns } from "../../automation/grnToStockAutomation";

const grnStockAutomationRouter = router({
  /** Retroactively process all accepted GRNs that haven't been stock-posted */
  processUnpostedGrns: scopedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      const result = await retroactivelyProcessAcceptedGrns(db, ctx.user.id);
      return result;
    }),
});

// ============================================================================
// EXPORT COMBINED ROUTER
// ============================================================================
export const stockManagementRouter = router({
  batches: batchesRouter,
  issues: issuesRouter,
  requests: requestsRouter,
  returns: returnsRouter,
  ledger: ledgerRouter,
  kpis: kpisRouter,
  itemDetail: itemsWithBatchesRouter,
  adjustments: adjustmentsRouter,
  transfers: warehouseTransfersRouter,
  expiryAlerts: expiryAlertsRouter,
  physicalCount: physicalCountRouter,
  transferTracking: transferTrackingRouter,
  scheduledAlerts: scheduledExpiryRouter,
  warehouseAlertConfigs: warehouseAlertConfigsRouter,
  analytics: stockAnalyticsRouter,
  grnAutomation: grnStockAutomationRouter,
  exports: exportsRouter,
  pdf: pdfRouter,
});
