import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { 
  getGlobalSettings, 
  initializeGlobalSettings, 
  updateGlobalSettings 
} from "../db";

/**
 * Global Settings Router (Platform Admin Only)
 * 
 * Manages system-wide settings that affect all organizations.
 * Only platform admins can view and update these settings.
 */

export const globalSettingsRouter = router({
  /**
   * Get current global settings
   * Initializes with defaults if not exists
   */
  get: adminProcedure.query(async () => {
    let settings = await getGlobalSettings();
    
    // Initialize if not exists
    if (!settings) {
      settings = await initializeGlobalSettings();
    }
    
    return settings;
  }),

  /**
   * Update global settings
   * Only allows updating defaultLanguage and environmentLabel in Phase 0
   */
  update: adminProcedure
    .input(
      z.object({
        defaultLanguage: z.enum(["en", "ar"]).optional(),
        environmentLabel: z.enum(["production", "staging", "test"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updated = await updateGlobalSettings(input, ctx.user.id);
      return updated;
    }),
});
