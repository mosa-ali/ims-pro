/**
 * ============================================================================
 * INTERVIEW SCHEDULING
 * ============================================================================
 * 
 * Features:
 * - Schedule interviews for shortlisted candidates
 * - Select interview type and panel members
 * - Set date/time
 * - Upload evaluation forms
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { Calendar, Users, Clock, FileText, Plus, X } from 'lucide-react';
import {
 candidateService,
 vacancyService,
 interviewService
} from './recruitmentService';
import { Candidate, Vacancy, InterviewType } from './types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 language: string;
 isRTL: boolean;
}

export function InterviewScheduling({
 language, isRTL }: Props) {
 const { t } = useTranslation();
 const [vacancies, setVacancies] = useState<Vacancy[]>([]);
 const [selectedVacancy, setSelectedVacancy] = useState<string>('');
 const [shortlistedCandidates, setShortlistedCandidates] = useState<Candidate[]>([]);
 const [showScheduleForm, setShowScheduleForm] = useState(false);
 const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

 const [formData, setFormData] = useState({
 interviewDate: '',
 interviewTime: '',
 interviewType: 'Phone Screening' as InterviewType,
 panelMembers: [''],
 notes: ''
 });

 const [errors, setErrors] = useState<Record<string, string>>({});

 useEffect(() => {
 loadVacancies();
 }, []);

 useEffect(() => {
 if (selectedVacancy) {
 loadShortlistedCandidates();
 }
 }, [selectedVacancy]);

 const loadVacancies = () => {
 const data = vacancyService.getAll().filter(v => v.status === 'Open' || v.status === 'Closed');
 setVacancies(data);
 if (data.length > 0 && !selectedVacancy) {
 setSelectedVacancy(data[0].id);
 }
 };

 const loadShortlistedCandidates = () => {
 const allCandidates = candidateService.getByVacancy(selectedVacancy);
 const shortlisted = allCandidates.filter(c => 
 c.isShortlisted && c.status === 'Shortlisted'
 );
 setShortlistedCandidates(shortlisted);
 };

 const handleScheduleClick = (candidate: Candidate) => {
 setSelectedCandidate(candidate);
 setShowScheduleForm(true);
 setFormData({
 interviewDate: '',
 interviewTime: '',
 interviewType: 'Phone Screening',
 panelMembers: [''],
 notes: ''
 });
 setErrors({});
 };

 const handleAddPanelMember = () => {
 setFormData(prev => ({
 ...prev,
 panelMembers: [...prev.panelMembers, '']
 }));
 };

 const handleRemovePanelMember = (index: number) => {
 setFormData(prev => ({
 ...prev,
 panelMembers: prev.panelMembers.filter((_, i) => i !== index)
 }));
 };

 const handlePanelMemberChange = (index: number, value: string) => {
 setFormData(prev => ({
 ...prev,
 panelMembers: prev.panelMembers.map((m, i) => i === index ? value : m)
 }));
 };

 const validate = (): boolean => {
 const newErrors: Record<string, string> = {};

 if (!formData.interviewDate) newErrors.interviewDate = 'Date is required';
 if (!formData.interviewTime) newErrors.interviewTime = 'Time is required';
 if (formData.panelMembers.every(m => !m.trim())) {
 newErrors.panelMembers = 'At least one panel member is required';
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();

 if (!validate() || !selectedCandidate) return;

 const interviewDateTime = new Date(`${formData.interviewDate}T${formData.interviewTime}`);

 interviewService.create({
 candidateId: selectedCandidate.id,
 vacancyId: selectedVacancy,
 interviewDate: interviewDateTime.toISOString(),
 interviewType: formData.interviewType,
 panelMembers: formData.panelMembers.filter(m => m.trim()),
 notes: formData.notes,
 conductedBy: 'Current User' // In real app, get from auth context
 });

 // Update candidate status
 candidateService.updateStatus(selectedCandidate.id, 'Interviewed');

 setShowScheduleForm(false);
 setSelectedCandidate(null);
 loadShortlistedCandidates();
 };

 const localT = {
 title: t.hrRecruitment.interviewScheduling,
 selectVacancy: t.hrRecruitment.selectVacancy,
 shortlistedCandidates: t.hrRecruitment.shortlistedCandidates,
 
 candidateRef: t.hrRecruitment.ref,
 name: t.hrRecruitment.name,
 email: t.hrRecruitment.email1,
 score: t.hrRecruitment.score,
 status: t.hrRecruitment.status,
 schedule: t.hrRecruitment.scheduleInterview,
 
 scheduleInterview: t.hrRecruitment.scheduleInterview,
 interviewDate: t.hrRecruitment.interviewDate,
 interviewTime: t.hrRecruitment.interviewTime,
 interviewType: t.hrRecruitment.interviewType,
 panelMembers: t.hrRecruitment.panelMembers,
 addMember: t.hrRecruitment.addMember,
 notes: t.hrRecruitment.notes,
 
 phoneScreening: t.hrRecruitment.phoneScreening,
 technicalInterview: t.hrRecruitment.technicalInterview,
 panelInterview: t.hrRecruitment.panelInterview,
 finalInterview: t.hrRecruitment.finalInterview,
 
 cancel: t.hrRecruitment.cancel,
 scheduleBtn: t.hrRecruitment.schedule,
 
 noCandidates: t.hrRecruitment.noShortlistedCandidatesFound
 };

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

 {/* Shortlisted Candidates */}
 {selectedVacancy && (
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 <div className="p-4 border-b border-gray-200">
 <h3 className="text-lg font-bold text-gray-900">{t.shortlistedCandidates}</h3>
 </div>

 {shortlistedCandidates.length === 0 ? (
 <div className="p-12 text-center text-gray-500">
 <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
 <p>{t.noCandidates}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center`}>
 {t.candidateRef}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center`}>
 {t.name}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center`}>
 {t.email}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center`}>
 {t.score}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center`}>
 {t.status}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center`}>
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {shortlistedCandidates.map((candidate) => (
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
 <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
 {candidate.status}
 </span>
 </td>
 <td className="px-4 py-3 text-sm">
 <button
 onClick={() => handleScheduleClick(candidate)}
 className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-xs"
 >
 <Calendar className="w-4 h-4" />
 {t.schedule}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}

 {/* Schedule Interview Modal */}
 {showScheduleForm && selectedCandidate && (
 <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
 {/* Header */}
 <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Calendar className="w-6 h-6" />
 <div>
 <h3 className="text-xl font-bold">{t.scheduleInterview}</h3>
 <p className="text-sm text-blue-100">{selectedCandidate.fullName}</p>
 </div>
 </div>
 <button
 onClick={() => setShowScheduleForm(false)}
 className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Body */}
 <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.interviewDate} <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 value={formData.interviewDate}
 onChange={(e) => setFormData(prev => ({ ...prev, interviewDate: e.target.value }))}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ errors.interviewDate ? 'border-red-500' : 'border-gray-300' }`}
 />
 {errors.interviewDate && (
 <p className="text-xs text-red-500 mt-1">{errors.interviewDate}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.interviewTime} <span className="text-red-500">*</span>
 </label>
 <input
 type="time"
 value={formData.interviewTime}
 onChange={(e) => setFormData(prev => ({ ...prev, interviewTime: e.target.value }))}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ errors.interviewTime ? 'border-red-500' : 'border-gray-300' }`}
 />
 {errors.interviewTime && (
 <p className="text-xs text-red-500 mt-1">{errors.interviewTime}</p>
 )}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.interviewType} <span className="text-red-500">*</span>
 </label>
 <select
 value={formData.interviewType}
 onChange={(e) => setFormData(prev => ({ ...prev, interviewType: e.target.value as InterviewType }))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="Phone Screening">{t.phoneScreening}</option>
 <option value="Technical Interview">{t.technicalInterview}</option>
 <option value="Panel Interview">{t.panelInterview}</option>
 <option value="Final Interview">{t.finalInterview}</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.panelMembers} <span className="text-red-500">*</span>
 </label>
 <div className="space-y-2">
 {formData.panelMembers.map((member, index) => (
 <div key={index} className="flex items-center gap-2">
 <input
 type="text"
 value={member}
 onChange={(e) => handlePanelMemberChange(index, e.target.value)}
 placeholder={t.placeholders.enterName}
 className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 {formData.panelMembers.length > 1 && (
 <button
 type="button"
 onClick={() => handleRemovePanelMember(index)}
 className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>
 ))}
 </div>
 {errors.panelMembers && (
 <p className="text-xs text-red-500 mt-1">{errors.panelMembers}</p>
 )}
 <button
 type="button"
 onClick={handleAddPanelMember}
 className="mt-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.addMember}
 </button>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.notes}
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder={t.placeholders.additionalNotes}
 />
 </div>
 </form>

 {/* Footer */}
 <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
 <button
 type="button"
 onClick={() => setShowScheduleForm(false)}
 className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
 >
 {t.cancel}
 </button>
 <button
 onClick={handleSubmit}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
 >
 <Calendar className="w-4 h-4" />
 {t.scheduleBtn}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
