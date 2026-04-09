/**
 * ============================================================================
 * INTERVIEW MANAGEMENT
 * ============================================================================
 * 
 * Features:
 * - View all scheduled interviews
 * - Schedule new interviews
 * - Conduct evaluations
 * - Track interview status
 * - Excel export
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { 
  Calendar,
  Clock,
  Users,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  Download,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  interviewService,
  candidateService,
  vacancyService
} from './recruitmentService';
import { Interview, InterviewStatus } from './types';
import { InterviewScheduleForm } from './InterviewScheduleForm';
import { InterviewEvaluationForm } from './InterviewEvaluationForm';

interface Props {
  language: string;
  isRTL: boolean;
}

export function InterviewManagement({ language, isRTL }: Props) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>([]);
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | 'All'>('All');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  useEffect(() => {
    loadInterviews();
  }, []);

  useEffect(() => {
    filterInterviews();
  }, [interviews, statusFilter]);

  const loadInterviews = () => {
    const data = interviewService.getAll();
    setInterviews(data);
  };

  const filterInterviews = () => {
    let filtered = interviews;

    if (statusFilter !== 'All') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

    setFilteredInterviews(filtered);
  };

  const handleExportExcel = () => {
    const excelData = filteredInterviews.map(interview => {
      const candidate = candidateService.getById(interview.candidateId);
      const vacancy = vacancyService.getById(interview.vacancyId);

      return {
        'Interview ID': interview.interviewRef,
        'Candidate': candidate?.fullName || '',
        'Candidate Ref': candidate?.candidateRef || '',
        'Position': vacancy?.positionTitle || '',
        'Vacancy Ref': vacancy?.vacancyRef || '',
        'Interview Date': new Date(interview.scheduledDate).toLocaleDateString(),
        'Interview Time': interview.scheduledTime,
        'Location/Link': interview.location,
        'Type': interview.interviewType,
        'Status': interview.status,
        'Panel Members': interview.panelMembers.join(', '),
        'Overall Rating': interview.overallRating ? `${interview.overallRating}/5` : 'Not evaluated',
        'Recommendation': interview.recommendation || 'Pending',
        'Notes': interview.notes || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, 
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 30 },
      { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 12 },
      { wch: 15 }, { wch: 40 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Interviews');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Interviews_${timestamp}.xlsx`);
  };

  const getStatusBadge = (status: InterviewStatus) => {
    const styles = {
      Scheduled: 'bg-blue-100 text-blue-700',
      Completed: 'bg-green-100 text-green-700',
      Cancelled: 'bg-red-100 text-red-700',
      'No Show': 'bg-gray-100 text-gray-700'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getRecommendationBadge = (recommendation: string) => {
    const styles: Record<string, string> = {
      'Highly Recommended': 'bg-green-100 text-green-700',
      'Recommended': 'bg-blue-100 text-blue-700',
      'Not Recommended': 'bg-red-100 text-red-700',
      'On Hold': 'bg-yellow-100 text-yellow-700'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[recommendation] || 'bg-gray-100 text-gray-700'}`}>
        {recommendation}
      </span>
    );
  };

  const t = {
    title: language === 'en' ? 'Interview Management' : 'إدارة المقابلات',
    scheduleInterview: language === 'en' ? 'Schedule Interview' : 'جدولة مقابلة',
    exportExcel: language === 'en' ? 'Export to Excel' : 'تصدير إلى Excel',
    
    all: language === 'en' ? 'All' : 'الكل',
    scheduled: language === 'en' ? 'Scheduled' : 'مجدولة',
    completed: language === 'en' ? 'Completed' : 'مكتملة',
    cancelled: language === 'en' ? 'Cancelled' : 'ملغاة',
    noShow: language === 'en' ? 'No Show' : 'لم يحضر',
    
    interviewRef: language === 'en' ? 'Interview Ref' : 'مرجع المقابلة',
    candidate: language === 'en' ? 'Candidate' : 'المرشح',
    position: language === 'en' ? 'Position' : 'المنصب',
    date: language === 'en' ? 'Date' : 'التاريخ',
    time: language === 'en' ? 'Time' : 'الوقت',
    type: language === 'en' ? 'Type' : 'النوع',
    status: language === 'en' ? 'Status' : 'الحالة',
    rating: language === 'en' ? 'Rating' : 'التقييم',
    recommendation: language === 'en' ? 'Recommendation' : 'التوصية',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    view: language === 'en' ? 'View' : 'عرض',
    evaluate: language === 'en' ? 'Evaluate' : 'تقييم',
    
    noInterviews: language === 'en' ? 'No interviews found' : 'لا توجد مقابلات',
    
    totalInterviews: language === 'en' ? 'Total Interviews' : 'إجمالي المقابلات',
    pending: language === 'en' ? 'Pending Evaluation' : 'في انتظار التقييم',
    evaluated: language === 'en' ? 'Evaluated' : 'تم التقييم'
  };

  const scheduledCount = interviews.filter(i => i.status === 'Scheduled').length;
  const completedCount = interviews.filter(i => i.status === 'Completed').length;
  const pendingEvaluation = interviews.filter(i => i.status === 'Completed' && !i.overallRating).length;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t.exportExcel}
          </button>
          <button
            onClick={() => setShowScheduleForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t.scheduleInterview}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.totalInterviews}</p>
              <p className="text-2xl font-bold text-gray-900">{interviews.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.scheduled}</p>
              <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.completed}</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.pending}</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingEvaluation}</p>
            </div>
            <Users className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          {(['All', 'Scheduled', 'Completed', 'Cancelled', 'No Show'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'All' ? t.all : 
               status === 'Scheduled' ? t.scheduled :
               status === 'Completed' ? t.completed :
               status === 'Cancelled' ? t.cancelled : t.noShow}
            </button>
          ))}
        </div>
      </div>

      {/* Interviews Table */}
      {filteredInterviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium">{t.noInterviews}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.interviewRef}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.candidate}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.position}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.date}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.time}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.type}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.status}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.rating}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.recommendation}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInterviews.map((interview) => {
                  const candidate = candidateService.getById(interview.candidateId);
                  const vacancy = vacancyService.getById(interview.vacancyId);

                  return (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {interview.interviewRef}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {candidate?.fullName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {vacancy?.positionTitle}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(interview.scheduledDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {interview.scheduledTime}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {interview.interviewType}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(interview.status)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {interview.overallRating ? (
                          <span className="text-yellow-600 font-medium">
                            ⭐ {interview.overallRating}/5
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {interview.recommendation ? (
                          getRecommendationBadge(interview.recommendation)
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedInterview(interview);
                              setShowEvaluationForm(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title={t.evaluate}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleForm && (
        <InterviewScheduleForm
          language={language}
          isRTL={isRTL}
          onClose={() => setShowScheduleForm(false)}
          onSave={() => {
            setShowScheduleForm(false);
            loadInterviews();
          }}
        />
      )}

      {/* Interview Evaluation Modal */}
      {showEvaluationForm && selectedInterview && (
        <InterviewEvaluationForm
          language={language}
          isRTL={isRTL}
          interview={selectedInterview}
          onClose={() => {
            setShowEvaluationForm(false);
            setSelectedInterview(null);
          }}
          onSave={() => {
            setShowEvaluationForm(false);
            setSelectedInterview(null);
            loadInterviews();
          }}
        />
      )}
    </div>
  );
}
