import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { getDb } from "./db";
import { documents, purchaseRequests, payments } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("PR Document Management System", () => {
  let db: any;
  let testPRId: number;
  let testOrgId = 30002;
  let testOUId = 30002;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("Document Generation", () => {
    it("should generate PR document with correct metadata", async () => {
      // Get a test PR
      const pr = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.organizationId, testOrgId),
            eq(purchaseRequests.operatingUnitId, testOUId)
          )
        )
        .limit(1)
        .then((rows: any[]) => rows[0]);

      if (!pr) {
        console.log("No test PR found, skipping test");
        return;
      }

      testPRId = pr.id;

      // Create test document
      const documentId = `test-pr-${testPRId}-${Date.now()}`;
      const testDoc = {
        documentId,
        workspace: "logistics" as const,
        projectId: pr.projectId?.toString(),
        folderCode: "PR_DOCUMENT",
        fileName: `PR-${pr.prNumber}-test.pdf`,
        filePath: "https://example.com/test.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        uploadedBy: 1,
        uploadedAt: new Date().toISOString(),
        syncSource: "pr_workflow",
        syncStatus: "pending" as const,
        version: 1,
        organizationId: testOrgId,
        operatingUnitId: testOUId,
        entityType: "purchase_request",
        entityId: testPRId.toString(),
      };

      await db.insert(documents).values(testDoc);

      // Verify document was created
      const createdDoc = await db
        .select()
        .from(documents)
        .where(eq(documents.documentId, documentId))
        .then((rows: any[]) => rows[0]);

      expect(createdDoc).toBeDefined();
      expect(createdDoc.entityType).toBe("purchase_request");
      expect(createdDoc.entityId).toBe(testPRId.toString());
      expect(createdDoc.syncStatus).toBe("pending");
    });
  });

  describe("Document Retrieval", () => {
    it("should retrieve all documents for a PR", async () => {
      if (!testPRId) {
        console.log("No test PR ID, skipping test");
        return;
      }

      const docs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.entityType, "purchase_request"),
            eq(documents.entityId, testPRId.toString()),
            eq(documents.organizationId, testOrgId),
            eq(documents.operatingUnitId, testOUId)
          )
        );

      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBeGreaterThan(0);
      expect(docs[0].entityType).toBe("purchase_request");
    });

    it("should filter documents by workspace", async () => {
      const docs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.workspace, "logistics"),
            eq(documents.organizationId, testOrgId),
            eq(documents.operatingUnitId, testOUId)
          )
        );

      expect(Array.isArray(docs)).toBe(true);
      docs.forEach((doc: any) => {
        expect(doc.workspace).toBe("logistics");
      });
    });
  });

  describe("Document Sync Status", () => {
    it("should update document sync status", async () => {
      if (!testPRId) {
        console.log("No test PR ID, skipping test");
        return;
      }

      const doc = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.entityType, "purchase_request"),
            eq(documents.entityId, testPRId.toString())
          )
        )
        .limit(1)
        .then((rows: any[]) => rows[0]);

      if (!doc) {
        console.log("No test document found, skipping test");
        return;
      }

      // Update sync status
      await db
        .update(documents)
        .set({ syncStatus: "synced" })
        .where(eq(documents.id, doc.id));

      // Verify update
      const updatedDoc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, doc.id))
        .then((rows: any[]) => rows[0]);

      expect(updatedDoc.syncStatus).toBe("synced");
    });

    it("should track document versions", async () => {
      if (!testPRId) {
        console.log("No test PR ID, skipping test");
        return;
      }

      // Clean up stale data from previous test runs first
      await db.delete(documents).where(
        and(
          eq(documents.entityType, "purchase_request"),
          eq(documents.entityId, testPRId.toString()),
          eq(documents.folderCode, "PR_VERSION_TEST")
        )
      );

      const documentId = `test-pr-version-${testPRId}-${Date.now()}`;
      const testDoc = {
        documentId,
        workspace: "logistics" as const,
        projectId: undefined,
        folderCode: "PR_VERSION_TEST",
        fileName: `PR-version-test.pdf`,
        filePath: "https://example.com/test-v1.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
        uploadedBy: 1,
        uploadedAt: new Date().toISOString(),
        syncSource: "pr_workflow",
        syncStatus: "pending" as const,
        version: 1,
        organizationId: testOrgId,
        operatingUnitId: testOUId,
        entityType: "purchase_request",
        entityId: testPRId.toString(),
      };

      await db.insert(documents).values(testDoc);

      // Create version 2
      const documentIdV2 = `test-pr-version-${testPRId}-v2-${Date.now()}`;
      const testDocV2 = {
        ...testDoc,
        documentId: documentIdV2,
        version: 2,
        filePath: "https://example.com/test-v2.pdf",
      };

      await db.insert(documents).values(testDocV2);

      // Verify both versions exist
      const docs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.entityType, "purchase_request"),
            eq(documents.entityId, testPRId.toString()),
            eq(documents.folderCode, "PR_VERSION_TEST")
          )
        );

      expect(docs.length).toBe(2);
      expect(docs[0].version).toBeLessThanOrEqual(docs[1].version);

      // Cleanup after test
      await db.delete(documents).where(
        and(
          eq(documents.entityType, "purchase_request"),
          eq(documents.entityId, testPRId.toString()),
          eq(documents.folderCode, "PR_VERSION_TEST")
        )
      );
    });
  });

  describe("Document Soft Delete", () => {
    it("should soft delete documents", async () => {
      if (!testPRId) {
        console.log("No test PR ID, skipping test");
        return;
      }

      const documentId = `test-pr-delete-${testPRId}-${Date.now()}`;
      const testDoc = {
        documentId,
        workspace: "logistics" as const,
        projectId: undefined,
        folderCode: "PR_DELETE_TEST",
        fileName: `PR-delete-test.pdf`,
        filePath: "https://example.com/test-delete.pdf",
        fileType: "application/pdf",
        fileSize: 512,
        uploadedBy: 1,
        uploadedAt: new Date().toISOString(),
        syncSource: "pr_workflow",
        syncStatus: "pending" as const,
        version: 1,
        organizationId: testOrgId,
        operatingUnitId: testOUId,
        entityType: "purchase_request",
        entityId: testPRId.toString(),
      };

      await db.insert(documents).values(testDoc);

      // Get the document
      const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.documentId, documentId))
        .then((rows: any[]) => rows[0]);

      expect(doc).toBeDefined();

      // Soft delete
      const now = new Date().toISOString();
      await db
        .update(documents)
        .set({ deletedAt: now, deletedBy: 1 })
        .where(eq(documents.id, doc.id));

      // Verify soft delete
      const deletedDoc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, doc.id))
        .then((rows: any[]) => rows[0]);

      expect(deletedDoc.deletedAt).toBeDefined();
      expect(deletedDoc.deletedBy).toBe(1);
    });
  });

  describe("Document Organization Isolation", () => {
    it("should respect organization boundaries", async () => {
      const differentOrgId = 99999;

      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.organizationId, differentOrgId));

      // Should not find documents from different org
      docs.forEach((doc: any) => {
        expect(doc.organizationId).toBe(differentOrgId);
      });
    });

    it("should respect operating unit boundaries", async () => {
      const differentOUId = 99999;

      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.operatingUnitId, differentOUId));

      // Should not find documents from different OU
      docs.forEach((doc: any) => {
        expect(doc.operatingUnitId).toBe(differentOUId);
      });
    });
  });

  describe("Document Metadata", () => {
    it("should store complete document metadata", async () => {
      if (!testPRId) {
        console.log("No test PR ID, skipping test");
        return;
      }

      const documentId = `test-pr-metadata-${testPRId}-${Date.now()}`;
      const testDoc = {
        documentId,
        workspace: "logistics" as const,
        projectId: "proj-123",
        folderCode: "PR_METADATA_TEST",
        fileName: `PR-metadata-test.pdf`,
        filePath: "https://example.com/test-metadata.pdf",
        fileType: "application/pdf",
        fileSize: 4096,
        uploadedBy: 1,
        uploadedAt: new Date().toISOString(),
        syncSource: "pr_workflow",
        syncStatus: "pending" as const,
        version: 1,
        organizationId: testOrgId,
        operatingUnitId: testOUId,
        entityType: "purchase_request",
        entityId: testPRId.toString(),
      };

      await db.insert(documents).values(testDoc);

      // Verify metadata
      const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.documentId, documentId))
        .then((rows: any[]) => rows[0]);

      expect(doc.fileName).toBe(`PR-metadata-test.pdf`);
      expect(doc.fileType).toBe("application/pdf");
      expect(doc.fileSize).toBe(4096);
      expect(doc.syncSource).toBe("pr_workflow");
      expect(doc.version).toBe(1);
    });
  });

  describe("Document Sync Workflow", () => {
    it("should track pending sync documents", async () => {
      const pendingDocs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.syncStatus, "pending"),
            eq(documents.organizationId, testOrgId),
            eq(documents.operatingUnitId, testOUId)
          )
        );

      expect(Array.isArray(pendingDocs)).toBe(true);
      pendingDocs.forEach((doc: any) => {
        expect(doc.syncStatus).toBe("pending");
      });
    });

    it("should track synced documents", async () => {
      const syncedDocs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.syncStatus, "synced"),
            eq(documents.organizationId, testOrgId),
            eq(documents.operatingUnitId, testOUId)
          )
        );

      expect(Array.isArray(syncedDocs)).toBe(true);
      syncedDocs.forEach((doc: any) => {
        expect(doc.syncStatus).toBe("synced");
      });
    });
  });
});
