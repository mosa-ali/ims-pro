// ============================================================================
// DELETION POLICY SERVICE
// Centralized deletion rules for ALL Logistics & Procurement modules
// ============================================================================

import { environmentService } from './environmentService';

export type DeletableStatus = 
 | 'draft'
 | 'submitted'
 | 'pending_approval'
 | 'under_review_logistics'
 | 'under_review_finance'
 | 'approved'
 | 'rejected'
 | 'cancelled'
 | 'completed'
 | 'paid'
 | 'issued'
 | 'received'
 | 'sent_to_vendor'
 | 'partially_received'
 | 'closed';

/**
 * CRITICAL: Centralized deletion policy for ALL modules
 * 
 * Applies to:
 * - Procurement Request (PR)
 * - Request for Quotation (RFQ)
 * - Quotations Analysis (QA)
 * - Bid Analysis (BA)
 * - Purchase Order (PO)
 * - Goods Receipt Note (GRN)
 * - Delivery Note
 * - Payment/Invoice
 * - Stock Request
 * - Stock Issue
 * - Return
 * - All Templates
 */
class DeletionPolicyService {
 /**
 * Check if deletion is allowed based on status and environment
 * 
 * DEV/TEST/UAT: ✅ Allow all statuses
 * PRODUCTION: ✅ Only 'draft' status
 */
 canDelete(status: string): boolean {
 const isProduction = environmentService.isProduction();
 
 if (isProduction) {
 // 🔒 PRODUCTION: Only draft can be deleted
 return status === 'draft';
 } else {
 // 🔓 DEV/TEST: All statuses can be deleted
 return true;
 }
 }

 /**
 * Get deletion validation result with detailed message
 */
 validateDeletion(status: string, documentType: string = 'record'): {
 allowed: boolean;
 reason?: string;
 environmentMode: string;
 } {
 const allowed = this.canDelete(status);
 const mode = environmentService.getMode();
 
 if (!allowed) {
 return {
 allowed: false,
 reason: `Deletion is not permitted for ${status} ${documentType}s in PRODUCTION environment. Only draft records can be deleted. Use Cancel, Void, or Reverse actions instead.`,
 environmentMode: mode
 };
 }
 
 return {
 allowed: true,
 environmentMode: mode
 };
 }

 /**
 * Check if delete button should be visible in UI
 * 
 * PRODUCTION: Hide if status != 'draft'
 * DEV/TEST: Always show
 */
 shouldShowDeleteButton(status: string): boolean {
 const isProduction = environmentService.isProduction();
 
 if (isProduction) {
 // 🔒 PRODUCTION: Only show for draft
 return status === 'draft';
 } else {
 // 🔓 DEV/TEST: Always show (with warning)
 return true;
 }
 }

 /**
 * Get user-friendly deletion message
 */
 getDeletionWarningMessage(status: string, documentType: string = 'record'): string {
 const isProduction = environmentService.isProduction();
 
 if (isProduction) {
 if (status === 'draft') {
 return `Are you sure you want to delete this draft ${documentType}? This action cannot be undone.`;
 } else {
 return `Cannot delete ${status} ${documentType}s in production. Use Cancel or Void instead.`;
 }
 } else {
 // DEV/TEST warning
 return `⚠️ TEST ENVIRONMENT: You are deleting a ${status} ${documentType}. This is allowed in ${environmentService.getMode()} mode for testing purposes.`;
 }
 }

 /**
 * Log deletion attempt (for audit trail)
 */
 logDeletionAttempt(
 documentType: string,
 documentId: string,
 status: string,
 userId: string,
 allowed: boolean
 ): void {
 const mode = environmentService.getMode();
 const timestamp = new Date().toISOString();
 
 const logEntry = {
 timestamp,
 action: 'DELETE_ATTEMPT',
 documentType,
 documentId,
 status,
 userId,
 allowed,
 environmentMode: mode,
 message: allowed 
 ? `✅ Deletion allowed (${mode} mode)` 
 : `❌ Deletion blocked (${mode} mode, status: ${status})`
 };
 
 console.log('[Deletion Policy]', logEntry);
 
 // In production, this would be sent to audit log service
 // auditLogService.log(logEntry);
 }
}

export const deletionPolicyService = new DeletionPolicyService();
