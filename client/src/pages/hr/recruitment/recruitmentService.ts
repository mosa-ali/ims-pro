/**
 * ============================================================================
 * RECRUITMENT SERVICE
 * ============================================================================
 * 
 * Complete service layer for recruitment module:
 * - Vacancy CRUD
 * - Candidate management
 * - Auto-scoring engine
 * - Interview tracking
 * - Hiring decisions
 * - Auto-employee creation
 * 
 * Storage: localStorage (ready for backend migration)
 * 
 * ============================================================================
 */

import {
 Vacancy,
 VacancyCriteria,
 Candidate,
 CandidateCriteriaResponse,
 CandidateDocument,
 Interview,
 HiringDecision,
 ApplicationFormData,
 RecruitmentKPIs,
 VacancyStatus,
 CandidateStatus,
 ShortlistStatus
} from './types';
import { staffService } from '@/app/services/hrService';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
 VACANCIES: 'hr_recruitment_vacancies',
 VACANCY_CRITERIA: 'hr_recruitment_vacancy_criteria',
 CANDIDATES: 'hr_recruitment_candidates',
 CANDIDATE_RESPONSES: 'hr_recruitment_candidate_responses',
 CANDIDATE_DOCUMENTS: 'hr_recruitment_candidate_documents',
 INTERVIEWS: 'hr_recruitment_interviews',
 HIRING_DECISIONS: 'hr_recruitment_hiring_decisions'
};

// ============================================================================
// VACANCY SERVICE
// ============================================================================

class VacancyService {
 private getAll(): Vacancy[] {
 const data = localStorage.getItem(STORAGE_KEYS.VACANCIES);
 return data ? JSON.parse(data) : [];
 }

 private save(vacancies: Vacancy[]): void {
 localStorage.setItem(STORAGE_KEYS.VACANCIES, JSON.stringify(vacancies));
 }

 create(data: Omit<Vacancy, 'id' | 'vacancyRef' | 'createdAt' | 'updatedAt'>): Vacancy {
 const vacancies = this.getAll();
 
 // Generate vacancy reference
 const vacancyRef = `VAC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
 
 const newVacancy: Vacancy = {
 ...data,
 id: `vacancy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 vacancyRef,
 createdAt: new Date().toISOString(),
 shortlistThreshold: data.shortlistThreshold || 60
 };

 vacancies.push(newVacancy);
 this.save(vacancies);
 return newVacancy;
 }

 update(id: string, data: Partial<Vacancy>): void {
 const vacancies = this.getAll();
 const index = vacancies.findIndex(v => v.id === id);
 
 if (index !== -1) {
 vacancies[index] = {
 ...vacancies[index],
 ...data,
 updatedAt: new Date().toISOString()
 };
 this.save(vacancies);
 }
 }

 delete(id: string): void {
 const vacancies = this.getAll().filter(v => v.id !== id);
 this.save(vacancies);
 }

 getById(id: string): Vacancy | undefined {
 return this.getAll().find(v => v.id === id);
 }

 getByRef(ref: string): Vacancy | undefined {
 return this.getAll().find(v => v.vacancyRef === ref);
 }

 getByStatus(status: VacancyStatus): Vacancy[] {
 return this.getAll().filter(v => v.status === status);
 }

 closeVacancy(id: string): void {
 this.update(id, { status: 'Closed' });
 }

 archiveVacancy(id: string): void {
 this.update(id, { status: 'Archived' });
 }

 openVacancy(id: string): void {
 this.update(id, { status: 'Open' });
 }
}

// ============================================================================
// VACANCY CRITERIA SERVICE
// ============================================================================

class VacancyCriteriaService {
 private getAll(): VacancyCriteria[] {
 const data = localStorage.getItem(STORAGE_KEYS.VACANCY_CRITERIA);
 return data ? JSON.parse(data) : [];
 }

 private save(criteria: VacancyCriteria[]): void {
 localStorage.setItem(STORAGE_KEYS.VACANCY_CRITERIA, JSON.stringify(criteria));
 }

 create(data: Omit<VacancyCriteria, 'id'>): VacancyCriteria {
 const allCriteria = this.getAll();
 
 const newCriteria: VacancyCriteria = {
 ...data,
 id: `criteria-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
 };

 allCriteria.push(newCriteria);
 this.save(allCriteria);
 return newCriteria;
 }

 update(id: string, data: Partial<VacancyCriteria>): void {
 const allCriteria = this.getAll();
 const index = allCriteria.findIndex(c => c.id === id);
 
 if (index !== -1) {
 allCriteria[index] = { ...allCriteria[index], ...data };
 this.save(allCriteria);
 }
 }

 delete(id: string): void {
 const allCriteria = this.getAll().filter(c => c.id !== id);
 this.save(allCriteria);
 }

 getByVacancy(vacancyId: string): VacancyCriteria[] {
 return this.getAll().filter(c => c.vacancyId === vacancyId);
 }

 validateWeights(vacancyId: string): boolean {
 const criteria = this.getByVacancy(vacancyId);
 const total = criteria.reduce((sum, c) => sum + c.weightPercentage, 0);
 return Math.abs(total - 100) < 0.01; // Allow tiny floating point errors
 }

 getTotalWeight(vacancyId: string): number {
 const criteria = this.getByVacancy(vacancyId);
 return criteria.reduce((sum, c) => sum + c.weightPercentage, 0);
 }
}

// ============================================================================
// CANDIDATE SERVICE
// ============================================================================

class CandidateService {
 private getAll(): Candidate[] {
 const data = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
 return data ? JSON.parse(data) : [];
 }

 private save(candidates: Candidate[]): void {
 localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
 }

 create(data: Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'>): Candidate {
 const candidates = this.getAll();
 
 const newCandidate: Candidate = {
 ...data,
 id: `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 createdAt: new Date().toISOString()
 };

 candidates.push(newCandidate);
 this.save(candidates);
 return newCandidate;
 }

 update(id: string, data: Partial<Candidate>): void {
 const candidates = this.getAll();
 const index = candidates.findIndex(c => c.id === id);
 
 if (index !== -1) {
 candidates[index] = {
 ...candidates[index],
 ...data,
 updatedAt: new Date().toISOString()
 };
 this.save(candidates);
 }
 }

 delete(id: string): void {
 const candidates = this.getAll().filter(c => c.id !== id);
 this.save(candidates);
 }

 getById(id: string): Candidate | undefined {
 return this.getAll().find(c => c.id === id);
 }

 getByVacancy(vacancyId: string): Candidate[] {
 return this.getAll().filter(c => c.vacancyId === vacancyId);
 }

 getByStatus(status: CandidateStatus): Candidate[] {
 return this.getAll().filter(c => c.finalStatus === status);
 }

 getShortlisted(vacancyId?: string): Candidate[] {
 const candidates = vacancyId 
 ? this.getByVacancy(vacancyId)
 : this.getAll();
 
 return candidates.filter(c => 
 c.shortlistStatus === 'Eligible' || c.shortlistStatus === 'Manual Override'
 );
 }

 updateStatus(id: string, status: CandidateStatus): void {
 this.update(id, { finalStatus: status });
 }

 manualOverrideShortlist(id: string, eligible: boolean, reason: string, by: string): void {
 this.update(id, {
 shortlistStatus: eligible ? 'Manual Override' : 'Not Eligible',
 manualOverride: true,
 overrideReason: reason,
 overrideBy: by,
 overrideDate: new Date().toISOString()
 });
 }
}

// ============================================================================
// CANDIDATE RESPONSE SERVICE
// ============================================================================

class CandidateResponseService {
 private getAll(): CandidateCriteriaResponse[] {
 const data = localStorage.getItem(STORAGE_KEYS.CANDIDATE_RESPONSES);
 return data ? JSON.parse(data) : [];
 }

 private save(responses: CandidateCriteriaResponse[]): void {
 localStorage.setItem(STORAGE_KEYS.CANDIDATE_RESPONSES, JSON.stringify(responses));
 }

 create(data: Omit<CandidateCriteriaResponse, 'id'>): CandidateCriteriaResponse {
 const responses = this.getAll();
 
 const newResponse: CandidateCriteriaResponse = {
 ...data,
 id: `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
 };

 responses.push(newResponse);
 this.save(responses);
 return newResponse;
 }

 getByCandidate(candidateId: string): CandidateCriteriaResponse[] {
 return this.getAll().filter(r => r.candidateId === candidateId);
 }

 deleteByCandidate(candidateId: string): void {
 const responses = this.getAll().filter(r => r.candidateId !== candidateId);
 this.save(responses);
 }
}

// ============================================================================
// CANDIDATE DOCUMENT SERVICE
// ============================================================================

class CandidateDocumentService {
 private getAll(): CandidateDocument[] {
 const data = localStorage.getItem(STORAGE_KEYS.CANDIDATE_DOCUMENTS);
 return data ? JSON.parse(data) : [];
 }

 private save(documents: CandidateDocument[]): void {
 localStorage.setItem(STORAGE_KEYS.CANDIDATE_DOCUMENTS, JSON.stringify(documents));
 }

 create(data: Omit<CandidateDocument, 'id' | 'uploadedAt'>): CandidateDocument {
 const documents = this.getAll();
 
 const newDocument: CandidateDocument = {
 ...data,
 id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 uploadedAt: new Date().toISOString()
 };

 documents.push(newDocument);
 this.save(documents);
 return newDocument;
 }

 getByCandidate(candidateId: string): CandidateDocument[] {
 return this.getAll().filter(d => d.candidateId === candidateId);
 }

 deleteByCandidate(candidateId: string): void {
 const documents = this.getAll().filter(d => d.candidateId !== candidateId);
 this.save(documents);
 }

 delete(id: string): void {
 const documents = this.getAll().filter(d => d.id !== id);
 this.save(documents);
 }
}

// ============================================================================
// INTERVIEW SERVICE
// ============================================================================

class InterviewService {
 private getAll(): Interview[] {
 const data = localStorage.getItem(STORAGE_KEYS.INTERVIEWS);
 return data ? JSON.parse(data) : [];
 }

 private save(interviews: Interview[]): void {
 localStorage.setItem(STORAGE_KEYS.INTERVIEWS, JSON.stringify(interviews));
 }

 create(data: Omit<Interview, 'id' | 'createdAt'>): Interview {
 const interviews = this.getAll();
 
 const newInterview: Interview = {
 ...data,
 id: `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 createdAt: new Date().toISOString()
 };

 interviews.push(newInterview);
 this.save(interviews);
 return newInterview;
 }

 update(id: string, data: Partial<Interview>): void {
 const interviews = this.getAll();
 const index = interviews.findIndex(i => i.id === id);
 
 if (index !== -1) {
 interviews[index] = { ...interviews[index], ...data };
 this.save(interviews);
 }
 }

 delete(id: string): void {
 const interviews = this.getAll().filter(i => i.id !== id);
 this.save(interviews);
 }

 getByCandidate(candidateId: string): Interview[] {
 return this.getAll()
 .filter(i => i.candidateId === candidateId)
 .sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime());
 }

 getByVacancy(vacancyId: string): Interview[] {
 return this.getAll().filter(i => i.vacancyId === vacancyId);
 }

 getUpcoming(): Interview[] {
 const now = new Date();
 return this.getAll()
 .filter(i => new Date(i.interviewDate) > now)
 .sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime());
 }
}

// ============================================================================
// HIRING DECISION SERVICE
// ============================================================================

class HiringDecisionService {
 private getAll(): HiringDecision[] {
 const data = localStorage.getItem(STORAGE_KEYS.HIRING_DECISIONS);
 return data ? JSON.parse(data) : [];
 }

 private save(decisions: HiringDecision[]): void {
 localStorage.setItem(STORAGE_KEYS.HIRING_DECISIONS, JSON.stringify(decisions));
 }

 create(data: Omit<HiringDecision, 'id' | 'createdAt' | 'updatedAt'>): HiringDecision {
 const decisions = this.getAll();
 
 const newDecision: HiringDecision = {
 ...data,
 id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 createdAt: new Date().toISOString()
 };

 decisions.push(newDecision);
 this.save(decisions);
 return newDecision;
 }

 update(id: string, data: Partial<HiringDecision>): void {
 const decisions = this.getAll();
 const index = decisions.findIndex(d => d.id === id);
 
 if (index !== -1) {
 decisions[index] = {
 ...decisions[index],
 ...data,
 updatedAt: new Date().toISOString()
 };
 this.save(decisions);
 }
 }

 getByCandidate(candidateId: string): HiringDecision | undefined {
 return this.getAll().find(d => d.candidateId === candidateId);
 }

 getByVacancy(vacancyId: string): HiringDecision[] {
 return this.getAll().filter(d => d.vacancyId === vacancyId);
 }

 approve(id: string, approvedBy: string): void {
 this.update(id, {
 decisionStatus: 'Approved',
 approvedBy,
 decisionDate: new Date().toISOString()
 });
 }

 reject(id: string, rejectedBy: string, notes: string): void {
 this.update(id, {
 decisionStatus: 'Rejected',
 approvedBy: rejectedBy,
 decisionDate: new Date().toISOString(),
 decisionNotes: notes
 });
 }

 acceptOffer(id: string): void {
 this.update(id, {
 offerAccepted: true,
 acceptanceDate: new Date().toISOString()
 });
 }

 /**
 * AUTO-CREATE STAFF RECORD + EMPLOYEE PROFILE
 * This is the critical integration point
 */
 createEmployeeFromHiring(decisionId: string): { staffId: string; employeeId: string } | null {
 const decision = this.getAll().find(d => d.id === decisionId);
 if (!decision || decision.decisionStatus !== 'Approved' || !decision.offerAccepted) {
 return null;
 }

 const candidate = candidateService.getById(decision.candidateId);
 if (!candidate) {
 return null;
 }

 // Create Staff Dictionary record
 const staffMember = staffService.create({
 fullName: candidate.fullName,
 position: candidate.positionTitle,
 department: vacancyService.getById(decision.vacancyId)?.department || 'Unknown',
 contractType: decision.contractType,
 employmentStatus: 'Active',
 contractStartDate: decision.startDate,
 contractEndDate: '', // Will be set based on contract type
 nationality: candidate.nationality,
 gender: candidate.gender,
 dateOfBirth: candidate.dateOfBirth,
 email: candidate.email,
 phone: candidate.phone
 });

 // Update hiring decision
 this.update(decisionId, {
 staffRecordCreated: true,
 staffRecordId: staffMember.id,
 employeeProfileCreated: true
 });

 // Update candidate status
 candidateService.updateStatus(candidate.id, 'Hired');

 return {
 staffId: staffMember.id,
 employeeId: staffMember.employeeId
 };
 }
}

// ============================================================================
// AUTO-SCORING ENGINE
// ============================================================================

class ScoringEngine {
 /**
 * Calculate candidate score based on criteria responses
 */
 calculateScore(candidateId: string, vacancyId: string): number {
 const criteria = vacancyCriteriaService.getByVacancy(vacancyId);
 const responses = candidateResponseService.getByCandidate(candidateId);
 
 if (criteria.length === 0) {
 return 0;
 }

 let totalScore = 0;

 criteria.forEach(criterion => {
 const response = responses.find(r => r.criteriaId === criterion.id);
 if (!response) {
 return; // Skip if no response
 }

 totalScore += response.scoreAwarded;
 });

 return Math.round(totalScore * 100) / 100; // Round to 2 decimal places
 }

 /**
 * Score individual criterion response
 */
 scoreResponse(criterion: VacancyCriteria, responseValue: any): number {
 const maxScore = criterion.weightPercentage;

 switch (criterion.criteriaType) {
 case 'YesNo':
 return responseValue === true || responseValue === 'Yes' ? maxScore : 0;

 case 'Numeric':
 const numValue = typeof responseValue === 'number' ? responseValue : parseFloat(responseValue);
 const min = criterion.minValue || 0;
 const max = criterion.maxValue || 10;
 const normalized = Math.min(Math.max((numValue - min) / (max - min), 0), 1);
 return Math.round(normalized * maxScore * 100) / 100;

 case 'Scale':
 const scaleValue = typeof responseValue === 'number' ? responseValue : parseFloat(responseValue);
 const scaleMin = criterion.minValue || 1;
 const scaleMax = criterion.maxValue || 5;
 const scaleNormalized = Math.min(Math.max((scaleValue - scaleMin) / (scaleMax - scaleMin), 0), 1);
 return Math.round(scaleNormalized * maxScore * 100) / 100;

 case 'Checklist':
 if (!Array.isArray(responseValue)) {
 return 0;
 }
 const requiredCount = criterion.options?.length || 1;
 const matchedCount = responseValue.length;
 const checklistNormalized = Math.min(matchedCount / requiredCount, 1);
 return Math.round(checklistNormalized * maxScore * 100) / 100;

 default:
 return 0;
 }
 }

 /**
 * Determine shortlist eligibility
 */
 determineShortlistStatus(score: number, threshold: number): ShortlistStatus {
 return score >= threshold ? 'Eligible' : 'Not Eligible';
 }
}

// ============================================================================
// APPLICATION SUBMISSION (PUBLIC FORM)
// ============================================================================

class ApplicationService {
 /**
 * Submit public application form
 */
 submitApplication(formData: ApplicationFormData): Candidate | null {
 // Verify vacancy is open
 const vacancy = vacancyService.getByRef(formData.vacancyRef);
 if (!vacancy || vacancy.status !== 'Open') {
 return null;
 }

 // Check closing date
 if (new Date(vacancy.closingDate) < new Date()) {
 return null;
 }

 // Create candidate record
 const candidate = candidateService.create({
 vacancyId: vacancy.id,
 vacancyRef: vacancy.vacancyRef,
 positionTitle: vacancy.positionTitle,
 fullName: formData.fullName,
 gender: formData.gender,
 nationality: formData.nationality,
 dateOfBirth: formData.dateOfBirth,
 email: formData.email,
 phone: formData.phone,
 currentLocation: formData.currentLocation,
 educationLevel: formData.educationLevel,
 fieldOfStudy: formData.fieldOfStudy,
 yearsOfExperience: formData.yearsOfExperience,
 currentEmployer: formData.currentEmployer,
 currentPosition: formData.currentPosition,
 source: 'Advertisement',
 submissionDate: new Date().toISOString(),
 autoScorePercentage: 0,
 shortlistStatus: 'Not Eligible',
 finalStatus: 'Applied'
 });

 // Save criteria responses and calculate scores
 const criteria = vacancyCriteriaService.getByVacancy(vacancy.id);
 const scoreBreakdown: any[] = [];

 criteria.forEach(criterion => {
 const responseValue = formData.criteriaResponses[criterion.id];
 if (responseValue !== undefined) {
 const scoreAwarded = scoringEngine.scoreResponse(criterion, responseValue);
 
 candidateResponseService.create({
 candidateId: candidate.id,
 criteriaId: criterion.id,
 responseValue,
 scoreAwarded
 });

 scoreBreakdown.push({
 criteriaId: criterion.id,
 criteriaName: criterion.criteriaName,
 maxScore: criterion.weightPercentage,
 scoreAwarded,
 response: String(responseValue)
 });
 }
 });

 // Calculate total score
 const totalScore = scoringEngine.calculateScore(candidate.id, vacancy.id);
 const shortlistStatus = scoringEngine.determineShortlistStatus(totalScore, vacancy.shortlistThreshold);

 // Update candidate with score
 candidateService.update(candidate.id, {
 autoScorePercentage: totalScore,
 scoreBreakdown,
 shortlistStatus
 });

 return candidateService.getById(candidate.id)!;
 }
}

// ============================================================================
// RECRUITMENT KPI SERVICE
// ============================================================================

class RecruitmentKPIService {
 calculate(): RecruitmentKPIs {
 const vacancies = vacancyService.getAll();
 const candidates = candidateService.getAll();
 const interviews = interviewService.getAll();
 const decisions = hiringDecisionService.getAll();

 // Open vacancies
 const openVacancies = vacancies.filter(v => v.status === 'Open').length;

 // Candidates in pipeline (Applied, Shortlisted, Interviewed, Selected)
 const candidatesInPipeline = candidates.filter(c => 
 ['Applied', 'Shortlisted', 'Interviewed', 'Selected'].includes(c.finalStatus)
 ).length;

 // Interviews scheduled (upcoming)
 const interviewsScheduled = interviews.filter(i => 
 new Date(i.interviewDate) > new Date()
 ).length;

 // Positions filled
 const positionsFilled = candidates.filter(c => c.finalStatus === 'Hired').length;

 // Average time to hire
 const hiredCandidates = candidates.filter(c => c.finalStatus === 'Hired');
 const timeToHireDays = hiredCandidates.map(c => {
 const submission = new Date(c.submissionDate);
 const decision = decisions.find(d => d.candidateId === c.id);
 if (decision && decision.acceptanceDate) {
 const acceptance = new Date(decision.acceptanceDate);
 return (acceptance.getTime() - submission.getTime()) / (1000 * 60 * 60 * 24);
 }
 return 0;
 });

 const averageTimeToHire = timeToHireDays.length > 0
 ? Math.round(timeToHireDays.reduce((a, b) => a + b, 0) / timeToHireDays.length)
 : 0;

 return {
 openVacancies,
 candidatesInPipeline,
 interviewsScheduled,
 positionsFilled,
 averageTimeToHire
 };
 }
}

// ============================================================================
// EXPORT SERVICES
// ============================================================================

export const vacancyService = new VacancyService();
export const vacancyCriteriaService = new VacancyCriteriaService();
export const candidateService = new CandidateService();
export const candidateResponseService = new CandidateResponseService();
export const candidateDocumentService = new CandidateDocumentService();
export const interviewService = new InterviewService();
export const hiringDecisionService = new HiringDecisionService();
export const scoringEngine = new ScoringEngine();
export const applicationService = new ApplicationService();
export const recruitmentKPIService = new RecruitmentKPIService();
