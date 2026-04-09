import { router } from '../../_core/trpc';
import { contractRouter } from './contract';
import { sacRouter } from './sac';
import { glPostingRouter } from './glPosting';
import { type2InvoiceRouter } from './type2Invoice';
import { purchaseRequestRouter } from './purchaseRequest';
import { bidOpeningMinutesRouter } from './bidOpeningMinutes';
import { contractPenaltiesRouter } from './contractPenalties';
import { contractPaymentScheduleRouter } from './contractPaymentSchedule';
import { contractRetentionRouter } from './contractRetention';
import { implementationMonitoringRouter } from './implementationMonitoring';
import { contractFinancialDashboardRouter } from './contractFinancialDashboard';
import { contractVariationsRouter } from './contractVariations';
import { vendorEvaluationRouter } from './vendorEvaluation';

/**
 * Procurement Phase A Router
 * Aggregates all Phase A (Consultancy Flow) routers
 * Includes: Contracts, SAC, GL Posting Events, Contract Management sub-cards
 */
export const procurementPhaseARouter = router({
  contracts: contractRouter,
  sac: sacRouter,
  glPosting: glPostingRouter,
  type2Invoice: type2InvoiceRouter,
  purchaseRequest: purchaseRequestRouter,
  bidOpeningMinutes: bidOpeningMinutesRouter,
  contractPenalties: contractPenaltiesRouter,
  contractPaymentSchedule: contractPaymentScheduleRouter,
  contractRetention: contractRetentionRouter,
  implementationMonitoring: implementationMonitoringRouter,
  contractFinancialDashboard: contractFinancialDashboardRouter,
  contractVariations: contractVariationsRouter,
  vendorEvaluation: vendorEvaluationRouter,
});
