import { relations } from "drizzle-orm/relations";
import { generatedDocuments, projects, activities, organizations, operatingUnits, auditLogExportSchedules, auditLogExportHistory, users, auditLogs, beneficiaries, bidAnalyses, purchaseRequests, bidAnalysisBidders, bidAnalysisLineItems, purchaseRequestLineItems, bidEvaluationCriteria, bidEvaluationScores, bidOpeningMinutes, bomApprovalSignatures, budgetItems, budgets, budgetLines, financeBudgetCategories, chartOfAccounts, budgetMonthlyAllocations, caseRecords, caseActivities, indicators, caseReferrals, childSafeSpaces, cssActivities, deliveryNotes, deliveryNoteLines, purchaseOrderLineItems, purchaseOrders, goodsReceiptNotes, vendors, donorBudgetMapping, donorProjects, donors, drivers, emailTemplates, expenses, financeAdvances, hrEmployees, financeApprovalThresholds, financeAssetCategories, financeAssets, financeAssetDisposals, financeAssetMaintenance, financeAssetTransfers, financeExpenditureCategories, financeExpenditures, financeCurrencies, financeExchangeRates, landingSettings, mealDqaFindings, mealDqaActions, mealDqaVisits, mealLearningItems, mealLearningActions, mitigationActions, mitigationActionAttachments, mitigationActionComments, risks, mitigationTemplates, monthlyReports, monthlyReportAuditHistory, notificationPreferences, optionSets, optionSetValues, procurementPayables, payableApprovalHistory, permissionReviews, procurementAuditTrail, projectReportingSchedules, quotationAnalysisLineItems, quotationAnalyses, quotationAnalysisAuditLog, quotationAnalysisSuppliers, rbacRoles, rbacUserPermissions, rfqVendors, rfqVendorItems, rfqs, riskHistory, stockBatches, stockItems, grnLineItems, stockIssues, stockIssueLines, stockLedger, stockReservations, userActiveScope, userArchiveLog, userPermissionOverrides, varianceAlertConfig, varianceAlertHistory, vendorDocuments, vendorParticipationHistory, vendorPerformanceEvaluations, warehouseTransfers, warehouseTransferLines, contracts, contractPenalties, contractPaymentSchedule, contractRetentionTerms, implementationMonitoring, implementationChecklist, primaryHandover, finalHandover, implementationObservations, contractMilestones } from "./schema";

export const activitiesRelations = relations(activities, ({one, many}) => ({
	project: one(projects, {
		fields: [activities.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [activities.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [activities.operatingUnitId],
		references: [operatingUnits.id]
	}),
	beneficiaries: many(beneficiaries),
	budgetItems: many(budgetItems),
	budgetLines: many(budgetLines),
	caseActivities: many(caseActivities),
}));

export const projectsRelations = relations(projects, ({many}) => ({
	activities: many(activities),
	beneficiaries: many(beneficiaries),
	budgetItems: many(budgetItems),
	budgetLines: many(budgetLines),
	budgets: many(budgets),
	caseActivities: many(caseActivities),
	caseRecords: many(caseRecords),
	caseReferrals: many(caseReferrals),
	childSafeSpaces: many(childSafeSpaces),
	cssActivities: many(cssActivities),
	donorProjects: many(donorProjects),
	expenses: many(expenses),
	financeAdvances: many(financeAdvances),
	financeAssets: many(financeAssets),
	financeExpenditures: many(financeExpenditures),
	monthlyReportAuditHistories: many(monthlyReportAuditHistory),
	monthlyReports: many(monthlyReports),
	projectReportingSchedules: many(projectReportingSchedules),
	stockIssues: many(stockIssues),
	varianceAlertConfigs: many(varianceAlertConfig),
	varianceAlertHistories: many(varianceAlertHistory),
	warehouseTransfers: many(warehouseTransfers),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	activities: many(activities),
	auditLogs: many(auditLogs),
	beneficiaries: many(beneficiaries),
	bidAnalyses: many(bidAnalyses),
	bidAnalysisBidders: many(bidAnalysisBidders),
	bidAnalysisLineItems: many(bidAnalysisLineItems),
	bidOpeningMinutes: many(bidOpeningMinutes),
	bomApprovalSignatures: many(bomApprovalSignatures),
	budgetItems: many(budgetItems),
	budgetLines: many(budgetLines),
	budgets: many(budgets),
	caseActivities: many(caseActivities),
	caseRecords: many(caseRecords),
	caseReferrals: many(caseReferrals),
	chartOfAccounts: many(chartOfAccounts),
	childSafeSpaces: many(childSafeSpaces),
	cssActivities: many(cssActivities),
	deliveryNotes: many(deliveryNotes),
	donorBudgetMappings: many(donorBudgetMapping),
	donorProjects: many(donorProjects),
	drivers: many(drivers),
	emailTemplates: many(emailTemplates),
	expenses: many(expenses),
	financeAdvances: many(financeAdvances),
	financeApprovalThresholds: many(financeApprovalThresholds),
	financeAssetCategories: many(financeAssetCategories),
	financeAssetDisposals: many(financeAssetDisposals),
	financeAssetMaintenances: many(financeAssetMaintenance),
	financeAssetTransfers: many(financeAssetTransfers),
	financeAssets: many(financeAssets),
	financeExpenditureCategories: many(financeExpenditureCategories),
	financeExpenditures: many(financeExpenditures),
	landingSettings: many(landingSettings),
	mitigationActions: many(mitigationActions),
	mitigationTemplates: many(mitigationTemplates),
	monthlyReportAuditHistories: many(monthlyReportAuditHistory),
	monthlyReports: many(monthlyReports),
	notificationPreferences: many(notificationPreferences),
	operatingUnits: many(operatingUnits),
	optionSets: many(optionSets),
	permissionReviews: many(permissionReviews),
	procurementAuditTrails: many(procurementAuditTrail),
	projectReportingSchedules: many(projectReportingSchedules),
	purchaseOrderLineItems: many(purchaseOrderLineItems),
	rbacRoles: many(rbacRoles),
	rbacUserPermissions: many(rbacUserPermissions),
	rfqVendors: many(rfqVendors),
	rfqs: many(rfqs),
	riskHistories: many(riskHistory),
	stockBatches: many(stockBatches),
	stockIssues: many(stockIssues),
	stockLedgers: many(stockLedger),
	stockReservations: many(stockReservations),
	userActiveScopes: many(userActiveScope),
	userPermissionOverrides: many(userPermissionOverrides),
	varianceAlertConfigs: many(varianceAlertConfig),
	varianceAlertHistories: many(varianceAlertHistory),
	vendorDocuments: many(vendorDocuments),
	vendorParticipationHistories: many(vendorParticipationHistory),
	vendorPerformanceEvaluations: many(vendorPerformanceEvaluations),
	warehouseTransfers: many(warehouseTransfers),
}));

export const operatingUnitsRelations = relations(operatingUnits, ({one, many}) => ({
	activities: many(activities),
	auditLogs: many(auditLogs),
	beneficiaries: many(beneficiaries),
	bidAnalyses: many(bidAnalyses),
	bidAnalysisBidders: many(bidAnalysisBidders),
	bidAnalysisLineItems: many(bidAnalysisLineItems),
	bidOpeningMinutes: many(bidOpeningMinutes),
	bomApprovalSignatures: many(bomApprovalSignatures),
	budgetLines: many(budgetLines),
	deliveryNotes: many(deliveryNotes),
	donorProjects: many(donorProjects),
	drivers: many(drivers),
	expenses: many(expenses),
	financeExpenditures: many(financeExpenditures),
	mitigationActions: many(mitigationActions),
	monthlyReports: many(monthlyReports),
	organization: one(organizations, {
		fields: [operatingUnits.organizationId],
		references: [organizations.id]
	}),
	procurementAuditTrails: many(procurementAuditTrail),
	projectReportingSchedules: many(projectReportingSchedules),
	purchaseOrderLineItems: many(purchaseOrderLineItems),
	rfqVendors: many(rfqVendors),
	rfqs: many(rfqs),
	riskHistories: many(riskHistory),
	stockBatches: many(stockBatches),
	stockIssues: many(stockIssues),
	stockLedgers: many(stockLedger),
	stockReservations: many(stockReservations),
	userActiveScopes: many(userActiveScope),
	varianceAlertConfigs: many(varianceAlertConfig),
	varianceAlertHistories: many(varianceAlertHistory),
	vendorParticipationHistories: many(vendorParticipationHistory),
	vendorPerformanceEvaluations: many(vendorPerformanceEvaluations),
	warehouseTransfers: many(warehouseTransfers),
}));

export const auditLogExportHistoryRelations = relations(auditLogExportHistory, ({one}) => ({
	auditLogExportSchedule: one(auditLogExportSchedules, {
		fields: [auditLogExportHistory.scheduleId],
		references: [auditLogExportSchedules.id]
	}),
	user: one(users, {
		fields: [auditLogExportHistory.triggeredBy],
		references: [users.id]
	}),
}));

export const auditLogExportSchedulesRelations = relations(auditLogExportSchedules, ({one, many}) => ({
	auditLogExportHistories: many(auditLogExportHistory),
	user: one(users, {
		fields: [auditLogExportSchedules.createdBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	auditLogExportHistories: many(auditLogExportHistory),
	auditLogExportSchedules: many(auditLogExportSchedules),
	auditLogs: many(auditLogs),
	beneficiaries_deletedBy: many(beneficiaries, {
		relationName: "beneficiaries_deletedBy_users_id"
	}),
	beneficiaries_createdBy: many(beneficiaries, {
		relationName: "beneficiaries_createdBy_users_id"
	}),
	beneficiaries_updatedBy: many(beneficiaries, {
		relationName: "beneficiaries_updatedBy_users_id"
	}),
	bidAnalyses_approvedBy: many(bidAnalyses, {
		relationName: "bidAnalyses_approvedBy_users_id"
	}),
	bidAnalyses_deletedBy: many(bidAnalyses, {
		relationName: "bidAnalyses_deletedBy_users_id"
	}),
	bidAnalyses_createdBy: many(bidAnalyses, {
		relationName: "bidAnalyses_createdBy_users_id"
	}),
	bidAnalyses_updatedBy: many(bidAnalyses, {
		relationName: "bidAnalyses_updatedBy_users_id"
	}),
	bidAnalysisBidders: many(bidAnalysisBidders),
	bidAnalysisLineItems: many(bidAnalysisLineItems),
	bomApprovalSignatures: many(bomApprovalSignatures),
	budgetLines_deletedBy: many(budgetLines, {
		relationName: "budgetLines_deletedBy_users_id"
	}),
	budgetLines_createdBy: many(budgetLines, {
		relationName: "budgetLines_createdBy_users_id"
	}),
	budgetLines_updatedBy: many(budgetLines, {
		relationName: "budgetLines_updatedBy_users_id"
	}),
	budgetMonthlyAllocations_createdBy: many(budgetMonthlyAllocations, {
		relationName: "budgetMonthlyAllocations_createdBy_users_id"
	}),
	budgetMonthlyAllocations_updatedBy: many(budgetMonthlyAllocations, {
		relationName: "budgetMonthlyAllocations_updatedBy_users_id"
	}),
	caseActivities: many(caseActivities),
	caseRecords_assignedPssOfficerId: many(caseRecords, {
		relationName: "caseRecords_assignedPssOfficerId_users_id"
	}),
	caseRecords_assignedCaseWorkerId: many(caseRecords, {
		relationName: "caseRecords_assignedCaseWorkerId_users_id"
	}),
	caseRecords_createdBy: many(caseRecords, {
		relationName: "caseRecords_createdBy_users_id"
	}),
	caseRecords_updatedBy: many(caseRecords, {
		relationName: "caseRecords_updatedBy_users_id"
	}),
	caseRecords_deletedBy: many(caseRecords, {
		relationName: "caseRecords_deletedBy_users_id"
	}),
	caseReferrals: many(caseReferrals),
	chartOfAccounts_deletedBy: many(chartOfAccounts, {
		relationName: "chartOfAccounts_deletedBy_users_id"
	}),
	chartOfAccounts_createdBy: many(chartOfAccounts, {
		relationName: "chartOfAccounts_createdBy_users_id"
	}),
	chartOfAccounts_updatedBy: many(chartOfAccounts, {
		relationName: "chartOfAccounts_updatedBy_users_id"
	}),
	childSafeSpaces: many(childSafeSpaces),
	cssActivities_facilitatorId: many(cssActivities, {
		relationName: "cssActivities_facilitatorId_users_id"
	}),
	cssActivities_createdBy: many(cssActivities, {
		relationName: "cssActivities_createdBy_users_id"
	}),
	deliveryNotes: many(deliveryNotes),
	donorBudgetMappings_createdBy: many(donorBudgetMapping, {
		relationName: "donorBudgetMapping_createdBy_users_id"
	}),
	donorBudgetMappings_updatedBy: many(donorBudgetMapping, {
		relationName: "donorBudgetMapping_updatedBy_users_id"
	}),
	donorProjects_createdBy: many(donorProjects, {
		relationName: "donorProjects_createdBy_users_id"
	}),
	donorProjects_updatedBy: many(donorProjects, {
		relationName: "donorProjects_updatedBy_users_id"
	}),
	donorProjects_deletedBy: many(donorProjects, {
		relationName: "donorProjects_deletedBy_users_id"
	}),
	drivers_deletedBy: many(drivers, {
		relationName: "drivers_deletedBy_users_id"
	}),
	drivers_createdBy: many(drivers, {
		relationName: "drivers_createdBy_users_id"
	}),
	expenses_approvedBy: many(expenses, {
		relationName: "expenses_approvedBy_users_id"
	}),
	expenses_createdBy: many(expenses, {
		relationName: "expenses_createdBy_users_id"
	}),
	expenses_updatedBy: many(expenses, {
		relationName: "expenses_updatedBy_users_id"
	}),
	financeAdvances_approvedBy: many(financeAdvances, {
		relationName: "financeAdvances_approvedBy_users_id"
	}),
	financeAdvances_deletedBy: many(financeAdvances, {
		relationName: "financeAdvances_deletedBy_users_id"
	}),
	financeAdvances_createdBy: many(financeAdvances, {
		relationName: "financeAdvances_createdBy_users_id"
	}),
	financeAdvances_updatedBy: many(financeAdvances, {
		relationName: "financeAdvances_updatedBy_users_id"
	}),
	financeApprovalThresholds_approverUserId: many(financeApprovalThresholds, {
		relationName: "financeApprovalThresholds_approverUserId_users_id"
	}),
	financeApprovalThresholds_deletedBy: many(financeApprovalThresholds, {
		relationName: "financeApprovalThresholds_deletedBy_users_id"
	}),
	financeAssetCategories: many(financeAssetCategories),
	financeAssetDisposals_approvedBy: many(financeAssetDisposals, {
		relationName: "financeAssetDisposals_approvedBy_users_id"
	}),
	financeAssetDisposals_deletedBy: many(financeAssetDisposals, {
		relationName: "financeAssetDisposals_deletedBy_users_id"
	}),
	financeAssetDisposals_createdBy: many(financeAssetDisposals, {
		relationName: "financeAssetDisposals_createdBy_users_id"
	}),
	financeAssetMaintenances_deletedBy: many(financeAssetMaintenance, {
		relationName: "financeAssetMaintenance_deletedBy_users_id"
	}),
	financeAssetMaintenances_createdBy: many(financeAssetMaintenance, {
		relationName: "financeAssetMaintenance_createdBy_users_id"
	}),
	financeAssetTransfers_fromAssigneeUserId: many(financeAssetTransfers, {
		relationName: "financeAssetTransfers_fromAssigneeUserId_users_id"
	}),
	financeAssetTransfers_toAssigneeUserId: many(financeAssetTransfers, {
		relationName: "financeAssetTransfers_toAssigneeUserId_users_id"
	}),
	financeAssetTransfers_approvedBy: many(financeAssetTransfers, {
		relationName: "financeAssetTransfers_approvedBy_users_id"
	}),
	financeAssetTransfers_deletedBy: many(financeAssetTransfers, {
		relationName: "financeAssetTransfers_deletedBy_users_id"
	}),
	financeAssetTransfers_createdBy: many(financeAssetTransfers, {
		relationName: "financeAssetTransfers_createdBy_users_id"
	}),
	financeAssets_assignedToUserId: many(financeAssets, {
		relationName: "financeAssets_assignedToUserId_users_id"
	}),
	financeAssets_disposalApprovedBy: many(financeAssets, {
		relationName: "financeAssets_disposalApprovedBy_users_id"
	}),
	financeExpenditures_createdBy: many(financeExpenditures, {
		relationName: "financeExpenditures_createdBy_users_id"
	}),
	financeExpenditures_approvedBy: many(financeExpenditures, {
		relationName: "financeExpenditures_approvedBy_users_id"
	}),
	financeExpenditures_updatedBy: many(financeExpenditures, {
		relationName: "financeExpenditures_updatedBy_users_id"
	}),
	financeExpenditures_deletedBy: many(financeExpenditures, {
		relationName: "financeExpenditures_deletedBy_users_id"
	}),
	landingSettings: many(landingSettings),
	mitigationActionAttachments: many(mitigationActionAttachments),
	mitigationActionComments: many(mitigationActionComments),
	mitigationActions_assignedTo: many(mitigationActions, {
		relationName: "mitigationActions_assignedTo_users_id"
	}),
	mitigationActions_assignedBy: many(mitigationActions, {
		relationName: "mitigationActions_assignedBy_users_id"
	}),
	mitigationActions_verifiedBy: many(mitigationActions, {
		relationName: "mitigationActions_verifiedBy_users_id"
	}),
	mitigationActions_createdBy: many(mitigationActions, {
		relationName: "mitigationActions_createdBy_users_id"
	}),
	mitigationTemplates: many(mitigationTemplates),
	monthlyReportAuditHistories: many(monthlyReportAuditHistory),
	monthlyReports_deletedBy: many(monthlyReports, {
		relationName: "monthlyReports_deletedBy_users_id"
	}),
	monthlyReports_createdBy: many(monthlyReports, {
		relationName: "monthlyReports_createdBy_users_id"
	}),
	monthlyReports_updatedBy: many(monthlyReports, {
		relationName: "monthlyReports_updatedBy_users_id"
	}),
	optionSetValues: many(optionSetValues),
	optionSets: many(optionSets),
	payableApprovalHistories: many(payableApprovalHistory),
	permissionReviews_userId: many(permissionReviews, {
		relationName: "permissionReviews_userId_users_id"
	}),
	permissionReviews_reviewedBy: many(permissionReviews, {
		relationName: "permissionReviews_reviewedBy_users_id"
	}),
	procurementAuditTrails: many(procurementAuditTrail),
	projectReportingSchedules_submittedBy: many(projectReportingSchedules, {
		relationName: "projectReportingSchedules_submittedBy_users_id"
	}),
	projectReportingSchedules_approvedBy: many(projectReportingSchedules, {
		relationName: "projectReportingSchedules_approvedBy_users_id"
	}),
	projectReportingSchedules_createdBy: many(projectReportingSchedules, {
		relationName: "projectReportingSchedules_createdBy_users_id"
	}),
	purchaseOrderLineItems: many(purchaseOrderLineItems),
	quotationAnalysisAuditLogs: many(quotationAnalysisAuditLog),
	rbacRoles_deletedBy: many(rbacRoles, {
		relationName: "rbacRoles_deletedBy_users_id"
	}),
	rbacRoles_createdBy: many(rbacRoles, {
		relationName: "rbacRoles_createdBy_users_id"
	}),
	rbacUserPermissions_userId: many(rbacUserPermissions, {
		relationName: "rbacUserPermissions_userId_users_id"
	}),
	rbacUserPermissions_updatedBy: many(rbacUserPermissions, {
		relationName: "rbacUserPermissions_updatedBy_users_id"
	}),
	rfqVendors_deletedBy: many(rfqVendors, {
		relationName: "rfqVendors_deletedBy_users_id"
	}),
	rfqVendors_createdBy: many(rfqVendors, {
		relationName: "rfqVendors_createdBy_users_id"
	}),
	rfqVendors_updatedBy: many(rfqVendors, {
		relationName: "rfqVendors_updatedBy_users_id"
	}),
	rfqs_deletedBy: many(rfqs, {
		relationName: "rfqs_deletedBy_users_id"
	}),
	rfqs_createdBy: many(rfqs, {
		relationName: "rfqs_createdBy_users_id"
	}),
	rfqs_updatedBy: many(rfqs, {
		relationName: "rfqs_updatedBy_users_id"
	}),
	riskHistories: many(riskHistory),
	stockIssues: many(stockIssues),
	stockLedgers: many(stockLedger),
	stockReservations: many(stockReservations),
	userActiveScopes: many(userActiveScope),
	userArchiveLogs_userId: many(userArchiveLog, {
		relationName: "userArchiveLog_userId_users_id"
	}),
	userArchiveLogs_performedBy: many(userArchiveLog, {
		relationName: "userArchiveLog_performedBy_users_id"
	}),
	userPermissionOverrides_userId: many(userPermissionOverrides, {
		relationName: "userPermissionOverrides_userId_users_id"
	}),
	userPermissionOverrides_createdBy: many(userPermissionOverrides, {
		relationName: "userPermissionOverrides_createdBy_users_id"
	}),
	varianceAlertConfigs_createdBy: many(varianceAlertConfig, {
		relationName: "varianceAlertConfig_createdBy_users_id"
	}),
	varianceAlertConfigs_updatedBy: many(varianceAlertConfig, {
		relationName: "varianceAlertConfig_updatedBy_users_id"
	}),
	varianceAlertHistories: many(varianceAlertHistory),
	vendorDocuments_verifiedBy: many(vendorDocuments, {
		relationName: "vendorDocuments_verifiedBy_users_id"
	}),
	vendorDocuments_uploadedBy: many(vendorDocuments, {
		relationName: "vendorDocuments_uploadedBy_users_id"
	}),
	vendorPerformanceEvaluations_evaluatedBy: many(vendorPerformanceEvaluations, {
		relationName: "vendorPerformanceEvaluations_evaluatedBy_users_id"
	}),
	vendorPerformanceEvaluations_approvedBy: many(vendorPerformanceEvaluations, {
		relationName: "vendorPerformanceEvaluations_approvedBy_users_id"
	}),
	warehouseTransfers_createdBy: many(warehouseTransfers, {
		relationName: "warehouseTransfers_createdBy_users_id"
	}),
	warehouseTransfers_approvedBy: many(warehouseTransfers, {
		relationName: "warehouseTransfers_approvedBy_users_id"
	}),
	warehouseTransfers_dispatchedBy: many(warehouseTransfers, {
		relationName: "warehouseTransfers_dispatchedBy_users_id"
	}),
	warehouseTransfers_receivedBy: many(warehouseTransfers, {
		relationName: "warehouseTransfers_receivedBy_users_id"
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [auditLogs.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [auditLogs.operatingUnitId],
		references: [operatingUnits.id]
	}),
}));

export const beneficiariesRelations = relations(beneficiaries, ({one}) => ({
	project: one(projects, {
		fields: [beneficiaries.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [beneficiaries.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [beneficiaries.operatingUnitId],
		references: [operatingUnits.id]
	}),
	activity: one(activities, {
		fields: [beneficiaries.activityId],
		references: [activities.id]
	}),
	user_deletedBy: one(users, {
		fields: [beneficiaries.deletedBy],
		references: [users.id],
		relationName: "beneficiaries_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [beneficiaries.createdBy],
		references: [users.id],
		relationName: "beneficiaries_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [beneficiaries.updatedBy],
		references: [users.id],
		relationName: "beneficiaries_updatedBy_users_id"
	}),
}));

export const bidAnalysesRelations = relations(bidAnalyses, ({one, many}) => ({
	organization: one(organizations, {
		fields: [bidAnalyses.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [bidAnalyses.operatingUnitId],
		references: [operatingUnits.id]
	}),
	purchaseRequest: one(purchaseRequests, {
		fields: [bidAnalyses.purchaseRequestId],
		references: [purchaseRequests.id]
	}),
	supplier: one(vendors, {
		fields: [bidAnalyses.selectedBidderId],
		references: [vendors.id]
	}),
	user_approvedBy: one(users, {
		fields: [bidAnalyses.approvedBy],
		references: [users.id],
		relationName: "bidAnalyses_approvedBy_users_id"
	}),
	user_deletedBy: one(users, {
		fields: [bidAnalyses.deletedBy],
		references: [users.id],
		relationName: "bidAnalyses_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [bidAnalyses.createdBy],
		references: [users.id],
		relationName: "bidAnalyses_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [bidAnalyses.updatedBy],
		references: [users.id],
		relationName: "bidAnalyses_updatedBy_users_id"
	}),
	bidAnalysisBidders: many(bidAnalysisBidders),
	bidAnalysisLineItems: many(bidAnalysisLineItems),
	bidEvaluationCriteria: many(bidEvaluationCriteria),
	bidEvaluationScores: many(bidEvaluationScores),
	bidOpeningMinutes: many(bidOpeningMinutes),
}));

export const purchaseRequestsRelations = relations(purchaseRequests, ({many}) => ({
	bidAnalyses: many(bidAnalyses),
	bidOpeningMinutes: many(bidOpeningMinutes),
	rfqVendors: many(rfqVendors),
	rfqs: many(rfqs),
	vendorParticipationHistories: many(vendorParticipationHistory),
}));

export const suppliersRelations = relations(vendors, ({many}) => ({
	bidAnalyses: many(bidAnalyses),
	bidAnalysisBidders: many(bidAnalysisBidders),
}));

export const bidAnalysisBiddersRelations = relations(bidAnalysisBidders, ({one, many}) => ({
	bidAnalysis: one(bidAnalyses, {
		fields: [bidAnalysisBidders.bidAnalysisId],
		references: [bidAnalyses.id]
	}),
	supplier: one(vendors, {
		fields: [bidAnalysisBidders.supplierId],
		references: [vendors.id]
	}),
	user: one(users, {
		fields: [bidAnalysisBidders.acknowledgementPrintedBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [bidAnalysisBidders.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [bidAnalysisBidders.operatingUnitId],
		references: [operatingUnits.id]
	}),
	bidAnalysisLineItems: many(bidAnalysisLineItems),
	bidEvaluationScores: many(bidEvaluationScores),
}));

export const bidAnalysisLineItemsRelations = relations(bidAnalysisLineItems, ({one}) => ({
	bidAnalysis: one(bidAnalyses, {
		fields: [bidAnalysisLineItems.bidAnalysisId],
		references: [bidAnalyses.id]
	}),
	bidAnalysisBidder: one(bidAnalysisBidders, {
		fields: [bidAnalysisLineItems.bidderId],
		references: [bidAnalysisBidders.id]
	}),
	purchaseRequestLineItem: one(purchaseRequestLineItems, {
		fields: [bidAnalysisLineItems.prLineItemId],
		references: [purchaseRequestLineItems.id]
	}),
	organization: one(organizations, {
		fields: [bidAnalysisLineItems.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [bidAnalysisLineItems.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user: one(users, {
		fields: [bidAnalysisLineItems.createdBy],
		references: [users.id]
	}),
}));

export const purchaseRequestLineItemsRelations = relations(purchaseRequestLineItems, ({many}) => ({
	bidAnalysisLineItems: many(bidAnalysisLineItems),
	quotationAnalysisLineItems: many(quotationAnalysisLineItems),
	rfqVendorItems: many(rfqVendorItems),
}));

export const bidEvaluationCriteriaRelations = relations(bidEvaluationCriteria, ({one, many}) => ({
	bidAnalysis: one(bidAnalyses, {
		fields: [bidEvaluationCriteria.bidAnalysisId],
		references: [bidAnalyses.id]
	}),
	bidEvaluationScores: many(bidEvaluationScores),
}));

export const bidEvaluationScoresRelations = relations(bidEvaluationScores, ({one}) => ({
	bidAnalysis: one(bidAnalyses, {
		fields: [bidEvaluationScores.bidAnalysisId],
		references: [bidAnalyses.id]
	}),
	bidEvaluationCriterion: one(bidEvaluationCriteria, {
		fields: [bidEvaluationScores.criterionId],
		references: [bidEvaluationCriteria.id]
	}),
	bidAnalysisBidder: one(bidAnalysisBidders, {
		fields: [bidEvaluationScores.bidderId],
		references: [bidAnalysisBidders.id]
	}),
}));

export const bidOpeningMinutesRelations = relations(bidOpeningMinutes, ({one, many}) => ({
	organization: one(organizations, {
		fields: [bidOpeningMinutes.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [bidOpeningMinutes.operatingUnitId],
		references: [operatingUnits.id]
	}),
	purchaseRequest: one(purchaseRequests, {
		fields: [bidOpeningMinutes.purchaseRequestId],
		references: [purchaseRequests.id]
	}),
	bidAnalysis: one(bidAnalyses, {
		fields: [bidOpeningMinutes.bidAnalysisId],
		references: [bidAnalyses.id]
	}),
	bomApprovalSignatures: many(bomApprovalSignatures),
}));

export const bomApprovalSignaturesRelations = relations(bomApprovalSignatures, ({one}) => ({
	bidOpeningMinute: one(bidOpeningMinutes, {
		fields: [bomApprovalSignatures.bomId],
		references: [bidOpeningMinutes.id]
	}),
	organization: one(organizations, {
		fields: [bomApprovalSignatures.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [bomApprovalSignatures.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user: one(users, {
		fields: [bomApprovalSignatures.signedByUserId],
		references: [users.id]
	}),
}));

export const budgetItemsRelations = relations(budgetItems, ({one, many}) => ({
	project: one(projects, {
		fields: [budgetItems.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [budgetItems.organizationId],
		references: [organizations.id]
	}),
	activity: one(activities, {
		fields: [budgetItems.activityId],
		references: [activities.id]
	}),
	expenses: many(expenses),
	varianceAlertHistories: many(varianceAlertHistory),
}));

export const budgetLinesRelations = relations(budgetLines, ({one, many}) => ({
	budget: one(budgets, {
		fields: [budgetLines.budgetId],
		references: [budgets.id]
	}),
	project: one(projects, {
		fields: [budgetLines.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [budgetLines.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [budgetLines.operatingUnitId],
		references: [operatingUnits.id]
	}),
	financeBudgetCategory: one(financeBudgetCategories, {
		fields: [budgetLines.categoryId],
		references: [financeBudgetCategories.id]
	}),
	chartOfAccount: one(chartOfAccounts, {
		fields: [budgetLines.accountId],
		references: [chartOfAccounts.id]
	}),
	activity: one(activities, {
		fields: [budgetLines.activityId],
		references: [activities.id]
	}),
	user_deletedBy: one(users, {
		fields: [budgetLines.deletedBy],
		references: [users.id],
		relationName: "budgetLines_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [budgetLines.createdBy],
		references: [users.id],
		relationName: "budgetLines_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [budgetLines.updatedBy],
		references: [users.id],
		relationName: "budgetLines_updatedBy_users_id"
	}),
	budgetMonthlyAllocations: many(budgetMonthlyAllocations),
	financeExpenditures: many(financeExpenditures),
}));

export const budgetsRelations = relations(budgets, ({one, many}) => ({
	budgetLines: many(budgetLines),
	budgetMonthlyAllocations: many(budgetMonthlyAllocations),
	project: one(projects, {
		fields: [budgets.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [budgets.organizationId],
		references: [organizations.id]
	}),
}));

export const financeBudgetCategoriesRelations = relations(financeBudgetCategories, ({many}) => ({
	budgetLines: many(budgetLines),
	donorBudgetMappings: many(donorBudgetMapping),
}));

export const chartOfAccountsRelations = relations(chartOfAccounts, ({one, many}) => ({
	budgetLines: many(budgetLines),
	organization: one(organizations, {
		fields: [chartOfAccounts.organizationId],
		references: [organizations.id]
	}),
	user_deletedBy: one(users, {
		fields: [chartOfAccounts.deletedBy],
		references: [users.id],
		relationName: "chartOfAccounts_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [chartOfAccounts.createdBy],
		references: [users.id],
		relationName: "chartOfAccounts_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [chartOfAccounts.updatedBy],
		references: [users.id],
		relationName: "chartOfAccounts_updatedBy_users_id"
	}),
	financeExpenditureCategories: many(financeExpenditureCategories),
	financeExpenditures: many(financeExpenditures),
}));

export const budgetMonthlyAllocationsRelations = relations(budgetMonthlyAllocations, ({one}) => ({
	budgetLine: one(budgetLines, {
		fields: [budgetMonthlyAllocations.budgetLineId],
		references: [budgetLines.id]
	}),
	budget: one(budgets, {
		fields: [budgetMonthlyAllocations.budgetId],
		references: [budgets.id]
	}),
	user_createdBy: one(users, {
		fields: [budgetMonthlyAllocations.createdBy],
		references: [users.id],
		relationName: "budgetMonthlyAllocations_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [budgetMonthlyAllocations.updatedBy],
		references: [users.id],
		relationName: "budgetMonthlyAllocations_updatedBy_users_id"
	}),
}));

export const caseActivitiesRelations = relations(caseActivities, ({one}) => ({
	caseRecord: one(caseRecords, {
		fields: [caseActivities.caseId],
		references: [caseRecords.id]
	}),
	project: one(projects, {
		fields: [caseActivities.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [caseActivities.organizationId],
		references: [organizations.id]
	}),
	activity: one(activities, {
		fields: [caseActivities.linkedActivityId],
		references: [activities.id]
	}),
	indicator: one(indicators, {
		fields: [caseActivities.linkedIndicatorId],
		references: [indicators.id]
	}),
	user: one(users, {
		fields: [caseActivities.createdBy],
		references: [users.id]
	}),
}));

export const caseRecordsRelations = relations(caseRecords, ({one, many}) => ({
	caseActivities: many(caseActivities),
	project: one(projects, {
		fields: [caseRecords.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [caseRecords.organizationId],
		references: [organizations.id]
	}),
	user_assignedPssOfficerId: one(users, {
		fields: [caseRecords.assignedPssOfficerId],
		references: [users.id],
		relationName: "caseRecords_assignedPssOfficerId_users_id"
	}),
	user_assignedCaseWorkerId: one(users, {
		fields: [caseRecords.assignedCaseWorkerId],
		references: [users.id],
		relationName: "caseRecords_assignedCaseWorkerId_users_id"
	}),
	user_createdBy: one(users, {
		fields: [caseRecords.createdBy],
		references: [users.id],
		relationName: "caseRecords_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [caseRecords.updatedBy],
		references: [users.id],
		relationName: "caseRecords_updatedBy_users_id"
	}),
	user_deletedBy: one(users, {
		fields: [caseRecords.deletedBy],
		references: [users.id],
		relationName: "caseRecords_deletedBy_users_id"
	}),
	caseReferrals: many(caseReferrals),
	cssActivities: many(cssActivities),
}));

export const indicatorsRelations = relations(indicators, ({many}) => ({
	caseActivities: many(caseActivities),
	cssActivities: many(cssActivities),
}));

export const caseReferralsRelations = relations(caseReferrals, ({one}) => ({
	caseRecord: one(caseRecords, {
		fields: [caseReferrals.caseId],
		references: [caseRecords.id]
	}),
	project: one(projects, {
		fields: [caseReferrals.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [caseReferrals.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [caseReferrals.createdBy],
		references: [users.id]
	}),
}));

export const childSafeSpacesRelations = relations(childSafeSpaces, ({one, many}) => ({
	project: one(projects, {
		fields: [childSafeSpaces.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [childSafeSpaces.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [childSafeSpaces.createdBy],
		references: [users.id]
	}),
	cssActivities: many(cssActivities),
}));

export const cssActivitiesRelations = relations(cssActivities, ({one}) => ({
	childSafeSpace: one(childSafeSpaces, {
		fields: [cssActivities.cssId],
		references: [childSafeSpaces.id]
	}),
	project: one(projects, {
		fields: [cssActivities.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [cssActivities.organizationId],
		references: [organizations.id]
	}),
	user_facilitatorId: one(users, {
		fields: [cssActivities.facilitatorId],
		references: [users.id],
		relationName: "cssActivities_facilitatorId_users_id"
	}),
	caseRecord: one(caseRecords, {
		fields: [cssActivities.linkedCaseId],
		references: [caseRecords.id]
	}),
	indicator: one(indicators, {
		fields: [cssActivities.linkedIndicatorId],
		references: [indicators.id]
	}),
	user_createdBy: one(users, {
		fields: [cssActivities.createdBy],
		references: [users.id],
		relationName: "cssActivities_createdBy_users_id"
	}),
}));

export const deliveryNoteLinesRelations = relations(deliveryNoteLines, ({one}) => ({
	deliveryNote: one(deliveryNotes, {
		fields: [deliveryNoteLines.dnId],
		references: [deliveryNotes.id]
	}),
	purchaseOrderLineItem: one(purchaseOrderLineItems, {
		fields: [deliveryNoteLines.poLineItemId],
		references: [purchaseOrderLineItems.id]
	}),
}));

export const deliveryNotesRelations = relations(deliveryNotes, ({one, many}) => ({
	deliveryNoteLines: many(deliveryNoteLines),
	organization: one(organizations, {
		fields: [deliveryNotes.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [deliveryNotes.operatingUnitId],
		references: [operatingUnits.id]
	}),
	purchaseOrder: one(purchaseOrders, {
		fields: [deliveryNotes.poId],
		references: [purchaseOrders.id]
	}),
	goodsReceiptNote: one(goodsReceiptNotes, {
		fields: [deliveryNotes.grnId],
		references: [goodsReceiptNotes.id]
	}),
	vendor: one(vendors, {
		fields: [deliveryNotes.vendorId],
		references: [vendors.id]
	}),
	user: one(users, {
		fields: [deliveryNotes.createdBy],
		references: [users.id]
	}),
}));

export const purchaseOrderLineItemsRelations = relations(purchaseOrderLineItems, ({one, many}) => ({
	deliveryNoteLines: many(deliveryNoteLines),
	quotationAnalysisLineItem: one(quotationAnalysisLineItems, {
		fields: [purchaseOrderLineItems.qaLineItemId],
		references: [quotationAnalysisLineItems.id]
	}),
	organization: one(organizations, {
		fields: [purchaseOrderLineItems.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [purchaseOrderLineItems.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user: one(users, {
		fields: [purchaseOrderLineItems.deletedBy],
		references: [users.id]
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({many}) => ({
	deliveryNotes: many(deliveryNotes),
}));

export const goodsReceiptNotesRelations = relations(goodsReceiptNotes, ({many}) => ({
	deliveryNotes: many(deliveryNotes),
}));

export const vendorsRelations = relations(vendors, ({many}) => ({
	deliveryNotes: many(deliveryNotes),
	rfqVendors: many(rfqVendors),
	vendorDocuments: many(vendorDocuments),
	vendorParticipationHistories: many(vendorParticipationHistory),
	vendorPerformanceEvaluations: many(vendorPerformanceEvaluations),
}));

export const donorBudgetMappingRelations = relations(donorBudgetMapping, ({one}) => ({
	organization: one(organizations, {
		fields: [donorBudgetMapping.organizationId],
		references: [organizations.id]
	}),
	financeBudgetCategory: one(financeBudgetCategories, {
		fields: [donorBudgetMapping.internalCategoryId],
		references: [financeBudgetCategories.id]
	}),
	user_createdBy: one(users, {
		fields: [donorBudgetMapping.createdBy],
		references: [users.id],
		relationName: "donorBudgetMapping_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [donorBudgetMapping.updatedBy],
		references: [users.id],
		relationName: "donorBudgetMapping_updatedBy_users_id"
	}),
}));

export const donorProjectsRelations = relations(donorProjects, ({one}) => ({
	organization: one(organizations, {
		fields: [donorProjects.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [donorProjects.operatingUnitId],
		references: [operatingUnits.id]
	}),
	donor: one(donors, {
		fields: [donorProjects.donorId],
		references: [donors.id]
	}),
	project: one(projects, {
		fields: [donorProjects.projectId],
		references: [projects.id]
	}),
	user_createdBy: one(users, {
		fields: [donorProjects.createdBy],
		references: [users.id],
		relationName: "donorProjects_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [donorProjects.updatedBy],
		references: [users.id],
		relationName: "donorProjects_updatedBy_users_id"
	}),
	user_deletedBy: one(users, {
		fields: [donorProjects.deletedBy],
		references: [users.id],
		relationName: "donorProjects_deletedBy_users_id"
	}),
}));

export const donorsRelations = relations(donors, ({many}) => ({
	donorProjects: many(donorProjects),
}));

export const driversRelations = relations(drivers, ({one}) => ({
	operatingUnit: one(operatingUnits, {
		fields: [drivers.operatingUnitId],
		references: [operatingUnits.id]
	}),
	organization: one(organizations, {
		fields: [drivers.organizationId],
		references: [organizations.id]
	}),
	user_deletedBy: one(users, {
		fields: [drivers.deletedBy],
		references: [users.id],
		relationName: "drivers_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [drivers.createdBy],
		references: [users.id],
		relationName: "drivers_createdBy_users_id"
	}),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({one}) => ({
	organization: one(organizations, {
		fields: [emailTemplates.organizationId],
		references: [organizations.id]
	}),
}));

export const expensesRelations = relations(expenses, ({one}) => ({
	budgetItem: one(budgetItems, {
		fields: [expenses.budgetItemId],
		references: [budgetItems.id]
	}),
	project: one(projects, {
		fields: [expenses.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [expenses.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [expenses.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user_approvedBy: one(users, {
		fields: [expenses.approvedBy],
		references: [users.id],
		relationName: "expenses_approvedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [expenses.createdBy],
		references: [users.id],
		relationName: "expenses_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [expenses.updatedBy],
		references: [users.id],
		relationName: "expenses_updatedBy_users_id"
	}),
}));

export const financeAdvancesRelations = relations(financeAdvances, ({one}) => ({
	organization: one(organizations, {
		fields: [financeAdvances.organizationId],
		references: [organizations.id]
	}),
	hrEmployee: one(hrEmployees, {
		fields: [financeAdvances.employeeId],
		references: [hrEmployees.id]
	}),
	user_approvedBy: one(users, {
		fields: [financeAdvances.approvedBy],
		references: [users.id],
		relationName: "financeAdvances_approvedBy_users_id"
	}),
	project: one(projects, {
		fields: [financeAdvances.projectId],
		references: [projects.id]
	}),
	user_deletedBy: one(users, {
		fields: [financeAdvances.deletedBy],
		references: [users.id],
		relationName: "financeAdvances_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [financeAdvances.createdBy],
		references: [users.id],
		relationName: "financeAdvances_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [financeAdvances.updatedBy],
		references: [users.id],
		relationName: "financeAdvances_updatedBy_users_id"
	}),
}));

export const hrEmployeesRelations = relations(hrEmployees, ({many}) => ({
	financeAdvances: many(financeAdvances),
}));

export const financeApprovalThresholdsRelations = relations(financeApprovalThresholds, ({one}) => ({
	user_approverUserId: one(users, {
		fields: [financeApprovalThresholds.approverUserId],
		references: [users.id],
		relationName: "financeApprovalThresholds_approverUserId_users_id"
	}),
	organization: one(organizations, {
		fields: [financeApprovalThresholds.organizationId],
		references: [organizations.id]
	}),
	user_deletedBy: one(users, {
		fields: [financeApprovalThresholds.deletedBy],
		references: [users.id],
		relationName: "financeApprovalThresholds_deletedBy_users_id"
	}),
}));

export const financeAssetCategoriesRelations = relations(financeAssetCategories, ({one, many}) => ({
	organization: one(organizations, {
		fields: [financeAssetCategories.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [financeAssetCategories.deletedBy],
		references: [users.id]
	}),
	financeAssets: many(financeAssets),
}));

export const financeAssetDisposalsRelations = relations(financeAssetDisposals, ({one}) => ({
	financeAsset: one(financeAssets, {
		fields: [financeAssetDisposals.assetId],
		references: [financeAssets.id]
	}),
	user_approvedBy: one(users, {
		fields: [financeAssetDisposals.approvedBy],
		references: [users.id],
		relationName: "financeAssetDisposals_approvedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [financeAssetDisposals.organizationId],
		references: [organizations.id]
	}),
	user_deletedBy: one(users, {
		fields: [financeAssetDisposals.deletedBy],
		references: [users.id],
		relationName: "financeAssetDisposals_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [financeAssetDisposals.createdBy],
		references: [users.id],
		relationName: "financeAssetDisposals_createdBy_users_id"
	}),
}));

export const financeAssetsRelations = relations(financeAssets, ({one, many}) => ({
	financeAssetDisposals: many(financeAssetDisposals),
	financeAssetMaintenances: many(financeAssetMaintenance),
	financeAssetTransfers: many(financeAssetTransfers),
	financeAssetCategory: one(financeAssetCategories, {
		fields: [financeAssets.categoryId],
		references: [financeAssetCategories.id]
	}),
	user_assignedToUserId: one(users, {
		fields: [financeAssets.assignedToUserId],
		references: [users.id],
		relationName: "financeAssets_assignedToUserId_users_id"
	}),
	project: one(projects, {
		fields: [financeAssets.projectId],
		references: [projects.id]
	}),
	user_disposalApprovedBy: one(users, {
		fields: [financeAssets.disposalApprovedBy],
		references: [users.id],
		relationName: "financeAssets_disposalApprovedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [financeAssets.organizationId],
		references: [organizations.id]
	}),
}));

export const financeAssetMaintenanceRelations = relations(financeAssetMaintenance, ({one}) => ({
	financeAsset: one(financeAssets, {
		fields: [financeAssetMaintenance.assetId],
		references: [financeAssets.id]
	}),
	organization: one(organizations, {
		fields: [financeAssetMaintenance.organizationId],
		references: [organizations.id]
	}),
	user_deletedBy: one(users, {
		fields: [financeAssetMaintenance.deletedBy],
		references: [users.id],
		relationName: "financeAssetMaintenance_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [financeAssetMaintenance.createdBy],
		references: [users.id],
		relationName: "financeAssetMaintenance_createdBy_users_id"
	}),
}));

export const financeAssetTransfersRelations = relations(financeAssetTransfers, ({one}) => ({
	financeAsset: one(financeAssets, {
		fields: [financeAssetTransfers.assetId],
		references: [financeAssets.id]
	}),
	user_fromAssigneeUserId: one(users, {
		fields: [financeAssetTransfers.fromAssigneeUserId],
		references: [users.id],
		relationName: "financeAssetTransfers_fromAssigneeUserId_users_id"
	}),
	user_toAssigneeUserId: one(users, {
		fields: [financeAssetTransfers.toAssigneeUserId],
		references: [users.id],
		relationName: "financeAssetTransfers_toAssigneeUserId_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [financeAssetTransfers.approvedBy],
		references: [users.id],
		relationName: "financeAssetTransfers_approvedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [financeAssetTransfers.organizationId],
		references: [organizations.id]
	}),
	user_deletedBy: one(users, {
		fields: [financeAssetTransfers.deletedBy],
		references: [users.id],
		relationName: "financeAssetTransfers_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [financeAssetTransfers.createdBy],
		references: [users.id],
		relationName: "financeAssetTransfers_createdBy_users_id"
	}),
}));

export const financeExpenditureCategoriesRelations = relations(financeExpenditureCategories, ({one, many}) => ({
	organization: one(organizations, {
		fields: [financeExpenditureCategories.organizationId],
		references: [organizations.id]
	}),
	chartOfAccount: one(chartOfAccounts, {
		fields: [financeExpenditureCategories.glAccountId],
		references: [chartOfAccounts.id]
	}),
	financeExpenditures: many(financeExpenditures),
}));

export const financeExpendituresRelations = relations(financeExpenditures, ({one}) => ({
	organization: one(organizations, {
		fields: [financeExpenditures.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [financeExpenditures.operatingUnitId],
		references: [operatingUnits.id]
	}),
	project: one(projects, {
		fields: [financeExpenditures.projectId],
		references: [projects.id]
	}),
	budgetLine: one(budgetLines, {
		fields: [financeExpenditures.budgetLineId],
		references: [budgetLines.id]
	}),
	financeCurrency: one(financeCurrencies, {
		fields: [financeExpenditures.currencyId],
		references: [financeCurrencies.id]
	}),
	financeExchangeRate: one(financeExchangeRates, {
		fields: [financeExpenditures.exchangeRateId],
		references: [financeExchangeRates.id]
	}),
	financeExpenditureCategory: one(financeExpenditureCategories, {
		fields: [financeExpenditures.categoryId],
		references: [financeExpenditureCategories.id]
	}),
	chartOfAccount: one(chartOfAccounts, {
		fields: [financeExpenditures.glAccountId],
		references: [chartOfAccounts.id]
	}),
	user_createdBy: one(users, {
		fields: [financeExpenditures.createdBy],
		references: [users.id],
		relationName: "financeExpenditures_createdBy_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [financeExpenditures.approvedBy],
		references: [users.id],
		relationName: "financeExpenditures_approvedBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [financeExpenditures.updatedBy],
		references: [users.id],
		relationName: "financeExpenditures_updatedBy_users_id"
	}),
	user_deletedBy: one(users, {
		fields: [financeExpenditures.deletedBy],
		references: [users.id],
		relationName: "financeExpenditures_deletedBy_users_id"
	}),
}));

export const financeCurrenciesRelations = relations(financeCurrencies, ({many}) => ({
	financeExpenditures: many(financeExpenditures),
}));

export const financeExchangeRatesRelations = relations(financeExchangeRates, ({many}) => ({
	financeExpenditures: many(financeExpenditures),
}));

export const landingSettingsRelations = relations(landingSettings, ({one}) => ({
	organization: one(organizations, {
		fields: [landingSettings.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [landingSettings.updatedBy],
		references: [users.id]
	}),
}));

export const mealDqaActionsRelations = relations(mealDqaActions, ({one}) => ({
	mealDqaFinding: one(mealDqaFindings, {
		fields: [mealDqaActions.dqaFindingId],
		references: [mealDqaFindings.id]
	}),
}));

export const mealDqaFindingsRelations = relations(mealDqaFindings, ({one, many}) => ({
	mealDqaActions: many(mealDqaActions),
	mealDqaVisit: one(mealDqaVisits, {
		fields: [mealDqaFindings.dqaVisitId],
		references: [mealDqaVisits.id]
	}),
}));

export const mealDqaVisitsRelations = relations(mealDqaVisits, ({many}) => ({
	mealDqaFindings: many(mealDqaFindings),
}));

export const mealLearningActionsRelations = relations(mealLearningActions, ({one}) => ({
	mealLearningItem: one(mealLearningItems, {
		fields: [mealLearningActions.learningItemId],
		references: [mealLearningItems.id]
	}),
}));

export const mealLearningItemsRelations = relations(mealLearningItems, ({many}) => ({
	mealLearningActions: many(mealLearningActions),
}));

export const mitigationActionAttachmentsRelations = relations(mitigationActionAttachments, ({one}) => ({
	mitigationAction: one(mitigationActions, {
		fields: [mitigationActionAttachments.actionId],
		references: [mitigationActions.id]
	}),
	user: one(users, {
		fields: [mitigationActionAttachments.uploadedBy],
		references: [users.id]
	}),
}));

export const mitigationActionsRelations = relations(mitigationActions, ({one, many}) => ({
	mitigationActionAttachments: many(mitigationActionAttachments),
	mitigationActionComments: many(mitigationActionComments),
	organization: one(organizations, {
		fields: [mitigationActions.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [mitigationActions.operatingUnitId],
		references: [operatingUnits.id]
	}),
	risk: one(risks, {
		fields: [mitigationActions.riskId],
		references: [risks.id]
	}),
	user_assignedTo: one(users, {
		fields: [mitigationActions.assignedTo],
		references: [users.id],
		relationName: "mitigationActions_assignedTo_users_id"
	}),
	user_assignedBy: one(users, {
		fields: [mitigationActions.assignedBy],
		references: [users.id],
		relationName: "mitigationActions_assignedBy_users_id"
	}),
	user_verifiedBy: one(users, {
		fields: [mitigationActions.verifiedBy],
		references: [users.id],
		relationName: "mitigationActions_verifiedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [mitigationActions.createdBy],
		references: [users.id],
		relationName: "mitigationActions_createdBy_users_id"
	}),
}));

export const mitigationActionCommentsRelations = relations(mitigationActionComments, ({one}) => ({
	mitigationAction: one(mitigationActions, {
		fields: [mitigationActionComments.actionId],
		references: [mitigationActions.id]
	}),
	user: one(users, {
		fields: [mitigationActionComments.createdBy],
		references: [users.id]
	}),
}));

export const risksRelations = relations(risks, ({many}) => ({
	mitigationActions: many(mitigationActions),
	riskHistories: many(riskHistory),
}));

export const mitigationTemplatesRelations = relations(mitigationTemplates, ({one}) => ({
	organization: one(organizations, {
		fields: [mitigationTemplates.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [mitigationTemplates.createdBy],
		references: [users.id]
	}),
}));

export const monthlyReportAuditHistoryRelations = relations(monthlyReportAuditHistory, ({one}) => ({
	monthlyReport: one(monthlyReports, {
		fields: [monthlyReportAuditHistory.monthlyReportId],
		references: [monthlyReports.id]
	}),
	project: one(projects, {
		fields: [monthlyReportAuditHistory.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [monthlyReportAuditHistory.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [monthlyReportAuditHistory.performedBy],
		references: [users.id]
	}),
}));

export const monthlyReportsRelations = relations(monthlyReports, ({one, many}) => ({
	monthlyReportAuditHistories: many(monthlyReportAuditHistory),
	project: one(projects, {
		fields: [monthlyReports.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [monthlyReports.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [monthlyReports.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user_deletedBy: one(users, {
		fields: [monthlyReports.deletedBy],
		references: [users.id],
		relationName: "monthlyReports_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [monthlyReports.createdBy],
		references: [users.id],
		relationName: "monthlyReports_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [monthlyReports.updatedBy],
		references: [users.id],
		relationName: "monthlyReports_updatedBy_users_id"
	}),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	organization: one(organizations, {
		fields: [notificationPreferences.organizationId],
		references: [organizations.id]
	}),
}));

export const optionSetValuesRelations = relations(optionSetValues, ({one}) => ({
	optionSet: one(optionSets, {
		fields: [optionSetValues.optionSetId],
		references: [optionSets.id]
	}),
	user: one(users, {
		fields: [optionSetValues.deletedBy],
		references: [users.id]
	}),
}));

export const optionSetsRelations = relations(optionSets, ({one, many}) => ({
	optionSetValues: many(optionSetValues),
	organization: one(organizations, {
		fields: [optionSets.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [optionSets.deletedBy],
		references: [users.id]
	}),
}));

export const payableApprovalHistoryRelations = relations(payableApprovalHistory, ({one}) => ({
	procurementPayable: one(procurementPayables, {
		fields: [payableApprovalHistory.payableId],
		references: [procurementPayables.id]
	}),
	user: one(users, {
		fields: [payableApprovalHistory.actionBy],
		references: [users.id]
	}),
}));

export const procurementPayablesRelations = relations(procurementPayables, ({many}) => ({
	payableApprovalHistories: many(payableApprovalHistory),
}));

export const permissionReviewsRelations = relations(permissionReviews, ({one}) => ({
	user_userId: one(users, {
		fields: [permissionReviews.userId],
		references: [users.id],
		relationName: "permissionReviews_userId_users_id"
	}),
	organization: one(organizations, {
		fields: [permissionReviews.organizationId],
		references: [organizations.id]
	}),
	user_reviewedBy: one(users, {
		fields: [permissionReviews.reviewedBy],
		references: [users.id],
		relationName: "permissionReviews_reviewedBy_users_id"
	}),
}));

export const procurementAuditTrailRelations = relations(procurementAuditTrail, ({one}) => ({
	organization: one(organizations, {
		fields: [procurementAuditTrail.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [procurementAuditTrail.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user: one(users, {
		fields: [procurementAuditTrail.userId],
		references: [users.id]
	}),
}));

export const projectReportingSchedulesRelations = relations(projectReportingSchedules, ({one}) => ({
	project: one(projects, {
		fields: [projectReportingSchedules.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [projectReportingSchedules.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [projectReportingSchedules.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user_submittedBy: one(users, {
		fields: [projectReportingSchedules.submittedBy],
		references: [users.id],
		relationName: "projectReportingSchedules_submittedBy_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [projectReportingSchedules.approvedBy],
		references: [users.id],
		relationName: "projectReportingSchedules_approvedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [projectReportingSchedules.createdBy],
		references: [users.id],
		relationName: "projectReportingSchedules_createdBy_users_id"
	}),
}));

export const quotationAnalysisLineItemsRelations = relations(quotationAnalysisLineItems, ({one, many}) => ({
	purchaseOrderLineItems: many(purchaseOrderLineItems),
	quotationAnalysis: one(quotationAnalyses, {
		fields: [quotationAnalysisLineItems.quotationAnalysisId],
		references: [quotationAnalyses.id]
	}),
	quotationAnalysisSupplier: one(quotationAnalysisSuppliers, {
		fields: [quotationAnalysisLineItems.supplierId],
		references: [quotationAnalysisSuppliers.id]
	}),
	purchaseRequestLineItem: one(purchaseRequestLineItems, {
		fields: [quotationAnalysisLineItems.lineItemId],
		references: [purchaseRequestLineItems.id]
	}),
}));

export const quotationAnalysisAuditLogRelations = relations(quotationAnalysisAuditLog, ({one}) => ({
	quotationAnalysis: one(quotationAnalyses, {
		fields: [quotationAnalysisAuditLog.quotationAnalysisId],
		references: [quotationAnalyses.id]
	}),
	user: one(users, {
		fields: [quotationAnalysisAuditLog.changedBy],
		references: [users.id]
	}),
}));

export const quotationAnalysesRelations = relations(quotationAnalyses, ({many}) => ({
	quotationAnalysisAuditLogs: many(quotationAnalysisAuditLog),
	quotationAnalysisLineItems: many(quotationAnalysisLineItems),
}));

export const quotationAnalysisSuppliersRelations = relations(quotationAnalysisSuppliers, ({many}) => ({
	quotationAnalysisLineItems: many(quotationAnalysisLineItems),
}));

export const rbacRolesRelations = relations(rbacRoles, ({one, many}) => ({
	organization: one(organizations, {
		fields: [rbacRoles.organizationId],
		references: [organizations.id]
	}),
	user_deletedBy: one(users, {
		fields: [rbacRoles.deletedBy],
		references: [users.id],
		relationName: "rbacRoles_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [rbacRoles.createdBy],
		references: [users.id],
		relationName: "rbacRoles_createdBy_users_id"
	}),
	rbacUserPermissions: many(rbacUserPermissions),
}));

export const rbacUserPermissionsRelations = relations(rbacUserPermissions, ({one}) => ({
	user_userId: one(users, {
		fields: [rbacUserPermissions.userId],
		references: [users.id],
		relationName: "rbacUserPermissions_userId_users_id"
	}),
	organization: one(organizations, {
		fields: [rbacUserPermissions.organizationId],
		references: [organizations.id]
	}),
	rbacRole: one(rbacRoles, {
		fields: [rbacUserPermissions.roleId],
		references: [rbacRoles.id]
	}),
	user_updatedBy: one(users, {
		fields: [rbacUserPermissions.updatedBy],
		references: [users.id],
		relationName: "rbacUserPermissions_updatedBy_users_id"
	}),
}));

export const rfqVendorItemsRelations = relations(rfqVendorItems, ({one}) => ({
	rfqVendor: one(rfqVendors, {
		fields: [rfqVendorItems.rfqVendorId],
		references: [rfqVendors.id]
	}),
	purchaseRequestLineItem: one(purchaseRequestLineItems, {
		fields: [rfqVendorItems.prLineItemId],
		references: [purchaseRequestLineItems.id]
	}),
}));

export const rfqVendorsRelations = relations(rfqVendors, ({one, many}) => ({
	rfqVendorItems: many(rfqVendorItems),
	organization: one(organizations, {
		fields: [rfqVendors.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [rfqVendors.operatingUnitId],
		references: [operatingUnits.id]
	}),
	purchaseRequest: one(purchaseRequests, {
		fields: [rfqVendors.purchaseRequestId],
		references: [purchaseRequests.id]
	}),
	vendor: one(vendors, {
		fields: [rfqVendors.supplierId],
		references: [vendors.id]
	}),
	user_deletedBy: one(users, {
		fields: [rfqVendors.deletedBy],
		references: [users.id],
		relationName: "rfqVendors_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [rfqVendors.createdBy],
		references: [users.id],
		relationName: "rfqVendors_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [rfqVendors.updatedBy],
		references: [users.id],
		relationName: "rfqVendors_updatedBy_users_id"
	}),
}));

export const rfqsRelations = relations(rfqs, ({one}) => ({
	organization: one(organizations, {
		fields: [rfqs.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [rfqs.operatingUnitId],
		references: [operatingUnits.id]
	}),
	purchaseRequest: one(purchaseRequests, {
		fields: [rfqs.purchaseRequestId],
		references: [purchaseRequests.id]
	}),
	user_deletedBy: one(users, {
		fields: [rfqs.deletedBy],
		references: [users.id],
		relationName: "rfqs_deletedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [rfqs.createdBy],
		references: [users.id],
		relationName: "rfqs_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [rfqs.updatedBy],
		references: [users.id],
		relationName: "rfqs_updatedBy_users_id"
	}),
}));

export const riskHistoryRelations = relations(riskHistory, ({one}) => ({
	risk: one(risks, {
		fields: [riskHistory.riskId],
		references: [risks.id]
	}),
	organization: one(organizations, {
		fields: [riskHistory.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [riskHistory.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user: one(users, {
		fields: [riskHistory.changedBy],
		references: [users.id]
	}),
}));

export const stockBatchesRelations = relations(stockBatches, ({one, many}) => ({
	organization: one(organizations, {
		fields: [stockBatches.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [stockBatches.operatingUnitId],
		references: [operatingUnits.id]
	}),
	stockItem: one(stockItems, {
		fields: [stockBatches.itemId],
		references: [stockItems.id]
	}),
	grnLineItem: one(grnLineItems, {
		fields: [stockBatches.grnLineItemId],
		references: [grnLineItems.id]
	}),
	stockIssueLines: many(stockIssueLines),
	stockLedgers: many(stockLedger),
	stockReservations: many(stockReservations),
	warehouseTransferLines: many(warehouseTransferLines),
}));

export const stockItemsRelations = relations(stockItems, ({many}) => ({
	stockBatches: many(stockBatches),
	stockIssueLines: many(stockIssueLines),
	stockLedgers: many(stockLedger),
	stockReservations: many(stockReservations),
	warehouseTransferLines: many(warehouseTransferLines),
}));

export const grnLineItemsRelations = relations(grnLineItems, ({many}) => ({
	stockBatches: many(stockBatches),
}));

export const stockIssueLinesRelations = relations(stockIssueLines, ({one}) => ({
	stockIssue: one(stockIssues, {
		fields: [stockIssueLines.issueId],
		references: [stockIssues.id]
	}),
	stockItem: one(stockItems, {
		fields: [stockIssueLines.itemId],
		references: [stockItems.id]
	}),
	stockBatch: one(stockBatches, {
		fields: [stockIssueLines.batchId],
		references: [stockBatches.id]
	}),
}));

export const stockIssuesRelations = relations(stockIssues, ({one, many}) => ({
	stockIssueLines: many(stockIssueLines),
	organization: one(organizations, {
		fields: [stockIssues.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [stockIssues.operatingUnitId],
		references: [operatingUnits.id]
	}),
	project: one(projects, {
		fields: [stockIssues.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [stockIssues.issuedBy],
		references: [users.id]
	}),
}));

export const stockLedgerRelations = relations(stockLedger, ({one}) => ({
	organization: one(organizations, {
		fields: [stockLedger.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [stockLedger.operatingUnitId],
		references: [operatingUnits.id]
	}),
	stockBatch: one(stockBatches, {
		fields: [stockLedger.batchId],
		references: [stockBatches.id]
	}),
	stockItem: one(stockItems, {
		fields: [stockLedger.itemId],
		references: [stockItems.id]
	}),
	user: one(users, {
		fields: [stockLedger.userId],
		references: [users.id]
	}),
}));

export const stockReservationsRelations = relations(stockReservations, ({one}) => ({
	organization: one(organizations, {
		fields: [stockReservations.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [stockReservations.operatingUnitId],
		references: [operatingUnits.id]
	}),
	stockBatch: one(stockBatches, {
		fields: [stockReservations.batchId],
		references: [stockBatches.id]
	}),
	stockItem: one(stockItems, {
		fields: [stockReservations.itemId],
		references: [stockItems.id]
	}),
	user: one(users, {
		fields: [stockReservations.reservedBy],
		references: [users.id]
	}),
}));

export const userActiveScopeRelations = relations(userActiveScope, ({one}) => ({
	user: one(users, {
		fields: [userActiveScope.userId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [userActiveScope.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [userActiveScope.operatingUnitId],
		references: [operatingUnits.id]
	}),
}));

export const userArchiveLogRelations = relations(userArchiveLog, ({one}) => ({
	user_userId: one(users, {
		fields: [userArchiveLog.userId],
		references: [users.id],
		relationName: "userArchiveLog_userId_users_id"
	}),
	user_performedBy: one(users, {
		fields: [userArchiveLog.performedBy],
		references: [users.id],
		relationName: "userArchiveLog_performedBy_users_id"
	}),
}));

export const userPermissionOverridesRelations = relations(userPermissionOverrides, ({one}) => ({
	user_userId: one(users, {
		fields: [userPermissionOverrides.userId],
		references: [users.id],
		relationName: "userPermissionOverrides_userId_users_id"
	}),
	organization: one(organizations, {
		fields: [userPermissionOverrides.organizationId],
		references: [organizations.id]
	}),
	user_createdBy: one(users, {
		fields: [userPermissionOverrides.createdBy],
		references: [users.id],
		relationName: "userPermissionOverrides_createdBy_users_id"
	}),
}));

export const varianceAlertConfigRelations = relations(varianceAlertConfig, ({one}) => ({
	project: one(projects, {
		fields: [varianceAlertConfig.projectId],
		references: [projects.id]
	}),
	organization: one(organizations, {
		fields: [varianceAlertConfig.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [varianceAlertConfig.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user_createdBy: one(users, {
		fields: [varianceAlertConfig.createdBy],
		references: [users.id],
		relationName: "varianceAlertConfig_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [varianceAlertConfig.updatedBy],
		references: [users.id],
		relationName: "varianceAlertConfig_updatedBy_users_id"
	}),
}));

export const varianceAlertHistoryRelations = relations(varianceAlertHistory, ({one}) => ({
	project: one(projects, {
		fields: [varianceAlertHistory.projectId],
		references: [projects.id]
	}),
	budgetItem: one(budgetItems, {
		fields: [varianceAlertHistory.budgetItemId],
		references: [budgetItems.id]
	}),
	organization: one(organizations, {
		fields: [varianceAlertHistory.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [varianceAlertHistory.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user: one(users, {
		fields: [varianceAlertHistory.acknowledgedBy],
		references: [users.id]
	}),
}));

export const vendorDocumentsRelations = relations(vendorDocuments, ({one}) => ({
	vendor: one(vendors, {
		fields: [vendorDocuments.vendorId],
		references: [vendors.id]
	}),
	organization: one(organizations, {
		fields: [vendorDocuments.organizationId],
		references: [organizations.id]
	}),
	user_verifiedBy: one(users, {
		fields: [vendorDocuments.verifiedBy],
		references: [users.id],
		relationName: "vendorDocuments_verifiedBy_users_id"
	}),
	user_uploadedBy: one(users, {
		fields: [vendorDocuments.uploadedBy],
		references: [users.id],
		relationName: "vendorDocuments_uploadedBy_users_id"
	}),
}));

export const vendorParticipationHistoryRelations = relations(vendorParticipationHistory, ({one}) => ({
	vendor: one(vendors, {
		fields: [vendorParticipationHistory.vendorId],
		references: [vendors.id]
	}),
	organization: one(organizations, {
		fields: [vendorParticipationHistory.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [vendorParticipationHistory.operatingUnitId],
		references: [operatingUnits.id]
	}),
	purchaseRequest: one(purchaseRequests, {
		fields: [vendorParticipationHistory.purchaseRequestId],
		references: [purchaseRequests.id]
	}),
}));

export const vendorPerformanceEvaluationsRelations = relations(vendorPerformanceEvaluations, ({one}) => ({
	vendor: one(vendors, {
		fields: [vendorPerformanceEvaluations.vendorId],
		references: [vendors.id]
	}),
	organization: one(organizations, {
		fields: [vendorPerformanceEvaluations.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [vendorPerformanceEvaluations.operatingUnitId],
		references: [operatingUnits.id]
	}),
	user_evaluatedBy: one(users, {
		fields: [vendorPerformanceEvaluations.evaluatedBy],
		references: [users.id],
		relationName: "vendorPerformanceEvaluations_evaluatedBy_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [vendorPerformanceEvaluations.approvedBy],
		references: [users.id],
		relationName: "vendorPerformanceEvaluations_approvedBy_users_id"
	}),
}));

export const warehouseTransferLinesRelations = relations(warehouseTransferLines, ({one}) => ({
	warehouseTransfer: one(warehouseTransfers, {
		fields: [warehouseTransferLines.transferId],
		references: [warehouseTransfers.id]
	}),
	stockItem: one(stockItems, {
		fields: [warehouseTransferLines.itemId],
		references: [stockItems.id]
	}),
	stockBatch: one(stockBatches, {
		fields: [warehouseTransferLines.batchId],
		references: [stockBatches.id]
	}),
}));

export const warehouseTransfersRelations = relations(warehouseTransfers, ({one, many}) => ({
	warehouseTransferLines: many(warehouseTransferLines),
	organization: one(organizations, {
		fields: [warehouseTransfers.organizationId],
		references: [organizations.id]
	}),
	operatingUnit: one(operatingUnits, {
		fields: [warehouseTransfers.operatingUnitId],
		references: [operatingUnits.id]
	}),
	project: one(projects, {
		fields: [warehouseTransfers.projectId],
		references: [projects.id]
	}),
	user_createdBy: one(users, {
		fields: [warehouseTransfers.createdBy],
		references: [users.id],
		relationName: "warehouseTransfers_createdBy_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [warehouseTransfers.approvedBy],
		references: [users.id],
		relationName: "warehouseTransfers_approvedBy_users_id"
	}),
	user_dispatchedBy: one(users, {
		fields: [warehouseTransfers.dispatchedBy],
		references: [users.id],
		relationName: "warehouseTransfers_dispatchedBy_users_id"
	}),
	user_receivedBy: one(users, {
		fields: [warehouseTransfers.receivedBy],
		references: [users.id],
		relationName: "warehouseTransfers_receivedBy_users_id"
	}),
}));


// ============================================================================
// Contract Management Relations
// ============================================================================



export const contractPenaltiesRelations = relations(contractPenalties, ({one}) => ({
	contract: one(contracts, {
		fields: [contractPenalties.contractId],
		references: [contracts.id]
	}),
	organization: one(organizations, {
		fields: [contractPenalties.organizationId],
		references: [organizations.id]
	}),
	milestone: one(contractMilestones, {
		fields: [contractPenalties.linkedMilestoneId],
		references: [contractMilestones.id]
	}),
}));

export const contractPaymentScheduleRelations = relations(contractPaymentSchedule, ({one}) => ({
	contract: one(contracts, {
		fields: [contractPaymentSchedule.contractId],
		references: [contracts.id]
	}),
	organization: one(organizations, {
		fields: [contractPaymentSchedule.organizationId],
		references: [organizations.id]
	}),
	milestone: one(contractMilestones, {
		fields: [contractPaymentSchedule.linkedMilestoneId],
		references: [contractMilestones.id]
	}),
}));

export const contractRetentionTermsRelations = relations(contractRetentionTerms, ({one}) => ({
	contract: one(contracts, {
		fields: [contractRetentionTerms.contractId],
		references: [contracts.id]
	}),
	organization: one(organizations, {
		fields: [contractRetentionTerms.organizationId],
		references: [organizations.id]
	}),
}));

export const implementationMonitoringRelations = relations(implementationMonitoring, ({one, many}) => ({
	contract: one(contracts, {
		fields: [implementationMonitoring.contractId],
		references: [contracts.id]
	}),
	organization: one(organizations, {
		fields: [implementationMonitoring.organizationId],
		references: [organizations.id]
	}),
	checklistItems: many(implementationChecklist),
	primaryHandovers: many(primaryHandover),
	finalHandovers: many(finalHandover),
	observations: many(implementationObservations),
}));

export const implementationChecklistRelations = relations(implementationChecklist, ({one}) => ({
	monitoring: one(implementationMonitoring, {
		fields: [implementationChecklist.monitoringId],
		references: [implementationMonitoring.id]
	}),
	organization: one(organizations, {
		fields: [implementationChecklist.organizationId],
		references: [organizations.id]
	}),
	milestone: one(contractMilestones, {
		fields: [implementationChecklist.milestoneId],
		references: [contractMilestones.id]
	}),
}));

export const primaryHandoverRelations = relations(primaryHandover, ({one}) => ({
	monitoring: one(implementationMonitoring, {
		fields: [primaryHandover.monitoringId],
		references: [implementationMonitoring.id]
	}),
	organization: one(organizations, {
		fields: [primaryHandover.organizationId],
		references: [organizations.id]
	}),
}));

export const finalHandoverRelations = relations(finalHandover, ({one}) => ({
	monitoring: one(implementationMonitoring, {
		fields: [finalHandover.monitoringId],
		references: [implementationMonitoring.id]
	}),
	organization: one(organizations, {
		fields: [finalHandover.organizationId],
		references: [organizations.id]
	}),
}));

export const implementationObservationsRelations = relations(implementationObservations, ({one}) => ({
	monitoring: one(implementationMonitoring, {
		fields: [implementationObservations.monitoringId],
		references: [implementationMonitoring.id]
	}),
	organization: one(organizations, {
		fields: [implementationObservations.organizationId],
		references: [organizations.id]
	}),
}));
/**
 * Relations for generatedDocuments table
 * Defines relationships to organizations, operating units, and users
 */
export const generatedDocumentsRelations = relations(generatedDocuments, ({ one }) => ({
  /**
   * Organization that owns this document
   */
  organization: one(organizations, {
    fields: [generatedDocuments.organizationId],
    references: [organizations.id],
  }),

  /**
   * Operating unit (optional) for this document
   */
  operatingUnit: one(operatingUnits, {
    fields: [generatedDocuments.operatingUnitId],
    references: [operatingUnits.id],
  }),

  /**
   * User who generated this document
   */
  generatedByUser: one(users, {
    fields: [generatedDocuments.generatedBy],
    references: [users.id],
  }),
}));

/**
 * Update organizationsRelations to include generatedDocuments
 * Add this to the existing organizationsRelations function
 */
export const organizationsRelationsUpdate = {
  // ... existing relations ...
  generatedDocuments: 'many(generatedDocuments)', // Add this line
};

/**
 * Update operatingUnitsRelations to include generatedDocuments
 * Add this to the existing operatingUnitsRelations function
 */
export const operatingUnitsRelationsUpdate = {
  // ... existing relations ...
  generatedDocuments: 'many(generatedDocuments)', // Add this line
};

/**
 * Update usersRelations to include generatedDocuments
 * Add this to the existing usersRelations function
 */
export const usersRelationsUpdate = {
  // ... existing relations ...
  generatedDocuments: 'many(generatedDocuments)', // Add this line
};

/**
 * ============================================================================
 * HOW TO INTEGRATE INTO relations.ts
 * ============================================================================
 * 
 * 1. Add the import at the top of relations.ts:
 *    import { generatedDocuments } from './schema';
 * 
 * 2. Add the generatedDocumentsRelations export:
 *    export const generatedDocumentsRelations = relations(generatedDocuments, ({ one }) => ({
 *      organization: one(organizations, {
 *        fields: [generatedDocuments.organizationId],
 *        references: [organizations.id],
 *      }),
 *      operatingUnit: one(operatingUnits, {
 *        fields: [generatedDocuments.operatingUnitId],
 *        references: [operatingUnits.id],
 *      }),
 *      generatedByUser: one(users, {
 *        fields: [generatedDocuments.generatedBy],
 *        references: [users.id],
 *      }),
 *    }));
 * 
 * 3. Update existing relations to include generatedDocuments:
 * 
 *    a) In organizationsRelations, add:
 *       generatedDocuments: many(generatedDocuments),
 * 
 *    b) In operatingUnitsRelations, add:
 *       generatedDocuments: many(generatedDocuments),
 * 
 *    c) In usersRelations, add:
 *       generatedDocuments: many(generatedDocuments),
 * 
 * ============================================================================
 * USAGE EXAMPLES
 * ============================================================================
 * 
 * // Get a document with its organization
 * const doc = await db.query.generatedDocuments.findFirst({
 *   where: eq(generatedDocuments.id, docId),
 *   with: {
 *     organization: true,
 *     generatedByUser: true,
 *   },
 * });
 * 
 * // Get all documents for an organization
 * const docs = await db.query.organizations.findFirst({
 *   where: eq(organizations.id, orgId),
 *   with: {
 *     generatedDocuments: true,
 *   },
 * });
 * 
 * // Get all documents generated by a user
 * const docs = await db.query.users.findFirst({
 *   where: eq(users.id, userId),
 *   with: {
 *     generatedDocuments: true,
 *   },
 * });
 * 
 * ============================================================================
 */