/**
 * Vendor Master Automation
 * Automated vendor registration, duplicate detection, and lifecycle management
 */

import { getDb } from "./db";
import {
  vendors,
  vendorParticipationHistory,
  vendorPerformanceEvaluations,
  type Vendor,
  type InsertVendor,
  type InsertVendorParticipationHistory,
} from "drizzle/schema";
import { eq, and, or, sql } from "drizzle-orm";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

/**
 * Duplicate Detection Strategy
 * Matches vendors by: legalName, registrationNumber, taxId, email, phone
 */
export async function findDuplicateVendor(params: {
  organizationId: number;
  legalName?: string;
  name?: string;
  registrationNumber?: string;
  taxId?: string;
  email?: string;
  phone?: string;
}): Promise<Vendor | null> {
  const { organizationId, legalName, name, registrationNumber, taxId, email, phone } = params;

  // Build OR conditions for matching
  const matchConditions = [];

  // Note: vendors table uses 'name' field, not 'legalName'
  if (legalName) {
    matchConditions.push(sql`LOWER(${vendors.name}) = LOWER(${legalName})`);
  }
  if (name) {
    matchConditions.push(sql`LOWER(${vendors.name}) = LOWER(${name})`);
  }
  if (registrationNumber) {
    matchConditions.push(eq(vendors.registrationNumber, registrationNumber));
  }
  if (taxId) {
    matchConditions.push(eq(vendors.taxId, taxId));
  }
  if (email) {
    matchConditions.push(sql`LOWER(${vendors.email}) = LOWER(${email})`);
  }
  if (phone) {
    matchConditions.push(eq(vendors.phone, phone));
  }

  if (matchConditions.length === 0) {
    return null;
  }

  const db = await getDb();
  const existingVendors = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.organizationId, organizationId), or(...matchConditions)))
    .limit(1);

  return existingVendors[0] || null;
}

/**
 * Auto-register vendor from procurement workflow
 * Creates vendor if doesn't exist, returns existing if duplicate found
 */
export async function autoRegisterVendor(params: {
  organizationId: number;
  operatingUnitId?: number;
  legalName: string;
  vendorType: string;
  legalNameAr?: string;
  tradeName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  registrationNumber?: string;
  taxId?: string;
  primaryCategory?: string;
  sourceModule: "procurement" | "logistics" | "finance" | "manual";
  sourceReferenceId?: string;
  sourceReferenceType?: string;
  createdBy?: number;
}): Promise<{ vendor: Vendor; isNew: boolean }> {
  // Check for duplicates
  const duplicate = await findDuplicateVendor({
    organizationId: params.organizationId,
    legalName: params.legalName,
    name: params.legalName,
    registrationNumber: params.registrationNumber,
    taxId: params.taxId,
    email: params.email,
    phone: params.phone,
  });

  if (duplicate) {
    return { vendor: duplicate, isNew: false };
  }

  const db = await getDb();
  
  // Generate vendor code
  const vendorCode = await generateVendorCode(params.organizationId);

  // Create new vendor
  const newVendor: InsertVendor = {
    organizationId: params.organizationId,
    operatingUnitId: params.operatingUnitId,
    vendorCode,
    name: params.legalName,
    legalName: params.legalName,
    legalNameAr: params.legalNameAr,
    tradeName: params.tradeName,
    contactPerson: params.contactPerson,
    email: params.email,
    phone: params.phone,
    mobile: params.mobile,
    addressLine1: params.addressLine1,
    city: params.city,
    country: params.country,
    registrationNumber: params.registrationNumber,
    taxId: params.taxId,
    primaryCategory: params.primaryCategory,
    sourceModule: params.sourceModule,
    sourceReferenceId: params.sourceReferenceId,
    sourceReferenceType: params.sourceReferenceType,
    approvalStatus: "pending_approval",
    isActive: true,
    isFinanciallyActive: false,
    createdBy: params.createdBy,
  };

  // Insert vendor - for MySQL/TiDB, we'll query by the unique vendor code
  await db.insert(vendors).values(newVendor);
  
  // Query the vendor by vendorCode which is unique
  const [vendor] = await db.select().from(vendors).where(eq(vendors.vendorCode, newVendor.vendorCode));

  if (!vendor) {
    throw new Error(`Failed to retrieve created vendor with code ${newVendor.vendorCode}`);
  }
  return { vendor, isNew: true };
}

/**
 * Generate unique vendor code
 * Format: VEN-YYYY-NNNN
 */
async function generateVendorCode(organizationId: number): Promise<string> {
  const db = await getDb();
  const year = new Date().getFullYear();
  const prefix = `VEN-${year}-`;

  // Get the latest vendor code for this year
  const latestVendor = await db
    .select({ vendorCode: vendors.vendorCode })
    .from(vendors)
    .where(and(eq(vendors.organizationId, organizationId), sql`${vendors.vendorCode} LIKE ${prefix + "%"}`))
    .orderBy(sql`${vendors.vendorCode} DESC`)
    .limit(1);

  let nextNumber = 1;
  if (latestVendor.length > 0 && latestVendor[0].vendorCode) {
    const match = latestVendor[0].vendorCode.match(/VEN-\d{4}-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Record vendor participation in procurement process
 */
export async function recordVendorParticipation(params: {
  vendorId: number;
  organizationId: number;
  operatingUnitId?: number;
  participationType: "rfq" | "tender" | "quotation" | "bid";
  purchaseRequestId?: number;
  quotationAnalysisId?: number;
  bidAnalysisId?: number;
  submissionDate?: Date;
  submissionStatus?: "invited" | "submitted" | "withdrawn" | "disqualified";
  technicalScore?: number;
  financialScore?: number;
  totalScore?: number;
  ranking?: number;
  isWinner?: boolean;
  awardedContractValue?: number;
  currency?: string;
  evaluationNotes?: string;
  disqualificationReason?: string;
  evaluationScore?: number;
  createdBy?: number;
}): Promise<void> {
  const db = await getDb();
  
  // Build participation record with required and optional fields
  const participation: Record<string, any> = {
    vendorId: params.vendorId,
    organizationId: params.organizationId,
    participationType: params.participationType,
  };
  
  
  // Add optional fields only if they are defined
  if (params.operatingUnitId !== undefined) participation.operatingUnitId = params.operatingUnitId;
  if (params.purchaseRequestId !== undefined) participation.purchaseRequestId = params.purchaseRequestId;
  if (params.quotationAnalysisId !== undefined) participation.quotationAnalysisId = params.quotationAnalysisId;
  if (params.bidAnalysisId !== undefined) participation.bidAnalysisId = params.bidAnalysisId;
  if (params.submissionDate !== undefined) participation.submissionDate = params.submissionDate;
  if (params.submissionStatus !== undefined) participation.submissionStatus = params.submissionStatus;
  if (params.technicalScore !== undefined) participation.technicalScore = params.technicalScore.toString();
  if (params.financialScore !== undefined) participation.financialScore = params.financialScore.toString();
  if (params.totalScore !== undefined) participation.totalScore = params.totalScore.toString();
  if (params.ranking !== undefined) participation.ranking = params.ranking;
  if (params.isWinner !== undefined) participation.isWinner = params.isWinner;
  if (params.awardedContractValue !== undefined) participation.awardedContractValue = params.awardedContractValue.toString();
  if (params.currency !== undefined) participation.currency = params.currency;
  if (params.evaluationNotes !== undefined) participation.evaluationNotes = params.evaluationNotes;
  if (params.disqualificationReason !== undefined) participation.disqualificationReason = params.disqualificationReason;

  await db.insert(vendorParticipationHistory).values(participation);

  // Update vendor statistics
  await updateVendorStatistics(params.vendorId);
}

/**
 * Update vendor performance statistics
 * Recalculates: totalPRParticipations, totalContractsAwarded, totalContractsValue
 */
export async function updateVendorStatistics(vendorId: number): Promise<void> {
  const db = await getDb();
  // Count total participations
  const [participationStats] = await db
    .select({
      totalParticipations: sql<number>`COUNT(*)`,
      totalWins: sql<number>`SUM(CASE WHEN ${vendorParticipationHistory.isWinner} = true THEN 1 ELSE 0 END)`,
      totalContractValue: sql<string>`SUM(CASE WHEN ${vendorParticipationHistory.isWinner} = true THEN ${vendorParticipationHistory.awardedContractValue} ELSE 0 END)`,
    })
    .from(vendorParticipationHistory)
    .where(eq(vendorParticipationHistory.vendorId, vendorId));

  // Update vendor record
  await db
    .update(vendors)
    .set({
      totalPRParticipations: participationStats.totalParticipations || 0,
      totalContractsAwarded: participationStats.totalWins || 0,
      totalContractsValue: participationStats.totalContractValue || "0",
      updatedAt: nowSql,
    })
    .where(eq(vendors.id, vendorId));
}

/**
 * Activate vendor for financial operations
 * Called when vendor wins a contract and needs to receive payments
 */
export async function activateVendorFinancially(params: {
  vendorId: number;
  activatedBy: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  iban?: string;
  swiftCode?: string;
  glAccountId?: number;
  paymentTerms?: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(vendors)
    .set({
      isFinanciallyActive: 1,
      financialActivationDate: new Date(),
      financialActivatedBy: params.activatedBy,
      bankName: params.bankName,
      bankAccountNumber: params.bankAccountNumber,
      bankAccountName: params.bankAccountName,
      iban: params.iban,
      swiftCode: params.swiftCode,
      glAccountId: params.glAccountId,
      paymentTerms: params.paymentTerms,
      approvalStatus: "approved",
      updatedAt: nowSql,
    })
    .where(eq(vendors.id, params.vendorId));
}

/**
 * Calculate vendor performance rating
 * Based on: participation win rate, on-time delivery, quality rating
 */
export async function calculateVendorPerformanceRating(vendorId: number): Promise<number> {
  const db = await getDb();
  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId));

  if (!vendor) return 0;

  let rating = 0;
  let factors = 0;

  // Win rate (40% weight)
  if (vendor.totalPRParticipations && vendor.totalPRParticipations > 0) {
    const winRate = (vendor.totalContractsAwarded || 0) / vendor.totalPRParticipations;
    rating += winRate * 40;
    factors++;
  }

  // On-time delivery rate (30% weight)
  if (vendor.onTimeDeliveryRate) {
    rating += parseFloat(vendor.onTimeDeliveryRate) * 0.3;
    factors++;
  }

  // Quality rating (30% weight)
  if (vendor.qualityRating) {
    rating += parseFloat(vendor.qualityRating) * 0.3;
    factors++;
  }

  // Update vendor performance rating
  const finalRating = factors > 0 ? rating / factors : 0;
  await db
    .update(vendors)
    .set({
      performanceRating: finalRating.toFixed(2),
      updatedAt: nowSql,
    })
    .where(eq(vendors.id, vendorId));

  return finalRating;
}
