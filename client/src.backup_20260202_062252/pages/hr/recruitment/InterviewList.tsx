/**
 * ============================================================================
 * INTERVIEW LIST & EVALUATION
 * ============================================================================
 * 
 * Features:
 * - View all scheduled interviews
 * - Conduct interview evaluation
 * - Score candidates
 * - Recommendation notes
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { Calendar, Users, FileText, CheckCircle, Star, Clock } from 'lucide-react';
import {
  interviewService,
  candidateService,
  vacancyService
} from './recruitmentService';
import { Interview, Candidate } from './types';
import { InterviewEvaluation } from './InterviewEvaluation';

interface Props {
  language: string;
  isRTL: boolean;
}

export function InterviewList({ language, isRTL }: Props) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<Interview[]>([]);
  const [pastInterviews, setPastInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [candidatesMap, setCandidatesMap] = useState<Record<string, Candidate>>({});

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = () => {
    const allInterviews = interviewService.getAll();
    setInterviews(allInterviews);

    const now = new Date();
    const upcoming = allInterviews.filter(i => new Date(i.interviewDate) > now);
    const past = allInterviews.filter(i => new Date(i.interviewDate) <= now);

    setUpcomingInterviews(upcoming);
    setPastInterviews(past);

    // Load candidates
    const candidates = candidateService.getAll();
    const map: Record<string, Candidate> = {};
    candidates.forEach(c => {
      map[c.id] = c;
    });
    setCandidatesMap(map);
  };

  const handleEvaluateClick = (interview: Interview) => {
    setSelectedInterview(interview);
    setShowEvaluation(true);
  };

  const handleEvaluationComplete = () => {
    setShowEvaluation(false);
    setSelectedInterview(null);
    loadInterviews();
  };

  const getStatusBadge = (interview: Interview) => {
    const now = new Date();
    const interviewDate = new Date(interview.interviewDate);

    if (interview.overallScore !== undefined) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Completed
        </span>
      );
    } else if (interviewDate > now) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Scheduled
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <FileText className="w-3 h-3" />
          Pending Evaluation
        </span>
      );
    }
  };

  const t = {
    title: language === 'en' ? 'Interview Management' : 'إدارة المقابلات',
    upcomingInterviews: language === 'en' ? 'Upcoming Interviews' : 'المقابلات القادمة',
    pastInterviews: language === 'en' ? 'Past Interviews' : 'المقابلات السابقة',
    
    candidateName: language === 'en' ? 'Candidate' : 'المرشح',
    position: language === 'en' ? 'Position' : 'المنصب',
    interviewDate: language === 'en' ? 'Date' : 'التاريخ',
    type: language === 'en' ? 'Type' : 'النوع',
    panelMembers: language === 'en' ? 'Panel' : 'اللجنة',
    status: language === 'en' ? 'Status' : 'الحالة',
    score: language === 'en' ? 'Score' : 'النتيجة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    evaluate: language === 'en' ? 'Evaluate' : 'تقييم',
    view: language === 'en' ? 'View' : 'عرض',
    
    noUpcoming: language === 'en' ? 'No upcoming interviews' : 'لا توجد مقابلات قادمة',
    noPast: language === 'en' ? 'No past interviews' : 'لا توجد مقابلات سابقة',
    
    total: language === 'en' ? 'Total Interviews' : 'إجمالي المقابلات',
    upcoming: language === 'en' ? 'Upcoming' : 'القادمة',
    completed: language === 'en' ? 'Completed' : 'المكتملة'
  };

  const completedCount = interviews.filter(i => i.overallScore !== undefined).length;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.total}</p>
              <p className="text-2xl font-bold text-gray-900">{interviews.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.upcoming}</p>
              <p className="text-2xl font-bold text-blue-600">{upcomingInterviews.length}</p>
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
      </div>

      {/* Upcoming Interviews */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{t.upcomingInterviews}</h3>
        </div>

        {upcomingInterviews.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>{t.noUpcoming}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.candidateName}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.interviewDate}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.type}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.panelMembers}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.status}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {upcomingInterviews.map((interview) => {
                  const candidate = candidatesMap[interview.candidateId];
                  return (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {candidate?.fullName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(interview.interviewDate).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {interview.interviewType}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {interview.panelMembers.join(', ')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(interview)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past Interviews */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{t.pastInterviews}</h3>
        </div>

        {pastInterviews.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>{t.noPast}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.candidateName}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.interviewDate}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.type}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.panelMembers}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.score}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.status}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pastInterviews.map((interview) => {
                  const candidate = candidatesMap[interview.candidateId];
                  return (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {candidate?.fullName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(interview.interviewDate).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {interview.interviewType}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {interview.panelMembers.join(', ')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {interview.overallScore !== undefined ? (
                          <span className="flex items-center gap-1 text-green-600 font-bold">
                            <Star className="w-4 h-4 fill-current" />
                            {interview.overallScore}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(interview)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {interview.overallScore === undefined && (
                          <button
                            onClick={() => handleEvaluateClick(interview)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-xs"
                          >
                            <FileText className="w-4 h-4" />
                            {t.evaluate}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interview Evaluation Modal */}
      {showEvaluation && selectedInterview && (
        <InterviewEvaluation
          language={language}
          isRTL={isRTL}
          interview={selectedInterview}
          candidate={candidatesMap[selectedInterview.candidateId]}
          onClose={() => setShowEvaluation(false)}
          onComplete={handleEvaluationComplete}
        />
      )}
    </div>
  );
}
