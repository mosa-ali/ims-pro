/**
 * ============================================================================
 * VIEW STAFF MODAL - Read-Only Display (Non-Editable)
 * ============================================================================
 */

import { useState } from 'react';
import { X, User, Briefcase, FolderKanban, CreditCard, FileText } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';

interface ViewStaffModalProps {
  staffMember: StaffMember;
  language: 'en' | 'ar';
  isRTL: boolean;
  onClose: () => void;
}

export function ViewStaffModal({ staffMember, language, isRTL, onClose }: ViewStaffModalProps) {
  const [activeTab, setActiveTab] = useState<number>(0);

  const t = {
    // Modal title
    viewStaff: language === 'en' ? 'Staff Profile' : 'ملف الموظف',
    
    // Tabs
    personalInfo: language === 'en' ? 'Personal Information' : 'المعلومات الشخصية',
    employmentInfo: language === 'en' ? 'Employment Information' : 'معلومات التوظيف',
    projectAssignment: language === 'en' ? 'Project Assignment' : 'تكليف المشاريع',
    bankPayment: language === 'en' ? 'Bank & Payment' : 'البنك والدفع',
    documents: language === 'en' ? 'Documents' : 'المستندات',
    
    // Personal Info fields
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    gender: language === 'en' ? 'Gender' : 'الجنس',
    nationality: language === 'en' ? 'Nationality' : 'الجنسية',
    dateOfBirth: language === 'en' ? 'Date of Birth' : 'تاريخ الميلاد',
    phone: language === 'en' ? 'Phone Number' : 'رقم الهاتف',
    email: language === 'en' ? 'Email Address' : 'البريد الإلكتروني',
    
    // Employment Info fields
    position: language === 'en' ? 'Position' : 'المنصب',
    department: language === 'en' ? 'Department' : 'القسم',
    contractType: language === 'en' ? 'Contract Type' : 'نوع العقد',
    status: language === 'en' ? 'Status' : 'الحالة',
    hireDate: language === 'en' ? 'Hire Date' : 'تاريخ التعيين',
    contractStartDate: language === 'en' ? 'Contract Start Date' : 'تاريخ بدء العقد',
    contractEndDate: language === 'en' ? 'Contract End Date' : 'تاريخ انتهاء العقد',
    
    // Salary fields
    salaryInfo: language === 'en' ? 'Salary Information' : 'معلومات الراتب',
    basicSalary: language === 'en' ? 'Basic Salary' : 'الراتب الأساسي',
    housingAllowance: language === 'en' ? 'Housing Allowance' : 'بدل السكن',
    transportAllowance: language === 'en' ? 'Transport Allowance' : 'بدل الواصات',
    representationAllowance: language === 'en' ? 'Representation Allowance' : 'بدل التمثيل',
    otherAllowances: language === 'en' ? 'Other Allowances' : 'بدلات أخرى',
    socialSecurityRate: language === 'en' ? 'Social Security Rate' : 'نسبة الضمان الاجتماعي',
    healthInsuranceRate: language === 'en' ? 'Health Insurance Rate' : 'نسبة التأمين الصحي',
    taxRate: language === 'en' ? 'Tax Rate' : 'نسبة الضريبة',
    currency: language === 'en' ? 'Currency' : 'العملة',
    
    // Project Assignment fields
    projects: language === 'en' ? 'Assigned Projects' : 'المشاريع المكلف بها',
    noProjects: language === 'en' ? 'No projects assigned' : 'لا توجد مشاريع',
    
    // Bank fields
    bankName: language === 'en' ? 'Bank Name' : 'اسم البنك',
    accountNumber: language === 'en' ? 'Account Number' : 'رقم الحساب',
    iban: language === 'en' ? 'IBAN' : 'رقم الآيبان',
    
    // Documents
    documentsNote: language === 'en' 
      ? 'Document management will be available in the next update.' 
      : 'إدارة المستندات ستكون متاحة في التحديث القادم.',
    
    // Buttons
    close: language === 'en' ? 'Close' : 'إغلاق',
    notAvailable: language === 'en' ? 'N/A' : 'غير متاح'
  };

  const tabs = [
    { id: 0, label: t.personalInfo, icon: User },
    { id: 1, label: t.employmentInfo, icon: Briefcase },
    { id: 2, label: t.projectAssignment, icon: FolderKanban },
    { id: 3, label: t.bankPayment, icon: CreditCard },
    { id: 4, label: t.documents, icon: FileText }
  ];

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return t.notAvailable;
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en').format(amount);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-gray-50 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-lg">
          <h2 className="text-xl font-bold text-gray-900">{t.viewStaff}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto bg-white">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.staffId}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono">
                    {staffMember.staffId}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.fullName}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {staffMember.fullName}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.gender}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {staffMember.gender}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.nationality}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {staffMember.nationality}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.dateOfBirth}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {formatDate(staffMember.dateOfBirth)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {staffMember.phone || t.notAvailable}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {staffMember.email || t.notAvailable}
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Employment Information */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.position}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {staffMember.position}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.department}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {staffMember.department}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.contractType}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {staffMember.contractType}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.status}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      staffMember.status === 'active' ? 'bg-green-100 text-green-700' :
                      staffMember.status === 'leave' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {staffMember.status.charAt(0).toUpperCase() + staffMember.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.hireDate}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {formatDate(staffMember.hireDate)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.contractStartDate}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {formatDate(staffMember.contractStartDate)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.contractEndDate}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {formatDate(staffMember.contractEndDate)}
                  </div>
                </div>
              </div>

              {/* Salary Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-4">{t.salaryInfo}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.basicSalary}</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {formatCurrency(staffMember.basicSalary)} {staffMember.currency}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.currency}</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {staffMember.currency}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.housingAllowance}</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {formatCurrency(staffMember.housingAllowance)} {staffMember.currency}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.transportAllowance}</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {formatCurrency(staffMember.transportAllowance)} {staffMember.currency}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.representationAllowance}</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {formatCurrency(staffMember.representationAllowance)} {staffMember.currency}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.otherAllowances}</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {formatCurrency(staffMember.otherAllowances)} {staffMember.currency}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.socialSecurityRate}</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {staffMember.socialSecurityRate}%
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.healthInsuranceRate}</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {staffMember.healthInsuranceRate}%
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.taxRate}</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {staffMember.taxRate}%
                    </div>
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
                {staffMember.projects.length === 0 ? (
                  <div className="px-3 py-8 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
                    {t.noProjects}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {staffMember.projects.map((project, index) => (
                      <div key={index} className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-medium">
                        {project}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Bank & Payment */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.bankName}</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {staffMember.bankName || t.notAvailable}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.accountNumber}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono">
                    {staffMember.accountNumber || t.notAvailable}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.iban}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono">
                    {staffMember.iban || t.notAvailable}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Documents */}
          {activeTab === 4 && (
            <div className="py-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>{t.documentsNote}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end px-6 py-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {t.close}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}