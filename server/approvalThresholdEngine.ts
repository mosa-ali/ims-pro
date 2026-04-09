/**
 * Approval Threshold Enforcement Engine
 * Implements sequential approval tiers with amount-based routing
 * Makes skip-level approval technically impossible
 * 
 * Approval Hierarchy:
 * 1. Finance Officer: $0 - $5,000
 * 2. Finance Manager: $5,001 - $50,000
 * 3. Finance Director: $50,001+
 * 
 * ENFORCEMENT RULES:
 * - Each tier must approve before next tier
 * - Skip-level approval is technically impossible
 * - Amount-based routing is mandatory
 * - Approval chain must be sequential
 */

import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";

export type ApprovalTier = "finance_officer" | "finance_manager" | "finance_director";
export type ApprovalDocumentType = "invoice" | "payment" | "expenditure" | "payable";

/**
 * Define approval thresholds for each tier
 * Amounts in base currency (USD)
 */
export const APPROVAL_THRESHOLDS = {
  finance_officer: { min: 0, max: 5000 },
  finance_manager: { min: 5001, max: 50000 },
  finance_director: { min: 50001, max: Infinity },
};

/**
 * Approval tier hierarchy (sequential order)
 */
export const APPROVAL_TIER_HIERARCHY: ApprovalTier[] = [
  "finance_officer",
  "finance_manager",
  "finance_director",
];

/**
 * Determine required approval tier based on amount
 * Returns the tier that must approve this amount
 */
export function getRequiredApprovalTier(amount: number): ApprovalTier {
  if (amount <= APPROVAL_THRESHOLDS.finance_officer.max) {
    return "finance_officer";
  }
  if (amount <= APPROVAL_THRESHOLDS.finance_manager.max) {
    return "finance_manager";
  }
  return "finance_director";
}

/**
 * Get all required approval tiers up to and including the required tier
 * Ensures sequential approval chain
 * 
 * Example: If amount requires Finance Manager approval,
 * returns ["finance_officer", "finance_manager"]
 */
export function getRequiredApprovalChain(amount: number): ApprovalTier[] {
  const requiredTier = getRequiredApprovalTier(amount);
  const requiredTierIndex = APPROVAL_TIER_HIERARCHY.indexOf(requiredTier);
  return APPROVAL_TIER_HIERARCHY.slice(0, requiredTierIndex + 1);
}

/**
 * Validate that user has required approval role
 * Throws FORBIDDEN if user lacks required role
 */
export function validateUserApprovalRole(
  userRole: string | undefined,
  requiredTier: ApprovalTier
): void {
  if (!userRole) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User role not found. Cannot determine approval authority.",
    });
  }

  // Map user roles to approval tiers
  const roleToTier: Record<string, ApprovalTier> = {
    finance_officer: "finance_officer",
    finance_manager: "finance_manager",
    finance_director: "finance_director",
    admin: "finance_director", // Admin has highest authority
  };

  const userTier = roleToTier[userRole];
  if (!userTier) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `User role "${userRole}" does not have approval authority.`,
    });
  }

  // Check if user's tier meets or exceeds required tier
  const userTierIndex = APPROVAL_TIER_HIERARCHY.indexOf(userTier);
  const requiredTierIndex = APPROVAL_TIER_HIERARCHY.indexOf(requiredTier);

  if (userTierIndex < requiredTierIndex) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Insufficient approval authority. Required: ${requiredTier}, User: ${userTier}. Amount exceeds your approval limit.`,
    });
  }
}

/**
 * Validate sequential approval chain
 * Ensures all lower tiers have approved before higher tier approval
 * 
 * ENFORCEMENT: Skip-level approval is technically impossible
 */
export async function validateApprovalChain(
  db: any,
  documentId: number,
  documentType: ApprovalDocumentType,
  amount: number,
  currentUserTier: ApprovalTier
): Promise<void> {
  const requiredChain = getRequiredApprovalChain(amount);
  const currentTierIndex = APPROVAL_TIER_HIERARCHY.indexOf(currentUserTier);

  // Get approval history for this document
  const approvalHistory = await getApprovalHistory(db, documentId, documentType);

  // Check that all lower tiers have approved
  for (let i = 0; i < currentTierIndex; i++) {
    const lowerTier = APPROVAL_TIER_HIERARCHY[i];
    const lowerTierApproved = approvalHistory.some(
      (approval: any) => approval.approvalTier === lowerTier && approval.status === "approved"
    );

    if (!lowerTierApproved) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Cannot skip approval levels. ${lowerTier} must approve before ${currentUserTier} can approve.`,
      });
    }
  }
}

/**
 * Get approval history for a document
 */
export async function getApprovalHistory(
  db: any,
  documentId: number,
  documentType: ApprovalDocumentType
): Promise<any[]> {
  // This would query the approval history table
  // For now, return empty array (to be implemented with actual DB schema)
  return [];
}

/**
 * Record approval action
 * Stores approval tier, timestamp, and user info
 */
export async function recordApproval(
  db: any,
  documentId: number,
  documentType: ApprovalDocumentType,
  approvalTier: ApprovalTier,
  userId: number,
  status: "approved" | "rejected",
  reason?: string
): Promise<void> {
  // This would insert into approval history table
  // Implementation depends on actual DB schema
  console.log(`Recorded ${status} for ${documentType} ${documentId} by ${approvalTier}`);
}

/**
 * Validate invoice approval with threshold enforcement
 * ENFORCEMENT: Approval is impossible without proper tier authorization
 */
export async function validateInvoiceApprovalThreshold(
  db: any,
  invoiceId: number,
  invoiceAmount: number,
  userRole: string | undefined
): Promise<{ requiredTier: ApprovalTier; approvalChain: ApprovalTier[] }> {
  const requiredTier = getRequiredApprovalTier(invoiceAmount);
  const approvalChain = getRequiredApprovalChain(invoiceAmount);

  // Validate user has required role
  validateUserApprovalRole(userRole, requiredTier);

  // Validate sequential approval chain
  const userTier = mapRoleToTier(userRole);
  await validateApprovalChain(db, invoiceId, "invoice", invoiceAmount, userTier);

  return { requiredTier, approvalChain };
}

/**
 * Validate payment approval with threshold enforcement
 */
export async function validatePaymentApprovalThreshold(
  db: any,
  paymentId: number,
  paymentAmount: number,
  userRole: string | undefined
): Promise<{ requiredTier: ApprovalTier; approvalChain: ApprovalTier[] }> {
  const requiredTier = getRequiredApprovalTier(paymentAmount);
  const approvalChain = getRequiredApprovalChain(paymentAmount);

  validateUserApprovalRole(userRole, requiredTier);

  const userTier = mapRoleToTier(userRole);
  await validateApprovalChain(db, paymentId, "payment", paymentAmount, userTier);

  return { requiredTier, approvalChain };
}

/**
 * Validate expenditure approval with threshold enforcement
 */
export async function validateExpenditureApprovalThreshold(
  db: any,
  expenditureId: number,
  expenditureAmount: number,
  userRole: string | undefined
): Promise<{ requiredTier: ApprovalTier; approvalChain: ApprovalTier[] }> {
  const requiredTier = getRequiredApprovalTier(expenditureAmount);
  const approvalChain = getRequiredApprovalChain(expenditureAmount);

  validateUserApprovalRole(userRole, requiredTier);

  const userTier = mapRoleToTier(userRole);
  await validateApprovalChain(db, expenditureId, "expenditure", expenditureAmount, userTier);

  return { requiredTier, approvalChain };
}

/**
 * Helper: Map user role to approval tier
 */
function mapRoleToTier(userRole: string | undefined): ApprovalTier {
  if (!userRole) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User role not found.",
    });
  }

  const roleToTier: Record<string, ApprovalTier> = {
    finance_officer: "finance_officer",
    finance_manager: "finance_manager",
    finance_director: "finance_director",
    admin: "finance_director",
  };

  const tier = roleToTier[userRole];
  if (!tier) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `User role "${userRole}" does not have approval authority.`,
    });
  }

  return tier;
}

/**
 * Get approval tier display name
 */
export function getTierDisplayName(tier: ApprovalTier): string {
  const names: Record<ApprovalTier, string> = {
    finance_officer: "Finance Officer",
    finance_manager: "Finance Manager",
    finance_director: "Finance Director",
  };
  return names[tier];
}

/**
 * Get threshold range display
 */
export function getThresholdDisplay(tier: ApprovalTier): string {
  const threshold = APPROVAL_THRESHOLDS[tier];
  if (threshold.max === Infinity) {
    return `$${threshold.min.toLocaleString()}+`;
  }
  return `$${threshold.min.toLocaleString()} - $${threshold.max.toLocaleString()}`;
}
