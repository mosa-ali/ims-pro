/**
 * ============================================================================
 * SANCTIONS & DISCIPLINARY - DATA SERVICE
 * ============================================================================
 * 
 * Manages all disciplinary cases and policy documents in localStorage
 */

import { DisciplinaryCase, PolicyDocument } from './types';

const STORAGE_KEYS = {
 CASES: 'hr_disciplinary_cases',
 POLICIES: 'hr_disciplinary_policies',
 CASE_COUNTER: 'hr_disciplinary_case_counter'
};

// ============================================================================
// CASE MANAGEMENT
// ============================================================================

export const sanctionsService = {
 // Get all cases
 getAllCases(): DisciplinaryCase[] {
 try {
 const data = localStorage.getItem(STORAGE_KEYS.CASES);
 return data ? JSON.parse(data) : [];
 } catch {
 return [];
 }
 },

 // Get case by reference number
 getCaseByReference(caseRef: string): DisciplinaryCase | null {
 const cases = this.getAllCases();
 return cases.find(c => c.caseReferenceNumber === caseRef) || null;
 },

 // Get cases by staff ID
 getCasesByStaffId(staffId: string): DisciplinaryCase[] {
 const cases = this.getAllCases();
 return cases.filter(c => c.staffId === staffId);
 },

 // Save case
 saveCase(caseData: DisciplinaryCase): void {
 const cases = this.getAllCases();
 const existingIndex = cases.findIndex(
 c => c.caseReferenceNumber === caseData.caseReferenceNumber
 );

 if (existingIndex >= 0) {
 cases[existingIndex] = {
 ...caseData,
 lastUpdatedDate: new Date().toISOString()
 };
 } else {
 cases.push({
 ...caseData,
 createdDate: new Date().toISOString(),
 lastUpdatedDate: new Date().toISOString()
 });
 }

 localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cases));
 },

 // Generate unique case reference number
 generateCaseReference(): string {
 try {
 const counter = localStorage.getItem(STORAGE_KEYS.CASE_COUNTER);
 const nextNumber = counter ? parseInt(counter) + 1 : 1;
 localStorage.setItem(STORAGE_KEYS.CASE_COUNTER, nextNumber.toString());
 
 const year = new Date().getFullYear();
 return `DC-${year}-${nextNumber.toString().padStart(4, '0')}`;
 } catch {
 return `DC-${new Date().getFullYear()}-0001`;
 }
 },

 // Delete case
 deleteCase(caseRef: string): void {
 const cases = this.getAllCases();
 const filtered = cases.filter(c => c.caseReferenceNumber !== caseRef);
 localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(filtered));
 },

 // Add audit entry
 addAuditEntry(caseRef: string, action: string, details: string, formStep: any, performedBy: string): void {
 const caseData = this.getCaseByReference(caseRef);
 if (!caseData) return;

 const auditEntry = {
 timestamp: new Date().toISOString(),
 action,
 performedBy,
 details,
 formStep
 };

 caseData.auditTrail = [...(caseData.auditTrail || []), auditEntry];
 this.saveCase(caseData);
 }
};

// ============================================================================
// POLICY MANAGEMENT
// ============================================================================

export const policyService = {
 // Get all policies
 getAllPolicies(): PolicyDocument[] {
 try {
 const data = localStorage.getItem(STORAGE_KEYS.POLICIES);
 return data ? JSON.parse(data) : [];
 } catch {
 return [];
 }
 },

 // Save policy
 savePolicy(policy: PolicyDocument): void {
 const policies = this.getAllPolicies();
 const existingIndex = policies.findIndex(p => p.id === policy.id);

 if (existingIndex >= 0) {
 policies[existingIndex] = policy;
 } else {
 policies.push(policy);
 }

 localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(policies));
 },

 // Delete policy
 deletePolicy(id: string): void {
 const policies = this.getAllPolicies();
 const filtered = policies.filter(p => p.id !== id);
 localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(filtered));
 },

 // Generate policy ID
 generatePolicyId(): string {
 return `POL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
 }
};
