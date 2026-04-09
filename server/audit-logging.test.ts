/**
 * Audit Logging Tests
 * Tests that audit logs are created correctly for platform admin actions
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

describe("Audit Logging", () => {
  describe("ims.auditLogs.list", () => {
    it("returns audit logs with pagination", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.list({
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveProperty("logs");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("limit");
      expect(result).toHaveProperty("offset");
      expect(Array.isArray(result.logs)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    it("filters audit logs by action", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.list({
        limit: 50,
        offset: 0,
        action: "soft_delete",
      });

      expect(Array.isArray(result.logs)).toBe(true);
      // If there are logs, they should all be soft_delete actions
      if (result.logs.length > 0) {
        result.logs.forEach((log) => {
          expect(log.action).toBe("soft_delete");
        });
      }
    });

    it("filters audit logs by entity type", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.list({
        limit: 50,
        offset: 0,
        entityType: "organization",
      });

      expect(Array.isArray(result.logs)).toBe(true);
      // If there are logs, they should all be organization entity type
      if (result.logs.length > 0) {
        result.logs.forEach((log) => {
          expect(log.entityType).toBe("organization");
        });
      }
    });

    it("respects limit and offset parameters", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result1 = await caller.ims.auditLogs.list({
        limit: 5,
        offset: 0,
      });

      const result2 = await caller.ims.auditLogs.list({
        limit: 5,
        offset: 5,
      });

      expect(result1.logs.length).toBeLessThanOrEqual(5);
      expect(result2.logs.length).toBeLessThanOrEqual(5);
      // Results should be different (unless there are fewer than 10 logs)
      if (result1.total > 5) {
        expect(result1.logs[0]?.id).not.toBe(result2.logs[0]?.id);
      }
    });

    it("returns audit log entries with required fields", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.list({
        limit: 10,
        offset: 0,
      });

      if (result.logs.length > 0) {
        const log = result.logs[0];
        expect(log).toHaveProperty("id");
        expect(log).toHaveProperty("userId");
        expect(log).toHaveProperty("action");
        expect(log).toHaveProperty("entityType");
        expect(log).toHaveProperty("entityId");
        expect(log).toHaveProperty("createdAt");
      }
    });
  });

  describe("ims.auditLogs.recent", () => {
    it("returns recent audit logs", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.recent({ limit: 10 });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it("returns logs ordered by createdAt descending", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.recent({ limit: 20 });

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          const current = new Date(result[i].createdAt || 0).getTime();
          const next = new Date(result[i + 1].createdAt || 0).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });

    it("respects the limit parameter", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.recent({ limit: 5 });

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Audit Log Structure", () => {
    it("audit logs contain action, entityType, and entityId", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.list({
        limit: 20,
        offset: 0,
      });

      if (result.logs.length > 0) {
        result.logs.forEach((log) => {
          expect(typeof log.action).toBe("string");
          expect(log.action.length).toBeGreaterThan(0);
          expect(typeof log.entityType).toBe("string");
          expect(log.entityType.length).toBeGreaterThan(0);
          expect(typeof log.entityId).toBe("number");
        });
      }
    });

    it("audit logs contain userId for tracking who performed the action", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.list({
        limit: 20,
        offset: 0,
      });

      if (result.logs.length > 0) {
        result.logs.forEach((log) => {
          expect(typeof log.userId).toBe("number");
          expect(log.userId).toBeGreaterThan(0);
        });
      }
    });

    it("audit logs contain createdAt timestamp", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.list({
        limit: 20,
        offset: 0,
      });

      if (result.logs.length > 0) {
        result.logs.forEach((log) => {
          expect(log.createdAt).toBeDefined();
          const date = new Date(log.createdAt || "");
          expect(date.getTime()).toBeGreaterThan(0);
        });
      }
    });
  });

  describe("Audit Log Filtering", () => {
    it("combines action and entityType filters", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.list({
        limit: 50,
        offset: 0,
        action: "soft_delete",
        entityType: "organization",
      });

      expect(Array.isArray(result.logs)).toBe(true);
      if (result.logs.length > 0) {
        result.logs.forEach((log) => {
          expect(log.action).toBe("soft_delete");
          expect(log.entityType).toBe("organization");
        });
      }
    });

    it("returns total count for pagination calculations", async () => {
      const { ctx } = createPlatformAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ims.auditLogs.list({
        limit: 10,
        offset: 0,
      });

      expect(typeof result.total).toBe("number");
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeGreaterThanOrEqual(result.logs.length);
    });
  });
});
