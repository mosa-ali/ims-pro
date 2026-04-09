import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  vendors,
  vendorBlacklistCases,
  vendorBlacklistEvidence,
  vendorBlacklistSignatures,
  vendorBlacklistAuditLog,
  userOrganizations,
  blacklistWorkflowConfig,
} from "../drizzle/schema";
import { eq, and, isNull, like, or, sql, desc, asc, inArray } from "drizzle-orm";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { notifyOwner } from "./_core/notification";

// ── Role-based access control ──────────────────────────────────
// Roles that can validate (move from submitted → under_validation)
const VALIDATOR_ROLES = ["organization_admin", "office_manager", "project_manager", "logistics_manager", "compliance_officer"];
// Roles that can approve/reject (move from pending_approval → approved/rejected)
const APPROVER_ROLES = ["organization_admin", "office_manager", "project_manager"];
// Roles that can revoke an active blacklist
const REVOKER_ROLES = ["organization_admin", "office_manager", "project_manager"];

/**
 * Check if the user has one of the required roles.
 * Checks: users.role, userOrganizations.platformRole, and orgRoles JSON array.
 */
async function checkUserRole(
  db: any,
  userId: number,
  organizationId: number,
  allowedRoles: string[]
): Promise<{ hasRole: boolean; userRoles: string[] }> {
  // Get user's base role
  const [userRow] = await db
    .select({ role: sql<string>`role` })
    .from(sql`users`)
    .where(sql`id = ${userId}`);
  const baseRole = userRow?.role || "user";

  // Get user's org-level roles
  const [orgRow] = await db
    .select({
      platformRole: userOrganizations.platformRole,
      orgRoles: userOrganizations.orgRoles,
    })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, userId),
        eq(userOrganizations.organizationId, organizationId)
      )
    );

  const allRoles: string[] = [baseRole];
  if (orgRow?.platformRole) allRoles.push(orgRow.platformRole);
  if (orgRow?.orgRoles) {
    try {
      const parsed = JSON.parse(orgRow.orgRoles);
      if (Array.isArray(parsed)) allRoles.push(...parsed);
    } catch {}
  }

  // Platform admins and organization admins always have access
  if (allRoles.includes("platform_admin") || allRoles.includes("platform_super_admin")) {
    return { hasRole: true, userRoles: allRoles };
  }

  const hasRole = allRoles.some((r) => allowedRoles.includes(r));
  return { hasRole, userRoles: allRoles };
}

// ── helpers ──────────────────────────────────────────────────

async function logAudit(
  db: any,
  params: {
    organizationId: number;
    operatingUnitId: number;
    caseId: number;
    userId: number;
    userName: string;
    actionType: string;
    previousStatus?: string;
    newStatus?: string;
    details?: string;
    ipAddress?: string;
  }
) {
  await db.insert(vendorBlacklistAuditLog).values({
    organizationId: params.organizationId,
    operatingUnitId: params.operatingUnitId,
    caseId: params.caseId,
    userId: params.userId,
    userName: params.userName,
    actionType: params.actionType,
    previousStatus: params.previousStatus ?? null,
    newStatus: params.newStatus ?? null,
    details: params.details ?? null,
    ipAddress: params.ipAddress ?? null,
  });
}

async function generateCaseNumber(
  db: any,
  organizationId: number
): Promise<string> {
  const year = new Date().getFullYear();
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(vendorBlacklistCases)
    .where(
      and(
        eq(vendorBlacklistCases.organizationId, organizationId),
        sql`YEAR(${vendorBlacklistCases.createdAt}) = ${year}`
      )
    );
  const seq = (countResult?.count ?? 0) + 1;
  return `BL-${year}-${String(seq).padStart(4, "0")}`;
}

// ── router ───────────────────────────────────────────────────

export const blacklistRouter = router({
  // ── List all blacklist cases ──
  list: scopedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "draft",
            "submitted",
            "under_validation",
            "pending_approval",
            "approved",
            "rejected",
            "revoked",
            "expired",
          ])
          .optional(),
        search: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      const conditions: any[] = [
        eq(vendorBlacklistCases.organizationId, organizationId),
        isNull(vendorBlacklistCases.deletedAt),
      ];
      if (operatingUnitId) {
        conditions.push(
          eq(vendorBlacklistCases.operatingUnitId, operatingUnitId)
        );
      }
      if (input.status) {
        conditions.push(eq(vendorBlacklistCases.status, input.status));
      }

      const cases = await db
        .select()
        .from(vendorBlacklistCases)
        .where(and(...conditions))
        .orderBy(desc(vendorBlacklistCases.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Fetch vendor details for each case
      const vendorIds = [...new Set(cases.map((c: any) => c.vendorId))];
      let vendorMap: Record<number, any> = {};
      if (vendorIds.length > 0) {
        const vendorRows = await db
          .select()
          .from(vendors)
          .where(inArray(vendors.id, vendorIds));
        vendorMap = Object.fromEntries(
          vendorRows.map((v: any) => [v.id, v])
        );
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(vendorBlacklistCases)
        .where(and(...conditions));

      return {
        cases: cases.map((c: any) => ({
          ...c,
          vendor: vendorMap[c.vendorId] ?? null,
        })),
        total: countResult?.count ?? 0,
      };
    }),

  // ── Get single case with evidence, signatures, audit log ──
  getCase: scopedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      const [caseRow] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.id, input.caseId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      if (!caseRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }

      // Get vendor details
      const [vendor] = await db
        .select()
        .from(vendors)
        .where(eq(vendors.id, caseRow.vendorId));

      // Get evidence
      const evidence = await db
        .select()
        .from(vendorBlacklistEvidence)
        .where(
          and(
            eq(vendorBlacklistEvidence.caseId, input.caseId),
            isNull(vendorBlacklistEvidence.deletedAt)
          )
        )
        .orderBy(desc(vendorBlacklistEvidence.uploadedAt));

      // Get signatures
      const signatures = await db
        .select()
        .from(vendorBlacklistSignatures)
        .where(eq(vendorBlacklistSignatures.caseId, input.caseId))
        .orderBy(desc(vendorBlacklistSignatures.signedAt));

      // Get audit log
      const auditLog = await db
        .select()
        .from(vendorBlacklistAuditLog)
        .where(eq(vendorBlacklistAuditLog.caseId, input.caseId))
        .orderBy(desc(vendorBlacklistAuditLog.createdAt));

      return {
        ...caseRow,
        vendor: vendor ?? null,
        evidence,
        signatures,
        auditLog,
      };
    }),

  // ── Create blacklist request (Draft) ──
  createRequest: scopedProcedure
    .input(
      z.object({
        vendorId: z.number(),
        reasonCategory: z.enum([
          "fraud_falsified_docs",
          "corruption_bribery",
          "sanctions_screening_failure",
          "repeated_non_performance",
          "contract_abandonment",
          "repeated_delivery_failure",
          "refusal_correct_defects",
          "false_declarations",
          "conflict_of_interest",
          "other",
        ]),
        detailedJustification: z.string().min(10),
        incidentDate: z.string().optional(),
        relatedReference: z.string().optional(),
        recommendedDuration: z.string().optional(),
        additionalComments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Verify vendor exists and belongs to same org
      const [vendor] = await db
        .select()
        .from(vendors)
        .where(
          and(
            eq(vendors.id, input.vendorId),
            eq(vendors.organizationId, organizationId),
            isNull(vendors.deletedAt)
          )
        );
      if (!vendor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vendor not found in this organization",
        });
      }

      // Check if vendor already has an active blacklist case
      const [existingCase] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.vendorId, input.vendorId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            inArray(vendorBlacklistCases.status, [
              "draft",
              "submitted",
              "under_validation",
              "pending_approval",
              "approved",
            ]),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );
      if (existingCase) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Vendor already has an active blacklist case (${existingCase.caseNumber})`,
        });
      }

      const caseNumber = await generateCaseNumber(db, organizationId);

      const [result] = await db.insert(vendorBlacklistCases).values({
        organizationId,
        operatingUnitId,
        vendorId: input.vendorId,
        caseNumber,
        status: "draft",
        reasonCategory: input.reasonCategory,
        detailedJustification: input.detailedJustification,
        incidentDate: input.incidentDate ?? null,
        relatedReference: input.relatedReference ?? null,
        recommendedDuration: input.recommendedDuration ?? null,
        additionalComments: input.additionalComments ?? null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      const caseId = result.insertId;

      await logAudit(db, {
        organizationId,
        operatingUnitId,
        caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "case_created",
        newStatus: "draft",
        details: `Blacklist request created for vendor: ${vendor.name} (${vendor.vendorCode}). Reason: ${input.reasonCategory}`,
      });

      return { id: caseId, caseNumber };
    }),

  // ── Update blacklist request (Draft/Submitted only) ──
  updateRequest: scopedProcedure
    .input(
      z.object({
        caseId: z.number(),
        reasonCategory: z
          .enum([
            "fraud_falsified_docs",
            "corruption_bribery",
            "sanctions_screening_failure",
            "repeated_non_performance",
            "contract_abandonment",
            "repeated_delivery_failure",
            "refusal_correct_defects",
            "false_declarations",
            "conflict_of_interest",
            "other",
          ])
          .optional(),
        detailedJustification: z.string().min(10).optional(),
        incidentDate: z.string().optional(),
        relatedReference: z.string().optional(),
        recommendedDuration: z.string().optional(),
        additionalComments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [existing] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.id, input.caseId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }
      if (!["draft", "submitted"].includes(existing.status)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only update cases in Draft or Submitted status",
        });
      }

      const updates: any = { updatedBy: ctx.user.id };
      if (input.reasonCategory) updates.reasonCategory = input.reasonCategory;
      if (input.detailedJustification)
        updates.detailedJustification = input.detailedJustification;
      if (input.incidentDate !== undefined)
        updates.incidentDate = input.incidentDate;
      if (input.relatedReference !== undefined)
        updates.relatedReference = input.relatedReference;
      if (input.recommendedDuration !== undefined)
        updates.recommendedDuration = input.recommendedDuration;
      if (input.additionalComments !== undefined)
        updates.additionalComments = input.additionalComments;

      await db
        .update(vendorBlacklistCases)
        .set(updates)
        .where(eq(vendorBlacklistCases.id, input.caseId));

      await logAudit(db, {
        organizationId,
        operatingUnitId: existing.operatingUnitId,
        caseId: input.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "case_updated",
        details: "Blacklist request details updated",
      });

      return { success: true };
    }),

  // ── Submit request with submitter signature (Draft → Submitted) ──
  submitRequest: scopedProcedure
    .input(
      z.object({
        caseId: z.number(),
        signatureDataUrl: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      const [existing] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.id, input.caseId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }
      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only draft cases can be submitted",
        });
      }

      // Save submitter signature if provided
      let signatureHash: string | null = null;
      if (input.signatureDataUrl) {
        const signatureBuffer = Buffer.from(
          input.signatureDataUrl.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        );
        const sigKey = `blacklist-signatures/${organizationId}/${input.caseId}-submitter-${nanoid(8)}.png`;
        const { url: signatureUrl, key: signatureFileKey } = await storagePut(
          sigKey,
          signatureBuffer,
          "image/png"
        );

        signatureHash = crypto
          .createHash("sha256")
          .update(
            JSON.stringify({
              caseId: input.caseId,
              signerId: ctx.user.id,
              signerRole: "submitter",
              timestamp: new Date().toISOString(),
              caseNumber: existing.caseNumber,
            })
          )
          .digest("hex");

        await db.insert(vendorBlacklistSignatures).values({
          organizationId,
          operatingUnitId,
          caseId: input.caseId,
          signerId: ctx.user.id,
          signerName: ctx.user.name ?? ctx.user.email ?? "Unknown",
          signerRole: "submitter",
          signatureImageUrl: signatureUrl,
          signatureImageKey: signatureFileKey,
          signatureHash,
          status: "active",
        });

        await logAudit(db, {
          organizationId,
          operatingUnitId: existing.operatingUnitId,
          caseId: input.caseId,
          userId: ctx.user.id,
          userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
          actionType: "signature_added",
          details: `Submitter signature recorded. Hash: ${signatureHash.substring(0, 16)}...`,
        });
      }

      await db
        .update(vendorBlacklistCases)
        .set({
          status: "submitted",
          submittedAt: sql`NOW()`,
          submittedBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .where(eq(vendorBlacklistCases.id, input.caseId));

      await logAudit(db, {
        organizationId,
        operatingUnitId: existing.operatingUnitId,
        caseId: input.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "case_submitted",
        previousStatus: "draft",
        newStatus: "submitted",
        details: input.signatureDataUrl
          ? "Blacklist request submitted with digital signature"
          : "Blacklist request submitted for validation",
      });

      // Notify owner about submission
      await notifyOwner({
        title: `New Blacklist Case ${existing.caseNumber} Submitted`,
        content: `A new blacklist case ${existing.caseNumber} has been submitted by ${ctx.user.name ?? ctx.user.email} for vendor ${existing.vendorId}. It requires validation.`,
      }).catch(() => {});

      return { success: true, signatureHash };
    }),

  // ── Validate request (Submitted → Under Validation) ──
  validateRequest: scopedProcedure
    .input(
      z.object({
        caseId: z.number(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Role-based access check
      const { hasRole } = await checkUserRole(db, ctx.user.id, organizationId, VALIDATOR_ROLES);
      if (!hasRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to validate blacklist cases. Required roles: Office Manager, Project Manager, Logistics Manager, or Compliance Officer.",
        });
      }

      const [existing] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.id, input.caseId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }
      if (existing.status !== "submitted") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only submitted cases can be validated",
        });
      }

      await db
        .update(vendorBlacklistCases)
        .set({
          status: "under_validation",
          validatedAt: sql`NOW()`,
          validatedBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .where(eq(vendorBlacklistCases.id, input.caseId));

      await logAudit(db, {
        organizationId,
        operatingUnitId: existing.operatingUnitId,
        caseId: input.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "validation_performed",
        previousStatus: "submitted",
        newStatus: "under_validation",
        details: input.comments
          ? `Validation performed. Comments: ${input.comments}`
          : "Validation performed",
      });

      // Notify owner about validation
      await notifyOwner({
        title: `Blacklist Case ${existing.caseNumber} Validated`,
        content: `Case ${existing.caseNumber} has been validated by ${ctx.user.name ?? ctx.user.email}. It is now under validation review.`,
      }).catch(() => {});

      return { success: true };
    }),

  // ── Move to Pending Approval (Under Validation → Pending Approval) ──
  moveToApproval: scopedProcedure
    .input(
      z.object({
        caseId: z.number(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Role-based access check
      const { hasRole } = await checkUserRole(db, ctx.user.id, organizationId, VALIDATOR_ROLES);
      if (!hasRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to move cases to approval. Required roles: Office Manager, Project Manager, Logistics Manager, or Compliance Officer.",
        });
      }

      const [existing] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.id, input.caseId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }
      if (existing.status !== "under_validation") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only cases under validation can be moved to approval",
        });
      }

      await db
        .update(vendorBlacklistCases)
        .set({
          status: "pending_approval",
          updatedBy: ctx.user.id,
        })
        .where(eq(vendorBlacklistCases.id, input.caseId));

      await logAudit(db, {
        organizationId,
        operatingUnitId: existing.operatingUnitId,
        caseId: input.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "validation_performed",
        previousStatus: "under_validation",
        newStatus: "pending_approval",
        details: input.comments
          ? `Moved to pending approval. Comments: ${input.comments}`
          : "Moved to pending approval after validation",
      });

      // Notify owner that case is now pending approval
      await notifyOwner({
        title: `Blacklist Case ${existing.caseNumber} Pending Approval`,
        content: `Case ${existing.caseNumber} has passed validation and is now pending manager approval. Submitted by ${ctx.user.name ?? ctx.user.email}.`,
      }).catch(() => {});

      return { success: true };
    }),

  // ── Approve request with digital signature ──
  approveRequest: scopedProcedure
    .input(
      z.object({
        caseId: z.number(),
        signatureDataUrl: z.string().min(1),
        blacklistStartDate: z.string(),
        expiryDate: z.string().optional(),
        reviewDate: z.string().optional(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Role-based access check
      const { hasRole } = await checkUserRole(db, ctx.user.id, organizationId, APPROVER_ROLES);
      if (!hasRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to approve blacklist cases. Required roles: Office Manager or Project Manager.",
        });
      }

      const [existing] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.id, input.caseId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }
      if (existing.status !== "pending_approval") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only cases pending approval can be approved",
        });
      }

      // Upload signature image to S3
      const signatureBuffer = Buffer.from(
        input.signatureDataUrl.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
      const sigKey = `blacklist-signatures/${organizationId}/${input.caseId}-${nanoid(8)}.png`;
      const { url: signatureUrl, key: signatureFileKey } = await storagePut(
        sigKey,
        signatureBuffer,
        "image/png"
      );

      // Create signature hash for verification
      const signatureHash = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            caseId: input.caseId,
            signerId: ctx.user.id,
            timestamp: new Date().toISOString(),
            caseNumber: existing.caseNumber,
          })
        )
        .digest("hex");

      // Save signature record
      await db.insert(vendorBlacklistSignatures).values({
        organizationId,
        operatingUnitId,
        caseId: input.caseId,
        signerId: ctx.user.id,
        signerName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        signerRole: "approver",
        signatureImageUrl: signatureUrl,
        signatureImageKey: signatureFileKey,
        signatureHash,
        status: "active",
      });

      // Update case to approved
      await db
        .update(vendorBlacklistCases)
        .set({
          status: "approved",
          approvedAt: sql`NOW()`,
          approvedBy: ctx.user.id,
          blacklistStartDate: input.blacklistStartDate,
          expiryDate: input.expiryDate ?? null,
          reviewDate: input.reviewDate ?? null,
          updatedBy: ctx.user.id,
        })
        .where(eq(vendorBlacklistCases.id, input.caseId));

      // Update vendor record to mark as blacklisted
      await db
        .update(vendors)
        .set({
          isBlacklisted: 1,
          blacklistReason: existing.detailedJustification,
          updatedBy: ctx.user.id,
        })
        .where(eq(vendors.id, existing.vendorId));

      await logAudit(db, {
        organizationId,
        operatingUnitId,
        caseId: input.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "case_approved",
        previousStatus: "pending_approval",
        newStatus: "approved",
        details: input.comments
          ? `Case approved with digital signature. Comments: ${input.comments}`
          : "Case approved with digital signature",
      });

      await logAudit(db, {
        organizationId,
        operatingUnitId,
        caseId: input.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "signature_added",
        details: `Digital signature recorded. Hash: ${signatureHash.substring(0, 16)}...`,
      });

      // Notify owner about approval
      await notifyOwner({
        title: `Blacklist Case ${existing.caseNumber} Approved`,
        content: `Case ${existing.caseNumber} has been approved by ${ctx.user.name ?? ctx.user.email}. The vendor is now blacklisted.${input.expiryDate ? ` Expiry date: ${input.expiryDate}.` : " Duration: Permanent."}`,
      }).catch(() => {});

      return { success: true, signatureHash };
    }),

  // ── Reject request ──
  rejectRequest: scopedProcedure
    .input(
      z.object({
        caseId: z.number(),
        rejectionReason: z.string().min(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Role-based access check
      const { hasRole } = await checkUserRole(db, ctx.user.id, organizationId, APPROVER_ROLES);
      if (!hasRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to reject blacklist cases. Required roles: Office Manager or Project Manager.",
        });
      }

      const [existing] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.id, input.caseId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }
      if (
        !["submitted", "under_validation", "pending_approval"].includes(
          existing.status
        )
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot reject cases in this status",
        });
      }

      await db
        .update(vendorBlacklistCases)
        .set({
          status: "rejected",
          rejectedAt: sql`NOW()`,
          rejectedBy: ctx.user.id,
          rejectionReason: input.rejectionReason,
          updatedBy: ctx.user.id,
        })
        .where(eq(vendorBlacklistCases.id, input.caseId));

      await logAudit(db, {
        organizationId,
        operatingUnitId: existing.operatingUnitId,
        caseId: input.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "case_rejected",
        previousStatus: existing.status,
        newStatus: "rejected",
        details: `Case rejected. Reason: ${input.rejectionReason}`,
      });

      // Notify owner about rejection
      await notifyOwner({
        title: `Blacklist Case ${existing.caseNumber} Rejected`,
        content: `Case ${existing.caseNumber} has been rejected by ${ctx.user.name ?? ctx.user.email}. Reason: ${input.rejectionReason}`,
      }).catch(() => {});

      return { success: true };
    }),

  // ── Revoke blacklist (Approved → Revoked) ──
  revokeBlacklist: scopedProcedure
    .input(
      z.object({
        caseId: z.number(),
        revocationReason: z.string().min(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Role-based access check
      const { hasRole } = await checkUserRole(db, ctx.user.id, organizationId, REVOKER_ROLES);
      if (!hasRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to revoke blacklist cases. Required roles: Office Manager or Project Manager.",
        });
      }

      const [existing] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.id, input.caseId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }
      if (existing.status !== "approved") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only approved cases can be revoked",
        });
      }

      await db
        .update(vendorBlacklistCases)
        .set({
          status: "revoked",
          revocationReason: input.revocationReason,
          revokedAt: sql`NOW()`,
          revokedBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .where(eq(vendorBlacklistCases.id, input.caseId));

      // Remove blacklist flag from vendor
      await db
        .update(vendors)
        .set({
          isBlacklisted: 0,
          blacklistReason: null,
          updatedBy: ctx.user.id,
        })
        .where(eq(vendors.id, existing.vendorId));

      await logAudit(db, {
        organizationId,
        operatingUnitId: existing.operatingUnitId,
        caseId: input.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "case_revoked",
        previousStatus: "approved",
        newStatus: "revoked",
        details: `Blacklist revoked. Reason: ${input.revocationReason}`,
      });

      // Notify owner about revocation
      await notifyOwner({
        title: `Blacklist Case ${existing.caseNumber} Revoked`,
        content: `Case ${existing.caseNumber} has been revoked by ${ctx.user.name ?? ctx.user.email}. The vendor is no longer blacklisted. Reason: ${input.revocationReason}`,
      }).catch(() => {});

      return { success: true };
    }),

  // ── Revoke a signature (admin only) ──
  revokeSignature: scopedProcedure
    .input(
      z.object({
        signatureId: z.number(),
        revocationReason: z.string().min(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [sig] = await db
        .select()
        .from(vendorBlacklistSignatures)
        .where(
          and(
            eq(vendorBlacklistSignatures.id, input.signatureId),
            eq(vendorBlacklistSignatures.organizationId, organizationId)
          )
        );

      if (!sig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Signature not found",
        });
      }
      if (sig.status === "revoked") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Signature already revoked",
        });
      }

      await db
        .update(vendorBlacklistSignatures)
        .set({
          status: "revoked",
          revocationReason: input.revocationReason,
          revokedAt: sql`NOW()`,
          revokedBy: ctx.user.id,
        })
        .where(eq(vendorBlacklistSignatures.id, input.signatureId));

      await logAudit(db, {
        organizationId,
        operatingUnitId: sig.operatingUnitId,
        caseId: sig.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "signature_revoked",
        details: `Signature revoked. Reason: ${input.revocationReason}`,
      });

      return { success: true };
    }),

  // ── Upload evidence ──
  uploadEvidence: scopedProcedure
    .input(
      z.object({
        caseId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(),
        fileType: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Verify case exists
      const [existing] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.id, input.caseId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }

      // Upload file to S3
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.fileName.split(".").pop() || "bin";
      const fileKey = `blacklist-evidence/${organizationId}/${input.caseId}/${nanoid(8)}.${ext}`;
      const { url: fileUrl } = await storagePut(
        fileKey,
        fileBuffer,
        input.fileType
      );

      const [result] = await db.insert(vendorBlacklistEvidence).values({
        organizationId,
        operatingUnitId,
        caseId: input.caseId,
        fileName: input.fileName,
        fileUrl,
        fileKey,
        fileType: input.fileType,
        fileSize: fileBuffer.length,
        description: input.description ?? null,
        uploadedBy: ctx.user.id,
      });

      await logAudit(db, {
        organizationId,
        operatingUnitId,
        caseId: input.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "evidence_uploaded",
        details: `Evidence uploaded: ${input.fileName}`,
      });

      return { id: result.insertId, fileUrl };
    }),

  // ── Remove evidence (soft delete) ──
  removeEvidence: scopedProcedure
    .input(z.object({ evidenceId: z.number(), caseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      const [evidence] = await db
        .select()
        .from(vendorBlacklistEvidence)
        .where(
          and(
            eq(vendorBlacklistEvidence.id, input.evidenceId),
            eq(vendorBlacklistEvidence.organizationId, organizationId),
            isNull(vendorBlacklistEvidence.deletedAt)
          )
        );

      if (!evidence) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evidence not found",
        });
      }

      await db
        .update(vendorBlacklistEvidence)
        .set({
          deletedAt: sql`NOW()`,
          deletedBy: ctx.user.id,
        })
        .where(eq(vendorBlacklistEvidence.id, input.evidenceId));

      await logAudit(db, {
        organizationId,
        operatingUnitId,
        caseId: input.caseId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
        actionType: "evidence_removed",
        details: `Evidence removed: ${evidence.fileName}`,
      });

      return { success: true };
    }),

  // ── Get audit log for a case ──
  getAuditLog: scopedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const logs = await db
        .select()
        .from(vendorBlacklistAuditLog)
        .where(
          and(
            eq(vendorBlacklistAuditLog.caseId, input.caseId),
            eq(vendorBlacklistAuditLog.organizationId, organizationId)
          )
        )
        .orderBy(desc(vendorBlacklistAuditLog.createdAt));

      return logs;
    }),

  // ── Check if a vendor is blacklisted (cross-module) ──
  checkVendorBlacklisted: scopedProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [activeCase] = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.vendorId, input.vendorId),
            eq(vendorBlacklistCases.organizationId, organizationId),
            eq(vendorBlacklistCases.status, "approved"),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      return {
        isBlacklisted: !!activeCase,
        caseNumber: activeCase?.caseNumber ?? null,
        reason: activeCase?.reasonCategory ?? null,
        since: activeCase?.blacklistStartDate ?? null,
        expiryDate: activeCase?.expiryDate ?? null,
      };
    }),

  // ── Get summary stats for dashboard ──
  getSummary: scopedProcedure.query(async ({ ctx }) => {
    const { organizationId, operatingUnitId } = ctx.scope;
    const db = await getDb();

    const conditions: any[] = [
      eq(vendorBlacklistCases.organizationId, organizationId),
      isNull(vendorBlacklistCases.deletedAt),
    ];
    if (operatingUnitId) {
      conditions.push(
        eq(vendorBlacklistCases.operatingUnitId, operatingUnitId)
      );
    }

    const allCases = await db
      .select({
        status: vendorBlacklistCases.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(vendorBlacklistCases)
      .where(and(...conditions))
      .groupBy(vendorBlacklistCases.status);

    const statusMap: Record<string, number> = {};
    allCases.forEach((row: any) => {
      statusMap[row.status] = Number(row.count);
    });

    return {
      total:
        Object.values(statusMap).reduce((a, b) => a + b, 0),
      draft: statusMap["draft"] ?? 0,
      submitted: statusMap["submitted"] ?? 0,
      underValidation: statusMap["under_validation"] ?? 0,
      pendingApproval: statusMap["pending_approval"] ?? 0,
      approved: statusMap["approved"] ?? 0,
      rejected: statusMap["rejected"] ?? 0,
      revoked: statusMap["revoked"] ?? 0,
      expired: statusMap["expired"] ?? 0,
    };
  }),

  // ── Check and expire overdue blacklist cases ──
  checkExpiredCases: scopedProcedure
    .mutation(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Find all approved cases with an expiry date that has passed
      const expiredCases = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.organizationId, organizationId),
            eq(vendorBlacklistCases.status, "approved"),
            isNull(vendorBlacklistCases.deletedAt),
            sql`${vendorBlacklistCases.expiryDate} IS NOT NULL`,
            sql`${vendorBlacklistCases.expiryDate} <= CURDATE()`
          )
        );

      let expiredCount = 0;
      for (const c of expiredCases) {
        // Update case status to expired
        await db
          .update(vendorBlacklistCases)
          .set({
            status: "expired",
            updatedBy: ctx.user.id,
          })
          .where(eq(vendorBlacklistCases.id, c.id));

        // Remove blacklist flag from vendor
        await db
          .update(vendors)
          .set({
            isBlacklisted: 0,
            blacklistReason: null,
            updatedBy: ctx.user.id,
          })
          .where(eq(vendors.id, c.vendorId));

        // Log the expiry
        await logAudit(db, {
          organizationId,
          operatingUnitId: c.operatingUnitId,
          caseId: c.id,
          userId: ctx.user.id,
          userName: "System (Auto-Expiry)",
          actionType: "case_expired",
          previousStatus: "approved",
          newStatus: "expired",
          details: `Blacklist case automatically expired. Expiry date: ${c.expiryDate}`,
        });

        expiredCount++;
      }

      if (expiredCount > 0) {
        await notifyOwner({
          title: `${expiredCount} Blacklist Case(s) Expired`,
          content: `${expiredCount} blacklist case(s) have automatically expired in organization ${organizationId}. The affected vendors have been removed from the blacklist.`,
        }).catch(() => {});
      }

      return { success: true, expiredCount };
    }),

  // ── Get user's effective roles for UI permission display ──
  getUserRoles: scopedProcedure
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const { hasRole: canValidate, userRoles } = await checkUserRole(db, ctx.user.id, organizationId, VALIDATOR_ROLES);
      const { hasRole: canApprove } = await checkUserRole(db, ctx.user.id, organizationId, APPROVER_ROLES);
      const { hasRole: canRevoke } = await checkUserRole(db, ctx.user.id, organizationId, REVOKER_ROLES);

      return {
        roles: userRoles,
        canValidate,
        canApprove,
        canReject: canApprove,
        canRevoke,
        canSubmit: true, // Any authenticated user can submit
        canCreate: true, // Any authenticated user can create
      };
    }),

  // ── Get workflow configuration for the organization ──
  getWorkflowConfig: scopedProcedure
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [config] = await db
        .select()
        .from(blacklistWorkflowConfig)
        .where(eq(blacklistWorkflowConfig.organizationId, organizationId));

      if (!config) {
        // Return default configuration
        return {
          id: null,
          organizationId,
          stages: [
            {
              key: "validation",
              label: "Validation",
              labelAr: "التحقق",
              requiredRoles: ["organization_admin", "office_manager", "project_manager", "logistics_manager", "compliance_officer"],
              requireSignature: false,
            },
            {
              key: "approval",
              label: "Manager Approval",
              labelAr: "موافقة المدير",
              requiredRoles: ["organization_admin", "office_manager", "project_manager"],
              requireSignature: true,
            },
          ],
          requireSubmitterSignature: true,
          requireApproverSignature: true,
          autoExpiryEnabled: true,
          defaultDurationMonths: 6,
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnExpiry: true,
        };
      }

      let parsedStages = [];
      try {
        parsedStages = JSON.parse(config.stages);
      } catch {
        parsedStages = [];
      }

      return {
        ...config,
        stages: parsedStages,
        requireSubmitterSignature: Boolean(config.requireSubmitterSignature),
        requireApproverSignature: Boolean(config.requireApproverSignature),
        autoExpiryEnabled: Boolean(config.autoExpiryEnabled),
        notifyOnSubmission: Boolean(config.notifyOnSubmission),
        notifyOnApproval: Boolean(config.notifyOnApproval),
        notifyOnRejection: Boolean(config.notifyOnRejection),
        notifyOnExpiry: Boolean(config.notifyOnExpiry),
      };
    }),

  // ── Update workflow configuration ──
  updateWorkflowConfig: scopedProcedure
    .input(
      z.object({
        stages: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            labelAr: z.string(),
            requiredRoles: z.array(z.string()),
            requireSignature: z.boolean(),
          })
        ),
        requireSubmitterSignature: z.boolean(),
        requireApproverSignature: z.boolean(),
        autoExpiryEnabled: z.boolean(),
        defaultDurationMonths: z.number().min(0).max(120),
        notifyOnSubmission: z.boolean(),
        notifyOnApproval: z.boolean(),
        notifyOnRejection: z.boolean(),
        notifyOnExpiry: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Role-based access check - only admins can configure workflow
      const { hasRole } = await checkUserRole(db, ctx.user.id, organizationId, ["organization_admin"]);
      if (!hasRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization administrators can configure the blacklist workflow.",
        });
      }

      const [existing] = await db
        .select()
        .from(blacklistWorkflowConfig)
        .where(eq(blacklistWorkflowConfig.organizationId, organizationId));

      const stagesJson = JSON.stringify(input.stages);

      if (existing) {
        await db
          .update(blacklistWorkflowConfig)
          .set({
            stages: stagesJson,
            requireSubmitterSignature: input.requireSubmitterSignature ? 1 : 0,
            requireApproverSignature: input.requireApproverSignature ? 1 : 0,
            autoExpiryEnabled: input.autoExpiryEnabled ? 1 : 0,
            defaultDurationMonths: input.defaultDurationMonths,
            notifyOnSubmission: input.notifyOnSubmission ? 1 : 0,
            notifyOnApproval: input.notifyOnApproval ? 1 : 0,
            notifyOnRejection: input.notifyOnRejection ? 1 : 0,
            notifyOnExpiry: input.notifyOnExpiry ? 1 : 0,
            updatedBy: ctx.user.id,
          })
          .where(eq(blacklistWorkflowConfig.id, existing.id));
      } else {
        await db.insert(blacklistWorkflowConfig).values({
          organizationId,
          stages: stagesJson,
          requireSubmitterSignature: input.requireSubmitterSignature ? 1 : 0,
          requireApproverSignature: input.requireApproverSignature ? 1 : 0,
          autoExpiryEnabled: input.autoExpiryEnabled ? 1 : 0,
          defaultDurationMonths: input.defaultDurationMonths,
          notifyOnSubmission: input.notifyOnSubmission ? 1 : 0,
          notifyOnApproval: input.notifyOnApproval ? 1 : 0,
          notifyOnRejection: input.notifyOnRejection ? 1 : 0,
          notifyOnExpiry: input.notifyOnExpiry ? 1 : 0,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });
      }

      return { success: true };
    }),

  // ── Bulk approve cases ──
  bulkApprove: scopedProcedure
    .input(
      z.object({
        caseIds: z.array(z.number()).min(1).max(100),
        blacklistStartDate: z.string(),
        expiryDate: z.string().optional(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Role-based access check
      const { hasRole } = await checkUserRole(db, ctx.user.id, organizationId, APPROVER_ROLES);
      if (!hasRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to approve blacklist cases.",
        });
      }

      // Fetch all cases
      const cases = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            inArray(vendorBlacklistCases.id, input.caseIds),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      // Validate all cases are in pending_approval status
      const invalidCases = cases.filter((c: any) => c.status !== "pending_approval");
      if (invalidCases.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${invalidCases.length} case(s) are not in 'pending_approval' status and cannot be approved.`,
        });
      }

      if (cases.length !== input.caseIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${input.caseIds.length - cases.length} case(s) were not found.`,
        });
      }

      let approvedCount = 0;
      for (const c of cases) {
        // Update case status
        await db
          .update(vendorBlacklistCases)
          .set({
            status: "approved",
            approvedAt: sql`NOW()`,
            approvedBy: ctx.user.id,
            blacklistStartDate: input.blacklistStartDate,
            expiryDate: input.expiryDate ?? null,
            updatedBy: ctx.user.id,
          })
          .where(eq(vendorBlacklistCases.id, c.id));

        // Mark vendor as blacklisted
        await db
          .update(vendors)
          .set({
            isBlacklisted: 1,
            blacklistReason: (c as any).detailedJustification,
            updatedBy: ctx.user.id,
          })
          .where(eq(vendors.id, (c as any).vendorId));

        // Audit log
        await logAudit(db, {
          organizationId,
          operatingUnitId: (c as any).operatingUnitId ?? operatingUnitId,
          caseId: c.id,
          userId: ctx.user.id,
          userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
          actionType: "bulk_approved",
          previousStatus: "pending_approval",
          newStatus: "approved",
          details: input.comments
            ? `Bulk approved. Comments: ${input.comments}`
            : "Bulk approved",
        });

        approvedCount++;
      }

      // Notify
      await notifyOwner({
        title: `${approvedCount} Blacklist Case(s) Bulk Approved`,
        content: `${approvedCount} blacklist case(s) have been bulk approved by ${ctx.user.name ?? ctx.user.email}.`,
      }).catch(() => {});

      return { success: true, approvedCount };
    }),

  // ── Bulk reject cases ──
  bulkReject: scopedProcedure
    .input(
      z.object({
        caseIds: z.array(z.number()).min(1).max(100),
        rejectionReason: z.string().min(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Role-based access check
      const { hasRole } = await checkUserRole(db, ctx.user.id, organizationId, APPROVER_ROLES);
      if (!hasRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to reject blacklist cases.",
        });
      }

      // Fetch all cases
      const cases = await db
        .select()
        .from(vendorBlacklistCases)
        .where(
          and(
            inArray(vendorBlacklistCases.id, input.caseIds),
            eq(vendorBlacklistCases.organizationId, organizationId),
            isNull(vendorBlacklistCases.deletedAt)
          )
        );

      // Validate all cases are in a rejectable status
      const rejectableStatuses = ["submitted", "under_validation", "pending_approval"];
      const invalidCases = cases.filter((c: any) => !rejectableStatuses.includes(c.status));
      if (invalidCases.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${invalidCases.length} case(s) cannot be rejected from their current status.`,
        });
      }

      if (cases.length !== input.caseIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${input.caseIds.length - cases.length} case(s) were not found.`,
        });
      }

      let rejectedCount = 0;
      for (const c of cases) {
        await db
          .update(vendorBlacklistCases)
          .set({
            status: "rejected",
            rejectedAt: sql`NOW()`,
            rejectedBy: ctx.user.id,
            rejectionReason: input.rejectionReason,
            updatedBy: ctx.user.id,
          })
          .where(eq(vendorBlacklistCases.id, c.id));

        await logAudit(db, {
          organizationId,
          operatingUnitId: (c as any).operatingUnitId ?? operatingUnitId,
          caseId: c.id,
          userId: ctx.user.id,
          userName: ctx.user.name ?? ctx.user.email ?? "Unknown",
          actionType: "bulk_rejected",
          previousStatus: (c as any).status,
          newStatus: "rejected",
          details: `Bulk rejected. Reason: ${input.rejectionReason}`,
        });

        rejectedCount++;
      }

      await notifyOwner({
        title: `${rejectedCount} Blacklist Case(s) Bulk Rejected`,
        content: `${rejectedCount} blacklist case(s) have been bulk rejected by ${ctx.user.name ?? ctx.user.email}. Reason: ${input.rejectionReason}`,
      }).catch(() => {});

      return { success: true, rejectedCount };
    }),

  // ── Audit report export data ──
  getAuditReportData: scopedProcedure
    .input(
      z.object({
        caseIds: z.array(z.number()).optional(),
        status: z
          .enum([
            "draft",
            "submitted",
            "under_validation",
            "pending_approval",
            "approved",
            "rejected",
            "revoked",
            "expired",
          ])
          .optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      const conditions: any[] = [
        eq(vendorBlacklistCases.organizationId, organizationId),
        isNull(vendorBlacklistCases.deletedAt),
      ];
      if (operatingUnitId) {
        conditions.push(
          eq(vendorBlacklistCases.operatingUnitId, operatingUnitId)
        );
      }
      if (input.caseIds && input.caseIds.length > 0) {
        conditions.push(inArray(vendorBlacklistCases.id, input.caseIds));
      }
      if (input.status) {
        conditions.push(eq(vendorBlacklistCases.status, input.status));
      }
      if (input.dateFrom) {
        conditions.push(
          sql`${vendorBlacklistCases.createdAt} >= ${input.dateFrom}`
        );
      }
      if (input.dateTo) {
        conditions.push(
          sql`${vendorBlacklistCases.createdAt} <= ${input.dateTo}`
        );
      }

      // Get all matching cases
      const cases = await db
        .select()
        .from(vendorBlacklistCases)
        .where(and(...conditions))
        .orderBy(desc(vendorBlacklistCases.createdAt));

      if (cases.length === 0) {
        return { cases: [], generatedAt: new Date().toISOString() };
      }

      // Get vendor details
      const vendorIds = [...new Set(cases.map((c: any) => c.vendorId))];
      const vendorRows = await db
        .select()
        .from(vendors)
        .where(inArray(vendors.id, vendorIds));
      const vendorMap: Record<number, any> = Object.fromEntries(
        vendorRows.map((v: any) => [v.id, v])
      );

      // Get all audit logs for these cases
      const caseIds = cases.map((c: any) => c.id);
      const auditLogs = await db
        .select()
        .from(vendorBlacklistAuditLog)
        .where(inArray(vendorBlacklistAuditLog.caseId, caseIds))
        .orderBy(asc(vendorBlacklistAuditLog.createdAt));

      // Get all signatures for these cases
      const signatures = await db
        .select()
        .from(vendorBlacklistSignatures)
        .where(inArray(vendorBlacklistSignatures.caseId, caseIds))
        .orderBy(desc(vendorBlacklistSignatures.signedAt));

      // Get all evidence for these cases
      const evidence = await db
        .select()
        .from(vendorBlacklistEvidence)
        .where(
          and(
            inArray(vendorBlacklistEvidence.caseId, caseIds),
            isNull(vendorBlacklistEvidence.deletedAt)
          )
        )
        .orderBy(desc(vendorBlacklistEvidence.uploadedAt));

      // Group audit logs, signatures, evidence by case
      const auditMap: Record<number, any[]> = {};
      auditLogs.forEach((log: any) => {
        if (!auditMap[log.caseId]) auditMap[log.caseId] = [];
        auditMap[log.caseId].push(log);
      });

      const sigMap: Record<number, any[]> = {};
      signatures.forEach((sig: any) => {
        if (!sigMap[sig.caseId]) sigMap[sig.caseId] = [];
        sigMap[sig.caseId].push(sig);
      });

      const evidenceMap: Record<number, any[]> = {};
      evidence.forEach((ev: any) => {
        if (!evidenceMap[ev.caseId]) evidenceMap[ev.caseId] = [];
        evidenceMap[ev.caseId].push(ev);
      });

      const reportCases = cases.map((c: any) => ({
        ...c,
        vendor: vendorMap[c.vendorId] ?? null,
        auditTrail: auditMap[c.id] ?? [],
        signatures: sigMap[c.id] ?? [],
        evidence: evidenceMap[c.id] ?? [],
      }));

      return {
        cases: reportCases,
        generatedAt: new Date().toISOString(),
        generatedBy: ctx.user.name ?? ctx.user.email ?? "Unknown",
        organizationId,
        operatingUnitId,
      };
    }),
});
