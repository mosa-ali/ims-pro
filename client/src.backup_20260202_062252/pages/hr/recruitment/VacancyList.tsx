/**
 * ============================================================================
 * VACANCY LIST VIEW
 * ============================================================================
 * 
 * Display all vacancies with:
 * - Status filters
 * - Search functionality
 * - Action buttons (Edit, View, Close, Archive)
 * - Quick stats
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  Eye, 
  Lock, 
  Archive,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { vacancyService, candidateService } from './recruitmentService';
import { Vacancy, VacancyStatus } from './types';
import { VacancyForm } from './VacancyForm';
import { VacancyDetail } from './VacancyDetail';

interface Props {
  language: string;
  isRTL: boolean;
}

export function VacancyList({ language, isRTL }: Props) {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [filteredVacancies, setFilteredVacancies] = useState<Vacancy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<VacancyStatus | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | undefined>();
  const [showDetail, setShowDetail] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  useEffect(() => {
    loadVacancies();
  }, []);

  useEffect(() => {
    filterVacancies();
  }, [vacancies, searchTerm, statusFilter]);

  const loadVacancies = () => {
    const data = vacancyService.getAll();
    setVacancies(data);
  };

  const filterVacancies = () => {
    let filtered = vacancies;

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.positionTitle.toLowerCase().includes(term) ||
        v.department.toLowerCase().includes(term) ||
        v.vacancyRef.toLowerCase().includes(term) ||
        v.dutyStation.toLowerCase().includes(term)
      );
    }

    setFilteredVacancies(filtered);
  };

  const handleEdit = (vacancy: Vacancy) => {
    setSelectedVacancy(vacancy);
    setShowForm(true);
  };

  const handleView = (vacancy: Vacancy) => {
    setSelectedVacancy(vacancy);
    setShowDetail(true);
  };

  const handleCloseVacancy = (id: string) => {
    if (confirm(language === 'en' 
      ? 'Are you sure you want to close this vacancy?' 
      : 'هل أنت متأكد من إغلاق هذا الشاغر؟')) {
      vacancyService.closeVacancy(id);
      loadVacancies();
    }
  };

  const handleArchiveVacancy = (id: string) => {
    if (confirm(language === 'en' 
      ? 'Are you sure you want to archive this vacancy?' 
      : 'هل أنت متأكد من أرشفة هذا الشاغر؟')) {
      vacancyService.archiveVacancy(id);
      loadVacancies();
    }
  };

  const getApplicationUrl = (vacancyRef: string) => {
    return `${window.location.origin}/apply/${vacancyRef}`;
  };

  const copyApplicationLink = (vacancyRef: string) => {
    const url = getApplicationUrl(vacancyRef);
    navigator.clipboard.writeText(url);
    setCopiedRef(vacancyRef);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const getCandidateCount = (vacancyId: string) => {
    return candidateService.getByVacancy(vacancyId).length;
  };

  const t = {
    title: language === 'en' ? 'Vacancies' : 'الشواغر',
    search: language === 'en' ? 'Search vacancies...' : 'البحث عن الشواغر...',
    all: language === 'en' ? 'All' : 'الكل',
    draft: language === 'en' ? 'Draft' : 'مسودة',
    open: language === 'en' ? 'Open' : 'مفتوح',
    closed: language === 'en' ? 'Closed' : 'مغلق',
    archived: language === 'en' ? 'Archived' : 'مؤرشف',
    
    // Table headers
    ref: language === 'en' ? 'Reference' : 'المرجع',
    position: language === 'en' ? 'Position' : 'المنصب',
    department: language === 'en' ? 'Department' : 'القسم',
    dutyStation: language === 'en' ? 'Duty Station' : 'مكان العمل',
    openingDate: language === 'en' ? 'Opening' : 'الفتح',
    closingDate: language === 'en' ? 'Closing' : 'الإغلاق',
    candidates: language === 'en' ? 'Candidates' : 'المرشحون',
    status: language === 'en' ? 'Status' : 'الحالة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    // Actions
    newVacancy: language === 'en' ? 'New Vacancy' : 'شاغر جديد',
    edit: language === 'en' ? 'Edit' : 'تحرير',
    view: language === 'en' ? 'View' : 'عرض',
    closeVacancy: language === 'en' ? 'Close' : 'إغلاق',
    archive: language === 'en' ? 'Archive' : 'أرشفة',
    copyLink: language === 'en' ? 'Copy Application Link' : 'نسخ رابط التقديم',
    linkCopied: language === 'en' ? 'Link Copied!' : 'تم نسخ الرابط!',
    viewApplications: language === 'en' ? 'View Applications' : 'عرض التقديمات',
    
    // Empty state
    noVacancies: language === 'en' ? 'No vacancies found' : 'لا توجد شواغر',
    createFirst: language === 'en' ? 'Create your first vacancy to start recruiting' : 'أنشئ أول شاغر لبدء التوظيف'
  };

  const getStatusBadge = (status: VacancyStatus) => {
    const styles = {
      Draft: 'bg-gray-100 text-gray-700',
      Open: 'bg-green-100 text-green-700',
      Closed: 'bg-red-100 text-red-700',
      Archived: 'bg-gray-100 text-gray-500'
    };

    const labels = {
      Draft: t.draft,
      Open: t.open,
      Closed: t.closed,
      Archived: t.archived
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
        <button
          onClick={() => {
            setSelectedVacancy(undefined);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t.newVacancy}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.search}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            {(['All', 'Draft', 'Open', 'Closed', 'Archived'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'All' ? t.all : status === 'Draft' ? t.draft : status === 'Open' ? t.open : status === 'Closed' ? t.closed : t.archived}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vacancies Table */}
      {filteredVacancies.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">{t.noVacancies}</p>
            <p className="text-sm mt-1">{t.createFirst}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.ref}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.position}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.department}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.dutyStation}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.closingDate}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.candidates}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.status}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVacancies.map((vacancy) => (
                  <tr key={vacancy.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {vacancy.vacancyRef}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {vacancy.positionTitle}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {vacancy.department}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {vacancy.dutyStation}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(vacancy.closingDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {getCandidateCount(vacancy.id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(vacancy.status)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(vacancy)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title={t.view}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {vacancy.status !== 'Archived' && (
                          <button
                            onClick={() => handleEdit(vacancy)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title={t.edit}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {vacancy.status === 'Open' && (
                          <>
                            <button
                              onClick={() => copyApplicationLink(vacancy.vacancyRef)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                              title={t.copyLink}
                            >
                              {copiedRef === vacancy.vacancyRef ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCloseVacancy(vacancy.id)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg"
                              title={t.closeVacancy}
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {vacancy.status === 'Closed' && (
                          <button
                            onClick={() => handleArchiveVacancy(vacancy.id)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title={t.archive}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
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

      {/* Modals */}
      {showForm && (
        <VacancyForm
          language={language}
          isRTL={isRTL}
          vacancy={selectedVacancy}
          onClose={() => {
            setShowForm(false);
            setSelectedVacancy(undefined);
          }}
          onSave={() => {
            setShowForm(false);
            setSelectedVacancy(undefined);
            loadVacancies();
          }}
        />
      )}

      {showDetail && selectedVacancy && (
        <VacancyDetail
          language={language}
          isRTL={isRTL}
          vacancy={selectedVacancy}
          onClose={() => {
            setShowDetail(false);
            setSelectedVacancy(undefined);
          }}
        />
      )}
    </div>
  );
}
