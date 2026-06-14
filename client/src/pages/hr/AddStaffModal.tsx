/**
 * ============================================================================
 * ADD STAFF MODAL - Create New Staff Member (MIGRATED TO tRPC)
 * ============================================================================
 * MIGRATED: 2026-06-13 - Replaced hrService with real tRPC data
 * 
 * Changes:
 * - Removed: staffService, salaryScaleService imports
 * - Added: trpc mutations for create
 * - Field mapping: fullName → firstName/lastName, contractType → employmentType
 * - Status mapping: active|archived|exited → active|on_leave|suspended|terminated|resigned
 */

import { useState } from 'react';
import { X, Save, User, Briefcase, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';

interface AddStaffModalProps {
  language: 'en' | 'ar' | 'it';
  isRTL: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AddStaffModal({
  language, isRTL, onClose, onSave }: AddStaffModalProps) {
  const { t } = useTranslation();
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // tRPC mutation for creating employee
  const createMutation = trpc.hrEmployees.create.useMutation({
    onSuccess: () => {
      onSave();
      onClose();
    },
    onError: (err) => {
      setError(err.message || 'Failed to create employee');
      setLoading(false);
    },
  });

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    gender: 'male' as 'male' | 'female' | 'other',
    nationality: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    
    // Employment Information
    employeeCode: '',
    position: '',
    jobTitle: '',
    department: '',
    employmentType: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'consultant' | 'intern',
    staffCategory: 'national' as 'national' | 'international' | 'expatriate',
    status: 'active' as 'active' | 'on_leave' | 'suspended' | 'terminated' | 'resigned',
    
    // Dates
    hireDate: new Date().toISOString().split('T')[0],
    contractStartDate: new Date().toISOString().split('T')[0],
    contractEndDate: '',
    
    // Bank Information
    bankName: '',
    bankAccountNumber: '',
    bankIban: '',
    
    // Additional
    address: '',
    city: '',
    country: '',
    notes: '',
  });

  const localT = {
    // Modal title
    addStaff: t.hrStaff.addNewStaffMember,
    
    // Tabs
    personalInfo: t.hrStaff.personalInformation,
    employmentInfo: t.hrStaff.employmentInformation,
    bankPayment: t.hrStaff.bankPayment,
    
    // Personal Info fields
    firstName: 'First Name',
    lastName: 'Last Name',
    gender: t.hrStaff.gender,
    male: t.hrStaff.male,
    female: t.hrStaff.female,
    other: t.hrStaff.other,
    nationality: t.hrStaff.nationality,
    dateOfBirth: t.hrStaff.dateOfBirth,
    phone: t.hrStaff.phoneNumber,
    email: t.hrStaff.emailAddress,
    
    // Employment Info fields
    employeeCode: 'Employee Code',
    position: t.hrStaff.position,
    jobTitle: 'Job Title',
    department: t.hrStaff.department,
    employmentType: 'Employment Type',
    fullTime: 'Full Time',
    partTime: 'Part Time',
    contract: 'Contract',
    consultant: 'Consultant',
    intern: 'Intern',
    staffCategory: 'Staff Category',
    national: 'National',
    international: 'International',
    expatriate: 'Expatriate',
    status: t.hrStaff.status,
    active: t.hrStaff.active,
    onLeave: 'On Leave',
    suspended: 'Suspended',
    terminated: 'Terminated',
    resigned: 'Resigned',
    hireDate: t.hrStaff.hireDate,
    contractStartDate: t.hrStaff.contractStartDate,
    contractEndDate: t.hrStaff.contractEndDate,
    
    // Bank fields
    bankName: t.hrStaff.bankName,
    accountNumber: t.hrStaff.accountNumber,
    iban: t.hrStaff.iban,
    
    // Address fields
    address: 'Address',
    city: 'City',
    country: 'Country',
    notes: 'Notes',
    
    // Buttons
    cancel: t.hrStaff.cancel,
    save: t.hrStaff.addStaffMember,
    required: t.hrStaff.pleaseFillInAllRequiredFields,
    saving: 'Saving...',
  };

  const tabs = [
    { id: 0, label: localT.personalInfo, icon: User },
    { id: 1, label: localT.employmentInfo, icon: Briefcase },
    { id: 2, label: localT.bankPayment, icon: CreditCard }
  ];

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setError(null);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.position) {
      setError(localT.required);
      return;
    }

    if (!currentOrganizationId || !currentOperatingUnitId) {
      setError('Organization or Operating Unit not set');
      return;
    }

    setLoading(true);

    try {
      // Create employee with tRPC
      await createMutation.mutateAsync({
        employeeCode: formData.employeeCode || `EMP-${Date.now()}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        nationality: formData.nationality || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        position: formData.position,
        jobTitle: formData.jobTitle || undefined,
        department: formData.department || undefined,
        employmentType: formData.employmentType,
        staffCategory: formData.staffCategory,
        status: formData.status,
        hireDate: formData.hireDate,
        contractStartDate: formData.contractStartDate,
        contractEndDate: formData.contractEndDate || undefined,
        bankName: formData.bankName || undefined,
        bankAccountNumber: formData.bankAccountNumber || undefined,
        bankIban: formData.bankIban || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        country: formData.country || undefined,
        notes: formData.notes || undefined,
      });
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{localT.addStaff}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {localT.firstName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ahmed"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {localT.lastName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Hassan"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.gender}</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="male">{localT.male}</option>
                    <option value="female">{localT.female}</option>
                    <option value="other">{localT.other}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.nationality}</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Yemen"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.dateOfBirth}</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.phone}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+967 xxx xxx xxx"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{localT.email}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ahmed@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{localT.address}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main Street"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.city}</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Sana'a"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.country}</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Yemen"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Employment Information */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {localT.employeeCode} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) => handleChange('employeeCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="EMP-001"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {localT.position} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => handleChange('position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Project Manager"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.jobTitle}</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => handleChange('jobTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Senior Project Manager"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.department}</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Programs"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.employmentType}</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => handleChange('employmentType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="full_time">{localT.fullTime}</option>
                    <option value="part_time">{localT.partTime}</option>
                    <option value="contract">{localT.contract}</option>
                    <option value="consultant">{localT.consultant}</option>
                    <option value="intern">{localT.intern}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.staffCategory}</label>
                  <select
                    value={formData.staffCategory}
                    onChange={(e) => handleChange('staffCategory', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="national">{localT.national}</option>
                    <option value="international">{localT.international}</option>
                    <option value="expatriate">{localT.expatriate}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.status}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="active">{localT.active}</option>
                    <option value="on_leave">{localT.onLeave}</option>
                    <option value="suspended">{localT.suspended}</option>
                    <option value="terminated">{localT.terminated}</option>
                    <option value="resigned">{localT.resigned}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.hireDate}</label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => handleChange('hireDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.contractStartDate}</label>
                  <input
                    type="date"
                    value={formData.contractStartDate}
                    onChange={(e) => handleChange('contractStartDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.contractEndDate}</label>
                  <input
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => handleChange('contractEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{localT.notes}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                  rows={3}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Bank Payment */}
          {activeTab === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{localT.bankName}</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Bank Name"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{localT.accountNumber}</label>
                <input
                  type="text"
                  value={formData.bankAccountNumber}
                  onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Account Number"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{localT.iban}</label>
                <input
                  type="text"
                  value={formData.bankIban}
                  onChange={(e) => handleChange('bankIban', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="IBAN"
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {localT.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? localT.saving : localT.save}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
