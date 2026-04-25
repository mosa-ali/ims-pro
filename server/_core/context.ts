import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { sdk } from "./sdk";
import { getDb } from "../db";
import {
  userOrganizations,
  rbacUserPermissions,
  rbacRoles,
  User,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  organizationId: number | null;
  operatingUnitId: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const db = await getDb();

  let user: User | null = null;

  // ---------------------------------------------------
  // Extract selected organization + operating unit first
  // ---------------------------------------------------
  const orgIdHeader = opts.req.headers["x-organization-id"];
  const ouIdHeader = opts.req.headers["x-operating-unit-id"];

  const organizationId = orgIdHeader
    ? parseInt(String(orgIdHeader), 10)
    : null;

  const operatingUnitId = ouIdHeader
    ? parseInt(String(ouIdHeader), 10)
    : null;

  try {
    const authenticatedUser = await sdk.authenticateRequest(opts.req);

    if (authenticatedUser) {
      let userOrg = null;

      // Use selected organization from header first
      const targetOrgId =
        organizationId || authenticatedUser.currentOrganizationId;

      // ------------------------------------
      // Get organization-specific role
      // ------------------------------------
      if (targetOrgId) {
        userOrg = await db.query.userOrganizations.findFirst({
          where: and(
            eq(userOrganizations.userId, authenticatedUser.id),
            eq(userOrganizations.organizationId, targetOrgId)
          )
        });
      }

      // ------------------------------------
      // Get RBAC role
      // ------------------------------------
      const rbacUserRole = await db
        .select({
          rbac_role_name: rbacRoles.name
        })
        .from(rbacUserPermissions)
        .leftJoin(
          rbacRoles,
          eq(rbacUserPermissions.roleId, rbacRoles.id)
        )
        .where(
          and(
            eq(rbacUserPermissions.userId, authenticatedUser.id),
            eq(rbacUserPermissions.isActive, 1)

            /**
             * OPTIONAL:
             * If your rbac_user_permissions table later includes operatingUnitId:
             *
             * operatingUnitId
             *   ? eq(rbacUserPermissions.operatingUnitId, operatingUnitId)
             *   : undefined
             */
          )
        )
        .limit(1);

      // ------------------------------------
      // Extend user session
      // ------------------------------------
      user = {
        ...authenticatedUser,
        organizationRole: userOrg?.role || null,
        rbacRole: rbacUserRole[0]?.rbac_role_name || null,
      } as any;
    }
  } catch (error) {
    console.error("Context authentication error:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    organizationId,
    operatingUnitId,
  };
}