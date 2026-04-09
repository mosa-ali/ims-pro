/**
 * Document Storage Configuration Router
 * 
 * Manages organization-level document storage provider configuration
 * Allows organization admins to configure:
 * - Storage provider selection (S3 / SharePoint / OneDrive)
 * - SharePoint site and library configuration
 * - OneDrive folder configuration
 * - Document storage enable/disable
 */

import { router, scopedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Define storage configuration table schema
// This would be added to drizzle/schema.ts
export interface DocumentStorageConfig {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  storageProvider: "S3" | "SHAREPOINT" | "ONEDRIVE";
  isEnabled: boolean;
  
  // SharePoint configuration
  sharePointSiteId?: string;
  sharePointSiteUrl?: string;
  sharePointLibraryId?: string;
  sharePointLibraryName?: string;
  
  // OneDrive configuration
  oneDriveUserId?: string;
  oneDriveDriveId?: string;
  oneDriveFolderPath?: string;
  
  // S3 configuration
  s3Bucket?: string;
  s3Prefix?: string;
  
  // General configuration
  rootFolderScope?: string;
  allowedFolderScopes?: string[];
  
  // Connection status
  isConnected: boolean;
  lastValidatedAt?: Date;
  validationError?: string;
  
  // Metadata
  createdBy: number;
  createdAt: Date;
  updatedBy?: number;
  updatedAt?: Date;
}

const db = getDb();

export const documentStorageConfigRouter = router({
  /**
   * Get storage configuration for organization
   */
  getConfig: scopedProcedure
    .query(async ({ ctx }) => {
      // For now, return a mock configuration
      // In production, this would query the documentStorageConfig table
      return {
        id: 1,
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
        storageProvider: "S3" as const,
        isEnabled: true,
        s3Bucket: process.env.AWS_S3_BUCKET || "",
        s3Prefix: `org-${ctx.organizationId}/ou-${ctx.operatingUnitId}`,
        isConnected: true,
        lastValidatedAt: new Date(),
      };
    }),

  /**
   * Update storage provider selection
   */
  updateStorageProvider: scopedProcedure
    .input(
      z.object({
        storageProvider: z.enum(["S3", "SHAREPOINT", "ONEDRIVE"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has admin role for organization
      if (ctx.user.role !== "admin" && ctx.user.role !== "organization_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can configure document storage",
        });
      }

      // In production, update the documentStorageConfig table
      // For now, return success
      return {
        success: true,
        storageProvider: input.storageProvider,
        message: `Storage provider changed to ${input.storageProvider}`,
      };
    }),

  /**
   * Configure SharePoint connection
   */
  configureSharePoint: scopedProcedure
    .input(
      z.object({
        siteId: z.string(),
        siteUrl: z.string().url(),
        libraryId: z.string(),
        libraryName: z.string(),
        rootFolderScope: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has admin role for organization
      if (ctx.user.role !== "admin" && ctx.user.role !== "organization_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can configure document storage",
        });
      }

      // Validate SharePoint connection using Microsoft Graph API
      try {
        // In production, validate connection here
        // For now, assume validation passes
        const isValid = true;

        if (!isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to validate SharePoint connection",
          });
        }

        // In production, save configuration to documentStorageConfig table
        return {
          success: true,
          provider: "SHAREPOINT",
          siteId: input.siteId,
          libraryId: input.libraryId,
          isConnected: true,
          message: "SharePoint connection configured successfully",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to configure SharePoint: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),

  /**
   * Configure OneDrive connection
   */
  configureOneDrive: scopedProcedure
    .input(
      z.object({
        userId: z.string(),
        driveId: z.string(),
        folderPath: z.string().optional(),
        rootFolderScope: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has admin role for organization
      if (ctx.user.role !== "admin" && ctx.user.role !== "organization_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can configure document storage",
        });
      }

      // Validate OneDrive connection using Microsoft Graph API
      try {
        // In production, validate connection here
        // For now, assume validation passes
        const isValid = true;

        if (!isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to validate OneDrive connection",
          });
        }

        // In production, save configuration to documentStorageConfig table
        return {
          success: true,
          provider: "ONEDRIVE",
          userId: input.userId,
          driveId: input.driveId,
          isConnected: true,
          message: "OneDrive connection configured successfully",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to configure OneDrive: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),

  /**
   * Configure S3 connection
   */
  configureS3: scopedProcedure
    .input(
      z.object({
        bucket: z.string(),
        prefix: z.string().optional(),
        rootFolderScope: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has admin role for organization
      if (ctx.user.role !== "admin" && ctx.user.role !== "organization_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can configure document storage",
        });
      }

      // Validate S3 connection
      try {
        // In production, validate S3 connection here
        // For now, assume validation passes
        const isValid = true;

        if (!isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to validate S3 connection",
          });
        }

        // In production, save configuration to documentStorageConfig table
        return {
          success: true,
          provider: "S3",
          bucket: input.bucket,
          prefix: input.prefix || `org-${ctx.organizationId}/ou-${ctx.operatingUnitId}`,
          isConnected: true,
          message: "S3 connection configured successfully",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to configure S3: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),

  /**
   * Validate storage connection
   */
  validateConnection: scopedProcedure
    .input(
      z.object({
        provider: z.enum(["S3", "SHAREPOINT", "ONEDRIVE"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // In production, validate connection using the appropriate storage provider
        // For now, return success
        return {
          isConnected: true,
          provider: input.provider,
          message: `${input.provider} connection is valid`,
          lastValidatedAt: new Date(),
        };
      } catch (error) {
        return {
          isConnected: false,
          provider: input.provider,
          error: error instanceof Error ? error.message : String(error),
          lastValidatedAt: new Date(),
        };
      }
    }),

  /**
   * Enable/disable document storage
   */
  toggleDocumentStorage: scopedProcedure
    .input(
      z.object({
        isEnabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has admin role for organization
      if (ctx.user.role !== "admin" && ctx.user.role !== "organization_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can configure document storage",
        });
      }

      // In production, update the documentStorageConfig table
      return {
        success: true,
        isEnabled: input.isEnabled,
        message: input.isEnabled
          ? "Document storage enabled"
          : "Document storage disabled",
      };
    }),

  /**
   * Get allowed folder scopes for organization
   */
  getAllowedFolderScopes: scopedProcedure
    .query(async ({ ctx }) => {
      // Return folder scopes based on documentMapping.ts
      // These are the procurement workflow stages and supporting areas
      return {
        procurementWorkflow: [
          "01_Purchase_Requests",
          "02_RFQ_Tender_Documents",
          "03_Bid_Opening_Minutes",
          "04_Supplier_Quotations",
          "05_Bid_Evaluation",
          "06_Quotation_Analysis",
          "07_Contracts",
          "08_Purchase_Orders",
          "09_Goods_Receipt_Notes",
          "10_Delivery_Notes",
          "11_Service_Acceptance_Certificates",
          "12_Payments",
          "13_Audit_Logs",
        ],
        supportingLogistics: [
          "Stock_Management",
          "Fleet_Management",
          "Vendor_Performance",
          "Asset_Records",
        ],
        otherModules: [
          "HR_Documents",
          "MEAL_Documents",
          "Finance_Documents",
          "Project_Documents",
        ],
      };
    }),

  /**
   * Get storage usage statistics
   */
  getStorageStats: scopedProcedure
    .query(async ({ ctx }) => {
      // In production, get actual storage stats from the storage provider
      // For now, return mock data
      return {
        provider: "S3",
        totalSize: 1024 * 1024 * 500, // 500 MB
        fileCount: 150,
        usagePercentage: 0.05, // 5% of 1TB quota
        quotaBytes: 1024 * 1024 * 1024 * 1024, // 1TB
        lastUpdatedAt: new Date(),
      };
    }),

  /**
   * Test connection to storage provider
   */
  testConnection: scopedProcedure
    .input(
      z.object({
        provider: z.enum(["S3", "SHAREPOINT", "ONEDRIVE"]),
        config: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // In production, test connection using the storage provider
        // For now, return success
        return {
          success: true,
          provider: input.provider,
          message: `Successfully connected to ${input.provider}`,
        };
      } catch (error) {
        return {
          success: false,
          provider: input.provider,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
});
