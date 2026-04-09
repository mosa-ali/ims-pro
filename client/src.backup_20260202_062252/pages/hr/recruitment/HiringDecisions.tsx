/**
 * ============================================================================
 * HIRING DECISIONS MANAGEMENT
 * ============================================================================
 * 
 * View and manage hiring decisions
 * Track hired candidates
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { Users, Plus, Eye, Download, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  hiringDecisionService,
  candidateService,
  vacancyService,
  interviewService
} from './recruitmentService';
import { HiringDecision, Candidate } from './types';
import { HiringDecisionForm } from './HiringDecisionForm';

interface Props {
  language: string;
  isRTL: boolean;
}

export function HiringDecisions({ language, isRTL }: Props) {
  const [decisions, setDecisions] = useState<HiringDecision[]>([]);
  const [filteredDecisions, setFilteredDecisions] = useState<HiringDecision[]>([]);
  const [decisionFilter, setDecisionFilter] = useState<'All' | 'Approve' | 'Reject' | 'Hold'>('All');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterDecisions();
  }, [decisions, decisionFilter]);

  const loadData = () => {
    const decisionsData = hiringDecisionService.getAll();
    setDecisions(decisionsData);

    // Load interviewed candidates without hiring decisions
    const allCandidates = candidateService.getAll();
    const candidatesWithInterviews = allCandidates.filter(c => {
      const interviews = interviewService.getByCandidate(c.id);
      const hasDecision = decisionsData.some(d => d.candidateId === c.id);
      return interviews.length > 0 && !hasDecision && c.status === 'Interviewed';
    });
    setCandidates(candidatesWithInterviews);
  };

  const filterDecisions = () => {
    let filtered = decisions;

    if (decisionFilter !== 'All') {
      filtered = filtered.filter(d => d.decision === decisionFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredDecisions(filtered);
  };

  const handleExportExcel = () => {
    const excelData = filteredDecisions.map(decision => {
      const candidate = candidateService.getById(decision.candidateId);
      const vacancy = vacancyService.getById(decision.vacancyId);

      return {
        'Decision Ref': decision.decisionRef,
        'Candidate': candidate?.fullName || '',
        'Candidate Ref': candidate?.candidateRef || '',
        'Position': vacancy?.positionTitle || '',
        'Vacancy Ref': vacancy?.vacancyRef || '',
        'Decision': decision.decision,
        'Decision Date': new Date(decision.createdAt).toLocaleDateString(),
        'Approved By': decision.approvedBy,
        'Employee ID': decision.employeeId || 'N/A',
        'Start Date': decision.contractStartDate ? new Date(decision.contractStartDate).toLocaleDateString() : 'N/A',
        'Department': decision.department || 'N/A',
        'Position Title': decision.position || 'N/A',
        'Salary': decision.salary ? `${decision.currency} ${decision.salary}` : 'N/A',
        'Justification': decision.justification
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, 
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 },
      { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 25 },
      { wch: 15 }, { wch: 40 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Hiring Decisions');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Hiring_Decisions_${timestamp}.xlsx`);
  };

  const getDecisionBadge = (decision: string) => {
    const styles: Record<string, string> = {
      Approve: 'bg-green-100 text-green-700',
      Reject: 'bg-red-100 text-red-700',
      Hold: 'bg-yellow-100 text-yellow-700'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[decision]}`}>
        {decision}
      </span>
    );
  };

  const t = {
    title: language === 'en' ? 'Hiring Decisions' : 'قرارات التوظيف',
    makeDecision: language === 'en' ? 'Make Hiring Decision' : 'اتخاذ قرار التوظيف',
    exportExcel: language === 'en' ? 'Export to Excel' : 'تصدير إلى Excel',
    
    all: language === 'en' ? 'All' : 'الكل',
    approved: language === 'en' ? 'Approved' : 'تمت الموافقة',
    rejected: language === 'en' ? 'Rejected' : 'مرفوض',
    onHold: language === 'en' ? 'On Hold' : 'قيد الانتظار',
    
    decisionRef: language === 'en' ? 'Decision Ref' : 'مرجع القرار',
    candidate: language === 'en' ? 'Candidate' : 'المرشح',
    position: language === 'en' ? 'Position' : 'المنصب',
    decision: language === 'en' ? 'Decision' : 'القرار',
    date: language === 'en' ? 'Date' : 'التاريخ',
    approvedBy: language === 'en' ? 'Approved By' : 'تمت الموافقة من',
    employeeId: language === 'en' ? 'Employee ID' : 'رقم الموظف',
    
    pendingCandidates: language === 'en' ? 'Candidates Pending Decision' : 'المرشحون في انتظار القرار',
    selectCandidate: language === 'en' ? 'Select Candidate' : 'اختر المرشح',
    
    noDecisions: language === 'en' ? 'No hiring decisions found' : 'لا توجد قرارات توظيف',
    noPendingCandidates: language === 'en' ? 'No candidates awaiting decision' : 'لا يوجد مرشحون في انتظار القرار',
    
    totalDecisions: language === 'en' ? 'Total Decisions' : 'إجمالي القرارات',
    hired: language === 'en' ? 'Hired' : 'تم التعيين',
    pending: language === 'en' ? 'Awaiting Decision' : 'في انتظار القرار'
  };

  const approvedCount = decisions.filter(d => d.decision === 'Approve').length;
  const rejectedCount = decisions.filter(d => d.decision === 'Reject').length;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
        <button
          onClick={handleExportExcel}
          disabled={decisions.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {t.exportExcel}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.totalDecisions}</p>
              <p className="text-2xl font-bold text-gray-900">{decisions.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.hired}</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.rejected}</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <Users className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.pending}</p>
              <p className="text-2xl font-bold text-yellow-600">{candidates.length}</p>
            </div>
            <Users className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Pending Candidates */}
      {candidates.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-900 mb-3">{t.pendingCandidates}</h3>
          <div className="space-y-2">
            {candidates.map(candidate => {
              const vacancy = vacancyService.getById(candidate.vacancyId);
              return (
                <div key={candidate.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{candidate.fullName}</p>
                    <p className="text-sm text-gray-600">
                      {vacancy?.positionTitle} - Score: {candidate.totalScore.toFixed(1)}%
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setShowForm(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t.makeDecision}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          {(['All', 'Approve', 'Reject', 'Hold'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDecisionFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                decisionFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'All' ? t.all :
               filter === 'Approve' ? t.approved :
               filter === 'Reject' ? t.rejected : t.onHold}
            </button>
          ))}
        </div>
      </div>

      {/* Decisions Table */}
      {filteredDecisions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium">{t.noDecisions}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.decisionRef}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.candidate}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.position}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.decision}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.employeeId}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.date}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.approvedBy}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDecisions.map((decision) => {
                  const candidate = candidateService.getById(decision.candidateId);
                  const vacancy = vacancyService.getById(decision.vacancyId);

                  return (
                    <tr key={decision.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {decision.decisionRef}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {candidate?.fullName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {vacancy?.positionTitle}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getDecisionBadge(decision.decision)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {decision.employeeId || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(decision.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {decision.approvedBy}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hiring Decision Modal */}
      {showForm && selectedCandidate && (
        <HiringDecisionForm
          language={language}
          isRTL={isRTL}
          candidate={selectedCandidate}
          onClose={() => {
            setShowForm(false);
            setSelectedCandidate(null);
          }}
          onSave={() => {
            setShowForm(false);
            setSelectedCandidate(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
