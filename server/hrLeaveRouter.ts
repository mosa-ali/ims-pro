import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { generateLeaveApprovalEvidence } from "./evidenceGeneration";
import { getDb } from "./db";
import { hrLeaveRequests, hrLeaveBalances, hrEmployees } from "../drizzle/schema";
import { eq, and, desc, sql, count, gte, lte } from "drizzle-orm";

/**
 * HR Leave Router - Leave Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 */
export const hrLeaveRouter = router({
  // Get all leave requests for an organization and operating unit
  getAll: scopedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
      leaveType: z.enum(["annual", "sick", "maternity", "paternity", "unpaid", "compassionate", "study", "other"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrLeaveRequests.organizationId, organizationId),
        eq(hrLeaveRequests.isDeleted, false),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(hrLeaveRequests.operatingUnitId, operatingUnitId));
      }
      if (input.employeeId) {
        conditions.push(eq(hrLeaveRequests.employeeId, input.employeeId));
      }
      if (input.status) {
        conditions.push(eq(hrLeaveRequests.status, input.status));
      }
      if (input.leaveType) {
        conditions.push(eq(hrLeaveRequests.leaveType, input.leaveType));
      }
      
      const requests = await db
        .select()
        .from(hrLeaveRequests)
        .where(and(...conditions))
        .orderBy(desc(hrLeaveRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      return requests;
    }),

  // Get single leave request by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(hrLeaveRequests)
        .where(
          and(
            eq(hrLeaveRequests.id, input.id),
            eq(hrLeaveRequests.organizationId, organizationId),
            eq(hrLeaveRequests.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get leave requests with employee names (for UI display)
  getRequests: scopedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
      leaveType: z.enum(["annual", "sick", "maternity", "paternity", "unpaid", "compassionate", "study", "other"]).optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrLeaveRequests.organizationId, organizationId),
        eq(hrLeaveRequests.isDeleted, false),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(hrLeaveRequests.operatingUnitId, operatingUnitId));
      }
      if (input.employeeId) {
        conditions.push(eq(hrLeaveRequests.employeeId, input.employeeId));
      }
      if (input.status) {
        conditions.push(eq(hrLeaveRequests.status, input.status));
      }
      if (input.leaveType) {
        conditions.push(eq(hrLeaveRequests.leaveType, input.leaveType));
      }
      
      // Get leave requests first
      const requests = await db
        .select()
        .from(hrLeaveRequests)
        .where(and(...conditions))
        .orderBy(desc(hrLeaveRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      // Get employee IDs
      const employeeIds = [...new Set(requests.map(r => r.employeeId))];
      
      // Get employees
      const employees = employeeIds.length > 0 ? await db
        .select()
        .from(hrEmployees)
        .where(sql`${hrEmployees.id} IN (${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)})`) : [];
      
      // Create employee map
      const employeeMap = new Map(employees.map(e => [e.id, e]));
      
      // Combine data
      return requests.map(r => {
        const employee = employeeMap.get(r.employeeId);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
        return {
          ...r,
          employeeName,
          employeeCode: employee?.employeeCode || 'N/A',
        };
      });
    }),

  // Get leave statistics
  getStatistics: scopedProcedure
    .input(z.object({
      year: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const year = input.year || new Date().getFullYear();
      
      const conditions = [
        eq(hrLeaveRequests.organizationId, organizationId),
        eq(hrLeaveRequests.isDeleted, false),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(hrLeaveRequests.operatingUnitId, operatingUnitId));
      }
      
      const allRequests = await db
        .select()
        .from(hrLeaveRequests)
        .where(and(...conditions));
      
      const pending = allRequests.filter(r => r.status === 'pending').length;
      const approved = allRequests.filter(r => r.status === 'approved').length;
      const rejected = allRequests.filter(r => r.status === 'rejected').length;
      const cancelled = allRequests.filter(r => r.status === 'cancelled').length;
      
      // By leave type
      const byType = {
        annual: allRequests.filter(r => r.leaveType === 'annual').length,
        sick: allRequests.filter(r => r.leaveType === 'sick').length,
        maternity: allRequests.filter(r => r.leaveType === 'maternity').length,
        paternity: allRequests.filter(r => r.leaveType === 'paternity').length,
        unpaid: allRequests.filter(r => r.leaveType === 'unpaid').length,
        compassionate: allRequests.filter(r => r.leaveType === 'compassionate').length,
        study: allRequests.filter(r => r.leaveType === 'study').length,
        other: allRequests.filter(r => r.leaveType === 'other').length,
      };
      
      return {
        total: allRequests.length,
        byStatus: { pending, approved, rejected, cancelled },
        byType,
        year,
      };
    }),

  // Create new leave request
  create: scopedProcedure
    .input(z.object({
      employeeId: z.number(),
      leaveType: z.enum(["annual", "sick", "maternity", "paternity", "unpaid", "compassionate", "study", "other"]),
      startDate: z.string(),
      endDate: z.string(),
      totalDays: z.number(),
      reason: z.string().optional(),
      attachmentUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get current balance
      const currentYear = new Date().getFullYear();
      const balanceResult = await db
        .select()
        .from(hrLeaveBalances)
        .where(
          and(
            eq(hrLeaveBalances.employeeId, input.employeeId),
            eq(hrLeaveBalances.year, currentYear),
            eq(hrLeaveBalances.leaveType, input.leaveType),
            eq(hrLeaveBalances.isDeleted, false)
          )
        )
        .limit(1);
      
      const balance = balanceResult[0];
      const balanceBefore = balance ? parseFloat(balance.remaining?.toString() || "0") : 0;
      
      const result = await db.insert(hrLeaveRequests).values({
        organizationId,
        operatingUnitId: operatingUnitId || 0,
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        totalDays: input.totalDays.toString(),
        reason: input.reason,
        attachmentUrl: input.attachmentUrl,
        notes: input.notes,
        status: "pending",
        balanceBefore: balanceBefore.toString(),
      });
      
      // Update pending balance
      if (balance) {
        const newPending = parseFloat(balance.pending?.toString() || "0") + input.totalDays;
        await db
          .update(hrLeaveBalances)
          .set({ pending: newPending.toString() })
          .where(eq(hrLeaveBalances.id, balance.id));
      }
      
      return { id: result[0].insertId, success: true };
    }),

  // Approve leave request
  approve: scopedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get the leave request
      const requestResult = await db
        .select()
        .from(hrLeaveRequests)
        .where(and(
          eq(hrLeaveRequests.id, input.id),
          eq(hrLeaveRequests.organizationId, organizationId)
        ))
        .limit(1);
      
      const request = requestResult[0];
      if (!request) throw new Error("Leave request not found");
      
      // Update request status
      await db
        .update(hrLeaveRequests)
        .set({
          status: "approved",
          approvedBy: ctx.user?.id,
          approvedAt: new Date(),
          notes: input.notes,
        })
        .where(eq(hrLeaveRequests.id, input.id));
      
      // Update leave balance
      const currentYear = new Date().getFullYear();
      const balanceResult = await db
        .select()
        .from(hrLeaveBalances)
        .where(
          and(
            eq(hrLeaveBalances.employeeId, request.employeeId),
            eq(hrLeaveBalances.year, currentYear),
            eq(hrLeaveBalances.leaveType, request.leaveType),
            eq(hrLeaveBalances.isDeleted, false)
          )
        )
        .limit(1);
      
      if (balanceResult[0]) {
        const balance = balanceResult[0];
        const totalDays = parseFloat(request.totalDays?.toString() || "0");
        const newUsed = parseFloat(balance.used?.toString() || "0") + totalDays;
        const newPending = Math.max(0, parseFloat(balance.pending?.toString() || "0") - totalDays);
        const newRemaining = parseFloat(balance.entitlement?.toString() || "0") + 
                            parseFloat(balance.carriedOver?.toString() || "0") - newUsed;
        
        await db
          .update(hrLeaveBalances)
          .set({
            used: newUsed.toString(),
            pending: newPending.toString(),
            remaining: newRemaining.toString(),
          })
          .where(eq(hrLeaveBalances.id, balance.id));
        
        // Update balance after in request
        await db
          .update(hrLeaveRequests)
          .set({ balanceAfter: newRemaining.toString() })
          .where(eq(hrLeaveRequests.id, input.id));
      }
      
      // Generate evidence document (async, don't block response)
      generateLeaveApprovalEvidence(
        request,
        { organizationId, operatingUnitId: ctx.scope.operatingUnitId, userId: ctx.user?.id || 0 }
      ).catch((err) => console.error("[Evidence] Failed to generate leave approval evidence:", err));
      
      return { success: true };
    }),

  // Reject leave request
  reject: scopedProcedure
    .input(z.object({
      id: z.number(),
      rejectionReason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get the leave request
      const requestResult = await db
        .select()
        .from(hrLeaveRequests)
        .where(and(
          eq(hrLeaveRequests.id, input.id),
          eq(hrLeaveRequests.organizationId, organizationId)
        ))
        .limit(1);
      
      const request = requestResult[0];
      if (!request) throw new Error("Leave request not found");
      
      // Update request status
      await db
        .update(hrLeaveRequests)
        .set({
          status: "rejected",
          approvedBy: ctx.user?.id,
          approvedAt: new Date(),
          rejectionReason: input.rejectionReason,
        })
        .where(eq(hrLeaveRequests.id, input.id));
      
      // Remove from pending balance
      const currentYear = new Date().getFullYear();
      const balanceResult = await db
        .select()
        .from(hrLeaveBalances)
        .where(
          and(
            eq(hrLeaveBalances.employeeId, request.employeeId),
            eq(hrLeaveBalances.year, currentYear),
            eq(hrLeaveBalances.leaveType, request.leaveType),
            eq(hrLeaveBalances.isDeleted, false)
          )
        )
        .limit(1);
      
      if (balanceResult[0]) {
        const balance = balanceResult[0];
        const totalDays = parseFloat(request.totalDays?.toString() || "0");
        const newPending = Math.max(0, parseFloat(balance.pending?.toString() || "0") - totalDays);
        
        await db
          .update(hrLeaveBalances)
          .set({ pending: newPending.toString() })
          .where(eq(hrLeaveBalances.id, balance.id));
      }
      
      return { success: true };
    }),

  // Cancel leave request
  cancel: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get the leave request
      const requestResult = await db
        .select()
        .from(hrLeaveRequests)
        .where(and(
          eq(hrLeaveRequests.id, input.id),
          eq(hrLeaveRequests.organizationId, organizationId)
        ))
        .limit(1);
      
      const request = requestResult[0];
      if (!request) throw new Error("Leave request not found");
      
      // Update request status
      await db
        .update(hrLeaveRequests)
        .set({ status: "cancelled" })
        .where(eq(hrLeaveRequests.id, input.id));
      
      // If was approved, restore balance
      if (request.status === "approved") {
        const currentYear = new Date().getFullYear();
        const balanceResult = await db
          .select()
          .from(hrLeaveBalances)
          .where(
            and(
              eq(hrLeaveBalances.employeeId, request.employeeId),
              eq(hrLeaveBalances.year, currentYear),
              eq(hrLeaveBalances.leaveType, request.leaveType),
              eq(hrLeaveBalances.isDeleted, false)
            )
          )
          .limit(1);
        
        if (balanceResult[0]) {
          const balance = balanceResult[0];
          const totalDays = parseFloat(request.totalDays?.toString() || "0");
          const newUsed = Math.max(0, parseFloat(balance.used?.toString() || "0") - totalDays);
          const newRemaining = parseFloat(balance.entitlement?.toString() || "0") + 
                              parseFloat(balance.carriedOver?.toString() || "0") - newUsed;
          
          await db
            .update(hrLeaveBalances)
            .set({
              used: newUsed.toString(),
              remaining: newRemaining.toString(),
            })
            .where(eq(hrLeaveBalances.id, balance.id));
        }
      }
      // If was pending, remove from pending
      else if (request.status === "pending") {
        const currentYear = new Date().getFullYear();
        const balanceResult = await db
          .select()
          .from(hrLeaveBalances)
          .where(
            and(
              eq(hrLeaveBalances.employeeId, request.employeeId),
              eq(hrLeaveBalances.year, currentYear),
              eq(hrLeaveBalances.leaveType, request.leaveType),
              eq(hrLeaveBalances.isDeleted, false)
            )
          )
          .limit(1);
        
        if (balanceResult[0]) {
          const balance = balanceResult[0];
          const totalDays = parseFloat(request.totalDays?.toString() || "0");
          const newPending = Math.max(0, parseFloat(balance.pending?.toString() || "0") - totalDays);
          
          await db
            .update(hrLeaveBalances)
            .set({ pending: newPending.toString() })
            .where(eq(hrLeaveBalances.id, balance.id));
        }
      }
      
      return { success: true };
    }),

  // Soft delete leave request
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrLeaveRequests)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(hrLeaveRequests.id, input.id),
          eq(hrLeaveRequests.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // ========== Leave Balances ==========
  
  // Get leave balances for an employee
  getBalances: scopedProcedure
    .input(z.object({
      employeeId: z.number(),
      year: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const year = input.year || new Date().getFullYear();
      
      return await db
        .select()
        .from(hrLeaveBalances)
        .where(
          and(
            eq(hrLeaveBalances.organizationId, organizationId),
            eq(hrLeaveBalances.employeeId, input.employeeId),
            eq(hrLeaveBalances.year, year),
            eq(hrLeaveBalances.isDeleted, false)
          )
        );
    }),

  // Set leave balance
  setBalance: scopedProcedure
    .input(z.object({
      employeeId: z.number(),
      year: z.number(),
      leaveType: z.enum(["annual", "sick", "maternity", "paternity", "unpaid", "compassionate", "study", "other"]),
      entitlement: z.number(),
      carriedOver: z.number().optional().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if balance exists
      const existing = await db
        .select()
        .from(hrLeaveBalances)
        .where(
          and(
            eq(hrLeaveBalances.employeeId, input.employeeId),
            eq(hrLeaveBalances.year, input.year),
            eq(hrLeaveBalances.leaveType, input.leaveType)
          )
        )
        .limit(1);
      
      if (existing[0]) {
        // Update existing
        const remaining = input.entitlement + input.carriedOver - parseFloat(existing[0].used?.toString() || "0");
        await db
          .update(hrLeaveBalances)
          .set({
            entitlement: input.entitlement.toString(),
            carriedOver: input.carriedOver.toString(),
            remaining: remaining.toString(),
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
          })
          .where(eq(hrLeaveBalances.id, existing[0].id));
        
        return { id: existing[0].id, success: true };
      } else {
        // Create new
        const remaining = input.entitlement + input.carriedOver;
        const result = await db.insert(hrLeaveBalances).values({
          organizationId,
          employeeId: input.employeeId,
          year: input.year,
          leaveType: input.leaveType,
          entitlement: input.entitlement.toString(),
          carriedOver: input.carriedOver.toString(),
          used: "0",
          pending: "0",
          remaining: remaining.toString(),
        });
        
        return { id: result[0].insertId, success: true };
      }
    }),
});
