import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { serializeAllDates } from '@shared/dateUtils';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;

// Date serialization middleware applied to all procedures
const dateSerializationMiddleware = t.middleware(async ({ next }) => {
  const result = await next();
  if (result.ok) {
    return { ...result, data: serializeAllDates(result.data) };
  }
  return result;
});

// Apply date serialization middleware to all procedures
export const publicProcedure = t.procedure.use(dateSerializationMiddleware);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(dateSerializationMiddleware).use(requireUser);

const requireAdmin = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user || (ctx.user.role !== 'platform_admin' && ctx.user.role !== 'platform_super_admin' && ctx.user.role !== 'platform_auditor')) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminProcedure = t.procedure.use(dateSerializationMiddleware).use(requireAdmin);

/**
 * SCOPED PROCEDURE - Platform-Level Data Isolation Enforcement
 * 
 * Governance Requirements:
 * - Enforces authentication (requires user)
 * - Validates organizationId and operatingUnitId from context
 * - Injects scope into context for use in queries
 * - Prevents accidental cross-scope data leakage
 * 
 * Usage:
 *   scopedProcedure
 *     .input(z.object({ ... }))
 *     .query(async ({ ctx, input }) => {
 *       // ctx.scope.organizationId and ctx.scope.operatingUnitId are guaranteed to exist
 *       // Use them in all database queries
 *     })
 */
const requireScope = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Require authentication
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Require organizationId and operatingUnitId from context
  if (!ctx.organizationId || !ctx.operatingUnitId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Missing scope context. Organization and Operating Unit must be selected." 
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      scope: {
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
      },
    },
  });
});

export const scopedProcedure = t.procedure.use(dateSerializationMiddleware).use(requireScope);

/**
 * ORG SCOPED PROCEDURE - Organization Data Isolation with Platform Admin Blocking
 * 
 * Security Requirements:
 * - Enforces authentication (requires user)
 * - BLOCKS Platform Admin users from accessing organization-scoped data
 * - Validates organizationId and operatingUnitId from context
 * - Injects scope into context for use in queries
 * - Prevents accidental cross-scope data leakage
 * 
 * Platform Admin users MUST NOT:
 * - Access organization document metadata
 * - Open SharePoint document links
 * - Browse project storage
 * - Access any organization-scoped data
 * 
 * Platform Admin users MAY:
 * - Manage integration configuration (use adminProcedure)
 * - View integration health monitoring (use adminProcedure)
 * 
 * Usage:
 *   orgScopedProcedure
 *     .input(z.object({ ... }))
 *     .query(async ({ ctx, input }) => {
 *       // ctx.scope.organizationId and ctx.scope.operatingUnitId are guaranteed to exist
 *       // Platform Admin users are blocked
 *     })
 */
const blockPlatformAdmin = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Block Platform Admin users from accessing organization-scoped data
  if (ctx.user && (ctx.user.platformRole === 'platform_admin' || ctx.user.platformRole === 'platform_super_admin' || ctx.user.platformRole === 'platform_auditor')) {
    throw new TRPCError({ 
      code: "FORBIDDEN", 
      message: "Platform Admin users cannot access organization-scoped data. This action is restricted to organization users only." 
    });
  }

  return next({ ctx });
});

export const orgScopedProcedure = t.procedure.use(dateSerializationMiddleware).use(requireScope).use(blockPlatformAdmin);

/**
 * PLATFORM SCOPED PROCEDURE - Platform Administration Operations
 * 
 * Security Requirements:
 * - Enforces authentication (requires user)
 * - REQUIRES Platform Admin role (platform_admin, platform_super_admin, or platform_auditor)
 * - NO organizationId or operatingUnitId required
 * - Used for platform-level operations only
 * 
 * Platform Admin users MAY:
 * - Manage organizations (create, edit, suspend, delete)
 * - View system health and metrics
 * - Manage integration configuration
 * - View platform-wide logs and audit trails
 * 
 * Platform Admin users MUST NOT:
 * - Access organization-scoped data (use orgScopedProcedure for that)
 * 
 * Usage:
 *   platformScopedProcedure
 *     .input(z.object({ ... }))
 *     .query(async ({ ctx, input }) => {
 *       // ctx.user is guaranteed to be Platform Admin
 *       // No organizationId or operatingUnitId in context
 *     })
 */
const requirePlatformAdmin = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Require Platform Admin role
  if (!ctx.user || !['platform_admin', 'platform_super_admin', 'platform_auditor'].includes(ctx.user.role || '')) {
    throw new TRPCError({ 
      code: "FORBIDDEN", 
      message: "This operation requires Platform Admin privileges." 
    });
  }

  return next({ ctx });
});

export const platformScopedProcedure = t.procedure.use(dateSerializationMiddleware).use(requirePlatformAdmin);
