/**
 * ============================================================================
 * HR ANNUAL PLAN MODULE - STRATEGIC HR PLANNING
 * ============================================================================
 * 
 * PURPOSE:
 * Strategic, auditable, forward-looking HR planning framework
 * 
 * CORE FEATURES:
 * - Annual human resource planning per year
 * - Staffing alignment with projects, grants, budgets
 * - Recruitment & cost forecasting
 * - HR risk tracking & mitigation
 * - Donor-ready reports
 * 
 * PRINCIPLES:
 * - Strategic (annual/multi-year)
 * - Read-only once approved
 * - Linked to Projects, Grants, Budget
 * - Printable & donor-ready
 * - EN/AR (RTL/LTR)
 * - No duplication of employee data
 * 
 * ============================================================================
 */

import { Route, Switch, useRoute } from 'wouter';
import { HRAnnualPlanDashboard } from './annual-plan/HRAnnualPlanDashboard';
import { HRAnnualPlanView } from './annual-plan/HRAnnualPlanView';

export function HRAnnualPlanModule() {
  // Get the base path from current location
  const [, params] = useRoute('/hr/annual-plan/:rest*');
  const [, orgParams] = useRoute('/organization/hr/annual-plan/:rest*');
  
  const basePath = orgParams ? '/organization/hr/annual-plan' : '/hr/annual-plan';

  return (
    <Switch>
      <Route path={`${basePath}/view/:id`}>
        {(params) => <HRAnnualPlanView id={params.id} />}
      </Route>
      <Route>
        <HRAnnualPlanDashboard />
      </Route>
    </Switch>
  );
}
