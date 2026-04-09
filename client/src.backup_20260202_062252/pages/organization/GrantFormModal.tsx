import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

// Project interface (matching the one in ProjectsManagementDashboard)
interface Project {
  id: string;
  title: string;
  code: string;
  projectName?: string;
  projectCode?: string;
}

interface Grant {
  id: string;
  grantNumber: string;
  grantName: string;
  donorName: string;
  donorReference: string;
  currency: string;
  grantAmount: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Completed' | 'Pending' | 'On Hold';
  reportingStatus: 'On track' | 'Due' | 'Overdue';
  projectId: string;
  projectName: string;
  sector: string;
  responsible: string;
  description: string;
  reportingFrequency: string;
  coFunding: boolean;
  coFunderName: string;
  createdAt: string;
  updatedAt: string;
}

interface GrantFormModalProps {
  grant: Partial<Grant> | null;
  isRTL: boolean;
  onClose: () => void;
  onSave: (grant: Omit<Grant, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function GrantFormModal({ grant, isRTL, onClose, onSave }: GrantFormModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    grantNumber: grant?.grantNumber || '',
    grantName: grant?.grantName || '',
    donorName: grant?.donorName || '',
    donorReference: grant?.donorReference || '',
    currency: grant?.currency || 'USD',
    grantAmount: grant?.grantAmount || 0,
    startDate: grant?.startDate || '',
    endDate: grant?.endDate || '',
    status: grant?.status || 'Pending' as const,
    reportingStatus: grant?.reportingStatus || 'On track' as const,
    projectId: grant?.projectId || '',
    projectName: grant?.projectName || '',
    sector: grant?.sector || '',
    responsible: grant?.responsible || '',
    description: grant?.description || '',
    reportingFrequency: grant?.reportingFrequency || 'Quarterly',
    coFunding: grant?.coFunding || false,
    coFunderName: grant?.coFunderName || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🔥 CRITICAL: Load projects from localStorage on mount
  useEffect(() => {
    const projectsData = localStorage.getItem('pms_projects');
    if (projectsData) {
      try {
        const parsedProjects = JSON.parse(projectsData);
        setProjects(parsedProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.grantNumber.trim()) newErrors.grantNumber = isRTL ? 'رقم المنحة مطلوب' : 'Grant number is required';
    if (!formData.grantName.trim()) newErrors.grantName = isRTL ? 'اسم المنحة مطلوب' : 'Grant name is required';
    if (!formData.donorName.trim()) newErrors.donorName = isRTL ? 'اسم المانح مطلوب' : 'Donor name is required';
    if (!formData.projectName.trim()) newErrors.projectName = isRTL ? 'اسم المشروع مطلوب' : 'Project name is required';
    if (formData.grantAmount <= 0) newErrors.grantAmount = isRTL ? 'المبلغ يجب أن يكون أكبر من 0' : 'Amount must be greater than 0';
    if (!formData.startDate) newErrors.startDate = isRTL ? 'تاريخ البداية مطلوب' : 'Start date is required';
    if (!formData.endDate) newErrors.endDate = isRTL ? 'تاريخ النهاية مطلوب' : 'End date is required';
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = isRTL ? 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' : 'End date must be after start date';
    }
    if (!formData.responsible.trim()) newErrors.responsible = isRTL ? 'المسؤول مطلوب' : 'Responsible person is required';
    if (!formData.sector.trim()) newErrors.sector = isRTL ? 'القطاع مطلوب' : 'Sector is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-primary text-white p-6 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className="text-xl font-bold">
            {grant 
              ? (isRTL ? 'تحديث المنحة' : 'Update Grant')
              : (isRTL ? 'إضافة منحة جديدة' : 'Add New Grant')
            }
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Grant Identification */}
            <div>
              <h3 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'تحديد المنحة' : 'Grant Identification'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'رقم المنحة *' : 'Grant Number *'}
                  </label>
                  <input
                    type="text"
                    value={formData.grantNumber}
                    onChange={(e) => setFormData({ ...formData, grantNumber: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.grantNumber ? 'border-red-500' : 'border-gray-300'} ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder={isRTL ? 'مثال: GR-2024-001' : 'e.g., GR-2024-001'}
                  />
                  {errors.grantNumber && <p className="text-xs text-red-600 mt-1">{errors.grantNumber}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'مرجع المانح' : 'Donor Reference'}
                  </label>
                  <input
                    type="text"
                    value={formData.donorReference}
                    onChange={(e) => setFormData({ ...formData, donorReference: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder={isRTL ? 'مثال: DON-REF-001' : 'e.g., DON-REF-001'}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'اسم المنحة *' : 'Grant Name *'}
                </label>
                <input
                  type="text"
                  value={formData.grantName}
                  onChange={(e) => setFormData({ ...formData, grantName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.grantName ? 'border-red-500' : 'border-gray-300'} ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder={isRTL ? 'اسم المنحة' : 'Enter grant name'}
                />
                {errors.grantName && <p className="text-xs text-red-600 mt-1">{errors.grantName}</p>}
              </div>

              <div className="mt-4">
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder={isRTL ? 'وصف المنحة...' : 'Grant description...'}
                />
              </div>
            </div>

            {/* Donor & Project */}
            <div>
              <h3 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'المانح والمشروع' : 'Donor & Project'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'اسم المانح *' : 'Donor Name *'}
                  </label>
                  <input
                    type="text"
                    value={formData.donorName}
                    onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.donorName ? 'border-red-500' : 'border-gray-300'} ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder={isRTL ? 'مثال: الاتحاد الأوروبي' : 'e.g., European Union'}
                  />
                  {errors.donorName && <p className="text-xs text-red-600 mt-1">{errors.donorName}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'اسم المشروع *' : 'Project Name *'}
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => {
                      const selectedProject = projects.find(p => p.id === e.target.value);
                      if (selectedProject) {
                        setFormData({ 
                          ...formData, 
                          projectId: selectedProject.id,
                          projectName: selectedProject.title || selectedProject.projectName || ''
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.projectName ? 'border-red-500' : 'border-gray-300'} ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="">{isRTL ? '-- اختر المشروع --' : '-- Select Project --'}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code ? `${project.code} - ` : ''}{project.title || project.projectName}
                      </option>
                    ))}
                  </select>
                  {errors.projectName && <p className="text-xs text-red-600 mt-1">{errors.projectName}</p>}
                  {projects.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {isRTL ? '⚠️ لا توجد مشاريع متاحة. يرجى إنشاء مشروع أولاً.' : '⚠️ No projects available. Please create a project first.'}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'القطاع / الموضوع *' : 'Sector / Theme *'}
                  </label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.sector ? 'border-red-500' : 'border-gray-300'} ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder={isRTL ? 'مثال: التعليم' : 'e.g., Education'}
                  />
                  {errors.sector && <p className="text-xs text-red-600 mt-1">{errors.sector}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'الشخص المسؤول *' : 'Responsible Person *'}
                  </label>
                  <input
                    type="text"
                    value={formData.responsible}
                    onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.responsible ? 'border-red-500' : 'border-gray-300'} ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder={isRTL ? 'اسم المسؤول' : 'Name of responsible person'}
                  />
                  {errors.responsible && <p className="text-xs text-red-600 mt-1">{errors.responsible}</p>}
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div>
              <h3 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'التفاصيل المالية' : 'Financial Details'}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'مبلغ المنحة *' : 'Grant Amount *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.grantAmount}
                    onChange={(e) => setFormData({ ...formData, grantAmount: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.grantAmount ? 'border-red-500' : 'border-gray-300'}`}
                    dir="ltr"
                  />
                  {errors.grantAmount && <p className="text-xs text-red-600 mt-1">{errors.grantAmount}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'العملة *' : 'Currency *'}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'التمويل المشترك' : 'Co-funding'}
                  </label>
                  <select
                    value={formData.coFunding ? 'yes' : 'no'}
                    onChange={(e) => setFormData({ ...formData, coFunding: e.target.value === 'yes' })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="no">{isRTL ? 'لا' : 'No'}</option>
                    <option value="yes">{isRTL ? 'نعم' : 'Yes'}</option>
                  </select>
                </div>

                {formData.coFunding && (
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {isRTL ? 'اسم الممول المشارك' : 'Co-funder Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.coFunderName}
                      onChange={(e) => setFormData({ ...formData, coFunderName: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder={isRTL ? 'اسم الممول' : 'Co-funder name'}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Dates & Reporting */}
            <div>
              <h3 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'التواريخ والتقارير' : 'Dates & Reporting'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'تاريخ البداية *' : 'Start Date *'}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.startDate ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.startDate && <p className="text-xs text-red-600 mt-1">{errors.startDate}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'تاريخ النهاية *' : 'End Date *'}
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.endDate ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.endDate && <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'تكرار التقارير' : 'Reporting Frequency'}
                  </label>
                  <select
                    value={formData.reportingFrequency}
                    onChange={(e) => setFormData({ ...formData, reportingFrequency: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Monthly">{isRTL ? 'شهري' : 'Monthly'}</option>
                    <option value="Quarterly">{isRTL ? 'ربع سنوي' : 'Quarterly'}</option>
                    <option value="Bi-annual">{isRTL ? 'نصف سنوي' : 'Bi-annual'}</option>
                    <option value="Annual">{isRTL ? 'سنوي' : 'Annual'}</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'حالة التقارير' : 'Reporting Status'}
                  </label>
                  <select
                    value={formData.reportingStatus}
                    onChange={(e) => setFormData({ ...formData, reportingStatus: e.target.value as typeof formData.reportingStatus })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="On track">{isRTL ? 'على المسار الصحيح' : 'On track'}</option>
                    <option value="Due">{isRTL ? 'مستحق' : 'Due'}</option>
                    <option value="Overdue">{isRTL ? 'متأخر' : 'Overdue'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'الحالة' : 'Status'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'حالة المنحة' : 'Grant Status'}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
                    <option value="Active">{isRTL ? 'نشط' : 'Active'}</option>
                    <option value="On Hold">{isRTL ? 'معلق' : 'On Hold'}</option>
                    <option value="Completed">{isRTL ? 'مكتمل' : 'Completed'}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className={`flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-md hover:bg-primary/90 font-medium transition-colors"
            >
              {grant 
                ? (isRTL ? 'تحديث المنحة' : 'Update Grant')
                : (isRTL ? 'إنشاء المنحة' : 'Create Grant')
              }
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 font-medium transition-colors"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}