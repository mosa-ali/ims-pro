/**
 * Report Sharing & Collaboration Router
 * Handles report sharing, permissions, and comments
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const PermissionLevel = z.enum(["view", "comment", "edit", "admin"]);

export const ShareReportSchema = z.object({
  reportId: z.string(),
  sharedWith: z.array(
    z.object({
      userId: z.string(),
      email: z.string().email(),
      permissionLevel: PermissionLevel,
    })
  ),
  expiresAt: z.date().optional(),
  message: z.string().optional(),
});

export const AddCommentSchema = z.object({
  reportId: z.string(),
  content: z.string(),
  parentCommentId: z.string().optional(),
});

export const UpdateCommentSchema = z.object({
  commentId: z.string(),
  content: z.string(),
});

// ============================================================================
// REPORT SHARING ROUTER
// ============================================================================

export const reportSharingRouter = router({
  /**
   * Share a report with users
   */
  share: protectedProcedure
    .input(ShareReportSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return {
          success: true,
          reportId: input.reportId,
          sharedWith: input.sharedWith.length,
          sharedAt: new Date(),
          message: `Report shared with ${input.sharedWith.length} user(s)`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to share report",
        });
      }
    }),

  /**
   * Get sharing information for a report
   */
  getSharingInfo: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        return {
          reportId: input.reportId,
          owner: {
            userId: ctx.user.id,
            name: ctx.user.name,
            email: ctx.user.email,
          },
          sharedWith: [
            {
              userId: "user-002",
              name: "Ahmed Ali",
              email: "ahmed@example.com",
              permissionLevel: "view",
              sharedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              expiresAt: null,
            },
            {
              userId: "user-003",
              name: "Fatima Hassan",
              email: "fatima@example.com",
              permissionLevel: "comment",
              sharedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          ],
          isPublic: false,
          totalShares: 2,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch sharing information",
        });
      }
    }),

  /**
   * Update sharing permissions
   */
  updatePermission: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        userId: z.string(),
        permissionLevel: PermissionLevel,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return {
          success: true,
          reportId: input.reportId,
          userId: input.userId,
          permissionLevel: input.permissionLevel,
          updatedAt: new Date(),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update permission",
        });
      }
    }),

  /**
   * Revoke access to a report
   */
  revokeAccess: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return {
          success: true,
          reportId: input.reportId,
          userId: input.userId,
          revokedAt: new Date(),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke access",
        });
      }
    }),

  /**
   * Make report public
   */
  makePublic: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const publicLink = `https://example.com/reports/public/${input.reportId}`;
        return {
          success: true,
          reportId: input.reportId,
          publicLink,
          publicAt: new Date(),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to make report public",
        });
      }
    }),

  /**
   * Make report private
   */
  makePrivate: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return {
          success: true,
          reportId: input.reportId,
          privateAt: new Date(),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to make report private",
        });
      }
    }),

  /**
   * Add a comment to a report
   */
  addComment: protectedProcedure
    .input(AddCommentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const commentId = `comment-${Date.now()}`;
        return {
          id: commentId,
          reportId: input.reportId,
          content: input.content,
          author: {
            userId: ctx.user.id,
            name: ctx.user.name,
            avatar: ctx.user.avatar,
          },
          createdAt: new Date(),
          parentCommentId: input.parentCommentId,
          likes: 0,
          replies: [],
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add comment",
        });
      }
    }),

  /**
   * Get comments for a report
   */
  getComments: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return {
          reportId: input.reportId,
          totalComments: 3,
          comments: [
            {
              id: "comment-001",
              reportId: input.reportId,
              content: "Great report! Very comprehensive data.",
              author: {
                userId: "user-002",
                name: "Ahmed Ali",
                avatar: "https://example.com/avatars/ahmed.jpg",
              },
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              parentCommentId: null,
              likes: 2,
              replies: [
                {
                  id: "comment-002",
                  content: "Thanks! I added more metrics.",
                  author: {
                    userId: ctx.user.id,
                    name: ctx.user.name,
                    avatar: ctx.user.avatar,
                  },
                  createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                  likes: 1,
                },
              ],
            },
            {
              id: "comment-003",
              reportId: input.reportId,
              content: "Can we add fuel efficiency metrics?",
              author: {
                userId: "user-003",
                name: "Fatima Hassan",
                avatar: "https://example.com/avatars/fatima.jpg",
              },
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              parentCommentId: null,
              likes: 0,
              replies: [],
            },
          ],
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch comments",
        });
      }
    }),

  /**
   * Update a comment
   */
  updateComment: protectedProcedure
    .input(UpdateCommentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return {
          id: input.commentId,
          content: input.content,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update comment",
        });
      }
    }),

  /**
   * Delete a comment
   */
  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return {
          success: true,
          commentId: input.commentId,
          deletedAt: new Date(),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete comment",
        });
      }
    }),

  /**
   * Like a comment
   */
  likeComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return {
          success: true,
          commentId: input.commentId,
          likedBy: ctx.user.id,
          likedAt: new Date(),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to like comment",
        });
      }
    }),

  /**
   * Get shared reports (reports shared with the user)
   */
  getSharedWithMe: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return {
          totalShared: 2,
          reports: [
            {
              id: "SR-001",
              reportName: "Weekly Fleet Overview",
              owner: {
                userId: "user-001",
                name: "Manager",
                email: "manager@example.com",
              },
              permissionLevel: "view",
              sharedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              commentCount: 2,
            },
            {
              id: "SR-002",
              reportName: "Monthly Driver Performance",
              owner: {
                userId: "user-002",
                name: "HR Manager",
                email: "hr@example.com",
              },
              permissionLevel: "comment",
              sharedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              commentCount: 5,
            },
          ],
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch shared reports",
        });
      }
    }),

  /**
   * Get collaboration activity for a report
   */
  getActivity: protectedProcedure
    .input(z.object({ reportId: z.string(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      try {
        return {
          reportId: input.reportId,
          activities: [
            {
              id: "act-001",
              type: "shared",
              user: { userId: ctx.user.id, name: ctx.user.name },
              action: "shared report with Ahmed Ali",
              timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
            {
              id: "act-002",
              type: "comment",
              user: { userId: "user-002", name: "Ahmed Ali" },
              action: "added a comment",
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            {
              id: "act-003",
              type: "updated",
              user: { userId: ctx.user.id, name: ctx.user.name },
              action: "updated report",
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
          ],
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch activity",
        });
      }
    }),
});
