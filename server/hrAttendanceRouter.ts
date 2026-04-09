import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { hrAttendanceRecords, hrEmployees } from "../drizzle/schema";
import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";

/**
 * HR Attendance Router - Attendance Tracking
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 */
export const hrAttendanceRouter = router({
  // Get attendance records for a date range
  getAll: scopedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      startDate: z.string(),
      endDate: z.string(),
      status: z.enum(["present", "absent", "late", "half_day", "on_leave", "holiday", "weekend"]).optional(),
      limit: z.number().optional().default(1000),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrAttendanceRecords.organizationId, organizationId),
        eq(hrAttendanceRecords.isDeleted, false),
        gte(hrAttendanceRecords.date, new Date(input.startDate)),
        lte(hrAttendanceRecords.date, new Date(input.endDate)),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(hrAttendanceRecords.operatingUnitId, operatingUnitId));
      }
      if (input.employeeId) {
        conditions.push(eq(hrAttendanceRecords.employeeId, input.employeeId));
      }
      if (input.status) {
        conditions.push(eq(hrAttendanceRecords.status, input.status));
      }
      
      return await db
        .select()
        .from(hrAttendanceRecords)
        .where(and(...conditions))
        .orderBy(desc(hrAttendanceRecords.date))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Get attendance for a specific date
  getByDate: scopedProcedure
    .input(z.object({
      date: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrAttendanceRecords.organizationId, organizationId),
        eq(hrAttendanceRecords.date, new Date(input.date)),
        eq(hrAttendanceRecords.isDeleted, false),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(hrAttendanceRecords.operatingUnitId, operatingUnitId));
      }
      
      return await db
        .select()
        .from(hrAttendanceRecords)
        .where(and(...conditions));
    }),

  // Get single attendance record
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(hrAttendanceRecords)
        .where(
          and(
            eq(hrAttendanceRecords.id, input.id),
            eq(hrAttendanceRecords.organizationId, organizationId),
            eq(hrAttendanceRecords.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get attendance statistics
  getStatistics: scopedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrAttendanceRecords.organizationId, organizationId),
        eq(hrAttendanceRecords.isDeleted, false),
        gte(hrAttendanceRecords.date, new Date(input.startDate)),
        lte(hrAttendanceRecords.date, new Date(input.endDate)),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(hrAttendanceRecords.operatingUnitId, operatingUnitId));
      }
      
      const allRecords = await db
        .select()
        .from(hrAttendanceRecords)
        .where(and(...conditions));
      
      const present = allRecords.filter(r => r.status === 'present').length;
      const absent = allRecords.filter(r => r.status === 'absent').length;
      const late = allRecords.filter(r => r.status === 'late').length;
      const halfDay = allRecords.filter(r => r.status === 'half_day').length;
      const onLeave = allRecords.filter(r => r.status === 'on_leave').length;
      const holiday = allRecords.filter(r => r.status === 'holiday').length;
      const weekend = allRecords.filter(r => r.status === 'weekend').length;
      
      const totalWorkHours = allRecords.reduce((sum, r) => {
        return sum + parseFloat(r.workHours?.toString() || "0");
      }, 0);
      
      const totalOvertimeHours = allRecords.reduce((sum, r) => {
        return sum + parseFloat(r.overtimeHours?.toString() || "0");
      }, 0);
      
      const uniqueEmployees = new Set(allRecords.map(r => r.employeeId)).size;
      
      return {
        total: allRecords.length,
        byStatus: { present, absent, late, halfDay, onLeave, holiday, weekend },
        totalWorkHours,
        totalOvertimeHours,
        uniqueEmployees,
        attendanceRate: allRecords.length > 0 
          ? ((present + late + halfDay) / (present + absent + late + halfDay) * 100).toFixed(1)
          : "0",
      };
    }),

  // Create or update attendance record
  upsert: scopedProcedure
    .input(z.object({
      employeeId: z.number(),
      date: z.string(),
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
      status: z.enum(["present", "absent", "late", "half_day", "on_leave", "holiday", "weekend"]),
      workHours: z.number().optional(),
      overtimeHours: z.number().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if record exists
      const existing = await db
        .select()
        .from(hrAttendanceRecords)
        .where(
          and(
            eq(hrAttendanceRecords.employeeId, input.employeeId),
            eq(hrAttendanceRecords.date, new Date(input.date))
          )
        )
        .limit(1);
      
      if (existing[0]) {
        // Update existing
        await db
          .update(hrAttendanceRecords)
          .set({
            checkIn: input.checkIn ? new Date(input.checkIn) : null,
            checkOut: input.checkOut ? new Date(input.checkOut) : null,
            status: input.status,
            workHours: input.workHours?.toString(),
            overtimeHours: input.overtimeHours?.toString(),
            location: input.location,
            notes: input.notes,
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
          })
          .where(eq(hrAttendanceRecords.id, existing[0].id));
        
        return { id: existing[0].id, success: true, updated: true };
      } else {
        // Create new
        const result = await db.insert(hrAttendanceRecords).values({
          organizationId,
          operatingUnitId: operatingUnitId || 0,
          employeeId: input.employeeId,
          date: new Date(input.date),
          checkIn: input.checkIn ? new Date(input.checkIn) : null,
          checkOut: input.checkOut ? new Date(input.checkOut) : null,
          status: input.status,
          workHours: input.workHours?.toString(),
          overtimeHours: input.overtimeHours?.toString(),
          location: input.location,
          notes: input.notes,
        });
        
        return { id: result[0].insertId, success: true, updated: false };
      }
    }),

  // Bulk create attendance records
  bulkCreate: scopedProcedure
    .input(z.object({
      records: z.array(z.object({
        employeeId: z.number(),
        date: z.string(),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        status: z.enum(["present", "absent", "late", "half_day", "on_leave", "holiday", "weekend"]),
        workHours: z.number().optional(),
        overtimeHours: z.number().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let created = 0;
      let updated = 0;
      
      for (const record of input.records) {
        // Check if record exists
        const existing = await db
          .select()
          .from(hrAttendanceRecords)
          .where(
            and(
              eq(hrAttendanceRecords.employeeId, record.employeeId),
              eq(hrAttendanceRecords.date, new Date(record.date))
            )
          )
          .limit(1);
        
        if (existing[0]) {
          await db
            .update(hrAttendanceRecords)
            .set({
              checkIn: record.checkIn ? new Date(record.checkIn) : null,
              checkOut: record.checkOut ? new Date(record.checkOut) : null,
              status: record.status,
              workHours: record.workHours?.toString(),
              overtimeHours: record.overtimeHours?.toString(),
              location: record.location,
              notes: record.notes,
              isDeleted: false,
            })
            .where(eq(hrAttendanceRecords.id, existing[0].id));
          updated++;
        } else {
          await db.insert(hrAttendanceRecords).values({
            organizationId,
            operatingUnitId: operatingUnitId || 0,
            employeeId: record.employeeId,
            date: new Date(record.date),
            checkIn: record.checkIn ? new Date(record.checkIn) : null,
            checkOut: record.checkOut ? new Date(record.checkOut) : null,
            status: record.status,
            workHours: record.workHours?.toString(),
            overtimeHours: record.overtimeHours?.toString(),
            location: record.location,
            notes: record.notes,
          });
          created++;
        }
      }
      
      return { success: true, created, updated };
    }),

  // Lock attendance period
  lockPeriod: scopedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrAttendanceRecords.organizationId, organizationId),
        gte(hrAttendanceRecords.date, new Date(input.startDate)),
        lte(hrAttendanceRecords.date, new Date(input.endDate)),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(hrAttendanceRecords.operatingUnitId, operatingUnitId));
      }
      
      await db
        .update(hrAttendanceRecords)
        .set({
          periodLocked: true,
          lockedBy: ctx.user?.id,
          lockedAt: new Date(),
        })
        .where(and(...conditions));
      
      return { success: true };
    }),

  // Unlock attendance period
  unlockPeriod: scopedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrAttendanceRecords.organizationId, organizationId),
        gte(hrAttendanceRecords.date, new Date(input.startDate)),
        lte(hrAttendanceRecords.date, new Date(input.endDate)),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(hrAttendanceRecords.operatingUnitId, operatingUnitId));
      }
      
      await db
        .update(hrAttendanceRecords)
        .set({
          periodLocked: false,
          lockedBy: null,
          lockedAt: null,
        })
        .where(and(...conditions));
      
      return { success: true };
    }),

  // Soft delete attendance record
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrAttendanceRecords)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(hrAttendanceRecords.id, input.id),
          eq(hrAttendanceRecords.organizationId, organizationId)
        ));
      
      return { success: true };
    }),
});
