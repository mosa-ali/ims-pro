/**
 * ============================================================================
 * ADD STAFF MODAL - Create New Staff Member
 * ============================================================================
 * UPDATED: 2025-01-23 - Modal overlay fixed to soft gray (bg-gray-900 bg-opacity-30)
 */

import { useState } from 'react';
import { X, Save, User, Briefcase, FolderKanban, CreditCard } from 'lucide-react';
import { staffService } from '@/app/services/hrService';
import { salaryScaleService } from '@/app/services/salaryScaleService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';

interface AddStaffModalProps {
  language: 'en' | 'ar';
  isRTL: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AddStaffModal({ language, isRTL, onClose, onSave }: AddStaffModalProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // Load grades from salary scale service
  const grades = salaryScaleService.getAllGrades();
  
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    nationality: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    position: '',
    department: '',
    grade: grades.length > 0 ? grades[0].grade : '',
    step: grades.length > 0 ? grades[0].steps[0] : 'Step 1',
    salaryRange: grades.length > 0 ? `${grades[0].minSalary} - ${grades[0].maxSalary}` : '',
    contractType: 'Fixed-Term' as any,
    status: 'active' as 'active' | 'archived' | 'exited', // ✅ CANONICAL STATUS
    hireDate: new Date().toISOString().split('T')[0],
    contractStartDate: new Date().toISOString().split('T')[0],
    contractEndDate: '',
    basicSalary: 0,
    currency: 'USD',
    housingAllowance: 0,
    transportAllowance: 0,
    representationAllowance: 0,
    otherAllowances: 0,
    socialSecurityRate: 7,
    healthInsuranceRate: 5,
    taxRate: 15,
    projects: [''] as string[],
    bankName: '',
    accountNumber: '',
    iban: ''
  });

  // Get selected grade info
  const selectedGrade = grades.find(g => g.grade === formData.grade);

  // Handle grade change
  const handleGradeChange = (newGrade: string) => {
    const grade = grades.find(g => g.grade === newGrade);
    setFormData({
      ...formData,
      grade: newGrade,
      step: grade?.steps[0] || 'Step 1',
      salaryRange: grade ? `${grade.minSalary} - ${grade.maxSalary}` : ''
    });
  };

  const t = {
    // Modal title
    addStaff: language === 'en' ? 'Add New Staff Member' : 'إضافة موظف جديد',
    
    // Tabs
    personalInfo: language === 'en' ? 'Personal Information' : 'المعلومات الشخصية',
    employmentInfo: language === 'en' ? 'Employment Information' : 'معلومات التوظيف',
    projectAssignment: language === 'en' ? 'Project Assignment' : 'تكليف المشاريع',
    bankPayment: language === 'en' ? 'Bank & Payment' : 'البنك والدفع',
    
    // Personal Info fields
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    gender: language === 'en' ? 'Gender' : 'الجنس',
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    other: language === 'en' ? 'Other' : 'آخر',
    nationality: language === 'en' ? 'Nationality' : 'الجنسية',
    dateOfBirth: language === 'en' ? 'Date of Birth' : 'تاريخ الميلاد',
    phone: language === 'en' ? 'Phone Number' : 'رقم الهاتف',
    email: language === 'en' ? 'Email Address' : 'البريد الإلكتروني',
    
    // Employment Info fields
    position: language === 'en' ? 'Position' : 'المنصب',
    department: language === 'en' ? 'Department' : 'القسم',
    grade: language === 'en' ? 'Grade' : 'الدرجة',
    step: language === 'en' ? 'Step' : 'المستوى',
    salaryRange: language === 'en' ? 'Salary Range' : 'نطاق الراتب',
    contractType: language === 'en' ? 'Contract Type' : 'نوع العقد',
    fixedTerm: language === 'en' ? 'Fixed-Term' : 'محدد المدة',
    shortTerm: language === 'en' ? 'Short-Term' : 'قصير المدة',
    consultancy: language === 'en' ? 'Consultancy' : 'استشاري',
    volunteer: language === 'en' ? 'Volunteer' : 'متطوع',
    dailyWorker: language === 'en' ? 'Daily Worker' : 'عامل يومي',
    status: language === 'en' ? 'Status' : 'الحالة',
    // ✅ CANONICAL THREE-STATUS MODEL (LOCKED)
    active: language === 'en' ? 'Active' : 'نشط',
    archived: language === 'en' ? 'Archived' : 'مؤرشف',
    exited: language === 'en' ? 'Exited' : 'خارج الخدمة',
    hireDate: language === 'en' ? 'Hire Date' : 'تاريخ التعيين',
    contractStartDate: language === 'en' ? 'Contract Start Date' : 'تاريخ بدء العقد',
    contractEndDate: language === 'en' ? 'Contract End Date' : 'تاريخ انتهاء العقد',
    
    // Salary fields
    basicSalary: language === 'en' ? 'Basic Salary' : 'الراتب الأساسي',
    housingAllowance: language === 'en' ? 'Housing Allowance' : 'بدل السكن',
    transportAllowance: language === 'en' ? 'Transport Allowance' : 'بدل المواصلات',
    representationAllowance: language === 'en' ? 'Representation Allowance' : 'بدل المثيل',
    otherAllowances: language === 'en' ? 'Other Allowances' : 'بدلات أخرى',
    socialSecurityRate: language === 'en' ? 'Social Security Rate (%)' : 'نسبة الضمان الاجتماعي (%)',
    healthInsuranceRate: language === 'en' ? 'Health Insurance Rate (%)' : 'نسبة التأمين الصحي (%)',
    taxRate: language === 'en' ? 'Tax Rate (%)' : 'نسبة الضريبة (%)',
    currency: language === 'en' ? 'Currency' : 'العملة',
    
    // Project Assignment fields
    projects: language === 'en' ? 'Assigned Projects' : 'المشاريع المكلف بها',
    projectPlaceholder: language === 'en' ? 'e.g., ECHO-YEM-001' : 'مثال: ECHO-YEM-001',
    addProject: language === 'en' ? 'Add Project' : 'إضافة مشروع',
    
    // Bank fields
    bankName: language === 'en' ? 'Bank Name' : 'اسم البنك',
    accountNumber: language === 'en' ? 'Account Number' : 'رقم الحساب',
    iban: language === 'en' ? 'IBAN' : 'رقم الآيبان',
    
    // Buttons
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    save: language === 'en' ? 'Add Staff Member' : 'إضافة موظف',
    required: language === 'en' ? 'Please fill in all required fields' : 'يرجى ملء جميع الحقول المطلوبة'
  };

  const tabs = [
    { id: 0, label: t.personalInfo, icon: User },
    { id: 1, label: t.employmentInfo, icon: Briefcase },
    { id: 2, label: t.projectAssignment, icon: FolderKanban },
    { id: 3, label: t.bankPayment, icon: CreditCard }
  ];

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleProjectChange = (index: number, value: string) => {
    const newProjects = [...formData.projects];
    newProjects[index] = value;
    setFormData({ ...formData, projects: newProjects });
  };

  const handleAddProject = () => {
    setFormData({ ...formData, projects: [...formData.projects, ''] });
  };

  const handleRemoveProject = (index: number) => {
    const newProjects = formData.projects.filter((_, i) => i !== index);
    setFormData({ ...formData, projects: newProjects });
  };

  const handleSave = () => {
    // Validation
    if (!formData.fullName || !formData.position) {
      alert(t.required);
      return;
    }

    // Filter out empty projects
    const cleanProjects = formData.projects.filter(p => p.trim() !== '');

    // Create new staff member
    staffService.create({
      fullName: formData.fullName,
      gender: formData.gender,
      nationality: formData.nationality,
      position: formData.position,
      department: formData.department,
      grade: formData.grade || undefined,
      step: formData.step || undefined,
      projects: cleanProjects.length > 0 ? cleanProjects : ['Unassigned'],
      contractType: formData.contractType,
      status: formData.status,
      hireDate: formData.hireDate,
      contractStartDate: formData.contractStartDate,
      contractEndDate: formData.contractEndDate || undefined,
      basicSalary: formData.basicSalary,
      housingAllowance: formData.housingAllowance,
      transportAllowance: formData.transportAllowance,
      representationAllowance: formData.representationAllowance,
      otherAllowances: formData.otherAllowances,
      socialSecurityRate: formData.socialSecurityRate,
      healthInsuranceRate: formData.healthInsuranceRate,
      taxRate: formData.taxRate,
      currency: formData.currency,
      bankName: formData.bankName || undefined,
      accountNumber: formData.accountNumber || undefined,
      iban: formData.iban || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined
    });

    onSave();
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t.addStaff}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Tab 0: Personal Information */}
          {activeTab === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.fullName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Ahmed Hassan Mohamed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.gender}</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Male">{t.male}</option>
                    <option value="Female">{t.female}</option>
                    <option value="Other">{t.other}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.nationality}</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Yemen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.dateOfBirth}</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+967 xxx xxx xxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          )}

          {/* Tab 1: Employment Information */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.position} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => handleChange('position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Project Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.department}</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Programs"
                  />
                </div>
              </div>

              {/* Grade & Step */}
              <div className="mt-2 pt-2 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{language === 'en' ? 'Grade & Scale' : 'الدرجة والمستوى'}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.grade}</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => handleGradeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {grades.length > 0 ? (
                        grades.map(g => (
                          <option key={g.id} value={g.grade}>
                            {g.grade} - {g.description}
                          </option>
                        ))
                      ) : (
                        <option value="">No grades available</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.step}</label>
                    <select
                      value={formData.step}
                      onChange={(e) => handleChange('step', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={!selectedGrade}
                    >
                      {selectedGrade ? (
                        selectedGrade.steps.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))
                      ) : (
                        <option value="">Select grade first</option>
                      )}
                    </select>
                  </div>
                </div>
                {selectedGrade && (
                  <div className="mt-2 text-sm text-gray-600">
                    {t.salaryRange}: ${selectedGrade.minSalary.toLocaleString()} - ${selectedGrade.maxSalary.toLocaleString()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.contractType}</label>
                  <select
                    value={formData.contractType}
                    onChange={(e) => handleChange('contractType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Fixed-Term">{t.fixedTerm}</option>
                    <option value="Short-Term">{t.shortTerm}</option>
                    <option value="Consultancy">{t.consultancy}</option>
                    <option value="Volunteer">{t.volunteer}</option>
                    <option value="Daily Worker">{t.dailyWorker}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.status}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">{t.active}</option>
                    <option value="archived">{t.archived}</option>
                    <option value="exited">{t.exited}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.hireDate}</label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => handleChange('hireDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.contractStartDate}</label>
                  <input
                    type="date"
                    value={formData.contractStartDate}
                    onChange={(e) => handleChange('contractStartDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.contractEndDate}</label>
                  <input
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => handleChange('contractEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Salary Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-4">{language === 'en' ? 'Salary Information' : 'معلومات الراتب'}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.basicSalary}</label>
                    <input
                      type="number"
                      value={formData.basicSalary}
                      onChange={(e) => handleChange('basicSalary', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.currency}</label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => handleChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.housingAllowance}</label>
                    <input
                      type="number"
                      value={formData.housingAllowance}
                      onChange={(e) => handleChange('housingAllowance', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.transportAllowance}</label>
                    <input
                      type="number"
                      value={formData.transportAllowance}
                      onChange={(e) => handleChange('transportAllowance', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.socialSecurityRate}</label>
                    <input
                      type="number"
                      value={formData.socialSecurityRate}
                      onChange={(e) => handleChange('socialSecurityRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.healthInsuranceRate}</label>
                    <input
                      type="number"
                      value={formData.healthInsuranceRate}
                      onChange={(e) => handleChange('healthInsuranceRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.taxRate}</label>
                    <input
                      type="number"
                      value={formData.taxRate}
                      onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Project Assignment */}
          {activeTab === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.projects}</label>
                {formData.projects.map((project, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={project}
                      onChange={(e) => handleProjectChange(index, e.target.value)}
                      placeholder={t.projectPlaceholder}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleRemoveProject(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddProject}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t.addProject}
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Bank & Payment */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.bankName}</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.accountNumber}</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => handleChange('accountNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.iban}</label>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) => handleChange('iban', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center gap-3 px-6 py-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Save className="w-4 h-4" />
            <span>{t.save}</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}