// REPLACEMENT CODE FOR inviteVendor procedure (lines 168-215)
import { isNull } from "drizzle-orm";

      // Get or create RFQ for this PR (one RFQ per PR, shared by all vendors)
      const [existingRfq] = await db
        .select()
        .from(rfqs)
        .where(
          and(
            eq(rfqs.purchaseRequestId, input.purchaseRequestId),
            eq(rfqs.organizationId, ctx.scope.organizationId),
            isNull(rfqs.deletedAt)
          )
        )
        .limit(1);

      let rfqId: number;
      if (existingRfq) {
        rfqId = existingRfq.id;
      } else {
        // Auto-create RFQ if it doesn't exist
        const [pr] = await db
          .select()
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, input.purchaseRequestId))
          .limit(1);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase Request not found",
          });
        }

        // Generate RFQ number (one per PR, not per vendor)
        const rfqNumber = await generateRFQNumber(ctx.scope.organizationId, ctx.scope.operatingUnitId || 0);

        // Create RFQ
        const [rfqResult] = await db.insert(rfqs).values({
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          purchaseRequestId: input.purchaseRequestId,
          rfqNumber,
          status: "draft",
          issueDate: new Date(),
          createdBy: ctx.user.id,
        });

        rfqId = rfqResult.insertId;
      }

      // Create RFQ vendor invitation (linked to RFQ)
      const [result] = await db.insert(rfqVendors).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId || null,
        purchaseRequestId: input.purchaseRequestId,
        rfqId, // Link to parent RFQ
        quotationAnalysisId: null, // Linked after quotation analysis
        supplierId: input.supplierId,
        invitationSentDate: new Date(),
        invitationMethod: input.invitationMethod,
        invitationStatus: "invited",
        submissionStatus: "pending",
        notes: input.notes || null,
        createdBy: ctx.user.id,
      });

      return { id: result.insertId, success: true };
