/**
 * ============================================================================
 * HR REPORTS & ANALYTICS SERVICE
 * ============================================================================
 * 
 * Decision-ready, audit-safe, donor-safe insights
 * All reports are read-only and derived from core tables
 * 
 * ============================================================================
 */

import { staffService, PayrollSheet } from './hrService';
import { leaveService } from './leaveService';
import { vacancyService, candidateService, hiringDecisionService } from '../pages/hr/recruitment/recruitmentService';

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface WorkforceReport {
  totalHeadcount: number;
  activeStaff: number;
  archivedStaff: number;
  exitedStaff: number;
  byDepartment: { department: string; count: number }[];
  byProject: { project: string; count: number }[];
  byGender: { male: number; female: number; other: number };
  byNationality: { nationality: string; count: number }[];
  byContractType: { type: string; count: number }[];
  byGrade: { grade: string; count: number }[];
}

export interface PayrollReport {
  totalMonthlyCost: number;
  totalYearlyCost: number;
  byDepartment: { department: string; cost: number }[];
  byProject: { project: string; cost: number }[];
  allowancesSummary: { type: string; total: number }[];
  overtimeSummary: { month: string; total: number }[];
  averageSalary: number;
  medianSalary: number;
}

export interface LeaveReport {
  totalLeaveBalance: number;
  totalLeaveTaken: number;
  totalLeavePending: number;
  leaveByType: { type: string; taken: number; pending: number }[];
  leaveByDepartment: { department: string; taken: number }[];
  leaveLiability: number; // Total days owed
}

export interface RecruitmentReport {
  totalVacancies: number;
  openVacancies: number;
  filledVacancies: number;
  totalCandidates: number;
  shortlistedCandidates: number;
  averageTimeToHire: number; // days
  vacancyFillRate: number; // percentage
  candidatesPerVacancy: number;
  interviewToHireRatio: number;
}

export interface ComplianceReport {
  contractsExpiring: {
    next30Days: number;
    next60Days: number;
    next90Days: number;
    details: { staffId: string; staffName: string; expiryDate: string; daysRemaining: number }[];
  };
  missingDocuments: {
    count: number;
    details: { staffId: string; staffName: string; missingDocs: string[] }[];
  };
  pendingAppraisals: {
    count: number;
    details: { staffId: string; staffName: string; lastAppraisalDate: string | null }[];
  };
  disciplinaryCases: {
    total: number;
    byStatus: { status: string; count: number }[];
  };
}

// ============================================================================
// HR REPORTS SERVICE
// ============================================================================

class HRReportsService {
  // ============================================================================
  // WORKFORCE REPORTS
  // ============================================================================

  generateWorkforceReport(): WorkforceReport {
    const allStaff = staffService.getAll();

    // Status breakdown
    const activeStaff = allStaff.filter(s => s.status === 'active');
    const archivedStaff = allStaff.filter(s => s.status === 'archived');
    const exitedStaff = allStaff.filter(s => s.status === 'exited');

    // By Department
    const deptMap = new Map<string, number>();
    allStaff.forEach(s => {
      const dept = s.department || 'Unassigned';
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });
    const byDepartment = Array.from(deptMap.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    // By Project (from project assignments)
    const projectMap = new Map<string, number>();
    allStaff.forEach(s => {
      const project = s.currentProject || 'Unassigned';
      projectMap.set(project, (projectMap.get(project) || 0) + 1);
    });
    const byProject = Array.from(projectMap.entries())
      .map(([project, count]) => ({ project, count }))
      .sort((a, b) => b.count - a.count);

    // By Gender
    const genderMap = { male: 0, female: 0, other: 0 };
    allStaff.forEach(s => {
      const gender = (s.gender?.toLowerCase() || 'other') as 'male' | 'female' | 'other';
      if (gender in genderMap) {
        genderMap[gender]++;
      } else {
        genderMap.other++;
      }
    });

    // By Nationality
    const nationalityMap = new Map<string, number>();
    allStaff.forEach(s => {
      const nationality = s.nationality || 'Unknown';
      nationalityMap.set(nationality, (nationalityMap.get(nationality) || 0) + 1);
    });
    const byNationality = Array.from(nationalityMap.entries())
      .map(([nationality, count]) => ({ nationality, count }))
      .sort((a, b) => b.count - a.count);

    // By Contract Type
    const contractMap = new Map<string, number>();
    allStaff.forEach(s => {
      const type = s.contractType || 'Not Specified';
      contractMap.set(type, (contractMap.get(type) || 0) + 1);
    });
    const byContractType = Array.from(contractMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // By Grade
    const gradeMap = new Map<string, number>();
    allStaff.forEach(s => {
      const grade = s.grade || 'Not Assigned';
      gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
    });
    const byGrade = Array.from(gradeMap.entries())
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalHeadcount: allStaff.length,
      activeStaff: activeStaff.length,
      archivedStaff: archivedStaff.length,
      exitedStaff: exitedStaff.length,
      byDepartment,
      byProject,
      byGender: genderMap,
      byNationality,
      byContractType,
      byGrade
    };
  }

  // ============================================================================
  // PAYROLL REPORTS
  // ============================================================================

  generatePayrollReport(): PayrollReport {
    const allStaff = staffService.getAll();
    const activeStaff = allStaff.filter(s => s.status === 'active');

    // Total monthly cost (sum of all active salaries)
    const totalMonthlyCost = activeStaff.reduce((sum, s) => sum + (s.basicSalary || 0), 0);
    const totalYearlyCost = totalMonthlyCost * 12;

    // By Department
    const deptMap = new Map<string, number>();
    activeStaff.forEach(s => {
      const dept = s.department || 'Unassigned';
      deptMap.set(dept, (deptMap.get(dept) || 0) + (s.basicSalary || 0));
    });
    const byDepartment = Array.from(deptMap.entries())
      .map(([department, cost]) => ({ department, cost }))
      .sort((a, b) => b.cost - a.cost);

    // By Project
    const projectMap = new Map<string, number>();
    activeStaff.forEach(s => {
      const project = s.currentProject || 'Unassigned';
      projectMap.set(project, (projectMap.get(project) || 0) + (s.basicSalary || 0));
    });
    const byProject = Array.from(projectMap.entries())
      .map(([project, cost]) => ({ project, cost }))
      .sort((a, b) => b.cost - a.cost);

    // Allowances Summary (placeholder - would come from payroll records)
    const allowancesSummary = [
      { type: 'Transportation', total: 0 },
      { type: 'Housing', total: 0 },
      { type: 'Communication', total: 0 }
    ];

    // Overtime Summary (placeholder)
    const overtimeSummary: { month: string; total: number }[] = [];

    // Average and Median Salary
    const salaries = activeStaff.map(s => s.basicSalary || 0).sort((a, b) => a - b);
    const averageSalary = salaries.length > 0 
      ? salaries.reduce((sum, s) => sum + s, 0) / salaries.length 
      : 0;
    const medianSalary = salaries.length > 0
      ? salaries[Math.floor(salaries.length / 2)]
      : 0;

    return {
      totalMonthlyCost,
      totalYearlyCost,
      byDepartment,
      byProject,
      allowancesSummary,
      overtimeSummary,
      averageSalary,
      medianSalary
    };
  }

  // ============================================================================
  // LEAVE REPORTS
  // ============================================================================

  generateLeaveReport(): LeaveReport {
    const allLeaves = leaveService.getAll();
    const allStaff = staffService.getAll();

    // Total leave taken (approved only)
    const approvedLeaves = allLeaves.filter(l => l.status === 'approved');
    const totalLeaveTaken = approvedLeaves.reduce((sum, l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    // Total pending
    const pendingLeaves = allLeaves.filter(l => l.status === 'pending');
    const totalLeavePending = pendingLeaves.reduce((sum, l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    // Leave by Type
    const typeMap = new Map<string, { taken: number; pending: number }>();
    allLeaves.forEach(l => {
      const type = l.leaveType;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (!typeMap.has(type)) {
        typeMap.set(type, { taken: 0, pending: 0 });
      }
      const entry = typeMap.get(type)!;
      if (l.status === 'approved') {
        entry.taken += days;
      } else if (l.status === 'pending') {
        entry.pending += days;
      }
    });
    const leaveByType = Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data }));

    // Leave by Department
    const deptMap = new Map<string, number>();
    approvedLeaves.forEach(l => {
      const staff = allStaff.find(s => s.staffId === l.staffId);
      const dept = staff?.department || 'Unknown';
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      deptMap.set(dept, (deptMap.get(dept) || 0) + days);
    });
    const leaveByDepartment = Array.from(deptMap.entries())
      .map(([department, taken]) => ({ department, taken }))
      .sort((a, b) => b.taken - a.taken);

    // Leave Liability (total balance across all active staff)
    const activeStaff = allStaff.filter(s => s.status === 'active');
    const leaveLiability = activeStaff.reduce((sum, s) => sum + (s.annualLeaveBalance || 0), 0);

    // Total balance
    const totalLeaveBalance = activeStaff.reduce((sum, s) => sum + (s.annualLeaveBalance || 0), 0);

    return {
      totalLeaveBalance,
      totalLeaveTaken,
      totalLeavePending,
      leaveByType,
      leaveByDepartment,
      leaveLiability
    };
  }

  // ============================================================================
  // RECRUITMENT REPORTS
  // ============================================================================

  generateRecruitmentReport(): RecruitmentReport {
    const allVacancies = vacancyService.getAll();
    const allCandidates = candidateService.getAll();
    const allHiringDecisions = hiringDecisionService.getAll();

    const openVacancies = allVacancies.filter(v => v.status === 'Open').length;
    const filledVacancies = allVacancies.filter(v => v.status === 'Filled').length;
    const shortlistedCandidates = allCandidates.filter(c => c.shortlisted).length;

    // Average Time to Hire (from vacancy creation to hiring decision)
    const hiredCandidates = allHiringDecisions.filter(h => h.status === 'approved');
    let totalDays = 0;
    hiredCandidates.forEach(h => {
      const vacancy = allVacancies.find(v => v.id === h.vacancyId);
      if (vacancy) {
        const created = new Date(vacancy.createdAt);
        const hired = new Date(h.createdAt);
        const days = Math.ceil((hired.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        totalDays += days;
      }
    });
    const averageTimeToHire = hiredCandidates.length > 0 ? Math.round(totalDays / hiredCandidates.length) : 0;

    // Vacancy Fill Rate
    const vacancyFillRate = allVacancies.length > 0 
      ? Math.round((filledVacancies / allVacancies.length) * 100) 
      : 0;

    // Candidates Per Vacancy
    const candidatesPerVacancy = allVacancies.length > 0
      ? Math.round(allCandidates.length / allVacancies.length)
      : 0;

    // Interview to Hire Ratio
    const interviewToHireRatio = hiredCandidates.length > 0
      ? Math.round(shortlistedCandidates / hiredCandidates.length)
      : 0;

    return {
      totalVacancies: allVacancies.length,
      openVacancies,
      filledVacancies,
      totalCandidates: allCandidates.length,
      shortlistedCandidates,
      averageTimeToHire,
      vacancyFillRate,
      candidatesPerVacancy,
      interviewToHireRatio
    };
  }

  // ============================================================================
  // COMPLIANCE REPORTS
  // ============================================================================

  generateComplianceReport(): ComplianceReport {
    const allStaff = staffService.getAll();
    const activeStaff = allStaff.filter(s => s.status === 'active');
    const today = new Date();

    // Contracts Expiring
    const expiringContracts = activeStaff
      .filter(s => s.contractEndDate)
      .map(s => {
        const expiryDate = new Date(s.contractEndDate!);
        const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          staffId: s.staffId,
          staffName: s.fullName,
          expiryDate: s.contractEndDate!,
          daysRemaining
        };
      })
      .filter(s => s.daysRemaining >= 0 && s.daysRemaining <= 90)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const next30Days = expiringContracts.filter(c => c.daysRemaining <= 30).length;
    const next60Days = expiringContracts.filter(c => c.daysRemaining <= 60).length;
    const next90Days = expiringContracts.length;

    // Missing Documents (placeholder - would check document requirements)
    const missingDocuments = {
      count: 0,
      details: [] as { staffId: string; staffName: string; missingDocs: string[] }[]
    };

    // Pending Appraisals (staff who haven't had appraisal in 12 months)
    const pendingAppraisals = {
      count: 0,
      details: [] as { staffId: string; staffName: string; lastAppraisalDate: string | null }[]
    };

    // Disciplinary Cases Summary
    try {
      const disciplinaryCases = JSON.parse(localStorage.getItem('hr_sanctions') || '[]');
      const total = disciplinaryCases.length;
      const statusMap = new Map<string, number>();
      disciplinaryCases.forEach((c: any) => {
        const status = c.status || 'Unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      const byStatus = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }));

      return {
        contractsExpiring: {
          next30Days,
          next60Days,
          next90Days,
          details: expiringContracts
        },
        missingDocuments,
        pendingAppraisals,
        disciplinaryCases: {
          total,
          byStatus
        }
      };
    } catch {
      return {
        contractsExpiring: {
          next30Days,
          next60Days,
          next90Days,
          details: expiringContracts
        },
        missingDocuments,
        pendingAppraisals,
        disciplinaryCases: {
          total: 0,
          byStatus: []
        }
      };
    }
  }
}

export const hrReportsService = new HRReportsService();
