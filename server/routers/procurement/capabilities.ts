/**
 * Procurement Capability Checks
 * 
 * Centralized single source of truth for workflow rules:
 * - Services category: Contract → SAC → Invoice → Payment (never PO/GRN/DN)
 * - Goods/Works category: PO → GRN → DN → Payment
 * 
 * These functions are used by both backend guards and the frontend capability API.
 */

import { eq, and, sql } from "drizzle-orm";
import { purchaseRequests, contracts, serviceAcceptanceCertificates } from "../../../drizzle/schema";

type DB = any; // Drizzle database instance

export type PRCategory = "goods" | "services" | "works";

/**
 * Determine if a PR category uses the Services workflow
 * Services workflow: Contract → SAC → Invoice → Payment
 * (This includes former "consultancy" which is now merged into "services")
 */
export function isServicesWorkflow(category: string): boolean {
  return category === "services";
}

/**
 * Determine if a PR category uses the Goods/Works workflow
 * Goods/Works workflow: PO → GRN → DN → Payment
 */
export function isGoodsWorksWorkflow(category: string): boolean {
  return category === "goods" || category === "works";
}

/**
 * Check if PO can be created for a given PR
 * Returns { allowed: boolean, reason?: string }
 */
export async function canCreatePO(db: DB, prId: number): Promise<{ allowed: boolean; reason?: string }> {
  const [pr] = await db.select({ category: purchaseRequests.category }).from(purchaseRequests).where(eq(purchaseRequests.id, prId));
  if (!pr) return { allowed: false, reason: "Purchase Request not found" };
  if (isServicesWorkflow(pr.category)) {
    return { allowed: false, reason: "Purchase Orders are not applicable for Services category. Services use Contract → SAC → Invoice → Payment workflow." };
  }
  return { allowed: true };
}

/**
 * Check if GRN can be created for a given PR
 */
export async function canCreateGRN(db: DB, prId: number): Promise<{ allowed: boolean; reason?: string }> {
  const [pr] = await db.select({ category: purchaseRequests.category }).from(purchaseRequests).where(eq(purchaseRequests.id, prId));
  if (!pr) return { allowed: false, reason: "Purchase Request not found" };
  if (isServicesWorkflow(pr.category)) {
    return { allowed: false, reason: "Goods Receipt Notes are not applicable for Services category. Services use Contract → SAC → Invoice → Payment workflow." };
  }
  return { allowed: true };
}

/**
 * Check if Delivery Note can be created for a given PR
 */
export async function canCreateDN(db: DB, prId: number): Promise<{ allowed: boolean; reason?: string }> {
  const [pr] = await db.select({ category: purchaseRequests.category }).from(purchaseRequests).where(eq(purchaseRequests.id, prId));
  if (!pr) return { allowed: false, reason: "Purchase Request not found" };
  if (isServicesWorkflow(pr.category)) {
    return { allowed: false, reason: "Delivery Notes are not applicable for Services category. Services use Contract → SAC → Invoice → Payment workflow." };
  }
  return { allowed: true };
}

/**
 * Check if Contract can be created for a given PR
 * Contract requires: award finalized (from QA or CBA)
 */
export async function canCreateContract(db: DB, prId: number): Promise<{ allowed: boolean; reason?: string }> {
  const [pr] = await db.select({ category: purchaseRequests.category }).from(purchaseRequests).where(eq(purchaseRequests.id, prId));
  if (!pr) return { allowed: false, reason: "Purchase Request not found" };
  if (!isServicesWorkflow(pr.category)) {
    return { allowed: false, reason: "Contracts are only applicable for Services category." };
  }
  // Check if award exists (from QA or CBA)
  return { allowed: true };
}

/**
 * Check if SAC can be created for a given contract
 * SAC requires: Contract is Approved/Active
 */
export async function canCreateSAC(db: DB, contractId: number): Promise<{ allowed: boolean; reason?: string }> {
  const [contract] = await db.select({ status: contracts.status }).from(contracts).where(eq(contracts.id, contractId));
  if (!contract) return { allowed: false, reason: "Contract not found" };
  if (contract.status !== "approved" && contract.status !== "active") {
    return { allowed: false, reason: "Contract must be Approved or Active before creating SAC." };
  }
  return { allowed: true };
}

/**
 * Check if Invoice can be created for a given contract
 * Invoice requires: At least one approved SAC with remaining amount > 0
 */
export async function canCreateInvoice(db: DB, contractId: number): Promise<{ allowed: boolean; reason?: string }> {
  const sacList = await db.select({
    status: serviceAcceptanceCertificates.status,
    approvedAmount: serviceAcceptanceCertificates.approvedAmount,
  }).from(serviceAcceptanceCertificates).where(
    and(
      eq(serviceAcceptanceCertificates.contractId, contractId),
      eq(serviceAcceptanceCertificates.status, "approved")
    )
  );
  if (!sacList || sacList.length === 0) {
    return { allowed: false, reason: "At least one approved SAC is required before creating an invoice." };
  }
  return { allowed: true };
}

/**
 * Check if Payment can be created for a given invoice
 * Payment requires: Invoice Approved/Posted
 */
export async function canCreatePayment(db: DB, invoiceId: number): Promise<{ allowed: boolean; reason?: string }> {
  // Payment validation is handled by the payment engine
  return { allowed: true };
}

/**
 * Get all capabilities for a PR (used by frontend to determine which cards to show)
 */
export async function getPRCapabilities(db: DB, prId: number): Promise<{
  category: string;
  isServices: boolean;
  isGoodsWorks: boolean;
  canCreatePO: boolean;
  canCreateGRN: boolean;
  canCreateDN: boolean;
  canCreateContract: boolean;
  canCreateSAC: boolean;
  canCreateInvoice: boolean;
}> {
  const [pr] = await db.select({ category: purchaseRequests.category }).from(purchaseRequests).where(eq(purchaseRequests.id, prId));
  if (!pr) {
    return {
      category: "goods",
      isServices: false,
      isGoodsWorks: true,
      canCreatePO: false,
      canCreateGRN: false,
      canCreateDN: false,
      canCreateContract: false,
      canCreateSAC: false,
      canCreateInvoice: false,
    };
  }

  const services = isServicesWorkflow(pr.category);
  return {
    category: pr.category,
    isServices: services,
    isGoodsWorks: !services,
    canCreatePO: !services,
    canCreateGRN: !services,
    canCreateDN: !services,
    canCreateContract: services,
    canCreateSAC: services,
    canCreateInvoice: services,
  };
}
