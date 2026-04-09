
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskCategory = 'Operational' | 'Financial' | 'Security' | 'Reputational' | 'Compliance' | 'Programmatic';
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed' | 'Archived';
export type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Risk {
 id: string;
 title: string;
 titleAr: string;
 description: string;
 descriptionAr: string;
 category: RiskCategory;
 likelihood: number; // 1-5
 impact: number; // 1-5
 score: number; // likelihood * impact
 mitigationPlan: string;
 mitigationPlanAr: string;
 owner: string;
 status: RiskStatus;
 createdAt: string;
 updatedAt: string;
}

export interface Incident {
 id: string;
 riskId?: string;
 title: string;
 titleAr: string;
 description: string;
 descriptionAr: string;
 date: string;
 location: string;
 locationAr: string;
 severity: IncidentSeverity;
 actionsTaken: string;
 actionsTakenAr: string;
 reportedBy: string;
 status: 'Reported' | 'Investigating' | 'Resolved' | 'Closed';
 createdAt: string;
}

export interface RiskMatrixCell {
 likelihood: number;
 impact: number;
 risks: Risk[];
}
