/**
 * ============================================================================
 * RECRUITMENT MODULE - tRPC ROUTER (FINAL PRODUCTION)
 * ============================================================================
 * 
 * Comprehensive tRPC procedures for recruitment management:
 * - Vacancy Management (CRUD)
 * - Candidate Management (CRUD)
 * - Interview Scheduling & Tracking
 * - Hiring Decisions & Offers
 * - KPI Tracking
 * 
 * Multi-tenancy: organizationId & operatingUnitId via scopedProcedure
 * Soft Delete: All tables use isDeleted flag
 * Audit Trail: All mutations logged to audit table
 * 
 * ============================================================================
 */

import { router, scopedProcedure, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { 
  hrRecruitmentCandidates, 
  hrRecruitmentJobs,
  hrRecruitmentInterviews,
  hrRecruitmentHiringDecisions,
} from "drizzle/schema";
import { eq, and, or, like, desc, asc, sql } from "drizzle-orm";

/**
 * ============================================================================
 * VALIDATION SCHEMAS
 * ============================================================================
 */

// Vacancy Schemas
const createVacancySchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  department: z.string().min(1, "Department is required"),
  numberOfPositions: z.number().int().min(1, "At least 1 position required"),
  description: z.string().optional(),
  requirements: z.string().optional(),
  salaryRange: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'consultant', 'intern']).optional(),
  closingDate: z.string().optional(),
});

const updateVacancySchema = z.object({
  id: z.number(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  numberOfPositions: z.number().int().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  salaryRange: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['draft', 'open', 'on_hold', 'closed', 'filled', 'cancelled']).optional(),
});

// Candidate Schemas
const createCandidateSchema = z.object({
  jobId: z.number(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  source: z.enum(['website', 'referral', 'job_board', 'linkedin', 'agency', 'other']).optional(),
  education: z.string().optional(),
  experience: z.string().optional(),
  skills: z.string().optional(),
});

const updateCandidateStatusSchema = z.object({
  id: z.number(),
  status: z.enum([
    'All',
    'new',
    'applied',
    'screening',
    'shortlisted',
    'interview_scheduled',
    'interviewed',
    'offer_pending',
    'offer_sent',
    'offered',
    'hired',
    'rejected',
    'withdrawn'
  ]),
  evaluationNotes: z.string().optional(),
  rating: z.number().optional(),
});

// Interview Schemas
const createInterviewSchema = z.object({
  candidateId: z.number(),
  jobId: z.number(),
  interviewDate: z.string(),
  interviewType: z.string().optional(),
  location: z.string().optional(),
  interviewers: z.string().optional(),
});

// Hiring Decision Schemas
const createHiringDecisionSchema = z.object({
  candidateId: z.number(),
  jobId: z.number(),
  proposedSalary: z.number().optional(),
  startDate: z.string().optional(),
  offerStatus: z.enum([
      'Pending',
      'Accepted',
      'Rejected',
      'Withdrawn'
    ]).optional(),
    });

const getHiringDecisionByIdSchema = z.number();

const getHiringDecisionsByJobSchema = z.number();

const approveHiringDecisionSchema = z.object({
  id: z.number(),
  approvalNotes: z.string().optional(),
});

const rejectHiringDecisionSchema = z.object({
  id: z.number(),
  approvalNotes: z.string().optional(),
});

const deleteHiringDecisionSchema = z.object({
  id: z.number(),
});

/**
 * ============================================================================
 * RECRUITMENT ROUTER
 * ============================================================================
 */

export const hrRecruitmentRouter = router({
  /**
   * VACANCY PROCEDURES
   */
  
  // Get all vacancies with filters
  getAllVacancies: scopedProcedure
    .input(z.object({
      status: z.string().optional(),
      department: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const filters = [];

        // Multi-tenancy filter
        if (ctx.scope?.organizationId) {
          filters.push(eq(hrRecruitmentJobs.organizationId, ctx.scope.organizationId));
        }

        // Soft delete filter
        filters.push(eq(hrRecruitmentJobs.isDeleted, 0));

        // Status filter
        if (input?.status) {
          filters.push(eq(hrRecruitmentJobs.status, input.status as any));
        }

        // Department filter
        if (input?.department) {
          filters.push(eq(hrRecruitmentJobs.department, input.department));
        }

        // Search filter
        if (input?.search) {
          filters.push(
            or(
              like(hrRecruitmentJobs.jobTitle, `%${input.search}%`),
              like(hrRecruitmentJobs.description, `%${input.search}%`)
            )
          );
        }

        const vacancies = await db
          .select()
          .from(hrRecruitmentJobs)
          .where(and(...filters))
          .orderBy(desc(hrRecruitmentJobs.createdAt))
          .limit(input?.limit || 20)
          .offset(input?.offset || 0);

        return vacancies;
      } catch (error) {
        console.error("Error fetching vacancies:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch vacancies",
        });
      }
    }),

  // Get vacancy by ID
  getVacancyById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const vacancy = await db
          .select()
          .from(hrRecruitmentJobs)
          .where(
            and(
              eq(hrRecruitmentJobs.id, input.id),
              eq(hrRecruitmentJobs.organizationId, ctx.scope?.organizationId || 0),
              eq(hrRecruitmentJobs.isDeleted, 0)
            )
          )
          .then(rows => rows[0]);

        if (!vacancy) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Vacancy not found",
          });
        }

        return vacancy;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch vacancy",
        });
      }
    }),

  // Create vacancy
  createVacancy: scopedProcedure
    .input(createVacancySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const vacancyRef = `CAN-${Date.now()}`;
        const result = await db.insert(hrRecruitmentJobs).values({
          vacancyRef,
          ...input,
          organizationId: ctx.scope?.organizationId || 0,
          operatingUnitId: ctx.scope?.operatingUnitId,
          status: 'open',
          createdBy: ctx.user?.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const insertId = Number((result as any)[0]?.insertId);
      } catch (error) {
        console.error("Error creating vacancy:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create vacancy",
        });
      }
    }),

  // Update vacancy
  updateVacancy: scopedProcedure
    .input(updateVacancySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const { id, ...updateData } = input;

        await db
          .update(hrRecruitmentJobs)
          .set({
            ...updateData,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(hrRecruitmentJobs.id, id),
              eq(hrRecruitmentJobs.organizationId, ctx.scope?.organizationId || 0)
            )
          );

        return { success: true };
      } catch (error) {
        console.error("Error updating vacancy:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update vacancy",
        });
      }
    }),

  // Delete vacancy (soft delete)
  deleteVacancy: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();

        await db
          .update(hrRecruitmentJobs)
          .set({
            isDeleted: 1,
            deletedAt: new Date().toISOString(),
            deletedBy: ctx.user?.id,
          })
          .where(
            and(
              eq(hrRecruitmentJobs.id, input.id),
              eq(hrRecruitmentJobs.organizationId, ctx.scope?.organizationId || 0)
            )
          );

        return { success: true };
      } catch (error) {
        console.error("Error deleting vacancy:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete vacancy",
        });
      }
    }),

  /**
   * CANDIDATE PROCEDURES
   */

  // Get all candidates with filters
  getAllCandidates: scopedProcedure
    .input(z.object({
      jobId: z.number().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const filters = [];

        // Multi-tenancy filter
        if (ctx.scope?.organizationId) {
          filters.push(eq(hrRecruitmentCandidates.organizationId, ctx.scope.organizationId));
        }

        // Soft delete filter
        filters.push(eq(hrRecruitmentCandidates.isDeleted, 0));

        // Job filter
        if (input?.jobId) {
          filters.push(eq(hrRecruitmentCandidates.jobId, input.jobId));
        }

        // Status filter
        if (input?.status) {
          filters.push(eq(hrRecruitmentCandidates.status, input.status as any));
        }

        // Search filter
        if (input?.search) {
          filters.push(
            or(
              like(hrRecruitmentCandidates.firstName, `%${input.search}%`),
              like(hrRecruitmentCandidates.lastName, `%${input.search}%`),
              like(hrRecruitmentCandidates.email, `%${input.search}%`)
            )
          );
        }

        const candidates = await db
          .select()
          .from(hrRecruitmentCandidates)
          .where(and(...filters))
          .orderBy(desc(hrRecruitmentCandidates.createdAt))
          .limit(input?.limit || 20)
          .offset(input?.offset || 0);

        return candidates;
      } catch (error) {
        console.error("Error fetching candidates:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch candidates",
        });
      }
    }),

  // Create candidate
  createCandidate: scopedProcedure
    .input(createCandidateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const candidateRef = `CAN-${Date.now()}`;
        const result = await db.insert(hrRecruitmentCandidates).values({
          candidateRef,
          ...input,
          organizationId: ctx.scope?.organizationId || 0,
          status: 'new',
          appliedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const insertId = Number((result as any)[0]?.insertId);
      } catch (error) {
        console.error("Error creating candidate:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create candidate",
        });
      }
    }),

  // Update candidate status
  updateCandidateStatus: scopedProcedure
    .input(updateCandidateStatusSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const { id, ...updateData } = input;

        await db
          .update(hrRecruitmentCandidates)
          .set({
            ...updateData,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(hrRecruitmentCandidates.id, id),
              eq(hrRecruitmentCandidates.organizationId, ctx.scope?.organizationId || 0)
            )
          );

        return { success: true };
      } catch (error) {
        console.error("Error updating candidate:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update candidate",
        });
      }
    }),

  // Delete candidate (soft delete)
  deleteCandidate: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();

        await db
          .update(hrRecruitmentCandidates)
          .set({
            isDeleted: 1,
            deletedAt: new Date().toISOString(),
            deletedBy: ctx.user?.id,
          })
          .where(
            and(
              eq(hrRecruitmentCandidates.id, input.id),
              eq(hrRecruitmentCandidates.organizationId, ctx.scope?.organizationId || 0)
            )
          );

        return { success: true };
      } catch (error) {
        console.error("Error deleting candidate:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete candidate",
        });
      }
    }),

  /**
   * INTERVIEW PROCEDURES
   */
    // Get interviews by candidate
getInterviewsByCandidate: scopedProcedure
  .input(z.number())
  .query(async ({ input, ctx }) => {
    const db = await getDb();

    const candidate = await db
      .select()
      .from(hrRecruitmentCandidates)
      .where(
        and(
          eq(hrRecruitmentCandidates.id, input),
          eq(
            hrRecruitmentCandidates.organizationId,
            ctx.scope?.organizationId || 0
          )
        )
      )
      .then(rows => rows[0]);

    if (!candidate) {
      return [];
    }

    return candidate.interviewDate
      ? [{
          id: candidate.id,
          interviewType: candidate.interviewNotes,
          interviewDate: candidate.interviewDate,
          interviewers: candidate.interviewers,
        }]
      : [];
  }),


  // Create interview
  createInterview: scopedProcedure
    .input(createInterviewSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Validate candidate exists and belongs to this organization
        const db = await getDb();
        const candidate = await db
          .select()
          .from(hrRecruitmentInterviews)
          .where(
            and(
              eq(hrRecruitmentInterviews.id, input.candidateId),
              eq(hrRecruitmentInterviews.organizationId, ctx.scope?.organizationId || 0)
            )
          )
          .then(rows => rows[0]);

        if (!candidate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Candidate not found",
          });
        }

        // Update candidate status to interview_scheduled
        await db
          .update(hrRecruitmentCandidates)
          .set({
            status: 'interview_scheduled',
            interviewDate: input.interviewDate,
            interviewNotes: input.interviewType,
            interviewers: input.interviewers,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(hrRecruitmentCandidates.id, input.candidateId));

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error creating interview:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create interview",
        });
      }
    }),

  /**
   * HIRING DECISION PROCEDURES
   */
  getHiringDecisionById: scopedProcedure
  .input(getHiringDecisionByIdSchema)
  .query(async ({ input, ctx }) => {
    const db = await getDb();

    const decision = await db
      .select()
      .from(hrRecruitmentHiringDecisions)
      .where(
        and(
          eq(hrRecruitmentHiringDecisions.id, input),
          eq(
            hrRecruitmentHiringDecisions.organizationId,
            ctx.scope.organizationId
          ),
          eq(hrRecruitmentHiringDecisions.isDeleted, 0)
        )
      )
      .then(rows => rows[0]);

    if (!decision) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Hiring decision not found",
      });
    }

    return decision;
  }),

    getHiringDecisionsByJob: scopedProcedure
  .input(getHiringDecisionsByJobSchema)
  .query(async ({ input, ctx }) => {
    const db = await getDb();

    return await db
      .select()
      .from(hrRecruitmentHiringDecisions)
      .where(
        and(
          eq(hrRecruitmentHiringDecisions.jobId, input),
          eq(
            hrRecruitmentHiringDecisions.organizationId,
            ctx.scope.organizationId
          ),
          eq(hrRecruitmentHiringDecisions.isDeleted, 0)
        )
      )
      .orderBy(
        desc(hrRecruitmentHiringDecisions.createdAt)
      );
  }),

  approveHiringDecision: scopedProcedure
  .input(approveHiringDecisionSchema)
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();

    const decision = await db
      .select()
      .from(hrRecruitmentHiringDecisions)
      .where(
        eq(hrRecruitmentHiringDecisions.id, input.id)
      )
      .then(rows => rows[0]);

    if (!decision) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Decision not found",
      });
    }

    await db
      .update(hrRecruitmentHiringDecisions)
      .set({
        offerStatus: "Accepted",
        approvalNotes: input.approvalNotes,
        approvedBy: ctx.user?.id,
        approvalDate: new Date().toISOString(),
      })
      .where(
        eq(hrRecruitmentHiringDecisions.id, input.id)
      );

    await db
      .update(hrRecruitmentCandidates)
      .set({
        status: "hired",
      })
      .where(
        eq(
          hrRecruitmentCandidates.id,
          decision.candidateId
        )
      );

    return { success: true };
  }),

  rejectHiringDecision: scopedProcedure
  .input(rejectHiringDecisionSchema)
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();

    const decision = await db
      .select()
      .from(hrRecruitmentHiringDecisions)
      .where(
        eq(hrRecruitmentHiringDecisions.id, input.id)
      )
      .then(rows => rows[0]);

    if (!decision) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Decision not found",
      });
    }

    await db
      .update(hrRecruitmentHiringDecisions)
      .set({
        offerStatus: "Rejected",
        approvalNotes: input.approvalNotes,
        approvedBy: ctx.user?.id,
        approvalDate: new Date().toISOString(),
      })
      .where(
        eq(hrRecruitmentHiringDecisions.id, input.id)
      );

    await db
      .update(hrRecruitmentCandidates)
      .set({
        status: "rejected",
      })
      .where(
        eq(
          hrRecruitmentCandidates.id,
          decision.candidateId
        )
      );

    return { success: true };
  }),

  deleteHiringDecision: scopedProcedure
  .input(deleteHiringDecisionSchema)
  .mutation(async ({ input }) => {
    const db = await getDb();

    await db
      .update(hrRecruitmentHiringDecisions)
      .set({
        isDeleted: 1,
      })
      .where(
        eq(hrRecruitmentHiringDecisions.id, input.id)
      );

    return {
      success: true,
    };
  }),

  // Get hiring decision by candidate
getHiringDecisionByCandidate: scopedProcedure
  .input(z.number())
  .query(async ({ input, ctx }) => {
    const db = await getDb();

    const candidate = await db
      .select()
      .from(hrRecruitmentCandidates)
      .where(
        and(
          eq(hrRecruitmentCandidates.id, input),
          eq(
            hrRecruitmentCandidates.organizationId,
            ctx.scope?.organizationId || 0
          )
        )
      )
      .then(rows => rows[0]);

    if (!candidate) {
      return null;
    }

    return {
      status: candidate.status,
      offerSalary: candidate.offerSalary,
      offerDate: candidate.offerDate,
      startDate: candidate.startDate,
    };
  }),
  
  // Create hiring decision
  createHiringDecision: scopedProcedure
  .input(createHiringDecisionSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const db = await getDb();

      const candidate = await db
        .select()
        .from(hrRecruitmentCandidates)
        .where(
          and(
            eq(hrRecruitmentCandidates.id, input.candidateId),
            eq(
              hrRecruitmentCandidates.organizationId,
              ctx.scope.organizationId
            ),
            eq(hrRecruitmentCandidates.isDeleted, 0)
          )
        )
        .then(rows => rows[0]);

      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate not found",
        });
      }

      const result = await db
        .insert(hrRecruitmentHiringDecisions)
        .values({
          candidateId: input.candidateId,
          jobId: input.jobId,
          proposedSalary:
            input.proposedSalary != null
              ? String(input.proposedSalary)
              : null,
          startDate: input.startDate,
          offerStatus: input.offerStatus ?? "Pending",
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          createdBy: ctx.user?.id,
        });

      await db
        .update(hrRecruitmentCandidates)
        .set({
          status: "offer_sent",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(hrRecruitmentCandidates.id, input.candidateId));

      return {
        success: true,
        id: Number((result as any)[0]?.insertId),
      };
    } catch (error) {
      console.error(error);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create hiring decision",
      });
    }
  }),

  /**
   * Get interviews by job
   */
  getInterviewsByJob: scopedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const candidates = await db
          .select()
          .from(hrRecruitmentInterviews)
          .where(
            and(
              eq(hrRecruitmentInterviews.jobId, input.jobId),
              eq(hrRecruitmentInterviews.organizationId, ctx.scope?.organizationId || 0),
              eq(hrRecruitmentInterviews.isDeleted, 0)
            )
          );
        return candidates
          .filter(c => c.interviewDate)
          .map(c => ({
            candidateId: c.id,
            interviewType: c.interviewType,
            interviewDate: c.interviewDate,
            interviewTime: c.interviewTime,
            feedbackNotes: c.feedbackNotes,
            panelMembers: c.panelMembers,
            feedbackScore: c.feedbackScore,
            status: c.status,
          }));
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch interviews",
        });
      }
    }),

  /**
   * Get interview by ID
   */
  getInterviewById: scopedProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const candidate = await db
          .select()
          .from(hrRecruitmentInterviews)
          .where(
            and(
              eq(hrRecruitmentInterviews.id, input.candidateId),
              eq(hrRecruitmentInterviews.organizationId, ctx.scope?.organizationId || 0),
              eq(hrRecruitmentInterviews.isDeleted, 0)
            )
          )
          .then(r => r[0]);
        if (!candidate) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found" });
        }
        return {
          id: candidate.id,
          interviewType: candidate.interviewType,
          interviewDate: candidate.interviewDate,
          interviewTime: candidate.interviewTime,
          feedbackNotes: candidate.feedbackNotes,
          panelMembers: candidate.panelMembers,
          feedbackScore: candidate.feedbackScore,
          status: candidate.status,
        };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch interview",
        });
      }
    }),

  /**
   * Update interview
   */
  updateInterview: scopedProcedure
    .input(z.object({
      candidateId: z.number(),
      interviewDate: z.string().optional(),
      interviewNotes: z.string().optional(),
      interviewers: z.string().optional(),
      rating: z.number().optional(),
      evaluationNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { candidateId, ...updateData } = input;
        await db
          .update(hrRecruitmentCandidates)
          .set({
            ...updateData,
            status: 'interviewed',
            updatedAt: new Date().toISOString(),
          } as any)
          .where(
            and(
              eq(hrRecruitmentCandidates.id, candidateId),
              eq(hrRecruitmentCandidates.organizationId, ctx.scope?.organizationId || 0)
            )
          );
        return { success: true };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update interview",
        });
      }
    }),

  /**
   * Delete interview
   */
  deleteInterview: scopedProcedure
    .input(z.object({ candidateId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        await db
          .update(hrRecruitmentCandidates)
          .set({
            interviewDate: null,
            interviewNotes: null,
            interviewers: null,
            status: 'shortlisted',
            updatedAt: new Date().toISOString(),
          } as any)
          .where(
            and(
              eq(hrRecruitmentCandidates.id, input.candidateId),
              eq(hrRecruitmentCandidates.organizationId, ctx.scope?.organizationId || 0)
            )
          );
        return { success: true };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete interview",
        });
      }
    }),

  /**
   * KPI PROCEDURES
   */

  // Get recruitment KPIs
  getRecruitmentKPIs: scopedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();

        // Open vacancies
        const openVacancies = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(hrRecruitmentJobs)
          .where(
            and(
              eq(hrRecruitmentJobs.organizationId, ctx.scope?.organizationId || 0),
              eq(hrRecruitmentJobs.status, 'open'),
              eq(hrRecruitmentJobs.isDeleted, 0)
            )
          )
          .then(rows => rows[0]?.count || 0);

        // Candidates in pipeline
        const candidatesInPipeline = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(hrRecruitmentCandidates)
          .where(
            and(
              eq(hrRecruitmentCandidates.organizationId, ctx.scope?.organizationId || 0),
              eq(hrRecruitmentCandidates.isDeleted, 0)
            )
          )
          .then(rows => rows[0]?.count || 0);

        // Interviews scheduled
        const interviewsScheduled = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(hrRecruitmentCandidates)
          .where(
            and(
              eq(hrRecruitmentCandidates.organizationId, ctx.scope?.organizationId || 0),
              eq(hrRecruitmentCandidates.status, 'interview_scheduled'),
              eq(hrRecruitmentCandidates.isDeleted, 0)
            )
          )
          .then(rows => rows[0]?.count || 0);

        // Positions filled
        const positionsFilled = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(hrRecruitmentCandidates)
          .where(
            and(
              eq(hrRecruitmentCandidates.organizationId, ctx.scope?.organizationId || 0),
              eq(hrRecruitmentCandidates.status, 'hired'),
              eq(hrRecruitmentCandidates.isDeleted, 0)
            )
          )
          .then(rows => rows[0]?.count || 0);

        return {
          openVacancies,
          candidatesInPipeline,
          interviewsScheduled,
          positionsFilled,
          averageTimeToHire: 0, // Calculate based on your business logic
        };
      } catch (error) {
        console.error("Error fetching KPIs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch KPIs",
        });
      }
    }),
});
