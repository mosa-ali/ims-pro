import { router, publicProcedure, protectedProcedure } from '@/server/_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';
import { samlSessions, samlIdpConfigurations, users } from '@/drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import * as crypto from 'crypto';

const ProcessSAMLAssertionSchema = z.object({
  organizationId: z.number(),
  samlResponse: z.string(), // Base64 encoded SAML response
  relayState: z.string().optional(),
});

const CreateSAMLSessionSchema = z.object({
  userId: z.number(),
  organizationId: z.number(),
  samlProvider: z.enum(['okta', 'azure_ad', 'generic']),
  samlNameId: z.string(),
  samlSessionIndex: z.string().optional(),
  samlAttributes: z.record(z.any()).optional(),
});

const ProvisionUserSchema = z.object({
  organizationId: z.number(),
  samlProvider: z.enum(['okta', 'azure_ad', 'generic']),
  email: z.string().email(),
  name: z.string(),
  samlNameId: z.string(),
  samlAttributes: z.record(z.any()).optional(),
});

export const samlRouter = router({
  // Process SAML assertion from IdP
  processSAMLAssertion: publicProcedure
    .input(ProcessSAMLAssertionSchema)
    .mutation(async ({ input }) => {
      try {
        // Get SAML IdP configuration
        const idpConfig = await db
          .select()
          .from(samlIdpConfigurations)
          .where(
            and(
              eq(samlIdpConfigurations.organizationId, input.organizationId),
              eq(samlIdpConfigurations.isEnabled, true),
              isNull(samlIdpConfigurations.deletedAt)
            )
          )
          .limit(1);

        if (idpConfig.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SAML configuration not found for this organization',
          });
        }

        // TODO: Validate SAML response signature and structure
        // This requires samlify or similar library
        // const samlAssertion = await validateSAMLResponse(
        //   input.samlResponse,
        //   idpConfig[0]
        // );

        // For now, parse SAML response (in production, use proper validation)
        let samlAssertion: any = {};
        try {
          // Decode base64 SAML response
          const decodedResponse = Buffer.from(input.samlResponse, 'base64').toString('utf-8');
          // Extract attributes from SAML response (simplified)
          // In production, use proper XML parsing
          samlAssertion = {
            nameId: extractNameId(decodedResponse),
            attributes: extractAttributes(decodedResponse),
            sessionIndex: extractSessionIndex(decodedResponse),
          };
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid SAML response format',
          });
        }

        // Check if user exists
        let user = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.email, samlAssertion.attributes?.email || ''),
              isNull(users.deletedAt)
            )
          )
          .limit(1);

        // If user doesn't exist and auto-provisioning is enabled, create user
        if (user.length === 0 && idpConfig[0].autoProvisionUsers) {
          const newUser = await provisionUserFromSAML(
            input.organizationId,
            idpConfig[0].provider,
            samlAssertion,
            idpConfig[0].attributeMapping as any
          );
          user = [newUser];
        } else if (user.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found and auto-provisioning is disabled',
          });
        }

        // Create SAML session
        const sessionId = crypto.randomUUID();
        await db.insert(samlSessions).values({
          userId: user[0].id,
          organizationId: input.organizationId,
          samlProvider: idpConfig[0].provider,
          samlNameId: samlAssertion.nameId,
          samlSessionIndex: samlAssertion.sessionIndex,
          samlAttributes: samlAssertion.attributes as any,
          isActive: true,
          lastAuthenticatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        });

        return {
          success: true,
          userId: user[0].id,
          email: user[0].email,
          name: user[0].name,
          sessionId,
          message: 'SAML authentication successful',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Process SAML assertion error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process SAML assertion',
        });
      }
    }),

  // Create SAML session (for testing)
  createSAMLSession: protectedProcedure
    .input(CreateSAMLSessionSchema)
    .mutation(async ({ input }) => {
      try {
        // Create SAML session
        await db.insert(samlSessions).values({
          userId: input.userId,
          organizationId: input.organizationId,
          samlProvider: input.samlProvider,
          samlNameId: input.samlNameId,
          samlSessionIndex: input.samlSessionIndex,
          samlAttributes: input.samlAttributes as any,
          isActive: true,
          lastAuthenticatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        });

        return {
          success: true,
          message: 'SAML session created successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Create SAML session error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create SAML session',
        });
      }
    }),

  // Provision user from SAML assertion
  provisionUser: protectedProcedure
    .input(ProvisionUserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Get SAML IdP configuration
        const idpConfig = await db
          .select()
          .from(samlIdpConfigurations)
          .where(
            and(
              eq(samlIdpConfigurations.organizationId, input.organizationId),
              eq(samlIdpConfigurations.provider, input.samlProvider),
              isNull(samlIdpConfigurations.deletedAt)
            )
          )
          .limit(1);

        if (idpConfig.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SAML configuration not found',
          });
        }

        // Create new user
        const newUser = await db.insert(users).values({
          email: input.email,
          name: input.name,
          authenticationProvider: input.samlProvider,
          externalIdentityId: input.samlNameId,
          organizationId: input.organizationId,
          role: idpConfig[0].defaultRole as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
          deletedAt: null,
        });

        // Create SAML session
        await db.insert(samlSessions).values({
          userId: newUser.insertId,
          organizationId: input.organizationId,
          samlProvider: input.samlProvider,
          samlNameId: input.samlNameId,
          samlAttributes: input.samlAttributes as any,
          isActive: true,
          lastAuthenticatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        });

        return {
          success: true,
          userId: newUser.insertId,
          email: input.email,
          name: input.name,
          message: 'User provisioned successfully from SAML',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Provision user error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to provision user from SAML',
        });
      }
    }),

  // Get SAML session
  getSAMLSession: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        organizationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      try {
        const session = await db
          .select()
          .from(samlSessions)
          .where(
            and(
              eq(samlSessions.userId, input.userId),
              eq(samlSessions.organizationId, input.organizationId),
              eq(samlSessions.isActive, true),
              isNull(samlSessions.deletedAt)
            )
          )
          .limit(1);

        if (session.length === 0) {
          return {
            active: false,
            session: null,
          };
        }

        // Check if session is expired
        if (new Date() > new Date(session[0].expiresAt)) {
          // Mark as inactive
          await db
            .update(samlSessions)
            .set({
              isActive: false,
              deletedAt: new Date(),
            })
            .where(eq(samlSessions.id, session[0].id));

          return {
            active: false,
            session: null,
          };
        }

        return {
          active: true,
          session: {
            provider: session[0].samlProvider,
            nameId: session[0].samlNameId,
            lastAuthenticated: session[0].lastAuthenticatedAt,
            expiresAt: session[0].expiresAt,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Get SAML session error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get SAML session',
        });
      }
    }),

  // Logout SAML session
  logoutSAMLSession: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        organizationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db
          .update(samlSessions)
          .set({
            isActive: false,
            deletedAt: new Date(),
          })
          .where(
            and(
              eq(samlSessions.userId, input.userId),
              eq(samlSessions.organizationId, input.organizationId)
            )
          );

        return {
          success: true,
          message: 'SAML session terminated',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Logout SAML session error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to logout SAML session',
        });
      }
    }),
});

// Helper functions
function extractNameId(samlResponse: string): string {
  // Extract NameID from SAML response
  const match = samlResponse.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
  return match ? match[1] : '';
}

function extractAttributes(samlResponse: string): Record<string, any> {
  // Extract attributes from SAML response
  const attributes: Record<string, any> = {};

  // Extract email
  const emailMatch = samlResponse.match(/<saml:Attribute Name="email"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/);
  if (emailMatch) {
    attributes.email = emailMatch[1];
  }

  // Extract name
  const nameMatch = samlResponse.match(/<saml:Attribute Name="name"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/);
  if (nameMatch) {
    attributes.name = nameMatch[1];
  }

  // Extract groups
  const groupsMatch = samlResponse.match(/<saml:Attribute Name="groups"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/g);
  if (groupsMatch) {
    attributes.groups = groupsMatch.map((g) => {
      const match = g.match(/<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/);
      return match ? match[1] : '';
    });
  }

  return attributes;
}

function extractSessionIndex(samlResponse: string): string {
  // Extract SessionIndex from SAML response
  const match = samlResponse.match(/SessionIndex="([^"]+)"/);
  return match ? match[1] : '';
}

async function provisionUserFromSAML(
  organizationId: number,
  provider: string,
  samlAssertion: any,
  attributeMapping?: Record<string, string>
) {
  // Create new user from SAML assertion
  const email = samlAssertion.attributes?.email || '';
  const name = samlAssertion.attributes?.name || samlAssertion.nameId;

  if (!email) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Email attribute not found in SAML assertion',
    });
  }

  const newUser = await db.insert(users).values({
    email,
    name,
    authenticationProvider: provider,
    externalIdentityId: samlAssertion.nameId,
    organizationId,
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    deletedAt: null,
  });

  // Get the inserted user
  const insertedUser = await db
    .select()
    .from(users)
    .where(eq(users.id, newUser.insertId))
    .limit(1);

  return insertedUser[0];
}
