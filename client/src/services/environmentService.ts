// ============================================================================
// ENVIRONMENT SERVICE
// Controls system behavior based on environment mode
// ============================================================================

export type EnvironmentMode = 'DEV' | 'TEST' | 'UAT' | 'PRODUCTION';

const STORAGE_KEY = 'ims_environment_mode';

/**
 * CRITICAL: Environment Mode determines deletion rules system-wide
 * 
 * DEV/TEST/UAT:
 * - ✅ Allow deletion of ALL statuses (draft, pending_approval, approved, rejected, etc.)
 * - Reason: Data correction, iterative testing, workflow re-runs
 * 
 * PRODUCTION:
 * - ✅ Allow deletion ONLY for 'draft' status
 * - ❌ Block deletion for all other statuses (audit-safe, donor-compliant)
 */
class EnvironmentService {
 private currentMode: EnvironmentMode;

 constructor() {
 // Load from localStorage or default to DEV
 const stored = localStorage.getItem(STORAGE_KEY);
 this.currentMode = (stored as EnvironmentMode) || 'DEV';
 }

 /**
 * Get current environment mode
 */
 getMode(): EnvironmentMode {
 return this.currentMode;
 }

 /**
 * Set environment mode
 */
 setMode(mode: EnvironmentMode): void {
 this.currentMode = mode;
 localStorage.setItem(STORAGE_KEY, mode);
 console.log(`🌍 [Environment] Mode changed to: ${mode}`);
 }

 /**
 * Check if currently in production
 */
 isProduction(): boolean {
 return this.currentMode === 'PRODUCTION';
 }

 /**
 * Check if currently in development/test
 */
 isDevelopment(): boolean {
 return ['DEV', 'TEST', 'UAT'].includes(this.currentMode);
 }

 /**
 * Get environment display info
 */
 getEnvironmentInfo(): {
 mode: EnvironmentMode;
 isProduction: boolean;
 deletionPolicy: string;
 description: string;
 } {
 const isProduction = this.isProduction();
 
 return {
 mode: this.currentMode,
 isProduction,
 deletionPolicy: isProduction 
 ? 'Strict (draft only)' 
 : 'Relaxed (all statuses)',
 description: isProduction
 ? 'Production mode - Strict audit controls active'
 : 'Development mode - Flexible testing enabled'
 };
 }
}

export const environmentService = new EnvironmentService();
