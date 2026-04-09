/**
 * ============================================================================
 * SANCTIONS & DISCIPLINARY MODULE - MAIN CONTAINER
 * ============================================================================
 * 
 * PURPOSE:
 * Legal HR control system for complete disciplinary case management
 * 
 * STRUCTURE:
 * - Main View: Employees List (entry point)
 * - Workflow: 6-step form-based disciplinary process
 * - Sub-tab: Policies & Guidelines
 * 
 * CORE PRINCIPLES:
 * - Audit-ready and legally defensible
 * - Workflow-driven (not free-form notes)
 * - Official printable HR forms
 * - Step-by-step enforcement
 * - Read-only after submission
 * - Full audit trail
 * 
 * ============================================================================
 */

import { Route, Switch, useRoute } from 'wouter';
import { SanctionsDisciplinaryMain } from './sanctions/SanctionsDisciplinaryMain';
import { Form1_CaseInitiation } from './sanctions/Form1_CaseInitiation';
import { Form2_InvestigationAppointment } from './sanctions/Form2_InvestigationAppointment';
import { Form3_InvestigationReport } from './sanctions/Form3_InvestigationReport';
import { Form4_DisciplinaryDecision } from './sanctions/Form4_DisciplinaryDecision';
import { Form5_DisciplinaryApproval } from './sanctions/Form5_DisciplinaryApproval';
import { Form6_FinalRecord } from './sanctions/Form6_FinalRecord';

export function SanctionsDisciplinary() {
  // Get the base path from current location
  const [, params] = useRoute('/hr/sanctions/:rest*');
  const [, orgParams] = useRoute('/organization/hr/sanctions/:rest*');
  
  const basePath = orgParams ? '/organization/hr/sanctions' : '/hr/sanctions';

  return (
    <Switch>
      <Route path={`${basePath}/form1/:staffId`}>
        {(params) => <Form1_CaseInitiation staffId={params.staffId} />}
      </Route>
      <Route path={`${basePath}/form1/case/:caseRef`}>
        {(params) => <Form1_CaseInitiation caseRef={params.caseRef} />}
      </Route>
      <Route path={`${basePath}/form2/:caseRef`}>
        {(params) => <Form2_InvestigationAppointment caseRef={params.caseRef} />}
      </Route>
      <Route path={`${basePath}/form3/:caseRef`}>
        {(params) => <Form3_InvestigationReport caseRef={params.caseRef} />}
      </Route>
      <Route path={`${basePath}/form4/:caseRef`}>
        {(params) => <Form4_DisciplinaryDecision caseRef={params.caseRef} />}
      </Route>
      <Route path={`${basePath}/form5/:caseRef`}>
        {(params) => <Form5_DisciplinaryApproval caseRef={params.caseRef} />}
      </Route>
      <Route path={`${basePath}/form6/:caseRef`}>
        {(params) => <Form6_FinalRecord caseRef={params.caseRef} />}
      </Route>
      <Route>
        <SanctionsDisciplinaryMain />
      </Route>
    </Switch>
  );
}
