/**
 * ============================================================================
 * DATA INITIALIZATION SERVICE
 * Populates sample/mock data for testing and demonstration
 * ============================================================================
 */

import {
 createCaseRecord,
 createPSSSession,
 createCaseReferral,
 createCaseActivity,
 getCaseRecords
} from './caseManagementService';
import type { CaseRecord } from '@/app/types/caseManagement';

/**
 * Initialize sample case management data
 */
export function initializeSampleCaseData(projectId: number, currentUserId: number): void {
 // Check if data already exists
 const existingCases = getCaseRecords(projectId);
 if (existingCases.length > 0) {
 console.log('✅ Sample case data already exists');
 return;
 }

 console.log('🔄 Initializing sample case management data...');

 // Create sample cases
 const sampleCases = [
 {
 projectId,
 caseCode: `CM-PRJ${projectId}-0001`,
 beneficiaryCode: `BNF-${projectId}-001`,
 firstName: 'Ahmed',
 lastName: 'M.',
 dateOfBirth: '2010-05-15',
 gender: 'male',
 age: 14,
 nationality: 'Yemen',
 hasDisability: false,
 location: 'Sana\'a',
 district: 'Al-Wahda',
 community: 'Al-Hasaba',
 householdSize: 6,
 vulnerabilityCategory: 'Displaced',
 phoneNumber: '+967771234567',
 caseType: 'pss',
 riskLevel: 'medium',
 status: 'ongoing',
 openedAt: '2024-01-15',
 referralSource: 'Community outreach',
 intakeDate: '2024-01-15',
 identifiedNeeds: 'Psychosocial support, educational assistance',
 riskFactors: 'Displacement trauma, loss of schooling',
 immediateConcerns: 'Emotional distress, educational gap',
 informedConsentObtained: true,
 consentDate: '2024-01-15',
 assignedPssOfficerId: currentUserId,
 assignedCaseWorkerId: currentUserId,
 assignedTo: 'Case Worker 1',
 plannedInterventions: 'Individual PSS sessions, educational support',
 responsiblePerson: 'Case Worker 1',
 expectedOutcomes: 'Improved emotional well-being, return to school',
 timeline: '3 months',
 reviewDate: '2024-04-15',
 notes: 'Regular follow-up required',
 createdBy: currentUserId,
 updatedBy: currentUserId
 },
 {
 projectId,
 caseCode: `CM-PRJ${projectId}-0002`,
 beneficiaryCode: `BNF-${projectId}-002`,
 firstName: 'Fatima',
 lastName: 'A.',
 dateOfBirth: '2008-08-20',
 gender: 'female',
 age: 16,
 nationality: 'Yemen',
 hasDisability: false,
 location: 'Sana\'a',
 district: 'Shu\'ub',
 community: 'Al-Qa\'',
 householdSize: 5,
 vulnerabilityCategory: 'Child-headed household',
 phoneNumber: '+967771234568',
 caseType: 'cp',
 riskLevel: 'high',
 status: 'ongoing',
 openedAt: '2024-01-20',
 referralSource: 'School referral',
 intakeDate: '2024-01-20',
 identifiedNeeds: 'Child protection, livelihood support',
 riskFactors: 'Child labor, lack of adult supervision',
 immediateConcerns: 'Safety risks, educational dropout risk',
 informedConsentObtained: true,
 consentDate: '2024-01-20',
 assignedPssOfficerId: currentUserId,
 assignedCaseWorkerId: currentUserId,
 assignedTo: 'Case Worker 2',
 plannedInterventions: 'Safety planning, livelihood support linkage',
 responsiblePerson: 'Case Worker 2',
 expectedOutcomes: 'Reduced child labor, improved safety',
 timeline: '6 months',
 reviewDate: '2024-07-20',
 notes: 'High priority case - weekly follow-up',
 createdBy: currentUserId,
 updatedBy: currentUserId
 },
 {
 projectId,
 caseCode: `CM-PRJ${projectId}-0003`,
 beneficiaryCode: `BNF-${projectId}-003`,
 firstName: 'Khalid',
 lastName: 'H.',
 dateOfBirth: '2012-03-10',
 gender: 'male',
 age: 12,
 nationality: 'Yemen',
 hasDisability: true,
 location: 'Sana\'a',
 district: 'Ma\'in',
 community: 'Al-Rawdha',
 householdSize: 7,
 vulnerabilityCategory: 'Child with disability',
 phoneNumber: '+967771234569',
 caseType: 'pss',
 riskLevel: 'low',
 status: 'open',
 openedAt: '2024-02-01',
 referralSource: 'Health facility',
 intakeDate: '2024-02-01',
 identifiedNeeds: 'Specialized PSS, inclusive education',
 riskFactors: 'Physical disability, limited access to services',
 immediateConcerns: 'Social isolation, educational barriers',
 informedConsentObtained: true,
 consentDate: '2024-02-01',
 assignedPssOfficerId: currentUserId,
 assignedCaseWorkerId: currentUserId,
 assignedTo: 'Case Worker 3',
 plannedInterventions: 'Adapted PSS activities, referral to inclusive education',
 responsiblePerson: 'Case Worker 3',
 expectedOutcomes: 'Increased social participation, school enrollment',
 timeline: '4 months',
 reviewDate: '2024-06-01',
 notes: 'Requires disability-sensitive approach',
 createdBy: currentUserId,
 updatedBy: currentUserId
 }
 ];

 const createdCases: CaseRecord[] = [];

 // Create cases
 sampleCases.forEach((caseData: any) => {
 const createdCase = createCaseRecord(caseData, currentUserId);
 createdCases.push(createdCase);
 });

 console.log(`✅ Created ${createdCases.length} sample cases`);

 // Create sample PSS sessions
 const pssSessions = [
 {
 caseId: createdCases[0].id,
 sessionDate: '2024-01-20',
 sessionType: 'individual' as const,
 pssApproach: 'pfa' as const,
 facilitatorId: currentUserId,
 duration: 60,
 keyObservations: 'Client engaged well, showed signs of emotional relief',
 beneficiaryResponse: 'Positive, expressed gratitude',
 nextSessionDate: '2024-01-27'
 },
 {
 caseId: createdCases[0].id,
 sessionDate: '2024-01-27',
 sessionType: 'individual' as const,
 pssApproach: 'structured_pss' as const,
 facilitatorId: currentUserId,
 duration: 90,
 keyObservations: 'Client practicing coping strategies',
 beneficiaryResponse: 'Engaged, showing progress',
 nextSessionDate: '2024-02-03'
 },
 {
 caseId: createdCases[1].id,
 sessionDate: '2024-01-25',
 sessionType: 'individual' as const,
 pssApproach: 'pfa' as const,
 facilitatorId: currentUserId,
 duration: 45,
 keyObservations: 'Initial assessment, building rapport',
 beneficiaryResponse: 'Reserved but cooperative',
 nextSessionDate: '2024-02-01'
 },
 {
 caseId: createdCases[2].id,
 sessionDate: '2024-02-05',
 sessionType: 'group' as const,
 pssApproach: 'recreational' as const,
 facilitatorId: currentUserId,
 duration: 120,
 keyObservations: 'Participated in adapted group activities',
 beneficiaryResponse: 'Enthusiastic, integrated well',
 nextSessionDate: '2024-02-12'
 }
 ];

 pssSessions.forEach(session => {
 createPSSSession(session, currentUserId);
 });

 console.log(`✅ Created ${pssSessions.length} sample PSS sessions`);

 // Create sample referrals
 const referrals = [
 {
 caseId: createdCases[0].id,
 referralDate: '2024-01-22',
 referralType: 'external' as const,
 serviceRequired: 'Educational support',
 receivingOrganization: 'Education Ministry',
 focalPoint: 'Mr. Ali Mohammed',
 focalPointContact: '+967771234500',
 status: 'in_progress' as const,
 followUpDate: '2024-02-15',
 feedbackReceived: false,
 consentObtained: true
 },
 {
 caseId: createdCases[1].id,
 referralDate: '2024-01-28',
 referralType: 'internal' as const,
 serviceRequired: 'Livelihood support',
 receivingOrganization: 'Internal - Livelihood Team',
 focalPoint: 'Ms. Sarah Ahmed',
 focalPointContact: '+967771234501',
 status: 'pending' as const,
 followUpDate: '2024-02-10',
 feedbackReceived: false,
 consentObtained: true
 },
 {
 caseId: createdCases[2].id,
 referralDate: '2024-02-08',
 referralType: 'external' as const,
 serviceRequired: 'Specialized health services',
 receivingOrganization: 'Al-Thawra Hospital',
 focalPoint: 'Dr. Hassan Ibrahim',
 focalPointContact: '+967771234502',
 status: 'completed' as const,
 followUpDate: '2024-02-20',
 feedbackReceived: true,
 feedbackNotes: 'Child enrolled in rehabilitation program',
 consentObtained: true
 }
 ];

 referrals.forEach(referral => {
 createCaseReferral(referral, currentUserId);
 });

 console.log(`✅ Created ${referrals.length} sample referrals`);

 // Create sample activities
 const activities = [
 {
 caseId: createdCases[0].id,
 activityType: 'awareness' as const,
 activityDate: '2024-01-18',
 provider: 'Community Awareness Team',
 notes: 'Participated in community awareness session on mental health'
 },
 {
 caseId: createdCases[1].id,
 activityType: 'legal_counselling' as const,
 activityDate: '2024-02-05',
 provider: 'Legal Aid Office',
 notes: 'Provided information on child rights and protection'
 },
 {
 caseId: createdCases[2].id,
 activityType: 'health_support' as const,
 activityDate: '2024-02-10',
 provider: 'Mobile Health Clinic',
 notes: 'Health screening and referral for specialized care'
 }
 ];

 activities.forEach(activity => {
 createCaseActivity(activity, currentUserId);
 });

 console.log(`✅ Created ${activities.length} sample activities`);
 console.log('✅ Sample case management data initialization complete!');
}

/**
 * Clear all case management data (for testing)
 */
export function clearCaseManagementData(): void {
 localStorage.removeItem('pms_case_records');
 localStorage.removeItem('pms_pss_sessions');
 localStorage.removeItem('pms_case_referrals');
 localStorage.removeItem('pms_case_activities');
 localStorage.removeItem('pms_css_locations');
 localStorage.removeItem('pms_css_activities');
 console.log('✅ Case management data cleared');
}

/**
 * Get data initialization status
 */
export function getDataInitializationStatus(): {
 caseRecords: number;
 pssSessions: number;
 referrals: number;
 activities: number;
} {
 const getCounts = (key: string) => {
 const data = localStorage.getItem(key);
 return data ? JSON.parse(data).length : 0;
 };

 return {
 caseRecords: getCounts('pms_case_records'),
 pssSessions: getCounts('pms_pss_sessions'),
 referrals: getCounts('pms_case_referrals'),
 activities: getCounts('pms_case_activities')
 };
}
