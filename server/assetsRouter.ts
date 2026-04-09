import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { generateAssetTransferApprovalEvidence, generateAssetDisposalApprovalEvidence } from "./evidenceGeneration";
import { 
  financeAssets, 
  financeAssetCategories, 
  financeAssetMaintenance, 
  financeAssetTransfers, 
  financeAssetDisposals 
} from "../drizzle/schema";
import { eq, and, desc, sql, like, or, isNull } from "drizzle-orm";

/**
 * Assets Management Router
 * Provides CRUD operations for fixed asset registry, categories, maintenance, transfers, and disposals
 * Implements SOFT DELETE only - NO HARD DELETE ALLOWED
 * Compliant with INGO/Donor requirements for asset tracking
 */
export const assetsRouter = router({
  // ============================================================================
  // ASSET CATEGORIES
  // ============================================================================
  
  listCategories: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return await db.select().from(financeAssetCategories).where(
        and(
          eq(financeAssetCategories.organizationId, organizationId),
          eq(financeAssetCategories.isDeleted, false)
        )
      ).orderBy(financeAssetCategories.code);
    }),

  createCategory: scopedProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      parentId: z.number().optional(),
      depreciationRate: z.string().optional(),
      defaultUsefulLife: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(financeAssetCategories).values({
        organizationId,
        code: input.code,
        name: input.name,
        nameAr: input.nameAr || null,
        description: input.description || null,
        parentId: input.parentId || null,
        depreciationRate: input.depreciationRate || "0.00",
        defaultUsefulLife: input.defaultUsefulLife || 5,
      });
      
      return { id: Number(result.insertId), success: true };
    }),

  updateCategory: scopedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      parentId: z.number().nullable().optional(),
      depreciationRate: z.string().optional(),
      defaultUsefulLife: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      await db.update(financeAssetCategories)
        .set(updateData)
        .where(eq(financeAssetCategories.id, id));
      
      return { success: true };
    }),

  deleteCategory: scopedProcedure
    .input(z.object({
      id: z.number(),
      deletedBy: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // SOFT DELETE - set isDeleted flag
      await db.update(financeAssetCategories)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: input.deletedBy || (ctx.user?.id ?? null),
        })
        .where(eq(financeAssetCategories.id, input.id));
      
      return { success: true };
    }),

  // ============================================================================
  // ASSETS (Fixed Asset Registry)
  // ============================================================================

  listAssets: scopedProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      donorName: z.string().optional(),
      location: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [
        eq(financeAssets.organizationId, organizationId),
        eq(financeAssets.isDeleted, false)
      ];
      
      if (input.categoryId) {
        conditions.push(eq(financeAssets.categoryId, input.categoryId));
      }
      if (input.status) {
        conditions.push(eq(financeAssets.status, input.status as any));
      }
      if (input.donorName) {
        conditions.push(like(financeAssets.donorName, `%${input.donorName}%`));
      }
      if (input.location) {
        conditions.push(like(financeAssets.location, `%${input.location}%`));
      }
      
      let assets = await db.select().from(financeAssets).where(and(...conditions)).orderBy(desc(financeAssets.createdAt));
      
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        assets = assets.filter((a: any) => 
          a.assetCode?.toLowerCase().includes(searchLower) ||
          a.name?.toLowerCase().includes(searchLower) ||
          a.nameAr?.toLowerCase().includes(searchLower) ||
          a.serialNumber?.toLowerCase().includes(searchLower)
        );
      }
      
      return assets;
    }),

  getAssetById: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.select().from(financeAssets).where(
        and(
          eq(financeAssets.id, input.id),
          eq(financeAssets.isDeleted, false)
        )
      );
      
      return result[0] || null;
    }),

  getAssetStatistics: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const assets = await db.select().from(financeAssets).where(
        and(
          eq(financeAssets.organizationId, organizationId),
          eq(financeAssets.isDeleted, false)
        )
      );
      
      const totalAssets = assets.length;
      const activeAssets = assets.filter((a: any) => a.status === 'active').length;
      const inMaintenance = assets.filter((a: any) => a.status === 'in_maintenance').length;
      const disposed = assets.filter((a: any) => a.status === 'disposed').length;
      const pendingDisposal = assets.filter((a: any) => a.status === 'pending_disposal').length;
      
      const totalAcquisitionCost = assets.reduce((sum: number, a: any) => sum + parseFloat(a.acquisitionCost || '0'), 0);
      const totalCurrentValue = assets.reduce((sum: number, a: any) => sum + parseFloat(a.currentValue || '0'), 0);
      const totalDepreciation = assets.reduce((sum: number, a: any) => sum + parseFloat(a.accumulatedDepreciation || '0'), 0);
      
      // Group by category
      const byCategory: Record<string, number> = {};
      assets.forEach((a: any) => {
        const cat = a.categoryId?.toString() || 'uncategorized';
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });
      
      // Group by donor
      const byDonor: Record<string, number> = {};
      assets.forEach((a: any) => {
        const donor = a.donorName || 'No Donor';
        byDonor[donor] = (byDonor[donor] || 0) + 1;
      });
      
      return {
        totalAssets,
        activeAssets,
        inMaintenance,
        disposed,
        pendingDisposal,
        totalAcquisitionCost,
        totalCurrentValue,
        totalDepreciation,
        byCategory,
        byDonor,
      };
    }),

  createAsset: scopedProcedure
    .input(z.object({
      assetCode: z.string().min(1),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      subcategory: z.string().optional(),
      acquisitionDate: z.string().optional(),
      acquisitionCost: z.string().optional(),
      currency: z.string().optional(),
      depreciationMethod: z.enum(['straight_line', 'declining_balance', 'units_of_production', 'none']).optional(),
      usefulLifeYears: z.number().optional(),
      salvageValue: z.string().optional(),
      status: z.enum(['active', 'in_maintenance', 'disposed', 'lost', 'transferred', 'pending_disposal']).optional(),
      condition: z.enum(['excellent', 'good', 'fair', 'poor', 'non_functional']).optional(),
      location: z.string().optional(),
      assignedTo: z.string().optional(),
      donorName: z.string().optional(),
      grantCode: z.string().optional(),
      projectId: z.number().optional(),
      serialNumber: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      warrantyExpiry: z.string().optional(),
      insurancePolicy: z.string().optional(),
      insuranceExpiry: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Calculate current value (acquisition cost for new assets)
      const acquisitionCost = parseFloat(input.acquisitionCost || '0');
      
      const result = await db.insert(financeAssets).values({
        organizationId,
        assetCode: input.assetCode,
        name: input.name,
        nameAr: input.nameAr || null,
        description: input.description || null,
        categoryId: input.categoryId || null,
        subcategory: input.subcategory || null,
        acquisitionDate: input.acquisitionDate ? new Date(input.acquisitionDate) : null,
        acquisitionCost: input.acquisitionCost || "0.00",
        currency: input.currency || "USD",
        depreciationMethod: input.depreciationMethod || "straight_line",
        usefulLifeYears: input.usefulLifeYears || 5,
        salvageValue: input.salvageValue || "0.00",
        currentValue: input.acquisitionCost || "0.00",
        accumulatedDepreciation: "0.00",
        status: input.status || "active",
        condition: input.condition || "good",
        location: input.location || null,
        assignedTo: input.assignedTo || null,
        donorName: input.donorName || null,
        grantCode: input.grantCode || null,
        projectId: input.projectId || null,
        serialNumber: input.serialNumber || null,
        manufacturer: input.manufacturer || null,
        model: input.model || null,
        warrantyExpiry: input.warrantyExpiry ? new Date(input.warrantyExpiry) : null,
        insurancePolicy: input.insurancePolicy || null,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        createdBy: ctx.user?.id ?? null,
      });
      
      return { id: Number(result.insertId), success: true };
    }),

  updateAsset: scopedProcedure
    .input(z.object({
      id: z.number(),
      assetCode: z.string().optional(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().nullable().optional(),
      subcategory: z.string().optional(),
      acquisitionDate: z.string().optional(),
      acquisitionCost: z.string().optional(),
      currency: z.string().optional(),
      depreciationMethod: z.enum(['straight_line', 'declining_balance', 'units_of_production', 'none']).optional(),
      usefulLifeYears: z.number().optional(),
      salvageValue: z.string().optional(),
      currentValue: z.string().optional(),
      status: z.enum(['active', 'in_maintenance', 'disposed', 'lost', 'transferred', 'pending_disposal']).optional(),
      condition: z.enum(['excellent', 'good', 'fair', 'poor', 'non_functional']).optional(),
      location: z.string().optional(),
      assignedTo: z.string().optional(),
      donorName: z.string().optional(),
      grantCode: z.string().optional(),
      projectId: z.number().nullable().optional(),
      serialNumber: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      warrantyExpiry: z.string().nullable().optional(),
      insurancePolicy: z.string().optional(),
      insuranceExpiry: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, acquisitionDate, warrantyExpiry, insuranceExpiry, ...rest } = input;
      
      const updateData: any = { ...rest };
      if (acquisitionDate !== undefined) {
        updateData.acquisitionDate = acquisitionDate ? new Date(acquisitionDate) : null;
      }
      if (warrantyExpiry !== undefined) {
        updateData.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null;
      }
      if (insuranceExpiry !== undefined) {
        updateData.insuranceExpiry = insuranceExpiry ? new Date(insuranceExpiry) : null;
      }
      
      await db.update(financeAssets)
        .set(updateData)
        .where(eq(financeAssets.id, id));
      
      return { success: true };
    }),

  deleteAsset: scopedProcedure
    .input(z.object({
      id: z.number(),
      deletedBy: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // SOFT DELETE - set isDeleted flag
      await db.update(financeAssets)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: input.deletedBy || (ctx.user?.id ?? null),
        })
        .where(eq(financeAssets.id, input.id));
      
      return { success: true };
    }),

  importAssets: scopedProcedure
    .input(z.object({
      assets: z.array(z.object({
        assetCode: z.string(),
        name: z.string(),
        nameAr: z.string().optional(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        acquisitionDate: z.string().optional(),
        acquisitionCost: z.string().optional(),
        currency: z.string().optional(),
        status: z.string().optional(),
        condition: z.string().optional(),
        location: z.string().optional(),
        assignedTo: z.string().optional(),
        donorName: z.string().optional(),
        grantCode: z.string().optional(),
        serialNumber: z.string().optional(),
        manufacturer: z.string().optional(),
        model: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let imported = 0;
      const errors: { row: number; field: string; message: string; suggestedFix: string }[] = [];
      
      for (let i = 0; i < input.assets.length; i++) {
        const asset = input.assets[i];
        try {
          await db.insert(financeAssets).values({
            organizationId,
            assetCode: asset.assetCode,
            name: asset.name,
            nameAr: asset.nameAr || null,
            description: asset.description || null,
            categoryId: asset.categoryId || null,
            acquisitionDate: asset.acquisitionDate ? new Date(asset.acquisitionDate) : null,
            acquisitionCost: asset.acquisitionCost || "0.00",
            currency: asset.currency || "USD",
            currentValue: asset.acquisitionCost || "0.00",
            status: (asset.status as any) || "active",
            condition: (asset.condition as any) || "good",
            location: asset.location || null,
            assignedTo: asset.assignedTo || null,
            donorName: asset.donorName || null,
            grantCode: asset.grantCode || null,
            serialNumber: asset.serialNumber || null,
            manufacturer: asset.manufacturer || null,
            model: asset.model || null,
            createdBy: ctx.user?.id ?? null,
          });
          imported++;
        } catch (error: any) {
          errors.push({
            row: i + 2,
            field: 'general',
            message: error.message || 'Unknown error',
            suggestedFix: 'Check data format and required fields',
          });
        }
      }
      
      return { imported, skipped: 0, errors };
    }),

  // ============================================================================
  // MAINTENANCE RECORDS
  // ============================================================================

  listMaintenance: scopedProcedure
    .input(z.object({
      assetId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [
        eq(financeAssetMaintenance.organizationId, organizationId),
        eq(financeAssetMaintenance.isDeleted, false)
      ];
      
      if (input.assetId) {
        conditions.push(eq(financeAssetMaintenance.assetId, input.assetId));
      }
      
      return await db.select().from(financeAssetMaintenance).where(and(...conditions)).orderBy(desc(financeAssetMaintenance.performedDate));
    }),

  createMaintenance: scopedProcedure
    .input(z.object({
      assetId: z.number(),
      maintenanceType: z.enum(['preventive', 'corrective', 'inspection', 'upgrade', 'repair']).optional(),
      description: z.string().optional(),
      cost: z.string().optional(),
      currency: z.string().optional(),
      performedBy: z.string().optional(),
      vendorName: z.string().optional(),
      performedDate: z.string().optional(),
      nextDueDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(financeAssetMaintenance).values({
        organizationId,
        assetId: input.assetId,
        maintenanceType: input.maintenanceType || "preventive",
        description: input.description || null,
        cost: input.cost || "0.00",
        currency: input.currency || "USD",
        performedBy: input.performedBy || null,
        vendorName: input.vendorName || null,
        performedDate: input.performedDate ? new Date(input.performedDate) : null,
        nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : null,
        notes: input.notes || null,
        createdBy: ctx.user?.id ?? null,
      });
      
      // Update asset's last maintenance date
      if (input.performedDate) {
        await db.update(financeAssets)
          .set({
            lastMaintenanceDate: new Date(input.performedDate),
            nextMaintenanceDate: input.nextDueDate ? new Date(input.nextDueDate) : null,
          })
          .where(eq(financeAssets.id, input.assetId));
      }
      
      return { id: Number(result.insertId), success: true };
    }),

  deleteMaintenance: scopedProcedure
    .input(z.object({
      id: z.number(),
      deletedBy: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeAssetMaintenance)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: input.deletedBy || (ctx.user?.id ?? null),
        })
        .where(eq(financeAssetMaintenance.id, input.id));
      
      return { success: true };
    }),

  // ============================================================================
  // ASSET TRANSFERS
  // ============================================================================

  listTransfers: scopedProcedure
    .input(z.object({
      assetId: z.number().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [
        eq(financeAssetTransfers.organizationId, organizationId),
        eq(financeAssetTransfers.isDeleted, false)
      ];
      
      if (input.assetId) {
        conditions.push(eq(financeAssetTransfers.assetId, input.assetId));
      }
      if (input.status) {
        conditions.push(eq(financeAssetTransfers.status, input.status as any));
      }
      
      return await db.select().from(financeAssetTransfers).where(and(...conditions)).orderBy(desc(financeAssetTransfers.createdAt));
    }),

  createTransfer: scopedProcedure
    .input(z.object({
      assetId: z.number(),
      fromLocation: z.string().optional(),
      toLocation: z.string().optional(),
      fromAssignee: z.string().optional(),
      toAssignee: z.string().optional(),
      transferDate: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Generate transfer code
      const year = new Date().getFullYear();
      const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(financeAssetTransfers).where(
        eq(financeAssetTransfers.organizationId, organizationId)
      );
      const count = (countResult[0]?.count || 0) + 1;
      const transferCode = `TRF-${year}-${String(count).padStart(4, '0')}`;
      
      const result = await db.insert(financeAssetTransfers).values({
        organizationId,
        transferCode,
        assetId: input.assetId,
        fromLocation: input.fromLocation || null,
        toLocation: input.toLocation || null,
        fromAssignee: input.fromAssignee || null,
        toAssignee: input.toAssignee || null,
        transferDate: input.transferDate ? new Date(input.transferDate) : null,
        reason: input.reason || null,
        status: "pending",
        createdBy: ctx.user?.id ?? null,
      });
      
      return { id: Number(result.insertId), transferCode, success: true };
    }),

  approveTransfer: scopedProcedure
    .input(z.object({
      id: z.number(),
      approved: z.boolean(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const transfer = await db.select().from(financeAssetTransfers).where(eq(financeAssetTransfers.id, input.id));
      if (!transfer[0]) throw new Error("Transfer not found");
      
      if (input.approved) {
        // Approve and complete the transfer
        await db.update(financeAssetTransfers)
          .set({
            status: "completed",
            approvedBy: ctx.user?.id ?? null,
            approvalDate: new Date(),
          })
          .where(eq(financeAssetTransfers.id, input.id));
        
        // Update asset location and assignee
        await db.update(financeAssets)
          .set({
            location: transfer[0].toLocation,
            assignedTo: transfer[0].toAssignee,
          })
          .where(eq(financeAssets.id, transfer[0].assetId));
      } else {
        // Reject the transfer
        await db.update(financeAssetTransfers)
          .set({
            status: "rejected",
            approvedBy: ctx.user?.id ?? null,
            approvalDate: new Date(),
            rejectionReason: input.rejectionReason || null,
          })
          .where(eq(financeAssetTransfers.id, input.id));
      }
      
      // Generate evidence document if approved (async, don't block response)
      if (input.approved) {
        generateAssetTransferApprovalEvidence(
          transfer[0],
          { organizationId: ctx.scope.organizationId, operatingUnitId: ctx.scope.operatingUnitId, userId: ctx.user?.id || 0 }
        ).catch((err) => console.error("[Evidence] Failed to generate asset transfer approval evidence:", err));
      }
      
      return { success: true };
    }),

  deleteTransfer: scopedProcedure
    .input(z.object({
      id: z.number(),
      deletedBy: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(financeAssetTransfers)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: input.deletedBy || (ctx.user?.id ?? null),
        })
        .where(eq(financeAssetTransfers.id, input.id));
      
      return { success: true };
    }),

  // ============================================================================
  // ASSET DISPOSALS
  // ============================================================================

  listDisposals: scopedProcedure
    .input(z.object({
      assetId: z.number().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [
        eq(financeAssetDisposals.organizationId, organizationId),
        eq(financeAssetDisposals.isDeleted, false)
      ];
      
      if (input.assetId) {
        conditions.push(eq(financeAssetDisposals.assetId, input.assetId));
      }
      if (input.status) {
        conditions.push(eq(financeAssetDisposals.status, input.status as any));
      }
      
      return await db.select().from(financeAssetDisposals).where(and(...conditions)).orderBy(desc(financeAssetDisposals.createdAt));
    }),

  createDisposal: scopedProcedure
    .input(z.object({
      assetId: z.number(),
      disposalType: z.enum(['sale', 'donation', 'scrap', 'theft', 'loss', 'transfer_out', 'write_off']).optional(),
      proposedDate: z.string().optional(),
      proposedValue: z.string().optional(),
      reason: z.string().optional(),
      buyerInfo: z.string().optional(),
      recipientInfo: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get asset's current book value
      const asset = await db.select().from(financeAssets).where(eq(financeAssets.id, input.assetId));
      const bookValue = asset[0]?.currentValue || "0.00";
      
      // Generate disposal code
      const year = new Date().getFullYear();
      const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(financeAssetDisposals).where(
        eq(financeAssetDisposals.organizationId, organizationId)
      );
      const count = (countResult[0]?.count || 0) + 1;
      const disposalCode = `DSP-${year}-${String(count).padStart(4, '0')}`;
      
      const result = await db.insert(financeAssetDisposals).values({
        organizationId,
        disposalCode,
        assetId: input.assetId,
        disposalType: input.disposalType || "sale",
        proposedDate: input.proposedDate ? new Date(input.proposedDate) : null,
        bookValue: bookValue,
        proposedValue: input.proposedValue || "0.00",
        reason: input.reason || null,
        status: "draft",
        buyerInfo: input.buyerInfo || null,
        recipientInfo: input.recipientInfo || null,
        notes: input.notes || null,
        createdBy: ctx.user?.id ?? null,
      });
      
      // Update asset status to pending disposal
      await db.update(financeAssets)
        .set({ status: "pending_disposal" })
        .where(eq(financeAssets.id, input.assetId));
      
      return { id: Number(result.insertId), disposalCode, success: true };
    }),

  approveDisposal: scopedProcedure
    .input(z.object({
      id: z.number(),
      approved: z.boolean(),
      actualValue: z.string().optional(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const disposal = await db.select().from(financeAssetDisposals).where(eq(financeAssetDisposals.id, input.id));
      if (!disposal[0]) throw new Error("Disposal not found");
      
      if (input.approved) {
        // Approve and complete the disposal
        await db.update(financeAssetDisposals)
          .set({
            status: "completed",
            actualDate: new Date(),
            actualValue: input.actualValue || disposal[0].proposedValue,
            approvedBy: ctx.user?.id ?? null,
            approvalDate: new Date(),
          })
          .where(eq(financeAssetDisposals.id, input.id));
        
        // Update asset status to disposed
        await db.update(financeAssets)
          .set({
            status: "disposed",
            disposalDate: new Date(),
            disposalMethod: disposal[0].disposalType,
            disposalValue: input.actualValue || disposal[0].proposedValue,
            disposalReason: disposal[0].reason,
            disposalApprovedBy: ctx.user?.id ?? null,
          })
          .where(eq(financeAssets.id, disposal[0].assetId));
      } else {
        // Reject the disposal
        await db.update(financeAssetDisposals)
          .set({
            status: "rejected",
            approvedBy: ctx.user?.id ?? null,
            approvalDate: new Date(),
            rejectionReason: input.rejectionReason || null,
          })
          .where(eq(financeAssetDisposals.id, input.id));
        
        // Revert asset status to active
        await db.update(financeAssets)
          .set({ status: "active" })
          .where(eq(financeAssets.id, disposal[0].assetId));
      }
      
      // Generate evidence document if approved (async, don't block response)
      if (input.approved) {
        generateAssetDisposalApprovalEvidence(
          disposal[0],
          { organizationId: ctx.scope.organizationId, operatingUnitId: ctx.scope.operatingUnitId, userId: ctx.user?.id || 0 }
        ).catch((err) => console.error("[Evidence] Failed to generate asset disposal approval evidence:", err));
      }
      
      return { success: true };
    }),

  deleteDisposal: scopedProcedure
    .input(z.object({
      id: z.number(),
      deletedBy: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get disposal to revert asset status
      const disposal = await db.select().from(financeAssetDisposals).where(eq(financeAssetDisposals.id, input.id));
      
      await db.update(financeAssetDisposals)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: input.deletedBy || (ctx.user?.id ?? null),
        })
        .where(eq(financeAssetDisposals.id, input.id));
      
      // Revert asset status if it was pending disposal
      if (disposal[0]) {
        const asset = await db.select().from(financeAssets).where(eq(financeAssets.id, disposal[0].assetId));
        if (asset[0]?.status === 'pending_disposal') {
          await db.update(financeAssets)
            .set({ status: "active" })
            .where(eq(financeAssets.id, disposal[0].assetId));
        }
      }
      
      return { success: true };
    }),

  // ============================================================================
  // BULK IMPORT PROCEDURES
  // ============================================================================

  importCategories: scopedProcedure
    .input(z.object({
      categories: z.array(z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        nameAr: z.string().optional(),
        description: z.string().optional(),
        depreciationRate: z.string().optional(),
        defaultUsefulLife: z.number().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let imported = 0;
      const errors: { row: number; field: string; message: string; suggestedFix: string }[] = [];

      for (let i = 0; i < input.categories.length; i++) {
        const cat = input.categories[i];
        try {
          const existing = await db.select({ id: financeAssetCategories.id })
            .from(financeAssetCategories)
            .where(and(
              eq(financeAssetCategories.organizationId, organizationId),
              eq(financeAssetCategories.code, cat.code),
              eq(financeAssetCategories.isDeleted, false)
            ));
          if (existing.length > 0) {
            errors.push({ row: i + 2, field: 'code', message: `Category code "${cat.code}" already exists`, suggestedFix: 'Use a unique category code or update the existing record' });
            continue;
          }
          await db.insert(financeAssetCategories).values({
            organizationId,
            code: cat.code,
            name: cat.name,
            nameAr: cat.nameAr || null,
            description: cat.description || null,
            depreciationRate: cat.depreciationRate || '0.00',
            defaultUsefulLife: cat.defaultUsefulLife || 5,
          });
          imported++;
        } catch (error: any) {
          errors.push({ row: i + 2, field: 'general', message: error.message || 'Unknown error', suggestedFix: 'Check data format and required fields' });
        }
      }

      return { imported, skipped: 0, errors };
    }),

  importTransfers: scopedProcedure
    .input(z.object({
      transfers: z.array(z.object({
        assetId: z.number(),
        fromLocation: z.string().optional(),
        toLocation: z.string().optional(),
        fromAssignee: z.string().optional(),
        toAssignee: z.string().optional(),
        transferDate: z.string().optional(),
        reason: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let imported = 0;
      const errors: { row: number; field: string; message: string; suggestedFix: string }[] = [];
      const year = new Date().getFullYear();

      for (let i = 0; i < input.transfers.length; i++) {
        const t = input.transfers[i];
        try {
          const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(financeAssetTransfers).where(eq(financeAssetTransfers.organizationId, organizationId));
          const count = (countResult[0]?.count || 0) + 1;
          const transferCode = `TRF-${year}-${String(count).padStart(4, '0')}`;

          await db.insert(financeAssetTransfers).values({
            organizationId,
            transferCode,
            assetId: t.assetId,
            fromLocation: t.fromLocation || null,
            toLocation: t.toLocation || null,
            fromAssignee: t.fromAssignee || null,
            toAssignee: t.toAssignee || null,
            transferDate: t.transferDate ? new Date(t.transferDate) : null,
            reason: t.reason || null,
            status: 'pending',
            createdBy: ctx.user?.id ?? null,
          });
          imported++;
        } catch (error: any) {
          errors.push({ row: i + 2, field: 'general', message: error.message || 'Unknown error', suggestedFix: 'Check that Asset ID exists and data format is correct' });
        }
      }

      return { imported, skipped: 0, errors };
    }),

  importDisposals: scopedProcedure
    .input(z.object({
      disposals: z.array(z.object({
        assetId: z.number(),
        disposalType: z.enum(['sale', 'donation', 'scrap', 'theft', 'loss', 'transfer_out', 'write_off']).optional(),
        proposedDate: z.string().optional(),
        proposedValue: z.string().optional(),
        reason: z.string().optional(),
        buyerInfo: z.string().optional(),
        recipientInfo: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let imported = 0;
      const errors: { row: number; field: string; message: string; suggestedFix: string }[] = [];
      const year = new Date().getFullYear();

      for (let i = 0; i < input.disposals.length; i++) {
        const d = input.disposals[i];
        try {
          const asset = await db.select().from(financeAssets).where(eq(financeAssets.id, d.assetId));
          const bookValue = asset[0]?.currentValue || '0.00';

          const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(financeAssetDisposals).where(eq(financeAssetDisposals.organizationId, organizationId));
          const count = (countResult[0]?.count || 0) + 1;
          const disposalCode = `DSP-${year}-${String(count).padStart(4, '0')}`;

          await db.insert(financeAssetDisposals).values({
            organizationId,
            disposalCode,
            assetId: d.assetId,
            disposalType: d.disposalType || 'sale',
            proposedDate: d.proposedDate ? new Date(d.proposedDate) : null,
            bookValue,
            proposedValue: d.proposedValue || '0.00',
            reason: d.reason || null,
            status: 'draft',
            buyerInfo: d.buyerInfo || null,
            recipientInfo: d.recipientInfo || null,
            notes: d.notes || null,
            createdBy: ctx.user?.id ?? null,
          });

          await db.update(financeAssets).set({ status: 'pending_disposal' }).where(eq(financeAssets.id, d.assetId));
          imported++;
        } catch (error: any) {
          errors.push({ row: i + 2, field: 'general', message: error.message || 'Unknown error', suggestedFix: 'Check that Asset ID exists and data format is correct' });
        }
      }

      return { imported, skipped: 0, errors };
    }),
});
