import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { hrRecruitmentJobs, hrRecruitmentCandidates } from "../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

/**
 * HR Recruitment Router - Job Postings and Candidate Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 */
export const hrRecruitmentRouter = router({
  // ========== Jobs ==========
  
  // Get all job postings
  getAllJobs: scopedProcedure
    .input(z.object({
      status: z.enum(["draft", "open", "on_hold", "closed", "filled", "cancelled"]).optional(),
      department: z.string().optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrRecruitmentJobs.organizationId, organizationId),
        eq(hrRecruitmentJobs.isDeleted, false),
      ];
      
      if (input.status) {
        conditions.push(eq(hrRecruitmentJobs.status, input.status));
      }
      if (input.department) {
        conditions.push(eq(hrRecruitmentJobs.department, input.department));
      }
      
      return await db
        .select()
        .from(hrRecruitmentJobs)
        .where(and(...conditions))
        .orderBy(desc(hrRecruitmentJobs.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Get single job by ID
  getJobById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(hrRecruitmentJobs)
        .where(
          and(
            eq(hrRecruitmentJobs.id, input.id),
            eq(hrRecruitmentJobs.organizationId, organizationId),
            eq(hrRecruitmentJobs.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get job statistics
  getJobStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const allJobs = await db
        .select()
        .from(hrRecruitmentJobs)
        .where(
          and(
            eq(hrRecruitmentJobs.organizationId, organizationId),
            eq(hrRecruitmentJobs.isDeleted, false)
          )
        );
      
      const draft = allJobs.filter(j => j.status === 'draft').length;
      const open = allJobs.filter(j => j.status === 'open').length;
      const onHold = allJobs.filter(j => j.status === 'on_hold').length;
      const closed = allJobs.filter(j => j.status === 'closed').length;
      const filled = allJobs.filter(j => j.status === 'filled').length;
      const cancelled = allJobs.filter(j => j.status === 'cancelled').length;
      
      const departments = [...new Set(allJobs.map(j => j.department).filter(Boolean))];
      const totalPositions = allJobs.reduce((sum, j) => sum + (j.numberOfPositions || 1), 0);
      
      return {
        total: allJobs.length,
        byStatus: { draft, open, onHold, closed, filled, cancelled },
        departments,
        totalPositions,
        activeJobs: open + onHold,
      };
    }),

  // Create job posting
  createJob: scopedProcedure
    .input(z.object({
      jobCode: z.string().optional(),
      jobTitle: z.string(),
      jobTitleAr: z.string().optional(),
      department: z.string().optional(),
      location: z.string().optional(),
      employmentType: z.enum(["full_time", "part_time", "contract", "consultant", "intern"]).optional(),
      numberOfPositions: z.number().optional().default(1),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
      currency: z.string().optional().default("USD"),
      description: z.string().optional(),
      requirements: z.string().optional(),
      responsibilities: z.string().optional(),
      benefits: z.string().optional(),
      applicationDeadline: z.string().optional(),
      status: z.enum(["draft", "open", "on_hold", "closed", "filled", "cancelled"]).optional().default("draft"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(hrRecruitmentJobs).values({
        organizationId,
        jobCode: input.jobCode,
        jobTitle: input.jobTitle,
        jobTitleAr: input.jobTitleAr,
        department: input.department,
        location: input.location,
        employmentType: input.employmentType,
        numberOfPositions: input.numberOfPositions,
        salaryMin: input.salaryMin?.toString(),
        salaryMax: input.salaryMax?.toString(),
        currency: input.currency,
        description: input.description,
        requirements: input.requirements,
        responsibilities: input.responsibilities,
        benefits: input.benefits,
        applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
        status: input.status,
        postedBy: ctx.user?.id,
      });
      
      return { id: result[0].insertId, success: true };
    }),

  // Update job posting
  updateJob: scopedProcedure
    .input(z.object({
      id: z.number(),
      jobCode: z.string().optional(),
      jobTitle: z.string().optional(),
      jobTitleAr: z.string().optional(),
      department: z.string().optional(),
      location: z.string().optional(),
      employmentType: z.enum(["full_time", "part_time", "contract", "consultant", "intern"]).optional(),
      numberOfPositions: z.number().optional(),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
      currency: z.string().optional(),
      description: z.string().optional(),
      requirements: z.string().optional(),
      responsibilities: z.string().optional(),
      benefits: z.string().optional(),
      applicationDeadline: z.string().optional(),
      status: z.enum(["draft", "open", "on_hold", "closed", "filled", "cancelled"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.salaryMin !== undefined) processedData.salaryMin = updateData.salaryMin?.toString();
      if (updateData.salaryMax !== undefined) processedData.salaryMax = updateData.salaryMax?.toString();
      if (updateData.applicationDeadline) processedData.applicationDeadline = new Date(updateData.applicationDeadline);
      
      await db
        .update(hrRecruitmentJobs)
        .set(processedData)
        .where(and(
          eq(hrRecruitmentJobs.id, id),
          eq(hrRecruitmentJobs.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Publish job
  publishJob: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrRecruitmentJobs)
        .set({
          status: "open",
          postedAt: new Date(),
        })
        .where(and(
          eq(hrRecruitmentJobs.id, input.id),
          eq(hrRecruitmentJobs.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Close job
  closeJob: scopedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.enum(["filled", "cancelled", "closed"]).optional().default("closed"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrRecruitmentJobs)
        .set({
          status: input.reason,
          closedAt: new Date(),
        })
        .where(and(
          eq(hrRecruitmentJobs.id, input.id),
          eq(hrRecruitmentJobs.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Delete job
  deleteJob: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrRecruitmentJobs)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(hrRecruitmentJobs.id, input.id),
          eq(hrRecruitmentJobs.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // ========== Candidates ==========
  
  // Get all candidates
  getAllCandidates: scopedProcedure
    .input(z.object({
      jobId: z.number().optional(),
      status: z.enum(["applied", "screening", "shortlisted", "interview_scheduled", "interviewed", "offered", "hired", "rejected", "withdrawn"]).optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrRecruitmentCandidates.organizationId, organizationId),
        eq(hrRecruitmentCandidates.isDeleted, false),
      ];
      
      if (input.jobId) {
        conditions.push(eq(hrRecruitmentCandidates.jobId, input.jobId));
      }
      if (input.status) {
        conditions.push(eq(hrRecruitmentCandidates.status, input.status));
      }
      
      return await db
        .select()
        .from(hrRecruitmentCandidates)
        .where(and(...conditions))
        .orderBy(desc(hrRecruitmentCandidates.appliedAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Get single candidate by ID
  getCandidateById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(hrRecruitmentCandidates)
        .where(
          and(
            eq(hrRecruitmentCandidates.id, input.id),
            eq(hrRecruitmentCandidates.organizationId, organizationId),
            eq(hrRecruitmentCandidates.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get candidate statistics
  getCandidateStatistics: scopedProcedure
    .input(z.object({
      jobId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrRecruitmentCandidates.organizationId, organizationId),
        eq(hrRecruitmentCandidates.isDeleted, false),
      ];
      
      if (input.jobId) {
        conditions.push(eq(hrRecruitmentCandidates.jobId, input.jobId));
      }
      
      const allCandidates = await db
        .select()
        .from(hrRecruitmentCandidates)
        .where(and(...conditions));
      
      const applied = allCandidates.filter(c => c.status === 'applied').length;
      const screening = allCandidates.filter(c => c.status === 'screening').length;
      const shortlisted = allCandidates.filter(c => c.status === 'shortlisted').length;
      const interviewScheduled = allCandidates.filter(c => c.status === 'interview_scheduled').length;
      const interviewed = allCandidates.filter(c => c.status === 'interviewed').length;
      const offered = allCandidates.filter(c => c.status === 'offered').length;
      const hired = allCandidates.filter(c => c.status === 'hired').length;
      const rejected = allCandidates.filter(c => c.status === 'rejected').length;
      const withdrawn = allCandidates.filter(c => c.status === 'withdrawn').length;
      
      return {
        total: allCandidates.length,
        byStatus: { applied, screening, shortlisted, interviewScheduled, interviewed, offered, hired, rejected, withdrawn },
        activeInPipeline: applied + screening + shortlisted + interviewScheduled + interviewed + offered,
        conversionRate: allCandidates.length > 0 ? ((hired / allCandidates.length) * 100).toFixed(1) : "0",
      };
    }),

  // Create candidate
  createCandidate: scopedProcedure
    .input(z.object({
      jobId: z.number(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      resumeUrl: z.string().optional(),
      coverLetterUrl: z.string().optional(),
      linkedinUrl: z.string().optional(),
      portfolioUrl: z.string().optional(),
      currentCompany: z.string().optional(),
      currentPosition: z.string().optional(),
      yearsOfExperience: z.number().optional(),
      expectedSalary: z.number().optional(),
      currency: z.string().optional().default("USD"),
      noticePeriod: z.string().optional(),
      source: z.string().optional(),
      referredBy: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(hrRecruitmentCandidates).values({
        organizationId,
        jobId: input.jobId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        resumeUrl: input.resumeUrl,
        coverLetterUrl: input.coverLetterUrl,
        linkedinUrl: input.linkedinUrl,
        portfolioUrl: input.portfolioUrl,
        currentCompany: input.currentCompany,
        currentPosition: input.currentPosition,
        yearsOfExperience: input.yearsOfExperience,
        expectedSalary: input.expectedSalary?.toString(),
        currency: input.currency,
        noticePeriod: input.noticePeriod,
        source: input.source,
        referredBy: input.referredBy,
        notes: input.notes,
        status: "applied",
        appliedAt: new Date(),
      });
      
      return { id: result[0].insertId, success: true };
    }),

  // Update candidate
  updateCandidate: scopedProcedure
    .input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      resumeUrl: z.string().optional(),
      coverLetterUrl: z.string().optional(),
      linkedinUrl: z.string().optional(),
      portfolioUrl: z.string().optional(),
      currentCompany: z.string().optional(),
      currentPosition: z.string().optional(),
      yearsOfExperience: z.number().optional(),
      expectedSalary: z.number().optional(),
      currency: z.string().optional(),
      noticePeriod: z.string().optional(),
      source: z.string().optional(),
      referredBy: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.expectedSalary !== undefined) {
        processedData.expectedSalary = updateData.expectedSalary?.toString();
      }
      
      await db
        .update(hrRecruitmentCandidates)
        .set(processedData)
        .where(and(
          eq(hrRecruitmentCandidates.id, id),
          eq(hrRecruitmentCandidates.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Update candidate status
  updateCandidateStatus: scopedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["applied", "screening", "shortlisted", "interview_scheduled", "interviewed", "offered", "hired", "rejected", "withdrawn"]),
      notes: z.string().optional(),
      interviewDate: z.string().optional(),
      interviewNotes: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const updateData: Record<string, unknown> = {
        status: input.status,
        notes: input.notes,
      };
      
      if (input.interviewDate) {
        updateData.interviewDate = new Date(input.interviewDate);
      }
      if (input.interviewNotes) {
        updateData.interviewNotes = input.interviewNotes;
      }
      if (input.rating !== undefined) {
        updateData.rating = input.rating;
      }
      
      if (input.status === 'shortlisted') {
        updateData.shortlistedAt = new Date();
      } else if (input.status === 'hired') {
        updateData.hiredAt = new Date();
      } else if (input.status === 'rejected') {
        updateData.rejectedAt = new Date();
      }
      
      await db
        .update(hrRecruitmentCandidates)
        .set(updateData)
        .where(and(
          eq(hrRecruitmentCandidates.id, input.id),
          eq(hrRecruitmentCandidates.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Delete candidate
  deleteCandidate: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrRecruitmentCandidates)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(hrRecruitmentCandidates.id, input.id),
          eq(hrRecruitmentCandidates.organizationId, organizationId)
        ));
      
      return { success: true };
    }),
});
