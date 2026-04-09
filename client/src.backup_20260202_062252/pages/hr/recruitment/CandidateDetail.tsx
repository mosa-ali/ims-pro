/**
 * ============================================================================
 * CANDIDATE DETAIL VIEW
 * ============================================================================
 * 
 * Complete candidate profile with:
 * - Personal information
 * - Criterion-by-criterion scores
 * - Document downloads
 * - Status management
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Download, FileText, CheckCircle, XCircle, Award } from 'lucide-react';
import {
  candidateResponseService,
  candidateDocumentService,
  vacancyCriteriaService,
  vacancyService
} from './recruitmentService';
import { Candidate, CandidateStatus, CandidateResponse, CandidateDocument, VacancyCriteria } from './types';

interface Props {
  language: string;
  isRTL: boolean;
  candidate: Candidate;
  onClose: () => void;
  onStatusChange: (newStatus: CandidateStatus) => void;
}

export function CandidateDetail({ language, isRTL, candidate, onClose, onStatusChange }: Props) {
  const [responses, setResponses] = useState<CandidateResponse[]>([]);
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [criteria, setCriteria] = useState<VacancyCriteria[]>([]);
  const [vacancy, setVacancy] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [candidate.id]);

  const loadData = () => {
    const responseData = candidateResponseService.getByCandidate(candidate.id);
    setResponses(responseData);

    const documentData = candidateDocumentService.getByCandidate(candidate.id);
    setDocuments(documentData);

    const vacancyData = vacancyService.getById(candidate.vacancyId);
    setVacancy(vacancyData);

    if (vacancyData) {
      const criteriaData = vacancyCriteriaService.getByVacancy(vacancyData.id);
      setCriteria(criteriaData);
    }
  };

  const handleDownloadDocument = (doc: CandidateDocument) => {
    // Convert base64 to blob and download
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.fileName;
    link.click();
  };

  const formatResponse = (response: any, type: string): string => {
    if (type === 'YesNo') {
      return response ? 'Yes' : 'No';
    } else if (type === 'Checklist' && Array.isArray(response)) {
      return response.join(', ');
    } else {
      return String(response);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const t = {
    title: language === 'en' ? 'Candidate Details' : 'تفاصيل المرشح',
    personalInfo: language === 'en' ? 'Personal Information' : 'المعلومات الشخصية',
    scoringDetails: language === 'en' ? 'Scoring Details' : 'تفاصيل التقييم',
    documents: language === 'en' ? 'Documents' : 'المستندات',
    
    candidateRef: language === 'en' ? 'Reference' : 'المرجع',
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    gender: language === 'en' ? 'Gender' : 'الجنس',
    nationality: language === 'en' ? 'Nationality' : 'الجنسية',
    dateOfBirth: language === 'en' ? 'Date of Birth' : 'تاريخ الميلاد',
    email: language === 'en' ? 'Email' : 'البريد الإلكتروني',
    phone: language === 'en' ? 'Phone' : 'الهاتف',
    currentLocation: language === 'en' ? 'Current Location' : 'الموقع الحالي',
    
    education: language === 'en' ? 'Education Level' : 'المستوى التعليمي',
    fieldOfStudy: language === 'en' ? 'Field of Study' : 'مجال الدراسة',
    yearsOfExperience: language === 'en' ? 'Years of Experience' : 'سنوات الخبرة',
    currentEmployer: language === 'en' ? 'Current Employer' : 'جهة العمل الحالية',
    currentPosition: language === 'en' ? 'Current Position' : 'المنصب الحالي',
    
    totalScore: language === 'en' ? 'Total Score' : 'النتيجة الإجمالية',
    shortlisted: language === 'en' ? 'Shortlisted' : 'في القائمة المختصرة',
    yes: language === 'en' ? 'Yes' : 'نعم',
    no: language === 'en' ? 'No' : 'لا',
    status: language === 'en' ? 'Status' : 'الحالة',
    appliedAt: language === 'en' ? 'Applied At' : 'تاريخ التقديم',
    
    criterion: language === 'en' ? 'Criterion' : 'المعيار',
    weight: language === 'en' ? 'Weight' : 'الوزن',
    response: language === 'en' ? 'Response' : 'الاستجابة',
    score: language === 'en' ? 'Score' : 'النتيجة',
    
    documentType: language === 'en' ? 'Type' : 'النوع',
    fileName: language === 'en' ? 'File Name' : 'اسم الملف',
    download: language === 'en' ? 'Download' : 'تحميل',
    
    approve: language === 'en' ? 'Approve (Shortlist)' : 'الموافقة (القائمة المختصرة)',
    reject: language === 'en' ? 'Reject' : 'رفض',
    close: language === 'en' ? 'Close' : 'إغلاق',
    
    noDocuments: language === 'en' ? 'No documents uploaded' : 'لا توجد مستندات'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">{t.title}</h2>
              <p className="text-sm text-blue-100">{candidate.candidateRef}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Score Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">{t.totalScore}</p>
                <p className={`text-4xl font-bold ${getScoreColor(candidate.totalScore)}`}>
                  {candidate.totalScore.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">{t.shortlisted}</p>
                <p className="text-2xl font-bold">
                  {candidate.isShortlisted ? (
                    <span className="text-green-600">{t.yes} ✓</span>
                  ) : (
                    <span className="text-gray-400">{t.no}</span>
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">{t.status}</p>
                <p className="text-lg font-medium text-gray-900">{candidate.status}</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t.personalInfo}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.fullName}</label>
                <p className="mt-1 text-sm text-gray-900">{candidate.fullName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.gender}</label>
                <p className="mt-1 text-sm text-gray-900">{candidate.gender}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.nationality}</label>
                <p className="mt-1 text-sm text-gray-900">{candidate.nationality}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.dateOfBirth}</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(candidate.dateOfBirth).toLocaleDateString()}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.email}</label>
                <p className="mt-1 text-sm text-gray-900">{candidate.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.phone}</label>
                <p className="mt-1 text-sm text-gray-900">{candidate.phone}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.currentLocation}</label>
                <p className="mt-1 text-sm text-gray-900">{candidate.currentLocation}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.education}</label>
                <p className="mt-1 text-sm text-gray-900">{candidate.educationLevel}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.fieldOfStudy}</label>
                <p className="mt-1 text-sm text-gray-900">{candidate.fieldOfStudy}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.yearsOfExperience}</label>
                <p className="mt-1 text-sm text-gray-900">{candidate.yearsOfExperience} years</p>
              </div>
              
              {candidate.currentEmployer && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">{t.currentEmployer}</label>
                  <p className="mt-1 text-sm text-gray-900">{candidate.currentEmployer}</p>
                </div>
              )}
              
              {candidate.currentPosition && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">{t.currentPosition}</label>
                  <p className="mt-1 text-sm text-gray-900">{candidate.currentPosition}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.appliedAt}</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(candidate.appliedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Scoring Details */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t.scoringDetails}</h3>
            
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.criterion}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.weight}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.response}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.score}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {criteria.map((criterion) => {
                    const response = responses.find(r => r.criteriaId === criterion.id);
                    return (
                      <tr key={criterion.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {criterion.criteriaName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {criterion.weightPercentage}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {response ? formatResponse(response.response, criterion.criteriaType) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {response && (
                            <span className={`font-bold ${getScoreColor(response.score)}`}>
                              {response.score.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900">
                      {t.totalScore}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`text-lg font-bold ${getScoreColor(candidate.totalScore)}`}>
                        {candidate.totalScore.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t.documents}</h3>
            
            {documents.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">{t.noDocuments}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.documentType}</p>
                        <p className="text-xs text-gray-500">{doc.fileName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadDocument(doc)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title={t.download}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t.close}
          </button>
          
          {candidate.status === 'Applied' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onStatusChange('Rejected')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {t.reject}
              </button>
              <button
                onClick={() => onStatusChange('Shortlisted')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {t.approve}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
