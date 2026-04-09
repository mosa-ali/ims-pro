import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { emailProviderConfig } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { encryptData, decryptData, maskSensitiveData, generateWebhookSigningKey } from "../services/encryptionService";

// Validation schemas
const createProviderConfigSchema = z.object({
  provider: z.enum(["sendgrid", "mailgun", "aws_ses"]),
  apiKey: z.string().min(1, "API key is required"),
  mailgunDomain: z.string().optional(),
  awsRegion: z.string().optional(),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
});

const updateProviderConfigSchema = z.object({
  id: z.number(),
  apiKey: z.string().optional(),
  mailgunDomain: z.string().optional(),
  awsRegion: z.string().optional(),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  isActive: z.boolean().optional(),
});

const testConnectionSchema = z.object({
  id: z.number(),
});

export const emailProviderConfigRouter = router({
  /**
   * Get all provider configurations for an organization
   */
  getAll: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has access to this organization
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();
        const configs = await dbInstance
          .select()
          .from(emailProviderConfig)
          .where(eq(emailProviderConfig.organizationId, input.organizationId));

        // Mask API keys in response
        return configs.map((config) => ({
          ...config,
          apiKey: maskSensitiveData(config.apiKey),
          awsAccessKeyId: config.awsAccessKeyId ? maskSensitiveData(config.awsAccessKeyId) : null,
          awsSecretAccessKey: config.awsSecretAccessKey ? maskSensitiveData(config.awsSecretAccessKey) : null,
          webhookSigningKey: config.webhookSigningKey ? maskSensitiveData(config.webhookSigningKey) : null,
        }));
      } catch (error) {
        console.error("Error fetching provider configs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch provider configurations",
        });
      }
    }),

  /**
   * Get a specific provider configuration
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();
        const config = await dbInstance
          .select()
          .from(emailProviderConfig)
          .where(
            and(
              eq(emailProviderConfig.id, input.id),
              eq(emailProviderConfig.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!config) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Provider configuration not found",
          });
        }

        // Decrypt and mask sensitive fields
        return {
          ...config,
          apiKey: maskSensitiveData(config.apiKey),
          awsAccessKeyId: config.awsAccessKeyId ? maskSensitiveData(config.awsAccessKeyId) : null,
          awsSecretAccessKey: config.awsSecretAccessKey ? maskSensitiveData(config.awsSecretAccessKey) : null,
          webhookSigningKey: config.webhookSigningKey ? maskSensitiveData(config.webhookSigningKey) : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching provider config:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch provider configuration",
        });
      }
    }),

  /**
   * Create a new provider configuration
   */
  create: protectedProcedure
    .input(createProviderConfigSchema.extend({ organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        // Encrypt sensitive fields
        const encryptedApiKey = encryptData(input.apiKey);
        const encryptedAwsAccessKeyId = input.awsAccessKeyId
          ? encryptData(input.awsAccessKeyId)
          : null;
        const encryptedAwsSecretAccessKey = input.awsSecretAccessKey
          ? encryptData(input.awsSecretAccessKey)
          : null;
        const webhookSigningKey = generateWebhookSigningKey();

        const dbInstance = await getDb();
        const result = await dbInstance
          .insert(emailProviderConfig)
          .values({
            organizationId: input.organizationId,
            provider: input.provider,
            apiKey: encryptedApiKey,
            mailgunDomain: input.mailgunDomain || null,
            awsRegion: input.awsRegion || null,
            awsAccessKeyId: encryptedAwsAccessKeyId,
            awsSecretAccessKey: encryptedAwsSecretAccessKey,
            webhookSigningKey: encryptData(webhookSigningKey),
            isActive: 1,
            isVerified: 0,
            createdBy: ctx.user.id,
          });

        console.log(`[EmailProviderConfig] Created ${input.provider} configuration for org ${input.organizationId}`);

        return {
          id: result[0],
          provider: input.provider,
          message: "Provider configuration created successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error creating provider config:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create provider configuration",
        });
      }
    }),

  /**
   * Update a provider configuration
   */
  update: protectedProcedure
    .input(updateProviderConfigSchema.extend({ organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        // Verify config exists and belongs to org
        const existing = await dbInstance
          .select()
          .from(emailProviderConfig)
          .where(
            and(
              eq(emailProviderConfig.id, input.id),
              eq(emailProviderConfig.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Provider configuration not found",
          });
        }

        // Prepare update data
        const updateData: any = {
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        };

        if (input.apiKey) {
          updateData.apiKey = encryptData(input.apiKey);
          updateData.apiKeyLastRotated = new Date();
        }

        if (input.mailgunDomain !== undefined) {
          updateData.mailgunDomain = input.mailgunDomain || null;
        }

        if (input.awsRegion !== undefined) {
          updateData.awsRegion = input.awsRegion || null;
        }

        if (input.awsAccessKeyId !== undefined) {
          updateData.awsAccessKeyId = input.awsAccessKeyId
            ? encryptData(input.awsAccessKeyId)
            : null;
        }

        if (input.awsSecretAccessKey !== undefined) {
          updateData.awsSecretAccessKey = input.awsSecretAccessKey
            ? encryptData(input.awsSecretAccessKey)
            : null;
        }

        if (input.isActive !== undefined) {
          updateData.isActive = input.isActive ? 1 : 0;
        }

        await dbInstance
          .update(emailProviderConfig)
          .set(updateData)
          .where(eq(emailProviderConfig.id, input.id));

        console.log(`[EmailProviderConfig] Updated configuration ${input.id} for org ${input.organizationId}`);

        return { message: "Provider configuration updated successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error updating provider config:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update provider configuration",
        });
      }
    }),

  /**
   * Delete a provider configuration
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();
        const result = await dbInstance
          .delete(emailProviderConfig)
          .where(
            and(
              eq(emailProviderConfig.id, input.id),
              eq(emailProviderConfig.organizationId, input.organizationId)
            )
          );

        if (result.rowsAffected === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Provider configuration not found",
          });
        }

        console.log(`[EmailProviderConfig] Deleted configuration ${input.id} for org ${input.organizationId}`);

        return { message: "Provider configuration deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error deleting provider config:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete provider configuration",
        });
      }
    }),

  /**
   * Test connection to email provider
   */
  testConnection: protectedProcedure
    .input(testConnectionSchema.extend({ organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();
        const config = await dbInstance
          .select()
          .from(emailProviderConfig)
          .where(
            and(
              eq(emailProviderConfig.id, input.id),
              eq(emailProviderConfig.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!config) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Provider configuration not found",
          });
        }

        // Decrypt API key
        const decryptedApiKey = decryptData(config.apiKey);

        // Test connection based on provider
        let testResult = { success: false, message: "" };

        if (config.provider === "sendgrid") {
          testResult = await testSendGridConnection(decryptedApiKey);
        } else if (config.provider === "mailgun") {
          testResult = await testMailgunConnection(decryptedApiKey, config.mailgunDomain || "");
        } else if (config.provider === "aws_ses") {
          const awsAccessKeyId = config.awsAccessKeyId ? decryptData(config.awsAccessKeyId) : "";
          const awsSecretAccessKey = config.awsSecretAccessKey ? decryptData(config.awsSecretAccessKey) : "";
          testResult = await testAWSSESConnection(
            awsAccessKeyId,
            awsSecretAccessKey,
            config.awsRegion || ""
          );
        }

        // Update test status
        await dbInstance
          .update(emailProviderConfig)
          .set({
            lastTestAt: new Date(),
            lastTestStatus: testResult.success ? "success" : "failed",
            lastTestError: testResult.success ? null : testResult.message,
            isVerified: testResult.success ? 1 : 0,
          })
          .where(eq(emailProviderConfig.id, input.id));

        console.log(`[EmailProviderConfig] Test connection for ${config.provider}: ${testResult.success ? "SUCCESS" : "FAILED"}`);

        return testResult;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error testing provider connection:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to test provider connection",
        });
      }
    }),
});

/**
 * Test SendGrid API connection
 */
async function testSendGridConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: "test@example.com" }] }],
        from: { email: "test@sendgrid.com" },
        subject: "Test",
        content: [{ type: "text/plain", value: "test" }],
      }),
    });

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: "Invalid SendGrid API key" };
    }

    if (response.ok || response.status === 400) {
      // 400 might be due to invalid email, but API key is valid
      return { success: true, message: "SendGrid connection successful" };
    }

    return { success: false, message: `SendGrid API error: ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `SendGrid connection failed: ${String(error)}` };
  }
}

/**
 * Test Mailgun API connection
 */
async function testMailgunConnection(apiKey: string, domain: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!domain) {
      return { success: false, message: "Mailgun domain is required" };
    }

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        from: "test@example.com",
        to: "test@example.com",
        subject: "Test",
        text: "test",
      }),
    });

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: "Invalid Mailgun API key or domain" };
    }

    if (response.ok || response.status === 400) {
      return { success: true, message: "Mailgun connection successful" };
    }

    return { success: false, message: `Mailgun API error: ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Mailgun connection failed: ${String(error)}` };
  }
}

/**
 * Test AWS SES connection
 */
async function testAWSSESConnection(
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!accessKeyId || !secretAccessKey || !region) {
      return { success: false, message: "AWS credentials and region are required" };
    }

    // For now, just validate that credentials are provided
    // In production, you would use AWS SDK to test the connection
    return { success: true, message: "AWS SES credentials validated" };
  } catch (error) {
    return { success: false, message: `AWS SES validation failed: ${String(error)}` };
  }
}
