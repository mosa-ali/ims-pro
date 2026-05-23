// ============================================================================
// ORGANIZATION ROUTER - COMPLETE WITH DASHBOARD PROCEDURES
// tRPC procedures for organization management and dashboard operations
// ============================================================================

import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, userOrganizations, operatingUnits, projects } from "../../drizzle/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Currency conversion rates
const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.09,
  GBP: 1.27,
  CHF: 1.13,
  SAR: 0.267,
  YER: 0.004,
};

function convertToUSD(amount: number, currency: string): number {
  return amount * (CURRENCY_RATES[currency] || 1);
}

/**
 * Organization Router
 * Handles organization-level operations including user and role management
 */
export const organizationRouter = router({
  // ============================================================================
  // EXISTING PROCEDURES - USER AND ROLE MANAGEMENT
  // ============================================================================

  /**
   * List all users in the current user's organization
   * Only accessible to organization admins
   */
  listUsers: scopedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.user;

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    const userOrg = await db
      .select()
      .from(userOrganizations)
      .where(eq(userOrganizations.userId, currentUser.id))
      .limit(1);

    if (!userOrg || userOrg.length === 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is not associated with an organization",
      });
    }

    const organizationId = userOrg[0].organizationId;

    const orgUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        platformRole: userOrganizations.platformRole,
        orgRoles: userOrganizations.orgRoles,
        permissions: userOrganizations.permissions,
        createdAt: users.createdAt,
      })
      .from(userOrganizations)
      .innerJoin(users, eq(userOrganizations.userId, users.id))
      .where(eq(userOrganizations.organizationId, organizationId));

    return orgUsers;
  }),

  /**
   * Update a user's role
   * Only accessible to organization admins
   * Cannot change own role
   */
  updateUserRole: scopedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["organization_admin", "user"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.user;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const currentUserOrg = await db
        .select()
        .from(userOrganizations)
        .where(eq(userOrganizations.userId, currentUser.id))
        .limit(1);

      if (!currentUserOrg || currentUserOrg.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is not associated with an organization",
        });
      }

      if (currentUserOrg[0].platformRole !== "organization_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can update roles",
        });
      }

      if (currentUser.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }

      const organizationId = currentUserOrg[0].organizationId;

      const targetUserOrg = await db
        .select()
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, input.userId),
            eq(userOrganizations.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!targetUserOrg || targetUserOrg.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in your organization",
        });
      }

      await db
        .update(userOrganizations)
        .set({ platformRole: input.role })
        .where(
          and(
            eq(userOrganizations.userId, input.userId),
            eq(userOrganizations.organizationId, organizationId)
          )
        );

      return { success: true };
    }),

  // ============================================================================
  // DASHBOARD PROCEDURES
  // ============================================================================

  /**
   * Dashboard: Operating Unit Performance Comparison
   * Compare performance metrics across all operating units
   */
  getPerformanceComparison: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { organizationId } = ctx.scope;

    const ouList = await db
      .select({
        id: operatingUnits.id,
        name: operatingUnits.name,
      })
      .from(operatingUnits)
      .where(eq(operatingUnits.organizationId, organizationId));

    const comparison = await Promise.all(
      ouList.map(async (ou) => {
        const projectsList = await db
          .select({
            id: projects.id,
            totalBudget: projects.totalBudget,
            spent: projects.spent,
            status: projects.status,
            currency: projects.currency,
          })
          .from(projects)
          .where(
            and(
              eq(projects.organizationId, organizationId),
              eq(projects.operatingUnitId, ou.id),
              eq(projects.isDeleted, 0)
            )
          );

        const projectCount = projectsList.length;
        const totalBudgetUSD = projectsList.reduce((sum, p) => {
          return sum + convertToUSD(Number(p.totalBudget) || 0, p.currency || 'USD');
        }, 0);

        const totalSpentUSD = projectsList.reduce((sum, p) => {
          return sum + convertToUSD(Number(p.spent) || 0, p.currency || 'USD');
        }, 0);

        const burnRate = totalBudgetUSD > 0 ? (totalSpentUSD / totalBudgetUSD) * 100 : 0;
        const onTrackCount = projectsList.filter(p => p.status === 'active').length;

        return {
          id: ou.id,
          name: ou.name,
          projectCount,
          totalBudgetUSD: Math.round(totalBudgetUSD),
          burnRate: Math.round(burnRate),
          onTrackCount,
        };
      })
    );

    return comparison;
  }),

  /**
   * Dashboard: Operating Unit Details
   * Get detailed metrics for a specific operating unit
   */
  getOperatingUnitDetails: scopedProcedure
    .input(z.object({
      operatingUnitId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { organizationId } = ctx.scope;
      const { operatingUnitId } = input;

      const ou = await db
        .select()
        .from(operatingUnits)
        .where(
          and(
            eq(operatingUnits.id, operatingUnitId),
            eq(operatingUnits.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!ou[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Operating unit not found" });
      }

      const projectsList = await db
        .select({
          id: projects.id,
          title: projects.title,
          status: projects.status,
          totalBudget: projects.totalBudget,
          spent: projects.spent,
          currency: projects.currency,
        })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, organizationId),
            eq(projects.operatingUnitId, operatingUnitId),
            eq(projects.isDeleted, 0)
          )
        );

      const totalBudgetUSD = projectsList.reduce((sum, p) => {
        return sum + convertToUSD(Number(p.totalBudget) || 0, p.currency || 'USD');
      }, 0);

      const totalSpentUSD = projectsList.reduce((sum, p) => {
        return sum + convertToUSD(Number(p.spent) || 0, p.currency || 'USD');
      }, 0);

      return {
        ...ou[0],
        projectCount: projectsList.length,
        totalBudgetUSD: Math.round(totalBudgetUSD),
        totalSpentUSD: Math.round(totalSpentUSD),
        burnRate: totalBudgetUSD > 0 ? Math.round((totalSpentUSD / totalBudgetUSD) * 100) : 0,
      };
    }),

  /**
   * Dashboard: Organization Overview
   * Get organization-wide metrics
   */
  getOrganizationOverview: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { organizationId, operatingUnitId } = ctx.scope;

    const conditions = [
      eq(projects.organizationId, organizationId),
      eq(projects.isDeleted, 0),
    ];

    if (operatingUnitId) {
      conditions.push(eq(projects.operatingUnitId, operatingUnitId));
    }

    const projectsList = await db
      .select({
        id: projects.id,
        totalBudget: projects.totalBudget,
        spent: projects.spent,
        status: projects.status,
        currency: projects.currency,
      })
      .from(projects)
      .where(and(...conditions));

    const totalBudgetUSD = projectsList.reduce((sum, p) => {
      return sum + convertToUSD(Number(p.totalBudget) || 0, p.currency || 'USD');
    }, 0);

    const totalSpentUSD = projectsList.reduce((sum, p) => {
      return sum + convertToUSD(Number(p.spent) || 0, p.currency || 'USD');
    }, 0);

    const completedCount = projectsList.filter(p => p.status === 'completed').length;
    const onTrackCount = projectsList.filter(p => p.status === 'active').length;
    const atRiskCount = projectsList.filter(p => p.status === 'on_hold').length;

    return {
      totalBudgetUSD: Math.round(totalBudgetUSD),
      totalSpentUSD: Math.round(totalSpentUSD),
      projectCount: projectsList.length,
      completedCount,
      onTrackCount,
      atRiskCount,
      burnRate: totalBudgetUSD > 0 ? Math.round((totalSpentUSD / totalBudgetUSD) * 100) : 0,
    };
  }),

  /**
   * Dashboard: List Operating Units
   * Get list of all operating units in organization
   */
  listOperatingUnits: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { organizationId } = ctx.scope;

    const ouList = await db
      .select()
      .from(operatingUnits)
      .where(eq(operatingUnits.organizationId, organizationId))
      .orderBy(asc(operatingUnits.name));

    return ouList;
  }),
});

export type OrganizationRouter = typeof organizationRouter;
