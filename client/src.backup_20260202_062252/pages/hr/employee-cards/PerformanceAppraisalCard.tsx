/**
 * ============================================================================
 * 4. PERFORMANCE & APPRAISAL CARD
 * ============================================================================
 * 
 * FEATURES:
 * - Performance review records with ratings
 * - Review periods: Annual, Mid-Year, Probation, Ad-Hoc
 * - Rating scale: 1-5 (Needs Improvement to Exceptional)
 * - Multiple evaluation criteria
 * - Comments and action plans
 * - Bilingual support (EN/AR)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { BarChart3, Plus, Edit2, Trash2, Trophy, FileText, Star, Award, Printer } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { appraisalService, AppraisalRecord } from '@/app/services/appraisalService';
import { AppraisalFormModal } from '../modals/AppraisalFormModal';
import { PerformanceReviewModal } from '../modals/PerformanceReviewModal';
import { AppraisalPrintModal } from '../modals/AppraisalPrintModal';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PerformanceReview {
  id: string;
  staffId: string;
  reviewPeriod: string; // e.g., "2025 Annual Review"
  reviewType: 'Annual' | 'Mid-Year' | 'Probation' | 'Ad-Hoc';
  reviewDate: string;
  reviewedBy: string;
  reviewerTitle: string;
  
  // Ratings (1-5 scale)
  technicalSkills: number;
  communicationSkills: number;
  teamwork: number;
  initiative: number;
  reliability: number;
  problemSolving: number;
  
  overallRating: number; // Average of all ratings
  ratingLabel: string; // Needs Improvement, Satisfactory, Good, Very Good, Exceptional
  
  strengths: string;
  areasForImprovement: string;
  actionPlan: string;
  employeeComments?: string;
  
  nextReviewDate?: string;
  status: 'Draft' | 'Completed' | 'Acknowledged';
  
  createdAt: string;
  updatedAt: string;
}

interface Props {
  employee: StaffMember;
  language: string;
  isRTL: boolean;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEY = 'hr_performance_reviews';

// ============================================================================
// PERFORMANCE SERVICE
// ============================================================================

const performanceService = {
  getAll(): PerformanceReview[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getByStaffId(staffId: string): PerformanceReview[] {
    return this.getAll().filter(p => p.staffId === staffId);
  },

  create(record: Omit<PerformanceReview, 'id' | 'createdAt' | 'updatedAt'>): PerformanceReview {
    const records = this.getAll();
    const newRecord: PerformanceReview = {
      ...record,
      id: `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    records.push(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return newRecord;
  },

  update(id: string, data: Partial<PerformanceReview>): boolean {
    const records = this.getAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    records[index] = {
      ...records[index],
      ...data,
      id: records[index].id,
      createdAt: records[index].createdAt,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  },

  delete(id: string): boolean {
    const records = this.getAll();
    const filtered = records.filter(r => r.id !== id);
    if (filtered.length === records.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PerformanceAppraisalCard({ employee, language, isRTL }: Props) {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [appraisals, setAppraisals] = useState<AppraisalRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PerformanceReview | null>(null);
  const [selectedAppraisal, setSelectedAppraisal] = useState<AppraisalRecord | null>(null);

  useEffect(() => {
    loadReviews();
    loadAppraisals();
  }, [employee]);

  const loadReviews = () => {
    const records = performanceService.getByStaffId(employee.staffId);
    // Sort by review date descending
    records.sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
    setReviews(records);
  };

  const loadAppraisals = () => {
    const records = appraisalService.getByStaffId(employee.staffId);
    setAppraisals(records);
  };

  const handleDelete = (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    performanceService.delete(id);
    loadReviews();
  };

  const t = {
    title: language === 'en' ? 'Performance & Appraisal' : 'الأداء والتقييم',
    subtitle: language === 'en' ? 'Performance reviews and evaluations' : 'مراجعات وتقييمات الأداء',
    addReview: language === 'en' ? 'Add Review' : 'إضافة تقييم',
    addAppraisalForm: language === 'en' ? '📄 Add Appraisal Form' : '📄 إضافة نموذج تقييم',
    noReviews: language === 'en' ? 'No performance reviews yet' : 'لا توجد تقييمات أداء بعد',
    
    // Table headers
    reviewPeriod: language === 'en' ? 'Review Period' : 'فترة التقييم',
    type: language === 'en' ? 'Type' : 'النوع',
    reviewDate: language === 'en' ? 'Review Date' : 'تاريخ التقييم',
    reviewedBy: language === 'en' ? 'Reviewed By' : 'المقيّم',
    overallRating: language === 'en' ? 'Overall Rating' : 'التقييم الإجمالي',
    status: language === 'en' ? 'Status' : 'الحالة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    // Status labels
    draft: language === 'en' ? 'Draft' : 'مسودة',
    completed: language === 'en' ? 'Completed' : 'مكتمل',
    acknowledged: language === 'en' ? 'Acknowledged' : 'تم الاطلاع',
    locked: language === 'en' ? 'Locked' : 'مقفل',
    
    // Actions
    edit: language === 'en' ? 'Edit' : 'تعديل',
    delete: language === 'en' ? 'Delete' : 'حذف',
    deleteConfirm: language === 'en' ? 'Are you sure you want to delete this performance review?' : 'هل أنت متأكد من حذف تقييم الأداء هذا؟',
    
    outOf5: language === 'en' ? '/ 5' : '/ 5'
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-blue-600';
    if (rating >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Acknowledged': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Completed': return t.completed;
      case 'Acknowledged': return t.acknowledged;
      case 'Draft': return t.draft;
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length).toFixed(2)
    : '0.00';

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
            </div>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
                <Trophy className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600">
                  Avg: {averageRating} {t.outOf5}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAppraisalForm(true)}
            className={`flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Award className="w-4 h-4" />
            <span>{t.addAppraisalForm}</span>
          </button>
          <button 
            onClick={() => { setEditingRecord(null); setShowAddModal(true); }}
            className={`flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            <span>{t.addReview}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Appraisal Forms Section */}
        {appraisals.length > 0 && (
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-green-600" />
              {language === 'en' ? 'Official Appraisal Forms' : 'نماذج التقييم الرسمية'}
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {appraisals.map((appraisal) => (
                <div key={appraisal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{appraisal.reviewPeriod}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingColor(appraisal.overallRating)}`}>
                          {appraisal.overallRating.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>{language === 'en' ? 'Reviewer' : 'المُقيّم'}: {appraisal.reviewerName}</p>
                        <p>{language === 'en' ? 'Date' : 'التاريخ'}: {formatDate(appraisal.reviewDate)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAppraisal(appraisal)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Printer className="w-4 h-4" />
                      <span>{language === 'en' ? 'Print' : 'طباعة'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Performance Reviews Section */}
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t.noReviews}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.reviewPeriod}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.type}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.reviewDate}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.reviewedBy}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.overallRating}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.status}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{review.reviewPeriod}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{review.reviewType}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{formatDate(review.reviewDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>
                        <div className="font-medium">{review.reviewedBy}</div>
                        <div className="text-xs text-gray-500">{review.reviewerTitle}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`text-lg font-bold ${getRatingColor(review.overallRating)}`}>
                        {review.overallRating.toFixed(1)} {t.outOf5}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{review.ratingLabel}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(review.status)}`}>
                        {getStatusLabel(review.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setEditingRecord(review); setShowAddModal(true); }}
                          className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                          title={t.edit}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <PerformanceReviewModal
          employee={employee}
          existingReview={editingRecord || undefined}
          onClose={() => { setShowAddModal(false); setEditingRecord(null); }}
          onSave={() => { loadReviews(); setShowAddModal(false); setEditingRecord(null); }}
        />
      )}
      
      {/* Appraisal Form Modal */}
      {showAppraisalForm && (
        <AppraisalFormModal
          employee={employee}
          onClose={() => setShowAppraisalForm(false)}
          onSave={(appraisal) => {
            loadAppraisals();
            setShowAppraisalForm(false);
          }}
        />
      )}
      
      {/* Appraisal Print Modal */}
      {selectedAppraisal && (
        <AppraisalPrintModal
          appraisal={selectedAppraisal}
          onClose={() => setSelectedAppraisal(null)}
        />
      )}
    </div>
  );
}