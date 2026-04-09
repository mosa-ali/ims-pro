// ============================================================================
// MOCK BENEFICIARY DATA
// ============================================================================

import {
 Beneficiary,
 BeneficiaryEnrollment,
 BeneficiarySex,
 DisplacementStatus,
 VulnerabilityCategory,
 ServiceType,
 ServiceStatus,
 BeneficiaryStatus,
 AgeGroup,
 BeneficiaryListItem,
 BeneficiaryStatistics
} from '@/app/types/beneficiary.types';

// ============================================================================
// BENEFICIARIES
// ============================================================================

export const mockBeneficiaries: Beneficiary[] = [
 {
 id: 1,
 organizationId: 1,
 beneficiaryId: 'BEN-2024-0001',
 firstName: 'Ahmad',
 firstNameAr: 'أحمد',
 lastName: 'Al-Mahmoud',
 lastNameAr: 'المحمود',
 fullName: 'Ahmad Al-Mahmoud',
 sex: BeneficiarySex.MALE,
 dateOfBirth: '2010-03-15',
 age: 14,
 ageGroup: AgeGroup.ADOLESCENT,
 nationalId: null,
 campId: 'ZTR-2024-1234',
 phoneNumber: '+962791234567',
 alternativeContact: null,
 
 governorate: 'Mafraq',
 governorateAr: 'المفرق',
 district: 'Zaatari',
 districtAr: 'الزعتري',
 community: 'District 1',
 communityAr: 'المنطقة 1',
 address: 'Zaatari Refugee Camp, Shelter 145',
 addressAr: 'مخيم الزعتري للاجئين، مأوى 145',
 
 displacementStatus: DisplacementStatus.REFUGEE,
 originGovernorate: 'Daraa',
 displacementDate: '2013-08-20',
 
 householdSize: 7,
 isHeadOfHousehold: false,
 adultMales: 1,
 adultFemales: 1,
 boys: 3,
 girls: 2,
 
 vulnerabilityCategories: [],
 disabilityType: null,
 disabilitySeverity: null,
 
 status: BeneficiaryStatus.ACTIVE,
 
 consentGiven: true,
 consentDate: '2024-01-10',
 dataCollectorName: 'John Smith',
 dataCollectorId: 5,
 registrationDate: '2024-01-10',
 
 photoUrl: null,
 documentUrls: null,
 
 notes: 'Enrolled in youth sports program',
 notesAr: 'مسجل في برنامج الرياضة للشباب',
 
 createdBy: 5,
 createdAt: '2024-01-10T09:00:00Z',
 updatedAt: '2024-01-10T09:00:00Z',
 isDeleted: false,
 deletedAt: null,
 deletedBy: null
 },
 {
 id: 2,
 organizationId: 1,
 beneficiaryId: 'BEN-2024-0002',
 firstName: 'Fatima',
 firstNameAr: 'فاطمة',
 lastName: 'Al-Hassan',
 lastNameAr: 'الحسن',
 fullName: 'Fatima Al-Hassan',
 sex: BeneficiarySex.FEMALE,
 dateOfBirth: '1985-07-22',
 age: 38,
 ageGroup: AgeGroup.ADULT,
 nationalId: null,
 campId: 'AZR-2024-5678',
 phoneNumber: '+962797654321',
 alternativeContact: null,
 
 governorate: 'Zarqa',
 governorateAr: 'الزرقاء',
 district: 'Azraq',
 districtAr: 'الأزرق',
 community: 'Village 3',
 communityAr: 'القرية 3',
 address: 'Azraq Camp, Block C, Unit 89',
 addressAr: 'مخيم الأزرق، بلوك ج، وحدة 89',
 
 displacementStatus: DisplacementStatus.REFUGEE,
 originGovernorate: 'Homs',
 displacementDate: '2014-05-10',
 
 householdSize: 5,
 isHeadOfHousehold: true,
 adultMales: 0,
 adultFemales: 1,
 boys: 2,
 girls: 2,
 
 vulnerabilityCategories: [
 VulnerabilityCategory.SINGLE_HEADED_HH,
 VulnerabilityCategory.EXTREME_POVERTY
 ],
 disabilityType: null,
 disabilitySeverity: null,
 
 status: BeneficiaryStatus.ACTIVE,
 
 consentGiven: true,
 consentDate: '2024-01-12',
 dataCollectorName: 'John Smith',
 dataCollectorId: 5,
 registrationDate: '2024-01-12',
 
 photoUrl: null,
 documentUrls: null,
 
 notes: 'Single mother, needs livelihood support',
 notesAr: 'أم عزباء، تحتاج دعم سبل العيش',
 
 createdBy: 5,
 createdAt: '2024-01-12T10:30:00Z',
 updatedAt: '2024-01-12T10:30:00Z',
 isDeleted: false,
 deletedAt: null,
 deletedBy: null
 },
 {
 id: 3,
 organizationId: 1,
 beneficiaryId: 'BEN-2024-0003',
 firstName: 'Yousef',
 firstNameAr: 'يوسف',
 lastName: 'Al-Ahmad',
 lastNameAr: 'الأحمد',
 fullName: 'Yousef Al-Ahmad',
 sex: BeneficiarySex.MALE,
 dateOfBirth: '2008-11-05',
 age: 15,
 ageGroup: AgeGroup.ADOLESCENT,
 nationalId: null,
 campId: 'ZTR-2024-9012',
 phoneNumber: null,
 alternativeContact: '+962795555111',
 
 governorate: 'Mafraq',
 governorateAr: 'المفرق',
 district: 'Zaatari',
 districtAr: 'الزعتري',
 community: 'District 8',
 communityAr: 'المنطقة 8',
 address: 'Zaatari Camp, Shelter 892',
 addressAr: 'مخيم الزعتري، مأوى 892',
 
 displacementStatus: DisplacementStatus.REFUGEE,
 originGovernorate: 'Aleppo',
 displacementDate: '2012-12-15',
 
 householdSize: 6,
 isHeadOfHousehold: false,
 adultMales: 1,
 adultFemales: 1,
 boys: 2,
 girls: 2,
 
 vulnerabilityCategories: [VulnerabilityCategory.DISABILITY],
 disabilityType: 'Physical - Mobility impairment',
 disabilitySeverity: 'moderate',
 
 status: BeneficiaryStatus.ACTIVE,
 
 consentGiven: true,
 consentDate: '2024-01-15',
 dataCollectorName: 'John Smith',
 dataCollectorId: 5,
 registrationDate: '2024-01-15',
 
 photoUrl: null,
 documentUrls: null,
 
 notes: 'Requires accessible facilities, uses crutches',
 notesAr: 'يحتاج مرافق سهلة الوصول، يستخدم عكازات',
 
 createdBy: 5,
 createdAt: '2024-01-15T11:00:00Z',
 updatedAt: '2024-01-15T11:00:00Z',
 isDeleted: false,
 deletedAt: null,
 deletedBy: null
 }
];

// ============================================================================
// BENEFICIARY ENROLLMENTS
// ============================================================================

export const mockBeneficiaryEnrollments: BeneficiaryEnrollment[] = [
 {
 id: 1,
 organizationId: 1,
 beneficiaryId: 1, // Ahmad
 projectId: 1,
 activityId: 1,
 
 serviceType: ServiceType.PSYCHOSOCIAL_SUPPORT,
 serviceDescription: 'Sports-based psychosocial support program',
 serviceDescriptionAr: 'برنامج الدعم النفسي الاجتماعي القائم على الرياضة',
 
 enrollmentDate: '2024-01-10',
 startDate: '2024-01-15',
 endDate: '2024-06-30',
 
 status: ServiceStatus.ONGOING,
 targetSessions: 50,
 completedSessions: 0,
 quantityPlanned: null,
 quantityReceived: null,
 unit: 'sessions',
 
 referralSource: 'School counselor',
 referredBy: 'Zaatari Secondary School',
 
 linkedIndicatorId: 1,
 countsTowardTarget: true,
 
 exitDate: null,
 exitReason: null,
 exitReasonAr: null,
 
 notes: 'Attends twice weekly',
 notesAr: 'يحضر مرتين أسبوعياً',
 
 createdBy: 5,
 createdAt: '2024-01-10T09:30:00Z',
 updatedAt: '2024-01-10T09:30:00Z',
 isDeleted: false,
 deletedAt: null,
 deletedBy: null
 },
 {
 id: 2,
 organizationId: 1,
 beneficiaryId: 3, // Yousef
 projectId: 1,
 activityId: 1,
 
 serviceType: ServiceType.PSYCHOSOCIAL_SUPPORT,
 serviceDescription: 'Inclusive sports program for youth with disabilities',
 serviceDescriptionAr: 'برنامج رياضي شامل للشباب ذوي الإعاقة',
 
 enrollmentDate: '2024-01-15',
 startDate: '2024-01-20',
 endDate: '2024-06-30',
 
 status: ServiceStatus.ONGOING,
 targetSessions: 50,
 completedSessions: 0,
 quantityPlanned: null,
 quantityReceived: null,
 unit: 'sessions',
 
 referralSource: 'Disability focal point',
 referredBy: 'Camp Management',
 
 linkedIndicatorId: 1,
 countsTowardTarget: true,
 
 exitDate: null,
 exitReason: null,
 exitReasonAr: null,
 
 notes: 'Requires adapted equipment',
 notesAr: 'يحتاج معدات معدلة',
 
 createdBy: 5,
 createdAt: '2024-01-15T11:30:00Z',
 updatedAt: '2024-01-15T11:30:00Z',
 isDeleted: false,
 deletedAt: null,
 deletedBy: null
 }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getBeneficiariesByProject = (projectId: number): BeneficiaryListItem[] => {
 const enrollments = mockBeneficiaryEnrollments.filter(
 e => e.projectId === projectId && !e.isDeleted
 );
 
 return enrollments.map(enrollment => {
 const beneficiary = mockBeneficiaries.find(b => b.id === enrollment.beneficiaryId);
 if (!beneficiary) return null;
 
 const beneficiaryEnrollments = mockBeneficiaryEnrollments.filter(
 e => e.beneficiaryId === beneficiary.id && !e.isDeleted
 );
 
 const lastService = beneficiaryEnrollments
 .map(e => e.startDate)
 .filter(d => d)
 .sort()
 .reverse()[0] || null;
 
 return {
 id: beneficiary.id,
 beneficiaryId: beneficiary.beneficiaryId,
 fullName: beneficiary.fullName,
 sex: beneficiary.sex,
 age: beneficiary.age,
 ageGroup: beneficiary.ageGroup,
 householdSize: beneficiary.householdSize,
 location: `${beneficiary.governorate}, ${beneficiary.district}`,
 servicesReceived: beneficiaryEnrollments.length,
 status: beneficiary.status,
 lastServiceDate: lastService,
 vulnerabilities: beneficiary.vulnerabilityCategories
 };
 }).filter(Boolean) as BeneficiaryListItem[];
};

export const getBeneficiaryStatistics = (projectId?: number): BeneficiaryStatistics => {
 let beneficiaries = mockBeneficiaries.filter(b => !b.isDeleted);
 
 if (projectId) {
 const enrolledIds = mockBeneficiaryEnrollments
 .filter(e => e.projectId === projectId && !e.isDeleted)
 .map(e => e.beneficiaryId);
 beneficiaries = beneficiaries.filter(b => enrolledIds.includes(b.id));
 }
 
 const stats: BeneficiaryStatistics = {
 total: beneficiaries.length,
 active: beneficiaries.filter(b => b.status === BeneficiaryStatus.ACTIVE).length,
 inactive: beneficiaries.filter(b => b.status === BeneficiaryStatus.INACTIVE).length,
 bySex: {
 male: beneficiaries.filter(b => b.sex === BeneficiarySex.MALE).length,
 female: beneficiaries.filter(b => b.sex === BeneficiarySex.FEMALE).length,
 other: beneficiaries.filter(b => b.sex === BeneficiarySex.OTHER).length
 },
 byAgeGroup: {
 [AgeGroup.INFANT]: 0,
 [AgeGroup.EARLY_CHILDHOOD]: 0,
 [AgeGroup.CHILD]: 0,
 [AgeGroup.ADOLESCENT]: beneficiaries.filter(b => b.ageGroup === AgeGroup.ADOLESCENT).length,
 [AgeGroup.YOUTH]: 0,
 [AgeGroup.ADULT]: beneficiaries.filter(b => b.ageGroup === AgeGroup.ADULT).length,
 [AgeGroup.ELDERLY]: 0
 },
 byDisplacementStatus: {
 [DisplacementStatus.IDP]: 0,
 [DisplacementStatus.HOST]: 0,
 [DisplacementStatus.RETURNEE]: 0,
 [DisplacementStatus.REFUGEE]: beneficiaries.filter(b => b.displacementStatus === DisplacementStatus.REFUGEE).length,
 [DisplacementStatus.ASYLUM_SEEKER]: 0
 },
 byVulnerability: {
 [VulnerabilityCategory.DISABILITY]: beneficiaries.filter(b => 
 b.vulnerabilityCategories.includes(VulnerabilityCategory.DISABILITY)
 ).length,
 [VulnerabilityCategory.CHRONIC_ILLNESS]: 0,
 [VulnerabilityCategory.SINGLE_HEADED_HH]: beneficiaries.filter(b => 
 b.vulnerabilityCategories.includes(VulnerabilityCategory.SINGLE_HEADED_HH)
 ).length,
 [VulnerabilityCategory.ELDERLY_HEADED_HH]: 0,
 [VulnerabilityCategory.CHILD_HEADED_HH]: 0,
 [VulnerabilityCategory.PREGNANT_LACTATING]: 0,
 [VulnerabilityCategory.UNACCOMPANIED_MINOR]: 0,
 [VulnerabilityCategory.SEPARATED_CHILD]: 0,
 [VulnerabilityCategory.SURVIVOR_GBV]: 0,
 [VulnerabilityCategory.EXTREME_POVERTY]: beneficiaries.filter(b => 
 b.vulnerabilityCategories.includes(VulnerabilityCategory.EXTREME_POVERTY)
 ).length,
 [VulnerabilityCategory.NONE]: beneficiaries.filter(b => 
 b.vulnerabilityCategories.length === 0
 ).length
 },
 householdMembers: {
 totalHouseholds: beneficiaries.length,
 totalIndividuals: beneficiaries.reduce((sum, b) => sum + b.householdSize, 0),
 avgHouseholdSize: beneficiaries.length > 0 
 ? beneficiaries.reduce((sum, b) => sum + b.householdSize, 0) / beneficiaries.length 
 : 0
 }
 };
 
 return stats;
};

export const calculateAge = (dateOfBirth: string): number => {
 const today = new Date();
 const birthDate = new Date(dateOfBirth);
 let age = today.getFullYear() - birthDate.getFullYear();
 const monthDiff = today.getMonth() - birthDate.getMonth();
 
 if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
 age--;
 }
 
 return age;
};

export const getAgeGroup = (age: number): AgeGroup => {
 if (age <= 1) return AgeGroup.INFANT;
 if (age <= 5) return AgeGroup.EARLY_CHILDHOOD;
 if (age <= 11) return AgeGroup.CHILD;
 if (age <= 17) return AgeGroup.ADOLESCENT;
 if (age <= 24) return AgeGroup.YOUTH;
 if (age <= 59) return AgeGroup.ADULT;
 return AgeGroup.ELDERLY;
};

export const generateBeneficiaryId = (organizationId: number): string => {
 const year = new Date().getFullYear();
 const count = mockBeneficiaries.length + 1;
 return `BEN-${year}-${String(count).padStart(4, '0')}`;
};
