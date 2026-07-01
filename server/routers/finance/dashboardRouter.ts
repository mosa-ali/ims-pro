/**
 * server/routers/finance/dashboardRouter.ts
 *
 * Finance Dashboard Master Router
 * Aggregates all dashboard subrouters into a single entry point.
 *
 * Subrouters:
 * - kpi - KPI metrics and calculations
 * - health - Financial health scoring
 * - risk - Risk assessment and alerts
 * - forecast - Financial forecasting
 * - compliance - Compliance tracking
 * - cashFlow - Cash flow analysis
 * - p2p - Procure-to-Pay analytics
 * - filter - Filter options and metadata
 */

import { router } from '../../_core/trpc';
import { kpiRouter } from './kpiRouter';
import { healthRouter } from './healthRouter';
import { riskRouter } from './riskRouter';
import { forecastRouter } from './forecastRouter';
import { complianceRouter } from './complianceRouter';
import { cashFlowRouter } from './cashFlowRouter';
import { p2pRouter } from './p2pRouter';
import { filterRouter } from './filterRouter';

export const dashboardRouter = router({
  kpi: kpiRouter,
  health: healthRouter,
  risk: riskRouter,
  forecast: forecastRouter,
  compliance: complianceRouter,
  cashFlow: cashFlowRouter,
  p2p: p2pRouter,
  filter: filterRouter,
});

export type DashboardRouter = typeof dashboardRouter;
