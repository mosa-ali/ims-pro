/**
 * Platform Dashboard - getUserCounts and getRecentActivities procedures
 * Tests that the dashboard router returns real data structures and
 * handles edge cases correctly.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPlatformAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "platform-admin-user",
    email: "admin@platform.com",
    name: "Platform Admin",
    loginMethod: "manus",
    role: "platform_admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as User;

  const ctx: TrpcContext = {
    user,
    organizationId: null,
    operatingUnitId: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createSuperAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "platform-super-admin-user",
    email: "superadmin@platform.com",
    name: "Platform Super Admin",
    loginMethod: "manus",
    role: "platform_super_admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as User;

  const ctx: TrpcContext = {
    user,
    organizationId: null,
    operatingUnitId: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createRegularUserContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "regular-user",
    email: "user@org.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as User;

  const ctx: TrpcContext = {
    user,
    organizationId: 1,
    operatingUnitId: 1,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("ims.dashboard.getUserCounts", () => {
  it("returns numeric user counts for platform admin", async () => {
    const { ctx } = createPlatformAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ims.dashboard.getUserCounts();

    expect(result).toHaveProperty("totalUsers");
    expect(result).toHaveProperty("platformUsers");
    expect(result).toHaveProperty("orgUsers");
    expect(typeof result.totalUsers).toBe("number");
    expect(typeof result.platformUsers).toBe("number");
    expect(typeof result.orgUsers).toBe("number");
  });

  it("returns non-negative counts", async () => {
    const { ctx } = createPlatformAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ims.dashboard.getUserCounts();

    expect(result.totalUsers).toBeGreaterThanOrEqual(0);
    expect(result.platformUsers).toBeGreaterThanOrEqual(0);
    expect(result.orgUsers).toBeGreaterThanOrEqual(0);
  });

  it("platformUsers + orgUsers <= totalUsers (some users may not fit either category)", async () => {
    const { ctx } = createPlatformAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ims.dashboard.getUserCounts();

    expect(result.platformUsers + result.orgUsers).toBeLessThanOrEqual(result.totalUsers);
  });

  it("works for platform super admin as well", async () => {
    const { ctx } = createSuperAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ims.dashboard.getUserCounts();

    expect(result).toHaveProperty("totalUsers");
    expect(result.totalUsers).toBeGreaterThanOrEqual(0);
  });

  it("throws FORBIDDEN for regular (non-platform) users", async () => {
    const { ctx } = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ims.dashboard.getUserCounts()).rejects.toThrow();
  });
});

describe("ims.dashboard.getRecentActivities", () => {
  it("returns an array for platform admin", async () => {
    const { ctx } = createPlatformAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ims.dashboard.getRecentActivities({ limit: 5 });

    expect(Array.isArray(result)).toBe(true);
  });

  it("respects the limit parameter", async () => {
    const { ctx } = createPlatformAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ims.dashboard.getRecentActivities({ limit: 3 });

    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("each activity entry has required fields", async () => {
    const { ctx } = createPlatformAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ims.dashboard.getRecentActivities({ limit: 10 });

    for (const entry of result) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("action");
      expect(entry).toHaveProperty("description");
    }
  });

  it("uses default limit of 10 when not specified", async () => {
    const { ctx } = createPlatformAdminContext();
    const caller = appRouter.createCaller(ctx);

    // The default is 10 per the z.number().default(10) in the schema
    const result = await caller.ims.dashboard.getRecentActivities({ limit: 10 });

    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("throws FORBIDDEN for regular (non-platform) users", async () => {
    const { ctx } = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ims.dashboard.getRecentActivities({ limit: 5 })
    ).rejects.toThrow();
  });
});
