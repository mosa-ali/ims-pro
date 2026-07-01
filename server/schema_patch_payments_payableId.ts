/**
 * Drizzle Schema Patch — payments table
 *
 * Add payableId column to the payments table definition.
 * This file shows ONLY the field to add — do not replace your full payments
 * table definition. Find the payments table in drizzle/schema.ts and add
 * the payableId field in the same position shown below (after vendorId).
 *
 * BEFORE (in drizzle/schema.ts):
 *   vendorId: int('vendorId').references(() => vendors.id),
 *
 * AFTER:
 *   vendorId: int('vendorId').references(() => vendors.id),
 *   payableId: int('payableId')
 *     .references(() => procurementPayables.id, { onDelete: 'set null', onUpdate: 'cascade' })
 *     .$default(() => null),
 */

// Example field definition (copy into your existing payments table definition):
import { int } from 'drizzle-orm/mysql-core';
import { procurementPayables } from 'drizzle/schema'; // adjust import path if needed

// Field to add inside the payments mysqlTable() call:
export const paymentsPayableIdField = {
  payableId: int('payableId')
  .references(() => procurementPayables.id, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
};
