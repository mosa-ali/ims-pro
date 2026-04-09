import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { requestAccessRequests } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const requestAccessRouter = router({
  /**
   * Submit a new access request
   * Public procedure - no authentication required
   */
  submitRequest: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        fullName: z.string().min(2, "Full name must be at least 2 characters"),
        organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
        reasonForAccess: z.string().optional(),
        jobTitle: z.string().optional(),
        phoneNumber: z.string().optional(),
        requestType: z.enum(["organization_user", "platform_admin"]).default("organization_user"),
        requestedAuthProvider: z.enum(["microsoft", "local"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db_instance = await getDb();
        if (!db_instance) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Check if request already exists for this email with status "new" or "under_review"
        const existingRequest = await db_instance
          .select()
          .from(requestAccessRequests)
          .where(
            and(
              eq(requestAccessRequests.email, input.email),
              // Only check for active requests
            )
          )
          .limit(1);

        if (existingRequest.length > 0) {
          const existing = existingRequest[0];
          if (existing.status === "new" || existing.status === "under_review") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "You already have a pending access request. Please wait for review.",
            });
          }
        }

        // Create new access request
        const requestId = nanoid();
        const result = await db_instance.insert(requestAccessRequests).values({
          id: requestId,
          email: input.email,
          fullName: input.fullName,
          organizationName: input.organizationName,
          jobTitle: input.jobTitle || null,
          reasonForAccess: input.reasonForAccess || null,
          phoneNumber: input.phoneNumber || null,
          requestType: input.requestType,
          requestedAuthProvider: input.requestedAuthProvider || null,
          status: "new",
          createdAt: new Date(),
          createdBy: input.email,
          updatedAt: new Date(),
        });

        return {
          success: true,
          message: "Your access request has been submitted successfully",
          requestId: requestId,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("[requestAccessRouter.submitRequest] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit access request. Please try again later.",
        });
      }
    }),

  /**
   * Get access request status
   * Public procedure - allows users to check their request status
   */
  getRequestStatus: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
      })
    )
    .query(async ({ input }) => {
      try {
        const db_instance = await getDb();
        if (!db_instance) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const request = await db_instance
          .select()
          .from(requestAccessRequests)
          .where(eq(requestAccessRequests.email, input.email))
          .orderBy(requestAccessRequests.createdAt)
          .limit(1);

        if (request.length === 0) {
          return {
            found: false,
            status: null,
            message: "No access request found for this email",
          };
        }

        const accessRequest = request[0];
        return {
          found: true,
          status: accessRequest.status,
          createdAt: accessRequest.createdAt,
          reviewedAt: accessRequest.reviewedAt,
          reviewNotes: accessRequest.reviewNotes,
          message:
            accessRequest.status === "new"
              ? "Your request is pending review"
              : accessRequest.status === "under_review"
                ? "Your request is under review"
                : accessRequest.status === "approved"
                  ? "Your request has been approved. Please sign in."
                  : accessRequest.status === "provisioned"
                    ? "Your account has been provisioned. Please sign in."
                    : "Your request was rejected. Please contact your administrator.",
        };
      } catch (error) {
        console.error("[requestAccessRouter.getRequestStatus] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve request status",
        });
      }
    }),

  /**
   * Get all pending access requests (Admin only)
   * Protected procedure - requires authentication
   */
  getPendingRequests: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Check if user is admin
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can view pending requests",
        });
      }

      const db_instance = await getDb();
      if (!db_instance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const requests = await db_instance
        .select()
        .from(requestAccessRequests)
        .where(
          and(
            eq(requestAccessRequests.status, "new"),
            eq(requestAccessRequests.status, "under_review")
          )
        )
        .orderBy(requestAccessRequests.createdAt);

      return requests;
    } catch (error) {
      console.error("[requestAccessRouter.getPendingRequests] Error:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve pending requests",
      });
    }
  }),

  /**
   * Approve an access request (Admin only)
   * Protected procedure - requires authentication
   */
  approveRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.string().min(1),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user is admin
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only administrators can approve requests",
          });
        }

        const db_instance = await getDb();
        if (!db_instance) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const result = await db_instance
          .update(requestAccessRequests)
          .set({
            status: "approved",
            reviewDecision: "approved",
            reviewedBy: ctx.user.email,
            reviewedAt: new Date(),
            reviewNotes: input.reviewNotes || null,
            updatedAt: new Date(),
          })
          .where(eq(requestAccessRequests.id, input.requestId));

        return {
          success: true,
          message: "Access request approved",
        };
      } catch (error) {
        console.error("[requestAccessRouter.approveRequest] Error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to approve request",
        });
      }
    }),

  /**
   * Reject an access request (Admin only)
   * Protected procedure - requires authentication
   */
  rejectRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.string().min(1),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user is admin
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only administrators can reject requests",
          });
        }

        const db_instance = await getDb();
        if (!db_instance) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const result = await db_instance
          .update(requestAccessRequests)
          .set({
            status: "rejected",
            reviewDecision: "rejected",
            reviewedBy: ctx.user.email,
            reviewedAt: new Date(),
            reviewNotes: input.reviewNotes || null,
            updatedAt: new Date(),
          })
          .where(eq(requestAccessRequests.id, input.requestId));

        return {
          success: true,
          message: "Access request rejected",
        };
      } catch (error) {
        console.error("[requestAccessRouter.rejectRequest] Error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reject request",
        });
      }
    }),
});
