/**
 * Seed Data Script for Phase 2.1 Testing
 * Populates opportunities, pipeline_opportunities, and proposals tables with realistic test data
 * 
 * Usage: node server/seed-data.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('🌱 Starting seed data generation...\n');

// Get the first organization and operating unit (assuming they exist)
const [orgs] = await connection.query('SELECT id FROM organizations LIMIT 1');
const [units] = await connection.query('SELECT id FROM operating_units LIMIT 1');
const [users] = await connection.query('SELECT id FROM users LIMIT 1');

if (orgs.length === 0 || units.length === 0 || users.length === 0) {
  console.error('❌ Error: No organizations, operating units, or users found in database.');
  console.error('Please create at least one organization, operating unit, and user first.');
  process.exit(1);
}

const orgId = orgs[0].id;
const unitId = units[0].id;
const userId = users[0].id;

console.log(`Using Organization ID: ${orgId}, Operating Unit ID: ${unitId}, User ID: ${userId}\n`);

// ========================================
// 1. SEED OPPORTUNITIES
// ========================================
console.log('📋 Seeding Opportunities...');

const opportunities = [
  {
    donorName: 'UNICEF',
    donorType: 'UN',
    cfpLink: 'https://unicef.org/cfp/education-emergencies-2024',
    interestArea: JSON.stringify(['Education in Emergencies', 'Child Protection']),
    geographicAreas: 'Yemen,Sana\'a,Hodeidah',
    applicationDeadline: '2024-12-31',
    allocatedBudget: '500000.00',
    currency: 'USD',
    isCoFunding: false,
    applicationLink: 'https://unicef.org/apply/education-2024',
    projectManagerName: 'Sarah Johnson',
    projectManagerEmail: 'sarah.johnson@example.org',
    notes: 'Focus on conflict-affected areas. Strong emphasis on gender-sensitive programming.',
  },
  {
    donorName: 'European Commission - ECHO',
    donorType: 'EU',
    cfpLink: 'https://ec.europa.eu/echo/cfp/wash-infrastructure-2024',
    interestArea: JSON.stringify(['WASH', 'Health']),
    geographicAreas: 'Yemen,Hodeidah,Taiz',
    applicationDeadline: '2024-11-15',
    allocatedBudget: '1200000.00',
    currency: 'EUR',
    isCoFunding: true,
    applicationLink: 'https://ec.europa.eu/apply/wash-2024',
    projectManagerName: 'Ahmed Al-Mansouri',
    projectManagerEmail: 'ahmed.mansouri@example.org',
    notes: 'Requires 20% co-funding. Priority for integrated WASH/Health interventions.',
  },
  {
    donorName: 'Gates Foundation',
    donorType: 'Foundation',
    cfpLink: 'https://gatesfoundation.org/cfp/nutrition-health-2024',
    interestArea: JSON.stringify(['Health', 'Nutrition']),
    geographicAreas: 'Yemen,Nationwide',
    applicationDeadline: '2025-02-28',
    allocatedBudget: '800000.00',
    currency: 'USD',
    isCoFunding: false,
    projectManagerName: 'Dr. Fatima Hassan',
    projectManagerEmail: 'fatima.hassan@example.org',
    notes: 'Innovation-focused. Strong M&E requirements.',
  },
  {
    donorName: 'USAID',
    donorType: 'Government',
    cfpLink: 'https://usaid.gov/cfp/livelihoods-resilience-2024',
    interestArea: JSON.stringify(['Livelihoods', 'Economic Recovery']),
    geographicAreas: 'Yemen,Sana\'a,Aden',
    applicationDeadline: '2024-10-30',
    allocatedBudget: '2000000.00',
    currency: 'USD',
    isCoFunding: false,
    applicationLink: 'https://usaid.gov/apply/livelihoods-2024',
    projectManagerName: 'Mohammed Ali',
    projectManagerEmail: 'mohammed.ali@example.org',
    notes: 'Multi-year funding (3 years). Focus on market-based approaches.',
  },
  {
    donorName: 'Norwegian Refugee Council',
    donorType: 'INGO',
    cfpLink: 'https://nrc.no/cfp/shelter-protection-2024',
    interestArea: JSON.stringify(['Shelter', 'Protection']),
    geographicAreas: 'Yemen,Marib,Hajjah',
    applicationDeadline: '2024-09-30',
    allocatedBudget: '600000.00',
    currency: 'USD',
    isCoFunding: true,
    projectManagerName: 'Layla Ibrahim',
    projectManagerEmail: 'layla.ibrahim@example.org',
    notes: 'Requires 15% co-funding. IDP-focused programming.',
  },
];

for (const opp of opportunities) {
  await connection.query(
    `INSERT INTO opportunities 
    (organizationId, operatingUnitId, donorName, donorType, cfpLink, interestArea, geographicAreas, 
     applicationDeadline, allocatedBudget, currency, isCoFunding, applicationLink, 
     projectManagerName, projectManagerEmail, notes, createdBy, updatedBy) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orgId, unitId, opp.donorName, opp.donorType, opp.cfpLink, opp.interestArea, opp.geographicAreas,
     opp.applicationDeadline, opp.allocatedBudget, opp.currency, opp.isCoFunding, opp.applicationLink,
     opp.projectManagerName, opp.projectManagerEmail, opp.notes, userId, userId]
  );
}

console.log(`✅ Seeded ${opportunities.length} opportunities\n`);

// ========================================
// 2. SEED PIPELINE OPPORTUNITIES
// ========================================
console.log('🔄 Seeding Pipeline Opportunities...');

const pipelineOpps = [
  {
    title: 'UNICEF Education Emergency Response',
    donorName: 'UNICEF',
    donorType: 'UN',
    fundingWindow: 'Q3 2024 Emergency Call',
    deadline: '2024-09-30',
    indicativeBudgetMin: '300000.00',
    indicativeBudgetMax: '500000.00',
    sectors: JSON.stringify(['Education in Emergencies', 'Child Protection']),
    country: 'Yemen',
    governorate: 'Sana\'a',
    stage: 'Under Review',
    probability: 75,
    focalPoint: 'Sarah Johnson',
    projectManagerName: 'Sarah Johnson',
    projectManagerEmail: 'sarah.johnson@example.org',
    notes: 'Concept note requested. Deadline: Sept 30.',
  },
  {
    title: 'ECHO WASH Infrastructure Rehabilitation',
    donorName: 'European Commission - ECHO',
    donorType: 'EU',
    fundingWindow: 'Q4 2024 Humanitarian Call',
    deadline: '2024-08-15',
    indicativeBudgetMin: '800000.00',
    indicativeBudgetMax: '1200000.00',
    sectors: JSON.stringify(['WASH', 'Health']),
    country: 'Yemen',
    governorate: 'Hodeidah',
    stage: 'Go Decision',
    probability: 85,
    focalPoint: 'Ahmed Al-Mansouri',
    projectManagerName: 'Ahmed Al-Mansouri',
    projectManagerEmail: 'ahmed.mansouri@example.org',
    notes: 'Full proposal in development. Strong donor interest.',
  },
  {
    title: 'Gates Foundation Nutrition Innovation',
    donorName: 'Gates Foundation',
    donorType: 'Foundation',
    fundingWindow: 'Annual Innovation Grant',
    deadline: '2025-02-28',
    indicativeBudgetMin: '500000.00',
    indicativeBudgetMax: '800000.00',
    sectors: JSON.stringify(['Health', 'Nutrition']),
    country: 'Yemen',
    governorate: null,
    stage: 'Identified',
    probability: 50,
    focalPoint: 'Dr. Fatima Hassan',
    projectManagerName: 'Dr. Fatima Hassan',
    projectManagerEmail: 'fatima.hassan@example.org',
    notes: 'Initial scoping phase. Need to develop innovation concept.',
  },
  {
    title: 'USAID Livelihoods & Economic Recovery',
    donorName: 'USAID',
    donorType: 'Government',
    fundingWindow: 'FY2024 Resilience Program',
    deadline: '2024-10-30',
    indicativeBudgetMin: '1500000.00',
    indicativeBudgetMax: '2000000.00',
    sectors: JSON.stringify(['Livelihoods', 'Economic Recovery']),
    country: 'Yemen',
    governorate: 'Aden',
    stage: 'Concept Requested',
    probability: 70,
    focalPoint: 'Mohammed Ali',
    projectManagerName: 'Mohammed Ali',
    projectManagerEmail: 'mohammed.ali@example.org',
    notes: 'Concept note submitted. Awaiting feedback.',
  },
  {
    title: 'NRC Shelter & Protection for IDPs',
    donorName: 'Norwegian Refugee Council',
    donorType: 'INGO',
    fundingWindow: 'Q3 2024 IDP Response',
    deadline: '2024-09-30',
    indicativeBudgetMin: '400000.00',
    indicativeBudgetMax: '600000.00',
    sectors: JSON.stringify(['Shelter', 'Protection']),
    country: 'Yemen',
    governorate: 'Marib',
    stage: 'No-Go',
    probability: 20,
    focalPoint: 'Layla Ibrahim',
    projectManagerName: 'Layla Ibrahim',
    projectManagerEmail: 'layla.ibrahim@example.org',
    notes: 'Capacity constraints. Not pursuing this cycle.',
  },
];

for (const pipeline of pipelineOpps) {
  await connection.query(
    `INSERT INTO pipeline_opportunities 
    (organizationId, operatingUnitId, title, donorName, donorType, fundingWindow, deadline, 
     indicativeBudgetMin, indicativeBudgetMax, sectors, country, governorate, stage, probability, 
     focalPoint, projectManagerName, projectManagerEmail, notes, createdBy, updatedBy) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orgId, unitId, pipeline.title, pipeline.donorName, pipeline.donorType, pipeline.fundingWindow, 
     pipeline.deadline, pipeline.indicativeBudgetMin, pipeline.indicativeBudgetMax, pipeline.sectors,
     pipeline.country, pipeline.governorate, pipeline.stage, pipeline.probability, pipeline.focalPoint,
     pipeline.projectManagerName, pipeline.projectManagerEmail, pipeline.notes, userId, userId]
  );
}

console.log(`✅ Seeded ${pipelineOpps.length} pipeline opportunities\n`);

// ========================================
// 3. SEED PROPOSALS
// ========================================
console.log('📝 Seeding Proposals...');

const proposals = [
  {
    proposalTitle: 'Emergency Education Support in Conflict Areas',
    donorName: 'UNICEF',
    callReference: 'UNICEF-YEM-EDU-2024-001',
    proposalType: 'Concept Note',
    country: 'Yemen',
    governorate: 'Sana\'a',
    sectors: JSON.stringify(['Education in Emergencies', 'Child Protection']),
    projectDuration: 12,
    totalRequestedBudget: '450000.00',
    currency: 'USD',
    submissionDeadline: '2024-09-30',
    proposalStatus: 'Under Internal Review',
    completionPercentage: 65,
    executiveSummary: 'This proposal aims to provide emergency education support to conflict-affected children in Sana\'a governorate.',
    leadWriter: 'Sarah Johnson',
    projectManagerName: 'Sarah Johnson',
    projectManagerEmail: 'sarah.johnson@example.org',
  },
  {
    proposalTitle: 'WASH Infrastructure Rehabilitation & Health Integration',
    donorName: 'European Commission - ECHO',
    callReference: 'ECHO-YEM-WASH-2024-003',
    proposalType: 'Full Proposal',
    country: 'Yemen',
    governorate: 'Hodeidah',
    sectors: JSON.stringify(['WASH', 'Health']),
    projectDuration: 18,
    totalRequestedBudget: '1100000.00',
    currency: 'EUR',
    submissionDeadline: '2024-08-15',
    proposalStatus: 'Submitted',
    completionPercentage: 100,
    executiveSummary: 'Integrated WASH and health intervention targeting cholera-affected communities in Hodeidah.',
    leadWriter: 'Ahmed Al-Mansouri',
    projectManagerName: 'Ahmed Al-Mansouri',
    projectManagerEmail: 'ahmed.mansouri@example.org',
  },
  {
    proposalTitle: 'Community-Based Nutrition Innovation Program',
    donorName: 'Gates Foundation',
    callReference: 'GATES-YEM-NUT-2024-007',
    proposalType: 'Expression of Interest',
    country: 'Yemen',
    governorate: null,
    sectors: JSON.stringify(['Health', 'Nutrition']),
    projectDuration: 24,
    totalRequestedBudget: '750000.00',
    currency: 'USD',
    submissionDeadline: '2025-02-28',
    proposalStatus: 'Draft',
    completionPercentage: 30,
    executiveSummary: 'Innovative community-based approach to addressing malnutrition through local health workers.',
    leadWriter: 'Dr. Fatima Hassan',
    projectManagerName: 'Dr. Fatima Hassan',
    projectManagerEmail: 'fatima.hassan@example.org',
  },
  {
    proposalTitle: 'Market-Based Livelihoods Recovery Program',
    donorName: 'USAID',
    callReference: 'USAID-YEM-LIV-2024-012',
    proposalType: 'Concept Note',
    country: 'Yemen',
    governorate: 'Aden',
    sectors: JSON.stringify(['Livelihoods', 'Economic Recovery']),
    projectDuration: 36,
    totalRequestedBudget: '1800000.00',
    currency: 'USD',
    submissionDeadline: '2024-10-30',
    proposalStatus: 'Submitted',
    completionPercentage: 100,
    executiveSummary: 'Three-year program supporting market-based livelihoods recovery in urban and peri-urban areas.',
    leadWriter: 'Mohammed Ali',
    projectManagerName: 'Mohammed Ali',
    projectManagerEmail: 'mohammed.ali@example.org',
  },
  {
    proposalTitle: 'Integrated Shelter & Protection for IDPs',
    donorName: 'Norwegian Refugee Council',
    callReference: 'NRC-YEM-SHL-2024-005',
    proposalType: 'Full Proposal',
    country: 'Yemen',
    governorate: 'Marib',
    sectors: JSON.stringify(['Shelter', 'Protection']),
    projectDuration: 12,
    totalRequestedBudget: '550000.00',
    currency: 'USD',
    submissionDeadline: '2024-09-30',
    proposalStatus: 'Approved',
    completionPercentage: 100,
    executiveSummary: 'Integrated shelter and protection services for newly displaced populations in Marib.',
    leadWriter: 'Layla Ibrahim',
    projectManagerName: 'Layla Ibrahim',
    projectManagerEmail: 'layla.ibrahim@example.org',
  },
];

for (const proposal of proposals) {
  await connection.query(
    `INSERT INTO proposals 
    (organizationId, operatingUnitId, proposalTitle, donorName, callReference, proposalType, 
     country, governorate, sectors, projectDuration, totalRequestedBudget, currency, 
     submissionDeadline, proposalStatus, completionPercentage, executiveSummary, leadWriter, 
     projectManagerName, projectManagerEmail, createdBy, updatedBy) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orgId, unitId, proposal.proposalTitle, proposal.donorName, proposal.callReference, proposal.proposalType,
     proposal.country, proposal.governorate, proposal.sectors, proposal.projectDuration, 
     proposal.totalRequestedBudget, proposal.currency, proposal.submissionDeadline, proposal.proposalStatus,
     proposal.completionPercentage, proposal.executiveSummary, proposal.leadWriter, 
     proposal.projectManagerName, proposal.projectManagerEmail, userId, userId]
  );
}

console.log(`✅ Seeded ${proposals.length} proposals\n`);

// ========================================
// SUMMARY
// ========================================
console.log('🎉 Seed data generation complete!\n');
console.log('Summary:');
console.log(`  - ${opportunities.length} Opportunities`);
console.log(`  - ${pipelineOpps.length} Pipeline Opportunities`);
console.log(`  - ${proposals.length} Proposals`);
console.log('\n✅ Database is ready for testing Phase 2.1 SSOT-Lite implementation.');

await connection.end();
