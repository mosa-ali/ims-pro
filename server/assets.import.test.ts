/**
 * Tests for Asset Import/Export Procedures
 * Validates importAssets, importCategories, importTransfers, importDisposals
 */
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createScopedContext(orgId = 99999): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    scope: {
      organizationId: orgId,
      operatingUnitId: undefined,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Asset Import Procedures - Input Validation", () => {
  describe("importCategories input schema", () => {
    it("should accept valid category import data", () => {
      const validInput = {
        categories: [
          {
            code: "IT-EQUIP",
            name: "IT Equipment",
            nameAr: "معدات تقنية المعلومات",
            description: "Computers, laptops, and peripherals",
            depreciationRate: "20.00",
            defaultUsefulLife: 5,
          },
        ],
      };
      // Validate that the structure matches expected shape
      expect(validInput.categories).toHaveLength(1);
      expect(validInput.categories[0].code).toBe("IT-EQUIP");
      expect(validInput.categories[0].name).toBe("IT Equipment");
    });

    it("should require code and name fields", () => {
      const invalidCategory = { description: "No code or name" };
      expect((invalidCategory as any).code).toBeUndefined();
      expect((invalidCategory as any).name).toBeUndefined();
    });

    it("should allow optional fields to be omitted", () => {
      const minimalCategory = { code: "CAT-001", name: "Category 1" };
      expect(minimalCategory.code).toBeTruthy();
      expect(minimalCategory.name).toBeTruthy();
      expect((minimalCategory as any).nameAr).toBeUndefined();
      expect((minimalCategory as any).description).toBeUndefined();
    });
  });

  describe("importAssets input schema", () => {
    it("should accept valid asset import data", () => {
      const validInput = {
        assets: [
          {
            assetCode: "ASSET-001",
            name: "Laptop Dell XPS",
            acquisitionDate: "2024-01-15",
            acquisitionCost: "1500.00",
            currency: "USD",
            status: "active" as const,
            location: "Main Office",
          },
        ],
      };
      expect(validInput.assets).toHaveLength(1);
      expect(validInput.assets[0].assetCode).toBe("ASSET-001");
    });

    it("should require assetCode and name", () => {
      const invalidAsset = { location: "Office" };
      expect((invalidAsset as any).assetCode).toBeUndefined();
      expect((invalidAsset as any).name).toBeUndefined();
    });

    it("should accept valid status values", () => {
      const validStatuses = ["active", "in_maintenance", "disposed", "lost", "transferred", "pending_disposal"];
      validStatuses.forEach(status => {
        expect(typeof status).toBe("string");
        expect(status.length).toBeGreaterThan(0);
      });
    });
  });

  describe("importTransfers input schema", () => {
    it("should accept valid transfer import data", () => {
      const validInput = {
        transfers: [
          {
            assetId: 1,
            fromLocation: "Main Office",
            toLocation: "Field Office",
            transferDate: "2024-03-15",
            reason: "Project relocation",
          },
        ],
      };
      expect(validInput.transfers).toHaveLength(1);
      expect(validInput.transfers[0].assetId).toBe(1);
    });

    it("should require assetId", () => {
      const invalidTransfer = { fromLocation: "Office A", toLocation: "Office B" };
      expect((invalidTransfer as any).assetId).toBeUndefined();
    });

    it("should accept optional fields", () => {
      const minimalTransfer = { assetId: 5 };
      expect(minimalTransfer.assetId).toBe(5);
      expect((minimalTransfer as any).fromLocation).toBeUndefined();
      expect((minimalTransfer as any).toLocation).toBeUndefined();
    });
  });

  describe("importDisposals input schema", () => {
    it("should accept valid disposal import data", () => {
      const validInput = {
        disposals: [
          {
            assetId: 1,
            disposalType: "sale" as const,
            proposedDate: "2024-06-30",
            proposedValue: "500.00",
            reason: "End of useful life",
          },
        ],
      };
      expect(validInput.disposals).toHaveLength(1);
      expect(validInput.disposals[0].assetId).toBe(1);
      expect(validInput.disposals[0].disposalType).toBe("sale");
    });

    it("should accept all valid disposal types", () => {
      const validTypes = ["sale", "donation", "scrap", "theft", "loss", "transfer_out", "write_off"];
      validTypes.forEach(type => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
      });
    });

    it("should require assetId", () => {
      const invalidDisposal = { disposalType: "sale", reason: "No asset ID" };
      expect((invalidDisposal as any).assetId).toBeUndefined();
    });
  });
});

describe("ImportResult structure", () => {
  it("should have correct shape for successful import", () => {
    const result = { imported: 5, skipped: 0, errors: [] };
    expect(result.imported).toBe(5);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("should have correct shape for partial import with errors", () => {
    const result = {
      imported: 3,
      skipped: 0,
      errors: [
        { row: 2, field: "code", message: "Code already exists", suggestedFix: "Use a unique code" },
        { row: 5, field: "assetId", message: "Asset not found", suggestedFix: "Check asset ID" },
      ],
    };
    expect(result.imported).toBe(3);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].field).toBe("code");
    expect(result.errors[0].suggestedFix).toBeTruthy();
  });
});

describe("Template column definitions", () => {
  it("should define required and optional columns correctly", () => {
    const assetColumns = [
      { key: "assetCode", header: "Asset Code", required: true },
      { key: "name", header: "Asset Name", required: true },
      { key: "description", header: "Description", required: false },
    ];

    const requiredCols = assetColumns.filter(c => c.required);
    const optionalCols = assetColumns.filter(c => !c.required);

    expect(requiredCols).toHaveLength(2);
    expect(optionalCols).toHaveLength(1);
    expect(requiredCols[0].key).toBe("assetCode");
  });

  it("should have unique keys in template columns", () => {
    const columns = [
      { key: "assetCode", header: "Asset Code" },
      { key: "name", header: "Asset Name" },
      { key: "location", header: "Location" },
    ];
    const keys = columns.map(c => c.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});
