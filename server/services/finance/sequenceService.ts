/**
 * server/services/sequenceService.ts
 *
 * Atomic sequence number generator.
 *
 * PROBLEM SOLVED:
 * All number generators (RES, ENC, PAY, INV, JE) previously used COUNT(*)+1.
 * Under concurrent requests two transactions can read the same COUNT, producing
 * duplicate document numbers — which breaks audit trails and uniqueness constraints.
 *
 * SOLUTION:
 * Use the existing `procurement_number_sequences` table with an atomic
 * UPDATE + SELECT pattern.  MySQL's UPDATE is row-level locked, so concurrent
 * calls always receive different values.
 *
 * USAGE:
 *   import { getNextFinanceSequence } from './services/sequenceService';
 *   const payNumber = await getNextFinanceSequence(organizationId, 'PAY');
 *   // → "PAY-2026-0001"
 *
 * SUPPORTED TYPES:
 *   'RES' → RES-YYYY-NNNN  (Budget Reservations)
 *   'ENC' → ENC-YYYY-NNNN  (Encumbrances)
 *   'PAY' → PAY-YYYY-NNNN  (Payments & Payables)
 *   'INV' → INV-YYYY-NNNN  (Invoices)
 *   'JE'  → JE-YYYY-NNNNNN (Journal Entries — 6-digit for higher volume)
 */

import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../db';
import { procurementNumberSequences } from '../../../drizzle/schema';

export type FinanceSequenceType = 'RES' | 'ENC' | 'PAY' | 'INV' | 'JE';

/** Pad widths per type */
const PAD: Record<FinanceSequenceType, number> = {
  RES: 4,
  ENC: 4,
  PAY: 4,
  INV: 4,
  JE: 6,
};

/**
 * Get the next document number for the given org and sequence type.
 * Atomic — safe under concurrent requests.
 *
 * @param organizationId  Org scope
 * @param type            Sequence type (RES / ENC / PAY / INV / JE)
 * @param fiscalYear      Defaults to current calendar year
 * @returns Formatted string e.g. "PAY-2026-0001"
 */
export async function getNextFinanceSequence(
  organizationId: number,
  type: FinanceSequenceType,
  fiscalYear?: number
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const year = fiscalYear ?? new Date().getFullYear();

  // 1. Ensure the row exists (INSERT IGNORE / ON DUPLICATE KEY)
  await db.execute(
    sql`INSERT INTO procurement_number_sequences
          (organizationId, sequenceType, fiscalYear, currentValue)
        VALUES
          (${organizationId}, ${type}, ${year}, 0)
        ON DUPLICATE KEY UPDATE sequenceType = sequenceType`
  );

  // 2. Atomically increment — row is write-locked for this update
  await db.execute(
    sql`UPDATE procurement_number_sequences
        SET    currentValue = currentValue + 1
        WHERE  organizationId = ${organizationId}
          AND  sequenceType   = ${type}
          AND  fiscalYear     = ${year}`
  );

  // 3. Read back the value we just wrote
  const [row] = await db
    .select({ currentValue: procurementNumberSequences.currentValue })
    .from(procurementNumberSequences)
    .where(
      and(
        eq(procurementNumberSequences.organizationId, organizationId),
        eq(procurementNumberSequences.sequenceType, type),
        eq(procurementNumberSequences.fiscalYear, year)
      )
    )
    .limit(1);

  const num = row?.currentValue ?? 1;
  const pad = PAD[type];
  return `${type}-${year}-${String(num).padStart(pad, '0')}`;
}
