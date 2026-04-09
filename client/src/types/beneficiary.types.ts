// ============================================================================
// BENEFICIARY TYPES - Phase 4
// Comprehensive beneficiary management with multi-step registration
// ============================================================================

import { BaseEntity, OrganizationScoped, UserTracked, SoftDeletable } from './schema.types';

// ----------------------------------------------------------------------------
// ENUMS
// ----------------------------------------------------------------------------

export enum BeneficiarySex {
 MALE = 'male',
 FEMALE = 'female',
 OTHER = 'other',
 PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum DisplacementStatus {
 IDP = 'idp', // Internally Displaced Person
 HOST = 'host', // Host community
 RETURNEE = 'returnee', // Returned IDP
 REFUGEE = 'refugee',
 ASYLUM_SEEKER = 'asylum_seeker'
}

export enum VulnerabilityCategory {
 DISABILITY = 'disability',
 CHRONIC_ILLNESS = 'chronic_illness',
 SINGLE_HEADED_HH = 'single_headed_household',
 ELDERLY_HEADED_HH = 'elderly_headed_household',
 CHILD_HEADED_HH = 'child_headed_household',
 PREGNANT_LACTATING = 'pregnant_lactating',
 UNACCOMPANIED_MINOR = 'unaccompanied_minor',
 SEPARATED_CHILD = 'separated_child',
 SURVIVOR_GBV = 'survivor_gbv',
 EXTREME_POVERTY = 'extreme_poverty',
 NONE = 'none'
}

export enum ServiceType {
 EDUCATION = 'education',
 WASH = 'wash',
 HEALTH = 'health',
 PROTECTION = 'protection',
 SHELTER = 'shelter',
 LIVELIHOOD = 'livelihood',
 FOOD_SECURITY = 'food_security',
 NUTRITION = 'nutrition',
 PSYCHOSOCIAL_SUPPORT = 'psychosocial_support',
 CASH_ASSISTANCE = 'cash_assistance',
 NFI = 'nfi', // Non-Food Items
 OTHER = 'other'
}

export enum ServiceStatus {
 PLANNED = 'planned',
 ONGOING = 'ongoing',
 COMPLETED = 'completed',
 CANCELLED = 'cancelled',
 ON_HOLD = 'on_hold'
}

export enum BeneficiaryStatus {
 ACTIVE = 'active',
 INACTIVE = 'inactive',
 GRADUATED = 'graduated',
 WITHDRAWN = 'withdrawn',
 DECEASED = 'deceased'
}

export enum AgeGroup {
 INFANT = '0-1', // 0-1 years
 EARLY_CHILDHOOD = '2-5', // 2-5 years
 CHILD = '6-11', // 6-11 years
 ADOLESCENT = '12-17', // 12-17 years
 YOUTH = '18-24', // 18-24 years
 ADULT = '25-59', // 25-59 years
 ELDERLY = '60+' // 60+ years
}

// ----------------------------------------------------------------------------
// CORE BENEFICIARY
// ----------------------------------------------------------------------------

export interface Beneficiary extends BaseEntity, OrganizationScoped, UserTracked, SoftDeletable {
 // Step 1: Basic Demographics
 beneficiaryId: string; // Auto-generated unique ID (e.g., BEN-2024-0001)
 firstName: string;
 firstNameAr: string | null;
 lastName: string;
 lastNameAr: string | null;
 fullName: string; // Computed: firstName + lastName
 sex: BeneficiarySex;
 dateOfBirth: string | null; // ISO date
 age: number | null; // Calculated from DOB
 ageGroup: AgeGroup | null; // Calculated from age
 nationalId: string | null;
 campId: string | null;
 phoneNumber: string | null;
 alternativeContact: string | null;
 
 // Location
 governorate: string;
 governorateAr: string | null;
 district: string;
 districtAr: string | null;
 community: string | null;
 communityAr: string | null;
 address: string | null;
 addressAr: string | null;
 
 // Displacement
 displacementStatus: DisplacementStatus;
 originGovernorate: string | null; // Where they came from (if displaced)
 displacementDate: string | null;
 
 // Step 2: Household Composition
 householdSize: number;
 isHeadOfHousehold: boolean;
 adultMales: number;
 adultFemales: number;
 boys: number;
 girls: number;
 
 // Vulnerabilities
 vulnerabilityCategories: VulnerabilityCategory[];
 disabilityType: string | null; // If disability is selected
 disabilitySeverity: 'mild' | 'moderate' | 'severe' | null;
 
 // Status
 status: BeneficiaryStatus;
 
 // Verification & Consent
 consentGiven: boolean;
 consentDate: string | null;
 dataCollectorName: string | null;
 dataCollectorId: number | null; // User ID
 registrationDate: string;
 
 // Documents
 photoUrl: string | null;
 documentUrls: string[] | null;
 
 // Notes
 notes: string | null;
 notesAr: string | null;
}

// ----------------------------------------------------------------------------
// BENEFICIARY ENROLLMENT (Step 3: Services)
// ----------------------------------------------------------------------------

export interface BeneficiaryEnrollment extends BaseEntity, OrganizationScoped, UserTracked, SoftDeletable {
 beneficiaryId: number; // FK to beneficiaries
 projectId: number; // FK to projects
 activityId: number | null; // FK to project_activities
 
 // Service Details
 serviceType: ServiceType;
 serviceDescription: string | null;
 serviceDescriptionAr: string | null;
 
 // Dates
 enrollmentDate: string; // When enrolled in service
 startDate: string | null; // When service started
 endDate: string | null; // When service ended/expected to end
 
 // Delivery Tracking
 status: ServiceStatus;
 targetSessions: number | null; // Expected sessions
 completedSessions: number | null; // Actual sessions received
 quantityPlanned: number | null; // E.g., 10 hygiene kits
 quantityReceived: number | null; // E.g., 10 hygiene kits delivered
 unit: string | null; // sessions, kits, individuals, etc.
 
 // Referral
 referralSource: string | null; // How they were referred
 referredBy: string | null; // Organization/person who referred
 
 // MEAL Integration
 linkedIndicatorId: number | null; // Auto-link to relevant indicator
 countsTowardTarget: boolean; // Does this count toward MEAL targets?
 
 // Exit
 exitDate: string | null;
 exitReason: string | null; // Graduated, withdrew, moved, etc.
 exitReasonAr: string | null;
 
 // Notes
 notes: string | null;
 notesAr: string | null;
}

// ----------------------------------------------------------------------------
// SERVICE DELIVERY RECORDS
// ----------------------------------------------------------------------------

export interface ServiceDeliveryRecord extends BaseEntity, UserTracked {
 enrollmentId: number; // FK to beneficiary_enrollments
 beneficiaryId: number;
 projectId: number;
 activityId: number | null;
 
 // Service Instance
 serviceDate: string; // Date service was delivered
 serviceType: ServiceType;
 sessionNumber: number | null; // E.g., session 3 of 10
 
 // Delivery Details
 quantityDelivered: number | null;
 unit: string | null;
 location: string | null;
 locationAr: string | null;
 
 // Staff
 deliveredBy: string | null; // Staff name
 deliveredById: number | null; // User ID
 
 // Quality & Feedback
 attendanceStatus: 'present' | 'absent' | 'excused' | null;
 satisfactionRating: number | null; // 1-5
 feedback: string | null;
 
 // Verification
 verifiedBy: number | null; // User ID
 verifiedAt: string | null;
 
 // Notes
 notes: string | null;
 notesAr: string | null;
}

// ----------------------------------------------------------------------------
// HOUSEHOLD MEMBERS (Optional Extended Feature)
// ----------------------------------------------------------------------------

export interface HouseholdMember extends BaseEntity, UserTracked {
 beneficiaryId: number; // Head of household
 
 name: string;
 nameAr: string | null;
 relationship: string; // spouse, child, parent, sibling, etc.
 sex: BeneficiarySex;
 age: number | null;
 dateOfBirth: string | null;
 
 // Can this member also be a direct beneficiary?
 isAlsoBeneficiary: boolean;
 linkedBeneficiaryId: number | null;
 
 // Vulnerabilities
 hasDisability: boolean;
 hasChronicIllness: boolean;
 isPregnantLactating: boolean;
 
 notes: string | null;
}

// ----------------------------------------------------------------------------
// FORM DATA TYPES (Multi-Step Registration)
// ----------------------------------------------------------------------------

export interface BeneficiaryRegistrationStep1 {
 // Basic Demographics
 firstName: string;
 firstNameAr?: string;
 lastName: string;
 lastNameAr?: string;
 sex: BeneficiarySex;
 dateOfBirth?: string;
 age?: number;
 nationalId?: string;
 campId?: string;
 phoneNumber?: string;
 
 // Location
 governorate: string;
 governorateAr?: string;
 district: string;
 districtAr?: string;
 community?: string;
 communityAr?: string;
 address?: string;
 
 // Displacement
 displacementStatus: DisplacementStatus;
 originGovernorate?: string;
 displacementDate?: string;
}

export interface BeneficiaryRegistrationStep2 {
 // Household Composition
 householdSize: number;
 isHeadOfHousehold: boolean;
 adultMales: number;
 adultFemales: number;
 boys: number;
 girls: number;
 
 // Vulnerabilities
 vulnerabilityCategories: VulnerabilityCategory[];
 disabilityType?: string;
 disabilitySeverity?: 'mild' | 'moderate' | 'severe';
}

export interface BeneficiaryRegistrationStep3 {
 // Service Enrollment
 projectId: number;
 activityId?: number;
 serviceType: ServiceType;
 serviceDescription?: string;
 enrollmentDate: string;
 startDate?: string;
 targetSessions?: number;
 quantityPlanned?: number;
 unit?: string;
 referralSource?: string;
 referredBy?: string;
 status: ServiceStatus;
}

export interface BeneficiaryRegistrationStep4 {
 // Verification & Consent
 consentGiven: boolean;
 dataCollectorName: string;
 registrationDate: string;
 photoUrl?: string;
 documentUrls?: string[];
 notes?: string;
}

export interface BeneficiaryRegistrationFormData {
 step1: BeneficiaryRegistrationStep1;
 step2: BeneficiaryRegistrationStep2;
 step3: BeneficiaryRegistrationStep3;
 step4: BeneficiaryRegistrationStep4;
}

// ----------------------------------------------------------------------------
// FILTER TYPES
// ----------------------------------------------------------------------------

export interface BeneficiaryFilters {
 sex?: BeneficiarySex[];
 ageGroup?: AgeGroup[];
 governorate?: string[];
 district?: string[];
 displacementStatus?: DisplacementStatus[];
 vulnerabilityCategories?: VulnerabilityCategory[];
 status?: BeneficiaryStatus[];
 projectId?: number;
 activityId?: number;
 serviceType?: ServiceType[];
 enrollmentDateFrom?: string;
 enrollmentDateTo?: string;
 search?: string;
}

// ----------------------------------------------------------------------------
// VIEW MODELS & STATISTICS
// ----------------------------------------------------------------------------

export interface BeneficiaryListItem {
 id: number;
 beneficiaryId: string;
 fullName: string;
 sex: BeneficiarySex;
 age: number | null;
 ageGroup: AgeGroup | null;
 householdSize: number;
 location: string; // Combined governorate/district
 servicesReceived: number; // Count of enrollments
 status: BeneficiaryStatus;
 lastServiceDate: string | null;
 vulnerabilities: VulnerabilityCategory[];
}

export interface BeneficiaryStatistics {
 total: number;
 active: number;
 inactive: number;
 bySex: {
 male: number;
 female: number;
 other: number;
 };
 byAgeGroup: {
 [key in AgeGroup]: number;
 };
 byDisplacementStatus: {
 [key in DisplacementStatus]: number;
 };
 byVulnerability: {
 [key in VulnerabilityCategory]: number;
 };
 householdMembers: {
 totalHouseholds: number;
 totalIndividuals: number;
 avgHouseholdSize: number;
 };
}

export interface ProjectBeneficiaryStats {
 projectId: number;
 projectName: string;
 target: number; // Target from project
 enrolled: number; // Total enrolled
 active: number; // Currently receiving services
 completed: number; // Completed services
 reachedPercentage: number; // (enrolled / target) * 100
}

export interface BeneficiaryProfile {
 beneficiary: Beneficiary;
 enrollments: BeneficiaryEnrollment[];
 serviceRecords: ServiceDeliveryRecord[];
 householdMembers: HouseholdMember[];
 statistics: {
 totalServices: number;
 completedServices: number;
 totalSessions: number;
 attendanceRate: number;
 };
}

// ----------------------------------------------------------------------------
// DISAGGREGATION REPORTS (Donor Reporting)
// ----------------------------------------------------------------------------

export interface BeneficiaryDisaggregation {
 period: {
 startDate: string;
 endDate: string;
 };
 
 totalBeneficiaries: number;
 totalHouseholds: number;
 totalIndividuals: number; // Sum of household members
 
 // Sex disaggregation
 bySex: {
 males: number;
 females: number;
 other: number;
 };
 
 // Age disaggregation
 byAge: {
 children_0_5: number;
 children_6_11: number;
 adolescents_12_17: number;
 youth_18_24: number;
 adults_25_59: number;
 elderly_60_plus: number;
 };
 
 // Sex + Age (Grand Bargain disaggregation)
 bySexAge: {
 boys_0_5: number;
 boys_6_11: number;
 boys_12_17: number;
 girls_0_5: number;
 girls_6_11: number;
 girls_12_17: number;
 men_18_59: number;
 men_60_plus: number;
 women_18_59: number;
 women_60_plus: number;
 };
 
 // Location
 byLocation: {
 governorate: string;
 district: string;
 count: number;
 }[];
 
 // Displacement
 byDisplacement: {
 [key in DisplacementStatus]: number;
 };
 
 // Vulnerabilities
 byVulnerability: {
 [key in VulnerabilityCategory]: number;
 };
 
 // Service delivery
 byServiceType: {
 [key in ServiceType]: number;
 };
}

// ----------------------------------------------------------------------------
// EXPORT FORMATS
// ----------------------------------------------------------------------------

export interface BeneficiaryExportRow {
 beneficiaryId: string;
 firstName: string;
 lastName: string;
 sex: string;
 age: number | null;
 ageGroup: string | null;
 governorate: string;
 district: string;
 community: string | null;
 displacementStatus: string;
 householdSize: number;
 isHeadOfHousehold: string;
 vulnerabilities: string; // Comma-separated
 status: string;
 registrationDate: string;
 servicesReceived: number;
 lastServiceDate: string | null;
}
