/**
 * Deleted Records Router Tests
 *
 * Tests cover:
 * - listByScope: platform scope (admin only), org scope (with/without operatingUnitId)
 * - restore: platform entities, org entities, access control
 * - permanentDelete: access control, hard delete
 * - bulkRestore: batch operations, partial failures
 * - bulkPermanentDelete: batch operations, partial failures
 *
 * NOTE: DB calls are mocked so these tests run without a live database.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";

// ─── Mock the db module ───────────────────────────────────────────────────────
vi.mock("../db", () => ({
  getPlatformDeletedRecords: vi.fn(),
  getOrgDeletedRecords: vi.fn(),
  getUserOrganizations: vi.fn(),
  restoreDeletedRecord: vi.fn(),
  restoreOrgRecord: vi.fn(),
  hardDeleteRecord: vi.fn(),
  createAuditLog: vi.fn(),
}));

import * as db from "../db";
import { deletedRecordsRouter } from "./deletedRecords";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser | null = makeUser()): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const samplePlatformRecord = {
  id: "organization_1",
  entityId: 1,
  recordType: "Organization",
  recordName: "Test Org",
  organizationName: null,
  module: "Platform",
  deletedByName: "Admin",
  deletedAt: "2026-01-01T00:00:00.000Z",
  deletionReason: null,
  canRestore: true,
  canPermanentDelete: true,
};

const sampleOrgRecord = {
  id: "project_10",
  entityId: 10,
  recordType: "Project",
  recordName: "Test Project",
  organizationName: "Test Org",
  module: "Projects",
  deletedByName: "Org Admin",
  deletedAt: "2026-01-02T00:00:00.000Z",
  deletionReason: null,
  canRestore: true,
  canPermanentDelete: true,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("deletedRecords.listByScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns platform deleted records for platform_admin", async () => {
    vi.mocked(db.getPlatformDeletedRecords).mockResolvedValue([samplePlatformRecord]);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "platform_admin" }))
    );
    const result = await caller.listByScope({ scope: "platform" });
    expect(result).toHaveLength(1);
    expect(result[0].recordType).toBe("Organization");
    expect(db.getPlatformDeletedRecords).toHaveBeenCalledOnce();
  });

  it("returns platform deleted records for platform_super_admin", async () => {
    vi.mocked(db.getPlatformDeletedRecords).mockResolvedValue([samplePlatformRecord]);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "platform_super_admin" }))
    );
    const result = await caller.listByScope({ scope: "platform" });
    expect(result).toHaveLength(1);
  });

  it("throws FORBIDDEN for non-platform-admin accessing platform scope", async () => {
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await expect(caller.listByScope({ scope: "platform" })).rejects.toThrow(TRPCError);
  });

  it("throws BAD_REQUEST when organizationId is missing for org scope", async () => {
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await expect(
      caller.listByScope({ scope: "organization" })
    ).rejects.toThrow(TRPCError);
  });

  it("returns org deleted records for org admin with valid organizationId", async () => {
    vi.mocked(db.getUserOrganizations).mockResolvedValue([
      { organizationId: 5 } as any,
    ]);
    vi.mocked(db.getOrgDeletedRecords).mockResolvedValue([sampleOrgRecord]);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    const result = await caller.listByScope({ scope: "organization", organizationId: 5 });
    expect(result).toHaveLength(1);
    expect(result[0].recordType).toBe("Project");
    expect(db.getOrgDeletedRecords).toHaveBeenCalledWith(5, null);
  });

  it("passes operatingUnitId to getOrgDeletedRecords when provided", async () => {
    vi.mocked(db.getUserOrganizations).mockResolvedValue([
      { organizationId: 5 } as any,
    ]);
    vi.mocked(db.getOrgDeletedRecords).mockResolvedValue([]);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await caller.listByScope({ scope: "organization", organizationId: 5, operatingUnitId: 3 });
    expect(db.getOrgDeletedRecords).toHaveBeenCalledWith(5, 3);
  });

  it("allows platform_super_admin to access any org scope", async () => {
    vi.mocked(db.getUserOrganizations).mockResolvedValue([]);
    vi.mocked(db.getOrgDeletedRecords).mockResolvedValue([sampleOrgRecord]);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "platform_super_admin" }))
    );
    const result = await caller.listByScope({ scope: "organization", organizationId: 99 });
    expect(result).toHaveLength(1);
  });

  it("throws FORBIDDEN when user does not belong to the requested organization", async () => {
    vi.mocked(db.getUserOrganizations).mockResolvedValue([
      { organizationId: 7 } as any,
    ]);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await expect(
      caller.listByScope({ scope: "organization", organizationId: 99 })
    ).rejects.toThrow(TRPCError);
  });
});

describe("deletedRecords.restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restores a platform entity (organization) for platform_admin", async () => {
    vi.mocked(db.restoreDeletedRecord).mockResolvedValue({ success: true });
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined as any);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "platform_admin" }))
    );
    const result = await caller.restore({
      entityType: "organization",
      entityId: 1,
      scope: "platform",
    });
    expect(result.success).toBe(true);
    expect(db.restoreDeletedRecord).toHaveBeenCalledOnce();
    expect(db.createAuditLog).toHaveBeenCalledOnce();
  });

  it("falls through to restoreOrgRecord for unsupported platform entity types", async () => {
    vi.mocked(db.restoreDeletedRecord).mockResolvedValue({
      success: false,
      message: "Unsupported entity type: project",
    });
    vi.mocked(db.restoreOrgRecord).mockResolvedValue({ success: true });
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined as any);
    vi.mocked(db.getUserOrganizations).mockResolvedValue([{ organizationId: 5 } as any]);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    const result = await caller.restore({
      entityType: "project",
      entityId: 10,
      scope: "organization",
      organizationId: 5,
    });
    expect(result.success).toBe(true);
    expect(db.restoreOrgRecord).toHaveBeenCalledWith("project", 10);
  });

  it("throws FORBIDDEN when non-platform-admin tries to restore platform entity", async () => {
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await expect(
      caller.restore({ entityType: "organization", entityId: 1, scope: "platform" })
    ).rejects.toThrow(TRPCError);
  });

  it("throws NOT_FOUND when restoreOrgRecord returns failure", async () => {
    vi.mocked(db.restoreDeletedRecord).mockResolvedValue({
      success: false,
      message: "Unsupported entity type: project",
    });
    vi.mocked(db.restoreOrgRecord).mockResolvedValue({
      success: false,
      message: "Record not found",
    });
    vi.mocked(db.getUserOrganizations).mockResolvedValue([{ organizationId: 5 } as any]);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await expect(
      caller.restore({
        entityType: "project",
        entityId: 999,
        scope: "organization",
        organizationId: 5,
      })
    ).rejects.toThrow(TRPCError);
  });
});

describe("deletedRecords.permanentDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permanently deletes a platform entity for platform_admin", async () => {
    vi.mocked(db.hardDeleteRecord).mockResolvedValue({ success: true });
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined as any);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "platform_admin" }))
    );
    const result = await caller.permanentDelete({
      entityType: "organization",
      entityId: 1,
      scope: "platform",
    });
    expect(result.success).toBe(true);
    expect(db.hardDeleteRecord).toHaveBeenCalledWith("organization", 1);
    expect(db.createAuditLog).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when non-platform-admin tries to permanently delete platform entity", async () => {
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await expect(
      caller.permanentDelete({ entityType: "organization", entityId: 1, scope: "platform" })
    ).rejects.toThrow(TRPCError);
  });

  it("permanently deletes an org entity for org admin", async () => {
    vi.mocked(db.getUserOrganizations).mockResolvedValue([{ organizationId: 5 } as any]);
    vi.mocked(db.hardDeleteRecord).mockResolvedValue({ success: true });
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined as any);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    const result = await caller.permanentDelete({
      entityType: "project",
      entityId: 10,
      scope: "organization",
      organizationId: 5,
    });
    expect(result.success).toBe(true);
    expect(db.hardDeleteRecord).toHaveBeenCalledWith("project", 10);
  });

  it("throws NOT_FOUND when hardDeleteRecord returns failure", async () => {
    vi.mocked(db.getUserOrganizations).mockResolvedValue([{ organizationId: 5 } as any]);
    vi.mocked(db.hardDeleteRecord).mockResolvedValue({
      success: false,
      message: "Record not found",
    });
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined as any);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await expect(
      caller.permanentDelete({
        entityType: "project",
        entityId: 999,
        scope: "organization",
        organizationId: 5,
      })
    ).rejects.toThrow(TRPCError);
  });
});

describe("deletedRecords.bulkRestore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bulk restores multiple platform records for platform_admin", async () => {
    vi.mocked(db.restoreDeletedRecord).mockResolvedValue({ success: true });
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined as any);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "platform_admin" }))
    );
    const result = await caller.bulkRestore({
      records: [
        { entityType: "organization", entityId: 1 },
        { entityType: "operating_unit", entityId: 2 },
      ],
      scope: "platform",
    });
    expect(result.restoredCount).toBe(2);
    expect(result.totalRequested).toBe(2);
    expect(result.errors).toBeUndefined();
  });

  it("reports partial failures in bulk restore", async () => {
    vi.mocked(db.restoreDeletedRecord)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, message: "Record not found" });
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined as any);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "platform_admin" }))
    );
    const result = await caller.bulkRestore({
      records: [
        { entityType: "organization", entityId: 1 },
        { entityType: "organization", entityId: 999 },
      ],
      scope: "platform",
    });
    expect(result.restoredCount).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it("throws FORBIDDEN for non-platform-admin on platform scope", async () => {
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await expect(
      caller.bulkRestore({
        records: [{ entityType: "organization", entityId: 1 }],
        scope: "platform",
      })
    ).rejects.toThrow(TRPCError);
  });
});

describe("deletedRecords.bulkPermanentDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bulk permanently deletes multiple records for platform_admin", async () => {
    vi.mocked(db.hardDeleteRecord).mockResolvedValue({ success: true });
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined as any);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "platform_admin" }))
    );
    const result = await caller.bulkPermanentDelete({
      records: [
        { entityType: "organization", entityId: 1 },
        { entityType: "user", entityId: 2 },
      ],
      scope: "platform",
    });
    expect(result.deletedCount).toBe(2);
    expect(result.totalRequested).toBe(2);
    expect(result.errors).toBeUndefined();
  });

  it("reports partial failures in bulk permanent delete", async () => {
    vi.mocked(db.hardDeleteRecord)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, message: "Record not found" });
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined as any);
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "platform_admin" }))
    );
    const result = await caller.bulkPermanentDelete({
      records: [
        { entityType: "organization", entityId: 1 },
        { entityType: "organization", entityId: 999 },
      ],
      scope: "platform",
    });
    expect(result.deletedCount).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it("throws FORBIDDEN for non-platform-admin on platform scope", async () => {
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await expect(
      caller.bulkPermanentDelete({
        records: [{ entityType: "organization", entityId: 1 }],
        scope: "platform",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("throws BAD_REQUEST when organizationId is missing for org scope", async () => {
    const caller = deletedRecordsRouter.createCaller(
      makeCtx(makeUser({ role: "organization_admin" }))
    );
    await expect(
      caller.bulkPermanentDelete({
        records: [{ entityType: "project", entityId: 10 }],
        scope: "organization",
      })
    ).rejects.toThrow(TRPCError);
  });
});
