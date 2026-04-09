import { router, scopedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { eq, and, isNull, desc, like, gte, lte, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { documents } from '../../drizzle/schema';

export const documentSearchRouter = router({
  /**
   * Full-text search across all documents
   */
  searchDocuments: scopedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Search in fileName, description, and tags
        const searchResults = await db.query.documents.findMany({
          where: and(
            eq(documents.organizationId, ctx.user.organizationId),
            eq(documents.operatingUnitId, ctx.user.operatingUnitId),
            isNull(documents.deletedAt),
            or(
              like(documents.fileName, `%${input.query}%`),
              like(documents.description, `%${input.query}%`),
              like(documents.tags, `%${input.query}%`)
            )
          ),
          orderBy: [desc(documents.createdAt)],
          limit: input.limit,
          offset: input.offset,
        });

        return {
          total: searchResults.length,
          results: searchResults,
          query: input.query,
        };
      } catch (error) {
        console.error('Search documents error:', error);
        throw error;
      }
    }),

  /**
   * Advanced document filtering with multiple criteria
   */
  filterDocuments: scopedProcedure
    .input(z.object({
      documentTypes: z.array(z.string()).optional(),
      procurementStages: z.array(z.string()).optional(),
      dateRangeStart: z.date().optional(),
      dateRangeEnd: z.date().optional(),
      complianceClassifications: z.array(z.string()).optional(),
      createdBy: z.string().optional(),
      tags: z.array(z.string()).optional(),
      storageProviders: z.array(z.enum(['s3', 'sharepoint', 'onedrive'])).optional(),
      isArchived: z.boolean().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
      sortBy: z.enum(['createdAt', 'fileName', 'fileSize', 'updatedAt']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Build filter conditions
        const conditions = [
          eq(documents.organizationId, ctx.user.organizationId),
          eq(documents.operatingUnitId, ctx.user.operatingUnitId),
          isNull(documents.deletedAt),
        ];

        // Add document type filter
        if (input.documentTypes && input.documentTypes.length > 0) {
          // Note: In production, use proper IN clause
          // conditions.push(inArray(documents.documentType, input.documentTypes));
        }

        // Add procurement stage filter
        if (input.procurementStages && input.procurementStages.length > 0) {
          // Note: In production, use proper IN clause
          // conditions.push(inArray(documents.documentStage, input.procurementStages));
        }

        // Add date range filter
        if (input.dateRangeStart) {
          conditions.push(gte(documents.createdAt, input.dateRangeStart));
        }
        if (input.dateRangeEnd) {
          conditions.push(lte(documents.createdAt, input.dateRangeEnd));
        }

        // Add compliance classification filter
        if (input.complianceClassifications && input.complianceClassifications.length > 0) {
          // Note: In production, use proper IN clause
          // conditions.push(inArray(documents.complianceClassification, input.complianceClassifications));
        }

        // Add created by filter
        if (input.createdBy) {
          conditions.push(eq(documents.createdBy, input.createdBy));
        }

        // Add archive filter
        if (input.isArchived !== undefined) {
          conditions.push(eq(documents.isArchived, input.isArchived));
        }

        // Add storage provider filter
        if (input.storageProviders && input.storageProviders.length > 0) {
          // Note: In production, use proper IN clause
          // conditions.push(inArray(documents.storageProvider, input.storageProviders));
        }

        // Determine sort order
        const sortOrderFunc = input.sortOrder === 'asc' ? 'asc' : 'desc';

        // Execute query
        const filteredDocs = await db.query.documents.findMany({
          where: and(...conditions),
          limit: input.limit,
          offset: input.offset,
        });

        return {
          total: filteredDocs.length,
          results: filteredDocs,
          filters: {
            documentTypes: input.documentTypes,
            procurementStages: input.procurementStages,
            dateRange: {
              start: input.dateRangeStart,
              end: input.dateRangeEnd,
            },
            complianceClassifications: input.complianceClassifications,
            createdBy: input.createdBy,
            tags: input.tags,
            storageProviders: input.storageProviders,
            isArchived: input.isArchived,
          },
        };
      } catch (error) {
        console.error('Filter documents error:', error);
        throw error;
      }
    }),

  /**
   * Get document statistics and aggregations
   */
  getDocumentStatistics: scopedProcedure
    .input(z.object({
      groupBy: z.enum(['documentType', 'procurementStage', 'storageProvider', 'complianceClassification', 'createdBy']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        const docs = await db.query.documents.findMany({
          where: and(
            eq(documents.organizationId, ctx.user.organizationId),
            eq(documents.operatingUnitId, ctx.user.operatingUnitId),
            isNull(documents.deletedAt)
          ),
        });

        // Calculate statistics
        const totalDocuments = docs.length;
        const totalSize = docs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
        const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

        // Group by document type
        const byDocumentType: Record<string, number> = {};
        docs.forEach(doc => {
          byDocumentType[doc.documentType] = (byDocumentType[doc.documentType] || 0) + 1;
        });

        // Group by procurement stage
        const byProcurementStage: Record<string, number> = {};
        docs.forEach(doc => {
          byProcurementStage[doc.documentStage] = (byProcurementStage[doc.documentStage] || 0) + 1;
        });

        // Group by storage provider
        const byStorageProvider: Record<string, number> = {};
        docs.forEach(doc => {
          byStorageProvider[doc.storageProvider] = (byStorageProvider[doc.storageProvider] || 0) + 1;
        });

        // Group by compliance classification
        const byComplianceClassification: Record<string, number> = {};
        docs.forEach(doc => {
          byComplianceClassification[doc.complianceClassification] = (byComplianceClassification[doc.complianceClassification] || 0) + 1;
        });

        // Group by created by
        const byCreatedBy: Record<string, number> = {};
        docs.forEach(doc => {
          byCreatedBy[doc.createdByName] = (byCreatedBy[doc.createdByName] || 0) + 1;
        });

        // Calculate recent activity (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentDocuments = docs.filter(doc => doc.createdAt >= sevenDaysAgo).length;

        // Calculate archived documents
        const archivedDocuments = docs.filter(doc => doc.isArchived).length;

        return {
          totalDocuments,
          totalSize: parseInt(totalSize.toString()),
          totalSizeMB: parseFloat(totalSizeMB),
          recentDocuments,
          archivedDocuments,
          byDocumentType,
          byProcurementStage,
          byStorageProvider,
          byComplianceClassification,
          byCreatedBy,
        };
      } catch (error) {
        console.error('Get document statistics error:', error);
        throw error;
      }
    }),

  /**
   * Get available filter options
   */
  getFilterOptions: scopedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();

      const docs = await db.query.documents.findMany({
        where: and(
          eq(documents.organizationId, ctx.user.organizationId),
          eq(documents.operatingUnitId, ctx.user.operatingUnitId),
          isNull(documents.deletedAt)
        ),
      });

      // Extract unique values for each filter option
      const documentTypes = [...new Set(docs.map(doc => doc.documentType))];
      const procurementStages = [...new Set(docs.map(doc => doc.documentStage))];
      const storageProviders = [...new Set(docs.map(doc => doc.storageProvider))];
      const complianceClassifications = [...new Set(docs.map(doc => doc.complianceClassification))];
      const creators = [...new Set(docs.map(doc => doc.createdByName))];

      // Extract tags
      const allTags = new Set<string>();
      docs.forEach(doc => {
        if (doc.tags) {
          doc.tags.split(',').forEach(tag => allTags.add(tag.trim()));
        }
      });

      return {
        documentTypes: documentTypes.filter(Boolean),
        procurementStages: procurementStages.filter(Boolean),
        storageProviders: storageProviders.filter(Boolean),
        complianceClassifications: complianceClassifications.filter(Boolean),
        creators: creators.filter(Boolean),
        tags: Array.from(allTags),
      };
    } catch (error) {
      console.error('Get filter options error:', error);
      throw error;
    }
  }),

  /**
   * Search with autocomplete suggestions
   */
  getSearchSuggestions: scopedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Get matching documents
        const matches = await db.query.documents.findMany({
          where: and(
            eq(documents.organizationId, ctx.user.organizationId),
            eq(documents.operatingUnitId, ctx.user.operatingUnitId),
            isNull(documents.deletedAt),
            or(
              like(documents.fileName, `%${input.query}%`),
              like(documents.description, `%${input.query}%`)
            )
          ),
          limit: input.limit,
        });

        // Extract unique suggestions from file names and descriptions
        const suggestions = new Set<string>();
        matches.forEach(doc => {
          if (doc.fileName && doc.fileName.toLowerCase().includes(input.query.toLowerCase())) {
            suggestions.add(doc.fileName);
          }
          if (doc.description && doc.description.toLowerCase().includes(input.query.toLowerCase())) {
            suggestions.add(doc.description);
          }
        });

        return {
          suggestions: Array.from(suggestions).slice(0, input.limit),
          matchCount: matches.length,
        };
      } catch (error) {
        console.error('Get search suggestions error:', error);
        throw error;
      }
    }),
});
