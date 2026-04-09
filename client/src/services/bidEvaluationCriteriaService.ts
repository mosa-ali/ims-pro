// ============================================================================
// BID EVALUATION CRITERIA SERVICE
// Single source of truth for tender evaluation - Auto-syncs to CBA
// Integrated Management System (IMS)
// ============================================================================

import type {
 BidEvaluationCriteria,
 BidEvaluationRequirement,
 BidEvaluationBidder,
 BidEvaluationScore
} from '@/app/types/logistics.types';

const STORAGE_KEY = 'bid_evaluation_criteria_v1';

// ============================================================================
// DEFAULT EVALUATION CRITERIA TEMPLATE
// Based on OFFICIAL SPECIFICATION
// ============================================================================

const DEFAULT_EVALUATION_SECTIONS = [
 {
 section: 'Legal & Administrative',
 requirements: [
 { name: 'Company Registration', details: 'Valid registration certificate', weight: 2 },
 { name: 'Tax Card', details: 'Current tax registration', weight: 1 },
 { name: 'Insurance', details: 'Valid company insurance', weight: 1 },
 { name: 'Signed Declarations', details: 'All required declarations signed', weight: 2 },
 { name: 'Sanctions / Screening', details: 'Cleared from sanctions lists', weight: 4 }
 ],
 totalWeight: 10
 },
 {
 section: 'Experience & Technical Capacity',
 requirements: [
 { name: 'Company Profile', details: 'Comprehensive company documentation', weight: 5 },
 { name: 'Years of Experience', details: 'Relevant industry experience', weight: 5 },
 { name: 'Similar INGO Contracts', details: 'Past work with INGOs/NGOs', weight: 10 }
 ],
 totalWeight: 20
 },
 {
 section: 'Operational & Financial Capacity',
 requirements: [
 { name: 'Presence in Target Area', details: 'Local office/operations', weight: 4 },
 { name: 'Delivery Time', details: 'Proposed delivery schedule', weight: 4 },
 { name: 'Validity of Offer', details: 'Offer validity period', weight: 2 },
 { name: 'Payment Terms', details: 'Acceptable payment conditions', weight: 3 },
 { name: 'Bank Guarantee', details: 'Performance guarantee provided', weight: 4 },
 { name: 'Bank Account Verification', details: 'Verified bank details', weight: 3 }
 ],
 totalWeight: 20
 },
 {
 section: 'Samples',
 requirements: [
 { name: 'Sample Quality', details: 'Quality of submitted samples (if applicable)', weight: 8 }
 ],
 totalWeight: 8
 },
 {
 section: 'References',
 requirements: [
 { name: 'Client References', details: 'Verified client references', weight: 7 }
 ],
 totalWeight: 7
 }
];

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const bidEvaluationCriteriaService = {
 
 /**
 * Get all evaluation criteria sets
 */
 getAll(): BidEvaluationCriteria[] {
 const data = localStorage.getItem(STORAGE_KEY);
 return data ? JSON.parse(data) : [];
 },

 /**
 * Get evaluation criteria by PR ID
 */
 getByPRId(prId: string): BidEvaluationCriteria | null {
 const all = this.getAll();
 return all.find(c => c.prId === prId) || null;
 },

 /**
 * Initialize evaluation criteria for a tender PR
 */
 initialize(
 prId: string,
 prNumber: string,
 tenderRfqNumber: string | undefined,
 organizationId: string,
 organizationName: string,
 operatingUnitId: string,
 operatingUnitName: string,
 userId: string
 ): BidEvaluationCriteria {
 // Check if already exists
 const existing = this.getByPRId(prId);
 if (existing) {
 return existing;
 }

 // Create default requirements from template
 const requirements: BidEvaluationRequirement[] = [];
 let order = 1;

 DEFAULT_EVALUATION_SECTIONS.forEach(section => {
 section.requirements.forEach(req => {
 requirements.push({
 id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 section: section.section,
 requirementName: req.name,
 details: req.details,
 weight: req.weight,
 order: order++,
 hidden: false,
 createdAt: new Date().toISOString(),
 createdBy: userId,
 updatedAt: new Date().toISOString(),
 updatedBy: userId
 });
 });
 });

 const criteria: BidEvaluationCriteria = {
 id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 prId,
 prNumber,
 tenderRfqNumber,
 organizationId,
 organizationName,
 operatingUnitId,
 operatingUnitName,
 evaluationDate: new Date().toISOString().split('T')[0],
 bidders: [],
 requirements,
 scores: [],
 bidderTotals: {},
 status: 'draft',
 criteriaLocked: false,
 biddersLocked: false,
 createdAt: new Date().toISOString(),
 createdBy: userId,
 updatedAt: new Date().toISOString(),
 updatedBy: userId
 };

 this.save(criteria);
 return criteria;
 },

 /**
 * Save evaluation criteria
 */
 save(criteria: BidEvaluationCriteria): void {
 const all = this.getAll();
 const index = all.findIndex(c => c.id === criteria.id);
 
 if (index >= 0) {
 all[index] = criteria;
 } else {
 all.push(criteria);
 }
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
 },

 /**
 * Add bidder
 */
 addBidder(prId: string, bidderName: string, userId: string): BidEvaluationCriteria | null {
 const criteria = this.getByPRId(prId);
 if (!criteria || criteria.biddersLocked) {
 return null;
 }

 const newBidder: BidEvaluationBidder = {
 id: `bidder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 bidderName,
 order: criteria.bidders.length + 1,
 locked: false
 };

 criteria.bidders.push(newBidder);
 criteria.updatedAt = new Date().toISOString();
 criteria.updatedBy = userId;

 // Initialize scores for this bidder
 criteria.requirements.forEach(req => {
 criteria.scores.push({
 requirementId: req.id,
 bidderId: newBidder.id,
 score: 0,
 notes: ''
 });
 });

 this.save(criteria);
 return criteria;
 },

 /**
 * Remove bidder
 */
 removeBidder(prId: string, bidderId: string, userId: string): BidEvaluationCriteria | null {
 const criteria = this.getByPRId(prId);
 if (!criteria || criteria.biddersLocked) {
 return null;
 }

 criteria.bidders = criteria.bidders.filter(b => b.id !== bidderId);
 criteria.scores = criteria.scores.filter(s => s.bidderId !== bidderId);
 delete criteria.bidderTotals[bidderId];
 
 criteria.updatedAt = new Date().toISOString();
 criteria.updatedBy = userId;

 this.save(criteria);
 return criteria;
 },

 /**
 * Add requirement
 */
 addRequirement(
 prId: string,
 section: string,
 requirementName: string,
 details: string,
 weight: number,
 userId: string
 ): BidEvaluationCriteria | null {
 const criteria = this.getByPRId(prId);
 if (!criteria || criteria.criteriaLocked) {
 return null;
 }

 const newReq: BidEvaluationRequirement = {
 id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 section,
 requirementName,
 details,
 weight,
 order: criteria.requirements.length + 1,
 hidden: false,
 createdAt: new Date().toISOString(),
 createdBy: userId,
 updatedAt: new Date().toISOString(),
 updatedBy: userId
 };

 criteria.requirements.push(newReq);

 // Initialize scores for all bidders
 criteria.bidders.forEach(bidder => {
 criteria.scores.push({
 requirementId: newReq.id,
 bidderId: bidder.id,
 score: 0,
 notes: ''
 });
 });

 criteria.updatedAt = new Date().toISOString();
 criteria.updatedBy = userId;

 this.save(criteria);
 return criteria;
 },

 /**
 * Update requirement
 */
 updateRequirement(
 prId: string,
 requirementId: string,
 updates: Partial<BidEvaluationRequirement>,
 userId: string
 ): BidEvaluationCriteria | null {
 const criteria = this.getByPRId(prId);
 if (!criteria) {
 return null;
 }

 const req = criteria.requirements.find(r => r.id === requirementId);
 if (!req) {
 return null;
 }

 Object.assign(req, updates, {
 updatedAt: new Date().toISOString(),
 updatedBy: userId
 });

 criteria.updatedAt = new Date().toISOString();
 criteria.updatedBy = userId;

 this.save(criteria);
 return criteria;
 },

 /**
 * Hide/show requirement (cannot delete)
 */
 toggleRequirementVisibility(
 prId: string,
 requirementId: string,
 userId: string
 ): BidEvaluationCriteria | null {
 const criteria = this.getByPRId(prId);
 if (!criteria) {
 return null;
 }

 const req = criteria.requirements.find(r => r.id === requirementId);
 if (!req) {
 return null;
 }

 req.hidden = !req.hidden;
 req.updatedAt = new Date().toISOString();
 req.updatedBy = userId;

 criteria.updatedAt = new Date().toISOString();
 criteria.updatedBy = userId;

 this.save(criteria);
 return criteria;
 },

 /**
 * Update score
 */
 updateScore(
 prId: string,
 requirementId: string,
 bidderId: string,
 score: number,
 notes: string | undefined,
 userId: string
 ): BidEvaluationCriteria | null {
 const criteria = this.getByPRId(prId);
 if (!criteria) {
 return null;
 }

 // Find or create score
 let scoreEntry = criteria.scores.find(
 s => s.requirementId === requirementId && s.bidderId === bidderId
 );

 if (scoreEntry) {
 scoreEntry.score = score;
 if (notes !== undefined) {
 scoreEntry.notes = notes;
 }
 } else {
 criteria.scores.push({
 requirementId,
 bidderId,
 score,
 notes: notes || ''
 });
 }

 // Recalculate bidder total
 this.recalculateTotals(criteria);

 criteria.updatedAt = new Date().toISOString();
 criteria.updatedBy = userId;

 this.save(criteria);
 return criteria;
 },

 /**
 * Recalculate bidder totals
 */
 recalculateTotals(criteria: BidEvaluationCriteria): void {
 criteria.bidderTotals = {};

 criteria.bidders.forEach(bidder => {
 let total = 0;
 
 criteria.scores
 .filter(s => s.bidderId === bidder.id)
 .forEach(score => {
 const req = criteria.requirements.find(r => r.id === score.requirementId);
 if (req && !req.hidden) {
 // Ensure score doesn't exceed weight
 const validScore = Math.min(score.score, req.weight);
 total += validScore;
 }
 });

 criteria.bidderTotals[bidder.id] = total;
 });
 },

 /**
 * Start evaluation (lock criteria and bidders)
 */
 startEvaluation(prId: string, userId: string): BidEvaluationCriteria | null {
 const criteria = this.getByPRId(prId);
 if (!criteria) {
 return null;
 }

 criteria.status = 'in_progress';
 criteria.criteriaLocked = true;
 criteria.biddersLocked = true;
 
 criteria.updatedAt = new Date().toISOString();
 criteria.updatedBy = userId;

 this.save(criteria);
 return criteria;
 },

 /**
 * Finalize evaluation
 */
 finalize(prId: string, userId: string): BidEvaluationCriteria | null {
 const criteria = this.getByPRId(prId);
 if (!criteria) {
 return null;
 }

 this.recalculateTotals(criteria);
 
 criteria.status = 'finalized';
 criteria.updatedAt = new Date().toISOString();
 criteria.updatedBy = userId;

 this.save(criteria);
 return criteria;
 },

 /**
 * Get total weight of all requirements
 */
 getTotalWeight(criteria: BidEvaluationCriteria): number {
 return criteria.requirements
 .filter(r => !r.hidden)
 .reduce((sum, r) => sum + r.weight, 0);
 },

 /**
 * Get requirements by section
 */
 getRequirementsBySection(criteria: BidEvaluationCriteria): Record<string, BidEvaluationRequirement[]> {
 const grouped: Record<string, BidEvaluationRequirement[]> = {};
 
 criteria.requirements
 .filter(r => !r.hidden)
 .forEach(req => {
 if (!grouped[req.section]) {
 grouped[req.section] = [];
 }
 grouped[req.section].push(req);
 });

 return grouped;
 },

 /**
 * Update header/approval fields
 */
 updateHeader(prId: string, updates: Partial<BidEvaluationCriteria>, userId: string): BidEvaluationCriteria | null {
 const criteria = this.getByPRId(prId);
 if (!criteria) return null;

 Object.assign(criteria, updates);
 criteria.updatedAt = new Date().toISOString();
 criteria.updatedBy = userId;

 this.save(criteria);
 return criteria;
 },

 /**
 * Delete evaluation criteria (only if not started)
 */
 delete(prId: string): boolean {
 const criteria = this.getByPRId(prId);
 if (!criteria || criteria.status !== 'draft') {
 return false;
 }

 const all = this.getAll();
 const filtered = all.filter(c => c.prId !== prId);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
 return true;
 }
};
