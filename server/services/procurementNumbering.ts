/**
 * Procurement Document Auto-Numbering Service
 * 
 * Generates unique, scope-aware document numbers for procurement workflow:
 * - PR: PR-[OU]-[Year]-[Seq] (e.g., PR-HQ-2026-001)
 * - RFQ: RFQ-PR-[PRNumber]-[Seq] (e.g., RFQ-PR-HQ-2026-001-01)
 * - PO: PO-[OU]-[Year]-[Seq] (e.g., PO-HQ-2026-001)
 * - GRN: GRN-[PONumber]-[Seq] (e.g., GRN-PO-HQ-2026-001-01)
 * - BA: BA-[OU]-[Year]-[Seq] (e.g., BA-HQ-2026-001)
 * - QA: QA-[OU]-[Year]-[Seq] (e.g., QA-HQ-2026-001)
 * - CON: CON-[OU]-[Year]-[Seq] (e.g., CON-HQ-2026-001)
 */

import { getDb } from "../db";
import { procurementNumberSequences, operatingUnits } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

type DocumentType = "PR" | "RFQ" | "PO" | "GRN" | "BA" | "QA" | "CON";

interface NumberingContext {
  organizationId: number;
  operatingUnitId: number;
  documentType: DocumentType;
  parentNumber?: string; // For RFQ (PR number) or GRN (PO number)
}

/**
 * Get or create sequence record for a given context
 */
async function getOrCreateSequence(
  organizationId: number,
  operatingUnitId: number,
  documentType: DocumentType,
  year: number
): Promise<number> {
  // Try to find existing sequence
  const db = await getDb();
  const existing = await db
    .select()
    .from(procurementNumberSequences)
    .where(
      and(
        eq(procurementNumberSequences.organizationId, organizationId),
        eq(procurementNumberSequences.operatingUnitId, operatingUnitId),
        eq(procurementNumberSequences.documentType, documentType),
        eq(procurementNumberSequences.year, year)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Increment and return
    const newSequence = existing[0].currentSequence + 1;
    
    await db
      .update(procurementNumberSequences)
      .set({
        currentSequence: newSequence,
        lastGeneratedAt: nowSql,
      })
      .where(eq(procurementNumberSequences.id, existing[0].id));
    
    return newSequence;
  }

  // Create new sequence starting at 1
  const [result] = await db.insert(procurementNumberSequences).values({
    organizationId,
    operatingUnitId,
    documentType,
    year,
    currentSequence: 1,
    lastGeneratedAt: nowSql,
  });

  return 1;
}

/**
 * Get Operating Unit code (short code for numbering)
 * Falls back to OU ID if code doesn't exist
 */
async function getOperatingUnitCode(operatingUnitId: number): Promise<string> {
  const db = await getDb();
  const [ou] = await db
    .select({ code: operatingUnits.code })
    .from(operatingUnits)
    .where(eq(operatingUnits.id, operatingUnitId))
    .limit(1);

  // If OU not found, use OU ID as fallback
  if (!ou) {
    return `OU${operatingUnitId}`;
  }

  // If OU found but has no code, use OU ID as fallback
  if (!ou.code) {
    return `OU${operatingUnitId}`;
  }

  // Extract short code from full code (e.g., "YDH-01" -> "YDH01" or "HQ" -> "HQ")
  return ou.code.replace(/-/g, "");
}

/**
 * Generate PR Number: PR-[OU]-[Year]-[Seq]
 * Example: PR-HQ-2026-001
 */
export async function generatePRNumber(
  organizationId: number,
  operatingUnitId: number
): Promise<string> {
  const year = new Date().getFullYear();
  const ouCode = await getOperatingUnitCode(operatingUnitId);
  const sequence = await getOrCreateSequence(organizationId, operatingUnitId, "PR", year);
  
  const paddedSequence = sequence.toString().padStart(3, "0");
  const prNumber = `PR-${ouCode}-${year}-${paddedSequence}`;
  
  // Update last generated number
  const db = await getDb();
  await db
    .update(procurementNumberSequences)
    .set({ lastGeneratedNumber: prNumber })
    .where(
      and(
        eq(procurementNumberSequences.organizationId, organizationId),
        eq(procurementNumberSequences.operatingUnitId, operatingUnitId),
        eq(procurementNumberSequences.documentType, "PR"),
        eq(procurementNumberSequences.year, year)
      )
    );
  
  return prNumber;
}

/**
 * Generate RFQ Number: RFQ-PR-[PRNumber]-[Seq]
 * Example: RFQ-PR-HQ-2026-001-01
 */
export async function generateRFQNumber(
  organizationId: number,
  operatingUnitId: number,
  prNumber: string
): Promise<string> {
  const year = new Date().getFullYear();
  const sequence = await getOrCreateSequence(organizationId, operatingUnitId, "RFQ", year);
  
  const paddedSequence = sequence.toString().padStart(2, "0");
  const rfqNumber = `RFQ-${prNumber}-${paddedSequence}`;
  
  // Update last generated number
  const db = await getDb();
  await db
    .update(procurementNumberSequences)
    .set({ lastGeneratedNumber: rfqNumber })
    .where(
      and(
        eq(procurementNumberSequences.organizationId, organizationId),
        eq(procurementNumberSequences.operatingUnitId, operatingUnitId),
        eq(procurementNumberSequences.documentType, "RFQ"),
        eq(procurementNumberSequences.year, year)
      )
    );
  
  return rfqNumber;
}

/**
 * Generate PO Number: PO-[OU]-[Year]-[Seq]
 * Example: PO-HQ-2026-001
 */
export async function generatePONumber(
  organizationId: number,
  operatingUnitId: number
): Promise<string> {
  const year = new Date().getFullYear();
  const ouCode = await getOperatingUnitCode(operatingUnitId);
  const sequence = await getOrCreateSequence(organizationId, operatingUnitId, "PO", year);
  
  const paddedSequence = sequence.toString().padStart(3, "0");
  const poNumber = `PO-${ouCode}-${year}-${paddedSequence}`;
  
  // Update last generated number
  const db = await getDb();
  await db
    .update(procurementNumberSequences)
    .set({ lastGeneratedNumber: poNumber })
    .where(
      and(
        eq(procurementNumberSequences.organizationId, organizationId),
        eq(procurementNumberSequences.operatingUnitId, operatingUnitId),
        eq(procurementNumberSequences.documentType, "PO"),
        eq(procurementNumberSequences.year, year)
      )
    );
  
  return poNumber;
}

/**
 * Generate GRN Number: GRN-[PONumber]-[Seq]
 * Example: GRN-PO-HQ-2026-001-01
 */
export async function generateGRNNumber(
  organizationId: number,
  operatingUnitId: number,
  poNumber: string
): Promise<string> {
  const year = new Date().getFullYear();
  const sequence = await getOrCreateSequence(organizationId, operatingUnitId, "GRN", year);
  
  const paddedSequence = sequence.toString().padStart(2, "0");
  const grnNumber = `GRN-${poNumber}-${paddedSequence}`;
  
  // Update last generated number
  const db = await getDb();
  await db
    .update(procurementNumberSequences)
    .set({ lastGeneratedNumber: grnNumber })
    .where(
      and(
        eq(procurementNumberSequences.organizationId, organizationId),
        eq(procurementNumberSequences.operatingUnitId, operatingUnitId),
        eq(procurementNumberSequences.documentType, "GRN"),
        eq(procurementNumberSequences.year, year)
      )
    );
  
  return grnNumber;
}

/**
 * Generate BA (Bid Analysis) Number: BA-[OU]-[Year]-[Seq]
 * Example: BA-HQ-2026-001
 */
export async function generateBANumber(
  organizationId: number,
  operatingUnitId: number
): Promise<string> {
  const year = new Date().getFullYear();
  const ouCode = await getOperatingUnitCode(operatingUnitId);
  const sequence = await getOrCreateSequence(organizationId, operatingUnitId, "BA", year);
  
  const paddedSequence = sequence.toString().padStart(3, "0");
  const baNumber = `BA-${ouCode}-${year}-${paddedSequence}`;
  
  // Update last generated number
  const db = await getDb();
  await db
    .update(procurementNumberSequences)
    .set({ lastGeneratedNumber: baNumber })
    .where(
      and(
        eq(procurementNumberSequences.organizationId, organizationId),
        eq(procurementNumberSequences.operatingUnitId, operatingUnitId),
        eq(procurementNumberSequences.documentType, "BA"),
        eq(procurementNumberSequences.year, year)
      )
    );
  
  return baNumber;
}

/**
 * Generate QA (Quotation Analysis) Number: QA-[OU]-[Year]-[Seq]
 * Example: QA-HQ-2026-001
 */
export async function generateQANumber(
  organizationId: number,
  operatingUnitId?: number
): Promise<string> {
  if (!operatingUnitId) {
    throw new Error("Operating Unit ID is required for QA number generation");
  }
  const year = new Date().getFullYear();
  const ouCode = await getOperatingUnitCode(operatingUnitId);
  const sequence = await getOrCreateSequence(organizationId, operatingUnitId, "QA", year);
  
  const paddedSequence = sequence.toString().padStart(3, "0");
  const qaNumber = `QA-${ouCode}-${year}-${paddedSequence}`;
  
  // Update last generated number
  const db = await getDb();
  await db
    .update(procurementNumberSequences)
    .set({ lastGeneratedNumber: qaNumber })
    .where(
      and(
        eq(procurementNumberSequences.organizationId, organizationId),
        eq(procurementNumberSequences.operatingUnitId, operatingUnitId),
        eq(procurementNumberSequences.documentType, "QA"),
        eq(procurementNumberSequences.year, year)
      )
    );
  
  return qaNumber;
}

/**
 * Generate Contract Number: CON-[OU]-[Year]-[Seq]
 * Example: CON-EFADAH01-2026-001
 */
export async function generateContractNumber(
  organizationId: number,
  operatingUnitId: number
): Promise<string> {
  const year = new Date().getFullYear();
  const ouCode = await getOperatingUnitCode(operatingUnitId);
  const sequence = await getOrCreateSequence(organizationId, operatingUnitId, "CON", year);
  
  const paddedSequence = sequence.toString().padStart(3, "0");
  const contractNumber = `CON-${ouCode}-${year}-${paddedSequence}`;
  
  // Update last generated number
  const db = await getDb();
  await db
    .update(procurementNumberSequences)
    .set({ lastGeneratedNumber: contractNumber })
    .where(
      and(
        eq(procurementNumberSequences.organizationId, organizationId),
        eq(procurementNumberSequences.operatingUnitId, operatingUnitId),
        eq(procurementNumberSequences.documentType, "CON"),
        eq(procurementNumberSequences.year, year)
      )
    );
  
  return contractNumber;
}

/**
 * Get current sequence number (for display/preview purposes)
 */
export async function getCurrentSequence(
  organizationId: number,
  operatingUnitId: number,
  documentType: DocumentType,
  year?: number
): Promise<number> {
  const targetYear = year || new Date().getFullYear();
  
  const db = await getDb();
  const [result] = await db
    .select({ currentSequence: procurementNumberSequences.currentSequence })
    .from(procurementNumberSequences)
    .where(
      and(
        eq(procurementNumberSequences.organizationId, organizationId),
        eq(procurementNumberSequences.operatingUnitId, operatingUnitId),
        eq(procurementNumberSequences.documentType, documentType),
        eq(procurementNumberSequences.year, targetYear)
      )
    )
    .limit(1);
  
  return result?.currentSequence || 0;
}
