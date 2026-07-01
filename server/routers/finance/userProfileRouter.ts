import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { users } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * User Profile Management Router
 * Handles user profile retrieval and updates using actual schema fields
 */
export const userProfileRouter = router({
  /**
   * Retrieves the current user's profile information
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      currentOrganizationId: user.currentOrganizationId,
      languagePreference: user.languagePreference,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn,
    };
  }),

  /**
   * Updates user profile information
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        languagePreference: z.string().max(10).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      try {
        const updateData: Record<string, any> = {};

        if (input.name !== undefined) {
          updateData.name = input.name;
        }

        if (input.languagePreference !== undefined) {
          updateData.languagePreference = input.languagePreference;
        }

        if (Object.keys(updateData).length === 0) {
          return { success: true, message: "No changes to update" };
        }

        await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));

        return { success: true, message: "Profile updated successfully" };
      } catch (error: any) {
        throw new Error(`Profile update failed: ${error.message}`);
      }
    }),

  /**
   * Updates user language preference
   */
  updateLanguagePreference: protectedProcedure
    .input(
      z.object({
        language: z.enum(["en", "ar"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      try {
        await db
          .update(users)
          .set({ languagePreference: input.language })
          .where(eq(users.id, ctx.user.id));

        return { success: true, message: "Language preference updated" };
      } catch (error: any) {
        throw new Error(`Language update failed: ${error.message}`);
      }
    }),
});
