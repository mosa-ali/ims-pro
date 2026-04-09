/**
 * ============================================================================
 * HIRING DECISION WORKFLOW
 * ============================================================================
 * 
 * Features:
 * - Final hiring decision for interviewed candidates
 * - Proposed terms (Grade, Step, Salary, Contract Type, Start Date)
 * - Approval/Rejection workflow
 * - AUTO-CREATE Staff Dictionary record upon approval
 * - AUTO-CREATE Employee Profile record upon approval
 * - Offer letter generation
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { 
  UserCheck, 
  DollarSign, 
  Calendar,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Download
} from 'lucide-react';
import {
  candidateService,
  vacancyService,
  interviewService,
  hiringDecisionService
} from './recruitmentService';
import { staffService } from '@/app/services/hrService';
import { Candidate, Vacancy, Interview, HiringDecision } from './types';
import { OfferLetterGenerator } from './OfferLetterGenerator';

interface Props {
  language: string;
  isRTL: boolean;
}

export function HiringDecisionComponent({ language, isRTL }: Props) {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedVacancy, setSelectedVacancy] = useState<string>('');
  const [interviewedCandidates, setInterviewedCandidates] = useState<Candidate[]>([]);
  const [interviewsMap, setInterviewsMap] = useState<Record<string, Interview[]>>({});
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showDecisionForm, setShowDecisionForm] = useState(false);

  const [formData, setFormData] = useState({
    proposedGrade: 'G1',
    proposedStep: 'Step 1',
    proposedSalary: 0,
    contractType: 'Fixed-Term',
    startDate: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadVacancies();
  }, []);

  useEffect(() => {
    if (selectedVacancy) {
      loadInterviewedCandidates();
    }
  }, [selectedVacancy]);

  const loadVacancies = () => {
    const data = vacancyService.getAll();
    setVacancies(data);
    if (data.length > 0 && !selectedVacancy) {
      setSelectedVacancy(data[0].id);
    }
  };

  const loadInterviewedCandidates = () => {
    const allCandidates = candidateService.getByVacancy(selectedVacancy);
    const interviewed = allCandidates.filter(c => 
      c.status === 'Interviewed' || c.status === 'Shortlisted'
    );
    setInterviewedCandidates(interviewed);

    // Load interviews for each candidate
    const allInterviews = interviewService.getByVacancy(selectedVacancy);
    const map: Record<string, Interview[]> = {};
    allInterviews.forEach(interview => {
      if (!map[interview.candidateId]) {
        map[interview.candidateId] = [];
      }
      map[interview.candidateId].push(interview);
    });
    setInterviewsMap(map);
  };

  const handleDecisionClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowDecisionForm(true);
    
    // Get vacancy for defaults
    const vacancy = vacancyService.getById(selectedVacancy);
    
    setFormData({
      proposedGrade: vacancy?.proposedGrade || 'G1',
      proposedStep: 'Step 1',
      proposedSalary: vacancy?.minSalary || 0,
      contractType: vacancy?.contractType || 'Fixed-Term',
      startDate: ''
    });
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.proposedGrade) newErrors.proposedGrade = 'Grade is required';
    if (formData.proposedSalary <= 0) newErrors.proposedSalary = 'Salary must be greater than 0';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApprove = () => {
    if (!validate() || !selectedCandidate) return;

    const vacancy = vacancyService.getById(selectedVacancy);
    if (!vacancy) return;

    // Create hiring decision
    const decision = hiringDecisionService.create({
      candidateId: selectedCandidate.id,
      vacancyId: selectedVacancy,
      proposedGrade: formData.proposedGrade,
      proposedStep: formData.proposedStep,
      proposedSalary: formData.proposedSalary,
      contractType: formData.contractType,
      startDate: formData.startDate,
      decisionStatus: 'Approved',
      approvedBy: 'Current User', // In real app from auth
      decisionDate: new Date().toISOString(),
      decisionNotes: 'Approved for hiring',
      offerLetterGenerated: false,
      staffRecordCreated: false,
      employeeProfileCreated: false,
      createdBy: 'Current User'
    });

    // ✅ AUTO-CREATE STAFF DICTIONARY RECORD
    const staffRecord = staffService.create({
      fullName: selectedCandidate.fullName,
      gender: selectedCandidate.gender,
      nationality: selectedCandidate.nationality,
      position: vacancy.positionTitle,
      department: vacancy.department,
      projects: [],
      contractType: formData.contractType as any,
      grade: formData.proposedGrade,
      step: formData.proposedStep,
      status: 'active', // New hire starts as Active
      hireDate: formData.startDate,
      contractStartDate: formData.startDate,
      basicSalary: formData.proposedSalary,
      housingAllowance: 0,
      transportAllowance: 0,
      representationAllowance: 0,
      otherAllowances: 0,
      socialSecurityRate: 7,
      healthInsuranceRate: 5,
      taxRate: 15,
      currency: 'USD',
      dateOfBirth: selectedCandidate.dateOfBirth,
      phone: selectedCandidate.phone,
      email: selectedCandidate.email,
      address: selectedCandidate.currentLocation
    });

    // Update hiring decision with created IDs
    hiringDecisionService.update(decision.id, {
      staffRecordCreated: true,
      staffRecordId: staffRecord.staffId,
      employeeProfileCreated: true
    });

    // Update candidate status
    candidateService.updateStatus(selectedCandidate.id, 'Hired');

    // Close form and reload
    setShowDecisionForm(false);
    setSelectedCandidate(null);
    loadInterviewedCandidates();

    alert(`✅ HIRED!\n\nStaff Record Created: ${staffRecord.staffId}\nEmployee Profile Created\n\nCandidate: ${selectedCandidate.fullName}\nPosition: ${vacancy.positionTitle}`);
  };

  const handleReject = () => {
    if (!selectedCandidate) return;

    hiringDecisionService.create({
      candidateId: selectedCandidate.id,
      vacancyId: selectedVacancy,
      proposedGrade: formData.proposedGrade,
      proposedStep: formData.proposedStep,
      proposedSalary: formData.proposedSalary,
      contractType: formData.contractType,
      startDate: formData.startDate,
      decisionStatus: 'Rejected',
      approvedBy: 'Current User',
      decisionDate: new Date().toISOString(),
      decisionNotes: 'Not selected for hiring',
      offerLetterGenerated: false,
      staffRecordCreated: false,
      employeeProfileCreated: false,
      createdBy: 'Current User'
    });

    candidateService.updateStatus(selectedCandidate.id, 'Rejected');

    setShowDecisionForm(false);
    setSelectedCandidate(null);
    loadInterviewedCandidates();
  };

  const getCandidateInterviews = (candidateId: string): Interview[] => {
    return interviewsMap[candidateId] || [];
  };

  const getAverageInterviewScore = (candidateId: string): number => {
    const interviews = getCandidateInterviews(candidateId);
    const scored = interviews.filter(i => i.overallScore !== undefined);
    if (scored.length === 0) return 0;
    const sum = scored.reduce((acc, i) => acc + (i.overallScore || 0), 0);
    return sum / scored.length;
  };

  const t = {
    title: language === 'en' ? 'Hiring Decision' : 'قرار التوظيف',
    selectVacancy: language === 'en' ? 'Select Vacancy' : 'اختر الشاغر',
    interviewedCandidates: language === 'en' ? 'Interviewed Candidates' : 'المرشحون المُقابَلون',
    
    candidateRef: language === 'en' ? 'Ref' : 'المرجع',
    name: language === 'en' ? 'Name' : 'الاسم',
    email: language === 'en' ? 'Email' : 'البريد',
    appScore: language === 'en' ? 'App Score' : 'نتيجة التقديم',
    intScore: language === 'en' ? 'Interview Score' : 'نتيجة المقابلة',
    status: language === 'en' ? 'Status' : 'الحالة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    makeDecision: language === 'en' ? 'Make Decision' : 'اتخاذ القرار',
    hiringDecision: language === 'en' ? 'Hiring Decision' : 'قرار التوظيف',
    proposedTerms: language === 'en' ? 'Proposed Terms' : 'الشروط المقترحة',
    
    grade: language === 'en' ? 'Grade' : 'الدرجة',
    step: language === 'en' ? 'Step' : 'الخطوة',
    salary: language === 'en' ? 'Proposed Salary' : 'الراتب المقترح',
    contractType: language === 'en' ? 'Contract Type' : 'نوع العقد',
    startDate: language === 'en' ? 'Start Date' : 'تاريخ البدء',
    
    fixedTerm: language === 'en' ? 'Fixed-Term' : 'محدد المدة',
    shortTerm: language === 'en' ? 'Short-Term' : 'قصير الأجل',
    consultancy: language === 'en' ? 'Consultancy' : 'استشارة',
    volunteer: language === 'en' ? 'Volunteer' : 'متطوع',
    
    approve: language === 'en' ? 'Approve & Hire' : 'الموافقة والتوظيف',
    reject: language === 'en' ? 'Reject' : 'رفض',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    
    autoCreate: language === 'en' ? 'Upon approval, system will automatically create:' : 'عند الموافقة، سينشئ النظام تلقائيًا:',
    staffRecord: language === 'en' ? 'Staff Dictionary Record' : 'سجل قاموس الموظفين',
    employeeProfile: language === 'en' ? 'Employee Profile' : 'ملف الموظف',
    
    noCandidates: language === 'en' ? 'No interviewed candidates' : 'لا يوجد مرشحون تمت مقابلتهم'
  };

  const selectedVacancyData = vacancies.find(v => v.id === selectedVacancy);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
      </div>

      {/* Vacancy Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.selectVacancy}
        </label>
        <select
          value={selectedVacancy}
          onChange={(e) => setSelectedVacancy(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {vacancies.map(vacancy => (
            <option key={vacancy.id} value={vacancy.id}>
              {vacancy.vacancyRef} - {vacancy.positionTitle}
            </option>
          ))}
        </select>
      </div>

      {/* Interviewed Candidates */}
      {selectedVacancy && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">{t.interviewedCandidates}</h3>
          </div>

          {interviewedCandidates.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>{t.noCandidates}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.candidateRef}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.name}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.email}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.appScore}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.intScore}
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
                  {interviewedCandidates.map((candidate) => {
                    const avgIntScore = getAverageInterviewScore(candidate.id);
                    return (
                      <tr key={candidate.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">
                          {candidate.candidateRef}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {candidate.fullName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {candidate.email}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-green-600 font-bold">
                            {candidate.totalScore.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-blue-600 font-bold">
                            {avgIntScore > 0 ? `${avgIntScore.toFixed(1)}%` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {candidate.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleDecisionClick(candidate)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-xs"
                          >
                            <UserCheck className="w-4 h-4" />
                            {t.makeDecision}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Hiring Decision Modal */}
      {showDecisionForm && selectedCandidate && selectedVacancyData && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-green-600 text-white px-6 py-4">
              <h3 className="text-xl font-bold">{t.hiringDecision}</h3>
              <p className="text-sm text-green-100">{selectedCandidate.fullName} - {selectedVacancyData.positionTitle}</p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">{t.autoCreate}</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{t.staffRecord}</li>
                    <li>{t.employeeProfile}</li>
                  </ul>
                </div>
              </div>

              {/* Proposed Terms */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">{t.proposedTerms}</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.grade} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.proposedGrade}
                      onChange={(e) => setFormData(prev => ({ ...prev, proposedGrade: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="G1">G1</option>
                      <option value="G2">G2</option>
                      <option value="G3">G3</option>
                      <option value="G4">G4</option>
                      <option value="G5">G5</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.step}
                    </label>
                    <select
                      value={formData.proposedStep}
                      onChange={(e) => setFormData(prev => ({ ...prev, proposedStep: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Step 1">Step 1</option>
                      <option value="Step 2">Step 2</option>
                      <option value="Step 3">Step 3</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.salary} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.proposedSalary}
                      onChange={(e) => setFormData(prev => ({ ...prev, proposedSalary: parseFloat(e.target.value) || 0 }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.proposedSalary ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter salary"
                    />
                    {errors.proposedSalary && (
                      <p className="text-xs text-red-500 mt-1">{errors.proposedSalary}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.contractType} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.contractType}
                      onChange={(e) => setFormData(prev => ({ ...prev, contractType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Fixed-Term">{t.fixedTerm}</option>
                      <option value="Short-Term">{t.shortTerm}</option>
                      <option value="Consultancy">{t.consultancy}</option>
                      <option value="Volunteer">{t.volunteer}</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.startDate} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.startDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.startDate && (
                      <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDecisionForm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {t.reject}
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t.approve}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}