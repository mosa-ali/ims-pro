/**
 * ============================================================================
 * HR REPORTS & ANALYTICS MODULE
 * ============================================================================
 * 
 * Management and audit-ready insights
 * Read-only, filterable, exportable
 * All data pulled from authoritative sources
 * 
 * Categories:
 * - Workforce Reports
 * - Payroll Reports
 * - Leave Reports
 * - Recruitment Reports
 * - Compliance Reports
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { BarChart3, Users, DollarSign, Calendar, UserCheck, AlertTriangle, Download, FileText, TrendingUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { staffService } from '@/app/services/hrService';
import { leaveRequestService } from './leave/leaveService';
import { vacancyService, candidateService } from './recruitment/recruitmentService';

type ReportCategory = 'workforce' | 'payroll' | 'leave' | 'recruitment' | 'compliance';

export function HRReports() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('workforce');
  const [dateFilter, setDateFilter] = useState<string>('');

  const t = {
    title: language === 'en' ? 'Reports & Analytics' : 'التقارير والتحليلات',
    subtitle: language === 'en' ? 'Management and audit-ready HR insights' : 'رؤى الموارد البشرية الجاهزة للإدارة والتدقيق',
    
    // Categories
    workforceReports: language === 'en' ? 'Workforce Reports' : 'تقارير القوى العاملة',
    payrollReports: language === 'en' ? 'Payroll Reports' : 'تقارير الرواتب',
    leaveReports: language === 'en' ? 'Leave Reports' : 'تقارير الإجازات',
    recruitmentReports: language === 'en' ? 'Recruitment Reports' : 'تقارير التوظيف',
    complianceReports: language === 'en' ? 'Compliance Reports' : 'تقارير الامتثال',
    
    // Workforce
    totalHeadcount: language === 'en' ? 'Total Headcount' : 'إجمالي عدد الموظفين',
    activeEmployees: language === 'en' ? 'Active Employees' : 'الموظفون النشطون',
    archivedEmployees: language === 'en' ? 'Archived Employees' : 'الموظفون المؤرشفون',
    exitedEmployees: language === 'en' ? 'Exited Employees' : 'الموظفون الذين غادروا',
    headcountByDepartment: language === 'en' ? 'Headcount by Department' : 'العدد حسب القسم',
    headcountByProject: language === 'en' ? 'Headcount by Project' : 'العدد حسب المشروع',
    genderBreakdown: language === 'en' ? 'Gender Breakdown' : 'التوزيع حسب الجنس',
    nationalityBreakdown: language === 'en' ? 'Nationality Breakdown' : 'التوزيع حسب الجنسية',
    
    // Common
    export: language === 'en' ? 'Export to Excel' : 'تصدير إلى Excel',
    print: language === 'en' ? 'Print Report' : 'طباعة التقرير',
    dateRange: language === 'en' ? 'Date Range' : 'نطاق التاريخ',
    
    department: language === 'en' ? 'Department' : 'القسم',
    count: language === 'en' ? 'Count' : 'العدد',
    percentage: language === 'en' ? 'Percentage' : 'النسبة المئوية',
    
    readOnlyNote: language === 'en' ? '📊 All reports are read-only and auto-generated from system data' : '📊 جميع التقارير للقراءة فقط ويتم إنشاؤها تلقائياً من بيانات النظام'
  };

  // Calculate workforce statistics
  const getWorkforceStats = () => {
    const allStaff = staffService.getAll();
    const active = allStaff.filter(s => s.status === 'active');
    const archived = allStaff.filter(s => s.status === 'archived');
    const exited = allStaff.filter(s => s.status === 'exited');
    
    // By department
    const departmentCounts: Record<string, number> = {};
    active.forEach(staff => {
      const dept = staff.department || 'Unassigned';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    
    // By project
    const projectCounts: Record<string, number> = {};
    active.forEach(staff => {
      const proj = staff.project || 'Unassigned';
      projectCounts[proj] = (projectCounts[proj] || 0) + 1;
    });
    
    // By gender
    const genderCounts: Record<string, number> = {};
    active.forEach(staff => {
      const gender = staff.gender || 'Not Specified';
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    });
    
    // By nationality
    const nationalityCounts: Record<string, number> = {};
    active.forEach(staff => {
      const nat = staff.nationality || 'Not Specified';
      nationalityCounts[nat] = (nationalityCounts[nat] || 0) + 1;
    });
    
    return {
      total: allStaff.length,
      active: active.length,
      archived: archived.length,
      exited: exited.length,
      byDepartment: Object.entries(departmentCounts).map(([name, count]) => ({
        name,
        count,
        percentage: active.length > 0 ? ((count / active.length) * 100).toFixed(1) : '0'
      })),
      byProject: Object.entries(projectCounts).map(([name, count]) => ({
        name,
        count,
        percentage: active.length > 0 ? ((count / active.length) * 100).toFixed(1) : '0'
      })),
      byGender: Object.entries(genderCounts).map(([name, count]) => ({
        name,
        count,
        percentage: active.length > 0 ? ((count / active.length) * 100).toFixed(1) : '0'
      })),
      byNationality: Object.entries(nationalityCounts).map(([name, count]) => ({
        name,
        count,
        percentage: active.length > 0 ? ((count / active.length) * 100).toFixed(1) : '0'
      }))
    };
  };

  // Calculate leave statistics
  const getLeaveStats = () => {
    const allLeaves = leaveRequestService.getAll();
    const pending = allLeaves.filter(l => l.status === 'Pending');
    const approved = allLeaves.filter(l => l.status === 'Approved');
    const rejected = allLeaves.filter(l => l.status === 'Rejected');
    
    // By type
    const typeCounts: Record<string, number> = {};
    allLeaves.forEach(leave => {
      typeCounts[leave.leaveType] = (typeCounts[leave.leaveType] || 0) + 1;
    });
    
    return {
      total: allLeaves.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      byType: Object.entries(typeCounts).map(([type, count]) => ({
        type,
        count
      }))
    };
  };

  // Calculate recruitment statistics
  const getRecruitmentStats = () => {
    const allVacancies = vacancyService.getAll();
    const allCandidates = candidateService.getAll();
    
    const openVacancies = allVacancies.filter(v => v.status === 'Open');
    const closedVacancies = allVacancies.filter(v => v.status === 'Closed');
    
    const avgCandidatesPerVacancy = allVacancies.length > 0 
      ? (allCandidates.length / allVacancies.length).toFixed(1)
      : '0';
    
    return {
      totalVacancies: allVacancies.length,
      openVacancies: openVacancies.length,
      closedVacancies: closedVacancies.length,
      totalCandidates: allCandidates.length,
      avgCandidatesPerVacancy
    };
  };

  const workforceStats = getWorkforceStats();
  const leaveStats = getLeaveStats();
  const recruitmentStats = getRecruitmentStats();

  const categories = [
    { id: 'workforce' as ReportCategory, name: t.workforceReports, icon: Users },
    { id: 'payroll' as ReportCategory, name: t.payrollReports, icon: DollarSign },
    { id: 'leave' as ReportCategory, name: t.leaveReports, icon: Calendar },
    { id: 'recruitment' as ReportCategory, name: t.recruitmentReports, icon: UserCheck },
    { id: 'compliance' as ReportCategory, name: t.complianceReports, icon: AlertTriangle }
  ];

  const handleExport = () => {
    alert('Export to Excel - In a real system, this would generate an Excel file');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/organization/hr')}
        className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
        <span>{t.title}</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-base text-gray-600 mt-2">{t.subtitle}</p>
      </div>

      {/* Read-Only Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">{t.readOnlyNote}</p>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeCategory === cat.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Download className="w-4 h-4" />
              {t.export}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <FileText className="w-4 h-4" />
              {t.print}
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {/* Workforce Reports */}
          {activeCategory === 'workforce' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-700 mb-1">{t.totalHeadcount}</p>
                  <p className="text-3xl font-bold text-blue-900">{workforceStats.total}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-green-700 mb-1">{t.activeEmployees}</p>
                  <p className="text-3xl font-bold text-green-900">{workforceStats.active}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs text-amber-700 mb-1">{t.archivedEmployees}</p>
                  <p className="text-3xl font-bold text-amber-900">{workforceStats.archived}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-700 mb-1">{t.exitedEmployees}</p>
                  <p className="text-3xl font-bold text-gray-900">{workforceStats.exited}</p>
                </div>
              </div>

              {/* Headcount by Department */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.headcountByDepartment}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.department}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.count}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.percentage}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {workforceStats.byDepartment.map((dept, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{dept.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{dept.count}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{dept.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gender Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.genderBreakdown}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {workforceStats.byGender.map((gender, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">{gender.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{gender.count}</p>
                      <p className="text-xs text-gray-500 mt-1">{gender.percentage}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Payroll Reports */}
          {activeCategory === 'payroll' && (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {language === 'en' ? 'Payroll reports coming soon' : 'تقارير الرواتب قريباً'}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {language === 'en' ? 'Will show payroll costs by month, project, allowances summary' : 'ستعرض تكاليف الرواتب حسب الشهر والمشروع وملخص البدلات'}
              </p>
            </div>
          )}

          {/* Leave Reports */}
          {activeCategory === 'leave' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-700 mb-1">Total Leaves</p>
                  <p className="text-3xl font-bold text-blue-900">{leaveStats.total}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs text-yellow-700 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-900">{leaveStats.pending}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-green-700 mb-1">Approved</p>
                  <p className="text-3xl font-bold text-green-900">{leaveStats.approved}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-xs text-red-700 mb-1">Rejected</p>
                  <p className="text-3xl font-bold text-red-900">{leaveStats.rejected}</p>
                </div>
              </div>

              {/* Leave by Type */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Requests by Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {leaveStats.byType.map((type, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">{type.type}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{type.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recruitment Reports */}
          {activeCategory === 'recruitment' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-700 mb-1">Total Vacancies</p>
                  <p className="text-3xl font-bold text-blue-900">{recruitmentStats.totalVacancies}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-green-700 mb-1">Open Vacancies</p>
                  <p className="text-3xl font-bold text-green-900">{recruitmentStats.openVacancies}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-700 mb-1">Total Candidates</p>
                  <p className="text-3xl font-bold text-gray-900">{recruitmentStats.totalCandidates}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Candidates per Vacancy</h3>
                <p className="text-4xl font-bold text-blue-600">{recruitmentStats.avgCandidatesPerVacancy}</p>
              </div>
            </div>
          )}

          {/* Compliance Reports */}
          {activeCategory === 'compliance' && (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {language === 'en' ? 'Compliance reports coming soon' : 'تقارير الامتثال قريباً'}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {language === 'en' ? 'Will show contracts expiring, missing documents, pending appraisals' : 'ستعرض العقود المنتهية والمستندات المفقودة والتقييمات المعلقة'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}