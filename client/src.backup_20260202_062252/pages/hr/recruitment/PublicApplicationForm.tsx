/**
 * ============================================================================
 * PUBLIC APPLICATION FORM (EXTERNAL - NO LOGIN REQUIRED)
 * ============================================================================
 * 
 * Features:
 * - Vacancy-specific form (via vacancyRef URL parameter)
 * - Dynamic criteria fields based on vacancy
 * - File uploads (CV, cover letter, certificates)
 * - Auto-scoring upon submission
 * - Automatic shortlist determination
 * - Declaration checkbox
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import { 
  CheckCircle, 
  Upload, 
  FileText, 
  AlertCircle,
  X,
  Briefcase
} from 'lucide-react';
import {
  vacancyService,
  vacancyCriteriaService,
  applicationService,
  candidateDocumentService
} from './recruitmentService';
import { Vacancy, VacancyCriteria, ApplicationFormData } from './types';

export function PublicApplicationForm() {
  const { vacancyRef } = useParams<{ vacancyRef: string }>();
  const navigate = useNavigate();
  
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [criteria, setCriteria] = useState<VacancyCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCandidateId, setSubmittedCandidateId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other' | 'Prefer not to say',
    nationality: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    currentLocation: '',
    educationLevel: '',
    fieldOfStudy: '',
    yearsOfExperience: 0,
    currentEmployer: '',
    currentPosition: '',
    declarationAccepted: false
  });

  const [criteriaResponses, setCriteriaResponses] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<{
    cv: File | null;
    coverLetter: File | null;
    certificates: File[];
  }>({
    cv: null,
    coverLetter: null,
    certificates: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (vacancyRef) {
      loadVacancy(vacancyRef);
    }
  }, [vacancyRef]);

  const loadVacancy = (ref: string) => {
    setLoading(true);
    const vacancyData = vacancyService.getByRef(ref);
    
    if (!vacancyData) {
      setError('Vacancy not found');
      setLoading(false);
      return;
    }

    if (vacancyData.status !== 'Open') {
      setError('This vacancy is no longer accepting applications');
      setLoading(false);
      return;
    }

    if (new Date(vacancyData.closingDate) < new Date()) {
      setError('This vacancy has closed');
      setLoading(false);
      return;
    }

    setVacancy(vacancyData);
    const criteriaData = vacancyCriteriaService.getByVacancy(vacancyData.id);
    setCriteria(criteriaData);
    setLoading(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCriteriaResponse = (criteriaId: string, value: any) => {
    setCriteriaResponses(prev => ({ ...prev, [criteriaId]: value }));
  };

  const handleFileChange = (type: 'cv' | 'coverLetter', file: File | null) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    if (errors[type]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[type];
        return newErrors;
      });
    }
  };

  const handleCertificateAdd = (file: File) => {
    setFiles(prev => ({
      ...prev,
      certificates: [...prev.certificates, file]
    }));
  };

  const handleCertificateRemove = (index: number) => {
    setFiles(prev => ({
      ...prev,
      certificates: prev.certificates.filter((_, i) => i !== index)
    }));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.nationality.trim()) newErrors.nationality = 'Nationality is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.currentLocation.trim()) newErrors.currentLocation = 'Current location is required';
    if (!formData.educationLevel.trim()) newErrors.educationLevel = 'Education level is required';
    if (!formData.fieldOfStudy.trim()) newErrors.fieldOfStudy = 'Field of study is required';
    if (formData.yearsOfExperience < 0) newErrors.yearsOfExperience = 'Invalid experience';

    if (!files.cv) newErrors.cv = 'CV is required';
    
    if (!formData.declarationAccepted) {
      newErrors.declaration = 'You must accept the declaration';
    }

    // Validate required criteria
    criteria.forEach(criterion => {
      if (criterion.required && !criteriaResponses[criterion.id]) {
        newErrors[`criteria_${criterion.id}`] = `${criterion.criteriaName} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !vacancy) {
      return;
    }

    try {
      // Prepare application data
      const applicationData: ApplicationFormData = {
        vacancyId: vacancy.id,
        vacancyRef: vacancy.vacancyRef,
        positionTitle: vacancy.positionTitle,
        fullName: formData.fullName,
        gender: formData.gender,
        nationality: formData.nationality,
        dateOfBirth: formData.dateOfBirth,
        email: formData.email,
        phone: formData.phone,
        currentLocation: formData.currentLocation,
        educationLevel: formData.educationLevel,
        fieldOfStudy: formData.fieldOfStudy,
        yearsOfExperience: formData.yearsOfExperience,
        currentEmployer: formData.currentEmployer,
        currentPosition: formData.currentPosition,
        criteriaResponses,
        declarationAccepted: formData.declarationAccepted
      };

      // Submit application
      const candidate = applicationService.submitApplication(applicationData);
      
      if (!candidate) {
        setError('Failed to submit application. Please try again.');
        return;
      }

      // Upload documents
      if (files.cv) {
        const cvData = await fileToBase64(files.cv);
        candidateDocumentService.create({
          candidateId: candidate.id,
          documentType: 'CV',
          fileName: files.cv.name,
          fileData: cvData
        });
      }

      if (files.coverLetter) {
        const coverLetterData = await fileToBase64(files.coverLetter);
        candidateDocumentService.create({
          candidateId: candidate.id,
          documentType: 'Cover Letter',
          fileName: files.coverLetter.name,
          fileData: coverLetterData
        });
      }

      for (const cert of files.certificates) {
        const certData = await fileToBase64(cert);
        candidateDocumentService.create({
          candidateId: candidate.id,
          documentType: 'Certificate',
          fileName: cert.name,
          fileData: certData
        });
      }

      setSubmittedCandidateId(candidate.id);
      setSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
      setError('An error occurred during submission. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application form...</p>
        </div>
      </div>
    );
  }

  if (error || !vacancy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Application Unavailable</h2>
          <p className="text-gray-600">{error || 'Vacancy not found'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Application Submitted Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for applying to <strong>{vacancy.positionTitle}</strong>.
          </p>
          <p className="text-sm text-gray-500">
            Your application has been received and will be reviewed by our hiring team. 
            We will contact you if your profile matches our requirements.
          </p>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Reference Number:</strong> {submittedCandidateId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vacancy.positionTitle}</h1>
              <p className="text-gray-600">{vacancy.department} - {vacancy.dutyStation}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Contract Type:</span>
              <p className="font-medium text-gray-900">{vacancy.contractType}</p>
            </div>
            <div>
              <span className="text-gray-500">Vacancy Type:</span>
              <p className="font-medium text-gray-900">{vacancy.vacancyType}</p>
            </div>
            <div>
              <span className="text-gray-500">Opening Date:</span>
              <p className="font-medium text-gray-900">{new Date(vacancy.openingDate).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-gray-500">Closing Date:</span>
              <p className="font-medium text-red-600">{new Date(vacancy.closingDate).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.fullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.nationality ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Jordanian"
                />
                {errors.nationality && <p className="text-xs text-red-500 mt-1">{errors.nationality}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{errors.dateOfBirth}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="your.email@example.com"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+962 7X XXX XXXX"
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.currentLocation}
                  onChange={(e) => handleInputChange('currentLocation', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.currentLocation ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="City, Country"
                />
                {errors.currentLocation && <p className="text-xs text-red-500 mt-1">{errors.currentLocation}</p>}
              </div>
            </div>
          </div>

          {/* Education & Experience */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Education & Experience</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Highest Education Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.educationLevel}
                  onChange={(e) => handleInputChange('educationLevel', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.educationLevel ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select...</option>
                  <option value="High School">High School</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="Doctorate">Doctorate</option>
                </select>
                {errors.educationLevel && <p className="text-xs text-red-500 mt-1">{errors.educationLevel}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field of Study <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fieldOfStudy}
                  onChange={(e) => handleInputChange('fieldOfStudy', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.fieldOfStudy ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Computer Science"
                />
                {errors.fieldOfStudy && <p className="text-xs text-red-500 mt-1">{errors.fieldOfStudy}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Relevant Experience <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.yearsOfExperience}
                  onChange={(e) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Employer (Optional)
                </label>
                <input
                  type="text"
                  value={formData.currentEmployer}
                  onChange={(e) => handleInputChange('currentEmployer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Company/Organization"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Position (Optional)
                </label>
                <input
                  type="text"
                  value={formData.currentPosition}
                  onChange={(e) => handleInputChange('currentPosition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your current role"
                />
              </div>
            </div>
          </div>

          {/* Job-Specific Criteria */}
          {criteria.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Selection Criteria</h3>
              
              <div className="space-y-4">
                {criteria.map((criterion) => (
                  <div key={criterion.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {criterion.criteriaName} {criterion.required && <span className="text-red-500">*</span>}
                    </label>
                    {criterion.description && (
                      <p className="text-xs text-gray-500 mb-2">{criterion.description}</p>
                    )}
                    
                    {criterion.criteriaType === 'YesNo' && (
                      <select
                        value={criteriaResponses[criterion.id] || ''}
                        onChange={(e) => handleCriteriaResponse(criterion.id, e.target.value === 'Yes')}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`criteria_${criterion.id}`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    )}
                    
                    {criterion.criteriaType === 'Numeric' && (
                      <input
                        type="number"
                        min={criterion.minValue || 0}
                        max={criterion.maxValue || 100}
                        value={criteriaResponses[criterion.id] || ''}
                        onChange={(e) => handleCriteriaResponse(criterion.id, parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`criteria_${criterion.id}`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder={`${criterion.minValue || 0} - ${criterion.maxValue || 100}`}
                      />
                    )}
                    
                    {criterion.criteriaType === 'Scale' && (
                      <select
                        value={criteriaResponses[criterion.id] || ''}
                        onChange={(e) => handleCriteriaResponse(criterion.id, parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`criteria_${criterion.id}`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select...</option>
                        {Array.from({ length: (criterion.maxValue || 5) - (criterion.minValue || 1) + 1 }, (_, i) => {
                          const val = (criterion.minValue || 1) + i;
                          return <option key={val} value={val}>{val}</option>;
                        })}
                      </select>
                    )}
                    
                    {criterion.criteriaType === 'Checklist' && criterion.options && (
                      <div className="space-y-2">
                        {criterion.options.map((option, idx) => (
                          <label key={idx} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={(criteriaResponses[criterion.id] || []).includes(option)}
                              onChange={(e) => {
                                const current = criteriaResponses[criterion.id] || [];
                                const updated = e.target.checked
                                  ? [...current, option]
                                  : current.filter((o: string) => o !== option);
                                handleCriteriaResponse(criterion.id, updated);
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {errors[`criteria_${criterion.id}`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`criteria_${criterion.id}`]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Upload */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Documents</h3>
            
            <div className="space-y-4">
              {/* CV Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Curriculum Vitae (CV) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileChange('cv', e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {files.cv && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {files.cv.name}
                  </p>
                )}
                {errors.cv && <p className="text-xs text-red-500 mt-1">{errors.cv}</p>}
              </div>

              {/* Cover Letter Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Letter (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileChange('coverLetter', e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {files.coverLetter && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {files.coverLetter.name}
                  </p>
                )}
              </div>

              {/* Certificates Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificates (Optional - Multiple allowed)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleCertificateAdd(file);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {files.certificates.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.certificates.map((cert, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{cert.name}</span>
                        <button
                          type="button"
                          onClick={() => handleCertificateRemove(idx)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Declaration */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.declarationAccepted}
                onChange={(e) => handleInputChange('declarationAccepted', e.target.checked)}
                className={`mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 ${
                  errors.declaration ? 'border-red-500' : ''
                }`}
              />
              <span className="text-sm text-gray-700">
                I certify that the information provided in this application is true and accurate to the best of my knowledge. 
                I understand that any false information may result in disqualification from the recruitment process.
              </span>
            </label>
            {errors.declaration && <p className="text-xs text-red-500 mt-2 ml-7">{errors.declaration}</p>}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
            >
              <CheckCircle className="w-5 h-5" />
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
