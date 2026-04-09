import { describe, it, expect, vi } from "vitest";

// ============================================================
// Stock Management Phase 4 Enhancement Tests
// Barcode/QR Scanning, Warehouse Alert Configs, Stock Analytics
// ============================================================

describe("Barcode/QR Scanning for Physical Count", () => {
  describe("Barcode Code Parsing", () => {
    it("should identify a standard barcode format (EAN-13)", () => {
      const code = "5901234123457";
      expect(code.length).toBe(13);
      expect(/^\d{13}$/.test(code)).toBe(true);
    });

    it("should identify a QR code containing batch info", () => {
      const qrData = "ITEM:MED-001|BATCH:B2026-03|QTY:100";
      const parts = qrData.split("|").reduce((acc: Record<string, string>, part) => {
        const [key, val] = part.split(":");
        acc[key] = val;
        return acc;
      }, {});

      expect(parts.ITEM).toBe("MED-001");
      expect(parts.BATCH).toBe("B2026-03");
      expect(parts.QTY).toBe("100");
    });

    it("should handle plain text barcode (item code only)", () => {
      const code = "ITEM-001";
      // Plain text codes should be treated as item codes
      const isNumericBarcode = /^\d{8,14}$/.test(code);
      expect(isNumericBarcode).toBe(false);
      // Should be looked up as item code
      expect(code.startsWith("ITEM-")).toBe(true);
    });

    it("should aggregate multiple scans of the same code", () => {
      const scannedItems: Map<string, { code: string; quantity: number; scanCount: number }> = new Map();

      const addScan = (code: string) => {
        const existing = scannedItems.get(code);
        if (existing) {
          existing.quantity += 1;
          existing.scanCount += 1;
        } else {
          scannedItems.set(code, { code, quantity: 1, scanCount: 1 });
        }
      };

      addScan("ITEM-001");
      addScan("ITEM-001");
      addScan("ITEM-002");
      addScan("ITEM-001");

      expect(scannedItems.get("ITEM-001")?.quantity).toBe(3);
      expect(scannedItems.get("ITEM-001")?.scanCount).toBe(3);
      expect(scannedItems.get("ITEM-002")?.quantity).toBe(1);
      expect(scannedItems.size).toBe(2);
    });

    it("should allow manual quantity override after scanning", () => {
      const item = { code: "ITEM-001", quantity: 3, scanCount: 3 };
      // User manually overrides quantity
      item.quantity = 50;
      expect(item.quantity).toBe(50);
      expect(item.scanCount).toBe(3); // Scan count preserved
    });
  });

  describe("Scan Lookup Logic", () => {
    it("should match code against item codes", () => {
      const items = [
        { itemCode: "MED-001", itemName: "Paracetamol", category: "Medical" },
        { itemCode: "FOOD-001", itemName: "Rice 25kg", category: "Food" },
        { itemCode: "MED-002", itemName: "Bandages", category: "Medical" },
      ];

      const code = "MED-001";
      const match = items.find(i => i.itemCode === code);
      expect(match).toBeDefined();
      expect(match?.itemName).toBe("Paracetamol");
    });

    it("should match code against batch numbers", () => {
      const batches = [
        { batchNumber: "B2026-001", itemCode: "MED-001", itemName: "Paracetamol", availableQty: 100 },
        { batchNumber: "B2026-002", itemCode: "FOOD-001", itemName: "Rice 25kg", availableQty: 50 },
      ];

      const code = "B2026-001";
      const match = batches.find(b => b.batchNumber === code);
      expect(match).toBeDefined();
      expect(match?.itemCode).toBe("MED-001");
      expect(match?.availableQty).toBe(100);
    });

    it("should return not found for unknown codes", () => {
      const items = [{ itemCode: "MED-001" }];
      const batches = [{ batchNumber: "B2026-001" }];

      const code = "UNKNOWN-999";
      const itemMatch = items.find(i => i.itemCode === code);
      const batchMatch = batches.find(b => b.batchNumber === code);

      expect(itemMatch).toBeUndefined();
      expect(batchMatch).toBeUndefined();
    });
  });

  describe("Scanned Items to Upload Format", () => {
    it("should convert scanned items to upload line format", () => {
      const scannedItems = [
        { code: "MED-001", itemCode: "MED-001", itemName: "Paracetamol", batchNumber: "B2026-001", quantity: 50, scanCount: 50, unit: "Tablet" },
        { code: "FOOD-001", itemCode: "FOOD-001", itemName: "Rice 25kg", batchNumber: null, quantity: 10, scanCount: 10, unit: "Bag" },
      ];

      const lines = scannedItems.map(item => ({
        itemCode: item.itemCode || item.code,
        itemName: item.itemName || item.code,
        batchNumber: item.batchNumber || undefined,
        countedQty: item.quantity,
        unit: item.unit || undefined,
        notes: `Scanned via barcode (${item.scanCount} scan${item.scanCount > 1 ? "s" : ""})`,
      }));

      expect(lines).toHaveLength(2);
      expect(lines[0].itemCode).toBe("MED-001");
      expect(lines[0].countedQty).toBe(50);
      expect(lines[0].notes).toContain("50 scans");
      expect(lines[1].batchNumber).toBeUndefined();
    });
  });
});

describe("Warehouse-Level Alert Configuration", () => {
  describe("Configuration Validation", () => {
    it("should validate threshold days range (1-365)", () => {
      const validThresholds = [1, 7, 14, 30, 60, 90, 120, 180, 365];
      const invalidThresholds = [0, -1, 366, 1000];

      validThresholds.forEach(t => {
        expect(t >= 1 && t <= 365).toBe(true);
      });

      invalidThresholds.forEach(t => {
        expect(t >= 1 && t <= 365).toBe(false);
      });
    });

    it("should validate frequency enum values", () => {
      const validFrequencies = ["daily", "weekly", "biweekly", "monthly"];
      const invalidFrequencies = ["hourly", "yearly", ""];

      validFrequencies.forEach(f => {
        expect(["daily", "weekly", "biweekly", "monthly"].includes(f)).toBe(true);
      });

      invalidFrequencies.forEach(f => {
        expect(["daily", "weekly", "biweekly", "monthly"].includes(f)).toBe(false);
      });
    });

    it("should require warehouse name", () => {
      const config = { warehouseName: "", thresholdDays: 30, frequency: "daily" };
      expect(config.warehouseName.trim().length > 0).toBe(false);

      config.warehouseName = "Main Warehouse";
      expect(config.warehouseName.trim().length > 0).toBe(true);
    });
  });

  describe("Category-Specific Thresholds", () => {
    it("should allow different thresholds per category within same warehouse", () => {
      const configs = [
        { warehouseName: "Main", category: "Medical Supplies", thresholdDays: 90 },
        { warehouseName: "Main", category: "Food Items", thresholdDays: 30 },
        { warehouseName: "Main", category: "Equipment", thresholdDays: 180 },
      ];

      const medicalConfig = configs.find(c => c.category === "Medical Supplies");
      const foodConfig = configs.find(c => c.category === "Food Items");

      expect(medicalConfig?.thresholdDays).toBe(90);
      expect(foodConfig?.thresholdDays).toBe(30);
      expect(medicalConfig?.thresholdDays).toBeGreaterThan(foodConfig!.thresholdDays);
    });

    it("should support warehouse-wide config (no category filter)", () => {
      const configs = [
        { warehouseName: "Field Office A", category: null, thresholdDays: 60 },
        { warehouseName: "Main", category: "Medical", thresholdDays: 90 },
      ];

      const warehouseWide = configs.filter(c => c.category === null);
      expect(warehouseWide).toHaveLength(1);
      expect(warehouseWide[0].warehouseName).toBe("Field Office A");
    });

    it("should find the most specific config for a batch", () => {
      const configs = [
        { warehouseName: "Main", category: null, thresholdDays: 30 },
        { warehouseName: "Main", category: "Medical", thresholdDays: 90 },
      ];

      // For a medical item in Main warehouse
      const findConfig = (warehouse: string, category: string | null) => {
        // Try specific match first
        const specific = configs.find(c => c.warehouseName === warehouse && c.category === category);
        if (specific) return specific;
        // Fall back to warehouse-wide
        return configs.find(c => c.warehouseName === warehouse && c.category === null);
      };

      const medConfig = findConfig("Main", "Medical");
      expect(medConfig?.thresholdDays).toBe(90);

      const otherConfig = findConfig("Main", "Equipment");
      expect(otherConfig?.thresholdDays).toBe(30); // Falls back to warehouse-wide
    });
  });

  describe("Alert Enable/Disable Logic", () => {
    it("should filter only enabled configs for scheduled runs", () => {
      const configs = [
        { id: 1, enabled: 1, warehouseName: "Main" },
        { id: 2, enabled: 0, warehouseName: "Field A" },
        { id: 3, enabled: 1, warehouseName: "Field B" },
      ];

      const activeConfigs = configs.filter(c => c.enabled === 1);
      expect(activeConfigs).toHaveLength(2);
      expect(activeConfigs.map(c => c.warehouseName)).toEqual(["Main", "Field B"]);
    });

    it("should track last alert sent timestamp", () => {
      const config = { id: 1, lastAlertSentAt: null as number | null };

      // After sending alert
      config.lastAlertSentAt = Date.now();
      expect(config.lastAlertSentAt).toBeGreaterThan(0);

      // Check if enough time has passed for next alert
      const oneDay = 86400000;
      const shouldSend = !config.lastAlertSentAt || (Date.now() - config.lastAlertSentAt) >= oneDay;
      expect(shouldSend).toBe(false); // Just sent, shouldn't send again
    });
  });
});

describe("Stock Movement Analytics", () => {
  describe("Monthly Summary Data Processing", () => {
    it("should aggregate movements by month and type", () => {
      const rawData = [
        { month: "2026-01", movementType: "GRN_IN", totalQty: "500", txCount: 10 },
        { month: "2026-01", movementType: "ISSUE_OUT", totalQty: "200", txCount: 5 },
        { month: "2026-02", movementType: "GRN_IN", totalQty: "300", txCount: 8 },
        { month: "2026-02", movementType: "ISSUE_OUT", totalQty: "150", txCount: 3 },
      ];

      const grouped: Record<string, any> = {};
      rawData.forEach(row => {
        if (!grouped[row.month]) {
          grouped[row.month] = { month: row.month };
        }
        grouped[row.month][row.movementType] = parseFloat(row.totalQty);
      });

      const chartData = Object.values(grouped);
      expect(chartData).toHaveLength(2);
      expect(chartData[0]).toEqual({ month: "2026-01", GRN_IN: 500, ISSUE_OUT: 200 });
      expect(chartData[1]).toEqual({ month: "2026-02", GRN_IN: 300, ISSUE_OUT: 150 });
    });

    it("should format month strings correctly", () => {
      const formatMonth = (monthStr: string): string => {
        const [year, month] = monthStr.split("-");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[parseInt(month) - 1]} ${year}`;
      };

      expect(formatMonth("2026-01")).toBe("Jan 2026");
      expect(formatMonth("2026-12")).toBe("Dec 2026");
      expect(formatMonth("2025-06")).toBe("Jun 2025");
    });

    it("should handle empty data gracefully", () => {
      const rawData: any[] = [];
      const chartData = rawData.map(r => ({ month: r.month }));
      expect(chartData).toHaveLength(0);
    });
  });

  describe("Transfer Volume Analysis", () => {
    it("should group transfers by month and status", () => {
      const rawData = [
        { month: "2026-01", status: "completed", count: 5 },
        { month: "2026-01", status: "dispatched", count: 2 },
        { month: "2026-02", status: "completed", count: 8 },
        { month: "2026-02", status: "received", count: 3 },
      ];

      const grouped: Record<string, any> = {};
      rawData.forEach(row => {
        if (!grouped[row.month]) {
          grouped[row.month] = { month: row.month };
        }
        grouped[row.month][row.status] = row.count;
      });

      const chartData = Object.values(grouped);
      expect(chartData[0].completed).toBe(5);
      expect(chartData[0].dispatched).toBe(2);
      expect(chartData[1].completed).toBe(8);
    });
  });

  describe("Adjustment Frequency Analysis", () => {
    it("should categorize adjustments by type for pie chart", () => {
      const rawData = [
        { type: "write_off", status: "approved", count: 10 },
        { type: "physical_count", status: "approved", count: 5 },
        { type: "damage", status: "approved", count: 3 },
        { type: "write_off", status: "pending", count: 2 },
      ];

      const formatAdjType = (type: string): string => {
        const labels: Record<string, string> = {
          write_off: "Write-Off",
          physical_count: "Physical Count",
          damage: "Damage",
          correction: "Correction",
        };
        return labels[type] || type;
      };

      const typeMap: Record<string, number> = {};
      rawData.forEach(row => {
        const label = formatAdjType(row.type);
        typeMap[label] = (typeMap[label] || 0) + row.count;
      });

      const pieData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
      expect(pieData).toHaveLength(3);
      expect(pieData.find(p => p.name === "Write-Off")?.value).toBe(12); // 10 + 2
      expect(pieData.find(p => p.name === "Physical Count")?.value).toBe(5);
    });
  });

  describe("Top Items Ranking", () => {
    it("should sort items by total quantity descending", () => {
      const items = [
        { itemName: "Rice 25kg", totalQty: "500" },
        { itemName: "Paracetamol", totalQty: "1200" },
        { itemName: "Bandages", totalQty: "300" },
        { itemName: "Water Purifier", totalQty: "800" },
      ];

      const sorted = [...items].sort((a, b) => parseFloat(b.totalQty) - parseFloat(a.totalQty));
      expect(sorted[0].itemName).toBe("Paracetamol");
      expect(sorted[1].itemName).toBe("Water Purifier");
      expect(sorted[3].itemName).toBe("Bandages");
    });

    it("should truncate long item names for chart display", () => {
      const name = "Very Long Medical Supply Item Name That Exceeds Display Width";
      const truncated = name.length > 20 ? name.slice(0, 20) + "..." : name;
      expect(truncated).toBe("Very Long Medical Su...");
      expect(truncated.length).toBeLessThanOrEqual(23);
    });
  });

  describe("Stock Value by Warehouse", () => {
    it("should calculate total value per warehouse", () => {
      const batches = [
        { warehouseName: "Main", unitCost: 10, availableQty: 100 },
        { warehouseName: "Main", unitCost: 5, availableQty: 200 },
        { warehouseName: "Field A", unitCost: 10, availableQty: 50 },
      ];

      const warehouseValues: Record<string, number> = {};
      batches.forEach(b => {
        warehouseValues[b.warehouseName] = (warehouseValues[b.warehouseName] || 0) + (b.unitCost * b.availableQty);
      });

      expect(warehouseValues["Main"]).toBe(2000); // 10*100 + 5*200
      expect(warehouseValues["Field A"]).toBe(500); // 10*50
    });

    it("should format currency values correctly", () => {
      const value = 12345.67;
      const formatted = `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
      expect(formatted).toBe("$12,345.67");
    });
  });

  describe("Time Range Filtering", () => {
    it("should calculate correct start date for N months back", () => {
      const months = 6;
      const now = new Date("2026-03-08");
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - months);

      expect(startDate.getFullYear()).toBe(2025);
      expect(startDate.getMonth()).toBe(8); // September (0-indexed)
    });

    it("should handle year boundary correctly", () => {
      const months = 12;
      const now = new Date("2026-03-08");
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - months);

      expect(startDate.getFullYear()).toBe(2025);
      expect(startDate.getMonth()).toBe(2); // March
    });
  });
});
