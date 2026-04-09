import { router, publicProcedure, protectedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../../db';
import { requestAccessRequests, users, userOrganizations } from '../../../drizzle/schema';
import { eq, and, isNull, desc, inArray, or } from 'drizzle-orm';
import { notifyOwner } from '../../_core/notification';
import { sendEmail } from '../../services/emailService';
import {
  buildAccessApprovedMicrosoftEmail,
  buildAccessApprovedLocalEmail,
  buildAccessApprovedPlatformMicrosoftEmail,
  buildAccessApprovedPlatformLocalEmail,
} from '../../services/accessRequestEmailTemplates';

const CreateRequestAccessSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  workEmail: z.string().email('Invalid email address'),
  organization: z.string().min(1, 'Organization is required'),
  operatingUnit: z.string().min(1, 'Operating unit is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  reasonForAccess: z.string().min(1, 'Reason for access is required'),
  phoneNumber: z.string().optional(),
  organizationId: z.string().optional(),
  operatingUnitId: z.string().optional(),
  requestType: z.enum(['organization_user', 'platform_admin']).default('organization_user'),
  requestedAuthProvider: z.enum(['microsoft', 'local']).optional(),
  requestedAccountType: z.enum(['organization', 'platform']).optional(),
  requestedRole: z.string().optional(),
});

/**
 * Helper: Find organization admin for routing
 * Returns the user ID of the organization admin, or null if not found
 */
async function findOrganizationAdmin(db: any, organizationId: number): Promise<number | null> {
  const orgAdmins = await db
    .select({ userId: userOrganizations.userId })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.organizationId, organizationId),
        eq(userOrganizations.role, 'org_admin'),
        isNull(userOrganizations.deletedAt)
      )
    )
    .limit(1);

  return orgAdmins.length > 0 ? orgAdmins[0].userId : null;
}

/**
 * Helper: Find platform admin for fallback routing
 * Returns the user ID of any platform admin
 */
async function findPlatformAdmin(db: any): Promise<number | null> {
  const platformAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(users.role, ['platform_admin', 'platform_super_admin']),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  return platformAdmins.length > 0 ? platformAdmins[0].id : null;
}

export const requestAccessRouter = router({
  // ─── Public: Submit request access form ───────────────────────────────────
  submitRequest: publicProcedure
    .input(CreateRequestAccessSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

      // Validate email domain based on request type
      const { domainValidationService } = await import('../../services/organization/domainValidationService');
      const emailDomain = domainValidationService.extractDomain(input.workEmail);
      
      if (!emailDomain) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid email format',
        });
      }

      // For organization users, validate against organization domain
      if (input.requestType === 'organization_user' && input.organizationId) {
        const orgId = parseInt(input.organizationId);
        const domainValidation = await domainValidationService.validateEmailDomain({
          organizationId: orgId,
          email: input.workEmail,
          allowPublicDomains: false, // Organization users cannot use public domains
        });

        if (!domainValidation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: domainValidation.message || 'Email domain is not allowed for this organization',
          });
        }
      }
      // Platform admins can use any domain (allowPublicDomains is implicitly true)

      // Check for duplicate requests from same email within 24 hours
      const existingRequest = await db
        .select()
        .from(requestAccessRequests)
        .where(
          and(
            eq(requestAccessRequests.email, input.workEmail),
            isNull(requestAccessRequests.deletedAt)
          )
        )
        .limit(1);

      if (existingRequest.length > 0) {
        const lastRequest = new Date(existingRequest[0].createdAt);
        const hoursSinceLastRequest =
          (new Date().getTime() - lastRequest.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRequest < 24) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'You have already submitted a request recently. Please wait 24 hours before submitting again.',
          });
        }
      }

      const requestId = `RAR-${Date.now()}`;
      const now = new Date();

      // Determine routing based on request type and organization
      let routedToUserId: number | null = null;
      let routedToRole: string | null = null;
      let fallbackToPlatformAdmin = false;

      if (input.requestType === 'organization_user' && input.organizationId) {
        // Route to organization admin first
        const orgId = parseInt(input.organizationId);
        routedToUserId = await findOrganizationAdmin(db, orgId);

        if (routedToUserId) {
          routedToRole = 'org_admin';
        } else {
          // Fallback to platform admin if org admin not found
          routedToUserId = await findPlatformAdmin(db);
          routedToRole = 'platform_admin';
          fallbackToPlatformAdmin = true;
        }
      } else {
        // Platform admin request - always route to platform admin
        routedToUserId = await findPlatformAdmin(db);
        routedToRole = 'platform_admin';
      }

      await db.insert(requestAccessRequests).values({
        id: requestId,
        fullName: input.fullName,
        email: input.workEmail,
        organizationName: input.organization,
        operatingUnitName: input.operatingUnit,
        jobTitle: input.jobTitle,
        reasonForAccess: input.reasonForAccess,
        phoneNumber: input.phoneNumber || null,
        organizationId: input.organizationId ? parseInt(input.organizationId) : null,
        operatingUnitId: input.operatingUnitId ? parseInt(input.operatingUnitId) : null,
        requestType: input.requestType,
        requestedAuthProvider: input.requestedAuthProvider || null,
        requestedAccountType: input.requestedAccountType || null,
        requestedRole: input.requestedRole || null,
        status: 'new',
        routedToUserId: routedToUserId,
        routedToRole: routedToRole,
        routedAt: now,
        fallbackToPlatformAdmin: fallbackToPlatformAdmin ? 1 : 0,
        createdAt: now,
        createdBy: input.workEmail,
        updatedAt: now,
        updatedBy: input.workEmail,
      });

      // Notify the routed admin
      const adminRole = routedToRole === 'org_admin' ? 'Organization Admin' : 'Platform Admin';
      notifyOwner({
        title: `New ${input.requestType === 'organization_user' ? 'Organization User' : 'Platform Admin'} Access Request`,
        content: `${input.fullName} (${input.workEmail}) has requested access. Routed to: ${adminRole}. Request ID: ${requestId}`,
      }).catch(() => {}); // Non-blocking

      return {
        success: true,
        requestId,
        message: 'Your access request has been submitted successfully.',
      };
    }),

  // ─── Public: Get request status by ID ─────────────────────────────────────
  getRequestStatus: publicProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

      const request = await db
        .select()
        .from(requestAccessRequests)
        .where(
          and(
            eq(requestAccessRequests.id, input.requestId),
            isNull(requestAccessRequests.deletedAt)
          )
        )
        .limit(1);

      if (request.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
      }
      return request[0];
    }),

  // ─── Admin: Get paginated requests with filters ────────────────────────────
  getAllRequests: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      status: z.enum(['new', 'under_review', 'approved', 'rejected', 'provisioned', 'all']).default('all'),
      requestType: z.enum(['organization_user', 'platform_admin', 'all']).default('all'),
      search: z.string().optional(), // Search by name or email
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

      const isPlatformAdmin =
        ctx.user.role === 'admin' ||
        ctx.user.role === 'platform_admin' ||
        ctx.user.role === 'platform_super_admin';

      const isOrgAdmin = ctx.user.role === 'org_admin';

      if (!isPlatformAdmin && !isOrgAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      const statusFilter = input?.status ?? 'all';
      const requestTypeFilter = input?.requestType ?? 'all';
      const searchTerm = input?.search?.toLowerCase() || '';

      // Build where clause
      const whereConditions: any[] = [isNull(requestAccessRequests.deletedAt)];

      if (statusFilter !== 'all') {
        whereConditions.push(eq(requestAccessRequests.status, statusFilter));
      }

      if (requestTypeFilter !== 'all') {
        whereConditions.push(eq(requestAccessRequests.requestType, requestTypeFilter));
      }

      // For org admins, only show requests routed to them
      if (isOrgAdmin) {
        whereConditions.push(eq(requestAccessRequests.routedToUserId, ctx.user.id));
      }

      // Search filter
      if (searchTerm) {
        whereConditions.push(
          or(
            eq(requestAccessRequests.fullName, searchTerm),
            eq(requestAccessRequests.email, searchTerm)
          )
        );
      }

      // Get total count
      const countResult = await db
        .select()
        .from(requestAccessRequests)
        .where(and(...whereConditions));

      const totalCount = countResult.length;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Get paginated results
      const rows = await db
        .select()
        .from(requestAccessRequests)
        .where(and(...whereConditions))
        .orderBy(desc(requestAccessRequests.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        data: rows,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    }),

  // ─── Admin: Approve request ────────────────────────────────────────────────
  approveRequest: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      notes: z.string().optional(),
      reviewDecision: z.enum(['approved', 'rejected', 'pending_info']).default('approved'),
      provisioningMode: z.enum(['microsoft_mapping_only', 'local_account_created']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

      // Get the request
      const request = await db
        .select()
        .from(requestAccessRequests)
        .where(eq(requestAccessRequests.id, input.requestId))
        .limit(1);

      if (request.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
      }

      const req = request[0];

      // Verify access control
      const isPlatformAdmin =
        ctx.user.role === 'admin' ||
        ctx.user.role === 'platform_admin' ||
        ctx.user.role === 'platform_super_admin';

      const isOrgAdmin = ctx.user.role === 'org_admin';

      // Check if user is authorized to approve this request
      if (isOrgAdmin && req.routedToUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to approve this request' });
      }

      if (!isPlatformAdmin && !isOrgAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const now = new Date();
      
      // If approved, provision the user based on requestType and authProvider
      let provisionedUserId: number | null = null;
      if (input.reviewDecision === 'approved') {
        try {
          const { 
            provisionOrganizationMicrosoftUser,
            provisionOrganizationLocalUser,
            provisionPlatformMicrosoftAdmin,
            provisionPlatformLocalAdmin,
          } = await import('../../services/accessRequestProvisioningService');

          // Determine which provisioning service to call
          if (req.requestType === 'organization_user') {
            if (req.requestedAuthProvider === 'microsoft') {
              // Org + Microsoft
              const result = await provisionOrganizationMicrosoftUser({
                requestId: input.requestId,
                email: req.email,
                fullName: req.fullName,
                organizationId: req.organizationId!,
                operatingUnitId: req.operatingUnitId,
                requestedRole: 'user',
              });
              provisionedUserId = result.userId;
            } else if (req.requestedAuthProvider === 'local') {
              // Org + Local
              const result = await provisionOrganizationLocalUser({
                requestId: input.requestId,
                email: req.email,
                fullName: req.fullName,
                organizationId: req.organizationId!,
                operatingUnitId: req.operatingUnitId,
                requestedRole: 'user',
              });
              provisionedUserId = result.userId;
            }
          } else if (req.requestType === 'platform_admin') {
            if (req.requestedAuthProvider === 'microsoft') {
              // Platform + Microsoft
              const result = await provisionPlatformMicrosoftAdmin({
                requestId: input.requestId,
                email: req.email,
                fullName: req.fullName,
                requestedRole: 'platform_admin',
              });
              provisionedUserId = result.userId;
            } else if (req.requestedAuthProvider === 'local') {
              // Platform + Local
              const result = await provisionPlatformLocalAdmin({
                requestId: input.requestId,
                email: req.email,
                fullName: req.fullName,
                requestedRole: 'platform_admin',
              });
              provisionedUserId = result.userId;
            }
          }
        } catch (provisionError: any) {
          console.error(`[Provisioning Error] Failed to provision user for request ${input.requestId}:`, provisionError);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to provision user: ${provisionError.message}` 
          });
        }
      }

      await db
        .update(requestAccessRequests)
        .set({
          status: input.reviewDecision === 'approved' ? 'provisioned' : input.reviewDecision === 'rejected' ? 'rejected' : 'under_review',
          reviewDecision: input.reviewDecision,
          provisioningMode: input.provisioningMode || null,
          reviewedBy: String(ctx.user.id),
          reviewedAt: now,
          reviewNotes: input.notes || null,
          provisionedUserId: provisionedUserId,
          provisionedAt: input.reviewDecision === 'approved' ? now : null,
          updatedAt: now,
          updatedBy: String(ctx.user.id),
        })
        .where(eq(requestAccessRequests.id, input.requestId));

      // Send approval email to the applicant
      if (input.reviewDecision === 'approved') {
        try {
          let emailTemplate;
          if (req.requestType === 'organization_user') {
            if (req.requestedAuthProvider === 'microsoft') {
              emailTemplate = buildAccessApprovedMicrosoftEmail({
                applicantName: req.fullName,
                applicantEmail: req.email,
                organization: req.organizationName || '',
                jobTitle: req.jobTitle,
                language: 'en', // TODO: detect user language preference
              });
            } else {
              emailTemplate = buildAccessApprovedLocalEmail({
                applicantName: req.fullName,
                applicantEmail: req.email,
                organization: req.organizationName || '',
                jobTitle: req.jobTitle,
                language: 'en',
              });
            }
          } else {
            if (req.requestedAuthProvider === 'microsoft') {
              emailTemplate = buildAccessApprovedPlatformMicrosoftEmail({
                applicantName: req.fullName,
                applicantEmail: req.email,
                language: 'en',
              });
            } else {
              emailTemplate = buildAccessApprovedPlatformLocalEmail({
                applicantName: req.fullName,
                applicantEmail: req.email,
                language: 'en',
              });
            }
          }

          await sendEmail({
            to: req.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          });
        } catch (emailError: any) {
          console.error(`[Email Error] Failed to send approval email for request ${input.requestId}:`, emailError);
          // Don't throw - email failure shouldn't block the approval
        }
      }

      notifyOwner({
        title: `Access Request ${input.reviewDecision === 'approved' ? 'Approved & Provisioned' : input.reviewDecision === 'rejected' ? 'Rejected' : 'Pending'}`,
        content: `Request ${input.requestId} for ${req.fullName} has been ${input.reviewDecision} by ${ctx.user.name || ctx.user.email}.`,
      }).catch(() => {});

      return { success: true, message: `Request ${input.reviewDecision}`, provisionedUserId };
    }),

  // ─── Admin: Reject request ─────────────────────────────────────────────────
  rejectRequest: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

      // Get the request
      const request = await db
        .select()
        .from(requestAccessRequests)
        .where(eq(requestAccessRequests.id, input.requestId))
        .limit(1);

      if (request.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
      }

      const req = request[0];

      // Verify access control
      const isPlatformAdmin =
        ctx.user.role === 'admin' ||
        ctx.user.role === 'platform_admin' ||
        ctx.user.role === 'platform_super_admin';

      const isOrgAdmin = ctx.user.role === 'org_admin';

      // Check if user is authorized to reject this request
      if (isOrgAdmin && req.routedToUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to reject this request' });
      }

      if (!isPlatformAdmin && !isOrgAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const now = new Date();
      await db
        .update(requestAccessRequests)
        .set({
          status: 'rejected',
          reviewDecision: 'rejected',
          reviewedBy: String(ctx.user.id),
          reviewedAt: now,
          reviewNotes: input.reason || null,
          updatedAt: now,
          updatedBy: String(ctx.user.id),
        })
        .where(eq(requestAccessRequests.id, input.requestId));

      notifyOwner({
        title: 'Access Request Rejected',
        content: `Request ${input.requestId} for ${req.fullName} has been rejected by ${ctx.user.name || ctx.user.email}. Reason: ${input.reason || 'Not specified'}.`,
      }).catch(() => {});

      return { success: true, message: 'Request rejected' };
    }),
});
