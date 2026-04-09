/**
 * ============================================================================
 * CANDIDATE LIST & MANAGEMENT
 * ============================================================================
 * 
 * Features:
 * - View all candidates by vacancy
 * - Longlist vs Shortlist views
 * - Auto-scoring display
 * - Excel export (both lists)
 * - Candidate detail modal
 * - Status management
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { 
 Users, 
 Download, 
 Eye, 
 CheckCircle,
 XCircle,
 Filter,
 FileText,
 Award
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
 candidateService, 
 vacancyService,
 candidateResponseService,
 vacancyCriteriaService,
 scoringEngine
} from './recruitmentService';
import { Candidate, Vacancy, CandidateStatus } from './types';
import { CandidateDetail } from './CandidateDetail';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 language: string;
 isRTL: boolean;
}

type ListView = 'all' | 'longlist' | 'shortlist';

export function CandidateList({
 language, isRTL }: Props) {
 const { t } = useTranslation();
 const [vacancies, setVacancies] = useState<Vacancy[]>([]);
 const [selectedVacancy, setSelectedVacancy] = useState<string>('');
 const [candidates, setCandidates] = useState<Candidate[]>([]);
 const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
 const [view, setView] = useState<ListView>('all');
 const [statusFilter, setStatusFilter] = useState<CandidateStatus | 'All'>('All');
 const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
 const [showDetail, setShowDetail] = useState(false);

 useEffect(() => {
 loadVacancies();
 }, []);

 useEffect(() => {
 if (selectedVacancy) {
 loadCandidates();
 }
 }, [selectedVacancy]);

 useEffect(() => {
 filterCandidates();
 }, [candidates, view, statusFilter]);

 const loadVacancies = () => {
 const data = vacancyService.getAll().filter(v => v.status === 'Open' || v.status === 'Closed');
 setVacancies(data);
 if (data.length > 0 && !selectedVacancy) {
 setSelectedVacancy(data[0].id);
 }
 };

 const loadCandidates = () => {
 const data = candidateService.getByVacancy(selectedVacancy);
 setCandidates(data);
 };

 const filterCandidates = () => {
 let filtered = candidates;

 // View filter (longlist/shortlist)
 if (view === 'shortlist') {
 filtered = filtered.filter(c => c.isShortlisted);
 } else if (view === 'longlist') {
 filtered = filtered.filter(c => !c.isShortlisted);
 }

 // Status filter
 if (statusFilter !== 'All') {
 filtered = filtered.filter(c => c.status === statusFilter);
 }

 setFilteredCandidates(filtered);
 };

 const handleExportExcel = (listType: 'longlist' | 'shortlist' | 'all') => {
 if (!selectedVacancy) return;

 const vacancy = vacancyService.getById(selectedVacancy);
 if (!vacancy) return;

 let exportCandidates = candidates;
 if (listType === 'shortlist') {
 exportCandidates = candidates.filter(c => c.isShortlisted);
 } else if (listType === 'longlist') {
 exportCandidates = candidates.filter(c => !c.isShortlisted);
 }

 // Get criteria for the vacancy
 const criteria = vacancyCriteriaService.getByVacancy(selectedVacancy);

 // Prepare data for Excel
 const excelData = exportCandidates.map(candidate => {
 const responses = candidateResponseService.getByCandidate(candidate.id);
 
 const row: any = {
 'Candidate ID': candidate.candidateRef,
 'Full Name': candidate.fullName,
 'Email': candidate.email,
 'Phone': candidate.phone,
 'Nationality': candidate.nationality,
 'Education': candidate.educationLevel,
 'Field of Study': candidate.fieldOfStudy,
 'Years of Experience': candidate.yearsOfExperience,
 'Current Location': candidate.currentLocation,
 'Application Date': new Date(candidate.appliedAt).toLocaleDateString(),
 'Total Score': `${candidate.totalScore.toFixed(1)}%`,
 'Status': candidate.status,
 'Shortlisted': candidate.isShortlisted ? 'Yes' : 'No'
 };

 // Add criterion scores
 criteria.forEach(criterion => {
 const response = responses.find(r => r.criteriaId === criterion.id);
 if (response) {
 row[`${criterion.criteriaName} (Score)`] = `${response.score.toFixed(1)}%`;
 row[`${criterion.criteriaName} (Response)`] = formatResponse(response.response, criterion.criteriaType);
 }
 });

 return row;
 });

 // Create workbook
 const ws = XLSX.utils.json_to_sheet(excelData);
 const wb = XLSX.utils.book_new();
 
 // Set column widths
 const colWidths = [
 { wch: 15 }, // Candidate ID
 { wch: 25 }, // Full Name
 { wch: 30 }, // Email
 { wch: 15 }, // Phone
 { wch: 15 }, // Nationality
 { wch: 20 }, // Education
 { wch: 20 }, // Field of Study
 { wch: 10 }, // Years of Experience
 { wch: 20 }, // Current Location
 { wch: 15 }, // Application Date
 { wch: 12 }, // Total Score
 { wch: 15 }, // Status
 { wch: 12 } // Shortlisted
 ];
 ws['!cols'] = colWidths;

 XLSX.utils.book_append_sheet(wb, ws, listType === 'shortlist' ? 'Shortlist' : 'Longlist');

 // Generate filename
 const timestamp = new Date().toISOString().split('T')[0];
 const filename = `${vacancy.positionTitle}_${listType}_${timestamp}.xlsx`;

 // Download
 XLSX.writeFile(wb, filename);
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

 const handleStatusChange = (candidateId: string, newStatus: CandidateStatus) => {
 candidateService.updateStatus(candidateId, newStatus);
 loadCandidates();
 };

 const getStatusBadge = (status: CandidateStatus) => {
 const styles = {
 Applied: 'bg-blue-100 text-blue-700',
 'Under Review': 'bg-yellow-100 text-yellow-700',
 Shortlisted: 'bg-green-100 text-green-700',
 Rejected: 'bg-red-100 text-red-700',
 Interviewed: 'bg-purple-100 text-purple-700',
 Offered: 'bg-indigo-100 text-indigo-700',
 Hired: 'bg-green-100 text-green-700'
 };

 return (
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
 {status}
 </span>
 );
 };

 const getScoreColor = (score: number, threshold: number) => {
 if (score >= threshold) return 'text-green-600';
 if (score >= threshold * 0.8) return 'text-yellow-600';
 return 'text-red-600';
 };

 const localT = {
 title: t.hrRecruitment.candidateManagement,
 selectVacancy: t.hrRecruitment.selectVacancy,
 all: t.hrRecruitment.allCandidates,
 longlist: t.hrRecruitment.longlist,
 shortlist: t.hrRecruitment.shortlist,
 
 exportLonglist: t.hrRecruitment.exportLonglist,
 exportShortlist: t.hrRecruitment.exportShortlist,
 exportAll: t.hrRecruitment.exportAll,
 
 candidateRef: t.hrRecruitment.ref,
 name: t.hrRecruitment.name,
 email: t.hrRecruitment.email1,
 phone: 'الهاتف',
 score: t.hrRecruitment.score,
 status: t.hrRecruitment.status,
 actions: t.hrRecruitment.actions,
 
 view: t.hrRecruitment.view,
 approve: t.hrRecruitment.approve,
 reject: t.hrRecruitment.reject,
 
 noCandidates: t.hrRecruitment.noCandidatesFound,
 selectVacancyFirst: t.hrRecruitment.pleaseSelectAVacancyToView,
 
 totalCandidates: t.hrRecruitment.total,
 shortlistedCount: t.hrRecruitment.shortlisted2,
 threshold: t.hrRecruitment.threshold
 };

 const selectedVacancyData = vacancies.find(v => v.id === selectedVacancy);
 const shortlistedCount = candidates.filter(c => c.isShortlisted).length;

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
 {vacancy.vacancyRef} - {vacancy.positionTitle} ({candidateService.getByVacancy(vacancy.id).length} candidates)
 </option>
 ))}
 </select>
 </div>

 {selectedVacancy && selectedVacancyData && (
 <>
 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-gray-600">{t.totalCandidates}</p>
 <p className="text-2xl font-bold text-gray-900">{candidates.length}</p>
 </div>
 <Users className="w-8 h-8 text-blue-600" />
 </div>
 </div>

 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-gray-600">{t.shortlistedCount}</p>
 <p className="text-2xl font-bold text-green-600">{shortlistedCount}</p>
 </div>
 <Award className="w-8 h-8 text-green-600" />
 </div>
 </div>

 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-gray-600">{t.threshold}</p>
 <p className="text-2xl font-bold text-gray-900">{selectedVacancyData.shortlistThreshold}%</p>
 </div>
 <CheckCircle className="w-8 h-8 text-gray-600" />
 </div>
 </div>
 </div>

 {/* Filters & Actions */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
 <div className="flex flex-wrap items-center justify-between gap-4">
 {/* View Toggle */}
 <div className="flex items-center gap-2">
 <button
 onClick={() => setView('all')}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ view === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' }`}
 >
 {t.all} ({candidates.length})
 </button>
 <button
 onClick={() => setView('longlist')}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ view === 'longlist' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' }`}
 >
 {t.longlist} ({candidates.length - shortlistedCount})
 </button>
 <button
 onClick={() => setView('shortlist')}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ view === 'shortlist' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' }`}
 >
 {t.shortlist} ({shortlistedCount})
 </button>
 </div>

 {/* Export Buttons */}
 <div className="flex items-center gap-2">
 <button
 onClick={() => handleExportExcel('all')}
 className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
 >
 <Download className="w-4 h-4" />
 {t.exportAll}
 </button>
 <button
 onClick={() => handleExportExcel('longlist')}
 className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
 >
 <Download className="w-4 h-4" />
 {t.exportLonglist}
 </button>
 <button
 onClick={() => handleExportExcel('shortlist')}
 className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
 disabled={shortlistedCount === 0}
 >
 <Download className="w-4 h-4" />
 {t.exportShortlist}
 </button>
 </div>
 </div>
 </div>

 {/* Candidates Table */}
 {filteredCandidates.length === 0 ? (
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
 <div className="text-center text-gray-500">
 <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
 <p className="text-lg font-medium">{t.noCandidates}</p>
 </div>
 </div>
 ) : (
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>
 {t.candidateRef}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>
 {t.name}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>
 {t.email}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>
 {t.phone}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>
 {t.score}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>
 {t.status}
 </th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>
 {t.actions}
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {filteredCandidates.map((candidate) => (
 <tr key={candidate.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-mono text-gray-900">
 {candidate.candidateRef}
 </td>
 <td className="px-4 py-3 text-sm text-gray-900 font-medium">
 <div>
 {candidate.fullName}
 {candidate.isShortlisted && (
 <span className="ms-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
 ⭐ {t.hrRecruitment.shortlisted3}
 </span>
 )}
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-gray-600">
 {candidate.email}
 </td>
 <td className="px-4 py-3 text-sm text-gray-600">
 {candidate.phone}
 </td>
 <td className="px-4 py-3 text-sm">
 <div className="flex items-center gap-2">
 <span className={`text-lg font-bold ${getScoreColor(candidate.totalScore, selectedVacancyData.shortlistThreshold)}`}>
 {candidate.totalScore.toFixed(1)}%
 </span>
 </div>
 </td>
 <td className="px-4 py-3 text-sm">
 {getStatusBadge(candidate.status)}
 </td>
 <td className="px-4 py-3 text-sm">
 <div className="flex items-center gap-2">
 <button
 onClick={() => {
 setSelectedCandidate(candidate);
 setShowDetail(true);
 }}
 className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
 title={t.view}
 >
 <Eye className="w-4 h-4" />
 </button>
 {candidate.status === 'Applied' && (
 <>
 <button
 onClick={() => handleStatusChange(candidate.id, 'Shortlisted')}
 className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
 title={t.approve}
 >
 <CheckCircle className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleStatusChange(candidate.id, 'Rejected')}
 className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
 title={t.reject}
 >
 <XCircle className="w-4 h-4" />
 </button>
 </>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </>
 )}

 {!selectedVacancy && (
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
 <div className="text-center text-gray-500">
 <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
 <p className="text-lg font-medium">{t.selectVacancyFirst}</p>
 </div>
 </div>
 )}

 {/* Candidate Detail Modal */}
 {showDetail && selectedCandidate && (
 <CandidateDetail
 language={language}
 isRTL={isRTL}
 candidate={selectedCandidate}
 onClose={() => {
 setShowDetail(false);
 setSelectedCandidate(null);
 }}
 onStatusChange={(newStatus) => {
 handleStatusChange(selectedCandidate.id, newStatus);
 setShowDetail(false);
 setSelectedCandidate(null);
 }}
 />
 )}
 </div>
 );
}
