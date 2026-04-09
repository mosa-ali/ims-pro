import { mysqlTable, int, varchar, text, decimal, date, timestamp, boolean, mysqlEnum } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { organizations } from './schema';
import { projects } from './schema';
import { users } from './schema';
import { chartOfAccounts } from './schema';

/**
 * Finance Expenditures Table
 * Tracks all organizational expenditures with approval workflow and versioning
 */
export const expenditures = mysqlTable('expenditures', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organizationId').notNull(),
  operatingUnitId: int('operatingUnitId'),
  
  // Expenditure identification
  expenditureNumber: varchar('expenditureNumber', { length: 50 }).notNull(), // Auto-generated: EXP-2026-0001
  expenditureDate: date('expenditureDate').notNull(),
  
  // Vendor/Payee information
  vendorId: int('vendorId'),
  vendorName: varchar('vendorName', { length: 255 }).notNull(),
  vendorNameAr: varchar('vendorNameAr', { length: 255 }),
  
  // Expenditure details
  expenditureType: mysqlEnum('expenditureType', ['OPERATIONAL', 'PROJECT', 'ADMINISTRATIVE', 'TRAVEL', 'PROCUREMENT', 'OTHER']).notNull(),
  category: varchar('category', { length: 100 }),
  description: text('description').notNull(),
  descriptionAr: text('descriptionAr'),
  
  // Financial details
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currencyId: int('currencyId'),
  exchangeRateId: int('exchangeRateId'),
  amountInBaseCurrency: decimal('amountInBaseCurrency', { precision: 15, scale: 2 }),
  
  // Project/Grant linkage
  projectId: int('projectId'),
  grantId: int('grantId'),
  budgetLineId: int('budgetLineId'),
  
  // Accounting linkage
  glAccountId: int('glAccountId'),
  accountCode: varchar('accountCode', { length: 50 }),
  journalEntryId: int('journalEntryId'),
  postingStatus: mysqlEnum('postingStatus', ['unposted', 'posted', 'reversed']).default('unposted'),
  
  // Approval workflow
  status: mysqlEnum('status', ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']).default('DRAFT').notNull(),
  submittedBy: int('submittedBy'),
  submittedAt: timestamp('submittedAt'),
  approvedBy: int('approvedBy'),
  approvedAt: timestamp('approvedAt'),
  rejectionReason: text('rejectionReason'),
  
  // Payment tracking
  paymentId: int('paymentId'),
  paidAt: timestamp('paidAt'),
  
  // Attachments (receipts, invoices)
  attachments: text('attachments'), // JSON array of S3 URLs
  
  // Versioning fields
  version: int('version').default(1).notNull(),
  parentId: int('parentId'), // Reference to original expenditure if this is a revision
  revisionReason: text('revisionReason'), // Why this revision was created
  isLatestVersion: boolean('isLatestVersion').default(true).notNull(),
  
  // Soft delete fields
  isDeleted: boolean('isDeleted').default(false).notNull(),
  deletedAt: timestamp('deletedAt'),
  deletedBy: int('deletedBy'),
  
  // Audit fields
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  createdBy: int('createdBy'),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  updatedBy: int('updatedBy'),
});

export type Expenditure = typeof expenditures.$inferSelect;
export type InsertExpenditure = typeof expenditures.$inferInsert;

// Relations for Expenditures
export const expendituresRelations = relations(expenditures, ({ one }) => ({
  organization: one(organizations, {
    fields: [expenditures.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [expenditures.projectId],
    references: [projects.id],
  }),
  glAccount: one(chartOfAccounts, {
    fields: [expenditures.glAccountId],
    references: [chartOfAccounts.id],
  }),
  createdByUser: one(users, {
    fields: [expenditures.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [expenditures.updatedBy],
    references: [users.id],
  }),
  submittedByUser: one(users, {
    fields: [expenditures.submittedBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [expenditures.approvedBy],
    references: [users.id],
  }),
  deletedByUser: one(users, {
    fields: [expenditures.deletedBy],
    references: [users.id],
  }),
}));
