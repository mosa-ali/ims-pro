import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, int, varchar, text, date, mysqlEnum, decimal, timestamp, index, bigint, tinyint, json, datetime, longtext, customType } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

/**
 * Custom LONGTEXT type that converts MySQL2 Buffer responses to strings.
 * MySQL2 returns LONGTEXT columns as Buffer objects by default.
 * This custom type applies a fromDriver mapper to ensure string output.
 */
const longtextString = customType<{ data: string; driverData: Buffer | string }>({
  dataType() {
	return 'longtext';
  },
  fromDriver(value: Buffer | string): string {
	if (Buffer.isBuffer(value)) return value.toString('utf8');
	return value as string;
  },
});

export const activities = mysqlTable("activities", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	activityCode: varchar({ length: 50 }).notNull(),
	activityName: text().notNull(),
	activityNameAr: text(),
	description: text(),
	descriptionAr: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	plannedStartDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	plannedEndDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	actualStartDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	actualEndDate: date({ mode: 'string' }),
	status: mysqlEnum(['NOT_STARTED','IN_PROGRESS','COMPLETED','ON_HOLD','CANCELLED']).default('NOT_STARTED').notNull(),
	progressPercentage: decimal({ precision: 5, scale: 2 }).default('0.00').notNull(),
	target: decimal({ precision: 15, scale: 2 }),
	unitType: varchar({ length: 100 }),
	achievedValue: decimal({ precision: 15, scale: 2 }).default('0.00'),
	budgetAllocated: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	actualSpent: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	currency: mysqlEnum(['USD','EUR','GBP','CHF']).default('USD').notNull(),
	location: varchar({ length: 255 }),
	locationAr: varchar({ length: 255 }),
	responsiblePerson: varchar({ length: 255 }),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const allocationBases = mysqlTable("allocation_bases", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	allocationPeriodId: int().notNull(),
	projectId: int().notNull(),
	allocationKeyId: int().notNull(),
	basisValue: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	basisPercentage: decimal({ precision: 5, scale: 2 }).default('0.00').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("unique_allocation_base").on(table.allocationPeriodId, table.projectId, table.allocationKeyId),
	index("idx_organization").on(table.organizationId),
	index("idx_period").on(table.allocationPeriodId),
	index("idx_project").on(table.projectId),
	index("idx_key").on(table.allocationKeyId),
]);

export const allocationKeys = mysqlTable("allocation_keys", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	keyCode: varchar({ length: 50 }).notNull(),
	keyName: varchar({ length: 255 }).notNull(),
	keyNameAr: varchar({ length: 255 }),
	keyType: mysqlEnum(['headcount','budget_percentage','direct_costs','custom','equal','revenue']).default('budget_percentage'),
	description: text(),
	descriptionAr: text(),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: varchar({ length: 255 }),
	updatedBy: varchar({ length: 255 }),
},
(table) => [
	index("unique_key_code").on(table.organizationId, table.keyCode),
	index("idx_organization").on(table.organizationId),
]);

export const allocationPeriods = mysqlTable("allocation_periods", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	periodCode: varchar({ length: 50 }).notNull(),
	periodName: varchar({ length: 255 }).notNull(),
	periodNameAr: varchar({ length: 255 }),
	periodType: mysqlEnum(['monthly','quarterly','annual','custom']).default('monthly'),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date({ mode: 'string' }).notNull(),
	fiscalYearId: int(),
	fiscalPeriodId: int(),
	status: mysqlEnum(['draft','in_progress','completed','reversed']).default('draft'),
	executedAt: timestamp({ mode: 'string' }),
	executedBy: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: varchar({ length: 255 }),
	updatedBy: varchar({ length: 255 }),
},
(table) => [
	index("unique_period_code").on(table.organizationId, table.periodCode),
	index("idx_organization").on(table.organizationId),
	index("idx_dates").on(table.startDate, table.endDate),
	index("idx_status").on(table.status),
]);

export const allocationResults = mysqlTable("allocation_results", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	allocationPeriodId: int().notNull(),
	costPoolId: int().notNull(),
	projectId: int().notNull(),
	allocationKeyId: int().notNull(),
	totalPoolAmount: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	allocationPercentage: decimal({ precision: 5, scale: 2 }).default('0.00').notNull(),
	allocatedAmount: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	journalEntryId: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("unique_allocation_result").on(table.allocationPeriodId, table.costPoolId, table.projectId),
	index("idx_organization").on(table.organizationId),
	index("idx_period").on(table.allocationPeriodId),
	index("idx_cost_pool").on(table.costPoolId),
	index("idx_project").on(table.projectId),
	index("idx_journal_entry").on(table.journalEntryId),
]);

export const allocationReversals = mysqlTable("allocation_reversals", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	allocationPeriodId: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	reversalDate: date({ mode: 'string' }).notNull(),
	reversalReason: text(),
	reversalReasonAr: text(),
	originalJournalEntryIds: text(),
	reversalJournalEntryIds: text(),
	totalReversedAmount: decimal({ precision: 15, scale: 2 }).default('0.00'),
	reversedAt: timestamp({ mode: 'string' }).defaultNow(),
	reversedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const allocationRules = mysqlTable("allocation_rules", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	costPoolId: int().notNull(),
	allocationKeyId: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveFrom: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveTo: date({ mode: 'string' }),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: varchar({ length: 255 }),
	updatedBy: varchar({ length: 255 }),
},
(table) => [
	index("idx_organization").on(table.organizationId),
	index("idx_cost_pool").on(table.costPoolId),
	index("idx_allocation_key").on(table.allocationKeyId),
	index("idx_effective_dates").on(table.effectiveFrom, table.effectiveTo),
]);

export const allocationTemplateRules = mysqlTable("allocation_template_rules", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	templateId: int().notNull(),
	costPoolId: int().notNull(),
	allocationKeyId: int().notNull(),
	priority: int().default(1),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const allocationTemplates = mysqlTable("allocation_templates", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	templateCode: varchar({ length: 50 }).notNull(),
	templateName: varchar({ length: 255 }).notNull(),
	templateNameAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	periodType: mysqlEnum(['monthly','quarterly','annual','custom']).default('monthly'),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: int(),
	updatedBy: int(),
});

export const assetDepreciationSchedule = mysqlTable("asset_depreciation_schedule", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	assetId: int().notNull(),
	fiscalYearId: int(),
	fiscalPeriodId: int(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodDate: date({ mode: 'string' }).notNull(),
	periodNumber: int().notNull(),
	openingBookValue: decimal({ precision: 15, scale: 2 }).notNull(),
	depreciationAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	accumulatedDepreciation: decimal({ precision: 15, scale: 2 }).notNull(),
	closingBookValue: decimal({ precision: 15, scale: 2 }).notNull(),
	depreciationMethod: mysqlEnum(['straight_line','declining_balance','units_of_production']).default('straight_line'),
	isPosted: tinyint().default(0),
	journalEntryId: int(),
	postedAt: timestamp({ mode: 'string' }),
	postedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_org").on(table.organizationId),
	index("idx_asset").on(table.assetId),
	index("idx_fiscal").on(table.fiscalYearId, table.fiscalPeriodId),
	index("idx_date").on(table.periodDate),
	index("idx_posted").on(table.isPosted),
]);

export const auditLogExportHistory = mysqlTable("audit_log_export_history", {
	id: int().autoincrement().primaryKey().notNull(),
	scheduleId: int().references(() => auditLogExportSchedules.id, { onDelete: "set null" } ),
	exportDate: bigint({ mode: "number" }).notNull(),
	recordCount: int().notNull(),
	filePath: text().notNull(),
	fileSize: bigint({ mode: "number" }).notNull(),
	recipients: text().notNull(),
	status: mysqlEnum(['pending','completed','failed']).default('pending').notNull(),
	errorMessage: text(),
	triggeredBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: bigint({ mode: "number" }).notNull(),
},
(table) => [
	index("idx_export_date").on(table.exportDate),
	index("idx_schedule_id").on(table.scheduleId),
	index("idx_status").on(table.status),
]);

export const auditLogExportSchedules = mysqlTable("audit_log_export_schedules", {
	id: int().autoincrement().primaryKey().notNull(),
	scheduleName: varchar({ length: 255 }).notNull(),
	frequency: mysqlEnum(['weekly','monthly']).notNull(),
	dayOfExecution: int().notNull(),
	recipients: text().notNull(),
	lastRunAt: bigint({ mode: "number" }),
	nextRunAt: bigint({ mode: "number" }).notNull(),
	isActive: tinyint().default(1).notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: bigint({ mode: "number" }).notNull(),
	updatedAt: bigint({ mode: "number" }).notNull(),
},
(table) => [
	index("idx_next_run").on(table.nextRunAt, table.isActive),
]);

export const auditLogs = mysqlTable("audit_logs", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().references(() => users.id, { onDelete: "set null" } ),
	organizationId: int().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	action: varchar({ length: 100 }).notNull(),
	entityType: varchar({ length: 100 }),
	entityId: int(),
	details: text(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const bankReconciliations = mysqlTable("bank_reconciliations", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	bankAccountId: int().notNull(),
	reconciliationNumber: varchar({ length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	reconciliationDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	statementDate: date({ mode: 'string' }).notNull(),
	statementBalance: decimal({ precision: 15, scale: 2 }).notNull(),
	bookBalance: decimal({ precision: 15, scale: 2 }).notNull(),
	adjustedBookBalance: decimal({ precision: 15, scale: 2 }),
	outstandingDeposits: decimal({ precision: 15, scale: 2 }).default('0.00'),
	outstandingCheques: decimal({ precision: 15, scale: 2 }).default('0.00'),
	difference: decimal({ precision: 15, scale: 2 }).default('0.00'),
	status: mysqlEnum(['draft','in_progress','completed','approved']).default('draft'),
	notes: text(),
	completedAt: timestamp({ mode: 'string' }),
	completedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	approvedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: int(),
	updatedBy: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("uk_org_number").on(table.organizationId, table.reconciliationNumber),
	index("idx_org").on(table.organizationId),
	index("idx_bank").on(table.bankAccountId),
	index("idx_date").on(table.reconciliationDate),
	index("idx_status").on(table.status),
]);

export const bankTransactions = mysqlTable("bank_transactions", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	bankAccountId: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	transactionDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	valueDate: date({ mode: 'string' }),
	transactionType: mysqlEnum(['credit','debit']).notNull(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	currencyId: int(),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	reference: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	counterpartyName: varchar({ length: 255 }),
	counterpartyAccount: varchar({ length: 100 }),
	statementReference: varchar({ length: 100 }),
	importBatchId: int(),
	isReconciled: tinyint().default(0),
	reconciledAt: timestamp({ mode: 'string' }),
	reconciledBy: int(),
	reconciliationId: int(),
	matchedTransactionType: varchar({ length: 50 }),
	matchedTransactionId: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("idx_org").on(table.organizationId),
	index("idx_bank").on(table.bankAccountId),
	index("idx_date").on(table.transactionDate),
	index("idx_reconciled").on(table.isReconciled),
	index("idx_matched").on(table.matchedTransactionType, table.matchedTransactionId),
]);

export const beneficiaries = mysqlTable("beneficiaries", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	fullName: varchar({ length: 255 }).notNull(),
	fullNameAr: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateOfBirth: date({ mode: 'string' }),
	identificationType: mysqlEnum(['ID_CARD','PASSPORT','FAMILY_CARD','OTHER']),
	identificationTypeOther: varchar({ length: 255 }),
	identificationNumber: varchar({ length: 100 }),
	identificationAttachment: varchar({ length: 500 }),
	gender: mysqlEnum(['MALE','FEMALE','OTHER']).notNull(),
	ageGroup: mysqlEnum(['0-5','6-12','13-17','18-35','36-60','60+']),
	nationality: varchar({ length: 100 }),
	phoneNumber: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	country: varchar({ length: 100 }),
	governorate: varchar({ length: 255 }),
	district: varchar({ length: 255 }),
	village: varchar({ length: 255 }),
	address: text(),
	addressAr: text(),
	communityType: mysqlEnum(['IDP','REFUGEE','HOST_COMMUNITY','RETURNEE','OTHER']),
	communityTypeOther: varchar({ length: 255 }),
	householdSize: int(),
	dependents: int(),
	vulnerabilityCategory: varchar({ length: 255 }),
	vulnerabilityOther: varchar({ length: 255 }),
	disabilityStatus: tinyint().default(0).notNull(),
	disabilityType: varchar({ length: 255 }),
	activityId: int().references(() => activities.id, { onDelete: "set null" } ),
	serviceType: mysqlEnum(['TRAINING','WORKSHOP','ITEMS_DISTRIBUTION','PSS','OTHER']),
	serviceTypeOther: varchar({ length: 255 }),
	serviceStatus: mysqlEnum(['REGISTERED','ACTIVE','COMPLETED','SUSPENDED']).default('REGISTERED').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	registrationDate: date({ mode: 'string' }).notNull(),
	verificationStatus: mysqlEnum(['VERIFIED','NOT_ELIGIBLE','PENDING']).default('PENDING'),
	verifiedBy: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	verificationDate: date({ mode: 'string' }),
	notes: text(),
	notesAr: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
});

export const bidAnalyses = mysqlTable("bid_analyses", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	purchaseRequestId: int().references(() => purchaseRequests.id, { onDelete: "set null" } ),
	cbaNumber: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	titleAr: varchar({ length: 255 }),
	tenderDate: timestamp({ mode: 'string' }),
	closingDate: timestamp({ mode: 'string' }),
	openingDate: timestamp({ mode: 'string' }),
	evaluationMethod: mysqlEnum(['lowest_price','best_value','quality_cost_based']).default('lowest_price'),
	technicalWeight: decimal({ precision: 5, scale: 2 }).default('70'),
	financialWeight: decimal({ precision: 5, scale: 2 }).default('30'),
	minimumTechnicalScore: decimal({ precision: 5, scale: 2 }).default('70'),
	selectedBidderId: int().references(() => vendors.id, { onDelete: "set null" } ),
	selectionJustification: text(),
	status: mysqlEnum(['draft','published','bids_received','technical_evaluation','financial_evaluation','awarded','cancelled']).default('draft').notNull(),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedAt: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	announcementStartDate: timestamp({ mode: 'string' }),
	announcementEndDate: timestamp({ mode: 'string' }),
	announcementChannel: mysqlEnum(['website','newspaper','donor_portal','other']),
	announcementLink: text(),
	announcementReference: varchar({ length: 100 }),
	numberOfBidders: int().default(0),
	bomMeetingDate: varchar({ length: 50 }),
	bomMeetingTime: varchar({ length: 50 }),
	bomLocation: varchar({ length: 255 }),
	bomAttendees: text(),
	bomNotes: text(),
	bomSignatures: text(),
	bomCompleted: tinyint().default(0),
	scoringLockedAt: timestamp({ mode: 'string' }),
	scoringLockedBy: int(),
	cbaFinalizedAt: timestamp({ mode: 'string' }),
	cbaFinalizedBy: int(),
});

export const bidAnalysisBidders = mysqlTable("bid_analysis_bidders", {
	id: int().autoincrement().primaryKey().notNull(),
	bidAnalysisId: int().notNull().references(() => bidAnalyses.id, { onDelete: "cascade" } ),
	organizationId: int().default(30002).notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().default(30002).notNull().references(() => operatingUnits.id, { onDelete: "cascade" } ),
	supplierId: int().references(() => vendors.id, { onDelete: "set null" } ),
	bidderName: varchar({ length: 255 }),
	submissionDate: timestamp({ mode: 'string' }),
	submissionStatus: mysqlEnum(['received','valid','disqualified']).default('received'),
	bidReference: varchar({ length: 100 }),
	bidDate: timestamp({ mode: 'string' }),
	totalBidAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	currency: varchar({ length: 10 }).default('USD'),
	technicalScore: decimal({ precision: 5, scale: 2 }),
	financialScore: decimal({ precision: 5, scale: 2 }),
	combinedScore: decimal({ precision: 5, scale: 2 }),
	rank: int(),
	isResponsive: tinyint().default(1),
	nonResponsiveReason: text(),
	isSelected: tinyint().default(0),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	bidReceiptAcknowledgementPrinted: tinyint().default(0),
	acknowledgementPrintedAt: timestamp({ mode: 'string' }),
	acknowledgementPrintedBy: int().references(() => users.id, { onDelete: "set null" } ),
	bidReceiptAcknowledgementRef: varchar({ length: 100 }),
	bidReceiptAcknowledgementGeneratedAt: timestamp({ mode: 'string' }),
});

export const bidAnalysisLineItems = mysqlTable("bid_analysis_line_items", {
	id: int().autoincrement().primaryKey().notNull(),
	bidAnalysisId: int().notNull().references(() => bidAnalyses.id, { onDelete: "cascade" } ),
	bidderId: int().notNull().references(() => bidAnalysisBidders.id, { onDelete: "cascade" } ),
	prLineItemId: int().notNull().references(() => purchaseRequestLineItems.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	unitPrice: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	lineTotal: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_bali_ba").on(table.bidAnalysisId),
	index("idx_bali_bidder").on(table.bidderId),
	index("idx_bali_ba_bidder").on(table.bidAnalysisId, table.bidderId),
	index("uq_bali_ba_bidder_prline").on(table.bidAnalysisId, table.bidderId, table.prLineItemId),
]);

export const bidEvaluationCriteria = mysqlTable("bid_evaluation_criteria", {
	id: int().autoincrement().primaryKey().notNull(),
	bidAnalysisId: int().notNull().references(() => bidAnalyses.id, { onDelete: "cascade" } ),
	criteriaType: mysqlEnum(['technical','financial']).default('technical').notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	description: text(),
	maxScore: decimal({ precision: 5, scale: 2 }).notNull(),
	weight: decimal({ precision: 5, scale: 2 }).default('1'),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	sectionNumber: int().default(1),
	sectionName: varchar({ length: 255 }),
	sectionNameAr: varchar({ length: 255 }),
	stage: varchar({ length: 255 }).default('MUST be Submitted with the Bid'),
	stageAr: varchar({ length: 255 }),
	isScreening: tinyint().default(0),
	isApplicable: tinyint().default(1),
	requirementLabel: text(),
	requirementLabelAr: text(),
	detailsText: text(),
	detailsTextAr: text(),
	isMandatoryHardStop: tinyint().default(0),
	isConditional: tinyint().default(0),
	optionGroup: varchar({ length: 100 }),
});

export const bidEvaluationScores = mysqlTable("bid_evaluation_scores", {
	id: int().autoincrement().primaryKey().notNull(),
	bidAnalysisId: int().notNull().references(() => bidAnalyses.id, { onDelete: "cascade" } ),
	criterionId: int().notNull().references(() => bidEvaluationCriteria.id, { onDelete: "cascade" } ),
	bidderId: int().notNull().references(() => bidAnalysisBidders.id, { onDelete: "cascade" } ),
	score: decimal({ precision: 5, scale: 2 }).default('0'),
	status: mysqlEnum(['scored','none','na','not_yet_completed']).default('scored'),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_bes_ba").on(table.bidAnalysisId),
	index("idx_bes_criterion").on(table.criterionId),
	index("idx_bes_bidder").on(table.bidderId),
	index("uq_bes_criterion_bidder").on(table.criterionId, table.bidderId),
]);

export const bidOpeningMinutes = mysqlTable("bid_opening_minutes", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	purchaseRequestId: int().notNull().references(() => purchaseRequests.id, { onDelete: "set null" } ),
	bidAnalysisId: int().references(() => bidAnalyses.id, { onDelete: "set null" } ),
	minutesNumber: varchar({ length: 50 }).notNull(),
	openingDate: timestamp({ mode: 'string' }).notNull(),
	openingTime: varchar({ length: 10 }),
	openingVenue: varchar({ length: 255 }),
	openingMode: mysqlEnum(['physical','online','hybrid']).default('physical'),
	openingLocation: varchar({ length: 255 }),
	chairpersonId: int(),
	chairpersonName: varchar({ length: 255 }),
	member1Id: int(),
	member1Name: varchar({ length: 255 }),
	member2Id: int(),
	member2Name: varchar({ length: 255 }),
	member3Id: int(),
	member3Name: varchar({ length: 255 }),
	totalBidsReceived: int().default(0),
	bidsOpenedCount: int().default(0),
	openingNotes: text(),
	irregularities: text(),
	status: mysqlEnum(['draft','finalized','approved']).default('draft').notNull(),
	finalizedAt: timestamp({ mode: 'string' }),
	finalizedBy: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	approvedBy: int(),
	approverComments: text(),
	pdfFileUrl: varchar({ length: 500 }),
});

export const bidderAcknowledgementSignatures = mysqlTable("bidder_acknowledgement_signatures", {
	id: int().autoincrement().primaryKey().notNull(),
	bidAnalysisId: int("bid_analysis_id").notNull(),
	bidderId: int("bidder_id").notNull(),
	organizationId: int("organization_id").notNull(),
	operatingUnitId: int("operating_unit_id"),
	signerName: varchar("signer_name", { length: 255 }).notNull(),
	signerTitle: varchar("signer_title", { length: 255 }),
	signatureImageUrl: text("signature_image_url").notNull(),
	signatureDataUrl: text("signature_data_url"),
	signedAt: timestamp("signed_at", { mode: 'string' }).notNull(),
	signedByUserId: int("signed_by_user_id"),
	verificationCode: varchar("verification_code", { length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_bas_ba").on(table.bidAnalysisId),
	index("idx_bas_bidder").on(table.bidderId),
	index("idx_bas_org").on(table.organizationId),
	index("idx_bas_verification").on(table.verificationCode),
]);

export const bomApprovalSignatures = mysqlTable("bom_approval_signatures", {
	id: int().autoincrement().primaryKey().notNull(),
	bomId: int().notNull().references(() => bidOpeningMinutes.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	sortOrder: int().default(1).notNull(),
	role: varchar({ length: 255 }),
	roleAr: varchar({ length: 255 }),
	memberName: varchar({ length: 255 }),
	signatureDataUrl: text(),
	signedAt: timestamp({ mode: 'string' }),
	signedByUserId: int().references(() => users.id, { onDelete: "set null" } ),
	verificationCode: varchar({ length: 100 }),
	qrCodeDataUrl: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_bom_sig_bom").on(table.bomId),
	index("idx_bom_sig_org").on(table.organizationId),
]);

export const budgetItems = mysqlTable("budget_items", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int(),
	activityId: int().references(() => activities.id, { onDelete: "set null" } ),
	fiscalYear: varchar({ length: 20 }),
	budgetCode: varchar({ length: 100 }).notNull(),
	subBl: varchar({ length: 100 }),
	subBudgetLine: varchar({ length: 100 }),
	activityName: text(),
	budgetItem: text().notNull(),
	category: varchar({ length: 255 }),
	quantity: decimal({ precision: 15, scale: 2 }).notNull(),
	unitType: varchar({ length: 100 }),
	unitCost: decimal({ precision: 15, scale: 2 }).notNull(),
	recurrence: int().default(1).notNull(),
	totalBudgetLine: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	actualSpent: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date({ mode: 'string' }).notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const budgetLines = mysqlTable("budget_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	budgetId: int().notNull().references(() => budgets.id, { onDelete: "set null" } ),
	projectId: int().notNull().references(() => projects.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	lineCode: varchar({ length: 100 }).notNull(),
	lineNumber: int(),
	description: text().notNull(),
	descriptionAr: text(),
	categoryId: int().references(() => financeBudgetCategories.id, { onDelete: "set null" } ),
	accountId: int().references(() => chartOfAccounts.id, { onDelete: "set null" } ),
	activityId: int().references(() => activities.id, { onDelete: "set null" } ),
	unitType: mysqlEnum(['staff','item','service','lump_sum']).notNull(),
	unitCost: decimal({ precision: 15, scale: 2 }).notNull(),
	quantity: decimal({ precision: 15, scale: 2 }).notNull(),
	durationMonths: int().default(1).notNull(),
	totalAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	donorEligibleAmount: decimal({ precision: 15, scale: 2 }),
	donorEligibilityPercentage: decimal({ precision: 5, scale: 2 }).default('100.00'),
	ineligibilityReason: text(),
	ineligibilityReasonAr: text(),
	donorMappingId: int(),
	locationId: int(),
	locationName: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	implementationPeriodStart: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	implementationPeriodEnd: date({ mode: 'string' }),
	actualSpent: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	commitments: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	availableBalance: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	justification: text(),
	justificationAr: text(),
	notes: text(),
	notesAr: text(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	isDeleted: tinyint().default(0).notNull(),
},
(table) => [
	index("unique_line_code").on(table.budgetId, table.lineCode),
]);

export const budgetMonthlyAllocations = mysqlTable("budget_monthly_allocations", {
	id: int().autoincrement().primaryKey().notNull(),
	budgetLineId: int().notNull().references(() => budgetLines.id, { onDelete: "set null" } ),
	budgetId: int().notNull().references(() => budgets.id, { onDelete: "set null" } ),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	allocationMonth: date({ mode: 'string' }).notNull(),
	monthNumber: int().notNull(),
	quarterNumber: int().notNull(),
	fiscalYear: varchar({ length: 20 }).notNull(),
	plannedAmount: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	forecastAmount: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	actualAmount: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	variance: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	notes: text(),
	notesAr: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	organizationId: int().default(0).notNull(),
	operatingUnitId: int().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("unique_month_allocation").on(table.budgetLineId, table.allocationMonth),
]);

export const budgetAnalysisExpenses = mysqlTable("budget_analysis_expenses", {
	id: int().autoincrement().primaryKey().notNull(),
	budgetId: int().notNull().references(() => budgets.id, { onDelete: "cascade" } ),
	budgetLineId: int().notNull().references(() => budgetLines.id, { onDelete: "cascade" } ),
	budgetItemId: int(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int(),
	expenseAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	expenseDate: date({ mode: 'string' }).notNull(),
	description: text().notNull(),
	descriptionAr: text(),
	category: varchar({ length: 100 }),
	reference: varchar({ length: 255 }),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	notes: text(),
	notesAr: text(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	isDeleted: tinyint().default(0).notNull(),
},
(table) => [
	index("idx_budget_id").on(table.budgetId),
	index("idx_budget_line_id").on(table.budgetLineId),
	index("idx_organization_id").on(table.organizationId),
	index("idx_expense_date").on(table.expenseDate),
	index("idx_status").on(table.status),
]);

export type InsertBudgetAnalysisExpense = typeof budgetAnalysisExpenses.$inferInsert;
export type SelectBudgetAnalysisExpense = typeof budgetAnalysisExpenses.$inferSelect;

export const budgetReallocationLines = mysqlTable("budget_reallocation_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	reallocationId: int().notNull(),
	lineNumber: int().notNull(),
	lineType: mysqlEnum(['source','destination']).notNull(),
	projectId: int().notNull(),
	budgetItemId: int(),
	glAccountId: int(),
	amount: decimal({ precision: 15, scale: 2 }).default('0.00'),
	currency: varchar({ length: 10 }).default('USD'),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	baseCurrencyAmount: decimal({ precision: 15, scale: 2 }).default('0.00'),
	description: text(),
	descriptionAr: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	operatingUnitId: int().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const budgetReallocations = mysqlTable("budget_reallocations", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	reallocationCode: varchar({ length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	reallocationDate: date({ mode: 'string' }).notNull(),
	description: text(),
	descriptionAr: text(),
	totalAmount: decimal({ precision: 15, scale: 2 }).default('0.00'),
	currency: varchar({ length: 10 }).default('USD'),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	baseCurrencyAmount: decimal({ precision: 15, scale: 2 }).default('0.00'),
	status: mysqlEnum(['draft','pending_approval','approved','rejected','executed','cancelled']).default('draft'),
	justification: text(),
	justificationAr: text(),
	submittedAt: timestamp({ mode: 'string' }),
	submittedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	approvedBy: int(),
	rejectedAt: timestamp({ mode: 'string' }),
	rejectedBy: int(),
	rejectionReason: text(),
	rejectionReasonAr: text(),
	executedAt: timestamp({ mode: 'string' }),
	executedBy: int(),
	journalEntryId: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: int(),
	updatedBy: int(),
	operatingUnitId: int().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const budgets = mysqlTable("budgets", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	grantId: int(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().notNull(),
	budgetCode: varchar({ length: 100 }),
	budgetTitle: varchar({ length: 500 }),
	budgetTitleAr: varchar({ length: 500 }),
	fiscalYear: varchar({ length: 20 }).notNull(),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	baseCurrency: varchar({ length: 10 }).default('USD').notNull(),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	totalApprovedAmount: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	totalForecastAmount: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	totalActualAmount: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	versionNumber: int().default(1).notNull(),
	parentBudgetId: int(),
	revisionNotes: text(),
	revisionNotesAr: text(),
	status: mysqlEnum(['draft','submitted','approved','revised','closed','rejected']).default('draft').notNull(),
	submittedAt: timestamp({ mode: 'string' }),
	submittedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	approvedBy: int(),
	rejectedAt: timestamp({ mode: 'string' }),
	rejectedBy: int(),
	rejectionReason: text(),
	rejectionReasonAr: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodStart: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodEnd: date({ mode: 'string' }).notNull(),
	notes: text(),
	notesAr: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
},
(table) => [
	index("budgetCode").on(table.budgetCode),
]);

export const caseActivities = mysqlTable("case_activities", {
	id: int().autoincrement().primaryKey().notNull(),
	caseId: int().notNull().references(() => caseRecords.id, { onDelete: "cascade" } ),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	activityType: varchar({ length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	activityDate: date({ mode: 'string' }).notNull(),
	provider: varchar({ length: 255 }),
	notes: text(),
	linkedActivityId: int().references(() => activities.id, { onDelete: "set null" } ),
	linkedIndicatorId: int().references(() => indicators.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const caseRecords = mysqlTable("case_records", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	caseCode: varchar({ length: 50 }).notNull(),
	beneficiaryCode: varchar({ length: 50 }).notNull(),
	firstName: varchar({ length: 100 }),
	lastName: varchar({ length: 100 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateOfBirth: date({ mode: 'string' }),
	gender: varchar({ length: 20 }),
	age: int(),
	nationality: varchar({ length: 100 }),
	idNumber: varchar({ length: 100 }),
	hasDisability: tinyint().default(0),
	location: varchar({ length: 255 }),
	district: varchar({ length: 100 }),
	community: varchar({ length: 100 }),
	householdSize: int(),
	vulnerabilityCategory: varchar({ length: 100 }),
	phoneNumber: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	address: text(),
	caseType: varchar({ length: 50 }).notNull(),
	riskLevel: varchar({ length: 20 }).notNull(),
	status: varchar({ length: 20 }).default('open').notNull(),
	openedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	closedAt: timestamp({ mode: 'string' }),
	referralSource: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	intakeDate: date({ mode: 'string' }),
	identifiedNeeds: text(),
	riskFactors: text(),
	immediateConcerns: text(),
	informedConsentObtained: tinyint().default(0).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	consentDate: date({ mode: 'string' }),
	assignedPssOfficerId: int().references(() => users.id, { onDelete: "set null" } ),
	assignedCaseWorkerId: int().references(() => users.id, { onDelete: "set null" } ),
	assignedTo: varchar({ length: 255 }),
	plannedInterventions: text(),
	responsiblePerson: varchar({ length: 255 }),
	expectedOutcomes: text(),
	timeline: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	reviewDate: date({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
});

export const caseReferrals = mysqlTable("case_referrals", {
	id: int().autoincrement().primaryKey().notNull(),
	caseId: int().notNull().references(() => caseRecords.id, { onDelete: "cascade" } ),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	referralDate: date({ mode: 'string' }).notNull(),
	referralType: varchar({ length: 20 }).notNull(),
	serviceRequired: varchar({ length: 255 }).notNull(),
	receivingOrganization: varchar({ length: 255 }).notNull(),
	focalPoint: varchar({ length: 255 }),
	focalPointContact: varchar({ length: 255 }),
	status: varchar({ length: 20 }).default('pending').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	followUpDate: date({ mode: 'string' }),
	feedbackReceived: tinyint().default(0),
	feedbackNotes: text(),
	consentObtained: tinyint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const cbaApprovalSignatures = mysqlTable("cba_approval_signatures", {
	id: int().autoincrement().primaryKey().notNull(),
	bidAnalysisId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	sortOrder: int().default(1).notNull(),
	role: varchar({ length: 255 }),
	roleAr: varchar({ length: 255 }),
	memberName: varchar({ length: 255 }),
	signatureDataUrl: text(),
	signedAt: timestamp({ mode: 'string' }),
	signedByUserId: int(),
	verificationCode: varchar({ length: 100 }),
	qrCodeDataUrl: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_cba_sig_ba").on(table.bidAnalysisId),
	index("idx_cba_sig_org").on(table.organizationId),
]);

export const chartOfAccounts = mysqlTable("chart_of_accounts", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	accountCode: varchar({ length: 50 }).notNull(),
	accountNameEn: varchar({ length: 255 }).notNull(),
	accountNameAr: varchar({ length: 255 }),
	accountType: mysqlEnum(['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE']).notNull(),
	parentAccountCode: varchar({ length: 50 }),
	description: text(),
	isActive: tinyint().default(1).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
});

export const childSafeSpaces = mysqlTable("child_safe_spaces", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	cssName: varchar({ length: 255 }).notNull(),
	cssCode: varchar({ length: 50 }).notNull(),
	location: varchar({ length: 255 }).notNull(),
	operatingPartner: varchar({ length: 255 }),
	capacity: int(),
	ageGroupsServed: varchar({ length: 100 }),
	genderSegregation: tinyint().default(0),
	operatingDays: varchar({ length: 100 }),
	operatingHours: varchar({ length: 100 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const contractMilestones = mysqlTable("contract_milestones", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	contractId: int().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	amount: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD'),
	dueDate: timestamp({ mode: 'string' }),
	status: mysqlEnum(['pending','in_progress','completed','overdue']).default('pending').notNull(),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	orderIndex: int().default(0),
	isDeleted: tinyint().default(0).notNull(),
},
(table) => [
	index("idx_milestone_contract").on(table.contractId),
]);

export const contracts = mysqlTable("contracts", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	purchaseRequestId: int().notNull(),
	vendorId: int().notNull(),
	contractNumber: varchar({ length: 100 }).notNull(),
	contractValue: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	paymentStructure: mysqlEnum(['lump_sum','percentage_based','fixed_amount','deliverable_based']).notNull(),
	retentionPercentage: decimal({ precision: 5, scale: 2 }).default('0'),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	signedFileUrl: text(),
	status: mysqlEnum(['draft','pending_approval','approved','active','completed','terminated']).default('draft').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	signatureImageUrl: text(),
	signatureTimestamp: timestamp({ mode: 'string' }),
	signatureVerificationCode: varchar({ length: 100 }),
	signatureQrCodeUrl: text(),
	signerName: varchar({ length: 255 }),
	signerTitle: varchar({ length: 255 }),
	rejectionReason: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
},
(table) => [
	index("idx_contract_pr").on(table.purchaseRequestId),
	index("idx_contract_vendor").on(table.vendorId),
	index("idx_contract_org").on(table.organizationId),
	index("contractNumber").on(table.contractNumber),
]);

export const costCenters = mysqlTable("cost_centers", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	parentId: int(),
	level: int().default(1),
	managerId: int(),
	projectId: int(),
	grantId: int(),
	isActive: tinyint().default(1),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("uk_org_code").on(table.organizationId, table.code),
	index("idx_org").on(table.organizationId),
	index("idx_ou").on(table.operatingUnitId),
	index("idx_parent").on(table.parentId),
	index("idx_project").on(table.projectId),
]);

export const costPoolTransactions = mysqlTable("cost_pool_transactions", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	costPoolId: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	transactionDate: date({ mode: 'string' }).notNull(),
	amount: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	description: text(),
	descriptionAr: text(),
	sourceModule: mysqlEnum(['manual','expense','payment','journal_entry','import']).default('manual'),
	sourceDocumentId: int(),
	sourceDocumentType: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: varchar({ length: 255 }),
	updatedBy: varchar({ length: 255 }),
},
(table) => [
	index("idx_organization").on(table.organizationId),
	index("idx_cost_pool").on(table.costPoolId),
	index("idx_transaction_date").on(table.transactionDate),
	index("idx_source").on(table.sourceModule, table.sourceDocumentId),
]);

export const costPools = mysqlTable("cost_pools", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	poolCode: varchar({ length: 50 }).notNull(),
	poolName: varchar({ length: 255 }).notNull(),
	poolNameAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	poolType: mysqlEnum(['overhead','shared_service','administrative','facility','other']).default('overhead'),
	glAccountId: int(),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: varchar({ length: 255 }),
	updatedBy: varchar({ length: 255 }),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: varchar({ length: 255 }),
},
(table) => [
	index("unique_pool_code").on(table.organizationId, table.poolCode),
	index("idx_organization").on(table.organizationId),
	index("idx_operating_unit").on(table.operatingUnitId),
]);

export const cssActivities = mysqlTable("css_activities", {
	id: int().autoincrement().primaryKey().notNull(),
	cssId: int().notNull().references(() => childSafeSpaces.id, { onDelete: "cascade" } ),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	activityType: varchar({ length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	activityDate: date({ mode: 'string' }).notNull(),
	facilitatorId: int().references(() => users.id, { onDelete: "set null" } ),
	facilitatorName: varchar({ length: 255 }),
	participantsCount: int().default(0).notNull(),
	maleCount: int().default(0),
	femaleCount: int().default(0),
	notes: text(),
	linkedCaseId: int().references(() => caseRecords.id, { onDelete: "set null" } ),
	linkedIndicatorId: int().references(() => indicators.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const deliveryNoteLines = mysqlTable("delivery_note_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	dnId: int().notNull().references(() => deliveryNotes.id, { onDelete: "set null" } ),
	poLineItemId: int().notNull().references(() => purchaseOrderLineItems.id, { onDelete: "set null" } ),
	lineNumber: int().notNull(),
	deliveredQty: decimal({ precision: 10, scale: 2 }).notNull(),
	unit: varchar({ length: 50 }).default('Piece'),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const deliveryNotes = mysqlTable("delivery_notes", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().notNull().references(() => operatingUnits.id, { onDelete: "set null" } ),
	dnNumber: varchar({ length: 50 }).notNull(),
	poId: int().notNull().references(() => purchaseOrders.id, { onDelete: "set null" } ),
	grnId: int().notNull().references(() => goodsReceiptNotes.id, { onDelete: "set null" } ),
	vendorId: int().references(() => vendors.id, { onDelete: "set null" } ),
	deliveryDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	status: mysqlEnum(['delivered']).default('delivered').notNull(),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("dnNumber").on(table.dnNumber),
]);

export const documents = mysqlTable("documents", {
	id: int().autoincrement().primaryKey().notNull(),
	documentId: varchar({ length: 100 }).notNull(),
	workspace: mysqlEnum(['projects','meal','hr','finance','logistics','donor_crm','risk_compliance']).default('projects').notNull(),
	parentFolderId: varchar({ length: 100 }),
	isFolder: tinyint().default(0).notNull(),
	projectId: varchar({ length: 100 }),
	folderCode: varchar({ length: 100 }).notNull(),
	fileName: varchar({ length: 500 }).notNull(),
	filePath: text().notNull(),
	fileType: varchar({ length: 50 }).notNull(),
	fileSize: bigint({ mode: "number" }).notNull(),
	uploadedBy: int().notNull(),
	uploadedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	syncSource: varchar({ length: 100 }).notNull(),
	syncStatus: mysqlEnum(['synced','not_synced','pending','error']).default('synced').notNull(),
	version: int().default(1).notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	entityType: varchar({ length: 100 }),
	entityId: varchar({ length: 100 }),
},
(table) => [
	index("idx_documents_project_id").on(table.projectId),
	index("idx_documents_folder_code").on(table.folderCode),
	index("idx_documents_organization_id").on(table.organizationId),
	index("idx_documents_operating_unit_id").on(table.operatingUnitId),
	index("documentId").on(table.documentId),
	index("idx_documents_workspace").on(table.workspace),
	index("idx_documents_parent_folder_id").on(table.parentFolderId),
	index("idx_documents_entity").on(table.entityType, table.entityId),
]);

export const donorBudgetMapping = mysqlTable("donor_budget_mapping", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	internalCategoryId: int().notNull().references(() => financeBudgetCategories.id, { onDelete: "set null" } ),
	internalCategoryCode: varchar({ length: 50 }),
	internalCategoryName: varchar({ length: 255 }),
	donorId: int(),
	donorName: varchar({ length: 255 }),
	donorCategoryCode: varchar({ length: 100 }).notNull(),
	donorCategoryName: varchar({ length: 500 }).notNull(),
	donorCategoryNameAr: varchar({ length: 500 }),
	mappingRules: json(),
	donorReportingLevel: int().default(1),
	donorSortOrder: int().default(0),
	isActive: tinyint().default(1).notNull(),
	notes: text(),
	notesAr: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
});

export const donorCommunications = mysqlTable("donor_communications", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	donorId: int().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	channel: mysqlEnum(['email','meeting','call','visit','letter','video_call','other']).default('email').notNull(),
	subject: varchar({ length: 500 }).notNull(),
	subjectAr: varchar({ length: 500 }),
	summary: text().notNull(),
	summaryAr: text(),
	participants: text(),
	contactPerson: varchar({ length: 255 }),
	nextActionDate: timestamp({ mode: 'string' }),
	nextActionDescription: text(),
	attachments: text(),
	status: mysqlEnum(['completed','pending','cancelled']).default('completed'),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("donor_communications_donor_date_idx").on(table.donorId, table.date),
	index("donor_communications_org_ou_idx").on(table.organizationId, table.operatingUnitId),
]);

export const donorProjects = mysqlTable("donor_projects", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	donorId: int().notNull().references(() => donors.id, { onDelete: "set null" } ),
	projectId: int().notNull().references(() => projects.id, { onDelete: "set null" } ),
	relationshipType: mysqlEnum(['primary_funder','co_funder','in_kind','technical_partner','potential','past']).default('primary_funder').notNull(),
	status: mysqlEnum(['active','pending','completed','cancelled']).default('active').notNull(),
	fundingAmount: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD'),
	fundingPercentage: decimal({ precision: 5, scale: 2 }),
	startDate: timestamp({ mode: 'string' }),
	endDate: timestamp({ mode: 'string' }),
	notes: text(),
	notesAr: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
},
(table) => [
	index("donor_projects_donor_project_unique").on(table.donorId, table.projectId),
	index("donor_projects_org_ou_idx").on(table.organizationId, table.operatingUnitId),
]);

export const donorReports = mysqlTable("donor_reports", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	donorId: int(),
	projectId: int(),
	grantId: int(),
	reportType: mysqlEnum(['donor_summary','funding_history','pipeline_status','budget_vs_actual','grant_performance','communication_log','custom']).default('donor_summary').notNull(),
	title: varchar({ length: 500 }).notNull(),
	titleAr: varchar({ length: 500 }),
	periodStart: timestamp({ mode: 'string' }),
	periodEnd: timestamp({ mode: 'string' }),
	parametersJson: text(),
	generatedByUserId: int(),
	generatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	status: mysqlEnum(['draft','final','archived']).default('final'),
	fileUrl: text(),
	pdfUrl: text(),
	excelUrl: text(),
	documentId: int(),
	reportDataJson: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("donor_reports_donor_generated_idx").on(table.donorId, table.generatedAt),
	index("donor_reports_org_ou_idx").on(table.organizationId, table.operatingUnitId),
]);

export const donors = mysqlTable("donors", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	type: mysqlEnum(['bilateral','multilateral','foundation','corporate','individual','government','ngo','other']).default('other'),
	category: varchar({ length: 100 }),
	contactPersonName: varchar({ length: 255 }),
	contactPersonTitle: varchar({ length: 255 }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	website: varchar({ length: 255 }),
	address: text(),
	city: varchar({ length: 100 }),
	country: varchar({ length: 100 }),
	postalCode: varchar({ length: 20 }),
	notes: text(),
	notesAr: text(),
	logoUrl: text(),
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("donors_org_code_unique").on(table.organizationId, table.code),
	index("donors_org_name_idx").on(table.organizationId, table.name),
]);

export const drivers = mysqlTable("drivers", {
	id: int().autoincrement().primaryKey().notNull(),
	driverCode: varchar({ length: 50 }).notNull(),
	firstName: varchar({ length: 100 }),
	lastName: varchar({ length: 100 }),
	firstNameAr: varchar({ length: 100 }),
	lastNameAr: varchar({ length: 100 }),
	fullName: varchar({ length: 255 }).notNull(),
	fullNameAr: varchar({ length: 255 }),
	staffId: int(),
	licenseNumber: varchar({ length: 100 }),
	licenseType: varchar({ length: 50 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	licenseExpiry: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	licenseExpiryDate: date({ mode: 'string' }),
	licenseIssuingCountry: varchar({ length: 100 }),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	status: mysqlEnum(['active','inactive','on_leave','terminated']).default('active').notNull(),
	photoUrl: text(),
	notes: text(),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	employeeId: int(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const emailProviderSettings = mysqlTable("email_provider_settings", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	providerType: mysqlEnum(['m365','smtp','disabled']).default('disabled').notNull(),
	tenantId: varchar({ length: 255 }),
	clientId: varchar({ length: 255 }),
	authType: mysqlEnum(['secret','certificate']),
	secretRef: text(),
	certificateRef: text(),
	senderMode: mysqlEnum(['shared_mailbox','user_mailbox']),
	smtpHost: varchar({ length: 255 }),
	smtpPort: int(),
	smtpUsername: varchar({ length: 255 }),
	smtpPassword: text(),
	smtpEncryption: mysqlEnum(['tls','ssl','none']).default('tls'),
	fromEmail: varchar({ length: 320 }),
	fromName: varchar({ length: 255 }),
	replyToEmail: varchar({ length: 320 }),
	defaultCc: text(),
	defaultBcc: text(),
	allowedDomains: text(),
	isConnected: tinyint().default(0).notNull(),
	lastSuccessfulSend: timestamp({ mode: 'string' }),
	lastError: text(),
	lastTestedAt: timestamp({ mode: 'string' }),
	isActive: tinyint().default(1).notNull(),
	createdBy: int(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("uk_email_provider_org").on(table.organizationId),
]);

export const emailTemplates = mysqlTable("email_templates", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	templateKey: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	subject: varchar({ length: 500 }),
	subjectAr: varchar({ length: 500 }),
	bodyHtml: text(),
	bodyHtmlAr: text(),
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const expenditures = mysqlTable("expenditures", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	purchaseOrderNumber: varchar({ length: 50 }).default('').notNull(),
	expenditureNumber: varchar({ length: 50 }).default(''),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expenditureDate: date({ mode: 'string' }).notNull(),
	vendorId: int(),
	vendorName: varchar({ length: 255 }).notNull(),
	vendorNameAr: varchar({ length: 255 }),
	expenditureType: mysqlEnum(['OPERATIONAL','PROJECT','ADMINISTRATIVE','TRAVEL','PROCUREMENT','OTHER']).notNull(),
	category: varchar({ length: 100 }),
	description: text().notNull(),
	descriptionAr: text(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	currencyId: int(),
	exchangeRateId: int(),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	projectId: int(),
	grantId: int(),
	budgetLineId: int(),
	glAccountId: int(),
	accountCode: varchar({ length: 50 }),
	journalEntryId: int(),
	postingStatus: mysqlEnum(['unposted','posted','reversed']).default('unposted'),
	status: mysqlEnum(['DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','PAID','CANCELLED']).default('DRAFT').notNull(),
	submittedBy: int(),
	submittedAt: timestamp({ mode: 'string' }),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	paymentId: int(),
	paidAt: timestamp({ mode: 'string' }),
	attachments: text(),
	version: int().default(1).notNull(),
	parentId: int(),
	revisionReason: text(),
	isLatestVersion: tinyint().default(1).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdBy: int(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int(),
},
(table) => [
	index("idx_organization").on(table.organizationId),
	index("idx_project").on(table.projectId),
	index("idx_status").on(table.status),
	index("idx_expenditure_date").on(table.expenditureDate),
	index("idx_latest_version").on(table.isLatestVersion),
	index("idx_not_deleted").on(table.isDeleted),
]);

export const expenses = mysqlTable("expenses", {
	id: int().autoincrement().primaryKey().notNull(),
	budgetItemId: int().notNull().references(() => budgetItems.id, { onDelete: "restrict" } ),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expenseDate: date({ mode: 'string' }).notNull(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	fiscalYear: varchar({ length: 20 }).notNull(),
	month: int().notNull(),
	reference: varchar({ length: 255 }),
	description: text(),
	documentUrl: text(),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	grantId: int(),
	currencyId: int(),
	exchangeRateId: int(),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	vendorId: int(),
	payeeName: varchar({ length: 255 }),
	paymentMethod: mysqlEnum(['cash','bank','mobile','cheque']),
	bankAccountId: int(),
	isReimbursable: tinyint().default(0),
	glAccountId: int(),
	journalEntryId: int(),
	postingStatus: mysqlEnum(['unposted','posted','reversed']).default('unposted'),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	isDeleted: tinyint().default(0).notNull(),
});

export const financeAdvances = mysqlTable("finance_advances", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int(),
	advanceNumber: varchar({ length: 50 }).notNull(),
	employeeId: int().references(() => hrEmployees.id, { onDelete: "set null" } ),
	employeeName: varchar({ length: 255 }).notNull(),
	employeeNameAr: varchar({ length: 255 }),
	department: varchar({ length: 100 }),
	advanceType: mysqlEnum(['TRAVEL','PROJECT','OPERATIONAL','SALARY','OTHER']).notNull(),
	purpose: text().notNull(),
	purposeAr: text(),
	requestedAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	approvedAmount: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	requestDate: timestamp({ mode: 'string' }).notNull(),
	expectedSettlementDate: timestamp({ mode: 'string' }),
	actualSettlementDate: timestamp({ mode: 'string' }),
	status: mysqlEnum(['DRAFT','PENDING','APPROVED','REJECTED','PARTIALLY_SETTLED','FULLY_SETTLED','CANCELLED']).default('DRAFT').notNull(),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	settledAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	outstandingBalance: decimal({ precision: 15, scale: 2 }),
	projectId: int().references(() => projects.id, { onDelete: "set null" } ),
	accountCode: varchar({ length: 50 }),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	grantId: int(),
	currencyId: int(),
	exchangeRateId: int(),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	glAccountId: int(),
	journalEntryId: int(),
	postingStatus: mysqlEnum(['unposted','posted','reversed']).default('unposted'),
	disbursementDate: timestamp({ mode: 'string' }),
	cashAccountId: int(),
	bankAccountId: int(),
	version: int().default(1).notNull(),
	parentId: int(),
	revisionReason: text(),
	isLatestVersion: tinyint().default(1).notNull(),
});

export const financeApprovalThresholds = mysqlTable("finance_approval_thresholds", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	category: mysqlEnum(['expense','advance','procurement','budget_transfer','asset_disposal','payment','journal_entry']).default('expense'),
	minAmount: decimal({ precision: 15, scale: 2 }).default('0.00'),
	maxAmount: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD'),
	approverRole: varchar({ length: 100 }),
	approverUserId: int().references(() => users.id, { onDelete: "set null" } ),
	requiresMultipleApprovers: tinyint().default(0).notNull(),
	approverCount: int().default(1),
	sequentialApproval: tinyint().default(0).notNull(),
	autoApproveBelow: decimal({ precision: 15, scale: 2 }),
	isActive: tinyint().default(1).notNull(),
	notes: text(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	appliesToModule: mysqlEnum(['expenses','advances','cash_transactions','assets','procurement','budget_revision']),
	appliesToTransactionType: varchar({ length: 50 }),
	currencyId: int(),
	isAmountInBaseCurrency: tinyint().default(1),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveFrom: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveTo: date({ mode: 'string' }),
});

export const financeAssetCategories = mysqlTable("finance_asset_categories", {
	id: int().autoincrement().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	description: text(),
	parentId: int(),
	depreciationRate: decimal({ precision: 5, scale: 2 }).default('0.00'),
	defaultUsefulLife: int().default(5),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	assetAccountId: int(),
	accumulatedDepAccountId: int(),
	depreciationExpenseAccountId: int(),
	defaultDepreciationMethod: mysqlEnum(['straight_line','declining_balance','units_of_production']).default('straight_line'),
});

export const financeAssetDisposals = mysqlTable("finance_asset_disposals", {
	id: int().autoincrement().primaryKey().notNull(),
	disposalCode: varchar({ length: 50 }).notNull(),
	assetId: int().notNull().references(() => financeAssets.id, { onDelete: "cascade" } ),
	disposalType: mysqlEnum(['sale','donation','scrap','theft','loss','transfer_out','write_off']).default('sale'),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	proposedDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	actualDate: date({ mode: 'string' }),
	bookValue: decimal({ precision: 15, scale: 2 }).default('0.00'),
	proposedValue: decimal({ precision: 15, scale: 2 }).default('0.00'),
	actualValue: decimal({ precision: 15, scale: 2 }).default('0.00'),
	currency: varchar({ length: 10 }).default('USD'),
	reason: text(),
	status: mysqlEnum(['draft','pending_approval','approved','rejected','completed','cancelled']).default('draft'),
	buyerInfo: text(),
	recipientInfo: text(),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvalDate: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	notes: text(),
	attachments: json(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	disposalCommitteeMembers: text(),
	disposalDocumentId: int(),
	journalEntryId: int(),
	buyerVendorId: int(),
	paymentReference: varchar({ length: 100 }),
});

export const financeAssetMaintenance = mysqlTable("finance_asset_maintenance", {
	id: int().autoincrement().primaryKey().notNull(),
	assetId: int().notNull().references(() => financeAssets.id, { onDelete: "cascade" } ),
	maintenanceType: mysqlEnum(['preventive','corrective','inspection','upgrade','repair']).default('preventive'),
	description: text(),
	cost: decimal({ precision: 15, scale: 2 }).default('0.00'),
	currency: varchar({ length: 10 }).default('USD'),
	performedBy: varchar({ length: 255 }),
	vendorName: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	performedDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	nextDueDate: date({ mode: 'string' }),
	notes: text(),
	attachments: json(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	vendorId: int(),
	workOrderNumber: varchar({ length: 50 }),
	documentId: int(),
	expenseId: int(),
});

export const financeAssetTransfers = mysqlTable("finance_asset_transfers", {
	id: int().autoincrement().primaryKey().notNull(),
	transferCode: varchar({ length: 50 }).notNull(),
	assetId: int().notNull().references(() => financeAssets.id, { onDelete: "cascade" } ),
	fromLocation: varchar({ length: 255 }),
	toLocation: varchar({ length: 255 }),
	fromAssignee: varchar({ length: 255 }),
	toAssignee: varchar({ length: 255 }),
	fromAssigneeUserId: int().references(() => users.id, { onDelete: "set null" } ),
	toAssigneeUserId: int().references(() => users.id, { onDelete: "set null" } ),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	transferDate: date({ mode: 'string' }),
	reason: text(),
	status: mysqlEnum(['pending','approved','rejected','completed','cancelled']).default('pending'),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvalDate: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	notes: text(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	fromOperatingUnitId: int(),
	toOperatingUnitId: int(),
	journalEntryId: int(),
	attachments: text(),
});

export const financeAssets = mysqlTable("finance_assets", {
	id: int().autoincrement().primaryKey().notNull(),
	assetCode: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	description: text(),
	categoryId: int().references(() => financeAssetCategories.id, { onDelete: "set null" } ),
	subcategory: varchar({ length: 100 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	acquisitionDate: date({ mode: 'string' }),
	acquisitionCost: decimal({ precision: 15, scale: 2 }).default('0.00'),
	currency: varchar({ length: 10 }).default('USD'),
	depreciationMethod: mysqlEnum(['straight_line','declining_balance','units_of_production','none']).default('straight_line'),
	usefulLifeYears: int().default(5),
	salvageValue: decimal({ precision: 15, scale: 2 }).default('0.00'),
	accumulatedDepreciation: decimal({ precision: 15, scale: 2 }).default('0.00'),
	currentValue: decimal({ precision: 15, scale: 2 }).default('0.00'),
	status: mysqlEnum(['active','in_maintenance','disposed','lost','transferred','pending_disposal']).default('active'),
	condition: mysqlEnum(['excellent','good','fair','poor','non_functional']).default('good'),
	location: varchar({ length: 255 }),
	assignedTo: varchar({ length: 255 }),
	assignedToUserId: int().references(() => users.id, { onDelete: "set null" } ),
	donorId: int(),
	donorName: varchar({ length: 255 }),
	grantId: int(),
	grantCode: varchar({ length: 100 }),
	projectId: int().references(() => projects.id, { onDelete: "set null" } ),
	serialNumber: varchar({ length: 100 }),
	manufacturer: varchar({ length: 255 }),
	model: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	warrantyExpiry: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	lastMaintenanceDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	nextMaintenanceDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	disposalDate: date({ mode: 'string' }),
	disposalMethod: mysqlEnum(['sale','donation','scrap','theft','loss','transfer']),
	disposalValue: decimal({ precision: 15, scale: 2 }),
	disposalReason: text(),
	disposalApprovedBy: int().references(() => users.id, { onDelete: "set null" } ),
	insurancePolicy: varchar({ length: 100 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	insuranceExpiry: date({ mode: 'string' }),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	assetTag: varchar({ length: 50 }),
	purchaseOrderId: int(),
	invoiceId: int(),
	supplierId: int(),
	assetGlAccountCode: varchar({ length: 50 }),
	depreciationExpenseGlAccountCode: varchar({ length: 50 }),
	accumulatedDepreciationGlAccountCode: varchar({ length: 50 }),
});

export const financeBankAccounts = mysqlTable("finance_bank_accounts", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	accountNumber: varchar({ length: 50 }).notNull(),
	accountName: varchar({ length: 255 }).notNull(),
	accountNameAr: varchar({ length: 255 }),
	bankName: varchar({ length: 255 }).notNull(),
	bankNameAr: varchar({ length: 255 }),
	bankCode: varchar({ length: 50 }),
	branchName: varchar({ length: 255 }),
	branchCode: varchar({ length: 50 }),
	accountType: mysqlEnum(['CHECKING','SAVINGS','MONEY_MARKET','PETTY_CASH','SAFE']).notNull(),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	openingBalance: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	currentBalance: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	lastReconciliationDate: timestamp({ mode: 'string' }),
	lastReconciliationBalance: decimal({ precision: 15, scale: 2 }),
	isActive: tinyint().default(1).notNull(),
	isPrimary: tinyint().default(0).notNull(),
	glAccountCode: varchar({ length: 50 }),
	contactPerson: varchar({ length: 255 }),
	contactPhone: varchar({ length: 50 }),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdBy: int(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int(),
	iban: varchar({ length: 50 }),
	swiftCode: varchar({ length: 20 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	openingBalanceDate: date({ mode: 'string' }),
	glAccountId: int(),
});

export const financeBudgetCategories = mysqlTable("finance_budget_categories", {
	id: int().autoincrement().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	description: text(),
	parentId: int(),
	accountId: int(),
	accountCode: varchar({ length: 50 }),
	categoryType: mysqlEnum(['expense','income','both']).default('expense'),
	isActive: tinyint().default(1).notNull(),
	sortOrder: int().default(0),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	level: int().default(1),
	donorCategoryCode: varchar({ length: 50 }),
	isEligibleCost: tinyint().default(1),
	maxCapPercent: decimal({ precision: 5, scale: 2 }),
	requiresSupportingDocs: tinyint().default(0),
	isDirectCost: tinyint().default(1),
});

export const financeCashTransactions = mysqlTable("finance_cash_transactions", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	transactionNumber: varchar({ length: 50 }).notNull(),
	bankAccountId: int().notNull(),
	transactionType: mysqlEnum(['DEPOSIT','WITHDRAWAL','TRANSFER_IN','TRANSFER_OUT','BANK_CHARGE','INTEREST','ADJUSTMENT']).notNull(),
	transactionDate: timestamp({ mode: 'string' }).notNull(),
	valueDate: timestamp({ mode: 'string' }),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	exchangeRate: decimal({ precision: 10, scale: 6 }).default('1'),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	balanceAfter: decimal({ precision: 15, scale: 2 }),
	transferToAccountId: int(),
	transferFromAccountId: int(),
	referenceNumber: varchar({ length: 100 }),
	payee: varchar({ length: 255 }),
	payer: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	category: varchar({ length: 100 }),
	accountCode: varchar({ length: 50 }),
	projectId: int(),
	isReconciled: tinyint().default(0).notNull(),
	reconciledAt: timestamp({ mode: 'string' }),
	reconciledBy: int(),
	status: mysqlEnum(['DRAFT','PENDING','APPROVED','REJECTED','POSTED']).default('POSTED').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdBy: int(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int(),
	grantId: int(),
	currencyId: int(),
	exchangeRateId: int(),
	glAccountId: int(),
	journalEntryId: int(),
	postingStatus: mysqlEnum(['unposted','posted','reversed']).default('unposted'),
	counterpartyType: mysqlEnum(['vendor','staff','donor','other']),
	counterpartyId: int(),
});

export const financeCurrencies = mysqlTable("finance_currencies", {
	id: int().autoincrement().primaryKey().notNull(),
	code: varchar({ length: 10 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar({ length: 100 }),
	symbol: varchar({ length: 10 }),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	isBaseCurrency: tinyint().default(0).notNull(),
	isActive: tinyint().default(1).notNull(),
	decimalPlaces: int().default(2),
	organizationId: int().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const financeEncumbrances = mysqlTable("finance_encumbrances", {
	id: int().autoincrement().primaryKey().notNull(),
	purchaseRequestId: int().notNull(),
	purchaseOrderId: int(),
	budgetLineId: int().notNull(),
	vendorId: int(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	encumbranceNumber: varchar({ length: 50 }),
	encumbranceDate: timestamp({ mode: 'string' }).defaultNow(),
	encumberedAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('USD'),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	baseCurrencyAmount: decimal({ precision: 15, scale: 2 }),
	status: mysqlEnum(['active','partially_liquidated','fully_liquidated','cancelled']).default('active'),
	liquidatedAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	remainingAmount: decimal({ precision: 15, scale: 2 }),
	reservationId: int(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	closedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("idx_pr_encumbrance").on(table.purchaseRequestId),
	index("idx_po_encumbrance").on(table.purchaseOrderId),
	index("idx_status").on(table.status),
	index("encumbranceNumber").on(table.encumbranceNumber),
]);

export const financeExchangeRates = mysqlTable("finance_exchange_rates", {
	id: int().autoincrement().primaryKey().notNull(),
	fromCurrencyId: int(),
	fromCurrencyCode: varchar({ length: 10 }).notNull(),
	toCurrencyId: int(),
	toCurrencyCode: varchar({ length: 10 }).notNull(),
	rate: decimal({ precision: 15, scale: 6 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expiryDate: date({ mode: 'string' }),
	source: varchar({ length: 100 }),
	notes: text(),
	organizationId: int().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	rateType: mysqlEnum(['official','market','bank','internal']).default('official'),
	enteredBy: int(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
});

export const financeExpenditureCategories = mysqlTable("finance_expenditure_categories", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	categoryName: varchar({ length: 100 }).notNull(),
	categoryNameAr: varchar({ length: 100 }),
	description: text(),
	descriptionAr: text(),
	glAccountId: int().references(() => chartOfAccounts.id, { onDelete: "set null" } ),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("unique_category").on(table.organizationId, table.categoryName),
	index("idx_org_active").on(table.organizationId, table.isActive),
]);

export const financeExpenditures = mysqlTable("finance_expenditures", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	projectId: int().references(() => projects.id, { onDelete: "set null" } ),
	budgetLineId: int().references(() => budgetLines.id, { onDelete: "set null" } ),
	payeeId: int(),
	payeeType: mysqlEnum(['employee','vendor','other']).notNull(),
	payeeName: varchar({ length: 255 }).notNull(),
	payeeNameAr: varchar({ length: 255 }),
	expenditureNumber: varchar({ length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expenditureDate: date({ mode: 'string' }).notNull(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	currencyId: int().references(() => financeCurrencies.id, { onDelete: "set null" } ),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	exchangeRateId: int().references(() => financeExchangeRates.id, { onDelete: "set null" } ),
	categoryId: int().references(() => financeExpenditureCategories.id, { onDelete: "set null" } ),
	description: text(),
	descriptionAr: text(),
	referenceNumber: varchar({ length: 100 }),
	status: mysqlEnum(['draft','pending_approval','approved','rejected','paid','cancelled']).default('draft'),
	approvalStatus: mysqlEnum(['pending','approved','rejected']).default('pending'),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	rejectionReasonAr: text(),
	glAccountId: int().references(() => chartOfAccounts.id, { onDelete: "set null" } ),
	journalEntryId: int(),
	postingStatus: mysqlEnum(['unposted','posted','reversed']).default('unposted'),
	receiptUrl: varchar({ length: 500 }),
	attachments: text(),
	createdBy: int().notNull().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	deletedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("unique_expenditure_number").on(table.organizationId, table.expenditureNumber),
	index("idx_org_status").on(table.organizationId, table.status),
	index("idx_org_date").on(table.organizationId, table.expenditureDate),
	index("idx_project").on(table.projectId),
	index("idx_category").on(table.categoryId),
]);

export const financeFiscalYears = mysqlTable("finance_fiscal_years", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar({ length: 100 }),
	code: varchar({ length: 20 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date({ mode: 'string' }).notNull(),
	status: mysqlEnum(['planning','open','closed','locked']).default('planning'),
	isCurrent: tinyint().default(0).notNull(),
	closedAt: timestamp({ mode: 'string' }),
	closedBy: int(),
	notes: text(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lockStatus: mysqlEnum(['open','locked','closed']).default('open'),
	lockedAt: timestamp({ mode: 'string' }),
	lockedBy: int(),
});

export const financeFundBalances = mysqlTable("finance_fund_balances", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	fundCode: varchar({ length: 50 }).notNull(),
	fundName: varchar({ length: 255 }).notNull(),
	fundNameAr: varchar({ length: 255 }),
	fundType: mysqlEnum(['RESTRICTED','UNRESTRICTED','TEMPORARILY_RESTRICTED','DONOR_DESIGNATED']).notNull(),
	donorId: int(),
	donorName: varchar({ length: 255 }),
	grantNumber: varchar({ length: 100 }),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	totalBudget: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	totalReceived: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	totalExpended: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	currentBalance: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	startDate: timestamp({ mode: 'string' }),
	endDate: timestamp({ mode: 'string' }),
	bankAccountId: int(),
	isActive: tinyint().default(1).notNull(),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdBy: int(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int(),
	projectId: int(),
	baseCurrencyId: int(),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	status: mysqlEnum(['active','closed','suspended']).default('active'),
	restrictedType: mysqlEnum(['restricted','unrestricted']).default('restricted'),
});

export const financePeriods = mysqlTable("finance_periods", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	fiscalYearId: int().notNull(),
	periodCode: varchar({ length: 50 }).notNull(),
	periodNumber: int().notNull(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	status: mysqlEnum(['OPEN','SOFT_CLOSED','LOCKED','REOPENED']).default('OPEN').notNull(),
	lockedAt: timestamp({ mode: 'string' }),
	lockedBy: int(),
	reopenedAt: timestamp({ mode: 'string' }),
	reopenedBy: int(),
	closeReason: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdBy: int(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("idx_finance_periods_org").on(table.organizationId),
	index("idx_finance_periods_fiscal_year").on(table.fiscalYearId),
]);

export const financePeriodEvents = mysqlTable("finance_period_events", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	periodId: int().notNull(),
	action: varchar({ length: 50 }).notNull(),
	actorUserId: int(),
	actorDisplaySnapshot: text(),
	reason: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_fpe_org").on(table.organizationId),
	index("idx_fpe_period").on(table.periodId),
]);

export const financePermissions = mysqlTable("finance_permissions", {
	id: int().autoincrement().primaryKey().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	module: mysqlEnum(['chart_of_accounts','budgets','expenditures','advances','treasury','assets','reports','settings']).default('budgets'),
	action: mysqlEnum(['view','create','edit','delete','approve','export','import','admin']).default('view'),
	description: text(),
	isActive: tinyint().default(1).notNull(),
	organizationId: int().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const financeRolePermissions = mysqlTable("finance_role_permissions", {
	id: int().autoincrement().primaryKey().notNull(),
	roleId: int().notNull(),
	permissionId: int().notNull(),
	organizationId: int().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const financeRoles = mysqlTable("finance_roles", {
	id: int().autoincrement().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	description: text(),
	level: int().default(1),
	isSystemRole: tinyint().default(0).notNull(),
	isActive: tinyint().default(1).notNull(),
	organizationId: int().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const financeSettlements = mysqlTable("finance_settlements", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	settlementNumber: varchar({ length: 50 }).notNull(),
	advanceId: int().notNull(),
	settlementDate: timestamp({ mode: 'string' }).notNull(),
	settledAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	receiptNumber: varchar({ length: 100 }),
	description: text(),
	descriptionAr: text(),
	expenseCategory: varchar({ length: 100 }),
	accountCode: varchar({ length: 50 }),
	status: mysqlEnum(['PENDING','APPROVED','REJECTED']).default('PENDING').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	refundAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	refundDate: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdBy: int(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int(),
	projectId: int(),
	grantId: int(),
	currencyId: int(),
	exchangeRateId: int(),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	glAccountId: int(),
	journalEntryId: int(),
	postingStatus: mysqlEnum(['unposted','posted','reversed']).default('unposted'),
});

export const financeUserRoles = mysqlTable("finance_user_roles", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	roleId: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveFrom: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveTo: date({ mode: 'string' }),
	isActive: tinyint().default(1).notNull(),
	organizationId: int().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const fiscalPeriods = mysqlTable("fiscal_periods", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	fiscalYearId: int().notNull(),
	periodNumber: int().notNull(),
	periodName: varchar({ length: 50 }).notNull(),
	periodNameAr: varchar({ length: 50 }),
	periodType: mysqlEnum(['month','quarter']).default('month'),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date({ mode: 'string' }).notNull(),
	status: mysqlEnum(['open','closed','locked']).default('open'),
	closedAt: timestamp({ mode: 'string' }),
	closedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("uk_fiscal_period").on(table.fiscalYearId, table.periodNumber),
	index("idx_org").on(table.organizationId),
	index("idx_fiscal").on(table.fiscalYearId),
	index("idx_dates").on(table.startDate, table.endDate),
	index("idx_status").on(table.status),
]);

export const forecastAuditLog = mysqlTable("forecast_audit_log", {
	id: int().autoincrement().primaryKey().notNull(),
	forecastId: int().notNull(),
	userId: int().notNull(),
	action: mysqlEnum(['create','update','delete']).notNull(),
	fieldChanged: varchar({ length: 100 }),
	beforeValue: text(),
	afterValue: text(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const forecastPlan = mysqlTable("forecast_plan", {
	id: int().autoincrement().primaryKey().notNull(),
	budgetItemId: int().notNull(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	fiscalYear: varchar({ length: 20 }).notNull(),
	yearNumber: int().notNull(),
	m1: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m2: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m3: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m4: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m5: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m6: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m7: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m8: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m9: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m10: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m11: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	m12: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	totalForecast: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const fuelLogs = mysqlTable("fuel_logs", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	vehicleId: int().notNull(),
	driverId: int(),
	fuelLogNumber: varchar({ length: 50 }).notNull(),
	fuelDate: timestamp({ mode: 'string' }).notNull(),
	fuelType: mysqlEnum(['petrol','diesel','electric']).default('petrol'),
	quantity: decimal({ precision: 8, scale: 2 }).notNull(),
	unitPrice: decimal({ precision: 8, scale: 2 }),
	totalCost: decimal({ precision: 10, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD'),
	mileageAtFill: decimal({ precision: 10, scale: 2 }),
	station: varchar({ length: 255 }),
	receiptNumber: varchar({ length: 100 }),
	projectCode: varchar({ length: 50 }),
	remarks: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const glAccountCategories = mysqlTable("gl_account_categories", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	code: varchar({ length: 20 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	parentId: int(),
	level: int().default(1),
	accountType: mysqlEnum(['asset','liability','equity','revenue','expense']).notNull(),
	normalBalance: mysqlEnum(['debit','credit']).notNull(),
	isActive: tinyint().default(1),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("idx_org").on(table.organizationId),
	index("idx_ou").on(table.operatingUnitId),
	index("idx_parent").on(table.parentId),
	index("idx_type").on(table.accountType),
]);

export const glAccounts = mysqlTable("gl_accounts", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	categoryId: int(),
	accountCode: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	accountType: mysqlEnum(['asset','liability','equity','revenue','expense']).notNull(),
	normalBalance: mysqlEnum(['debit','credit']).notNull(),
	parentAccountId: int(),
	level: int().default(1),
	isControlAccount: tinyint().default(0),
	isBankAccount: tinyint().default(0),
	isCashAccount: tinyint().default(0),
	isReceivable: tinyint().default(0),
	isPayable: tinyint().default(0),
	currencyId: int(),
	openingBalance: decimal({ precision: 15, scale: 2 }).default('0.00'),
	currentBalance: decimal({ precision: 15, scale: 2 }).default('0.00'),
	isActive: tinyint().default(1),
	isPostable: tinyint().default(1),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("uk_org_code").on(table.organizationId, table.accountCode),
	index("idx_org").on(table.organizationId),
	index("idx_ou").on(table.operatingUnitId),
	index("idx_category").on(table.categoryId),
	index("idx_parent").on(table.parentAccountId),
	index("idx_type").on(table.accountType),
]);

export const glPostingEvents = mysqlTable("gl_posting_events", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	purchaseRequestId: int(),
	entityType: mysqlEnum(['contract','sac','invoice','payment','retention']).notNull(),
	entityId: int().notNull(),
	eventType: mysqlEnum(['approval','rejection','payment','retention_hold','retention_release']).notNull(),
	glAccount: varchar({ length: 50 }),
	amount: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD'),
	fiscalPeriod: varchar({ length: 20 }),
	postingStatus: mysqlEnum(['pending','posted','failed','reversed']).default('pending').notNull(),
	postedAt: timestamp({ mode: 'string' }),
	description: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdBy: int(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_gl_entity").on(table.entityType, table.entityId),
	index("idx_gl_org").on(table.organizationId),
]);

export const globalSettings = mysqlTable("globalSettings", {
	id: int().autoincrement().primaryKey().notNull(),
	defaultLanguage: varchar({ length: 10 }).default('en').notNull(),
	defaultTimezone: varchar({ length: 100 }).default('UTC').notNull(),
	defaultCurrency: varchar({ length: 10 }).default('USD').notNull(),
	environmentLabel: mysqlEnum(['production','staging','test']).default('production').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int(),
});

export const goodsReceiptNotes = mysqlTable("goods_receipt_notes", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	purchaseOrderId: int(),
	supplierId: int(),
	grnNumber: varchar({ length: 50 }).notNull(),
	grnDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	deliveryNoteNumber: varchar({ length: 100 }),
	invoiceNumber: varchar({ length: 100 }),
	warehouse: varchar({ length: 255 }),
	warehouseAr: varchar({ length: 255 }),
	receivedBy: varchar({ length: 255 }),
	inspectedBy: varchar({ length: 255 }),
	totalReceived: int().default(0),
	totalAccepted: int().default(0),
	totalRejected: int().default(0),
	remarks: text(),
	remarksAr: text(),
	status: mysqlEnum(['pending_inspection','inspected','accepted','partially_accepted','rejected']).default('pending_inspection').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	stockPosted: tinyint().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const grantDocuments = mysqlTable("grant_documents", {
	id: int().autoincrement().primaryKey().notNull(),
	grantId: int().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileUrl: text().notNull(),
	fileKey: varchar({ length: 500 }).notNull(),
	fileSize: int(),
	mimeType: varchar({ length: 100 }),
	category: mysqlEnum(['contractual','financial','programmatic','reporting','other']).default('other').notNull(),
	status: mysqlEnum(['draft','pending','approved','rejected','final']).default('draft').notNull(),
	description: text(),
	uploadedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	uploadedBy: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const grants = mysqlTable("grants", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	donorId: int(),
	projectId: int(),
	grantCode: varchar({ length: 100 }),
	title: varchar({ length: 500 }),
	titleAr: varchar({ length: 500 }),
	grantNumber: varchar({ length: 100 }),
	grantName: text(),
	grantNameAr: text(),
	donorName: varchar({ length: 255 }),
	donorReference: varchar({ length: 255 }),
	grantAmount: decimal({ precision: 15, scale: 2 }),
	amount: decimal({ precision: 15, scale: 2 }).default('0'),
	totalBudget: decimal({ precision: 15, scale: 2 }).default('0'),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	status: mysqlEnum(['planned','ongoing','closed','draft','submitted','under_review','approved','rejected','pending']).default('draft').notNull(),
	reportingStatus: mysqlEnum(['on_track','due','overdue']).default('on_track'),
	submissionDate: timestamp({ mode: 'string' }),
	approvalDate: timestamp({ mode: 'string' }),
	startDate: timestamp({ mode: 'string' }),
	endDate: timestamp({ mode: 'string' }),
	description: text(),
	descriptionAr: text(),
	objectives: text(),
	objectivesAr: text(),
	proposalDocumentUrl: text(),
	approvalDocumentUrl: text(),
	sector: varchar({ length: 255 }),
	responsible: varchar({ length: 255 }),
	reportingFrequency: mysqlEnum(['monthly','quarterly','semi_annually','annually']).default('quarterly'),
	coFunding: tinyint().default(0),
	coFunderName: varchar({ length: 255 }),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const grnLineItems = mysqlTable("grn_line_items", {
	id: int().autoincrement().primaryKey().notNull(),
	grnId: int().notNull(),
	poLineItemId: int(),
	lineNumber: int().notNull(),
	description: text().notNull(),
	unit: varchar({ length: 50 }).default('Piece'),
	orderedQty: decimal({ precision: 10, scale: 2 }).default('0'),
	receivedQty: decimal({ precision: 10, scale: 2 }).default('0'),
	acceptedQty: decimal({ precision: 10, scale: 2 }).default('0'),
	rejectedQty: decimal({ precision: 10, scale: 2 }).default('0'),
	rejectionReason: text(),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const hrAnnualPlans = mysqlTable("hr_annual_plans", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	planYear: int().notNull(),
	planName: varchar({ length: 255 }).notNull(),
	existingWorkforce: text(),
	plannedStaffing: text(),
	recruitmentPlan: text(),
	budgetEstimate: text(),
	trainingPlan: text(),
	hrRisks: text(),
	totalPlannedPositions: int(),
	existingStaff: int(),
	newPositionsRequired: int(),
	estimatedHrCost: decimal({ precision: 15, scale: 2 }),
	status: mysqlEnum(['draft','pending_review','pending_approval','approved','rejected']).default('draft').notNull(),
	preparedBy: int(),
	preparedAt: timestamp({ mode: 'string' }),
	reviewedBy: int(),
	reviewedAt: timestamp({ mode: 'string' }),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const hrAttendanceRecords = mysqlTable("hr_attendance_records", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	employeeId: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }).notNull(),
	checkIn: timestamp({ mode: 'string' }),
	checkOut: timestamp({ mode: 'string' }),
	status: mysqlEnum(['present','absent','late','half_day','on_leave','holiday','weekend']).default('present').notNull(),
	workHours: decimal({ precision: 5, scale: 2 }),
	overtimeHours: decimal({ precision: 5, scale: 2 }),
	location: varchar({ length: 255 }),
	notes: text(),
	periodLocked: tinyint().default(0).notNull(),
	lockedBy: int(),
	lockedAt: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("hr_attendance_records_employeeId_date_unique").on(table.employeeId, table.date),
]);

export const hrDocuments = mysqlTable("hr_documents", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	employeeId: int(),
	documentCode: varchar({ length: 50 }),
	documentName: varchar({ length: 255 }).notNull(),
	documentNameAr: varchar({ length: 255 }),
	documentType: mysqlEnum(['policy','template','form','contract','certificate','id_document','other']).notNull(),
	category: varchar({ length: 100 }),
	fileUrl: text(),
	fileSize: int(),
	mimeType: varchar({ length: 100 }),
	version: varchar({ length: 50 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expiryDate: date({ mode: 'string' }),
	description: text(),
	tags: text(),
	isPublic: tinyint().default(0).notNull(),
	accessRoles: text(),
	status: mysqlEnum(['draft','active','archived','expired']).default('active').notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	uploadedBy: int(),
});

export const hrEmployees = mysqlTable("hr_employees", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	employeeCode: varchar({ length: 50 }).notNull(),
	firstName: varchar({ length: 100 }).notNull(),
	lastName: varchar({ length: 100 }).notNull(),
	firstNameAr: varchar({ length: 100 }),
	lastNameAr: varchar({ length: 100 }),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateOfBirth: date({ mode: 'string' }),
	gender: mysqlEnum(['male','female','other']),
	nationality: varchar({ length: 100 }),
	nationalId: varchar({ length: 100 }),
	passportNumber: varchar({ length: 100 }),
	employmentType: mysqlEnum(['full_time','part_time','contract','consultant','intern']).default('full_time'),
	staffCategory: mysqlEnum(['national','international','expatriate']).default('national'),
	department: varchar({ length: 100 }),
	position: varchar({ length: 100 }),
	jobTitle: varchar({ length: 255 }),
	gradeLevel: varchar({ length: 50 }),
	reportingTo: int(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	hireDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	contractStartDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	contractEndDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	probationEndDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	terminationDate: date({ mode: 'string' }),
	status: mysqlEnum(['active','on_leave','suspended','terminated','resigned']).default('active').notNull(),
	address: text(),
	city: varchar({ length: 100 }),
	country: varchar({ length: 100 }),
	emergencyContactName: varchar({ length: 255 }),
	emergencyContactPhone: varchar({ length: 50 }),
	emergencyContactRelation: varchar({ length: 100 }),
	bankName: varchar({ length: 255 }),
	bankAccountNumber: varchar({ length: 100 }),
	bankIban: varchar({ length: 100 }),
	photoUrl: text(),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const hrLeaveBalances = mysqlTable("hr_leave_balances", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	employeeId: int().notNull(),
	year: int().notNull(),
	leaveType: mysqlEnum(['annual','sick','maternity','paternity','unpaid','compassionate','study','other']).notNull(),
	entitlement: decimal({ precision: 5, scale: 1 }).default('0').notNull(),
	carriedOver: decimal({ precision: 5, scale: 1 }).default('0').notNull(),
	used: decimal({ precision: 5, scale: 1 }).default('0').notNull(),
	pending: decimal({ precision: 5, scale: 1 }).default('0').notNull(),
	remaining: decimal({ precision: 5, scale: 1 }).default('0').notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("hr_leave_balances_employeeId_year_leaveType_unique").on(table.employeeId, table.year, table.leaveType),
]);

export const hrLeaveRequests = mysqlTable("hr_leave_requests", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	employeeId: int().notNull(),
	leaveType: mysqlEnum(['annual','sick','maternity','paternity','unpaid','compassionate','study','other']).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date({ mode: 'string' }).notNull(),
	totalDays: decimal({ precision: 5, scale: 1 }).notNull(),
	reason: text(),
	attachmentUrl: text(),
	status: mysqlEnum(['pending','approved','rejected','cancelled']).default('pending').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	balanceBefore: decimal({ precision: 5, scale: 1 }),
	balanceAfter: decimal({ precision: 5, scale: 1 }),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const hrRecruitmentCandidates = mysqlTable("hr_recruitment_candidates", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	jobId: int().notNull(),
	firstName: varchar({ length: 100 }).notNull(),
	lastName: varchar({ length: 100 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	phone: varchar({ length: 50 }),
	resumeUrl: text(),
	coverLetterUrl: text(),
	portfolioUrl: text(),
	linkedinUrl: text(),
	education: text(),
	experience: text(),
	skills: text(),
	source: mysqlEnum(['website','referral','job_board','linkedin','agency','other']).default('website'),
	referredBy: varchar({ length: 255 }),
	rating: int(),
	evaluationNotes: text(),
	interviewDate: timestamp({ mode: 'string' }),
	interviewNotes: text(),
	interviewers: text(),
	status: mysqlEnum(['new','screening','shortlisted','interview_scheduled','interviewed','offer_pending','offer_sent','hired','rejected','withdrawn']).default('new').notNull(),
	rejectionReason: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	offerDate: date({ mode: 'string' }),
	offerSalary: decimal({ precision: 15, scale: 2 }),
	offerAccepted: tinyint(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const hrRecruitmentJobs = mysqlTable("hr_recruitment_jobs", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	jobCode: varchar({ length: 50 }),
	jobTitle: varchar({ length: 255 }).notNull(),
	jobTitleAr: varchar({ length: 255 }),
	department: varchar({ length: 100 }),
	employmentType: mysqlEnum(['full_time','part_time','contract','consultant','intern']).default('full_time'),
	gradeLevel: varchar({ length: 50 }),
	salaryRange: varchar({ length: 100 }),
	description: text(),
	requirements: text(),
	responsibilities: text(),
	benefits: text(),
	location: varchar({ length: 255 }),
	isRemote: tinyint().default(0),
	openings: int().default(1),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	postingDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	closingDate: date({ mode: 'string' }),
	status: mysqlEnum(['draft','open','on_hold','closed','filled','cancelled']).default('draft').notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
});

export const hrSalaryGrades = mysqlTable("hr_salary_grades", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	gradeCode: varchar({ length: 50 }).notNull(),
	gradeName: varchar({ length: 100 }).notNull(),
	gradeNameAr: varchar({ length: 100 }),
	minSalary: decimal({ precision: 15, scale: 2 }).notNull(),
	maxSalary: decimal({ precision: 15, scale: 2 }).notNull(),
	midSalary: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD'),
	steps: text(),
	housingAllowance: decimal({ precision: 15, scale: 2 }),
	transportAllowance: decimal({ precision: 15, scale: 2 }),
	otherAllowances: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expiryDate: date({ mode: 'string' }),
	status: mysqlEnum(['active','inactive','draft']).default('active').notNull(),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const hrSalaryScale = mysqlTable("hr_salary_scale", {
  id: int().autoincrement().primaryKey().notNull(),

  organizationId: int().notNull(),
  operatingUnitId: int(),

  employeeId: int().notNull(),
  staffId: varchar({ length: 50 }).notNull(),
  staffFullName: varchar({ length: 255 }).notNull(),
  position: varchar({ length: 100 }),
  department: varchar({ length: 100 }),
  contractType: varchar({ length: 50 }),

  gradeId: int(),
  gradeCode: varchar({ length: 50 }).notNull(),
  step: varchar({ length: 50 }).notNull(),

  // ✅ BASE SALARY (INPUT)
  basicSalary: decimal({ precision: 15, scale: 2 }).notNull().default('0'),

  minSalary: decimal({ precision: 15, scale: 2 }).default('0'),
  maxSalary: decimal({ precision: 15, scale: 2 }).default('0'),

  // ✅ TOTAL (REFERENCE ONLY — NOT USED FOR CALCULATION)
  approvedGrossSalary: decimal({ precision: 15, scale: 2 }).notNull(),

  // ✅ ALLOWANCES
  housingAllowance: decimal({ precision: 15, scale: 2 }).default('0'),
  housingAllowanceType: mysqlEnum(['value','percentage']).default('value'),

  transportAllowance: decimal({ precision: 15, scale: 2 }).default('0'),
  transportAllowanceType: mysqlEnum(['value','percentage']).default('value'),

  representationAllowance: decimal({ precision: 15, scale: 2 }).default('0'),
  representationAllowanceType: mysqlEnum(['value','percentage']).default('value'),

  otherAllowances: decimal({ precision: 15, scale: 2 }).default('0'),

  annualAllowance: decimal({ precision: 15, scale: 2 }).default('0'),
  bonus: decimal({ precision: 15, scale: 2 }).default('0'),

  // ✅ TAX INPUT (ONLY PERCENT)
  taxPercent: decimal({ precision: 5, scale: 2 }).default('0'),

  // ✅ SOCIAL SECURITY INPUT
  employerContribution: decimal({ precision: 15, scale: 2 }).default('0'),
  employerContributionType: mysqlEnum(['value','percentage']).default('value'),

  employeeContribution: decimal({ precision: 15, scale: 2 }).default('0'),
  employeeContributionType: mysqlEnum(['value','percentage']).default('value'),

  currency: varchar({ length: 10 }).default('USD'),

  version: int().default(1).notNull(),

  effectiveStartDate: date({ mode: 'string' }).notNull(),
  effectiveEndDate: date({ mode: 'string' }),

  status: mysqlEnum(['draft','active','superseded']).default('draft').notNull(),

  isLocked: tinyint().default(0).notNull(),
  usedInPayroll: tinyint().default(0).notNull(),

  lastApprovedBy: int(),
  lastApprovedAt: timestamp({ mode: 'string' }),

  createdBy: int(),
  updatedBy: int(),
  deletedBy: int(),

  isDeleted: tinyint().default(0).notNull(),
  deletedAt: timestamp({ mode: 'string' }),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ============================================================================
// 🔄 CLEAN ARCHITECTURE: hr_payroll_records (CALCULATED OUTPUT ONLY)
// ============================================================================
// All values in payroll are CALCULATED from salary scale
// No manual input except status/approval fields
// ============================================================================

export const hrPayrollRecords = mysqlTable("hr_payroll_records", {
  id: int().autoincrement().primaryKey().notNull(),

  organizationId: int().notNull(),
  operatingUnitId: int(),
  employeeId: int().notNull(),

  // ✅ LINK TO SOURCE
  salaryScaleId: int(),

  payrollMonth: int().notNull(),
  payrollYear: int().notNull(),

  // ✅ INPUT SNAPSHOT
  basicSalary: decimal({ precision: 15, scale: 2 }).notNull(),
  housingAllowance: decimal({ precision: 15, scale: 2 }).default('0'),
  transportAllowance: decimal({ precision: 15, scale: 2 }).default('0'),
  representationAllowance: decimal({ precision: 15, scale: 2 }).default('0'),
  otherAllowances: decimal({ precision: 15, scale: 2 }).default('0'),

  overtimePay: decimal({ precision: 15, scale: 2 }).default('0'),
  bonus: decimal({ precision: 15, scale: 2 }).default('0'),

  // ✅ CALCULATED
  grossSalary: decimal({ precision: 15, scale: 2 }).notNull(),

  // ✅ DEDUCTIONS
  taxDeduction: decimal({ precision: 15, scale: 2 }).default('0'),

  // 🔥 SPLIT SOCIAL SECURITY (IMPORTANT)
  employerSocialSecurity: decimal({ precision: 15, scale: 2 }).default('0'),
  employeeSocialSecurity: decimal({ precision: 15, scale: 2 }).default('0'),

  socialSecurityDeduction: decimal({ precision: 15, scale: 2 }).default('0'),

  loanDeduction: decimal({ precision: 15, scale: 2 }).default('0'),
  otherDeductions: decimal({ precision: 15, scale: 2 }).default('0'),

  totalDeductions: decimal({ precision: 15, scale: 2 }).default('0'),

  // ✅ FINAL
  netSalary: decimal({ precision: 15, scale: 2 }).notNull(),

  currency: varchar({ length: 10 }).default('USD'),

  status: mysqlEnum(['draft','pending_approval','approved','paid','cancelled'])
    .default('draft')
    .notNull(),

  approvedBy: int(),
  approvedAt: timestamp({ mode: 'string' }),
  paidAt: timestamp({ mode: 'string' }),

  paymentMethod: mysqlEnum(['bank_transfer','cash','check']).default('bank_transfer'),
  paymentReference: varchar({ length: 255 }),
  notes: varchar({ length: 1000 }),

  isDeleted: tinyint().default(0).notNull(),
  deletedAt: timestamp({ mode: 'string' }),
  deletedBy: int(),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("hr_payroll_records_employeeId_payrollMonth_payrollYear_unique").on(table.employeeId, table.payrollMonth, table.payrollYear),
]);


export const hrSanctions = mysqlTable("hr_sanctions", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	employeeId: int().notNull(),
	sanctionCode: varchar({ length: 50 }),
	sanctionType: mysqlEnum(['verbal_warning','written_warning','final_warning','suspension','demotion','termination','other']).notNull(),
	severity: mysqlEnum(['minor','moderate','major','critical']).default('minor').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	incidentDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	reportedDate: date({ mode: 'string' }),
	description: text().notNull(),
	evidence: text(),
	investigatedBy: int(),
	investigationNotes: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	investigationDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	decisionDate: date({ mode: 'string' }),
	decisionBy: int(),
	decision: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	appealDate: date({ mode: 'string' }),
	appealOutcome: mysqlEnum(['upheld','modified','overturned']),
	appealNotes: text(),
	status: mysqlEnum(['reported','under_investigation','pending_decision','decided','appealed','closed']).default('reported').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expiryDate: date({ mode: 'string' }),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const importHistory = mysqlTable("import_history", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int("project_id").notNull(),
	organizationId: int("organization_id").notNull(),
	operatingUnitId: int("operating_unit_id"),
	userId: int("user_id").notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	importType: varchar("import_type", { length: 50 }).notNull(),
	recordsImported: int("records_imported").default(0).notNull(),
	recordsSkipped: int("records_skipped").default(0).notNull(),
	recordsErrors: int("records_errors").default(0).notNull(),
	status: varchar({ length: 20 }).default('completed').notNull(),
	errorDetails: text("error_details"),
	allowedDuplicates: tinyint("allowed_duplicates").default(0).notNull(),
	importedAt: timestamp("imported_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const incidents = mysqlTable("incidents", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	incidentCode: varchar({ length: 50 }),
	title: varchar({ length: 255 }).notNull(),
	titleAr: varchar({ length: 255 }),
	description: text().notNull(),
	descriptionAr: text(),
	category: mysqlEnum(['safety','security','data_breach','operational','hr','financial','environmental','legal','reputational','other']).notNull(),
	severity: mysqlEnum(['minor','moderate','major','critical']).notNull(),
	incidentDate: timestamp({ mode: 'string' }).notNull(),
	reportedDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	location: varchar({ length: 255 }),
	reportedBy: int(),
	affectedParties: text(),
	witnesses: text(),
	investigationStatus: mysqlEnum(['pending','in_progress','completed','closed']).default('pending').notNull(),
	investigationNotes: text(),
	investigatedBy: int(),
	investigationCompletedAt: timestamp({ mode: 'string' }),
	rootCause: text(),
	rootCauseAr: text(),
	correctiveActions: text(),
	preventiveActions: text(),
	relatedRiskId: int(),
	status: mysqlEnum(['open','under_investigation','resolved','closed']).default('open').notNull(),
	resolutionDate: timestamp({ mode: 'string' }),
	resolutionNotes: text(),
	attachments: text(),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
},
(table) => [
	index("idx_incidents_org").on(table.organizationId),
	index("idx_incidents_ou").on(table.operatingUnitId),
	index("idx_incidents_status").on(table.status),
	index("idx_incidents_severity").on(table.severity),
	index("idx_incidents_date").on(table.incidentDate),
]);

export const indicators = mysqlTable("indicators", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	activityId: int(),
	indicatorName: text().notNull(),
	indicatorNameAr: text(),
	description: text(),
	descriptionAr: text(),
	type: mysqlEnum(['OUTPUT','OUTCOME','IMPACT']).default('OUTPUT').notNull(),
	category: varchar({ length: 255 }),
	unit: varchar({ length: 100 }).notNull(),
	baseline: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	target: decimal({ precision: 15, scale: 2 }).notNull(),
	achievedValue: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	targetDate: date({ mode: 'string' }),
	dataSource: text(),
	verificationMethod: text(),
	status: mysqlEnum(['ON_TRACK','AT_RISK','OFF_TRACK','ACHIEVED']).default('ON_TRACK').notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	reportingFrequency: mysqlEnum("reporting_frequency", ['monthly','quarterly','bi_annually','annually','end_of_project']).default('quarterly'),
});

export const invitations = mysqlTable("invitations", {
	id: int().autoincrement().primaryKey().notNull(),
	email: varchar({ length: 320 }).notNull(),
	organizationId: int().notNull(),
	role: mysqlEnum(['org_admin','program_manager','finance_manager','meal_officer','case_worker','viewer']).notNull(),
	token: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(['pending','accepted','expired','cancelled']).default('pending').notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	invitedBy: int().notNull(),
	acceptedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("invitations_token_unique").on(table.token),
]);

export const journalEntries = mysqlTable("journal_entries", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	entryNumber: varchar({ length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	entryDate: date({ mode: 'string' }).notNull(),
	fiscalYearId: int(),
	fiscalPeriodId: int(),
	entryType: mysqlEnum(['standard','adjusting','closing','reversing','opening']).default('standard'),
	sourceModule: mysqlEnum(['manual','expense','advance','settlement','cash_transaction','asset','payroll','procurement','budget']).default('manual'),
	sourceDocumentId: int(),
	sourceDocumentType: varchar({ length: 50 }),
	description: text(),
	descriptionAr: text(),
	totalDebit: decimal({ precision: 15, scale: 2 }).default('0.00'),
	totalCredit: decimal({ precision: 15, scale: 2 }).default('0.00'),
	currencyId: int(),
	exchangeRateId: int(),
	status: mysqlEnum(['draft','posted','reversed','void']).default('draft'),
	postedAt: timestamp({ mode: 'string' }),
	postedBy: int(),
	reversedAt: timestamp({ mode: 'string' }),
	reversedBy: int(),
	reversalEntryId: int(),
	projectId: int(),
	grantId: int(),
	attachments: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("uk_org_entry").on(table.organizationId, table.entryNumber),
	index("idx_org").on(table.organizationId),
	index("idx_ou").on(table.operatingUnitId),
	index("idx_date").on(table.entryDate),
	index("idx_fiscal").on(table.fiscalYearId, table.fiscalPeriodId),
	index("idx_status").on(table.status),
	index("idx_source").on(table.sourceModule, table.sourceDocumentId),
]);

export const journalLines = mysqlTable("journal_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	journalEntryId: int().notNull(),
	lineNumber: int().notNull(),
	glAccountId: int().notNull(),
	description: text(),
	descriptionAr: text(),
	debitAmount: decimal({ precision: 15, scale: 2 }).default('0.00'),
	creditAmount: decimal({ precision: 15, scale: 2 }).default('0.00'),
	currencyId: int(),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	debitAmountBase: decimal({ precision: 15, scale: 2 }).default('0.00'),
	creditAmountBase: decimal({ precision: 15, scale: 2 }).default('0.00'),
	projectId: int(),
	grantId: int(),
	activityId: int(),
	budgetLineId: int(),
	costCenterId: int(),
	reference: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_org").on(table.organizationId),
	index("idx_journal").on(table.journalEntryId),
	index("idx_account").on(table.glAccountId),
	index("idx_project").on(table.projectId),
	index("idx_grant").on(table.grantId),
]);

export const landingSettings = mysqlTable("landing_settings", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	heroTitle: varchar({ length: 500 }),
	heroTitleAr: varchar({ length: 500 }),
	heroSubtitle: text(),
	heroSubtitleAr: text(),
	heroImageUrl: text(),
	showQuickStats: tinyint().default(1).notNull(),
	showAnnouncements: tinyint().default(1).notNull(),
	showRecentActivity: tinyint().default(1).notNull(),
	welcomeMessage: text(),
	welcomeMessageAr: text(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
},
(table) => [
	index("landing_settings_organizationId_unique").on(table.organizationId),
]);

export const mealAccountabilityRecords = mysqlTable("meal_accountability_records", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	projectId: int(),
	recordCode: varchar({ length: 50 }).notNull(),
	recordType: mysqlEnum(['complaint','feedback','suggestion']).default('feedback').notNull(),
	category: varchar({ length: 100 }),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	status: mysqlEnum(['open','in_progress','resolved','closed']).default('open').notNull(),
	subject: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	submittedVia: varchar({ length: 100 }),
	isAnonymous: tinyint().default(0).notNull(),
	isSensitive: tinyint().default(0).notNull(),
	complainantName: varchar({ length: 255 }),
	complainantGender: mysqlEnum(['male','female','other','prefer_not_to_say']),
	complainantAgeGroup: varchar({ length: 50 }),
	complainantContact: varchar({ length: 255 }),
	complainantLocation: varchar({ length: 255 }),
	resolution: text(),
	resolvedAt: timestamp({ mode: 'string' }),
	resolvedBy: int(),
	assignedTo: int(),
	receivedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dueDate: date({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const mealAuditLog = mysqlTable("meal_audit_log", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	moduleName: varchar({ length: 50 }).default('MEAL').notNull(),
	entityType: varchar({ length: 100 }).notNull(),
	entityId: int().notNull(),
	actionType: mysqlEnum(['create','update','delete','approve','export','print']).notNull(),
	actorUserId: int(),
	diff: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const mealDocuments = mysqlTable("meal_documents", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	projectId: int(),
	documentCode: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	titleAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	documentType: mysqlEnum(['report','assessment','evaluation','tool','template','guideline','sop','training_material','other']).default('other').notNull(),
	category: mysqlEnum(['indicators','surveys','reports','accountability','other']).default('other').notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileUrl: text().notNull(),
	fileSize: int(),
	mimeType: varchar({ length: 100 }),
	version: varchar({ length: 20 }).default('1.0').notNull(),
	parentDocumentId: int(),
	sourceModule: varchar({ length: 100 }),
	sourceRecordId: int(),
	isSystemGenerated: tinyint().default(0).notNull(),
	isPublic: tinyint().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const mealDqaActions = mysqlTable("meal_dqa_actions", {
	id: int().autoincrement().primaryKey().notNull(),
	dqaFindingId: int().notNull().references(() => mealDqaFindings.id, { onDelete: "cascade" } ),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	actionText: text().notNull(),
	ownerUserId: int(),
	dueDate: timestamp({ mode: 'string' }),
	status: mysqlEnum(['open','in_progress','closed']).default('open').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const mealDqaFindings = mysqlTable("meal_dqa_findings", {
	id: int().autoincrement().primaryKey().notNull(),
	dqaVisitId: int().notNull().references(() => mealDqaVisits.id, { onDelete: "cascade" } ),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	severity: mysqlEnum(['low','medium','high']).notNull(),
	category: mysqlEnum(['completeness','accuracy','timeliness','integrity','validity']).notNull(),
	findingText: text().notNull(),
	recommendationText: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const mealDqaVisits = mysqlTable("meal_dqa_visits", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	projectId: int().notNull(),
	dqaCode: varchar({ length: 50 }).notNull(),
	visitDate: timestamp({ mode: 'string' }).notNull(),
	verifierUserIds: json(),
	locationIds: json(),
	dataSource: mysqlEnum(['survey','indicator','accountability','mixed']).notNull(),
	samplingMethod: text(),
	recordsCheckedCount: int().default(0),
	accurateCount: int().default(0),
	discrepanciesCount: int().default(0),
	missingFieldsCount: int().default(0),
	duplicatesCount: int().default(0),
	summary: text(),
	status: mysqlEnum(['draft','submitted','approved','closed']).default('draft').notNull(),
	createdBy: int(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedBy: int(),
},
(table) => [
	index("dqaCode").on(table.dqaCode),
]);

export const mealIndicatorDataEntries = mysqlTable("meal_indicator_data_entries", {
	id: int().autoincrement().primaryKey().notNull(),
	indicatorId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	projectId: int(),
	reportingPeriod: varchar({ length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodStartDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodEndDate: date({ mode: 'string' }).notNull(),
	achievedValue: decimal({ precision: 15, scale: 2 }).notNull(),
	disaggregation: json(),
	dataSource: text(),
	evidenceFiles: json(),
	notes: text(),
	isVerified: tinyint().default(0).notNull(),
	verifiedAt: timestamp({ mode: 'string' }),
	verifiedBy: int(),
	verificationNotes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const mealIndicatorTemplates = mysqlTable("meal_indicator_templates", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	name: varchar({ length: 500 }).notNull(),
	code: varchar({ length: 100 }),
	unitOfMeasure: varchar({ length: 100 }),
	calculationMethod: text(),
	frequency: varchar({ length: 50 }),
	disaggregationFields: json(),
	defaultTargets: json(),
	active: tinyint().default(1).notNull(),
	createdBy: int(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedBy: int(),
},
(table) => {
  return {
    idxScopeDeleted: index("idx_meal_indicator_templates_scope_deleted").on(
      table.organizationId,
      table.operatingUnitId,
      table.isDeleted
    ),
  };
});

export const mealLearningActions = mysqlTable("meal_learning_actions", {
	id: int().autoincrement().primaryKey().notNull(),
	learningItemId: int().notNull().references(() => mealLearningItems.id, { onDelete: "cascade" } ),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	actionText: text().notNull(),
	ownerUserId: int(),
	dueDate: timestamp({ mode: 'string' }),
	status: mysqlEnum(['open','in_progress','closed']).default('open').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const mealLearningItems = mysqlTable("meal_learning_items", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	projectId: int().notNull(),
	type: mysqlEnum(['lesson','best_practice','product']).notNull(),
	title: varchar({ length: 500 }).notNull(),
	context: text(),
	rootCause: text(),
	whatWorked: text(),
	whatDidnt: text(),
	recommendations: text(),
	moduleSource: mysqlEnum(['indicator','survey','accountability','cross_cutting']).notNull(),
	visibility: mysqlEnum(['internal','donor']).default('internal').notNull(),
	status: mysqlEnum(['draft','submitted','validated','published','archived']).default('draft').notNull(),
	tags: json(),
	locationIds: json(),
	createdBy: int(),
	updatedBy: int(),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
});

export const mealSurveyQuestions = mysqlTable(
  "meal_survey_questions",
  {
    id: int().autoincrement().primaryKey().notNull(),

    // 🔐 Multi-tenant isolation (MANDATORY)
    organizationId: int().notNull(),
    operatingUnitId: int(),
    projectId: int(),

    // 🔗 Relations
    surveyId: int().notNull(),

    // 🧾 Core question data
    questionCode: varchar({ length: 50 }).notNull(),
    questionText: text().notNull(),
    questionTextAr: text(),

    helpText: text(),
    helpTextAr: text(),

    questionType: mysqlEnum([
      "text","textarea","number","email","phone","date","time","datetime",
      "select","multiselect","radio","checkbox","rating","scale",
      "file","image","signature","location","matrix"
    ]).default("text").notNull(),

    // ⚠️ tinyint → always number (0/1)
    isRequired: tinyint().default(0).notNull(),

    // 📊 Structure
    order: int().default(0).notNull(),

    sectionId: varchar({ length: 50 }),
    sectionTitle: varchar({ length: 255 }),
    sectionTitleAr: varchar({ length: 255 }),

    // 🧠 Advanced config
    options: json(),
    validationRules: json(),
    skipLogic: json(),

    // 🗑 Soft delete
    isDeleted: tinyint().default(0).notNull(),
    deletedAt: timestamp({ mode: "string" }),
    deletedBy: int(),

    // 👤 Audit
    createdBy: int().notNull(),
    updatedBy: int().notNull(),

    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (table) => {
    return {
      // 🔥 PERFORMANCE INDEXES (MATCH YOUR SQL)

      // Scope + soft delete (MOST USED)
      idxScopeDeleted: index("idx_meal_survey_questions_scope_deleted").on(
        table.organizationId,
        table.operatingUnitId,
        table.isDeleted
      ),

      // Survey queries (core operations)
      idxSurveyScope: index("idx_meal_survey_questions_survey_scope").on(
        table.surveyId,
        table.organizationId,
        table.operatingUnitId
      ),

      // Project filtering
      idxProjectScope: index("idx_meal_survey_questions_project").on(
        table.projectId,
        table.organizationId
      ),
    };
  }
);

export const mealSurveyStandards = mysqlTable("meal_survey_standards", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	standardName: varchar({ length: 500 }).notNull(),
	validationRules: json(),
	requiredFields: json(),
	gpsRequired: tinyint().default(0).notNull(),
	photoRequired: tinyint().default(0).notNull(),
	createdBy: int().notNull(),
	updatedBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedBy: int(),
},
(table) => {
  return {
    idxScopeDeleted: index("idx_meal_survey_standards_scope_deleted").on(
      table.organizationId,
      table.operatingUnitId,
      table.isDeleted
    ),
  };
});

export const mealSurveySubmissions = mysqlTable("meal_survey_submissions", {
	id: int().autoincrement().primaryKey().notNull(),
	surveyId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	projectId: int(),
	submissionCode: varchar({ length: 50 }).notNull(),
	respondentName: varchar({ length: 255 }),
	respondentEmail: varchar({ length: 320 }),
	respondentPhone: varchar({ length: 50 }),
	responses: json().notNull(),
	submittedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	submittedBy: int(),
	validationStatus: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	validatedAt: timestamp({ mode: 'string' }),
	validatedBy: int(),
	validationNotes: text(),
	latitude: decimal({ precision: 10, scale: 8 }),
	longitude: decimal({ precision: 11, scale: 8 }),
	locationName: varchar({ length: 255 }),
	deviceInfo: json(),
	createdBy: int(),
	updatedBy: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => {
  return {
    idxScopeDeleted: index("idx_meal_survey_submissions_scope_deleted").on(
      table.organizationId,
      table.operatingUnitId,
      table.isDeleted
    ),
    idxSurveyScope: index("idx_meal_survey_submissions_survey_scope").on(
      table.surveyId,
      table.organizationId,
      table.operatingUnitId
    ),
  };
});

export const mealSurveys = mysqlTable("meal_surveys", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	projectId: int(),
	surveyCode: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	titleAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	surveyType: mysqlEnum(['baseline','endline','monitoring','assessment','feedback','custom']).default('custom').notNull(),
	status: mysqlEnum(['draft','published','closed','archived']).default('draft').notNull(),
	isAnonymous: tinyint().default(0).notNull(),
	allowMultipleSubmissions: tinyint().default(0).notNull(),
	requiresApproval: tinyint().default(0).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date({ mode: 'string' }),
	formConfig: json(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
},
(table) => {
  return {
    idxScopeDeleted: index("idx_meal_surveys_scope_deleted").on(
      table.organizationId,
      table.operatingUnitId,
      table.isDeleted
    ),
    idxScope: index("idx_meal_surveys_scope").on(
      table.organizationId,
      table.operatingUnitId
    ),
  };
});

export const microsoftIntegrations = mysqlTable("microsoft_integrations", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	entraIdEnabled: tinyint().default(0).notNull(),
	entraIdTenantId: varchar({ length: 255 }),
	sharepointEnabled: tinyint().default(0).notNull(),
	sharepointSiteUrl: text(),
	oneDriveEnabled: tinyint().default(0).notNull(),
	outlookEnabled: tinyint().default(0).notNull(),
	teamsEnabled: tinyint().default(0).notNull(),
	powerBiEnabled: tinyint().default(0).notNull(),
	lastSyncedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("microsoft_integrations_organizationId_unique").on(table.organizationId),
]);

export const mitigationActionAttachments = mysqlTable("mitigation_action_attachments", {
	id: int().autoincrement().primaryKey().notNull(),
	actionId: int().notNull().references(() => mitigationActions.id, { onDelete: "cascade" } ),
	fileName: varchar({ length: 255 }).notNull(),
	fileUrl: varchar({ length: 500 }).notNull(),
	fileSize: int(),
	fileType: varchar({ length: 100 }),
	description: text(),
	descriptionAr: text(),
	uploadedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	uploadedBy: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
},
(table) => [
	index("idx_mitigation_attachments_action").on(table.actionId),
]);

export const mitigationActionComments = mysqlTable("mitigation_action_comments", {
	id: int().autoincrement().primaryKey().notNull(),
	actionId: int().notNull().references(() => mitigationActions.id, { onDelete: "cascade" } ),
	comment: text().notNull(),
	commentAr: text(),
	progressUpdate: int(),
	statusChange: mysqlEnum(['pending','in_progress','completed','cancelled','overdue']),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdBy: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
},
(table) => [
	index("idx_mitigation_comments_action").on(table.actionId),
	index("idx_mitigation_comments_created").on(table.createdAt),
]);

export const mitigationActions = mysqlTable("mitigation_actions", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	riskId: int().notNull().references(() => risks.id, { onDelete: "cascade" } ),
	title: varchar({ length: 255 }).notNull(),
	titleAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	assignedTo: int().references(() => users.id, { onDelete: "set null" } ),
	assignedBy: int().references(() => users.id, { onDelete: "set null" } ),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	deadline: date({ mode: 'string' }),
	startedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	status: mysqlEnum(['pending','in_progress','completed','cancelled','overdue']).default('pending').notNull(),
	progress: int().default(0).notNull(),
	priority: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	evidenceRequired: text(),
	evidenceRequiredAr: text(),
	evidenceProvided: text(),
	verifiedBy: int().references(() => users.id, { onDelete: "set null" } ),
	verifiedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
},
(table) => [
	index("idx_mitigation_actions_org").on(table.organizationId),
	index("idx_mitigation_actions_risk").on(table.riskId),
	index("idx_mitigation_actions_assigned").on(table.assignedTo),
	index("idx_mitigation_actions_status").on(table.status),
	index("idx_mitigation_actions_deadline").on(table.deadline),
]);

export const mitigationTemplates = mysqlTable("mitigation_templates", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	templateName: varchar({ length: 255 }).notNull(),
	templateNameAr: varchar({ length: 255 }),
	riskCategory: mysqlEnum(['operational','financial','strategic','compliance','reputational','technological','environmental','security','legal','other']).notNull(),
	riskType: varchar({ length: 100 }),
	severity: mysqlEnum(['low','medium','high','critical']),
	suggestedActions: text().notNull(),
	suggestedActionsAr: text(),
	responsibleRole: varchar({ length: 100 }),
	expectedTimeframe: varchar({ length: 100 }),
	evidenceRequired: text(),
	evidenceRequiredAr: text(),
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
},
(table) => [
	index("idx_mitigation_templates_org").on(table.organizationId),
	index("idx_mitigation_templates_category").on(table.riskCategory),
	index("idx_mitigation_templates_type").on(table.riskType),
]);

export const monthlyReportAuditHistory = mysqlTable("monthly_report_audit_history", {
	id: int().autoincrement().primaryKey().notNull(),
	monthlyReportId: int().notNull().references(() => monthlyReports.id, { onDelete: "set null" } ),
	projectId: int().notNull().references(() => projects.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	action: mysqlEnum(['created','updated','finalized','deleted','restored']).notNull(),
	fieldChanged: varchar({ length: 100 }),
	previousValue: text(),
	newValue: text(),
	changeReason: text(),
	performedBy: int().references(() => users.id, { onDelete: "set null" } ),
	performedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
});

export const monthlyReports = mysqlTable("monthly_reports", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	reportCode: varchar({ length: 50 }).notNull(),
	reportType: mysqlEnum(['monthly','period','quarterly','annual']).default('monthly').notNull(),
	reportMonth: int().notNull(),
	reportYear: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodStartDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodEndDate: date({ mode: 'string' }).notNull(),
	status: mysqlEnum(['editable','finalized']).default('editable').notNull(),
	generatedDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	editWindowEndDate: timestamp({ mode: 'string' }).notNull(),
	finalizedDate: timestamp({ mode: 'string' }),
	implementationProgress: text(),
	implementationProgressAr: text(),
	projectSummary: text(),
	projectSummaryAr: text(),
	keyAchievements: text(),
	keyAchievementsAr: text(),
	nextPlan: text(),
	nextPlanAr: text(),
	challengesMitigation: text(),
	challengesMitigationAr: text(),
	lessonsLearned: text(),
	lessonsLearnedAr: text(),
	activitiesSnapshot: json(),
	indicatorsSnapshot: json(),
	financialSnapshot: json(),
	casesSnapshot: json(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
},
(table) => [
	index("unique_project_month_year").on(table.projectId, table.reportMonth, table.reportYear),
]);

export const notificationEventSettings = mysqlTable("notification_event_settings", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	eventKey: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	description: varchar({ length: 500 }),
	emailEnabled: tinyint().default(1).notNull(),
	inAppEnabled: tinyint().default(1).notNull(),
	recipientsMode: mysqlEnum(['role','explicit_emails','workflow_assignees','mixed']).default('role').notNull(),
	roleIds: text(),
	explicitEmails: text(),
	templateId: int(),
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_notification_event_org").on(table.organizationId),
	index("idx_notification_event_key").on(table.eventKey),
]);

export const notificationOutbox = mysqlTable("notification_outbox", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	eventKey: varchar({ length: 100 }).notNull(),
	channel: mysqlEnum(['email','inapp']).notNull(),
	payloadJson: text(),
	recipients: text(),
	subject: varchar({ length: 500 }),
	status: mysqlEnum(['queued','sending','sent','failed','dead_letter']).default('queued').notNull(),
	attemptCount: int().default(0).notNull(),
	lastError: text(),
	nextRetryAt: timestamp({ mode: 'string' }),
	sentAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_outbox_org").on(table.organizationId),
	index("idx_outbox_status").on(table.status),
	index("idx_outbox_event").on(table.eventKey),
]);

export const notificationPreferences = mysqlTable("notification_preferences", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	category: varchar({ length: 50 }).notNull(),
	eventKey: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	emailEnabled: tinyint().default(1).notNull(),
	inAppEnabled: tinyint().default(1).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const operatingUnits = mysqlTable("operating_units", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	name: varchar({ length: 255 }).notNull(),
	type: mysqlEnum(['hq','country','regional','field']).notNull(),
	country: varchar({ length: 100 }),
	city: varchar({ length: 100 }),
	currency: varchar({ length: 10 }).default('USD'),
	timezone: varchar({ length: 100 }).default('UTC'),
	status: mysqlEnum(['active','inactive']).default('active').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	code: varchar({ length: 50 }),
	officeAdminName: varchar({ length: 255 }),
	officeAdminEmail: varchar({ length: 320 }),
	isDeleted: tinyint().default(0),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const opportunities = mysqlTable("opportunities", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	donorName: varchar({ length: 255 }).notNull(),
	donorType: mysqlEnum(['UN','EU','INGO','Foundation','Government','Other']).notNull(),
	cfpLink: text(),
	interestArea: json().notNull(),
	geographicAreas: varchar({ length: 500 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	applicationDeadline: date({ mode: 'string' }).notNull(),
	allocatedBudget: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	isCoFunding: tinyint().default(0).notNull(),
	applicationLink: text(),
	fundingId: varchar({ length: 36 }),
	projectManagerName: varchar({ length: 255 }),
	projectManagerEmail: varchar({ length: 255 }),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const optionSetValues = mysqlTable("option_set_values", {
	id: int().autoincrement().primaryKey().notNull(),
	optionSetId: int().notNull().references(() => optionSets.id, { onDelete: "cascade" } ),
	label: varchar({ length: 255 }).notNull(),
	labelAr: varchar({ length: 255 }),
	value: varchar({ length: 255 }).notNull(),
	isActive: tinyint().default(1).notNull(),
	sortOrder: int().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const optionSets = mysqlTable("option_sets", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	systemKey: varchar({ length: 100 }),
	isSystem: tinyint().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const organizationBranding = mysqlTable("organization_branding", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	logoUrl: text(),
	faviconUrl: text(),
	primaryColor: varchar({ length: 20 }),
	secondaryColor: varchar({ length: 20 }),
	headerText: varchar({ length: 255 }),
	footerText: text(),
	customCss: text(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	systemName: varchar({ length: 255 }),
	systemNameAr: varchar({ length: 255 }),
	accentColor: varchar({ length: 50 }),
	footerTextAr: text(),
	updatedBy: int(),
	organizationName: varchar({ length: 255 }),
	organizationNameAr: varchar({ length: 255 }),
},
(table) => [
	index("organizationId").on(table.organizationId),
]);

export const organizations = mysqlTable("organizations", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	domain: varchar({ length: 255 }),
	status: mysqlEnum(['active','suspended','inactive']).default('active').notNull(),
	country: varchar({ length: 100 }),
	timezone: varchar({ length: 100 }).default('UTC'),
	currency: varchar({ length: 10 }).default('USD'),
	notificationEmail: varchar({ length: 255 }),
	defaultLanguage: varchar({ length: 10 }).default('en').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
		nameAr: varchar({ length: 255 }),
		shortCode: varchar({ length: 20 }),
	tenantId: varchar({ length: 100 }),
	primaryAdminId: int(),
	secondaryAdminId: int(),
	isDeleted: tinyint().default(0),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	// Microsoft 365 Onboarding Fields (One-link tenant onboarding)
	microsoft365Enabled: tinyint().default(0).notNull(),
	onboardingStatus: mysqlEnum(['not_connected', 'pending_consent', 'connected', 'error']).default('not_connected').notNull(),
	consentGrantedAt: timestamp({ mode: 'string' }),
	connectedBy: int(),
	allowedDomains: text(),
	tenantVerified: tinyint().default(0).notNull(),
	// One-link onboarding token fields
	onboardingToken: varchar({ length: 255 }),
	onboardingTokenExpiry: timestamp({ mode: 'string' }),
	onboardingLinkSentAt: timestamp({ mode: 'string' }),
	onboardingLinkSentTo: varchar({ length: 255 }),
	// Email verification fields for organization domain validation
	approvedEmailDomain: varchar({ length: 255 }),
	});

export const payableApprovalHistory = mysqlTable("payable_approval_history", {
	id: int().autoincrement().primaryKey().notNull(),
	payableId: int().notNull().references(() => procurementPayables.id, { onDelete: "set null" } ),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	action: mysqlEnum(['approved','rejected','cancelled']).notNull(),
	actionBy: int().notNull().references(() => users.id, { onDelete: "set null" } ),
	actionByName: varchar({ length: 255 }),
	actionByEmail: varchar({ length: 320 }),
	reason: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const paymentLines = mysqlTable("payment_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	paymentId: int().notNull(),
	lineNumber: int().notNull(),
	sourceType: mysqlEnum(['expense','invoice','advance','settlement','other']).notNull(),
	sourceId: int(),
	description: text(),
	descriptionAr: text(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	currencyId: int(),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	projectId: int(),
	grantId: int(),
	activityId: int(),
	budgetLineId: int(),
	glAccountId: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	operatingUnitId: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("idx_org").on(table.organizationId),
	index("idx_payment").on(table.paymentId),
	index("idx_source").on(table.sourceType, table.sourceId),
	index("idx_project").on(table.projectId),
]);

export const payments = mysqlTable("payments", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	paymentNumber: varchar({ length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	paymentDate: date({ mode: 'string' }).notNull(),
	paymentType: mysqlEnum(['vendor','staff','advance','settlement','refund','other']).notNull(),
	paymentMethod: mysqlEnum(['cash','bank_transfer','cheque','mobile_money','wire']).notNull(),
	payeeType: mysqlEnum(['vendor','employee','other']).notNull(),
	payeeId: int(),
	payeeName: varchar({ length: 255 }).notNull(),
	payeeNameAr: varchar({ length: 255 }),
	bankAccountId: int(),
	chequeNumber: varchar({ length: 50 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	chequeDate: date({ mode: 'string' }),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	currencyId: int(),
	exchangeRateId: int(),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	description: text(),
	descriptionAr: text(),
	projectId: int(),
	grantId: int(),
	status: mysqlEnum(['draft','pending_approval','approved','paid','cancelled','void']).default('draft'),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	paidBy: int(),
	paidAt: timestamp({ mode: 'string' }),
	glAccountId: int(),
	journalEntryId: int(),
	postingStatus: mysqlEnum(['unposted','posted','reversed']).default('unposted'),
	referenceNumber: varchar({ length: 100 }),
	attachments: text(),
	voucherUrl: varchar({ length: 500 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	version: int().default(1).notNull(),
	parentId: int(),
	revisionReason: text(),
	isLatestVersion: tinyint().default(1).notNull(),
},
(table) => [
		index("uk_org_number").on(table.organizationId, table.paymentNumber),
		index("idx_org").on(table.organizationId),
	index("idx_ou").on(table.operatingUnitId),
	index("idx_date").on(table.paymentDate),
	index("idx_payee").on(table.payeeType, table.payeeId),
	index("idx_status").on(table.status),
	index("idx_project").on(table.projectId),
	index("idx_grant").on(table.grantId),
]);

export const permissionReviews = mysqlTable("permission_reviews", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	moduleId: varchar({ length: 100 }).notNull(),
	screenId: varchar({ length: 100 }),
	reviewedBy: int().notNull().references(() => users.id, { onDelete: "set null" } ),
	reviewedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	outcome: mysqlEnum(['approved','revoked']).default('approved').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("pr_user_org_idx").on(table.userId, table.organizationId),
	index("pr_reviewed_at_idx").on(table.reviewedAt),
]);

export const pipelineOpportunities = mysqlTable("pipeline_opportunities", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	title: text().notNull(),
	donorName: varchar({ length: 255 }).notNull(),
	donorType: mysqlEnum(['UN','EU','INGO','Foundation','Government','Other']).notNull(),
	fundingWindow: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	deadline: date({ mode: 'string' }).notNull(),
	indicativeBudgetMin: decimal({ precision: 15, scale: 2 }).notNull(),
	indicativeBudgetMax: decimal({ precision: 15, scale: 2 }).notNull(),
	sectors: json().notNull(),
	country: varchar({ length: 100 }).notNull(),
	governorate: varchar({ length: 255 }),
	type: mysqlEnum(['opportunity','pipeline','proposal']).default('pipeline').notNull(),
	stage: mysqlEnum(['Identified','Under Review','Go Decision','No-Go','Concept Requested','Proposal Requested','Proposal Development','Approved','Rejected']).default('Identified').notNull(),
	probability: int().default(50).notNull(),
	statusHistory: json(),
	fundingId: varchar({ length: 36 }),
	focalPoint: varchar({ length: 255 }),
	projectManagerName: varchar({ length: 255 }),
	projectManagerEmail: varchar({ length: 255 }),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const prBudgetReservations = mysqlTable("pr_budget_reservations", {
	id: int().autoincrement().primaryKey().notNull(),
	purchaseRequestId: int().notNull(),
	budgetLineId: int().notNull(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	deliveryNoteNumber: varchar({ length: 50 }),
	reservationNumber: varchar({ length: 50 }),
	reservationDate: timestamp({ mode: 'string' }).defaultNow(),
	reservedAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('USD'),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	baseCurrencyAmount: decimal({ precision: 15, scale: 2 }),
	status: mysqlEnum(['active','converted_to_encumbrance','released','expired']).default('active'),
	convertedToEncumbranceAt: timestamp({ mode: 'string' }),
	releasedAt: timestamp({ mode: 'string' }),
	expiryDate: timestamp({ mode: 'string' }),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_pr_reservation").on(table.purchaseRequestId),
	index("idx_budget_line").on(table.budgetLineId),
	index("idx_status").on(table.status),
	index("reservationNumber").on(table.reservationNumber),
]);

export const procurementAuditTrail = mysqlTable("procurement_audit_trail", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	documentType: mysqlEnum(['PR','RFQ','QA','BA','PO','GRN','ISSUE','TRANSFER','PAYMENT']).notNull(),
	documentId: int().notNull(),
	documentNumber: varchar({ length: 50 }),
	actionType: varchar({ length: 100 }).notNull(),
	fieldChanges: json(),
	userId: int().references(() => users.id, { onDelete: "set null" } ),
	userName: varchar({ length: 255 }),
	userRole: varchar({ length: 100 }),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_procurement_audit_org").on(table.organizationId),
	index("idx_procurement_audit_document").on(table.documentType, table.documentId),
	index("idx_procurement_audit_timestamp").on(table.timestamp),
]);

export const procurementInvoices = mysqlTable("procurement_invoices", {
	id: int().autoincrement().primaryKey().notNull(),
	purchaseRequestId: int().notNull(),
	purchaseOrderId: int(),
	contractId: int(),
	sacId: int(),
	grnId: int(),
	vendorId: int().notNull(),
	payableId: int(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	invoiceNumber: varchar({ length: 100 }).notNull(),
	vendorInvoiceNumber: varchar({ length: 100 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	invoiceDate: date({ mode: 'string' }).notNull(),
	invoiceAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('USD'),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	baseCurrencyAmount: decimal({ precision: 15, scale: 2 }),
	matchingStatus: mysqlEnum(['pending','matched','variance_detected','rejected']).default('pending'),
	prAmount: decimal({ precision: 15, scale: 2 }),
	poAmount: decimal({ precision: 15, scale: 2 }),
	grnAmount: decimal({ precision: 15, scale: 2 }),
	varianceAmount: decimal({ precision: 15, scale: 2 }),
	varianceReason: text(),
	approvalStatus: mysqlEnum(['pending','approved','rejected']).default('pending'),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	paymentStatus: mysqlEnum(['unpaid','payment_scheduled','paid']).default('unpaid'),
	paymentId: int(),
	paidAt: timestamp({ mode: 'string' }),
	invoiceDocumentUrl: varchar({ length: 500 }),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("idx_pr_invoice").on(table.purchaseRequestId),
	index("idx_po_invoice").on(table.purchaseOrderId),
	index("idx_vendor").on(table.vendorId),
	index("idx_matching_status").on(table.matchingStatus),
	index("idx_approval_status").on(table.approvalStatus),
]);

export const procurementNumberSequences = mysqlTable("procurement_number_sequences", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	documentType: mysqlEnum(['PR','RFQ','PO','GRN','BA','QA','CON']).notNull(),
	year: int().notNull(),
	currentSequence: int().default(0).notNull(),
	lastGeneratedNumber: varchar({ length: 50 }),
	lastGeneratedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("unique_sequence").on(table.organizationId, table.operatingUnitId, table.documentType, table.year),
]);

export const procurementPayables = mysqlTable("procurement_payables", {
	id: int().autoincrement().primaryKey().notNull(),
	purchaseRequestId: int().notNull(),
	purchaseOrderId: int(),
	contractId: int(),
	sacId: int(),
	vendorId: int().notNull(),
	encumbranceId: int(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	payableNumber: varchar({ length: 50 }),
	payableDate: timestamp({ mode: 'string' }).defaultNow(),
	totalAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('USD'),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	baseCurrencyAmount: decimal({ precision: 15, scale: 2 }),
	paymentTerms: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dueDate: date({ mode: 'string' }),
	status: mysqlEnum(['draft','pending_grn','pending_invoice','pending_approval','pending_payment','partially_paid','fully_paid','cancelled']).default('pending_invoice'),
	paidAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	remainingAmount: decimal({ precision: 15, scale: 2 }),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	grnId: int(),
	matchingStatus: mysqlEnum('matching_status', ['pending','matched','variance_detected']).default('pending'),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("idx_pr_payable").on(table.purchaseRequestId),
	index("idx_po_payable").on(table.purchaseOrderId),
	index("idx_vendor").on(table.vendorId),
	index("idx_status").on(table.status),
	index("payableNumber").on(table.payableNumber),
	index("idx_contract_payable").on(table.contractId),
	index("idx_sac_payable").on(table.sacId),
	index("idx_matching_status_payable").on(table.matchingStatus),
]);

export const procurementPayments = mysqlTable("procurement_payments", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	purchaseOrderId: int(),
	supplierId: int(),
	paymentNumber: varchar({ length: 50 }).notNull(),
	paymentDate: timestamp({ mode: 'string' }).notNull(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('USD'),
	paymentMethod: mysqlEnum(['bank_transfer','check','cash','letter_of_credit']).default('bank_transfer'),
	referenceNumber: varchar({ length: 100 }),
	invoiceNumber: varchar({ length: 100 }),
	description: text(),
	status: mysqlEnum(['pending','processed','completed','cancelled']).default('pending').notNull(),
	processedBy: int(),
	processedAt: timestamp({ mode: 'string' }),
	remarks: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const procurementPlan = mysqlTable("procurement_plan", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	activityId: int(),
	itemName: text().notNull(),
	itemNameAr: text(),
	description: text(),
	descriptionAr: text(),
	category: mysqlEnum(['GOODS','SERVICES','WORKS']).default('GOODS').notNull(),
	subcategory: varchar({ length: 255 }),
	quantity: decimal({ precision: 15, scale: 2 }).notNull(),
	unit: varchar({ length: 100 }).notNull(),
	estimatedCost: decimal({ precision: 15, scale: 2 }).notNull(),
	actualCost: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	currency: mysqlEnum(['USD','EUR','GBP','CHF']).default('USD').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	plannedProcurementDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	actualProcurementDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	deliveryDate: date({ mode: 'string' }),
	recurrence: mysqlEnum(['ONE_TIME','RECURRING']).default('ONE_TIME').notNull(),
	procurementMethod: mysqlEnum(['ONE_QUOTATION','THREE_QUOTATION','NEGOTIABLE_QUOTATION','TENDER','DIRECT_PURCHASE','OTHER']).default('ONE_QUOTATION').notNull(),
	status: mysqlEnum(['PLANNED','REQUESTED','APPROVED','IN_PROCUREMENT','ORDERED','DELIVERED','CANCELLED']).default('PLANNED').notNull(),
	supplierName: varchar({ length: 255 }),
	supplierContact: varchar({ length: 255 }),
	budgetLine: varchar({ length: 255 }),
	notes: text(),
	notesAr: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const projectPlanActivities = mysqlTable("project_plan_activities", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	resultId: int(),
	activityTabId: int(),
	department: mysqlEnum(['Program','MEAL','Logistics','Finance','HR','Security','Other']).default('Program').notNull(),
	code: varchar({ length: 50 }).notNull(),
	title: text().notNull(),
	titleAr: text(),
	description: text(),
	responsible: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date({ mode: 'string' }),
	status: mysqlEnum(['Not Started','Ongoing','Completed']).default('Not Started').notNull(),
	isSynced: tinyint().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const projectPlanObjectives = mysqlTable("project_plan_objectives", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	code: varchar({ length: 50 }).notNull(),
	title: text().notNull(),
	titleAr: text(),
	description: text(),
	status: mysqlEnum(['Not Started','Ongoing','Completed']).default('Not Started').notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const projectPlanResults = mysqlTable("project_plan_results", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	objectiveId: int().notNull(),
	code: varchar({ length: 50 }).notNull(),
	title: text().notNull(),
	titleAr: text(),
	description: text(),
	status: mysqlEnum(['Not Started','Ongoing','Completed']).default('Not Started').notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const projectPlanTasks = mysqlTable("project_plan_tasks", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	planActivityId: int().notNull(),
	taskTabId: int(),
	code: varchar({ length: 50 }).notNull(),
	title: text().notNull(),
	titleAr: text(),
	responsible: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date({ mode: 'string' }),
	status: mysqlEnum(['Not Started','Ongoing','Completed']).default('Not Started').notNull(),
	isSynced: tinyint().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const projectReportingSchedules = mysqlTable("project_reporting_schedules", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	reportType: mysqlEnum(['monthly','quarterly','semi_annual','annual','final','ad_hoc']).notNull(),
	reportTitle: varchar({ length: 500 }),
	reportTitleAr: varchar({ length: 500 }),
	description: text(),
	descriptionAr: text(),
	frequency: mysqlEnum(['once','monthly','quarterly','semi_annual','annual']).notNull(),
	dueDate: timestamp({ mode: 'string' }).notNull(),
	reminderDays: int().default(7),
	status: mysqlEnum(['pending','in_progress','submitted','approved','rejected','overdue']).default('pending').notNull(),
	submittedDate: timestamp({ mode: 'string' }),
	approvedDate: timestamp({ mode: 'string' }),
	submittedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	notes: text(),
	notesAr: text(),
	attachments: json(),
	isDeleted: tinyint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const projects = mysqlTable("projects", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	grantId: int(),
	projectCode: varchar({ length: 100 }),
	title: text(),
	titleEn: varchar({ length: 500 }),
	titleAr: varchar({ length: 500 }),
	description: text(),
	descriptionAr: text(),
	objectives: text(),
	objectivesAr: text(),
	status: mysqlEnum(['planning','active','on_hold','completed','cancelled']).default('planning').notNull(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	totalBudget: decimal({ precision: 15, scale: 2 }),
	spent: decimal({ precision: 15, scale: 2 }),
	currency: mysqlEnum(['USD','EUR','GBP','CHF']),
	physicalProgressPercentage: decimal({ precision: 5, scale: 2 }),
	sectors: json(),
	donor: varchar({ length: 255 }),
	implementingPartner: varchar({ length: 255 }),
	location: varchar({ length: 255 }),
	locationAr: varchar({ length: 255 }),
	beneficiaryCount: int(),
	projectManager: int(),
	managerId: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().notNull(),
	updatedBy: int(),
});

export const proposals = mysqlTable("proposals", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	pipelineOpportunityId: int(),
	proposalTitle: text().notNull(),
	donorName: varchar({ length: 255 }).notNull(),
	callReference: varchar({ length: 255 }),
	proposalType: mysqlEnum(['Concept Note','Full Proposal','Expression of Interest']).notNull(),
	country: varchar({ length: 100 }).notNull(),
	governorate: varchar({ length: 255 }),
	sectors: json().notNull(),
	projectDuration: int().notNull(),
	totalRequestedBudget: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: mysqlEnum(['USD','EUR','GBP','CHF']).default('USD').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	submissionDeadline: date({ mode: 'string' }).notNull(),
	proposalStatus: mysqlEnum(['Draft','Under Internal Review','Submitted','Approved','Rejected','Withdrawn']).default('Draft').notNull(),
	completionPercentage: int().default(0).notNull(),
	executiveSummary: text(),
	problemStatement: text(),
	objectives: json(),
	activities: json(),
	budget: json(),
	logframe: json(),
	fundingId: varchar({ length: 36 }),
	leadWriter: varchar({ length: 255 }),
	reviewers: json(),
	projectManagerName: varchar({ length: 255 }),
	projectManagerEmail: varchar({ length: 255 }),
	grantId: int(),
	projectId: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const pssSessions = mysqlTable("pss_sessions", {
	id: int().autoincrement().primaryKey().notNull(),
	caseId: int().notNull(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	sessionDate: date({ mode: 'string' }).notNull(),
	sessionType: varchar({ length: 20 }).notNull(),
	pssApproach: varchar({ length: 50 }),
	facilitatorId: int(),
	facilitatorName: varchar({ length: 255 }),
	duration: int(),
	keyObservations: text(),
	beneficiaryResponse: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	nextSessionDate: date({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const purchaseOrderLineItems = mysqlTable("purchase_order_line_items", {
	id: int().autoincrement().primaryKey().notNull(),
	purchaseOrderId: int().notNull(),
	lineNumber: int().notNull(),
	description: text().notNull(),
	descriptionAr: text(),
	specifications: text(),
	quantity: decimal({ precision: 10, scale: 2 }).notNull(),
	unit: varchar({ length: 50 }).default('Piece'),
	unitPrice: decimal({ precision: 15, scale: 2 }).default('0'),
	totalPrice: decimal({ precision: 15, scale: 2 }).default('0'),
	deliveredQty: decimal({ precision: 10, scale: 2 }).default('0'),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	qaLineItemId: int().references(() => quotationAnalysisLineItems.id, { onDelete: "set null" } ),
	organizationId: int().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
},
(table) => [
	index("idx_po_line_org_ou").on(table.organizationId, table.operatingUnitId),
	index("idx_po_line_org_ou_deleted").on(table.organizationId, table.operatingUnitId, table.deletedAt),
]);

export const purchaseOrders = mysqlTable("purchase_orders", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	purchaseRequestId: int(),
	quotationAnalysisId: int(),
	bidAnalysisId: int(),
	supplierId: int(),
	poNumber: varchar({ length: 50 }).notNull(),
	poDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	deliveryDate: timestamp({ mode: 'string' }),
	deliveryLocation: text(),
	deliveryLocationAr: text(),
	paymentTerms: varchar({ length: 255 }),
	currency: varchar({ length: 10 }).default('USD'),
	subtotal: decimal({ precision: 15, scale: 2 }).default('0'),
	taxAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	totalAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	termsAndConditions: text(),
	notes: text(),
	status: mysqlEnum(['draft','sent','acknowledged','partially_delivered','delivered','completed','cancelled']).default('draft').notNull(),
	sentAt: timestamp({ mode: 'string' }),
	acknowledgedAt: timestamp({ mode: 'string' }),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const purchaseRequestLineItems = mysqlTable("purchase_request_line_items", {
	id: int().autoincrement().primaryKey().notNull(),
	purchaseRequestId: int().notNull().references(() => purchaseRequests.id, { onDelete: "cascade" }),
	lineNumber: int().notNull(),
	budgetLine: varchar({ length: 50 }),
	description: text().notNull(),
	descriptionAr: text(),
	specifications: text(),
	specificationsAr: text(),
	quantity: decimal({ precision: 10, scale: 2 }).notNull(),
	unit: varchar({ length: 50 }).default('Piece'),
	unitPrice: decimal({ precision: 15, scale: 2 }).default('0'),
	totalPrice: decimal({ precision: 15, scale: 2 }).default('0'),
	recurrence: int().default(1),  // ✅ FIXED: int with numeric default
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),  // ✅ ADDED: soft delete support
});

export const purchaseRequests = mysqlTable("purchase_requests", {
	id: int().autoincrement().primaryKey().notNull(),
	prNumber: varchar({ length: 50 }).notNull(),
	category: mysqlEnum(['goods','services','works']).default('goods').notNull(),
	projectId: int(),
	projectTitle: varchar({ length: 255 }).notNull(),
	donorId: int(),
	donorName: varchar({ length: 255 }),
	budgetId: int(),
	budgetLineId: int(),
	budgetCode: varchar({ length: 50 }),
	budgetTitle: varchar({ length: 500 }),
	subBudgetLine: varchar({ length: 255 }),
	activityName: varchar({ length: 255 }),
	totalBudgetLine: decimal({ precision: 15, scale: 2 }).default('0'),
	currency: varchar({ length: 10 }).default('USD'),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	exchangeTo: varchar({ length: 10 }).default('USD'),
	total: decimal({ precision: 15, scale: 2 }).default('0'),
	prTotalUsd: decimal({ precision: 15, scale: 2 }).default('0'),
	department: varchar({ length: 255 }),
	requesterName: varchar({ length: 255 }).notNull(),
	requesterEmail: varchar({ length: 320 }),
	requesterId: int(),
	prDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	urgency: mysqlEnum(['low','normal','high','critical']).default('normal').notNull(),
	neededBy: timestamp({ mode: 'string' }),
	justification: text(),
	procurementLadder: mysqlEnum(['one_quotation','three_quotations','public_tender','tender']).default('three_quotations'),
	status: mysqlEnum(['draft','submitted','validated_by_logistic','rejected_by_logistic','validated_by_finance','rejected_by_finance','approved','rejected_by_pm']).default('draft'),
	procurementStatus: mysqlEnum(['rfqs','quotations_analysis','tender_invitation','bids_analysis','purchase_order','delivery','grn','payment','completed']),
	logValidatedBy: int(),
	logValidatedOn: timestamp({ mode: 'string' }),
	logValidatorEmail: varchar({ length: 255 }),
	finValidatedBy: int(),
	finValidatedOn: timestamp({ mode: 'string' }),
	finValidatorEmail: varchar({ length: 255 }),
	approvedBy: int(),
	approvedOn: timestamp({ mode: 'string' }),
	approverEmail: varchar({ length: 255 }),
	rejectReason: text(),
	rejectionStage: varchar({ length: 50 }),
	pmRejectedBy: int(),
	pmRejectedOn: timestamp({ mode: 'string' }),
	logRejectedBy: int(),
	logRejectedOn: timestamp({ mode: 'string' }),
	finRejectedBy: int(),
	finRejectedOn: timestamp({ mode: 'string' }),
	operatingUnitId: int().notNull(),
	organizationId: int().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	submittedAt: timestamp({ mode: 'string' }),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	serviceType: varchar({ length: 50 }),
	serviceTypeOther: varchar({ length: 255 }),
	categoryLegacy: varchar({ length: 50 }),
	logisticsSignerName: varchar({ length: 255 }),
	logisticsSignerTitle: varchar({ length: 255 }),
	logisticsSignatureDataUrl: longtextString(),
	financeSignerName: varchar({ length: 255 }),
	financeSignerTitle: varchar({ length: 255 }),
	financeSignatureDataUrl: longtextString(),
	pmSignerName: varchar({ length: 255 }),
	pmSignerTitle: varchar({ length: 255 }),
	pmSignatureDataUrl: longtextString(),
});

export const purgeNotifications = mysqlTable("purge_notifications", {
	id: int().autoincrement().primaryKey().notNull(),
	recordId: int().notNull(),
	recordType: varchar({ length: 100 }).notNull(),
	scope: mysqlEnum(['platform','organization']).notNull(),
	organizationId: int(),
	operatingUnitId: int(),
	scheduledPurgeDate: bigint({ mode: "number" }).notNull(),
	notificationSentAt: bigint({ mode: "number" }),
	notificationStatus: mysqlEnum(['pending','sent','failed']).default('pending'),
	createdAt: bigint({ mode: "number" }).notNull(),
},
(table) => [
	index("idx_scheduled_purge").on(table.scheduledPurgeDate),
	index("idx_notification_status").on(table.notificationStatus),
	index("idx_scope_org").on(table.scope, table.organizationId, table.operatingUnitId),
]);

export const quotationAnalyses = mysqlTable("quotation_analyses", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	purchaseRequestId: int(),
	qaNumber: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	titleAr: varchar({ length: 255 }),
	rfqDate: timestamp({ mode: 'string' }),
	closingDate: timestamp({ mode: 'string' }),
	selectedSupplierId: int(),
	selectionJustification: text(),
	evaluationReport: text(),
	status: mysqlEnum(['draft','rfq_sent','quotes_received','evaluated','approved','cancelled']).default('draft').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const quotationAnalysisAuditLog = mysqlTable("quotation_analysis_audit_log", {
	id: int().autoincrement().primaryKey().notNull(),
	quotationAnalysisId: int().notNull().references(() => quotationAnalyses.id, { onDelete: "set null" } ),
	supplierId: int(),
	lineItemId: int(),
	changeType: mysqlEnum(['price_adjustment','line_item_edit','total_offer_edit','supplier_edit']).notNull(),
	fieldName: varchar({ length: 100 }).notNull(),
	oldValue: text(),
	newValue: text(),
	reason: text(),
	changedBy: int().references(() => users.id, { onDelete: "set null" } ),
	changedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_qa_id").on(table.quotationAnalysisId),
	index("idx_supplier_id").on(table.supplierId),
	index("idx_changed_at").on(table.changedAt),
]);

export const quotationAnalysisLineItems = mysqlTable("quotation_analysis_line_items", {
	id: int().autoincrement().primaryKey().notNull(),
	quotationAnalysisId: int().notNull().references(() => quotationAnalyses.id, { onDelete: "set null" } ),
	supplierId: int().notNull().references(() => quotationAnalysisSuppliers.id, { onDelete: "set null" } ),
	lineItemId: int().notNull().references(() => purchaseRequestLineItems.id, { onDelete: "set null" } ),
	unitPrice: decimal({ precision: 15, scale: 2 }).default('0'),
	totalPrice: decimal({ precision: 15, scale: 2 }).default('0'),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("unique_qa_supplier_line").on(table.quotationAnalysisId, table.supplierId, table.lineItemId),
]);

export const quotationAnalysisSuppliers = mysqlTable("quotation_analysis_suppliers", {
	id: int().autoincrement().primaryKey().notNull(),
	quotationAnalysisId: int().notNull(),
	supplierId: int(),
	supplierName: varchar({ length: 255 }),
	quoteReference: varchar({ length: 100 }),
	quoteDate: timestamp({ mode: 'string' }),
	totalAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	currency: varchar({ length: 10 }).default('USD'),
	deliveryDays: int(),
	paymentTerms: varchar({ length: 255 }),
	warrantyMonths: int(),
	technicalScore: decimal({ precision: 5, scale: 2 }),
	financialScore: decimal({ precision: 5, scale: 2 }),
	totalScore: decimal({ precision: 5, scale: 2 }),
	isSelected: tinyint().default(0),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	priceScore: decimal({ precision: 5, scale: 2 }).default('0'),
	deliveryScore: decimal({ precision: 5, scale: 2 }).default('0'),
	warrantyScore: decimal({ precision: 5, scale: 2 }).default('0'),
	technicalExperienceYears: int(),
	technicalCriterionScore: decimal({ precision: 5, scale: 2 }).default('0'),
	weightedTotalScore: decimal({ precision: 5, scale: 2 }).default('0'),
});

export const rbacRoles = mysqlTable("rbac_roles", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	permissions: text().notNull(),
	isSystem: tinyint().default(0).notNull(),
	isLocked: tinyint().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
});

export const rbacUserPermissions = mysqlTable("rbac_user_permissions", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	roleId: int().references(() => rbacRoles.id, { onDelete: "set null" } ),
	permissions: text().notNull(),
	screenPermissions: text(),
	tabPermissions: text(),
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
},
(table) => [
	index("rbac_user_permissions_userId_organizationId_unique").on(table.userId, table.organizationId),
]);

export const reportingSchedules = mysqlTable("reporting_schedules", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull(),
	grantId: int(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	reportType: mysqlEnum(['NARRATIVE','FINANCIAL','PROGRESS','FINAL','INTERIM','QUARTERLY','ANNUAL','OTHER']).notNull(),
	reportTypeOther: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodFrom: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodTo: date({ mode: 'string' }).notNull(),
	reportStatus: mysqlEnum(['NOT_STARTED','PLANNED','UNDER_PREPARATION','UNDER_REVIEW','SUBMITTED_TO_HQ','SUBMITTED_TO_DONOR']).default('PLANNED').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	reportDeadline: date({ mode: 'string' }).notNull(),
	notes: text(),
	isLocked: tinyint().default(0).notNull(),
	lockedAt: timestamp({ mode: 'string' }),
	lockedBy: int(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const retentionPolicies = mysqlTable("retention_policies", {
	id: int().autoincrement().primaryKey().notNull(),
	entityType: varchar({ length: 100 }).notNull(),
	retentionDays: int(),
	description: text(),
	updatedAt: bigint({ mode: "number" }).notNull(),
	updatedBy: int(),
},
(table) => [
	index("retention_policies_entityType_unique").on(table.entityType),
	index("idx_entity_type").on(table.entityType),
]);

export const returnedItemLineItems = mysqlTable("returned_item_line_items", {
	id: int().autoincrement().primaryKey().notNull(),
	returnedItemId: int().notNull(),
	stockItemId: int(),
	lineNumber: int().notNull(),
	description: text().notNull(),
	returnedQty: decimal({ precision: 10, scale: 2 }).notNull(),
	acceptedQty: decimal({ precision: 10, scale: 2 }).default('0'),
	condition: mysqlEnum(['good','damaged','expired','defective']).default('good'),
	unit: varchar({ length: 50 }).default('Piece'),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const returnedItems = mysqlTable("returned_items", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	returnNumber: varchar({ length: 50 }).notNull(),
	returnDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	returnedBy: varchar({ length: 255 }).notNull(),
	department: varchar({ length: 255 }),
	reason: text(),
	reasonAr: text(),
	status: mysqlEnum(['draft','submitted','inspected','accepted','rejected']).default('draft').notNull(),
	inspectedBy: varchar({ length: 255 }),
	inspectedAt: timestamp({ mode: 'string' }),
	remarks: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const rfqVendorItems = mysqlTable("rfq_vendor_items", {
	id: int().autoincrement().primaryKey().notNull(),
	rfqVendorId: int().notNull().references(() => rfqVendors.id, { onDelete: "cascade" } ),
	prLineItemId: int().notNull().references(() => purchaseRequestLineItems.id, { onDelete: "cascade" } ),
	quotedUnitPrice: decimal({ precision: 15, scale: 2 }).notNull(),
	quotedTotalPrice: decimal({ precision: 15, scale: 2 }).notNull(),
	itemNotes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const rfqVendors = mysqlTable("rfq_vendors", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	purchaseRequestId: int().notNull().references(() => purchaseRequests.id, { onDelete: "set null" } ),
	rfqId: int(),
	quotationAnalysisId: int(),
	supplierId: int().notNull().references(() => vendors.id, { onDelete: "set null" } ),
	invitationSentDate: timestamp({ mode: 'string' }),
	invitationMethod: mysqlEnum(['email','portal','hand_delivery','mail']).default('email'),
	submissionDate: timestamp({ mode: 'string' }),
	submissionMethod: mysqlEnum(['email','portal','hand_delivery','mail']),
	quotedAmount: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD'),
	deliveryDays: int(),
	warrantyMonths: int(),
	yearsOfExperience: int(),
	invitationStatus: mysqlEnum(['invited','declined','no_response']).default('invited').notNull(),
	submissionStatus: mysqlEnum(['pending','submitted','late','withdrawn']).default('pending').notNull(),
	quotationAttachment: text(),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	supplierQuoteNumber: varchar({ length: 100 }),
	isLatestSubmission: tinyint().default(1).notNull(),
});

export const rfqs = mysqlTable("rfqs", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	purchaseRequestId: int().notNull().references(() => purchaseRequests.id, { onDelete: "cascade" } ),
	rfqNumber: varchar({ length: 50 }).notNull(),
	issueDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	dueDate: timestamp({ mode: 'string' }),
	status: mysqlEnum(['draft','active','sent','received','cancelled']).default('draft').notNull(),
	notes: text(),
	instructions: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
},
(table) => [
	index("rfqs_rfqNumber_unique").on(table.rfqNumber),
	index("rfqNumber").on(table.rfqNumber),
]);

export const riskHistory = mysqlTable("risk_history", {
	id: int().autoincrement().primaryKey().notNull(),
	riskId: int().notNull().references(() => risks.id, { onDelete: "cascade" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	changeType: mysqlEnum(['created','status_changed','owner_changed','assessment_updated','mitigation_updated','closed','reopened','other']).notNull(),
	previousValue: text(),
	newValue: text(),
	description: text(),
	descriptionAr: text(),
	changedBy: int().references(() => users.id, { onDelete: "set null" } ),
	changedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_risk_history_risk").on(table.riskId),
	index("idx_risk_history_org").on(table.organizationId),
	index("idx_risk_history_date").on(table.changedAt),
]);

export const risks = mysqlTable("risks", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	riskCode: varchar({ length: 50 }),
	title: varchar({ length: 255 }).notNull(),
	titleAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	category: mysqlEnum(['operational','financial','strategic','compliance','reputational','technological','environmental','security','legal','other']).notNull(),
	likelihood: int().notNull(),
	impact: int().notNull(),
	score: int().notNull(),
	level: mysqlEnum(['low','medium','high','critical']).notNull(),
	status: mysqlEnum(['identified','assessed','mitigated','accepted','transferred','closed']).default('identified').notNull(),
	mitigationPlan: text(),
	mitigationPlanAr: text(),
	mitigationProgress: int().default(0).notNull(),
	owner: int(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	identifiedDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	reviewDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	targetClosureDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	closedDate: date({ mode: 'string' }),
	attachments: text(),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	projectId: int(),
	activityId: int(),
	budgetItemId: int(),
	indicatorId: int(),
	isSystemGenerated: tinyint().default(0).notNull(),
	source: mysqlEnum(['finance','meal','activities','manual']).default('manual').notNull(),
	triggerValue: varchar({ length: 255 }),
	trendDirection: mysqlEnum(['increasing','improving','stable']),
	lastEvaluatedAt: timestamp({ mode: 'string' }),
	autoMitigationSuggestions: text(),
},
(table) => [
	index("idx_risks_org").on(table.organizationId),
	index("idx_risks_ou").on(table.operatingUnitId),
	index("idx_risks_status").on(table.status),
	index("idx_risks_level").on(table.level),
	index("idx_risks_project").on(table.projectId),
	index("idx_risks_activity").on(table.activityId),
	index("idx_risks_source").on(table.source),
	index("idx_risks_system_generated").on(table.isSystemGenerated),
]);

export const serviceAcceptanceCertificates = mysqlTable("service_acceptance_certificates", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	contractId: int().notNull(),
	sacNumber: varchar({ length: 100 }).notNull(),
	milestoneId: int(),
	deliverables: text().notNull(),
	acceptanceType: mysqlEnum('acceptance_type', ['SERVICE','WORKS']).default('SERVICE').notNull(),
	approvedAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	currency: varchar({ length: 10 }).default('USD'),
	acceptanceDate: timestamp({ mode: 'string' }).notNull(),
	acceptedBy: int(),
	status: mysqlEnum(['draft','pending_approval','approved','rejected']).default('draft').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	acceptanceText: text("acceptance_text"),
	verifiedBoqs: tinyint("verified_boqs").default(0).notNull(),
	verifiedContractTerms: tinyint("verified_contract_terms").default(0).notNull(),
	verifiedDeliverablesReceived: tinyint("verified_deliverables_received").default(0).notNull(),
	preparedByRole: varchar("prepared_by_role", { length: 255 }),
	signatureImageUrl: text("signature_image_url"),
	signatureHash: varchar("signature_hash", { length: 255 }),
	signedAt: timestamp("signed_at", { mode: 'string' }),
	signedBy: int("signed_by"),
	deliverableStatuses: json("deliverable_statuses"),
	submittedAt: timestamp("submitted_at", { mode: 'string' }),
	submittedBy: int("submitted_by"),
	preparedByName: varchar("prepared_by_name", { length: 255 }),
	verificationCode: varchar("verification_code", { length: 100 }),
},
(table) => [
	index("idx_sac_contract").on(table.contractId),
	index("idx_sac_org").on(table.organizationId),
	index("sacNumber").on(table.sacNumber),
]);

export const settlementLines = mysqlTable("settlement_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	settlementId: int().notNull(),
	lineNumber: int().notNull(),
	description: text().notNull(),
	descriptionAr: text(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	currencyId: int(),
	exchangeRate: decimal({ precision: 15, scale: 6 }).default('1.000000'),
	amountInBaseCurrency: decimal({ precision: 15, scale: 2 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expenseDate: date({ mode: 'string' }),
	categoryId: int(),
	budgetLineId: int(),
	projectId: int(),
	grantId: int(),
	activityId: int(),
	glAccountId: int(),
	receiptNumber: varchar({ length: 100 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	receiptDate: date({ mode: 'string' }),
	vendorId: int(),
	vendorName: varchar({ length: 255 }),
	attachments: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_org").on(table.organizationId),
	index("idx_settlement").on(table.settlementId),
	index("idx_project").on(table.projectId),
	index("idx_grant").on(table.grantId),
	index("idx_category").on(table.categoryId),
]);

export const stockBatches = mysqlTable("stock_batches", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	batchNumber: varchar({ length: 100 }).notNull(),
	grnId: int(),
	grnLineItemId: int().references(() => grnLineItems.id, { onDelete: "set null" } ),
	poId: int(),
	vendorId: int(),
	itemId: int().notNull().references(() => stockItems.id, { onDelete: "set null" } ),
	warehouseId: int(),
	warehouseName: varchar({ length: 255 }),
	receivedQty: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	acceptedQty: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	reservedQty: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	issuedQty: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	lossAdjustments: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	returnsAccepted: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	expiryDate: timestamp({ mode: 'string' }),
	lotNumber: varchar({ length: 100 }),
	serialNumber: varchar({ length: 100 }),
	unitCost: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	batchStatus: mysqlEnum(['available','reserved','depleted','expired','quarantined']).default('available').notNull(),
	receivedDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_stock_batches_org").on(table.organizationId),
	index("idx_stock_batches_item").on(table.itemId),
	index("idx_stock_batches_expiry").on(table.expiryDate),
	index("idx_stock_batches_status").on(table.batchStatus),
]);

export const stockIssueLines = mysqlTable("stock_issue_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	issueId: int().notNull().references(() => stockIssues.id, { onDelete: "set null" } ),
	itemId: int().notNull().references(() => stockItems.id, { onDelete: "set null" } ),
	batchId: int().notNull().references(() => stockBatches.id, { onDelete: "set null" } ),
	qtyIssued: decimal({ precision: 15, scale: 2 }).notNull(),
	unit: varchar({ length: 50 }).default('Piece'),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_stock_issue_lines_issue").on(table.issueId),
	index("idx_stock_issue_lines_batch").on(table.batchId),
]);

export const stockIssued = mysqlTable("stock_issued", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	stockRequestId: int(),
	issueNumber: varchar({ length: 50 }).notNull(),
	issueDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	issuedTo: varchar({ length: 255 }).notNull(),
	issuedBy: varchar({ length: 255 }),
	department: varchar({ length: 255 }),
	remarks: text(),
	status: mysqlEnum(['draft','issued','acknowledged','cancelled']).default('draft').notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const stockIssuedLineItems = mysqlTable("stock_issued_line_items", {
	id: int().autoincrement().primaryKey().notNull(),
	stockIssuedId: int().notNull(),
	stockItemId: int(),
	lineNumber: int().notNull(),
	description: text().notNull(),
	issuedQty: decimal({ precision: 10, scale: 2 }).notNull(),
	unit: varchar({ length: 50 }).default('Piece'),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const stockIssues = mysqlTable("stock_issues", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	issueNumber: varchar({ length: 50 }).notNull(),
	issueDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	issuedTo: varchar({ length: 255 }).notNull(),
	issuedToType: mysqlEnum(['person','department','project','activity']).default('person').notNull(),
	projectId: int().references(() => projects.id, { onDelete: "set null" } ),
	activityId: int(),
	departmentId: int(),
	warehouseId: int(),
	warehouseName: varchar({ length: 255 }),
	purpose: text(),
	status: mysqlEnum(['draft','submitted','issued','acknowledged','cancelled']).default('draft').notNull(),
	issuedBy: int().references(() => users.id, { onDelete: "set null" } ),
	acknowledgedBy: varchar({ length: 255 }),
	acknowledgedAt: timestamp({ mode: 'string' }),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_stock_issues_org").on(table.organizationId),
	index("idx_stock_issues_number").on(table.organizationId, table.issueNumber),
	index("idx_stock_issues_status").on(table.status),
]);

export const stockItems = mysqlTable("stock_items", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	itemCode: varchar({ length: 50 }).notNull(),
	itemName: varchar({ length: 255 }).notNull(),
	itemNameAr: varchar({ length: 255 }),
	description: text(),
	category: varchar({ length: 100 }),
	unitType: varchar({ length: 50 }).default('Piece'),
	currentQuantity: decimal({ precision: 15, scale: 2 }).default('0'),
	minimumQuantity: decimal({ precision: 15, scale: 2 }).default('0'),
	maximumQuantity: decimal({ precision: 15, scale: 2 }),
	reorderLevel: decimal({ precision: 15, scale: 2 }),
	warehouseLocation: varchar({ length: 255 }),
	binLocation: varchar({ length: 100 }),
	expiryDate: timestamp({ mode: 'string' }),
	batchNumber: varchar({ length: 100 }),
	serialNumber: varchar({ length: 100 }),
	unitCost: decimal({ precision: 15, scale: 2 }).default('0'),
	totalValue: decimal({ precision: 15, scale: 2 }).default('0'),
	currency: varchar({ length: 10 }).default('USD'),
	isDamaged: tinyint().default(0),
	isExpired: tinyint().default(0),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
});

export const stockLedger = mysqlTable("stock_ledger", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	movementType: mysqlEnum(['GRN_IN','ISSUE_OUT','TRANSFER_OUT','TRANSFER_IN','ADJUSTMENT_IN','ADJUSTMENT_OUT','RETURN_IN','LOSS']).notNull(),
	referenceType: mysqlEnum(['GRN','ISSUE','TRANSFER','ADJUSTMENT','RETURN']).notNull(),
	referenceId: int().notNull(),
	referenceNumber: varchar({ length: 50 }),
	warehouseId: int(),
	warehouseName: varchar({ length: 255 }),
	batchId: int().notNull().references(() => stockBatches.id, { onDelete: "set null" } ),
	itemId: int().notNull().references(() => stockItems.id, { onDelete: "set null" } ),
	qtyChange: decimal({ precision: 15, scale: 2 }).notNull(),
	unit: varchar({ length: 50 }).default('Piece'),
	unitCost: decimal({ precision: 15, scale: 2 }).default('0'),
	totalValue: decimal({ precision: 15, scale: 2 }).default('0'),
	userId: int().references(() => users.id, { onDelete: "set null" } ),
	notes: text(),
	transactionDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_stock_ledger_org").on(table.organizationId),
	index("idx_stock_ledger_batch").on(table.batchId),
	index("idx_stock_ledger_item").on(table.itemId),
	index("idx_stock_ledger_date").on(table.transactionDate),
	index("idx_stock_ledger_movement_type").on(table.movementType),
]);

export const stockAdjustments = mysqlTable("stock_adjustments", {
	id: int().autoincrement().primaryKey().notNull(),
	adjustmentNumber: varchar({ length: 50 }).notNull(),
	type: mysqlEnum(['write_off','physical_count','damage','correction','donation','other']).default('correction').notNull(),
	status: mysqlEnum(['draft','pending_approval','approved','rejected','cancelled']).default('draft').notNull(),
	warehouse: varchar({ length: 200 }),
	reason: text(),
	notes: text(),
	createdBy: varchar({ length: 100 }),
	createdByName: varchar({ length: 200 }),
	approvedBy: varchar({ length: 100 }),
	approvedByName: varchar({ length: 200 }),
	approvedAt: bigint({ mode: 'number' }),
	rejectionReason: text(),
	organizationId: int(),
	operatingUnitId: int(),
	createdAt: bigint({ mode: 'number' }).notNull().$defaultFn(() => Date.now()),
	updatedAt: bigint({ mode: 'number' }).notNull().$defaultFn(() => Date.now()),
});

export const stockAdjustmentLines = mysqlTable("stock_adjustment_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	adjustmentId: int().notNull(),
	itemId: int(),
	batchId: int(),
	itemName: varchar({ length: 300 }),
	batchNumber: varchar({ length: 100 }),
	qtyBefore: decimal({ precision: 15, scale: 4 }).default('0'),
	qtyAdjusted: decimal({ precision: 15, scale: 4 }).notNull().default('0'),
	qtyAfter: decimal({ precision: 15, scale: 4 }).default('0'),
	unitCost: decimal({ precision: 15, scale: 4 }).default('0'),
	notes: text(),
	createdAt: bigint({ mode: 'number' }).notNull().$defaultFn(() => Date.now()),
});

export const physicalCountSessions = mysqlTable("physical_count_sessions", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int('organization_id').notNull(),
	operatingUnitId: int('operating_unit_id'),
	sessionNumber: varchar('session_number', { length: 50 }).notNull(),
	warehouse: varchar({ length: 200 }),
	status: mysqlEnum(['draft','in_progress','reviewed','adjustments_generated','completed','cancelled']).default('draft').notNull(),
	countDate: bigint('count_date', { mode: 'number' }).notNull(),
	countedBy: varchar('counted_by', { length: 200 }),
	reviewedBy: varchar('reviewed_by', { length: 200 }),
	reviewedAt: bigint('reviewed_at', { mode: 'number' }),
	totalItems: int('total_items').default(0),
	discrepancyCount: int('discrepancy_count').default(0),
	surplusCount: int('surplus_count').default(0),
	shortageCount: int('shortage_count').default(0),
	adjustmentId: int('adjustment_id'),
	notes: text(),
	createdBy: varchar('created_by', { length: 100 }),
	createdByName: varchar('created_by_name', { length: 200 }),
	createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
});

export const physicalCountLines = mysqlTable("physical_count_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	sessionId: int('session_id').notNull(),
	itemId: int('item_id'),
	batchId: int('batch_id'),
	itemCode: varchar('item_code', { length: 100 }),
	itemName: varchar('item_name', { length: 300 }),
	batchNumber: varchar('batch_number', { length: 100 }),
	systemQty: decimal('system_qty', { precision: 15, scale: 4 }).default('0'),
	countedQty: decimal('counted_qty', { precision: 15, scale: 4 }).default('0'),
	varianceQty: decimal('variance_qty', { precision: 15, scale: 4 }).default('0'),
	varianceType: mysqlEnum('variance_type', ['match','surplus','shortage']).default('match'),
	unit: varchar({ length: 50 }).default('Piece'),
	unitCost: decimal('unit_cost', { precision: 15, scale: 4 }).default('0'),
	varianceValue: decimal('variance_value', { precision: 15, scale: 4 }).default('0'),
	notes: text(),
	createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
});

export const expiryAlertHistory = mysqlTable("expiry_alert_history", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int('organization_id').notNull(),
	operatingUnitId: int('operating_unit_id'),
	alertType: mysqlEnum('alert_type', ['manual','scheduled']).default('manual').notNull(),
	thresholdDays: int('threshold_days').notNull().default(30),
	nearExpiryCount: int('near_expiry_count').notNull().default(0),
	expiredCount: int('expired_count').notNull().default(0),
	batchDetails: text('batch_details'),
	sentBy: varchar('sent_by', { length: 200 }),
	sentAt: bigint('sent_at', { mode: 'number' }).notNull(),
	notificationSent: tinyint('notification_sent').default(1),
	createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
});

export const warehouseAlertConfigs = mysqlTable("warehouse_alert_configs", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int('organization_id').notNull(),
	operatingUnitId: int('operating_unit_id'),
	warehouseId: int('warehouse_id'),
	warehouseName: varchar('warehouse_name', { length: 255 }).notNull(),
	category: varchar({ length: 100 }),
	thresholdDays: int('threshold_days').notNull().default(30),
	frequency: mysqlEnum(['daily','weekly','biweekly','monthly']).default('daily').notNull(),
	enabled: tinyint().default(1).notNull(),
	notifyEmail: tinyint('notify_email').default(0),
	notifyInApp: tinyint('notify_in_app').default(1),
	lastAlertSentAt: bigint('last_alert_sent_at', { mode: 'number' }),
	createdBy: varchar('created_by', { length: 200 }),
	createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
},
(table) => [
	index("idx_wh_alert_configs_org").on(table.organizationId),
	index("idx_wh_alert_configs_wh").on(table.warehouseId),
]);

export const stockRequestLineItems = mysqlTable("stock_request_line_items", {
	id: int().autoincrement().primaryKey().notNull(),
	stockRequestId: int().notNull(),
	stockItemId: int(),
	lineNumber: int().notNull(),
	description: text().notNull(),
	requestedQty: decimal({ precision: 10, scale: 2 }).notNull(),
	approvedQty: decimal({ precision: 10, scale: 2 }).default('0'),
	issuedQty: decimal({ precision: 10, scale: 2 }).default('0'),
	unit: varchar({ length: 50 }).default('Piece'),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const stockRequests = mysqlTable("stock_requests", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	requestNumber: varchar({ length: 50 }).notNull(),
	requestDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	requesterName: varchar({ length: 255 }).notNull(),
	requesterDepartment: varchar({ length: 255 }),
	purpose: text(),
	purposeAr: text(),
	neededByDate: timestamp({ mode: 'string' }),
	status: mysqlEnum(['draft','submitted','approved','partially_issued','issued','rejected','cancelled']).default('draft').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const stockReservations = mysqlTable("stock_reservations", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	batchId: int().notNull().references(() => stockBatches.id, { onDelete: "set null" } ),
	itemId: int().notNull().references(() => stockItems.id, { onDelete: "set null" } ),
	reservedQty: decimal({ precision: 15, scale: 2 }).notNull(),
	reservedFor: varchar({ length: 255 }).notNull(),
	reservationType: mysqlEnum(['issue_pending','transfer_pending','project_allocation']).default('issue_pending').notNull(),
	referenceId: int(),
	reservedBy: int().references(() => users.id, { onDelete: "set null" } ),
	reservedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp({ mode: 'string' }),
	status: mysqlEnum(['active','fulfilled','expired','cancelled']).default('active').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_stock_reservations_batch").on(table.batchId),
	index("idx_stock_reservations_status").on(table.status),
]);

export const supplierQuotationHeaders = mysqlTable("supplier_quotation_headers", {
	id: int().autoincrement().primaryKey().notNull(),
	purchaseRequestId: int().notNull(),
	vendorId: int(),
	bidAnalysisBidderId: int(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	quotationReference: varchar({ length: 100 }),
	quotationDate: timestamp({ mode: 'string' }),
	currency: varchar({ length: 10 }).default('USD'),
	totalAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	status: mysqlEnum(['draft','submitted','under_review','accepted','rejected']).default('draft'),
	attachmentUrl: text(),
	attachmentName: varchar({ length: 255 }),
	notes: text(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("idx_sqh_pr").on(table.purchaseRequestId),
	index("idx_sqh_vendor").on(table.vendorId),
	index("idx_sqh_bidder").on(table.bidAnalysisBidderId),
	index("idx_sqh_org").on(table.organizationId),
	index("idx_sqh_status").on(table.status),
]);

export const supplierQuotationLines = mysqlTable("supplier_quotation_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	quotationHeaderId: int().notNull(),
	prLineItemId: int().notNull(),
	itemDescriptionSnapshot: text().notNull(),
	specificationsSnapshot: text(),
	quantity: decimal({ precision: 10, scale: 2 }).notNull(),
	unit: varchar({ length: 50 }).default('Piece'),
	unitPrice: decimal({ precision: 15, scale: 2 }).default('0'),
	lineTotal: decimal({ precision: 15, scale: 2 }).default('0'),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_sql_header").on(table.quotationHeaderId),
	index("idx_sql_prline").on(table.prLineItemId),
]);

export const systemImportReports = mysqlTable("systemImportReports", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	projectId: int(),
	module: varchar({ length: 100 }).notNull(),
	importType: mysqlEnum(['create','update']).default('create').notNull(),
	userId: int(),
	userName: varchar({ length: 255 }),
	userRole: varchar({ length: 50 }),
	importSummary: json().notNull(),
	errorDetails: json().notNull(),
	errorFilePath: varchar({ length: 500 }),
	originalFilePath: varchar({ length: 500 }),
	status: mysqlEnum(['open','reviewed','resolved']).default('open').notNull(),
	reviewedBy: int(),
	reviewedAt: timestamp({ mode: 'string' }),
	resolutionNotes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const systemSettings = mysqlTable("system_settings", {
	id: int().autoincrement().primaryKey().notNull(),
	settingKey: varchar({ length: 255 }).notNull(),
	settingValue: text(),
	updatedAt: bigint({ mode: "number" }).notNull(),
	updatedBy: int(),
},
(table) => [
	index("idx_setting_key").on(table.settingKey),
	index("settingKey").on(table.settingKey),
]);

export const tasks = mysqlTable("tasks", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	taskName: text().notNull(),
	taskNameAr: text(),
	description: text(),
	descriptionAr: text(),
	status: mysqlEnum(['TODO','IN_PROGRESS','REVIEW','DONE','BLOCKED']).default('TODO').notNull(),
	priority: mysqlEnum(['LOW','MEDIUM','HIGH','URGENT']).default('MEDIUM').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dueDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	completedDate: date({ mode: 'string' }),
	assignedByEmail: varchar({ length: 320 }),
	assignedByName: varchar({ length: 255 }),
	assignedToEmail: varchar({ length: 320 }),
	assignedToName: varchar({ length: 255 }),
	assignmentDate: timestamp({ mode: 'string' }),
	assignedTo: int(),
	progressPercentage: decimal({ precision: 5, scale: 2 }).default('0.00').notNull(),
	tags: json(),
	category: varchar({ length: 255 }),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const tripLogs = mysqlTable("trip_logs", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	vehicleId: int().notNull(),
	driverId: int(),
	tripNumber: varchar({ length: 50 }).notNull(),
	tripDate: timestamp({ mode: 'string' }).notNull(),
	purpose: text(),
	purposeAr: text(),
	startLocation: varchar({ length: 255 }),
	endLocation: varchar({ length: 255 }),
	startMileage: decimal({ precision: 10, scale: 2 }),
	endMileage: decimal({ precision: 10, scale: 2 }),
	distanceTraveled: decimal({ precision: 10, scale: 2 }),
	startTime: timestamp({ mode: 'string' }),
	endTime: timestamp({ mode: 'string' }),
	passengers: text(),
	projectCode: varchar({ length: 50 }),
	status: mysqlEnum(['planned','in_progress','completed','cancelled']).default('planned').notNull(),
	remarks: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const unitTypes = mysqlTable("unit_types", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar({ length: 100 }),
	category: mysqlEnum(['goods','time_based','programmatic']).notNull(),
	description: text(),
	descriptionAr: text(),
	active: tinyint().default(1).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
},
(table) => [
	index("idx_category").on(table.category),
	index("idx_active").on(table.active),
	index("name").on(table.name),
]);

export const userActiveScope = mysqlTable("user_active_scope", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().notNull().references(() => operatingUnits.id, { onDelete: "set null" } ),
	lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("user_active_scope_userId").on(table.userId),
	index("user_active_scope_org_ou").on(table.organizationId, table.operatingUnitId),
]);

export const userArchiveLog = mysqlTable("user_archive_log", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "set null" } ),
	action: mysqlEnum(['delete','restore']).notNull(),
	userSnapshot: text().notNull(),
	previousRoles: text(),
	previousOrganizations: text(),
	previousPermissions: text(),
	reason: text(),
	performedBy: int().notNull().references(() => users.id, { onDelete: "set null" } ),
	performedByName: varchar({ length: 255 }),
	performedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	restorationMetadata: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("ual_user_idx").on(table.userId),
	index("ual_action_idx").on(table.action),
	index("ual_performed_at_idx").on(table.performedAt),
]);

export const userOperatingUnits = mysqlTable("user_operating_units", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	operatingUnitId: int().notNull(),
	role: mysqlEnum(['organization_admin','user']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("user_operating_units_userId_operatingUnitId_unique").on(table.userId, table.operatingUnitId),
]);

export const userOrganizations = mysqlTable("user_organizations", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	organizationId: int().notNull(),
	tenantId: varchar({ length: 36 }),
	platformRole: mysqlEnum(['platform_admin','organization_admin','user']).default('user').notNull(),
	orgRoles: text(),
	permissions: text(),
	modulePermissions: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	role: varchar({ length: 50 }).default('user'),
},
(table) => [
	index("user_organizations_userId_organizationId_unique").on(table.userId, table.organizationId),
]);

export const userPermissionOverrides = mysqlTable("user_permission_overrides", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	moduleId: varchar({ length: 100 }).notNull(),
	screenId: varchar({ length: 100 }),
	action: varchar({ length: 50 }).notNull(),
	overrideType: mysqlEnum(['grant','revoke']).notNull(),
	reason: text(),
	expiresAt: timestamp({ mode: 'string' }),
	isActive: tinyint().default(1).notNull(),
	createdBy: int().notNull().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("upo_user_org_idx").on(table.userId, table.organizationId),
	index("upo_expires_idx").on(table.expiresAt),
]);

export const users = mysqlTable("users", {
  id: int().autoincrement().primaryKey().notNull(),

  openId: varchar({ length: 64 }),
  name: text(),
  email: varchar({ length: 320 }),

  loginMethod: varchar({ length: 64 }),
  authenticationProvider: varchar({ length: 64 }).default('email'),

  externalIdentityId: varchar({ length: 255 }),
  microsoftObjectId: varchar({ length: 255 }),

  isActive: tinyint().default(1).notNull(),

  role: mysqlEnum([
	'platform_super_admin',
	'platform_admin',
	'platform_auditor',
	'organization_admin',
	'user',
	'admin',
	'manager'
  ]).default('user').notNull(),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp({ mode: 'string' }).defaultNow().notNull(),

  organizationId: int(),
  currentOrganizationId: int(),

  languagePreference: varchar({ length: 10 }),

  isDeleted: tinyint().default(0).notNull(),
  deletedAt: timestamp({ mode: 'string' }),
  deletedBy: int(),
  deletionReason: text(),

  passwordResetToken: varchar({ length: 255 }),
  passwordResetExpiry: bigint({ mode: "number" }),
  passwordHash: varchar({ length: 255 }),

  emailVerified: tinyint().default(0).notNull(),
  emailVerifiedAt: timestamp({ mode: 'string' }),

  // Account lockout fields for failed login attempts
  failedLoginAttempts: int().default(0).notNull(),
  lockedUntil: timestamp({ mode: 'string' }),
},
(table) => [
  // ✅ UNIQUE constraints (CRITICAL)
  index("unique_users_email").on(table.email),
  index("unique_users_microsoftObjectId").on(table.microsoftObjectId),

  // 🟡 OPTIONAL (recommended if you rely on openId for sessions)
  index("unique_users_openId").on(table.openId),

  // ✅ Performance indexes
  index("idx_users_email_verified").on(table.emailVerified),
]);

export const varianceAlertConfig = mysqlTable("variance_alert_config", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	warningThreshold: decimal({ precision: 5, scale: 2 }).default('10.00').notNull(),
	criticalThreshold: decimal({ precision: 5, scale: 2 }).default('20.00').notNull(),
	isEnabled: tinyint().default(1).notNull(),
	notifyProjectManager: tinyint().default(1).notNull(),
	notifyFinanceTeam: tinyint().default(1).notNull(),
	notifyOwner: tinyint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const varianceAlertHistory = mysqlTable("variance_alert_history", {
	id: int().autoincrement().primaryKey().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "set null" } ),
	budgetItemId: int().notNull().references(() => budgetItems.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	budgetCode: varchar({ length: 100 }).notNull(),
	budgetItem: text().notNull(),
	totalBudget: decimal({ precision: 15, scale: 2 }).notNull(),
	actualSpent: decimal({ precision: 15, scale: 2 }).notNull(),
	varianceAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	variancePercentage: decimal({ precision: 5, scale: 2 }).notNull(),
	alertLevel: mysqlEnum(['warning','critical']).notNull(),
	notificationSent: tinyint().default(0).notNull(),
	notificationError: text(),
	acknowledgedAt: timestamp({ mode: 'string' }),
	acknowledgedBy: int().references(() => users.id, { onDelete: "set null" } ),
	acknowledgedNotes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const varianceAlertThresholds = mysqlTable("variance_alert_thresholds", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	name: varchar({ length: 200 }).notNull(),
	nameAr: varchar({ length: 200 }),
	description: text(),
	scope: mysqlEnum(['organization','project','grant','category']).default('organization').notNull(),
	projectId: int(),
	grantId: int(),
	category: varchar({ length: 100 }),
	thresholdPercentage: decimal({ precision: 5, scale: 2 }).default('5.00').notNull(),
	alertType: mysqlEnum(['budget_exceeded','threshold_exceeded','forecast_variance']).default('threshold_exceeded').notNull(),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	notifyOwner: tinyint().default(1).notNull(),
	notifyProjectManager: tinyint().default(1).notNull(),
	notifyFinanceTeam: tinyint().default(1).notNull(),
	emailNotification: tinyint().default(1).notNull(),
	inAppNotification: tinyint().default(1).notNull(),
	isActive: tinyint().default(1).notNull(),
	createdBy: int(),
	createdAt: datetime({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: datetime({ mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const varianceAlerts = mysqlTable("variance_alerts", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	projectId: int(),
	grantId: int(),
	budgetId: int(),
	category: varchar({ length: 100 }),
	alertType: mysqlEnum(['budget_exceeded','threshold_exceeded','forecast_variance']).notNull(),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	budgetAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	actualAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	variance: decimal({ precision: 15, scale: 2 }).notNull(),
	variancePercentage: decimal({ precision: 5, scale: 2 }).notNull(),
	thresholdPercentage: decimal({ precision: 5, scale: 2 }).notNull(),
	status: mysqlEnum(['active','acknowledged','resolved','dismissed']).default('active').notNull(),
	acknowledgedBy: int(),
	acknowledgedAt: datetime({ mode: 'string'}),
	resolvedBy: int(),
	resolvedAt: datetime({ mode: 'string'}),
	notificationSent: tinyint().default(0).notNull(),
	notificationSentAt: datetime({ mode: 'string'}),
	description: text(),
	notes: text(),
	createdAt: datetime({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: datetime({ mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const vehicleAssignments = mysqlTable("vehicle_assignments", {
	id: int().autoincrement().primaryKey().notNull(),
	vehicleId: int().notNull(),
	driverId: int().notNull(),
	assignedFrom: timestamp({ mode: 'string' }).notNull(),
	assignedTo: timestamp({ mode: 'string' }),
	isPrimary: tinyint().default(0),
	status: mysqlEnum(['active','ended']).default('active').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const vehicleCompliance = mysqlTable("vehicle_compliance", {
	id: int().autoincrement().primaryKey().notNull(),
	vehicleId: int().notNull(),
	complianceType: mysqlEnum(['insurance','registration','inspection','permit','other']).notNull(),
	documentNumber: varchar({ length: 100 }),
	issueDate: timestamp({ mode: 'string' }),
	expiryDate: timestamp({ mode: 'string' }),
	issuingAuthority: varchar({ length: 255 }),
	cost: decimal({ precision: 10, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD'),
	documentUrl: text(),
	status: mysqlEnum(['valid','expiring_soon','expired','pending']).default('valid').notNull(),
	remarks: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const vehicleMaintenance = mysqlTable("vehicle_maintenance", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	vehicleId: int().notNull(),
	maintenanceNumber: varchar({ length: 50 }).notNull(),
	maintenanceType: mysqlEnum(['scheduled','unscheduled','repair','inspection']).default('scheduled'),
	description: text(),
	descriptionAr: text(),
	scheduledDate: timestamp({ mode: 'string' }),
	completedDate: timestamp({ mode: 'string' }),
	mileageAtService: decimal({ precision: 10, scale: 2 }),
	vendor: varchar({ length: 255 }),
	laborCost: decimal({ precision: 10, scale: 2 }).default('0'),
	partsCost: decimal({ precision: 10, scale: 2 }).default('0'),
	totalCost: decimal({ precision: 10, scale: 2 }).default('0'),
	currency: varchar({ length: 10 }).default('USD'),
	invoiceNumber: varchar({ length: 100 }),
	status: mysqlEnum(['scheduled','in_progress','completed','cancelled']).default('scheduled').notNull(),
	remarks: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
});

export const vehicles = mysqlTable("vehicles", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	vehicleId: varchar({ length: 50 }),
	plateNumber: varchar({ length: 50 }).notNull(),
	vehicleType: varchar({ length: 100 }),
	brand: varchar({ length: 100 }),
	model: varchar({ length: 100 }),
	year: int(),
	color: varchar({ length: 50 }),
	chassisNumber: varchar({ length: 100 }),
	engineNumber: varchar({ length: 100 }),
	fuelType: mysqlEnum(['petrol','diesel','electric','hybrid']).default('petrol'),
	ownership: mysqlEnum(['owned','leased','rented']).default('owned'),
	purchaseDate: timestamp({ mode: 'string' }),
	purchaseValue: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }),
	assignedProjectId: int(),
	assignedProject: varchar({ length: 255 }),
	assignedDriverId: int(),
	assignedDriverName: varchar({ length: 255 }),
	status: mysqlEnum(['active','under_maintenance','retired','disposed']).default('active').notNull(),
	currentOdometer: decimal({ precision: 15, scale: 2 }),
	insuranceExpiry: timestamp({ mode: 'string' }),
	licenseExpiry: timestamp({ mode: 'string' }),
	inspectionExpiry: timestamp({ mode: 'string' }),
	notes: text(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
});

export const vendorDocuments = mysqlTable("vendor_documents", {
	id: int().autoincrement().primaryKey().notNull(),
	vendorId: int().notNull().references(() => vendors.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	documentType: mysqlEnum(['registration_certificate','tax_certificate','bank_statement','insurance_certificate','quality_certification','framework_agreement','contract','compliance_document','other']).notNull(),
	documentName: varchar({ length: 255 }).notNull(),
	documentNumber: varchar({ length: 100 }),
	documentUrl: varchar({ length: 500 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	issueDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expiryDate: date({ mode: 'string' }),
	isExpired: tinyint().default(0),
	isVerified: tinyint().default(0),
	verifiedBy: int().references(() => users.id, { onDelete: "set null" } ),
	verifiedAt: timestamp({ mode: 'string' }),
	notes: text(),
	uploadedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const vendorParticipationHistory = mysqlTable("vendor_participation_history", {
	id: int().autoincrement().primaryKey().notNull(),
	vendorId: int().notNull().references(() => vendors.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	participationType: mysqlEnum(['rfq','tender','quotation','bid']).notNull(),
	purchaseRequestId: int().references(() => purchaseRequests.id, { onDelete: "set null" } ),
	quotationAnalysisId: int(),
	bidAnalysisId: int(),
	submissionDate: timestamp({ mode: 'string' }),
	submissionStatus: mysqlEnum(['invited','submitted','withdrawn','disqualified']).default('invited'),
	technicalScore: decimal({ precision: 5, scale: 2 }),
	financialScore: decimal({ precision: 5, scale: 2 }),
	totalScore: decimal({ precision: 5, scale: 2 }),
	ranking: int(),
	isWinner: tinyint().default(0),
	awardedContractValue: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }).default('USD'),
	evaluationNotes: text(),
	disqualificationReason: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const vendorPerformanceEvaluations = mysqlTable("vendor_performance_evaluations", {
	id: int().autoincrement().primaryKey().notNull(),
	vendorId: int().notNull().references(() => vendors.id, { onDelete: "set null" } ),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	evaluationDate: timestamp({ mode: 'string' }).notNull(),
	evaluationPeriodStart: timestamp({ mode: 'string' }),
	evaluationPeriodEnd: timestamp({ mode: 'string' }),
	qualityScore: decimal({ precision: 5, scale: 2 }),
	deliveryScore: decimal({ precision: 5, scale: 2 }),
	complianceScore: decimal({ precision: 5, scale: 2 }),
	communicationScore: decimal({ precision: 5, scale: 2 }),
	overallScore: decimal({ precision: 5, scale: 2 }),
	totalOrdersInPeriod: int().default(0),
	onTimeDeliveries: int().default(0),
	lateDeliveries: int().default(0),
	qualityIssues: int().default(0),
	strengths: text(),
	weaknesses: text(),
	recommendations: text(),
	evaluatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const vendors = mysqlTable("vendors", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	vendorCode: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar({ length: 255 }),
	vendorType: mysqlEnum(['supplier','contractor','service_provider','consultant','other']).default('supplier'),
	taxId: varchar({ length: 50 }),
	registrationNumber: varchar({ length: 100 }),
	contactPerson: varchar({ length: 255 }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	mobile: varchar({ length: 50 }),
	fax: varchar({ length: 50 }),
	website: varchar({ length: 255 }),
	addressLine1: varchar({ length: 255 }),
	addressLine2: varchar({ length: 255 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	country: varchar({ length: 100 }),
	postalCode: varchar({ length: 20 }),
	bankName: varchar({ length: 255 }),
	bankBranch: varchar({ length: 255 }),
	bankAccountNumber: varchar({ length: 100 }),
	bankAccountName: varchar({ length: 255 }),
	iban: varchar({ length: 50 }),
	swiftCode: varchar({ length: 20 }),
	currencyId: int(),
	paymentTerms: varchar({ length: 100 }),
	creditLimit: decimal({ precision: 15, scale: 2 }),
	currentBalance: decimal({ precision: 15, scale: 2 }).default('0.00'),
	glAccountId: int(),
	isActive: tinyint().default(1),
	isPreferred: tinyint().default(0),
	isBlacklisted: tinyint().default(0),
	blacklistReason: text(),
	isFinanciallyActive: tinyint().default(0),
	approvalStatus: mysqlEnum(['pending','pending_approval','approved','rejected']).default('pending'),
	performanceRating: decimal({ precision: 5, scale: 2 }),
	legalName: varchar({ length: 255 }),
	legalNameAr: varchar({ length: 255 }),
	totalPRParticipations: int().default(0),
	totalContractsAwarded: int().default(0),
	onTimeDeliveryRate: decimal({ precision: 5, scale: 2 }),
	qualityRating: decimal({ precision: 5, scale: 2 }),
	notes: text(),
	attachments: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("uk_org_code").on(table.organizationId, table.vendorCode),
	index("idx_org").on(table.organizationId),
	index("idx_ou").on(table.operatingUnitId),
	index("idx_type").on(table.vendorType),
	index("idx_active").on(table.isActive),
]);

export const warehouseTransferLines = mysqlTable("warehouse_transfer_lines", {
	id: int().autoincrement().primaryKey().notNull(),
	transferId: int().notNull().references(() => warehouseTransfers.id, { onDelete: "set null" } ),
	itemId: int().notNull().references(() => stockItems.id, { onDelete: "set null" } ),
	batchId: int().notNull().references(() => stockBatches.id, { onDelete: "set null" } ),
	qtyRequested: decimal({ precision: 15, scale: 2 }).notNull(),
	qtyDispatched: decimal({ precision: 15, scale: 2 }).default('0'),
	qtyReceived: decimal({ precision: 15, scale: 2 }).default('0'),
	unit: varchar({ length: 50 }).default('Piece'),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_warehouse_transfer_lines_transfer").on(table.transferId),
	index("idx_warehouse_transfer_lines_batch").on(table.batchId),
]);

export const warehouseTransfers = mysqlTable("warehouse_transfers", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "set null" } ),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" } ),
	transferNumber: varchar({ length: 50 }).notNull(),
	fromWarehouseId: int(),
	fromWarehouseName: varchar({ length: 255 }).notNull(),
	toWarehouseId: int(),
	toWarehouseName: varchar({ length: 255 }).notNull(),
	projectId: int().references(() => projects.id, { onDelete: "set null" } ),
	requestDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	status: mysqlEnum(['draft','submitted','approved','dispatched','received','completed','cancelled']).default('draft').notNull(),
	createdBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	dispatchedBy: int().references(() => users.id, { onDelete: "set null" } ),
	receivedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedAt: timestamp({ mode: 'string' }),
	dispatchedAt: timestamp({ mode: 'string' }),
	receivedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	notes: text(),
	estimatedArrivalDate: timestamp('estimated_arrival_date', { mode: 'string' }),
	actualArrivalDate: timestamp('actual_arrival_date', { mode: 'string' }),
	trackingNotes: text('tracking_notes'),
	carrierName: varchar('carrier_name', { length: 200 }),
	trackingReference: varchar('tracking_reference', { length: 100 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_warehouse_transfers_org").on(table.organizationId),
	index("idx_warehouse_transfers_number").on(table.organizationId, table.transferNumber),
	index("idx_warehouse_transfers_status").on(table.status),
]);


// ============================================================================
// CONTRACT MANAGEMENT TABLES
// ============================================================================

export const contractPenalties = mysqlTable("contract_penalties", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int("organization_id").notNull(),
	operatingUnitId: int("operating_unit_id"),
	contractId: int("contract_id").notNull(),
	penaltyDescription: text("penalty_description").notNull(),
	penaltyType: mysqlEnum("penalty_type", ['delay','quality','compliance']).notNull().default('delay'),
	delayDaysThreshold: int("delay_days_threshold").default(0),
	penaltyPercentage: decimal("penalty_percentage", { precision: 5, scale: 2 }).notNull().default('0.00'),
	penaltyBase: mysqlEnum("penalty_base", ['contract_value','deliverable_amount']).notNull().default('contract_value'),
	linkedMilestoneId: int("linked_milestone_id"),
	maxPenaltyLimitPct: decimal("max_penalty_limit_pct", { precision: 5, scale: 2 }).default('10.00'),
	calculatedAmount: decimal("calculated_amount", { precision: 15, scale: 2 }).default('0.00'),
	actualDelayDays: int("actual_delay_days").default(0),
	remarks: text(),
	status: mysqlEnum(['draft','applied','waived']).notNull().default('draft'),
	isDeleted: tinyint("is_deleted").notNull().default(0),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deletedBy: int("deleted_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull().defaultNow().onUpdateNow(),
	createdBy: int("created_by"),
	updatedBy: int("updated_by"),
},
(table) => [
	index("idx_penalty_contract").on(table.contractId),
	index("idx_penalty_org").on(table.organizationId),
	index("idx_penalty_milestone").on(table.linkedMilestoneId),
]);

export const contractPaymentSchedule = mysqlTable("contract_payment_schedule", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int("organization_id").notNull(),
	operatingUnitId: int("operating_unit_id"),
	contractId: int("contract_id").notNull(),
	paymentType: mysqlEnum("payment_type", ['advance','milestone','progress','final']).notNull().default('milestone'),
	description: text().notNull(),
	paymentPercentage: decimal("payment_percentage", { precision: 5, scale: 2 }).notNull().default('0.00'),
	paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }).notNull().default('0.00'),
	linkedMilestoneId: int("linked_milestone_id"),
	paymentCondition: mysqlEnum("payment_condition", ['none','sac_required','monitoring_required','sac_and_monitoring']).notNull().default('none'),
	status: mysqlEnum(['pending','approved','invoiced','paid']).notNull().default('pending'),
	orderIndex: int("order_index").default(0),
	isDeleted: tinyint("is_deleted").notNull().default(0),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deletedBy: int("deleted_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull().defaultNow().onUpdateNow(),
	createdBy: int("created_by"),
	updatedBy: int("updated_by"),
},
(table) => [
	index("idx_schedule_contract").on(table.contractId),
	index("idx_schedule_org").on(table.organizationId),
	index("idx_schedule_milestone").on(table.linkedMilestoneId),
]);

export const contractRetentionTerms = mysqlTable("contract_retention_terms", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int("organization_id").notNull(),
	operatingUnitId: int("operating_unit_id"),
	contractId: int("contract_id").notNull(),
	retentionEnabled: tinyint("retention_enabled").notNull().default(1),
	retentionPercentage: decimal("retention_percentage", { precision: 5, scale: 2 }).notNull().default('0.00'),
	retentionBasis: mysqlEnum("retention_basis", ['contract_value','payment_stage']).notNull().default('contract_value'),
	maxRetentionAmount: decimal("max_retention_amount", { precision: 15, scale: 2 }).default('0.00'),
	totalRetained: decimal("total_retained", { precision: 15, scale: 2 }).default('0.00'),
	totalReleased: decimal("total_released", { precision: 15, scale: 2 }).default('0.00'),
	releaseCondition: mysqlEnum("release_condition", ['final_acceptance','final_handover','defect_liability']).notNull().default('final_acceptance'),
	releaseType: mysqlEnum("release_type", ['full','partial']).notNull().default('full'),
	status: mysqlEnum(['active','partially_released','released']).notNull().default('active'),
	releasedAt: timestamp("released_at", { mode: 'string' }),
	releasedBy: int("released_by"),
	remarks: text(),
	isDeleted: tinyint("is_deleted").notNull().default(0),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deletedBy: int("deleted_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull().defaultNow().onUpdateNow(),
	createdBy: int("created_by"),
	updatedBy: int("updated_by"),
},
(table) => [
	index("idx_retention_contract").on(table.contractId),
	index("idx_retention_org").on(table.organizationId),
]);

export const implementationMonitoring = mysqlTable("implementation_monitoring", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int("organization_id").notNull(),
	operatingUnitId: int("operating_unit_id"),
	contractId: int("contract_id").notNull(),
	status: mysqlEnum(['pending','in_progress','completed']).notNull().default('pending'),
	deliverablesChecklistComplete: tinyint("deliverables_checklist_complete").notNull().default(0),
	primaryHandoverComplete: tinyint("primary_handover_complete").notNull().default(0),
	finalHandoverComplete: tinyint("final_handover_complete").notNull().default(0),
	observationsComplete: tinyint("observations_complete").notNull().default(0),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	completedBy: int("completed_by"),
	isDeleted: tinyint("is_deleted").notNull().default(0),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deletedBy: int("deleted_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull().defaultNow().onUpdateNow(),
	createdBy: int("created_by"),
	updatedBy: int("updated_by"),
},
(table) => [
	index("idx_monitoring_contract").on(table.contractId),
	index("idx_monitoring_org").on(table.organizationId),
]);

export const implementationChecklist = mysqlTable("implementation_checklist", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int("organization_id").notNull(),
	monitoringId: int("monitoring_id").notNull(),
	milestoneId: int("milestone_id"),
	itemDescription: text("item_description").notNull(),
	isCompleted: tinyint("is_completed").notNull().default(0),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	completedBy: int("completed_by"),
	remarks: text(),
	orderIndex: int("order_index").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull().defaultNow().onUpdateNow(),
	createdBy: int("created_by"),
	updatedBy: int("updated_by"),
},
(table) => [
	index("idx_checklist_monitoring").on(table.monitoringId),
	index("idx_checklist_milestone").on(table.milestoneId),
]);

export const primaryHandover = mysqlTable("primary_handover", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int("organization_id").notNull(),
	monitoringId: int("monitoring_id").notNull(),
	handoverDate: timestamp("handover_date", { mode: 'string' }),
	handoverDescription: text("handover_description"),
	receivedBy: varchar("received_by", { length: 255 }),
	deliveredBy: varchar("delivered_by", { length: 255 }),
	conditionNotes: text("condition_notes"),
	attachmentsUrl: text("attachments_url"),
	status: mysqlEnum(['draft','submitted','approved','rejected']).notNull().default('draft'),
	approvedBy: int("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull().defaultNow().onUpdateNow(),
	createdBy: int("created_by"),
	updatedBy: int("updated_by"),
},
(table) => [
	index("idx_primary_handover_monitoring").on(table.monitoringId),
]);

export const finalHandover = mysqlTable("final_handover", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int("organization_id").notNull(),
	monitoringId: int("monitoring_id").notNull(),
	handoverDate: timestamp("handover_date", { mode: 'string' }),
	handoverDescription: text("handover_description"),
	receivedBy: varchar("received_by", { length: 255 }),
	deliveredBy: varchar("delivered_by", { length: 255 }),
	defectLiabilityEndDate: timestamp("defect_liability_end_date", { mode: 'string' }),
	conditionNotes: text("condition_notes"),
	attachmentsUrl: text("attachments_url"),
	status: mysqlEnum(['draft','submitted','approved','rejected']).notNull().default('draft'),
	approvedBy: int("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull().defaultNow().onUpdateNow(),
	createdBy: int("created_by"),
	updatedBy: int("updated_by"),
},
(table) => [
	index("idx_final_handover_monitoring").on(table.monitoringId),
]);

export const implementationObservations = mysqlTable("implementation_observations", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int("organization_id").notNull(),
	monitoringId: int("monitoring_id").notNull(),
	observationDate: timestamp("observation_date", { mode: 'string' }).notNull().defaultNow(),
	observationType: mysqlEnum("observation_type", ['positive','negative','neutral']).notNull().default('neutral'),
	description: text().notNull(),
	actionRequired: text("action_required"),
	actionTaken: text("action_taken"),
	reportedBy: varchar("reported_by", { length: 255 }),
	status: mysqlEnum(['open','in_progress','resolved','closed']).notNull().default('open'),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolvedBy: int("resolved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull().defaultNow().onUpdateNow(),
	createdBy: int("created_by"),
	updatedBy: int("updated_by"),
},
(table) => [
	index("idx_observations_monitoring").on(table.monitoringId),
]);

// Contract Variations / Amendments
export const contractVariations = mysqlTable("contract_variations", {
  id: int().autoincrement().primaryKey().notNull(),
  organizationId: int().notNull(),
  operatingUnitId: int(),
  contractId: int().notNull(),
  variationNumber: varchar({ length: 100 }).notNull(),
  variationType: mysqlEnum('variationType', ['amendment', 'change_order', 'extension', 'reduction']).default('amendment').notNull(),
  description: text().notNull(),
  originalValue: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
  variationAmount: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
  newContractValue: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
  originalEndDate: timestamp({ mode: 'string' }),
  newEndDate: timestamp({ mode: 'string' }),
  reason: text(),
  status: mysqlEnum('status', ['draft', 'pending_approval', 'approved', 'rejected']).default('draft').notNull(),
  approvedBy: int(),
  approvedAt: timestamp({ mode: 'string' }),
  rejectionReason: text(),
  isDeleted: tinyint().default(0).notNull(),
  deletedAt: timestamp({ mode: 'string' }),
  deletedBy: int(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  createdBy: int(),
  updatedBy: int(),
}, (table) => [
  index("idx_cv_contract").on(table.contractId),
  index("idx_cv_org").on(table.organizationId),
]);


// ── Vendor Evaluation & Performance (IMS Standard Checklist) ──

export const vendorEvaluations = mysqlTable("vendor_evaluations", {
	id: int().autoincrement().primaryKey().notNull(),
	vendorId: int().notNull().references(() => vendors.id, { onDelete: "cascade" }),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" }),
	evaluatorId: int().references(() => users.id, { onDelete: "set null" }),
	evaluationDate: timestamp({ mode: 'string' }).notNull(),
	totalScore: decimal({ precision: 7, scale: 2 }),
	classification: mysqlEnum(['preferred','approved','conditional','rejected']),
	riskLevel: mysqlEnum(['low','medium','high','critical']),
	section1Score: decimal({ precision: 5, scale: 2 }).default('0'),
	section2Score: decimal({ precision: 5, scale: 2 }).default('0'),
	section3Score: decimal({ precision: 5, scale: 2 }).default('0'),
	section4Score: decimal({ precision: 5, scale: 2 }).default('0'),
	section5Score: decimal({ precision: 5, scale: 2 }).default('0'),
	section6Score: decimal({ precision: 5, scale: 2 }).default('0'),
	notes: text(),
	justification: text(),
	status: mysqlEnum(['draft','pending_compliance','pending_finance','pending_final','approved','rejected']).default('draft').notNull(),
	approvedBy: int().references(() => users.id, { onDelete: "set null" }),
	approvedAt: timestamp({ mode: 'string' }),
	version: int().default(1).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
}, (table) => [
	index("idx_ve_vendor").on(table.vendorId),
	index("idx_ve_org").on(table.organizationId),
	index("idx_ve_ou").on(table.operatingUnitId),
	index("idx_ve_status").on(table.status),
]);

export const vendorEvaluationItems = mysqlTable("vendor_evaluation_items", {
	id: int().autoincrement().primaryKey().notNull(),
	evaluationId: int().notNull().references(() => vendorEvaluations.id, { onDelete: "cascade" }),
	sectionNumber: int().notNull(),
	checklistItemKey: varchar({ length: 100 }).notNull(),
	checklistItemLabel: varchar({ length: 500 }).notNull(),
	maxScore: decimal({ precision: 5, scale: 2 }).notNull(),
	rating: int(),
	score: decimal({ precision: 5, scale: 2 }),
	notes: text(),
	documentUrls: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_vei_eval").on(table.evaluationId),
	index("idx_vei_section").on(table.sectionNumber),
]);

// ── Vendor Procurement Baselines (auto-created from Bid Evaluation) ──

export const vendorProcurementBaselines = mysqlTable("vendor_procurement_baselines", {
	id: int().autoincrement().primaryKey().notNull(),
	vendorId: int().notNull().references(() => vendors.id, { onDelete: "cascade" }),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" }),
	bidAnalysisId: int(),
	purchaseRequestId: int(),
	prNumber: varchar({ length: 100 }),
	cbaNumber: varchar({ length: 100 }),
	legalAdminScore: decimal({ precision: 5, scale: 2 }),
	experienceTechnicalScore: decimal({ precision: 5, scale: 2 }),
	operationalFinancialScore: decimal({ precision: 5, scale: 2 }),
	referencesScore: decimal({ precision: 5, scale: 2 }),
	totalBidAmount: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 10 }),
	qualificationOutcome: mysqlEnum(['qualified','disqualified','conditional']).default('qualified'),
	isFirstParticipation: tinyint().default(1),
	participationDate: timestamp({ mode: 'string' }).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
}, (table) => [
	index("idx_vpb_vendor").on(table.vendorId),
	index("idx_vpb_org").on(table.organizationId),
	index("idx_vpb_ba").on(table.bidAnalysisId),
]);

// ── Vendor Qualification Scores (Layer 1 — Vendor Master level) ──
// Stores the qualification checklist scores for each vendor.
// These scores auto-load into Bid Evaluation (Layer 2) as read-only.

export const vendorQualificationScores = mysqlTable("vendor_qualification_scores", {
	id: int().autoincrement().primaryKey().notNull(),
	vendorId: int().notNull().references(() => vendors.id, { onDelete: "cascade" }),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
	operatingUnitId: int().references(() => operatingUnits.id, { onDelete: "set null" }),
	evaluatorId: int().references(() => users.id, { onDelete: "set null" }),
	evaluationDate: timestamp({ mode: 'string' }).notNull(),

	// Section 1: Legal & Administrative (max 12)
	s1_companyRegistration: decimal({ precision: 5, scale: 2 }).default('0'),
	s1_taxCard: decimal({ precision: 5, scale: 2 }).default('0'),
	s1_insuranceCard: decimal({ precision: 5, scale: 2 }).default('0'),
	s1_signedDeclarations: decimal({ precision: 5, scale: 2 }).default('0'),
	s1_sanctionsScreening: decimal({ precision: 5, scale: 2 }).default('0'),
	section1Total: decimal({ precision: 5, scale: 2 }).default('0'),

	// Section 2: Experience & Technical Capacity (max 10)
	s2_companyProfile: decimal({ precision: 5, scale: 2 }).default('0'),
	s2_yearsExperience: decimal({ precision: 5, scale: 2 }).default('0'),
	s2_ingoExperience: decimal({ precision: 5, scale: 2 }).default('0'),
	section2Total: decimal({ precision: 5, scale: 2 }).default('0'),

	// Section 3: Operational Presence (max 2)
	s3_targetGeography: decimal({ precision: 5, scale: 2 }).default('0'),
	s3_bankAccountDetails: decimal({ precision: 5, scale: 2 }).default('0'),
	section3Total: decimal({ precision: 5, scale: 2 }).default('0'),

	// Section 4: References (max 6)
	s4_references: decimal({ precision: 5, scale: 2 }).default('0'),
	section4Total: decimal({ precision: 5, scale: 2 }).default('0'),

	// Grand total (max 30)
	totalScore: decimal({ precision: 5, scale: 2 }).default('0'),
	qualificationStatus: mysqlEnum(['qualified', 'not_qualified', 'conditional', 'pending']).default('pending'),

	notes: text(),

	// Custom sections/criteria added by the organization
	customSections: json('custom_sections'),

	// Expiry tracking
	validityMonths: int('validity_months').default(12).notNull(),
	expiryDate: timestamp('expiry_date', { mode: 'string' }),

	// Approval workflow (simplified: Draft → Logistics Review → Manager Approval → Approved/Rejected)
	approvalStatus: mysqlEnum('approval_status', ['draft', 'pending_procurement', 'pending_compliance', 'pending_finance', 'pending_final', 'pending_logistics', 'pending_manager', 'approved', 'rejected']).default('draft').notNull(),
	currentApprovalStage: varchar('current_approval_stage', { length: 50 }),
	// Legacy columns (kept for backward compat with old 4-stage data)
	procurementApprovedBy: int('procurement_approved_by'),
	procurementApprovedAt: timestamp('procurement_approved_at', { mode: 'string' }),
	procurementNotes: text('procurement_notes'),
	complianceApprovedBy: int('compliance_approved_by'),
	complianceApprovedAt: timestamp('compliance_approved_at', { mode: 'string' }),
	complianceNotes: text('compliance_notes'),
	financeApprovedBy: int('finance_approved_by'),
	financeApprovedAt: timestamp('finance_approved_at', { mode: 'string' }),
	financeNotes: text('finance_notes'),
	finalApprovedBy: int('final_approved_by'),
	finalApprovedAt: timestamp('final_approved_at', { mode: 'string' }),
	finalNotes: text('final_notes'),
	// Simplified workflow columns
	logisticsApprovedBy: int('logistics_approved_by'),
	logisticsApprovedAt: timestamp('logistics_approved_at', { mode: 'string' }),
	logisticsNotes: text('logistics_notes'),
	logisticsSignatureUrl: text('logistics_signature_url'),
	logisticsSignatureHash: varchar('logistics_signature_hash', { length: 128 }),
	managerApprovedBy: int('manager_approved_by'),
	managerApprovedAt: timestamp('manager_approved_at', { mode: 'string' }),
	managerNotes: text('manager_notes'),
	managerSignatureUrl: text('manager_signature_url'),
	managerSignatureHash: varchar('manager_signature_hash', { length: 128 }),

	version: int().default(1).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
}, (table) => [
	index("idx_vqs_vendor").on(table.vendorId),
	index("idx_vqs_org").on(table.organizationId),
	index("idx_vqs_ou").on(table.operatingUnitId),
	index("idx_vqs_status").on(table.qualificationStatus),
	index("idx_vqs_expiry").on(table.expiryDate),
	index("idx_vqs_approval").on(table.approvalStatus),
]);


// ============================================================
// Vendor Blacklist Management Module
// ============================================================

export const vendorBlacklistCases = mysqlTable("vendor_blacklist_cases", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	vendorId: int().notNull(),
	caseNumber: varchar({ length: 50 }).notNull(),
	status: mysqlEnum([
		'draft',
		'submitted',
		'under_validation',
		'pending_approval',
		'approved',
		'rejected',
		'revoked',
		'expired'
	]).default('draft').notNull(),
	reasonCategory: mysqlEnum([
		'fraud_falsified_docs',
		'corruption_bribery',
		'sanctions_screening_failure',
		'repeated_non_performance',
		'contract_abandonment',
		'repeated_delivery_failure',
		'refusal_correct_defects',
		'false_declarations',
		'conflict_of_interest',
		'other'
	]).notNull(),
	detailedJustification: text().notNull(),
	incidentDate: date({ mode: 'string' }),
	relatedReference: varchar({ length: 255 }),
	recommendedDuration: varchar({ length: 100 }),
	blacklistStartDate: date({ mode: 'string' }),
	reviewDate: date({ mode: 'string' }),
	expiryDate: date({ mode: 'string' }),
	additionalComments: text(),
	revocationReason: text(),
	revokedAt: timestamp({ mode: 'string' }),
	revokedBy: int(),
	submittedAt: timestamp({ mode: 'string' }),
	submittedBy: int(),
	validatedAt: timestamp({ mode: 'string' }),
	validatedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	approvedBy: int(),
	rejectedAt: timestamp({ mode: 'string' }),
	rejectedBy: int(),
	rejectionReason: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
}, (table) => [
	index("idx_vbc_vendor").on(table.vendorId),
	index("idx_vbc_org").on(table.organizationId),
	index("idx_vbc_ou").on(table.operatingUnitId),
	index("idx_vbc_status").on(table.status),
	index("idx_vbc_case_number").on(table.caseNumber),
]);

export const vendorBlacklistEvidence = mysqlTable("vendor_blacklist_evidence", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	caseId: int().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileUrl: text().notNull(),
	fileKey: varchar({ length: 500 }),
	fileType: varchar({ length: 100 }),
	fileSize: int(),
	description: text(),
	uploadedBy: int().notNull(),
	uploadedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
}, (table) => [
	index("idx_vbe_case").on(table.caseId),
	index("idx_vbe_org").on(table.organizationId),
]);

export const vendorBlacklistSignatures = mysqlTable("vendor_blacklist_signatures", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	caseId: int().notNull(),
	signerId: int().notNull(),
	signerName: varchar({ length: 255 }).notNull(),
	signerRole: varchar({ length: 100 }).notNull(),
	signatureImageUrl: text(),
	signatureImageKey: varchar({ length: 500 }),
	signatureHash: varchar({ length: 512 }),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	signedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	status: mysqlEnum(['active', 'revoked']).default('active').notNull(),
	revocationReason: text(),
	revokedAt: timestamp({ mode: 'string' }),
	revokedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_vbs_case").on(table.caseId),
	index("idx_vbs_signer").on(table.signerId),
	index("idx_vbs_org").on(table.organizationId),
	index("idx_vbs_status").on(table.status),
]);

export const vendorBlacklistAuditLog = mysqlTable("vendor_blacklist_audit_log", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	caseId: int().notNull(),
	userId: int().notNull(),
	userName: varchar({ length: 255 }),
	actionType: mysqlEnum([
		'case_created',
		'case_updated',
		'case_submitted',
		'validation_performed',
		'approval_signed',
		'case_approved',
		'case_rejected',
		'case_revoked',
		'case_expired',
		'evidence_uploaded',
		'evidence_removed',
		'signature_added',
		'signature_revoked',
		'comment_added'
	]).notNull(),
	previousStatus: varchar({ length: 50 }),
	newStatus: varchar({ length: 50 }),
	details: text(),
	ipAddress: varchar({ length: 45 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_vbal_case").on(table.caseId),
	index("idx_vbal_user").on(table.userId),
	index("idx_vbal_org").on(table.organizationId),
	index("idx_vbal_action").on(table.actionType),
]);


// ── Blacklist Workflow Configuration (per-organization) ──
export const blacklistWorkflowConfig = mysqlTable("blacklist_workflow_config", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
	// Workflow stages configuration (JSON array of stage definitions)
	// Default: ["validation", "approval"]
	// Each stage: { key: string, label: string, labelAr: string, requiredRoles: string[], requireSignature: boolean }
	stages: text().notNull(),
	// Whether submitter signature is required
	requireSubmitterSignature: tinyint().default(1).notNull(),
	// Whether approver signature is required
	requireApproverSignature: tinyint().default(1).notNull(),
	// Auto-expiry enabled
	autoExpiryEnabled: tinyint().default(1).notNull(),
	// Default blacklist duration (in months, 0 = permanent)
	defaultDurationMonths: int().default(6).notNull(),
	// Notification settings
	notifyOnSubmission: tinyint().default(1).notNull(),
	notifyOnApproval: tinyint().default(1).notNull(),
	notifyOnRejection: tinyint().default(1).notNull(),
	notifyOnExpiry: tinyint().default(1).notNull(),
	// Metadata
	createdBy: int(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_bwc_org").on(table.organizationId),
]);

// ── Checklist Section Templates ──
export const checklistSectionTemplates = mysqlTable("checklist_section_templates", {
  id: int().autoincrement().primaryKey().notNull(),
  organizationId: int().notNull(),
  operatingUnitId: int(),
  templateName: varchar({ length: 255 }).notNull(),
  templateNameAr: varchar({ length: 255 }),
  description: text(),
  sections: json().$type<Array<{
	name: string;
	nameAr?: string;
	maxScore: number;
	criteria: Array<{
	  name: string;
	  nameAr?: string;
	  maxScore: number;
	}>;
  }>>().notNull(),
  isDefault: tinyint().default(0),
  createdBy: int(),
  createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
  deletedAt: timestamp({ mode: 'string' }),
  deletedBy: int(),
});


// ============================================================================
// DOCUMENT MANAGEMENT SYSTEM - VERSIONING, AUDIT, RETENTION, GOVERNANCE
// ============================================================================

/**
 * Document Versions Table
 * Tracks all versions of a document for version history and rollback capability
 */
export const documentVersions = mysqlTable("document_versions", {
	id: int().autoincrement().primaryKey().notNull(),
	documentId: varchar({ length: 100 }).notNull(),
	versionNumber: int().notNull(),
	fileName: varchar({ length: 500 }).notNull(),
	filePath: text().notNull(),
	fileType: varchar({ length: 50 }).notNull(),
	fileSize: bigint({ mode: "number" }).notNull(),
	mimeType: varchar({ length: 100 }),
	
	// Version metadata
	changeDescription: text(),
	changeDescriptionAr: text(),
	changeType: mysqlEnum(['created', 'updated', 'restored', 'archived']).default('created').notNull(),
	
	// Audit
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	
	// Organization isolation
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
}, (table) => [
	index("idx_doc_versions_document_id").on(table.documentId),
	index("idx_doc_versions_org_ou").on(table.organizationId, table.operatingUnitId),
	index("idx_doc_versions_created_by").on(table.createdBy),
]);

/**
 * Document Audit Logs Table
 * Comprehensive audit trail for all document operations (view, download, share, delete, etc.)
 */
export const documentAuditLogs = mysqlTable("document_audit_logs", {
	id: int().autoincrement().primaryKey().notNull(),
	documentId: varchar({ length: 100 }).notNull(),
	
	// Action details
	action: mysqlEnum([
		'created',
		'updated',
		'viewed',
		'downloaded',
		'shared',
		'deleted',
		'restored',
		'moved',
		'renamed',
		'permission_changed',
		'classified',
		'retention_applied',
		'hold_applied',
		'hold_released',
		'exported',
		'printed'
	]).notNull(),
	
	// Action metadata
	actionDescription: text(),
	actionDescriptionAr: text(),
	previousValue: text(),
	newValue: text(),
	
	// IP and user agent tracking
	userIp: varchar({ length: 45 }),
	userAgent: text(),
	
	// Audit
	performedBy: int().notNull(),
	performedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	
	// Organization isolation
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
}, (table) => [
	index("idx_audit_document_id").on(table.documentId),
	index("idx_audit_action").on(table.action),
	index("idx_audit_performed_by").on(table.performedBy),
	index("idx_audit_performed_at").on(table.performedAt),
	index("idx_audit_org_ou").on(table.organizationId, table.operatingUnitId),
]);

/**
 * Document Retention Policies Table
 * Defines retention rules and legal holds for documents
 */
export const documentRetentionPolicies = mysqlTable("document_retention_policies", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int(),
	
	// Policy details
	policyCode: varchar({ length: 100 }).notNull(),
	policyName: varchar({ length: 255 }).notNull(),
	policyNameAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	
	// Retention settings
	retentionYears: int().notNull(),
	retentionMonths: int().default(0).notNull(),
	retentionDays: int().default(0).notNull(),
	disposalAction: mysqlEnum(['delete', 'archive', 'transfer']).default('delete').notNull(),
	
	// Scope
	applicableDocumentTypes: text(), // JSON array of document types
	applicableWorkspaces: text(), // JSON array of workspaces
	applicableModules: text(), // JSON array of modules
	
	// Compliance
	complianceRule: varchar({ length: 255 }),
	complianceRuleAr: varchar({ length: 255 }),
	regulatoryRequirement: text(),
	regulatoryRequirementAr: text(),
	
	// Status
	isActive: tinyint().default(1).notNull(),
	
	// Metadata
	createdBy: int(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_retention_org_ou").on(table.organizationId, table.operatingUnitId),
	index("idx_retention_active").on(table.isActive),
]);

/**
 * Document Legal Holds Table
 * Tracks legal holds on documents to prevent deletion during litigation/investigation
 */
export const documentLegalHolds = mysqlTable("document_legal_holds", {
	id: int().autoincrement().primaryKey().notNull(),
	documentId: varchar({ length: 100 }).notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	
	// Hold details
	holdCode: varchar({ length: 100 }).notNull(),
	holdReason: varchar({ length: 255 }).notNull(),
	holdReasonAr: varchar({ length: 255 }),
	description: text(),
	descriptionAr: text(),
	
	// Hold period
	holdStartDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	holdEndDate: timestamp({ mode: 'string' }),
	holdStatus: mysqlEnum(['active', 'released', 'expired']).default('active').notNull(),
	
	// Case/litigation reference
	caseReference: varchar({ length: 255 }),
	litigationParty: varchar({ length: 255 }),
	
	// Metadata
	createdBy: int().notNull(),
	releasedBy: int(),
	releasedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_hold_document_id").on(table.documentId),
	index("idx_hold_status").on(table.holdStatus),
	index("idx_hold_org_ou").on(table.organizationId, table.operatingUnitId),
]);

/**
 * Document Classification Table
 * Tracks document classification levels and sensitivity for governance
 */
export const documentClassifications = mysqlTable("document_classifications", {
	id: int().autoincrement().primaryKey().notNull(),
	documentId: varchar({ length: 100 }).notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	
	// Classification level
	classificationLevel: mysqlEnum([
		'public',
		'internal',
		'confidential',
		'restricted',
		'secret'
	]).default('internal').notNull(),
	
	// Sensitivity tags
	sensitivityTags: text(), // JSON array of tags
	
	// Access restrictions
	requiresApprovalToView: tinyint().default(0).notNull(),
	requiresApprovalToDownload: tinyint().default(0).notNull(),
	requiresApprovalToShare: tinyint().default(0).notNull(),
	
	// Expiry
	classificationExpiryDate: timestamp({ mode: 'string' }),
	autoDowngradeToPublic: tinyint().default(0).notNull(),
	
	// Metadata
	classifiedBy: int().notNull(),
	classificationReason: text(),
	classificationReasonAr: text(),
	classifiedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	
	// Reclassification audit
	reclassifiedBy: int(),
	reclassifiedAt: timestamp({ mode: 'string' }),
	reclassificationReason: text(),
	reclassificationReasonAr: text(),
}, (table) => [
	index("idx_classification_document_id").on(table.documentId),
	index("idx_classification_level").on(table.classificationLevel),
	index("idx_classification_org_ou").on(table.organizationId, table.operatingUnitId),
]);

/**
 * Document Access Log Table
 * Tracks who accessed documents and when (for compliance and audit)
 */
export const documentAccessLogs = mysqlTable("document_access_logs", {
	id: int().autoincrement().primaryKey().notNull(),
	documentId: varchar({ length: 100 }).notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	
	// Access details
	accessType: mysqlEnum(['view', 'download', 'print', 'share', 'export']).notNull(),
	accessReason: varchar({ length: 255 }),
	accessReasonAr: varchar({ length: 255 }),
	
	// User info
	accessedBy: int().notNull(),
	accessedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	
	// Device/location info
	userIp: varchar({ length: 45 }),
	userAgent: text(),
	deviceType: varchar({ length: 50 }),
	
	// Shared with (if applicable)
	sharedWith: int(),
	
	// Duration (for view access)
	viewDurationSeconds: int(),
}, (table) => [
	index("idx_access_document_id").on(table.documentId),
	index("idx_access_accessed_by").on(table.accessedBy),
	index("idx_access_accessed_at").on(table.accessedAt),
	index("idx_access_org_ou").on(table.organizationId, table.operatingUnitId),
]);

/**
 * Document Metadata Table
 * Stores extensible metadata for documents (custom fields, tags, properties)
 */
export const documentMetadata = mysqlTable("document_metadata", {
	id: int().autoincrement().primaryKey().notNull(),
	documentId: varchar({ length: 100 }).notNull(),
	organizationId: int().notNull(),
	operatingUnitId: int().notNull(),
	
	// Standard metadata
	title: varchar({ length: 500 }),
	titleAr: varchar({ length: 500 }),
	description: text(),
	descriptionAr: text(),
	author: varchar({ length: 255 }),
	keywords: text(), // JSON array
	tags: text(), // JSON array
	
	// Custom metadata
	customFields: json().$type<Record<string, any>>(),
	
	// Document properties
	language: varchar({ length: 10 }).default('en'),
	pageCount: int(),
	wordCount: int(),
	
	// Metadata audit
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int(),
}, (table) => [
	index("idx_metadata_document_id").on(table.documentId),
	index("idx_metadata_org_ou").on(table.organizationId, table.operatingUnitId),
]);

// ============================================================================
// Authentication & Security Tables
// ============================================================================

// Two-Factor Authentication (TOTP & SMS)
export const twoFactorAuth = mysqlTable("two_factor_auth", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	organizationId: int().notNull(),
	method: mysqlEnum(['totp', 'sms']).notNull(), // TOTP or SMS
	secret: varchar({ length: 255 }).notNull(), // Encrypted TOTP secret
	phoneNumber: varchar({ length: 20 }), // For SMS method
	isEnabled: tinyint().default(0).notNull(),
	isVerified: tinyint().default(0).notNull(),
	backupCodes: json().$type<string[]>(), // Array of backup codes (hashed)
	lastUsedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
}, (table) => [
	index("idx_2fa_user_org").on(table.userId, table.organizationId),
	index("idx_2fa_method").on(table.method),
]);

// Email Verification Tokens
export const emailVerificationTokens = mysqlTable("email_verification_tokens", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	email: varchar({ length: 320 }).notNull(),
	token: varchar({ length: 255 }).notNull().unique(),
	tokenType: mysqlEnum(['otp', 'magic_link']).notNull(),
	otp: varchar({ length: 10 }), // 6-digit OTP
	isVerified: tinyint().default(0).notNull(),
	attemptCount: int().default(0).notNull(),
	maxAttempts: int().default(5).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	verifiedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_email_token_user").on(table.userId),
	index("idx_email_token_email").on(table.email),
	index("idx_email_token_type").on(table.tokenType),
]);

// SAML Sessions
export const samlSessions = mysqlTable("saml_sessions", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int(),
	organizationId: int().notNull(),
	samlProvider: mysqlEnum(['okta', 'azure_ad', 'generic']).notNull(),
	samlNameId: varchar({ length: 255 }).notNull(),
	samlSessionIndex: varchar({ length: 255 }),
	samlAttributes: json().$type<Record<string, any>>(), // Store SAML attributes
	isActive: tinyint().default(1).notNull(),
	lastAuthenticatedAt: timestamp({ mode: 'string' }),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_saml_user_org").on(table.userId, table.organizationId),
	index("idx_saml_provider").on(table.samlProvider),
	index("idx_saml_name_id").on(table.samlNameId),
]);

// 2FA Challenge Sessions (for tracking active 2FA challenges)
export const twoFactorChallenges = mysqlTable("two_factor_challenges", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	organizationId: int().notNull(),
	challengeId: varchar({ length: 255 }).notNull().unique(),
	method: mysqlEnum(['totp', 'sms']).notNull(),
	code: varchar({ length: 10 }), // The code sent/generated
	attemptCount: int().default(0).notNull(),
	maxAttempts: int().default(3).notNull(),
	isVerified: tinyint().default(0).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	verifiedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_2fa_challenge_user").on(table.userId),
	index("idx_2fa_challenge_id").on(table.challengeId),
]);

// Account Recovery Requests
export const accountRecoveryRequests = mysqlTable("account_recovery_requests", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	organizationId: int().notNull(),
	email: varchar({ length: 320 }).notNull(),
	recoveryMethod: mysqlEnum(['backup_code', 'email', 'support']).notNull(),
	recoveryToken: varchar({ length: 255 }).notNull().unique(),
	backupCodeUsed: varchar({ length: 255 }), // Which backup code was used (hashed)
	status: mysqlEnum(['pending', 'verified', 'completed', 'failed', 'expired']).default('pending').notNull(),
	attemptCount: int().default(0).notNull(),
	maxAttempts: int().default(3).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	verifiedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	reason: text(), // Reason for recovery (e.g., "Lost phone", "Forgot password")
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_recovery_user_org").on(table.userId, table.organizationId),
	index("idx_recovery_status").on(table.status),
	index("idx_recovery_token").on(table.recoveryToken),
]);

// SAML IdP Configuration (per organization)
export const samlIdpConfigurations = mysqlTable("saml_idp_configurations", {
	id: int().autoincrement().primaryKey().notNull(),
	organizationId: int().notNull(),
	provider: mysqlEnum(['okta', 'azure_ad', 'generic']).notNull(),
	name: varchar({ length: 255 }).notNull(),
	entityId: varchar({ length: 255 }).notNull(),
	singleSignOnUrl: varchar({ length: 255 }).notNull(),
	singleLogoutUrl: varchar({ length: 255 }),
	certificate: text().notNull(), // IdP certificate
	metadataUrl: varchar({ length: 255 }), // For dynamic metadata
	
	// Provider-specific fields
	oktaDomain: varchar({ length: 255 }), // For Okta
	azureTenantId: varchar({ length: 255 }), // For Azure AD
	azureClientId: varchar({ length: 255 }), // For Azure AD
	
	// Configuration
	isEnabled: tinyint().default(1).notNull(),
	autoProvisionUsers: tinyint().default(1).notNull(),
	defaultRole: varchar({ length: 64 }).default('user'),
	attributeMapping: json().$type<Record<string, string>>(), // Map SAML attributes to user fields
	
	// Audit
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int(),
	updatedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
}, (table) => [
	index("idx_saml_config_org").on(table.organizationId),
	index("idx_saml_config_provider").on(table.provider),
	index("idx_saml_config_enabled").on(table.isEnabled),
]);

// ─── Custom Type Exports ───────────────────────────────────────────────────────
// Drizzle-inferred insert/select types used throughout the server layer

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type User = SelectUser;

export type InsertOrganization = typeof organizations.$inferInsert;
export type SelectOrganization = typeof organizations.$inferSelect;

export type InsertOperatingUnit = typeof operatingUnits.$inferInsert;
export type SelectOperatingUnit = typeof operatingUnits.$inferSelect;

export type InsertUserOrganization = typeof userOrganizations.$inferInsert;
export type SelectUserOrganization = typeof userOrganizations.$inferSelect;

export type InsertUserOperatingUnit = typeof userOperatingUnits.$inferInsert;
export type SelectUserOperatingUnit = typeof userOperatingUnits.$inferSelect;

export type InsertMicrosoftIntegration = typeof microsoftIntegrations.$inferInsert;
export type SelectMicrosoftIntegration = typeof microsoftIntegrations.$inferSelect;

export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type SelectAuditLog = typeof auditLogs.$inferSelect;

export type InsertInvitation = typeof invitations.$inferInsert;
export type SelectInvitation = typeof invitations.$inferSelect;

// ─── Request Access Requests ───────────────────────────────────────────────────
// Stores access requests submitted from the Sign-In page by users who don't have accounts
export const requestAccessRequests = mysqlTable("request_access_requests", {
  id: varchar("id", { length: 50 }).primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  organizationName: varchar("organization_name", { length: 255 }),
  operatingUnitName: varchar("operating_unit_name", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  reasonForAccess: text("reason_for_access"),
  phoneNumber: varchar("phone_number", { length: 50 }),
  organizationId: int("organization_id"),
  operatingUnitId: int("operating_unit_id"),
  requestType: varchar("request_type", { length: 50 }).notNull().default("organization_user"), // organization_user | platform_admin
  requestedAuthProvider: varchar("requested_auth_provider", { length: 50 }), // microsoft | local
  requestedAccountType: varchar("requested_account_type", { length: 50 }), // personal | shared
  requestedRole: varchar("requested_role", { length: 100 }),
  provisioningMode: varchar("provisioning_mode", { length: 50 }), // microsoft_mapping_only | local_account_created
  status: varchar("status", { length: 50 }).notNull().default("new"), // new | under_review | approved | rejected | provisioned
  reviewDecision: varchar("review_decision", { length: 50 }), // approved | rejected | pending_info
  reviewedBy: varchar("reviewed_by", { length: 100 }),
  reviewedAt: datetime("reviewed_at"),
  reviewNotes: text("review_notes"),
  reviewComments: text("review_comments"),
  routedToUserId: int("routed_to_user_id"), // User ID of org admin or platform admin
  routedToRole: varchar("routed_to_role", { length: 50 }), // org_admin | platform_admin
  routedAt: datetime("routed_at"),
  fallbackToPlatformAdmin: tinyint("fallback_to_platform_admin").default(0),
  provisionedUserId: int("provisioned_user_id"), // User ID of the newly created account
  provisionedAt: datetime("provisioned_at"),
  createdAt: datetime("created_at").notNull(),
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  updatedAt: datetime("updated_at").notNull(),
  updatedBy: varchar("updated_by", { length: 100 }).notNull(),
  deletedAt: datetime("deleted_at"),
  deletedBy: varchar("deleted_by", { length: 100 }),
});

export type InsertRequestAccessRequest = typeof requestAccessRequests.$inferInsert;
export type SelectRequestAccessRequest = typeof requestAccessRequests.$inferSelect;


/**
 * Email Outbox Table
 * 
 * Stores emails that need to be sent asynchronously with retry logic.
 * The background worker processes this queue and sends emails via Microsoft Graph API.
 */
export const emailOutbox = mysqlTable("email_outbox", {
  id: int().autoincrement().primaryKey().notNull(),
  organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  templateKey: varchar({ length: 100 }).notNull(),
  recipientEmail: varchar({ length: 255 }).notNull(),
  recipientName: varchar({ length: 255 }),
  subject: varchar({ length: 255 }).notNull(),
  bodyHtml: longtextString().notNull(),
  bodyText: longtextString(),
  status: mysqlEnum(["pending", "sending", "sent", "failed", "dead_letter"]).default("pending").notNull(),
  retryCount: int().default(0).notNull(),
  maxRetries: int().default(5).notNull(),
  lastError: text(),
  errorCode: varchar({ length: 50 }),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  sentAt: timestamp({ mode: "string" }),
  nextRetryAt: timestamp({ mode: "string" }),
  completedAt: timestamp({ mode: "string" }),
  metadata: json().$type<Record<string, any>>(),
}, (table) => ({
  organizationIdIdx: index("email_outbox_organization_id_idx").on(table.organizationId),
  statusIdx: index("email_outbox_status_idx").on(table.status),
  nextRetryAtIdx: index("email_outbox_next_retry_at_idx").on(table.nextRetryAt),
  createdAtIdx: index("email_outbox_created_at_idx").on(table.createdAt),
}));

export type InsertEmailOutbox = typeof emailOutbox.$inferInsert;
export type SelectEmailOutbox = typeof emailOutbox.$inferSelect;

/**
 * Email Dead Letter Queue
 * 
 * Stores emails that have failed permanently (exceeded max retries).
 * Allows for manual review and reprocessing if needed.
 */
export const emailDeadLetterQueue = mysqlTable("email_dead_letter_queue", {
  id: int().autoincrement().primaryKey().notNull(),
  organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  outboxId: int().references(() => emailOutbox.id, { onDelete: "set null" }),
  templateKey: varchar({ length: 100 }).notNull(),
  recipientEmail: varchar({ length: 255 }).notNull(),
  recipientName: varchar({ length: 255 }),
  subject: varchar({ length: 255 }).notNull(),
  bodyHtml: longtextString().notNull(),
  bodyText: longtextString(),
  failureReason: text().notNull(),
  failureCode: varchar({ length: 50 }),
  retryCount: int().default(0).notNull(),
  movedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  reviewedAt: timestamp({ mode: "string" }),
  reviewedBy: int(),
  reviewNotes: text(),
  metadata: json().$type<Record<string, any>>(),
}, (table) => ({
  organizationIdIdx: index("email_dlq_organization_id_idx").on(table.organizationId),
  movedAtIdx: index("email_dlq_moved_at_idx").on(table.movedAt),
}));

export type InsertEmailDeadLetterQueue = typeof emailDeadLetterQueue.$inferInsert;
export type SelectEmailDeadLetterQueue = typeof emailDeadLetterQueue.$inferSelect;


/**
 * Email Webhook Events
 * 
 * Stores webhook events received from email providers (SendGrid, Mailgun, AWS SES, etc.)
 * Tracks delivery status updates, bounces, complaints, and other email events.
 */
export const emailWebhookEvents = mysqlTable("email_webhook_events", {
  id: int().autoincrement().primaryKey().notNull(),
  organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  provider: mysqlEnum(["sendgrid", "mailgun", "aws_ses", "microsoft_365", "manus_custom"]).notNull(),
  eventType: varchar({ length: 50 }).notNull(), // delivered, bounce, complaint, open, click, etc.
  outboxId: int().references(() => emailOutbox.id, { onDelete: "set null" }),
  recipientEmail: varchar({ length: 255 }).notNull(),
  messageId: varchar({ length: 255 }),
  status: mysqlEnum(["processed", "failed", "pending"]).default("processed").notNull(),
  eventData: json().$type<Record<string, any>>(),
  errorMessage: text(),
  processedAt: timestamp({ mode: "string" }),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
}, (table) => ({
  organizationIdIdx: index("email_webhook_events_organization_id_idx").on(table.organizationId),
  providerIdx: index("email_webhook_events_provider_idx").on(table.provider),
  eventTypeIdx: index("email_webhook_events_type_idx").on(table.eventType),
  createdAtIdx: index("email_webhook_events_created_at_idx").on(table.createdAt),
}));

export type InsertEmailWebhookEvent = typeof emailWebhookEvents.$inferInsert;
export type SelectEmailWebhookEvent = typeof emailWebhookEvents.$inferSelect;


/**
 * Email Provider Configuration
 * 
 * Stores encrypted API keys and configuration for email delivery providers.
 * Supports SendGrid, Mailgun, and AWS SES with secure key storage.
 */
export const emailProviderConfig = mysqlTable("email_provider_config", {
  id: int().autoincrement().primaryKey().notNull(),
  organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  provider: mysqlEnum(["sendgrid", "mailgun", "aws_ses"]).notNull(),
  // Encrypted API keys stored as encrypted strings
  apiKey: text().notNull(), // Encrypted with AES-256
  apiKeyLastRotated: timestamp({ mode: "string" }),
  // Provider-specific configuration
  mailgunDomain: varchar({ length: 255 }), // For Mailgun
  awsRegion: varchar({ length: 50 }), // For AWS SES (e.g., us-east-1)
  awsAccessKeyId: text(), // Encrypted for AWS SES
  awsSecretAccessKey: text(), // Encrypted for AWS SES
  // Webhook configuration
  webhookUrl: varchar({ length: 500 }),
  webhookSigningKey: text(), // Encrypted
  isActive: tinyint().default(1).notNull(),
  isVerified: tinyint().default(0).notNull(), // Test connection successful
  lastTestAt: timestamp({ mode: "string" }),
  lastTestStatus: mysqlEnum(["success", "failed"]),
  lastTestError: text(),
  // Audit trail
  createdBy: int().notNull(),
  updatedBy: int(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  organizationProviderIdx: index("email_provider_config_org_provider_idx").on(table.organizationId, table.provider),
  organizationIdIdx: index("email_provider_config_organization_id_idx").on(table.organizationId),
  providerIdx: index("email_provider_config_provider_idx").on(table.provider),
}));

export type InsertEmailProviderConfig = typeof emailProviderConfig.$inferInsert;
export type SelectEmailProviderConfig = typeof emailProviderConfig.$inferSelect;


/**
 * Email Delivery Status
 * 
 * Tracks real-time delivery status changes for emails.
 * Updates status based on webhook events from providers.
 */
export const emailDeliveryStatus = mysqlTable("email_delivery_status", {
  id: int().autoincrement().primaryKey().notNull(),
  organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  outboxId: int().notNull().references(() => emailOutbox.id, { onDelete: "cascade" }),
  provider: mysqlEnum(["sendgrid", "mailgun", "aws_ses", "microsoft_365", "manus_custom"]).notNull(),
  currentStatus: mysqlEnum(["queued", "sending", "sent", "delivered", "bounced", "complained", "opened", "clicked", "failed"]).default("queued").notNull(),
  previousStatus: mysqlEnum(["queued", "sending", "sent", "delivered", "bounced", "complained", "opened", "clicked", "failed"]),
  // Bounce details
  bounceType: mysqlEnum(["hard", "soft", "unknown"]), // hard, soft, or unknown
  bounceSubtype: varchar({ length: 50 }), // permanent, transient, undetermined, etc.
  // Complaint details
  complaintType: mysqlEnum(["spam", "abuse", "auth_failure", "not_spam"]),
  // Delivery details
  deliveredAt: timestamp({ mode: "string" }),
  openedAt: timestamp({ mode: "string" }),
  clickedAt: timestamp({ mode: "string" }),
  // Event tracking
  lastEventAt: timestamp({ mode: "string" }),
  lastEventType: varchar({ length: 50 }),
  eventCount: int().default(0).notNull(),
  // Metadata
  metadata: json().$type<Record<string, any>>(),
  statusChangedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  outboxIdIdx: index("email_delivery_status_outbox_id_idx").on(table.outboxId),
  organizationIdIdx: index("email_delivery_status_organization_id_idx").on(table.organizationId),
  currentStatusIdx: index("email_delivery_status_current_status_idx").on(table.currentStatus),
  statusChangedAtIdx: index("email_delivery_status_status_changed_at_idx").on(table.statusChangedAt),
}));

export type InsertEmailDeliveryStatus = typeof emailDeliveryStatus.$inferInsert;
export type SelectEmailDeliveryStatus = typeof emailDeliveryStatus.$inferSelect;


/**
 * Email Template Version
 * 
 * Maintains version history for email templates with change tracking.
 * Allows rollback and A/B testing capabilities.
 */
export const emailTemplateVersion = mysqlTable("email_template_version", {
  id: int().autoincrement().primaryKey().notNull(),
  organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  templateId: int().notNull().references(() => emailTemplates.id, { onDelete: "cascade" }),
  versionNumber: int().notNull(),
  templateKey: varchar({ length: 100 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  nameAr: varchar({ length: 255 }),
  subject: varchar({ length: 500 }).notNull(),
  subjectAr: varchar({ length: 500 }),
  bodyHtml: longtext().notNull(),
  bodyHtmlAr: longtext(),
  // Version metadata
  changeDescription: text(), // What changed in this version
  changeDescriptionAr: text(),
  isPublished: tinyint().default(0).notNull(), // Is this the active version?
  publishedAt: timestamp({ mode: "string" }),
  publishedBy: int(),
  // A/B Testing
  isABTestVersion: tinyint().default(0).notNull(),
  abTestId: int(), // Reference to A/B test this version belongs to
  trafficPercentage: decimal({ precision: 5, scale: 2 }), // For A/B test versions
  // Metrics
  sentCount: int().default(0).notNull(),
  deliveredCount: int().default(0).notNull(),
  openedCount: int().default(0).notNull(),
  clickedCount: int().default(0).notNull(),
  bouncedCount: int().default(0).notNull(),
  complainedCount: int().default(0).notNull(),
  // Audit trail
  createdBy: int().notNull(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  templateIdVersionIdx: index("email_template_version_template_id_version_idx").on(table.templateId, table.versionNumber),
  organizationIdIdx: index("email_template_version_organization_id_idx").on(table.organizationId),
  templateIdIdx: index("email_template_version_template_id_idx").on(table.templateId),
  isPublishedIdx: index("email_template_version_is_published_idx").on(table.isPublished),
  abTestIdIdx: index("email_template_version_ab_test_id_idx").on(table.abTestId),
}));

export type InsertEmailTemplateVersion = typeof emailTemplateVersion.$inferInsert;
export type SelectEmailTemplateVersion = typeof emailTemplateVersion.$inferSelect;


/**
 * Email Template A/B Test
 * 
 * Configuration and results for A/B testing email templates.
 * Tracks which versions are being tested and their performance metrics.
 */
export const emailTemplateABTest = mysqlTable("email_template_ab_test", {
  id: int().autoincrement().primaryKey().notNull(),
  organizationId: int().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  templateId: int().notNull().references(() => emailTemplates.id, { onDelete: "cascade" }),
  testName: varchar({ length: 255 }).notNull(),
  testNameAr: varchar({ length: 255 }),
  testDescription: text(),
  testDescriptionAr: text(),
  // Version references
  versionAId: int().notNull().references(() => emailTemplateVersion.id, { onDelete: "cascade" }),
  versionBId: int().notNull().references(() => emailTemplateVersion.id, { onDelete: "cascade" }),
  // Test configuration
  status: mysqlEnum(["draft", "running", "completed", "cancelled"]).default("draft").notNull(),
  trafficSplitPercentage: decimal({ precision: 5, scale: 2 }).default("50.00").notNull(), // % for version A, rest for B
  startedAt: timestamp({ mode: "string" }),
  endedAt: timestamp({ mode: "string" }),
  // Results
  winnerId: int(), // Which version won (versionAId or versionBId)
  winnerMetric: mysqlEnum(["open_rate", "click_rate", "conversion_rate", "bounce_rate"]),
  // Metrics for version A
  versionASentCount: int().default(0).notNull(),
  versionAOpenCount: int().default(0).notNull(),
  versionAClickCount: int().default(0).notNull(),
  versionAConversionCount: int().default(0).notNull(),
  // Metrics for version B
  versionBSentCount: int().default(0).notNull(),
  versionBOpenCount: int().default(0).notNull(),
  versionBClickCount: int().default(0).notNull(),
  versionBConversionCount: int().default(0).notNull(),
  // Statistical significance
  confidenceLevel: decimal({ precision: 5, scale: 2 }), // 0-100, confidence that winner is statistically significant
  pValue: decimal({ precision: 10, scale: 8 }), // p-value from statistical test
  // Audit trail
  createdBy: int().notNull(),
  updatedBy: int(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  templateIdIdx: index("email_template_ab_test_template_id_idx").on(table.templateId),
  organizationIdIdx: index("email_template_ab_test_organization_id_idx").on(table.organizationId),
  statusIdx: index("email_template_ab_test_status_idx").on(table.status),
  winnerIdIdx: index("email_template_ab_test_winner_id_idx").on(table.winnerId),
}));

export type InsertEmailTemplateABTest = typeof emailTemplateABTest.$inferInsert;
export type SelectEmailTemplateABTest = typeof emailTemplateABTest.$inferSelect;

// ============================================================================
// Platform Email Settings
// ============================================================================
// Stores the platform-level M365 email configuration used for sending
// system emails (onboarding links, notifications) when an organization
// has not yet configured its own email provider.
// ============================================================================
export const platformEmailSettings = mysqlTable("platform_email_settings", {
  id: int().autoincrement().primaryKey().notNull(),
  // Provider type - currently only m365 is supported for platform-level sending
  providerType: mysqlEnum('provider_type', ['m365', 'smtp', 'disabled']).default('disabled').notNull(),
  // M365 / Azure AD credentials
  tenantId: varchar('tenant_id', { length: 255 }),
  clientId: varchar('client_id', { length: 255 }),
  clientSecret: text('client_secret'), // encrypted in production
  // Sender identity
  senderEmail: varchar('sender_email', { length: 320 }),
  senderName: varchar('sender_name', { length: 255 }).default('IMS Platform'),
  replyToEmail: varchar('reply_to_email', { length: 320 }),
  // SMTP fallback (if providerType = smtp)
  smtpHost: varchar('smtp_host', { length: 255 }),
  smtpPort: int('smtp_port'),
  smtpUsername: varchar('smtp_username', { length: 255 }),
  smtpPassword: text('smtp_password'),
  smtpEncryption: mysqlEnum('smtp_encryption', ['tls', 'ssl', 'none']).default('tls'),
  // Status
  isActive: tinyint('is_active').default(0).notNull(),
  lastTestedAt: timestamp('last_tested_at', { mode: 'string' }),
  lastTestStatus: mysqlEnum('last_test_status', ['success', 'failed', 'pending']),
  lastTestError: text('last_test_error'),
  // Audit
  createdBy: int('created_by'),
  updatedBy: int('updated_by'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export type InsertPlatformEmailSettings = typeof platformEmailSettings.$inferInsert;
export type SelectPlatformEmailSettings = typeof platformEmailSettings.$inferSelect;
