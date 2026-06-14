/**
 * ============================================================================
 * EDIT STAFF MODAL - Update Staff Member (MIGRATED TO tRPC)
 * ============================================================================
 * MIGRATED: 2026-06-13 - Replaced hrService with real tRPC data
 * 
 * Changes:
 * - Removed: StaffMember type from hrService
 * - Added: Database employee type
 * - Field mapping: fullName → firstName/lastName, contractType → employmentType
 * - Status mapping: active|archived|exited → active|on_leave|suspended|terminated|resigned
 */

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { toast } from 'sonner';

interface EditStaffModalProps {
  employeeId: number;
  onClose: () => void;
  onSave: () => void;
}

export function EditStaffModal({
  employeeId,
  onClose,
  onSave }: EditStaffModalProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch employee data
  const { data: employee, isLoading: fetchLoading } = trpc.hrEmployees.getById.useQuery(
    { id: employeeId },
    { enabled: !!employeeId }
  );

  // tRPC mutation for updating employee
  const updateMutation = trpc.hrEmployees.update.useMutation({
    onSuccess: () => {
      toast.success(t.hr?.staffMemberUpdatedSuccessfully || 'Staff member updated successfully');
      onSave();
      onClose();
    },
    onError: (err) => {
      setError(err.message || 'Failed to update employee');
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
    reportingTo: null as number | null,
    
    // Dates
    hireDate: '',
    contractStartDate: '',
    contractEndDate: '',
    probationEndDate: '',
    terminationDate: '',
    
    // Bank Information
    bankName: '',
    bankAccountNumber: '',
    bankIban: '',
    
    // Additional
    address: '',
    city: '',
    country: '',
    nationalId: '',
    passportNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    notes: '',
  });

  // Load employee data into form when fetched
  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        gender: (employee.gender as 'male' | 'female' | 'other') || 'male',
        nationality: employee.nationality || '',
        dateOfBirth: employee.dateOfBirth || '',
        phone: employee.phone || '',
        email: employee.email || '',
        employeeCode: employee.employeeCode || '',
        position: employee.position || '',
        jobTitle: employee.jobTitle || '',
        department: employee.department || '',
        employmentType: (employee.employmentType as any) || 'full_time',
        staffCategory: (employee.staffCategory as any) || 'national',
        status: (employee.status as any) || 'active',
        reportingTo: employee.reportingTo || null,
        hireDate: employee.hireDate || '',
        contractStartDate: employee.contractStartDate || '',
        contractEndDate: employee.contractEndDate || '',
        probationEndDate: employee.probationEndDate || '',
        terminationDate: employee.terminationDate || '',
        bankName: employee.bankName || '',
        bankAccountNumber: employee.bankAccountNumber || '',
        bankIban: employee.bankIban || '',
        address: employee.address || '',
        city: employee.city || '',
        country: employee.country || '',
        nationalId: employee.nationalId || '',
        passportNumber: employee.passportNumber || '',
        emergencyContactName: employee.emergencyContactName || '',
        emergencyContactPhone: employee.emergencyContactPhone || '',
        emergencyContactRelation: employee.emergencyContactRelation || '',
        notes: employee.notes || '',
      });
    }
  }, [employee]);

  const localT = {
    // Modal title
    editStaff: t.hrStaff.editStaffMember,
    
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
    nationalId: 'National ID',
    passportNumber: 'Passport Number',
    address: 'Address',
    city: 'City',
    country: 'Country',
    
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
    reportingTo: 'Reporting To (Employee ID)',
    hireDate: t.hrStaff.hireDate,
    contractStartDate: t.hrStaff.contractStartDate,
    contractEndDate: t.hrStaff.contractEndDate,
    probationEndDate: 'Probation End Date',
    terminationDate: 'Termination Date',
    
    // Bank fields
    bankName: t.hrStaff.bankName,
    accountNumber: t.hrStaff.accountNumber,
    iban: t.hrStaff.iban,
    
    // Emergency contact
    emergencyContactName: 'Emergency Contact Name',
    emergencyContactPhone: 'Emergency Contact Phone',
    emergencyContactRelation: 'Emergency Contact Relation',
    notes: 'Notes',
    
    // Buttons
    cancel: t.hrStaff.cancel,
    save: t.hrStaff.saveChanges,
    required: t.hrStaff.requiredField,
    saving: 'Saving...',
  };

  const tabs = [
    { id: 0, label: localT.personalInfo },
    { id: 1, label: localT.employmentInfo },
    { id: 2, label: localT.bankPayment }
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

    setLoading(true);

    try {
      // Update employee with tRPC
      await updateMutation.mutateAsync({
        id: employeeId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        nationality: formData.nationality || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        employeeCode: formData.employeeCode,
        position: formData.position,
        jobTitle: formData.jobTitle || undefined,
        department: formData.department || undefined,
        employmentType: formData.employmentType,
        staffCategory: formData.staffCategory,
        status: formData.status,
        reportingTo: formData.reportingTo || undefined,
        hireDate: formData.hireDate || undefined,
        contractStartDate: formData.contractStartDate || undefined,
        contractEndDate: formData.contractEndDate || undefined,
        probationEndDate: formData.probationEndDate || undefined,
        terminationDate: formData.terminationDate || undefined,
        bankName: formData.bankName || undefined,
        bankAccountNumber: formData.bankAccountNumber || undefined,
        bankIban: formData.bankIban || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        country: formData.country || undefined,
        nationalId: formData.nationalId || undefined,
        passportNumber: formData.passportNumber || undefined,
        emergencyContactName: formData.emergencyContactName || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        emergencyContactRelation: formData.emergencyContactRelation || undefined,
        notes: formData.notes || undefined,
      });
    } catch (err) {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <ModalOverlay onClose={onClose}>
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ModalOverlay>
    );
  }

  if (!employee) {
    return (
      <ModalOverlay onClose={onClose}>
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex items-center justify-center">
          <p className="text-gray-600">Employee not found</p>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{localT.editStaff}</h2>
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
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={loading}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tab.label}
            </button>
          ))}
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
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.nationalId}</label>
                  <input
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) => handleChange('nationalId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.passportNumber}</label>
                  <input
                    type="text"
                    value={formData.passportNumber}
                    onChange={(e) => handleChange('passportNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{localT.address}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.emergencyContactName}</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.emergencyContactPhone}</label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{localT.emergencyContactRelation}</label>
                <input
                  type="text"
                  value={formData.emergencyContactRelation}
                  onChange={(e) => handleChange('emergencyContactRelation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Tab 1: Employment Information */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.employeeCode}</label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) => handleChange('employeeCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.reportingTo}</label>
                  <input
                    type="number"
                    value={formData.reportingTo || ''}
                    onChange={(e) => handleChange('reportingTo', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.probationEndDate}</label>
                  <input
                    type="date"
                    value={formData.probationEndDate}
                    onChange={(e) => handleChange('probationEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{localT.terminationDate}</label>
                  <input
                    type="date"
                    value={formData.terminationDate}
                    onChange={(e) => handleChange('terminationDate', e.target.value)}
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
