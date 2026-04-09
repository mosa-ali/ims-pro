import { z } from "zod";
import { router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { donorCommunications, donors } from "../drizzle/schema";
import { eq, and, isNull, desc, asc, sql, like, or, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Input validation schemas
const createCommunicationSchema = z.object({
  donorId: z.number(),
  date: z.date().or(z.string().transform(s => new Date(s))),
  channel: z.enum(["email", "meeting", "call", "visit", "letter", "video_call", "other"]),
  subject: z.string().min(1).max(500),
  subjectAr: z.string().max(500).optional().nullable(),
  summary: z.string().min(1),
  summaryAr: z.string().optional().nullable(),
  participants: z.string().optional().nullable(),
  contactPerson: z.string().max(255).optional().nullable(),
  nextActionDate: z.date().or(z.string().transform(s => new Date(s))).optional().nullable(),
  nextActionDescription: z.string().optional().nullable(),
  attachments: z.string().optional().nullable(),
  status: z.enum(["completed", "pending", "cancelled"]).optional(),
});

const updateCommunicationSchema = createCommunicationSchema.partial().extend({
  id: z.number(),
});

const listCommunicationsSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  donorId: z.number().optional(),
  channel: z.enum(["email", "meeting", "call", "visit", "letter", "video_call", "other"]).optional(),
  status: z.enum(["completed", "pending", "cancelled"]).optional(),
  search: z.string().optional(),
  dateFrom: z.date().or(z.string().transform(s => new Date(s))).optional(),
  dateTo: z.date().or(z.string().transform(s => new Date(s))).optional(),
  sortBy: z.enum(["date", "subject", "channel", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  includeDeleted: z.boolean().optional(),
});

export const donorCommunicationsRouter = router({
  // List communications with pagination, search, and filtering
  list: scopedProcedure
    .input(listCommunicationsSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { page, pageSize, donorId, channel, status, search, dateFrom, dateTo, sortBy, sortOrder, includeDeleted } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const conditions = [
        eq(donorCommunications.organizationId, ctx.scope.organizationId),
      ];

      if (ctx.scope.operatingUnitId) {
        conditions.push(eq(donorCommunications.operatingUnitId, ctx.scope.operatingUnitId));
      }

      if (!includeDeleted) {
        conditions.push(isNull(donorCommunications.deletedAt));
      }

      if (donorId) {
        conditions.push(eq(donorCommunications.donorId, donorId));
      }

      if (channel) {
        conditions.push(eq(donorCommunications.channel, channel));
      }

      if (status) {
        conditions.push(eq(donorCommunications.status, status));
      }

      if (search) {
        conditions.push(
          or(
            like(donorCommunications.subject, `%${search}%`),
            like(donorCommunications.subjectAr, `%${search}%`),
            like(donorCommunications.summary, `%${search}%`),
            like(donorCommunications.contactPerson, `%${search}%`)
          )!
        );
      }

      if (dateFrom) {
        conditions.push(gte(donorCommunications.date, dateFrom));
      }

      if (dateTo) {
        conditions.push(lte(donorCommunications.date, dateTo));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(donorCommunications)
        .where(and(...conditions));
      const total = countResult[0]?.count || 0;

      // Build order by
      let orderByClause;
      const order = sortOrder === "asc" ? asc : desc;
      switch (sortBy) {
        case "date":
          orderByClause = order(donorCommunications.date);
          break;
        case "subject":
          orderByClause = order(donorCommunications.subject);
          break;
        case "channel":
          orderByClause = order(donorCommunications.channel);
          break;
        case "createdAt":
        default:
          orderByClause = desc(donorCommunications.date);
      }

      // Fetch communications with donor info
      const communicationsList = await db
        .select({
          id: donorCommunications.id,
          organizationId: donorCommunications.organizationId,
          operatingUnitId: donorCommunications.operatingUnitId,
          donorId: donorCommunications.donorId,
          date: donorCommunications.date,
          channel: donorCommunications.channel,
          subject: donorCommunications.subject,
          subjectAr: donorCommunications.subjectAr,
          summary: donorCommunications.summary,
          summaryAr: donorCommunications.summaryAr,
          participants: donorCommunications.participants,
          contactPerson: donorCommunications.contactPerson,
          nextActionDate: donorCommunications.nextActionDate,
          nextActionDescription: donorCommunications.nextActionDescription,
          attachments: donorCommunications.attachments,
          status: donorCommunications.status,
          createdAt: donorCommunications.createdAt,
          updatedAt: donorCommunications.updatedAt,
          createdBy: donorCommunications.createdBy,
          deletedAt: donorCommunications.deletedAt,
          donorName: donors.name,
          donorNameAr: donors.nameAr,
          donorCode: donors.code,
        })
        .from(donorCommunications)
        .leftJoin(donors, eq(donorCommunications.donorId, donors.id))
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(pageSize)
        .offset(offset);

      return {
        communications: communicationsList,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get single communication by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const communication = await db
        .select({
          id: donorCommunications.id,
          organizationId: donorCommunications.organizationId,
          operatingUnitId: donorCommunications.operatingUnitId,
          donorId: donorCommunications.donorId,
          date: donorCommunications.date,
          channel: donorCommunications.channel,
          subject: donorCommunications.subject,
          subjectAr: donorCommunications.subjectAr,
          summary: donorCommunications.summary,
          summaryAr: donorCommunications.summaryAr,
          participants: donorCommunications.participants,
          contactPerson: donorCommunications.contactPerson,
          nextActionDate: donorCommunications.nextActionDate,
          nextActionDescription: donorCommunications.nextActionDescription,
          attachments: donorCommunications.attachments,
          status: donorCommunications.status,
          createdAt: donorCommunications.createdAt,
          updatedAt: donorCommunications.updatedAt,
          createdBy: donorCommunications.createdBy,
          deletedAt: donorCommunications.deletedAt,
          donorName: donors.name,
          donorNameAr: donors.nameAr,
          donorCode: donors.code,
        })
        .from(donorCommunications)
        .leftJoin(donors, eq(donorCommunications.donorId, donors.id))
        .where(
          and(
            eq(donorCommunications.id, input.id),
            eq(donorCommunications.organizationId, ctx.scope.organizationId),
            isNull(donorCommunications.deletedAt)
          )
        )
        .limit(1);

      if (!communication[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Communication not found" });
      }

      return communication[0];
    }),

  // Create new communication
  create: scopedProcedure
    .input(createCommunicationSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify donor exists and belongs to organization
      const donor = await db
        .select({ id: donors.id })
        .from(donors)
        .where(
          and(
            eq(donors.id, input.donorId),
            eq(donors.organizationId, ctx.scope.organizationId),
            isNull(donors.deletedAt)
          )
        )
        .limit(1);

      if (!donor[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Donor not found" });
      }

      const result = await db.insert(donorCommunications).values({
        ...input,
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        createdBy: ctx.user.id,
      });

      const insertId = result[0].insertId;

      return { id: insertId, message: "Communication created successfully" };
    }),

  // Update communication
  update: scopedProcedure
    .input(updateCommunicationSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { id, ...updateData } = input;

      // Verify communication exists and belongs to organization
      const existing = await db
        .select({ id: donorCommunications.id })
        .from(donorCommunications)
        .where(
          and(
            eq(donorCommunications.id, id),
            eq(donorCommunications.organizationId, ctx.scope.organizationId),
            isNull(donorCommunications.deletedAt)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Communication not found" });
      }

      // If donorId is being updated, verify the new donor
      if (updateData.donorId) {
        const donor = await db
          .select({ id: donors.id })
          .from(donors)
          .where(
            and(
              eq(donors.id, updateData.donorId),
              eq(donors.organizationId, ctx.scope.organizationId),
              isNull(donors.deletedAt)
            )
          )
          .limit(1);

        if (!donor[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Donor not found" });
        }
      }

      await db
        .update(donorCommunications)
        .set({
          ...updateData,
          updatedBy: ctx.user.id,
        })
        .where(eq(donorCommunications.id, id));

      return { message: "Communication updated successfully" };
    }),

  // Soft delete communication
  softDelete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const existing = await db
        .select({ id: donorCommunications.id })
        .from(donorCommunications)
        .where(
          and(
            eq(donorCommunications.id, input.id),
            eq(donorCommunications.organizationId, ctx.scope.organizationId),
            isNull(donorCommunications.deletedAt)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Communication not found" });
      }

      await db
        .update(donorCommunications)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(donorCommunications.id, input.id));

      return { message: "Communication deleted successfully" };
    }),

  // Restore soft-deleted communication
  restore: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const existing = await db
        .select({ id: donorCommunications.id, deletedAt: donorCommunications.deletedAt })
        .from(donorCommunications)
        .where(
          and(
            eq(donorCommunications.id, input.id),
            eq(donorCommunications.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Communication not found" });
      }

      if (!existing[0].deletedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Communication is not deleted" });
      }

      await db
        .update(donorCommunications)
        .set({
          deletedAt: null,
          deletedBy: null,
          updatedBy: ctx.user.id,
        })
        .where(eq(donorCommunications.id, input.id));

      return { message: "Communication restored successfully" };
    }),

  // Get KPIs
  getKPIs: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const conditions = [
      eq(donorCommunications.organizationId, ctx.scope.organizationId),
      isNull(donorCommunications.deletedAt),
    ];

    if (ctx.scope.operatingUnitId) {
      conditions.push(eq(donorCommunications.operatingUnitId, ctx.scope.operatingUnitId));
    }

    // Total communications
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(donorCommunications)
      .where(and(...conditions));

    // Pending communications
    const pendingResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(donorCommunications)
      .where(and(...conditions, eq(donorCommunications.status, "pending")));

    // By channel
    const byChannelResult = await db
      .select({
        channel: donorCommunications.channel,
        count: sql<number>`count(*)`,
      })
      .from(donorCommunications)
      .where(and(...conditions))
      .groupBy(donorCommunications.channel);

    return {
      totalCommunications: totalResult[0]?.count || 0,
      pendingCommunications: pendingResult[0]?.count || 0,
      byChannel: byChannelResult,
    };
  }),

  // Export data
  exportData: scopedProcedure
    .input(z.object({
      donorId: z.number().optional(),
      channel: z.enum(["email", "meeting", "call", "visit", "letter", "video_call", "other"]).optional(),
      status: z.enum(["completed", "pending", "cancelled"]).optional(),
      dateFrom: z.date().or(z.string().transform(s => new Date(s))).optional(),
      dateTo: z.date().or(z.string().transform(s => new Date(s))).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { donorId, channel, status, dateFrom, dateTo } = input;

      const conditions = [
        eq(donorCommunications.organizationId, ctx.scope.organizationId),
        isNull(donorCommunications.deletedAt),
      ];

      if (ctx.scope.operatingUnitId) {
        conditions.push(eq(donorCommunications.operatingUnitId, ctx.scope.operatingUnitId));
      }

      if (donorId) conditions.push(eq(donorCommunications.donorId, donorId));
      if (channel) conditions.push(eq(donorCommunications.channel, channel));
      if (status) conditions.push(eq(donorCommunications.status, status));
      if (dateFrom) conditions.push(gte(donorCommunications.date, dateFrom));
      if (dateTo) conditions.push(lte(donorCommunications.date, dateTo));

      const communicationsList = await db
        .select({
          id: donorCommunications.id,
          date: donorCommunications.date,
          channel: donorCommunications.channel,
          subject: donorCommunications.subject,
          summary: donorCommunications.summary,
          contactPerson: donorCommunications.contactPerson,
          status: donorCommunications.status,
          nextActionDate: donorCommunications.nextActionDate,
          nextActionDescription: donorCommunications.nextActionDescription,
          donorName: donors.name,
          donorCode: donors.code,
        })
        .from(donorCommunications)
        .leftJoin(donors, eq(donorCommunications.donorId, donors.id))
        .where(and(...conditions))
        .orderBy(desc(donorCommunications.date));

      return {
        communications: communicationsList,
        exportedAt: new Date().toISOString(),
      };
    }),
});

export type DonorCommunicationsRouter = typeof donorCommunicationsRouter;
