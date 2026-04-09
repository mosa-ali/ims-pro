/**
 * ============================================================================
 * DYNAMIC PROJECT RISK LEVEL CALCULATION
 * ============================================================================
 * 
 * This module calculates project risk level dynamically based on:
 * 1. Time Risk - % of project duration elapsed vs remaining
 * 2. Implementation Risk - Activities/Indicators/Tasks planned vs completed
 * 3. Financial Risk - Budget spent vs time elapsed, burn rate alignment
 * 4. Logged Risks - Number and severity of recorded risk records
 * 
 * MANDATORY RULES:
 * - Rule 1: 20%+ time elapsed AND 0% progress → HIGH risk
 * - Rule 2: 20%+ time elapsed AND 0% budget spent → HIGH risk
 * - Rule 3: Activities exist but no indicators/outputs → MEDIUM or HIGH
 * - Rule 4: Low risk ONLY if all conditions met
 * - Default to MEDIUM if insufficient data (never default to Low)
 * 
 * ============================================================================
 */

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface RiskCalculationInput {
 // Project timeline
 startDate: string | Date;
 endDate: string | Date;
 
 // Implementation metrics
 activitiesTotal: number;
 activitiesCompleted: number;
 indicatorsTotal: number;
 indicatorsAchieved: number;
 tasksTotal: number;
 tasksCompleted: number;
 
 // Financial metrics
 totalBudget: number;
 spent: number;
 
 // Logged risks (if available)
 highRisks?: number;
 mediumRisks?: number;
 lowRisks?: number;
}

export interface RiskCalculationResult {
 level: RiskLevel;
 score: number; // 0-100, higher = more risk
 factors: RiskFactor[];
 summary: string;
}

export interface RiskFactor {
 dimension: 'time' | 'implementation' | 'financial' | 'logged';
 name: string;
 value: number;
 threshold: number;
 status: 'ok' | 'warning' | 'critical';
 description: string;
}

/**
 * Calculate the percentage of project duration elapsed
 */
function calculateTimeElapsed(startDate: Date, endDate: Date): number {
 const now = new Date();
 const totalDuration = endDate.getTime() - startDate.getTime();
 const elapsed = now.getTime() - startDate.getTime();
 
 if (totalDuration <= 0) return 100;
 if (elapsed < 0) return 0;
 if (elapsed > totalDuration) return 100;
 
 return Math.round((elapsed / totalDuration) * 100);
}

/**
 * Calculate implementation progress percentage
 */
function calculateImplementationProgress(
 activitiesTotal: number,
 activitiesCompleted: number,
 indicatorsTotal: number,
 indicatorsAchieved: number,
 tasksTotal: number,
 tasksCompleted: number
): number {
 let totalItems = 0;
 let completedItems = 0;
 
 // Weight: Activities (40%), Indicators (40%), Tasks (20%)
 if (activitiesTotal > 0) {
 totalItems += 40;
 completedItems += (activitiesCompleted / activitiesTotal) * 40;
 }
 
 if (indicatorsTotal > 0) {
 totalItems += 40;
 completedItems += (indicatorsAchieved / indicatorsTotal) * 40;
 }
 
 if (tasksTotal > 0) {
 totalItems += 20;
 completedItems += (tasksCompleted / tasksTotal) * 20;
 }
 
 if (totalItems === 0) return 0;
 return Math.round((completedItems / totalItems) * 100);
}

/**
 * Calculate budget burn rate
 */
function calculateBurnRate(totalBudget: number, spent: number): number {
 if (totalBudget <= 0) return 0;
 return Math.round((spent / totalBudget) * 100);
}

/**
 * Main risk calculation function
 * Implements mandatory risk rules as specified in requirements
 */
export function calculateProjectRiskLevel(input: RiskCalculationInput): RiskCalculationResult {
 const factors: RiskFactor[] = [];
 
 // Parse dates
 const startDate = new Date(input.startDate);
 const endDate = new Date(input.endDate);
 
 // Calculate metrics
 const timeElapsed = calculateTimeElapsed(startDate, endDate);
 const implementationProgress = calculateImplementationProgress(
 input.activitiesTotal,
 input.activitiesCompleted,
 input.indicatorsTotal,
 input.indicatorsAchieved,
 input.tasksTotal,
 input.tasksCompleted
 );
 const burnRate = calculateBurnRate(input.totalBudget, input.spent);
 
 // Expected burn rate based on time elapsed
 const expectedBurnRate = timeElapsed;
 const burnRateDeviation = Math.abs(burnRate - expectedBurnRate);
 
 // ============================================================================
 // MANDATORY RULE CHECKS
 // ============================================================================
 
 let riskScore = 0;
 let criticalFactors = 0;
 let warningFactors = 0;
 
 // TIME RISK FACTOR
 const timeRiskFactor: RiskFactor = {
 dimension: 'time',
 name: 'Time Elapsed',
 value: timeElapsed,
 threshold: 80,
 status: 'ok',
 description: `${timeElapsed}% of project duration elapsed`
 };
 
 if (timeElapsed >= 80) {
 timeRiskFactor.status = 'critical';
 criticalFactors++;
 riskScore += 25;
 } else if (timeElapsed >= 50) {
 timeRiskFactor.status = 'warning';
 warningFactors++;
 riskScore += 10;
 }
 factors.push(timeRiskFactor);
 
 // IMPLEMENTATION RISK FACTOR
 const implementationRiskFactor: RiskFactor = {
 dimension: 'implementation',
 name: 'Implementation Progress',
 value: implementationProgress,
 threshold: timeElapsed, // Should match time elapsed
 status: 'ok',
 description: `${implementationProgress}% implementation progress vs ${timeElapsed}% time elapsed`
 };
 
 // MANDATORY RULE 1: 20%+ time elapsed AND 0% progress → HIGH risk
 if (timeElapsed >= 20 && implementationProgress === 0) {
 implementationRiskFactor.status = 'critical';
 criticalFactors += 2; // Double weight for this critical rule
 riskScore += 40;
 implementationRiskFactor.description = 'CRITICAL: No progress with significant time elapsed';
 } else if (implementationProgress < timeElapsed - 20) {
 // Progress significantly behind schedule
 implementationRiskFactor.status = 'critical';
 criticalFactors++;
 riskScore += 25;
 implementationRiskFactor.description = `Progress (${implementationProgress}%) significantly behind schedule (${timeElapsed}% time elapsed)`;
 } else if (implementationProgress < timeElapsed - 10) {
 implementationRiskFactor.status = 'warning';
 warningFactors++;
 riskScore += 15;
 implementationRiskFactor.description = `Progress (${implementationProgress}%) slightly behind schedule`;
 }
 factors.push(implementationRiskFactor);
 
 // FINANCIAL RISK FACTOR
 const financialRiskFactor: RiskFactor = {
 dimension: 'financial',
 name: 'Budget Utilization',
 value: burnRate,
 threshold: expectedBurnRate,
 status: 'ok',
 description: `${burnRate}% budget spent vs ${expectedBurnRate}% expected`
 };
 
 // MANDATORY RULE 2: 20%+ time elapsed AND 0% budget spent → HIGH risk
 if (timeElapsed >= 20 && burnRate === 0) {
 financialRiskFactor.status = 'critical';
 criticalFactors += 2; // Double weight for this critical rule
 riskScore += 40;
 financialRiskFactor.description = 'CRITICAL: No budget spent with significant time elapsed';
 } else if (burnRateDeviation > 30) {
 financialRiskFactor.status = 'critical';
 criticalFactors++;
 riskScore += 20;
 financialRiskFactor.description = `Budget utilization (${burnRate}%) significantly deviates from expected (${expectedBurnRate}%)`;
 } else if (burnRateDeviation > 15) {
 financialRiskFactor.status = 'warning';
 warningFactors++;
 riskScore += 10;
 financialRiskFactor.description = `Budget utilization (${burnRate}%) deviates from expected (${expectedBurnRate}%)`;
 }
 factors.push(financialRiskFactor);
 
 // MANDATORY RULE 3: Activities exist but no indicators/outputs → MEDIUM or HIGH
 // When there are NO indicators defined (indicatorsTotal = 0), show "N/A" status
 const outputRiskFactor: RiskFactor = {
 dimension: 'implementation',
 name: 'Output Delivery',
 value: input.indicatorsAchieved,
 threshold: 1,
 status: input.indicatorsTotal === 0 ? 'ok' : 'ok', // Will be updated below
 description: input.indicatorsTotal === 0 
 ? 'N/A - No indicators defined for this project'
 : `${input.indicatorsAchieved} indicators achieved out of ${input.indicatorsTotal}`
 };
 
 // Only evaluate risk if indicators are defined
 if (input.indicatorsTotal > 0) {
 if (input.activitiesTotal > 0 && input.indicatorsAchieved === 0) {
 if (timeElapsed >= 30) {
 outputRiskFactor.status = 'critical';
 criticalFactors++;
 riskScore += 20;
 outputRiskFactor.description = 'CRITICAL: Activities exist but no indicators achieved';
 } else {
 outputRiskFactor.status = 'warning';
 warningFactors++;
 riskScore += 10;
 outputRiskFactor.description = 'WARNING: Activities exist but no indicators achieved yet';
 }
 }
 }
 factors.push(outputRiskFactor);
 
 // LOGGED RISKS FACTOR (if available)
 const highRisks = input.highRisks || 0;
 const mediumRisks = input.mediumRisks || 0;
 
 if (highRisks > 0 || mediumRisks > 0) {
 const loggedRiskFactor: RiskFactor = {
 dimension: 'logged',
 name: 'Logged Risks',
 value: highRisks + mediumRisks,
 threshold: 0,
 status: highRisks > 0 ? 'critical' : 'warning',
 description: `${highRisks} high-risk and ${mediumRisks} medium-risk items logged`
 };
 
 if (highRisks > 0) {
 criticalFactors++;
 riskScore += 15;
 }
 if (mediumRisks > 0) {
 warningFactors++;
 riskScore += 5;
 }
 factors.push(loggedRiskFactor);
 }
 
 // ============================================================================
 // DETERMINE FINAL RISK LEVEL
 // ============================================================================
 
 let level: RiskLevel;
 let summary: string;
 
 // Cap score at 100
 riskScore = Math.min(riskScore, 100);
 
 // MANDATORY RULE 4: Low risk ONLY if ALL conditions met
 const canBeLow = 
 implementationProgress >= timeElapsed - 10 && // On schedule
 burnRateDeviation <= 15 && // Budget aligned
 criticalFactors === 0 && // No critical issues
 highRisks === 0; // No high-risk records
 
 if (riskScore >= 60 || criticalFactors >= 2) {
 level = 'Critical';
 summary = 'Project faces critical delivery risks requiring immediate intervention';
 } else if (riskScore >= 40 || criticalFactors >= 1) {
 level = 'High';
 summary = 'Project has significant risks that need urgent attention';
 } else if (riskScore >= 20 || warningFactors >= 2 || !canBeLow) {
 level = 'Medium';
 summary = 'Project has moderate risks that should be monitored';
 } else if (canBeLow && riskScore < 20) {
 level = 'Low';
 summary = 'Project is on track with minimal risks';
 } else {
 // DEFAULT TO MEDIUM if insufficient data (never default to Low)
 level = 'Medium';
 summary = 'Insufficient data to determine risk level - defaulting to Medium';
 }
 
 return {
 level,
 score: riskScore,
 factors,
 summary
 };
}

/**
 * Get risk level color for UI display
 */
export function getRiskLevelColor(level: RiskLevel): string {
 switch (level) {
 case 'Critical':
 return 'text-red-700 bg-red-100 border-red-300';
 case 'High':
 return 'text-orange-700 bg-orange-100 border-orange-300';
 case 'Medium':
 return 'text-yellow-700 bg-yellow-100 border-yellow-300';
 case 'Low':
 return 'text-green-700 bg-green-100 border-green-300';
 default:
 return 'text-gray-700 bg-gray-100 border-gray-300';
 }
}

/**
 * Get risk level badge variant for shadcn/ui Badge component
 */
export function getRiskLevelBadgeVariant(level: RiskLevel): 'destructive' | 'secondary' | 'default' | 'outline' {
 switch (level) {
 case 'Critical':
 case 'High':
 return 'destructive';
 case 'Medium':
 return 'secondary';
 case 'Low':
 return 'default';
 default:
 return 'outline';
 }
}
