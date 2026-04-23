import { z } from "zod";
import {
  protectedProcedure,
  router,
  scopedProcedure,
} from "./_core/trpc";

import { getDb } from "./db";

import {
  hrAttendanceRecords,
  hrAttendancePeriods,
  hrEmployees,
  organizations,
} from "../drizzle/schema";

import {
  eq,
  and,
  desc,
  gte,
  lte,
  sql,
  count,
  isNull,
} from "drizzle-orm";

import { generateOfficialPdf } from "./services/pdf/OfficialPdfEngine";
import { generateAttendanceReportHtml } from "./services/pdf/templates/AttendanceReportTemplate";


/* =========================================================
   DATE HELPERS
========================================================= */

const formatSqlDate = (
  dateValue?: string | Date | null
) => {
  if (!dateValue) return null;

  return new Date(dateValue)
    .toISOString()
    .split("T")[0];
};

const formatSqlDateTime = (
  dateValue?: string | Date | null
) => {
  if (!dateValue) return null;

  return new Date(dateValue)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
};

const nowSql = new Date()
  .toISOString()
  .slice(0, 19)
  .replace("T", " ");

/* =========================================================
   PERIOD LOCK VALIDATION
========================================================= */

const validatePeriodLock = async ({
  db,
  organizationId,
  operatingUnitId,
  attendanceDate,
}: {
  db: any;
  organizationId: number;
  operatingUnitId?: number | null;
  attendanceDate: string;
}) => {
  const dateObj = new Date(attendanceDate);

  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const conditions = [
    eq(hrAttendancePeriods.organizationId, organizationId),
    eq(hrAttendancePeriods.periodMonth, month),
    eq(hrAttendancePeriods.periodYear, year),
    eq(hrAttendancePeriods.status, "locked"),
    eq(hrAttendancePeriods.isDeleted, 0),
  ];

  if (operatingUnitId) {
    conditions.push(
      eq(
        hrAttendancePeriods.operatingUnitId,
        operatingUnitId
      )
    );
  }

  const lockedPeriod = await db
    .select()
    .from(hrAttendancePeriods)
    .where(and(...conditions))
    .limit(1);

  if (lockedPeriod.length > 0) {
    throw new Error(
      `Attendance period ${month}/${year} is locked`
    );
  }
};

  const validatePeriodUnlocked = async (
  organizationId: number,
  operatingUnitId: number | null,
  attendanceDate: string
) => {
  const date = new Date(attendanceDate);

  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const db = await getDb();
  const lockedPeriod = await db
    .select()
    .from(hrAttendancePeriods)
    .where(
      and(
        eq(hrAttendancePeriods.organizationId, organizationId),
        eq(hrAttendancePeriods.periodMonth, month),
        eq(hrAttendancePeriods.periodYear, year),
        eq(hrAttendancePeriods.status, "locked"),
        operatingUnitId
          ? eq(
              hrAttendancePeriods.operatingUnitId,
              operatingUnitId
            )
          : isNull(hrAttendancePeriods.operatingUnitId)
      )
    )
    .limit(1);

  if (lockedPeriod.length > 0) {
    throw new Error(
      "This attendance period is locked and cannot be modified."
    );
  }
};

/* =========================================================
   ROUTER
========================================================= */

export const hrAttendanceRouter = router({

  /* =====================================
     ATTENDANCE PERIODS
  ===================================== */

  getAttendancePeriods: scopedProcedure
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } =
        ctx.scope;

      const db = await getDb();
      if (!db)
        throw new Error("Database not available");

      const conditions = [
        eq(
          hrAttendancePeriods.organizationId,
          organizationId
        ),
        eq(hrAttendancePeriods.isDeleted, 0),
      ];

      if (operatingUnitId) {
        conditions.push(
          eq(
            hrAttendancePeriods.operatingUnitId,
            operatingUnitId
          )
        );
      }

      return await db
        .select()
        .from(hrAttendancePeriods)
        .where(and(...conditions))
        .orderBy(
          desc(hrAttendancePeriods.periodYear),
          desc(hrAttendancePeriods.periodMonth)
        );
    }),

  getCurrentPeriod: scopedProcedure
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } =
        ctx.scope;

      const db = await getDb();
      if (!db)
        throw new Error("Database not available");

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const conditions = [
        eq(
          hrAttendancePeriods.organizationId,
          organizationId
        ),
        eq(
          hrAttendancePeriods.periodMonth,
          month
        ),
        eq(
          hrAttendancePeriods.periodYear,
          year
        ),
        eq(hrAttendancePeriods.isDeleted, 0),
      ];

      if (operatingUnitId) {
        conditions.push(
          eq(
            hrAttendancePeriods.operatingUnitId,
            operatingUnitId
          )
        );
      }

      const result = await db
        .select()
        .from(hrAttendancePeriods)
        .where(and(...conditions))
        .limit(1);

      return result[0] || null;
    }),

  createOrUpdateAttendancePeriod:
    scopedProcedure
      .input(
        z.object({
          periodMonth: z.number(),
          periodYear: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const {
          organizationId,
          operatingUnitId,
        } = ctx.scope;

        const db = await getDb();
        if (!db)
          throw new Error(
            "Database not available"
          );

        const existing = await db
          .select()
          .from(hrAttendancePeriods)
          .where(
            and(
              eq(
                hrAttendancePeriods.organizationId,
                organizationId
              ),
              eq(
                hrAttendancePeriods.periodMonth,
                input.periodMonth
              ),
              eq(
                hrAttendancePeriods.periodYear,
                input.periodYear
              )
            )
          )
          .limit(1);

        if (existing.length > 0) {
          return existing[0];
        }

        const monthName = new Date(
          input.periodYear,
          input.periodMonth - 1
        ).toLocaleString("en", {
          month: "long",
        });

        const lockDeadline = new Date(
          input.periodYear,
          input.periodMonth,
          4
        );

        await db
          .insert(hrAttendancePeriods)
          .values({
            organizationId,
            operatingUnitId,
            periodMonth:
              input.periodMonth,
            periodYear:
              input.periodYear,
            monthName,
            status: "open",
            lockDeadline,
            createdBy:
              ctx.user?.id,
          });

        return {
          success: true,
        };
      }),

  lockAttendancePeriod:
    scopedProcedure
      .input(
        z.object({
          periodMonth:
            z.number(),
          periodYear:
            z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const {
          organizationId,
          operatingUnitId,
        } = ctx.scope;

        const db = await getDb();

        await db
          .update(
            hrAttendancePeriods
          )
          .set({
            status:
              "locked",
            lockedBy:
              ctx.user?.id,
            lockedAt:
              nowSql,
            updatedBy:
              ctx.user?.id,
          })
          .where(
            and(
              eq(
                hrAttendancePeriods.organizationId,
                organizationId
              ),
              eq(
                hrAttendancePeriods.periodMonth,
                input.periodMonth
              ),
              eq(
                hrAttendancePeriods.periodYear,
                input.periodYear
              ),
              operatingUnitId
                ? eq(
                    hrAttendancePeriods.operatingUnitId,
                    operatingUnitId
                  )
                : undefined
            )
          );

        return {
          success: true,
        };
      }),

  unlockAttendancePeriod:
    scopedProcedure
      .input(
        z.object({
          periodMonth:
            z.number(),
          periodYear:
            z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const {
          organizationId,
          operatingUnitId,
        } = ctx.scope;

        const db = await getDb();

        await db
          .update(
            hrAttendancePeriods
          )
          .set({
            status:
              "open",
            unlockedBy:
              ctx.user?.id,
            unlockedAt:
              nowSql,
            updatedBy:
              ctx.user?.id,
          })
          .where(
            and(
              eq(
                hrAttendancePeriods.organizationId,
                organizationId
              ),
              eq(
                hrAttendancePeriods.periodMonth,
                input.periodMonth
              ),
              eq(
                hrAttendancePeriods.periodYear,
                input.periodYear
              ),
              operatingUnitId
                ? eq(
                    hrAttendancePeriods.operatingUnitId,
                    operatingUnitId
                  )
                : undefined
            )
          );

        return {
          success: true,
        };
      }),

  /* =====================================
     ATTENDANCE RECORDS
  ===================================== */

  getAll: scopedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        employeeId:
          z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        organizationId,
        operatingUnitId,
      } = ctx.scope;

      const db = await getDb();

      const conditions = [
        eq(
          hrAttendanceRecords.organizationId,
          organizationId
        ),
        eq(
          hrAttendanceRecords.isDeleted,
          0
        ),
        gte(
          hrAttendanceRecords.date,
          input.startDate
        ),
        lte(
          hrAttendanceRecords.date,
          input.endDate
        ),
      ];

      if (
        operatingUnitId
      ) {
        conditions.push(
          eq(
            hrAttendanceRecords.operatingUnitId,
            operatingUnitId
          )
        );
      }

      if (
        input.employeeId
      ) {
        conditions.push(
          eq(
            hrAttendanceRecords.employeeId,
            input.employeeId
          )
        );
      }

      return await db
        .select()
        .from(
          hrAttendanceRecords
        )
        .where(
          and(
            ...conditions
          )
        )
        .orderBy(
          desc(
            hrAttendanceRecords.date
          )
        );
    }),

  upsert: scopedProcedure
    .input(
      z.object({
        employeeId:
          z.number(),
        date: z.string(),
        status: z.enum([
            "present",
            "absent",
            "late",
            "half_day",
            "holiday",
            "weekend",
            "on_leave"
          ]),
        checkIn:
          z.string()
            .optional(),
        checkOut:
          z.string()
            .optional(),
        workHours:
          z.number()
            .optional(),
        overtimeHours:
          z.number()
            .optional(),
        notes:
          z.string()
            .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        organizationId,
        operatingUnitId,
      } = ctx.scope;

      const db = await getDb();

      await validatePeriodLock({
        db,
        organizationId,
        operatingUnitId,
        attendanceDate:
          input.date,
      });

      const existing =
        await db
          .select()
          .from(
            hrAttendanceRecords
          )
          .where(
            and(
              eq(
                hrAttendanceRecords.employeeId,
                input.employeeId
              ),
              eq(
                hrAttendanceRecords.date,
                input.date
              )
            )
          )
          .limit(1);

      if (
        existing.length >
        0
      ) {
        await db
          .update(
            hrAttendanceRecords
          )
          .set({
            status:
              input.status,
            checkIn:
              formatSqlDateTime(
                input.checkIn
              ),
            checkOut:
              formatSqlDateTime(
                input.checkOut
              ),
            workHours:
              input.workHours?.toString(),
            overtimeHours:
              input.overtimeHours?.toString(),
            notes:
              input.notes,
          })
          .where(
            eq(
              hrAttendanceRecords.id,
              existing[0].id
            )
          );

        return {
          success: true,
          updated: true,
        };
      }

      await db
        .insert(
          hrAttendanceRecords
        )
        .values({
          organizationId,
          operatingUnitId,
          employeeId:
            input.employeeId,
          date:
            input.date,
          status:
            input.status as any,
          checkIn:
            formatSqlDateTime(
              input.checkIn
            ),
          checkOut:
            formatSqlDateTime(
              input.checkOut
            ),
          workHours:
            input.workHours?.toString(),
          overtimeHours:
            input.overtimeHours?.toString(),
          notes:
            input.notes,
        });

      return {
        success: true,
        updated: false,
      };
    }),

  delete: scopedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        organizationId,
      } = ctx.scope;

      const db = await getDb();

      const record =
        await db
          .select()
          .from(
            hrAttendanceRecords
          )
          .where(
            eq(
              hrAttendanceRecords.id,
              input.id
            )
          )
          .limit(1);

      if (
        !record.length
      ) {
        throw new Error(
          "Record not found"
        );
      }

      await validatePeriodLock({
        db,
        organizationId,
        attendanceDate:
          record[0].date,
      });

      await db
        .update(
          hrAttendanceRecords
        )
        .set({
          isDeleted:
            1,
          deletedAt:
            nowSql,
          deletedBy:
            ctx.user?.id,
        })
        .where(
          eq(
            hrAttendanceRecords.id,
            input.id
          )
        );

      return {
        success: true,
      };
    }),

  /* =====================================
     DASHBOARD METRICS
  ===================================== */

  getDashboardMetrics:
    scopedProcedure
      .input(
        z.object({
          startDate:
            z.string(),
          endDate:
            z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        const {
          organizationId,
          operatingUnitId,
        } = ctx.scope;

        const db =
          await getDb();

        const conditions = [
          eq(
            hrAttendanceRecords.organizationId,
            organizationId
          ),
          eq(
            hrAttendanceRecords.isDeleted,
            0
          ),
          gte(
            hrAttendanceRecords.date,
            input.startDate
          ),
          lte(
            hrAttendanceRecords.date,
            input.endDate
          ),
        ];

        if (
          operatingUnitId
        ) {
          conditions.push(
            eq(
              hrAttendanceRecords.operatingUnitId,
              operatingUnitId
            )
          );
        }

        const records =
          await db
            .select()
            .from(
              hrAttendanceRecords
            )
            .where(
              and(
                ...conditions
              )
            );

        const overtimeHours =
          records.reduce(
            (
              sum,
              r
            ) =>
              sum +
              parseFloat(
                r.overtimeHours?.toString() ||
                  "0"
              ),
            0
          );

        const pendingApprovalsCount =
          records.filter(
            r =>
              r.approvalStatus ===
              "pending"
          ).length;

        return {
          overtimeHours,
          pendingApprovalsCount,
        };
      }),

  /* =====================================
     PDF EXPORT
  ===================================== */

  exportToPdf: scopedProcedure
  .input(
    z.object({
      startDate: z.string(),
      endDate: z.string(),
      language: z.enum(["en", "ar"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const {
      organizationId,
      operatingUnitId,
    } = ctx.scope;

    const db = await getDb();

    if (!db) {
      throw new Error("Database not available");
    }

    const org = await db
      .select()
      .from(organizations)
      .where(
        eq(organizations.id, organizationId)
      )
      .limit(1);

    if (!org.length) {
      throw new Error(
        "Organization not found"
      );
    }

    const conditions = [
      eq(
        hrAttendanceRecords.organizationId,
        organizationId
      ),
      gte(
        hrAttendanceRecords.date,
        input.startDate
      ),
      lte(
        hrAttendanceRecords.date,
        input.endDate
      ),
      eq(
        hrAttendanceRecords.isDeleted,
        0
      ),
    ];

    /**
     * IMPORTANT:
     * operating unit isolation
     */
    if (operatingUnitId) {
      conditions.push(
        eq(
          hrAttendanceRecords.operatingUnitId,
          operatingUnitId
        )
      );
    }

    const records = await db
      .select()
      .from(hrAttendanceRecords)
      .where(and(...conditions));

    const uniqueEmployees = new Set(
      records.map(r => r.employeeId)
    );

    const totalOvertimeHours =
      records.reduce(
        (sum, r) =>
          sum +
          Number(
            r.overtimeHours || 0
          ),
        0
      );

    const bodyHtml =
      generateAttendanceReportHtml({
        organizationName:
          org[0].name,

        period: `${input.startDate} → ${input.endDate}`,

        totalStaff:
          uniqueEmployees.size,

        totalDays:
          records.length,

        totalOvertimeHours,

        records: records.map((r) => ({
          staffName:
            `Employee #${r.employeeId}`,

          staffId:
            String(r.employeeId),

          date: r.date,

          checkIn:
            r.checkIn,

          checkOut:
            r.checkOut,

          workHours:
            Number(
              r.workHours || 0
            ),

          overtimeHours:
            Number(
              r.overtimeHours || 0
            ),

          status:
            r.status,
        })),

        language:
          input.language,
      });

    const pdfResult =
      await generateOfficialPdf({
        organizationName:
          org[0].name,

        department:
          input.language === "ar"
            ? "إدارة الموارد البشرية"
            : "Human Resources",

        documentTitle:
          input.language === "ar"
            ? "تقرير الحضور"
            : "Attendance Report",

        formNumber:
          `ATT-${Date.now()}`,

        formDate:
          new Date().toLocaleDateString(
            input.language === "ar"
              ? "ar-SA"
              : "en-US"
          ),

        bodyHtml,

        direction:
          input.language === "ar"
            ? "rtl"
            : "ltr",

        language:
          input.language,
      });

    return {
      success: true,
      url: pdfResult.url,
    };
  }),
  })