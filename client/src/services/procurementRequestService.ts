import { ProcurementRequest, ProcurementRequestItem } from '@/app/types/logistics.types';
import { deletionPolicyService } from './deletionPolicyService';
import { procurementWorkflowEngine } from './procurementWorkflowEngine';
import { procurementBudgetValidationService } from './procurementBudgetValidationService';

// ============================================================================
// PROCUREMENT REQUEST SERVICE
// ============================================================================

const STORAGE_KEY = 'ims_procurement_requests';

// Sample data with approved PRs containing items
const INITIAL_DATA: ProcurementRequest[] = [
 {
 id: 'pr-test-case-1-800',
 prNumber: 'PR-2026-00050',
 requestDate: '2026-01-27T10:00:00.000Z',
 requestedById: 'emp-001',
 requestedByName: 'Ali Hassan',
 requestingDepartment: 'Health',
 projectId: 'proj-001',
 projectName: 'Clinic Support Project',
 grantId: 'grant-001',
 grantName: 'Global Fund Health',
 category: 'goods',
 urgencyLevel: 'medium',
 justification: 'Critical medicine supply for local clinic.',
 deliveryLocation: 'Main Health Center',
 status: 'approved',
 currency: 'USD',
 budgetLineId: 'bl-medicine',
 budgetLineName: 'Essential Medicine',
 budgetAvailable: 5000,
 totalEstimatedCost: 800,
 items: [
 {
 id: 'item-tc1',
 description: 'First Aid Kits (Standard)',
 quantity: 20,
 unit: 'kit',
 estimatedUnitCost: 40,
 estimatedTotalCost: 800
 }
 ],
 createdAt: '2026-01-27T09:00:00.000Z',
 updatedAt: '2026-01-27T10:30:00.000Z',
 canEdit: false,
 canDelete: false,
 operatingUnitId: 'ou-001',
 organizationId: 'org-001',
 requestedBy: 'emp-001',
 updatedBy: 'emp-001'
 },
 {
 id: 'pr-test-case-2-10k',
 prNumber: 'PR-2026-00051',
 requestDate: '2026-01-27T11:00:00.000Z',
 requestedById: 'emp-001',
 requestedByName: 'Ali Hassan',
 requestingDepartment: 'Logistics',
 projectId: 'proj-001',
 projectName: 'Clinic Support Project',
 grantId: 'grant-001',
 grantName: 'Global Fund Health',
 category: 'goods',
 urgencyLevel: 'high',
 justification: 'Laboratory equipment for regional diagnostics.',
 deliveryLocation: 'Regional Lab Office',
 status: 'approved',
 currency: 'USD',
 budgetLineId: 'bl-lab',
 budgetLineName: 'Laboratory Equipment',
 budgetAvailable: 25000,
 totalEstimatedCost: 10000,
 items: [
 {
 id: 'item-tc2',
 description: 'Blood Analysis Machines',
 quantity: 2,
 unit: 'unit',
 estimatedUnitCost: 5000,
 estimatedTotalCost: 10000
 }
 ],
 createdAt: '2026-01-27T10:00:00.000Z',
 updatedAt: '2026-01-27T11:30:00.000Z',
 canEdit: false,
 canDelete: false,
 operatingUnitId: 'ou-001',
 organizationId: 'org-001',
 requestedBy: 'emp-001',
 updatedBy: 'emp-001'
 },
 {
 id: 'pr-test-case-3-30k',
 prNumber: 'PR-2026-00052',
 requestDate: '2026-01-27T12:00:00.000Z',
 requestedById: 'emp-001',
 requestedByName: 'Ali Hassan',
 requestingDepartment: 'Infrastructure',
 projectId: 'proj-002',
 projectName: 'Water Sanitation Project',
 grantId: 'grant-002',
 grantName: 'UNICEF WASH',
 category: 'goods',
 urgencyLevel: 'urgent',
 justification: 'Construction of new water tower for IDP camp.',
 deliveryLocation: 'IDP Camp Area B',
 status: 'approved',
 currency: 'USD',
 budgetLineId: 'bl-infrastructure',
 budgetLineName: 'Water Infrastructure',
 budgetAvailable: 50000,
 totalEstimatedCost: 30000,
 items: [
 {
 id: 'item-tc3',
 description: 'Water Tower Structure (100k Liters)',
 quantity: 1,
 unit: 'set',
 estimatedUnitCost: 30000,
 estimatedTotalCost: 30000
 }
 ],
 createdAt: '2026-01-27T11:00:00.000Z',
 updatedAt: '2026-01-27T12:30:00.000Z',
 canEdit: false,
 canDelete: false,
 operatingUnitId: 'ou-001',
 organizationId: 'org-001',
 requestedBy: 'emp-001',
 updatedBy: 'emp-001'
 }
];

class ProcurementRequestService {
 private getAll(): ProcurementRequest[] {
 try {
 const data = localStorage.getItem(STORAGE_KEY);
 let requests: ProcurementRequest[] = [];
 
 if (!data || data === 'null') {
 requests = INITIAL_DATA;
 } else {
 requests = JSON.parse(data);
 }
 
 if (!Array.isArray(requests)) requests = INITIAL_DATA;
 
 // ✅ Ensure mandatory test cases are always present (ERP Authority Rule)
 const mandatoryIds = INITIAL_DATA.map(r => r.id);
 const existingIds = requests.map(r => r.id);
 
 INITIAL_DATA.forEach(mandatoryPR => {
 if (!existingIds.includes(mandatoryPR.id)) {
 requests.push(mandatoryPR);
 }
 });
 
 // ✅ Always deduplicate on load to prevent React key errors
 const unique = Array.from(new Map(requests.map(r => [r.id, r])).values());
 return unique;
 } catch (e) {
 console.error('[PR Service] Error loading data:', e);
 return INITIAL_DATA;
 }
 }

 private save(requests: ProcurementRequest[]): void {
 if (!Array.isArray(requests)) return;
 
 // ✅ Deduplicate by ID before saving to prevent key errors
 const unique = Array.from(new Map(requests.map(r => [r.id, r])).values());
 localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
 }

 private initializeData(): void {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
 }

 // Generate next PR number
 generatePRNumber(): string {
 const requests = this.getAll();
 const year = new Date().getFullYear();
 const yearRequests = requests.filter(r => r.prNumber.startsWith(`PR-${year}-`));
 const nextNumber = yearRequests.length + 1;
 return `PR-${year}-${String(nextNumber).padStart(5, '0')}`;
 }

 // Get all requests
 getAllRequests(): ProcurementRequest[] {
 return this.getAll();
 }

 // Get by ID
 getRequestById(id: string): ProcurementRequest | null {
 const requests = this.getAll();
 return requests.find(r => r.id === id) || null;
 }

 // Alias for getRequestById (for compatibility)
 getById(id: string): ProcurementRequest | null {
 return this.getRequestById(id);
 }

 // Get by PR Number
 getRequestByNumber(prNumber: string): ProcurementRequest | null {
 const requests = this.getAll();
 return requests.find(r => r.prNumber === prNumber) || null;
 }

 // Create new request
 createRequest(request: Omit<ProcurementRequest, 'id' | 'prNumber' | 'createdAt' | 'updatedAt' | 'canEdit' | 'canDelete'>): ProcurementRequest {
 const requests = this.getAll();
 
 // Set edit/delete permissions based on status
 const canEdit = request.status === 'draft';
 const canDelete = request.status === 'draft';
 
 const newRequest: ProcurementRequest = {
 ...request,
 id: `pr-${Date.now()}`,
 prNumber: this.generatePRNumber(),
 canEdit,
 canDelete,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString()
 };
 
 requests.push(newRequest);
 this.save(requests);
 return newRequest;
 }

 /**
 * VALIDATE PR FOR SUBMISSION
 * Enforces all mandatory rules before PR can be submitted
 */
 validatePRForSubmission(pr: ProcurementRequest): { valid: boolean; errors: string[] } {
 const errors: string[] = [];
 
 // ❌ Cannot submit without items
 if (!pr.items || pr.items.length === 0) {
 errors.push('PR cannot be submitted without line items');
 }
 
 // ❌ Cannot submit with USD 0 total
 if (pr.totalEstimatedCost === 0) {
 errors.push('PR total cannot be USD 0');
 }
 
 // ❌ Cannot submit without project OR grant
 if (!pr.projectId && !pr.grantId) {
 errors.push('PR must be linked to a Project or Grant');
 }
 
 // ❌ Cannot submit without budget line
 if (!pr.budgetLineId) {
 errors.push('PR must have a Budget Line');
 } else if (pr.projectId) {
 // ✅ BUDGET ENFORCEMENT AT SUBMISSION
 const budgetValidation = procurementBudgetValidationService.validateBudgetBalance(
 pr.projectId,
 pr.budgetLineId,
 pr.totalEstimatedCost
 );
 if (!budgetValidation.isValid) {
 errors.push(budgetValidation.errorMessage || 'Budget validation failed');
 }
 }
 
 // Validate all items
 if (pr.items && pr.items.length > 0) {
 pr.items.forEach((item, index) => {
 if (item.quantity <= 0) {
 errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
 }
 if (item.estimatedUnitCost <= 0) {
 errors.push(`Item ${index + 1}: Estimated Unit Cost must be greater than 0`);
 }
 });
 }
 
 return {
 valid: errors.length === 0,
 errors
 };
 }

 /**
 * SUBMIT PR
 * Changes status from draft to submitted and locks editing
 */
 submitPR(id: string, userId: string): { success: boolean; error?: string; pr?: ProcurementRequest } {
 const pr = this.getRequestById(id);
 if (!pr) {
 return { success: false, error: 'PR not found' };
 }
 
 // Only drafts can be submitted
 if (pr.status !== 'draft') {
 return { success: false, error: 'Only draft PRs can be submitted' };
 }
 
 // Validate
 const validation = this.validatePRForSubmission(pr);
 if (!validation.valid) {
 return { 
 success: false, 
 error: `PR validation failed:\n${validation.errors.join('\n')}` 
 };
 }
 
 // Update status and lock editing
 const updatedPR = this.updateRequest(id, {
 status: 'submitted',
 canEdit: false, // ❌ NO EDITS AFTER SUBMISSION
 canDelete: false, // ❌ NO DELETION AFTER SUBMISSION
 updatedBy: userId
 });
 
 return { 
 success: true, 
 pr: updatedPR || undefined 
 };
 }

 // Update request (with canEdit check)
 updateRequest(id: string, updates: Partial<ProcurementRequest>): ProcurementRequest | null {
 const requests = this.getAll();
 const index = requests.findIndex(r => r.id === id);
 if (index === -1) return null;

 const current = requests[index];
 
 // ❌ Cannot edit after submission (unless changing status via workflow)
 if (!current.canEdit && updates.status === undefined) {
 console.error('[PR Service] Cannot edit PR after submission');
 return null;
 }

 // Update canEdit/canDelete based on new status
 let canEdit = current.canEdit;
 let canDelete = current.canDelete;
 
 if (updates.status) {
 canEdit = updates.status === 'draft';
 canDelete = updates.status === 'draft';
 }

 requests[index] = {
 ...current,
 ...updates,
 canEdit,
 canDelete,
 updatedAt: new Date().toISOString()
 };
 
 this.save(requests);
 
 // ✅ CRITICAL: Trigger workflow automation when PR is approved
 if (updates.status === 'approved' && current.status !== 'approved') {
 console.log('🚀 [PR Service] PR approved - triggering workflow automation');
 setTimeout(() => {
 const result = procurementWorkflowEngine.onPRApproved(id, updates.approvedById || 'system', updated);
 if (result.success) {
 console.log('✅ [PR Service] Workflow automation triggered - RFQ created:', result.rfqId);
 } else {
 console.error('❌ [PR Service] Workflow automation failed:', result.error);
 }
 }, 100);
 }
 
 return requests[index];
 }

 // Delete request (environment-aware deletion policy)
 deleteRequest(id: string, userId: string = 'system'): boolean {
 const requests = this.getAll();
 const pr = requests.find(r => r.id === id);
 
 if (!pr) {
 console.error('[PR Service] PR not found:', id);
 return false;
 }
 
 // ✅ CRITICAL: Use centralized deletion policy (environment-aware)
 const validation = deletionPolicyService.validateDeletion(pr.status, 'PR');
 
 if (!validation.allowed) {
 console.error('[PR Service]', validation.reason);
 deletionPolicyService.logDeletionAttempt('PR', id, pr.status, userId, false);
 return false;
 }
 
 // Log successful deletion
 deletionPolicyService.logDeletionAttempt('PR', id, pr.status, userId, true);
 
 const filteredRequests = requests.filter(r => r.id !== id);
 if (filteredRequests.length === requests.length) return false;
 this.save(filteredRequests);
 
 console.log(`✅ [PR Service] PR deleted successfully (${validation.environmentMode} mode)`);
 return true;
 }

 // Set all (for import)
 setAll(requests: ProcurementRequest[]): void {
 this.save(requests);
 }

 // Get stats
 getStats() {
 const requests = this.getAll();
 return {
 total: requests.length,
 pending: requests.filter(r => r.status === 'pending_approval').length,
 approved: requests.filter(r => r.status === 'approved').length,
 draft: requests.filter(r => r.status === 'draft').length,
 rejected: requests.filter(r => r.status === 'rejected').length,
 totalValue: requests.reduce((sum, r) => sum + r.totalEstimatedCost, 0)
 };
 }
}

export const procurementRequestService = new ProcurementRequestService();