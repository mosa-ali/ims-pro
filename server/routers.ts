import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { imsRouter } from "./routers/ims";
import { getDb } from "./db";
import { userOrganizations, userOperatingUnits } from "../drizzle/schema";
import { budgetAnalysisExpensesRouter } from "./budgetAnalysisExpensesRouter";
import { eq } from "drizzle-orm";
import { projectsRouter } from "./projectsRouter";
import { grantsRouter } from "./grantsRouter";
import { reportingSchedulesRouter } from "./reportingSchedulesRouter";
import { proposalsRouter } from "./proposalsRouter";
import { fundingRouter } from "./fundingRouter";
import { forecastRouter } from "./forecastRouter";
import { expensesRouter } from "./expensesRouter";
import { budgetItemsRouter } from "./budgetItemsRouter";
import { varianceAlertsRouter } from "./varianceAlertsRouter";
import { activitiesRouter } from "./activitiesRouter";
import { indicatorsRouter } from "./indicatorsRouter";
import { beneficiariesRouter } from "./beneficiariesRouter";
import { tasksRouter } from "./tasksRouter";
import { procurementRouter } from "./procurementRouter";
import { systemReportsRouter } from "./systemReportsRouter";
import { projectPlanRouter } from "./projectPlanRouter";
import { caseManagementRouter } from "./caseManagementRouter";
import { mealSurveysRouter } from "./mealSurveysRouter";
import { mealAccountabilityRouter } from "./mealAccountabilityRouter";
import { mealIndicatorDataRouter } from "./mealIndicatorDataRouter";
import { mealDocumentsRouter } from "./mealDocumentsRouter";
import { mealReportsRouter } from "./mealReportsRouter";
import { mealLearningRouter } from "./mealLearningRouter";
import { mealDqaRouter } from "./mealDqaRouter";
import { mealSettingsRouter } from "./mealSettingsRouter";
import { hrEmployeesRouter } from "./hrEmployeesRouter";
import { hrLeaveRouter } from "./hrLeaveRouter";
import { hrAttendanceRouter } from "./hrAttendanceRouter";
import { hrPayrollRouter } from "./hrPayrollRouter";
import { hrSanctionsRouter } from "./hrSanctionsRouter";
import { hrAnnualPlanRouter } from "./hrAnnualPlanRouter";
import { hrDocumentsRouter } from "./hrDocumentsRouter";
import { hrRecruitmentRouter } from "./hrRecruitmentRouter";
import { hrSalaryScaleRouter } from "./hrSalaryScaleRouter";
import { chartOfAccountsRouter } from "./chartOfAccountsRouter";
import { fiscalPeriodLockingRouter } from "./fiscalPeriodLockingEngine";
import { immutableJournalsRouter } from "./immutableJournalsEngine";
import { advancesRouter } from "./advancesRouter";
import { treasuryRouter } from "./treasuryRouter";
import { assetsRouter } from "./assetsRouter";
import { financeSettingsRouter } from "./financeSettingsRouter";
import { logisticsRouter } from "./logisticsRouter";
import { emailVerificationRouter } from "./routers/emailVerificationRouter";
import { financeRouter } from "./routers/finance";
import { dashboardRouter } from "./dashboardRouter";
import { budgetsRouter } from "./budgetsRouter";
import { budgetLinesRouter } from "./budgetLinesRouter";
import { budgetMonthlyAllocationsRouter } from "./budgetMonthlyAllocationsRouter";
import { donorBudgetExportRouter } from "./donorBudgetExportRouter";
import { budgetExpenditureRouter } from "./budgetExpenditureRouter";
import { glAccountsRouter, glAccountCategoriesRouter } from "./glAccountsRouter";
import { vendorsRouter } from "./vendorsRouter";
import { blacklistRouter } from "./blacklistRouter";
import { bankTransactionsRouter, bankReconciliationsRouter } from "./bankReconciliationRouter";
import { paymentsRouter, paymentLinesRouter } from "./paymentsRouter";
import { paymentBatchRouter, paymentReportsRouter, paymentReconciliationRouter } from "./paymentBatchRouter";
import { bankStatementRouter } from "./bankStatementRouter";
import { bankStatementImportRouter } from "./bankStatementImportRouter";
import { expendituresRouter } from "./expendituresRouter";
import { journalEntriesRouter } from "./journalEntriesRouter";
import { exchangeRatesRouter } from "./exchangeRatesRouter";
import { financialAnalyticsRouter } from "./financialAnalyticsRouter";
import { costAllocationRouter } from "./costAllocationRouter";
import { donorsRouter } from "./donorsRouter";
import { donorCommunicationsRouter } from "./donorCommunicationsRouter";
import { donorReportsRouter } from "./donorReportsRouter";
import { donorProjectsRouter } from "./donorProjectsRouter";
import { settingsRouter } from "./routers/settingsRouter";
import { riskComplianceRouter } from "./routers/riskComplianceRouter";
import { mitigationActionsRouter } from "./routers/mitigationActionsRouter";
import { vendorRouter } from "./vendorRouter";
import { prFinanceRouter } from "./prFinanceRouter";
import { documentsRouter } from "./documentsRouter";
import { documentVersioningRouter } from "./routers/documentVersioningRouter";
import { documentRetentionRouter } from "./routers/documentRetentionRouter";
import { documentStorageConfigRouter } from "./routers/documentStorageConfigRouter";
import { documentManagementRouter } from "./routers/documentManagementRouter";
import { documentSyncRulesRouter } from "./routers/documentSyncRulesRouter";
import { documentSearchRouter } from "./routers/documentSearchRouter";
import { financeDeletionGovernanceRouter } from "./financeDeletionGovernance";
import { threeWayMatchingRouter } from "./threeWayMatchingRouter";
import { glPostingEngineRouter } from "./glPostingEngine";
import { procurementPhaseARouter } from "./routers/procurement";
import { unitTypesRouter } from "./routers/masterData/unitTypesRouter";
import { authRouter } from "./routers/authRouter";
import { requestAccessRouter } from "./routers/auth/requestAccessRouter";
import { microsoftOnboardingRouter } from "./routers/microsoftOnboardingRouter";
import { onboardingRouter } from "./routers/onboardingRouter";
import { procurementDocumentRouter } from "./routers/procurementDocumentRouter";
import { vendorDocumentRouter } from "./routers/vendorDocumentRouter";
import { stockDocumentRouter } from "./routers/stockDocumentRouter";
import { fleetDocumentRouter } from "./routers/fleetDocumentRouter";
import { prDocumentRouter } from "./routers/prDocumentRouter";
import { documentSyncRouter } from "./routers/documentSyncRouter";
import { emailTemplateRouter } from "./routers/emailTemplateRouter";
import { emailQueueRouter } from "./routers/emailQueueRouter";
import { emailWebhookRouter } from "./routers/emailWebhookRouter";
import { emailAnalyticsRouter } from "./routers/emailAnalyticsRouter";
import { webhookConfigRouter } from "./routers/webhookConfigRouter";
import { performanceDashboardRouter } from "./routers/performanceDashboardRouter";
import { emailProviderConfigRouter } from "./routers/emailProviderConfigRouter";
import { emailDeliveryStatusRouter } from "./routers/emailDeliveryStatusRouter";
import { emailTemplateVersionRouter } from "./routers/emailTemplateVersionRouter";
import { z } from "zod";
import { bidderAcknowledgementSignatures, serviceAcceptanceCertificates, contracts, vendors, users } from "../drizzle/schema";
import { rbacRolesRouter } from "./routers/auth/rbacRolesRouter";

export const appRouter = router({
  // Public signature verification (no auth required)
  rbac: rbacRolesRouter, 
  verifySignature: publicProcedure
    .input(z.object({ code: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { valid: false, type: null, message: 'Service unavailable' };

      // 1. Check bid receipt acknowledgement signatures
      const bidSig = await db.query.bidderAcknowledgementSignatures.findFirst({
        where: eq(bidderAcknowledgementSignatures.verificationCode, input.code),
      });

      if (bidSig) {
        // Get signer info
        let signerName = '';
        let signerTitle = '';
        const bidSignedBy = (bidSig as any).signedBy;
            if (bidSignedBy) {
              const signer = await db.query.users.findFirst({
                where: eq(users.id, bidSignedBy),
              });
              signerName = signer?.name || '';
            }
            signerTitle = (bidSig as any).signerTitle || '';
        return {
          valid: true,
          type: 'bid_receipt' as const,
          signerName,
          signerTitle,
          signedAt: bidSig.signedAt,
          documentType: 'Bid Receipt Acknowledgement',
          documentTypeAr: 'إشعار استلام العرض',
        };
      }

      // 2. Check SAC verification codes
      const sac = await db.query.serviceAcceptanceCertificates.findFirst({
        where: eq(serviceAcceptanceCertificates.verificationCode, input.code),
      });

      if (sac && sac.status === 'approved' && sac.signatureHash) {
        let signerName = '';
        if (sac.signedBy) {
          const signer = await db.query.users.findFirst({
            where: eq(users.id, sac.signedBy),
          });
          signerName = signer?.name || '';
        }

        // Get contract/vendor info
        let vendorName = '';
        let contractNumber = '';
        const contract = await db.query.contracts.findFirst({
          where: eq(contracts.id, sac.contractId),
        });
        if (contract) {
          contractNumber = contract.contractNumber || '';
          if (contract.vendorId) {
            const vendor = await db.query.vendors.findFirst({
              where: eq(vendors.id, contract.vendorId),
            });
            vendorName = vendor?.name || '';
          }
        }

        return {
          valid: true,
          type: 'sac' as const,
          signerName,
          signerTitle: '',
          signedAt: sac.signedAt,
          documentType: 'Service Acceptance Certificate',
          documentTypeAr: 'شهادة قبول الخدمة',
          sacNumber: sac.sacNumber,
          contractNumber,
          vendorName,
          amount: sac.approvedAmount,
          currency: sac.currency,
        };
      }

      return { valid: false, type: null, message: 'Verification code not found' };
    }),

    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  requestAccess: requestAccessRouter,
  systemReports: systemReportsRouter,
  auth: router({
  // Microsoft Entra ID procedures
  microsoftStatus: authRouter.microsoftStatus,
  getMicrosoftLoginUrl: authRouter.getMicrosoftLoginUrl,
  handleMicrosoftCallback: authRouter.handleMicrosoftCallback,
  searchMicrosoft365Users: authRouter.searchMicrosoft365Users,
  getMicrosoft365User: authRouter.getMicrosoft365User,
  logoutMicrosoft: authRouter.logoutMicrosoft,
  
  // Email/Password Authentication
  loginWithEmail: authRouter.getMicrosoftLoginUrl,
  emailSignIn: authRouter.emailSignIn,
  logout: authRouter.logout,
  registerWithEmail: authRouter.registerWithEmail,
  bulkImportMicrosoft365Users: authRouter.bulkImportMicrosoft365Users,
  requestPasswordReset: authRouter.requestPasswordReset,
  resetPassword: authRouter.resetPassword,

    // Existing procedures
      me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user) return null;

      const db = await getDb();
      if (!db) return user;

      const userOrgAssignments = await db
        .select({
          organizationId: userOrganizations.organizationId,
          tenantId: userOrganizations.tenantId,
          platformRole: userOrganizations.platformRole,
          orgRoles: userOrganizations.orgRoles,
          permissions: userOrganizations.permissions,
        })
        .from(userOrganizations)
        .where(eq(userOrganizations.userId, user.id))
        .limit(1);

      const userUnitAssignments = await db
        .select({
          operatingUnitId: userOperatingUnits.operatingUnitId,
        })
        .from(userOperatingUnits)
        .where(eq(userOperatingUnits.userId, user.id))
        .limit(1);

      const orgContext = userOrgAssignments[0] || {};
      const unitContext = userUnitAssignments[0] || {};

      return {
        ...user,
        organizationId: orgContext.organizationId || null,
        operatingUnitId: unitContext.operatingUnitId || null,
        tenantId: orgContext.tenantId || null,
        platformRole: orgContext.platformRole || null,
        orgRoles: orgContext.orgRoles ? JSON.parse(orgContext.orgRoles) : [],
        permissions: orgContext.permissions ? JSON.parse(orgContext.permissions) : {},
      };
    }),

    logoutLegacy: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // IMS Hierarchy Management
  ims: imsRouter,

  // Finance Management
  finance: financeRouter,

  // Projects Management
  projects: projectsRouter,

  // Grants Management
  grants: grantsRouter,

  // Reporting Schedules
  reportingSchedules: reportingSchedulesRouter,

  // Proposals & Pipeline Management
  proposals: proposalsRouter,

  // Funding Records (SSOT: Opportunities, Pipeline, Proposals)
  funding: fundingRouter,

  // Forecast Plan & Expenses
  forecast: forecastRouter,
  expenses: expensesRouter,
  budgetItems: budgetItemsRouter,
  varianceAlerts: varianceAlertsRouter,

  // Project Activities, Indicators, Beneficiaries, Tasks, Procurement
  activities: activitiesRouter,
  indicators: indicatorsRouter,
  beneficiaries: beneficiariesRouter,
  tasks: tasksRouter,
  procurement: procurementRouter,
  procurementDocument: procurementDocumentRouter,
  vendorDocument: vendorDocumentRouter,
  stockDocument: stockDocumentRouter,
  fleetDocument: fleetDocumentRouter,
  prDocument: prDocumentRouter,
  documentSync: documentSyncRouter,
  projectPlan: projectPlanRouter,

  // Case Management Module
  caseManagement: caseManagementRouter,

  // MEAL Module (Monitoring, Evaluation, Accountability & Learning)
  mealSurveys: mealSurveysRouter,
  mealAccountability: mealAccountabilityRouter,
  mealIndicatorData: mealIndicatorDataRouter,
  mealDocuments: mealDocumentsRouter,
  mealReports: mealReportsRouter,
  mealLearning: mealLearningRouter,
  mealDqa: mealDqaRouter,
  mealSettings: mealSettingsRouter,

  // HR Module (Human Resources Management)
  hrEmployees: hrEmployeesRouter,
  hrLeave: hrLeaveRouter,
  hrAttendance: hrAttendanceRouter,
  hrPayroll: hrPayrollRouter,
  hrSanctions: hrSanctionsRouter,
  hrAnnualPlan: hrAnnualPlanRouter,
  hrDocuments: hrDocumentsRouter,
  hrRecruitment: hrRecruitmentRouter,
  hrSalaryScale: hrSalaryScaleRouter,

  // Finance Module
  chartOfAccounts: chartOfAccountsRouter,
  fiscalPeriodLocking: fiscalPeriodLockingRouter,
  immutableJournals: immutableJournalsRouter,
  advances: advancesRouter,
  expenditures: expendituresRouter,
  treasury: treasuryRouter,
  assets: assetsRouter,
  financeSettings: financeSettingsRouter,

  // Logistics & Procurement Module
  logistics: logisticsRouter,
  procurementPhaseA: procurementPhaseARouter,

  // Dashboard
  dashboard: dashboardRouter,

  // Donor-Compliant Budget System (NEW)
  budgets: budgetsRouter,
  budgetLines: budgetLinesRouter,
  budgetMonthlyAllocations: budgetMonthlyAllocationsRouter,
  budgetAnalysisExpenses: budgetAnalysisExpensesRouter,
  donorBudgetExport: donorBudgetExportRouter,
  budgetExpenditure: budgetExpenditureRouter,

  // GL/COA Management
  glAccounts: glAccountsRouter,
  glAccountCategories: glAccountCategoriesRouter,

  // Vendor Management
  vendors: vendorsRouter,
  blacklist: blacklistRouter,

  // Bank Reconciliation
  bankTransactions: bankTransactionsRouter,
  bankReconciliations: bankReconciliationsRouter,

  // Payment Processing
  payments: paymentsRouter,
  paymentLines: paymentLinesRouter,
  paymentBatch: paymentBatchRouter,
  paymentReports: paymentReportsRouter,
  paymentReconciliation: paymentReconciliationRouter,
  bankStatement: bankStatementRouter,
  bankStatementImport: bankStatementImportRouter,
  journalEntries: journalEntriesRouter,
  exchangeRates: exchangeRatesRouter,
  financialAnalytics: financialAnalyticsRouter,

  // Cost Allocation Module
  costAllocation: costAllocationRouter,

  // Donor CRM Module
  donors: donorsRouter,
  donorCommunications: donorCommunicationsRouter,
  donorReports: donorReportsRouter,
  donorProjects: donorProjectsRouter,

  // Organization Settings (Central RBAC)
  settings: settingsRouter,

  // Risk & Compliance Module
  riskCompliance: riskComplianceRouter,
  mitigationActions: mitigationActionsRouter,

  // Central Document Storage Module
  documents: documentsRouter,
  documentVersioning: documentVersioningRouter,
  documentRetention: documentRetentionRouter,
  documentStorageConfig: documentStorageConfigRouter,
  documentManagement: documentManagementRouter,
  documentSyncRules: documentSyncRulesRouter,
  documentSearch: documentSearchRouter,

  // Vendor Management & Automation
  // vendors: vendorRouter, // Duplicate - using vendorsRouter above

  // PR-Finance Integration
  prFinance: prFinanceRouter,

  // Finance Deletion Governance (Hard Delete for Draft, Soft Delete for Approved)
  financeDeletionGovernance: financeDeletionGovernanceRouter,

  // 3-Way Matching Enforcement (PO ↔ GRN ↔ Invoice with Variance Thresholds)
  threeWayMatching: threeWayMatchingRouter,

  // GL Posting Engine (Automatic Journal Entry Creation)
  glPosting: glPostingEngineRouter,

  // Master Data Management
  masterData: router({
    unitTypes: unitTypesRouter,
  }),

  // Microsoft 365 Onboarding (Multitenant Admin Consent Flow)
  microsoft: router({
    onboarding: microsoftOnboardingRouter,
  }),

  // One-Link Tenant Onboarding
  onboarding: onboardingRouter,

  // Email Template Management
  emailTemplate: emailTemplateRouter,

  // Email Queue Monitoring
  emailQueue: emailQueueRouter,

  // Email Webhook Events
  emailWebhook: emailWebhookRouter,

  // Email Analytics
  emailAnalytics: emailAnalyticsRouter,

  // Webhook Configuration
  webhookConfig: webhookConfigRouter,

  // Performance Dashboard
  performanceDashboard: performanceDashboardRouter,

  // Email Provider Configuration
  emailProviderConfig: emailProviderConfigRouter,

  // Email Delivery Status
  emailDeliveryStatus: emailDeliveryStatusRouter,

  // Email Template Version Control
  emailTemplateVersion: emailTemplateVersionRouter,

  // Email Verification
  emailVerification: emailVerificationRouter,
});

export type AppRouter = typeof appRouter;