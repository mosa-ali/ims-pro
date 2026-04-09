import { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Beneficiary {
  id: string;
  beneficiaryId: string;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dateOfBirth: string;
  age: number;
  nationalId: string;
  governorate: string;
  district: string;
  community: string;
  displacementStatus: 'IDP' | 'Host' | 'Returnee' | 'Other';
  
  // Household
  householdSize: number;
  adultMales: number;
  adultFemales: number;
  boys: number;
  girls: number;
  headOfHousehold: boolean;
  vulnerabilityCategories: string[];
  
  // Program & Service
  projectName: string;
  activityServiceType: string;
  dateOfService: string;
  quantitySessionsReceived: number;
  referralSource: string;
  serviceDeliveryStatus: 'Planned' | 'Ongoing' | 'Completed';
  
  // Verification
  consentGiven: boolean;
  dataCollectorName: string;
  registrationDate: string;
  notes: string;
  
  // Legacy fields for compatibility
  ageGroup: '0-5' | '6-17' | '18-59' | '60+';
  beneficiaryType: 'Direct' | 'Indirect';
  vulnerability: string;
  location: string;
  activityCode: string;
  phone: string;
  email: string;
}

interface BeneficiaryRegistrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Beneficiary, 'id'>) => void;
}

export function BeneficiaryRegistrationWizard({ isOpen, onClose, onSubmit }: BeneficiaryRegistrationWizardProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    // Legacy fields
    beneficiaryId: `BEN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    
    // Step 1: Basic Demographics
    fullName: '',
    gender: 'Male' as Beneficiary['gender'],
    dateOfBirth: '',
    age: 0,
    nationalId: '',
    governorate: '',
    district: '',
    community: '',
    displacementStatus: 'IDP' as Beneficiary['displacementStatus'],
    
    // Step 2: Household
    householdSize: 1,
    adultMales: 0,
    adultFemales: 0,
    boys: 0,
    girls: 0,
    headOfHousehold: false,
    vulnerabilityCategories: [] as string[],
    
    // Step 3: Program & Service
    projectName: '',
    activityServiceType: '',
    dateOfService: new Date().toISOString().split('T')[0],
    quantitySessionsReceived: 0,
    referralSource: '',
    serviceDeliveryStatus: 'Planned' as Beneficiary['serviceDeliveryStatus'],
    
    // Step 4: Verification
    consentGiven: false,
    dataCollectorName: '',
    registrationDate: new Date().toISOString().split('T')[0],
    notes: '',
    
    // Computed/Legacy
    ageGroup: '18-59' as Beneficiary['ageGroup'],
    beneficiaryType: 'Direct' as Beneficiary['beneficiaryType'],
    vulnerability: '',
    location: '',
    activityCode: '',
    phone: '',
    email: ''
  });

  const resetForm = () => {
    setFormData({
      beneficiaryId: `BEN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      fullName: '',
      gender: 'Male',
      dateOfBirth: '',
      age: 0,
      nationalId: '',
      governorate: '',
      district: '',
      community: '',
      displacementStatus: 'IDP',
      householdSize: 1,
      adultMales: 0,
      adultFemales: 0,
      boys: 0,
      girls: 0,
      headOfHousehold: false,
      vulnerabilityCategories: [],
      projectName: '',
      activityServiceType: '',
      dateOfService: new Date().toISOString().split('T')[0],
      quantitySessionsReceived: 0,
      referralSource: '',
      serviceDeliveryStatus: 'Planned',
      consentGiven: false,
      dataCollectorName: '',
      registrationDate: new Date().toISOString().split('T')[0],
      notes: '',
      ageGroup: '18-59',
      beneficiaryType: 'Direct',
      vulnerability: '',
      location: '',
      activityCode: '',
      phone: '',
      email: ''
    });
    setCurrentStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.consentGiven) {
      alert('Consent is required to register a beneficiary');
      return;
    }
    if (!formData.dataCollectorName) {
      alert('Data collector name is required');
      return;
    }
    
    // Compute legacy fields for compatibility
    const dataToSubmit = {
      ...formData,
      vulnerability: formData.vulnerabilityCategories.join(', '),
      location: formData.community || formData.district || formData.governorate
    };
    
    onSubmit(dataToSubmit);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t.projectDetail.registerBeneficiary}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {currentStep === 1 && 'Step 1: Basic Demographics'}
              {currentStep === 2 && 'Step 2: Family & Household Composition'}
              {currentStep === 3 && 'Step 3: Program & Service Enrollment'}
              {currentStep === 4 && 'Step 4: Verification & Consent'}
            </p>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 bg-gray-50">
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            {[1, 2, 3, 4].map((step, index) => (
              <div key={step} className={`flex items-center ${index < 3 ? 'flex-1' : ''}`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep >= step ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step ? 'bg-primary' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* STEP 1: Basic Demographics */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Beneficiary ID (auto-generated, read-only) */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.projectDetail.beneficiaryId}
                </label>
                <input
                  type="text"
                  value={formData.beneficiaryId}
                  disabled
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Full Name */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.projectDetail.beneficiaryFullName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="Ahmed Mohammed Ali"
                />
              </div>

              {/* Sex/Gender and Date of Birth */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail.gender} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Beneficiary['gender'] })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Male">{t.projectDetail.genderMale}</option>
                    <option value="Female">{t.projectDetail.genderFemale}</option>
                    <option value="Other">{t.projectDetail.genderOther}</option>
                    <option value="Prefer not to say">{t.projectDetail.genderPreferNotToSay}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Date of Birth / Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => {
                      const dob = e.target.value;
                      const age = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 0;
                      const ageGroup: Beneficiary['ageGroup'] = 
                        age <= 5 ? '0-5' :
                        age <= 17 ? '6-17' :
                        age <= 59 ? '18-59' : '60+';
                      setFormData({ ...formData, dateOfBirth: dob, age, ageGroup });
                    }}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                  {formData.age > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Age: {formData.age} years</p>
                  )}
                </div>
              </div>

              {/* National ID / Camp ID */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  National ID / Camp ID (optional)
                </label>
                <input
                  type="text"
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="123456789"
                />
              </div>

              {/* Location Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail.governorate} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.governorate}
                    onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Capital"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail.district}
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Central District"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Community
                  </label>
                  <input
                    type="text"
                    value={formData.community}
                    onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Al-Salam Camp"
                  />
                </div>
              </div>

              {/* Displacement Status */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Displacement Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.displacementStatus}
                  onChange={(e) => setFormData({ ...formData, displacementStatus: e.target.value as Beneficiary['displacementStatus'] })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="IDP">IDP (Internally Displaced Person)</option>
                  <option value="Host">Host Community</option>
                  <option value="Returnee">Returnee</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: Family & Household Composition */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Household Size */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Household Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.householdSize}
                  onChange={(e) => setFormData({ ...formData, householdSize: parseInt(e.target.value) || 1 })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Household Composition */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Number of:
                </label>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className={`block text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Adult Males
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.adultMales}
                      onChange={(e) => setFormData({ ...formData, adultMales: parseInt(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Adult Females
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.adultFemales}
                      onChange={(e) => setFormData({ ...formData, adultFemales: parseInt(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Boys
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.boys}
                      onChange={(e) => setFormData({ ...formData, boys: parseInt(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Girls
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.girls}
                      onChange={(e) => setFormData({ ...formData, girls: parseInt(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Head of Household */}
              <div>
                <label className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.headOfHousehold}
                    onChange={(e) => setFormData({ ...formData, headOfHousehold: e.target.checked })}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Head of Household</span>
                </label>
              </div>

              {/* Vulnerability Categories */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Vulnerability Categories
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Disability', 'Chronic Illness', 'Single-headed HH', 'Female-headed HH', 'Child', 'Elderly', 'Pregnant/Lactating', 'Orphan'].map((category) => (
                    <label key={category} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="checkbox"
                        checked={formData.vulnerabilityCategories.includes(category)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...formData.vulnerabilityCategories, category]
                            : formData.vulnerabilityCategories.filter(c => c !== category);
                          setFormData({ ...formData, vulnerabilityCategories: updated });
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Program & Service Enrollment */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Project Name */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Project (auto-linked) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="Education Support Program"
                />
              </div>

              {/* Activity/Service Type */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Activity / Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.activityServiceType}
                  onChange={(e) => setFormData({ ...formData, activityServiceType: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="">Select service type</option>
                  <option value="Education">Education</option>
                  <option value="WASH">WASH</option>
                  <option value="Health">Health</option>
                  <option value="Protection">Protection</option>
                  <option value="Nutrition">Nutrition</option>
                  <option value="Livelihood">Livelihood</option>
                  <option value="Shelter">Shelter</option>
                  <option value="NFI">NFI (Non-Food Items)</option>
                  <option value="Cash Assistance">Cash Assistance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Date and Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Date of Service
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfService}
                    onChange={(e) => setFormData({ ...formData, dateOfService: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Quantity / Sessions Received
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantitySessionsReceived}
                    onChange={(e) => setFormData({ ...formData, quantitySessionsReceived: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>

              {/* Referral Source */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Referral Source (if any)
                </label>
                <input
                  type="text"
                  value={formData.referralSource}
                  onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="Community Center, Health Clinic, School, etc."
                />
              </div>

              {/* Service Delivery Status */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Service Delivery Status
                </label>
                <select
                  value={formData.serviceDeliveryStatus}
                  onChange={(e) => setFormData({ ...formData, serviceDeliveryStatus: e.target.value as Beneficiary['serviceDeliveryStatus'] })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="Planned">Planned</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 4: Verification & Consent */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {/* Consent Checkbox */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.consentGiven}
                    onChange={(e) => setFormData({ ...formData, consentGiven: e.target.checked })}
                    className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Consent Checkbox</span>
                    <p className="text-xs text-gray-600 mt-1">
                      I consent to the collection, processing, and storage of my personal data for the purpose of receiving humanitarian assistance. I understand that my data will be kept confidential and used only for program purposes.
                    </p>
                  </div>
                </label>
              </div>

              {/* Data Collector Name */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Data Collector Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.dataCollectorName}
                  onChange={(e) => setFormData({ ...formData, dataCollectorName: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="John Doe"
                />
              </div>

              {/* Registration Date */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Registration Date
                </label>
                <input
                  type="date"
                  value={formData.registrationDate}
                  disabled
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Notes / Comments
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="Additional notes or comments about the beneficiary..."
                />
              </div>

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Registration Summary</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><strong>Name:</strong> {formData.fullName || 'Not provided'}</p>
                  <p><strong>Age:</strong> {formData.age} years ({formData.gender})</p>
                  <p><strong>Location:</strong> {formData.community}, {formData.district}, {formData.governorate}</p>
                  <p><strong>Household Size:</strong> {formData.householdSize}</p>
                  <p><strong>Service:</strong> {formData.activityServiceType}</p>
                  <p><strong>Status:</strong> {formData.serviceDeliveryStatus}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer - Navigation */}
        <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-between border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              } else {
                handleClose();
              }
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {currentStep === 1 ? t.common.cancel : 'Previous'}
          </button>
          
          <button
            onClick={() => {
              if (currentStep < 4) {
                // Validate current step before proceeding
                if (currentStep === 1) {
                  if (!formData.fullName || !formData.dateOfBirth || !formData.governorate) {
                    alert('Please fill in all required fields');
                    return;
                  }
                }
                if (currentStep === 3) {
                  if (!formData.projectName || !formData.activityServiceType) {
                    alert('Please fill in all required fields');
                    return;
                  }
                }
                setCurrentStep(currentStep + 1);
              } else {
                handleSubmit();
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            {currentStep === 4 ? t.common.submit : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
