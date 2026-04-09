import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { 
  Plus, Download, Upload, FileSpreadsheet, Edit2, Trash2, X, Search,
  Filter, MapPin, Calendar, Users, UserCheck, FileText, CheckCircle, Clock, XCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { exportToStandardExcel, exportExcelTemplate, type ExcelColumn } from '@/lib/standardExcelExport';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { validateImportData } from '@/lib/clientSideValidation';
import { BENEFICIARIES_CONFIG } from '@shared/importConfigs/beneficiaries';

// Country lists for Europe, MENA, and Africa
const COUNTRIES = {
  MENA: [
    'Yemen', 'Saudi Arabia', 'United Arab Emirates', 'Oman', 'Qatar', 'Bahrain', 'Kuwait',
    'Iraq', 'Syria', 'Jordan', 'Lebanon', 'Palestine', 'Israel', 'Egypt', 'Libya', 'Tunisia',
    'Algeria', 'Morocco', 'Iran', 'Turkey'
  ],
  Africa: [
    'Sudan', 'South Sudan', 'Ethiopia', 'Eritrea', 'Djibouti', 'Somalia', 'Kenya', 'Uganda',
    'Tanzania', 'Rwanda', 'Burundi', 'Democratic Republic of Congo', 'Nigeria', 'Ghana',
    'Senegal', 'Mali', 'Niger', 'Chad', 'Cameroon', 'Central African Republic', 'South Africa',
    'Zimbabwe', 'Mozambique', 'Madagascar', 'Mauritius'
  ],
  Europe: [
    'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium',
    'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Austria',
    'Switzerland', 'Greece', 'Portugal', 'Ireland', 'Hungary', 'Romania', 'Bulgaria'
  ]
};

const ALL_COUNTRIES = [...COUNTRIES.MENA, ...COUNTRIES.Africa, ...COUNTRIES.Europe].sort();

// Identification types
const IDENTIFICATION_TYPES = [
  { value: 'ID_CARD', label: 'ID Card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'FAMILY_CARD', label: 'Family Card' },
  { value: 'OTHER', label: 'Other' }
];

// Community types (replaces Displacement Status)
const COMMUNITY_TYPES = [
  { value: 'IDP', label: 'Internally Displaced Person (IDP)' },
  { value: 'REFUGEE', label: 'Refugee' },
  { value: 'HOST_COMMUNITY', label: 'Host Community' },
  { value: 'RETURNEE', label: 'Returnee' },
  { value: 'OTHER', label: 'Other' }
];

// Vulnerability categories
const VULNERABILITY_CATEGORIES = [
  'Female-headed Household',
  'Child-headed Household',
  'Elderly (60+)',
  'Person with Disability',
  'Pregnant/Lactating Woman',
  'Unaccompanied Minor',
  'Chronic Illness',
  'Other'
];

// Service types
const SERVICE_TYPES = [
  { value: 'TRAINING', label: 'Training' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'ITEMS_DISTRIBUTION', label: 'Items Distribution' },
  { value: 'PSS', label: 'PSS (Psychosocial Support)' },
  { value: 'OTHER', label: 'Other' }
];

// Verification statuses
const VERIFICATION_STATUSES = [
  { value: 'PENDING', label: 'Pending', icon: Clock, color: 'yellow' },
  { value: 'VERIFIED', label: 'Verified', icon: CheckCircle, color: 'green' },
  { value: 'NOT_ELIGIBLE', label: 'Not Eligible', icon: XCircle, color: 'red' }
];

// Helper function to format dates
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return date;
  }
  return '';
};

// Beneficiary type matches database schema
interface Beneficiary {
  id: number;
  projectId: number;
  organizationId: number;
  operatingUnitId: number | null;
  fullName: string;
  fullNameAr: string | null;
  dateOfBirth: string | null;
  
  // Identification
  identificationType: 'ID_CARD' | 'PASSPORT' | 'FAMILY_CARD' | 'OTHER' | null;
  identificationTypeOther: string | null;
  identificationNumber: string | null;
  identificationAttachment: string | null;
  
  // Demographics
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  ageGroup: string | null;
  nationality: string | null;
  
  // Contact
  phoneNumber: string | null;
  email: string | null;
  
  // Location
  country: string | null;
  governorate: string | null;
  district: string | null;
  village: string | null;
  address: string | null;
  addressAr: string | null;
  
  // Community Type
  communityType: 'IDP' | 'REFUGEE' | 'HOST_COMMUNITY' | 'RETURNEE' | 'OTHER' | null;
  communityTypeOther: string | null;
  
  // Household
  householdSize: number | null;
  dependents: number | null;
  
  // Vulnerability
  vulnerabilityCategory: string | null;
  vulnerabilityOther: string | null;
  disabilityStatus: boolean;
  disabilityType: string | null;
  
  // Program & Service
  activityId: number | null;
  serviceType: 'TRAINING' | 'WORKSHOP' | 'ITEMS_DISTRIBUTION' | 'PSS' | 'OTHER' | null;
  serviceTypeOther: string | null;
  serviceStatus: 'REGISTERED' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
  
  // Verification
  registrationDate: string;
  verificationStatus: 'VERIFIED' | 'NOT_ELIGIBLE' | 'PENDING' | null;
  verifiedBy: string | null;
  verificationDate: string | null;
  
  // Notes
  notes: string | null;
  notesAr: string | null;
  
  // Audit
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
}

interface BeneficiariesTabProps {
  projectId: string;
}

export function BeneficiariesTab({ projectId }: BeneficiariesTabProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  
  // ✅ Load beneficiaries from database via tRPC
  const projectIdNum = parseInt(projectId, 10);
  const { data: beneficiaries = [], isLoading, refetch } = trpc.beneficiaries.getByProject.useQuery({ projectId: projectIdNum });
  
  // Load activities for dropdown
  const { data: activities = [] } = trpc.activities.getByProject.useQuery({ projectId: projectIdNum });
  
  // Load project info (for auto-linked project display)
  const { data: project } = trpc.projects.getById.useQuery({ id: projectIdNum });
  
  // Mutations
  const createMutation = trpc.beneficiaries.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateModal(false);
      resetForm();
    },
  });
  
  const updateMutation = trpc.beneficiaries.update.useMutation({
    onSuccess: () => {
      refetch();
      setShowEditModal(false);
      setSelectedBeneficiary(null);
      resetForm();
    },
  });
  
  const deleteMutation = trpc.beneficiaries.delete.useMutation({
    onSuccess: () => {
      refetch();
      setShowDeleteConfirm(false);
      setSelectedBeneficiary(null);
    },
  });
  
  const bulkImportMutation = trpc.beneficiaries.bulkImport.useMutation({
    onSuccess: (result) => {
      refetch();
      setShowPreviewDialog(false);
      alert(`Successfully imported ${result.imported} beneficiaries. ${result.skipped} skipped.`);
    },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('All');
  const [filterVerification, setFilterVerification] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  
  // Preview dialog state
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [invalidRows, setInvalidRows] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    // Step 1: Basic Demographics
    fullName: '',
    gender: 'MALE' as Beneficiary['gender'],
    dateOfBirth: '',
    
    // Identification
    identificationType: '' as string,
    identificationTypeOther: '',
    identificationNumber: '',
    identificationAttachment: null as File | null,
    identificationAttachmentUrl: '',
    
    // Location
    country: '',
    governorate: '',
    district: '',
    village: '',
    
    // Community Type
    communityType: '' as string,
    communityTypeOther: '',
    
    // Step 2: Family & Household
    householdSize: 1,
    dependents: 0,
    vulnerabilityCategory: '',
    vulnerabilityOther: '',
    disabilityStatus: false,
    disabilityType: '',
    
    // Step 3: Program & Service
    activityId: '' as string,
    serviceType: '' as string,
    serviceTypeOther: '',
    serviceStatus: 'REGISTERED' as Beneficiary['serviceStatus'],
    
    // Step 4: Verification
    registrationDate: new Date().toISOString().split('T')[0],
    verificationStatus: 'PENDING' as string,
    verifiedBy: '',
    verificationDate: '',
    
    notes: '',
  });

  // Current step in wizard
  const [currentStep, setCurrentStep] = useState(1);

  // Helper functions for translations
  const getGenderLabel = (gender: Beneficiary['gender']) => {
    switch (gender) {
      case 'MALE': return t.projectDetail.genderMale;
      case 'FEMALE': return t.projectDetail.genderFemale;
      case 'OTHER': return t.projectDetail.genderOther;
    }
  };

  const getServiceStatusLabel = (status: Beneficiary['serviceStatus']) => {
    switch (status) {
      case 'REGISTERED': return 'Registered';
      case 'ACTIVE': return 'Active';
      case 'COMPLETED': return 'Completed';
      case 'SUSPENDED': return 'Suspended';
    }
  };

  const getVerificationStatusLabel = (status: string | null) => {
    const found = VERIFICATION_STATUSES.find(s => s.value === status);
    return found?.label || 'Pending';
  };

  // Apply filters
  let filteredBeneficiaries = beneficiaries.filter((ben: Beneficiary) =>
    ben.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ben.identificationNumber && ben.identificationNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ben.governorate && ben.governorate.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (filterGender !== 'All') {
    filteredBeneficiaries = filteredBeneficiaries.filter((b: Beneficiary) => b.gender === filterGender);
  }

  if (filterVerification !== 'All') {
    filteredBeneficiaries = filteredBeneficiaries.filter((b: Beneficiary) => b.verificationStatus === filterVerification);
  }

  // Calculate statistics
  const stats = {
    total: beneficiaries.length,
    male: beneficiaries.filter((b: Beneficiary) => b.gender === 'MALE').length,
    female: beneficiaries.filter((b: Beneficiary) => b.gender === 'FEMALE').length,
    verified: beneficiaries.filter((b: Beneficiary) => b.verificationStatus === 'VERIFIED').length,
    pending: beneficiaries.filter((b: Beneficiary) => b.verificationStatus === 'PENDING').length,
    notEligible: beneficiaries.filter((b: Beneficiary) => b.verificationStatus === 'NOT_ELIGIBLE').length,
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      fullName: '',
      gender: 'MALE',
      dateOfBirth: '',
      identificationType: '',
      identificationTypeOther: '',
      identificationNumber: '',
      identificationAttachment: null,
      identificationAttachmentUrl: '',
      country: '',
      governorate: '',
      district: '',
      village: '',
      communityType: '',
      communityTypeOther: '',
      householdSize: 1,
      dependents: 0,
      vulnerabilityCategory: '',
      vulnerabilityOther: '',
      disabilityStatus: false,
      disabilityType: '',
      activityId: '',
      serviceType: '',
      serviceTypeOther: '',
      serviceStatus: 'REGISTERED',
      registrationDate: new Date().toISOString().split('T')[0],
      verificationStatus: 'PENDING',
      verifiedBy: '',
      verificationDate: '',
      notes: '',
    });
    setCurrentStep(1);
  };

  // Open edit modal
  const openEditModal = (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setFormData({
      fullName: beneficiary.fullName,
      gender: beneficiary.gender,
      dateOfBirth: formatDate(beneficiary.dateOfBirth),
      identificationType: beneficiary.identificationType || '',
      identificationTypeOther: beneficiary.identificationTypeOther || '',
      identificationNumber: beneficiary.identificationNumber || '',
      identificationAttachment: null,
      identificationAttachmentUrl: beneficiary.identificationAttachment || '',
      country: beneficiary.country || '',
      governorate: beneficiary.governorate || '',
      district: beneficiary.district || '',
      village: beneficiary.village || '',
      communityType: beneficiary.communityType || '',
      communityTypeOther: beneficiary.communityTypeOther || '',
      householdSize: beneficiary.householdSize || 1,
      dependents: beneficiary.dependents || 0,
      vulnerabilityCategory: beneficiary.vulnerabilityCategory || '',
      vulnerabilityOther: beneficiary.vulnerabilityOther || '',
      disabilityStatus: beneficiary.disabilityStatus,
      disabilityType: beneficiary.disabilityType || '',
      activityId: beneficiary.activityId?.toString() || '',
      serviceType: beneficiary.serviceType || '',
      serviceTypeOther: beneficiary.serviceTypeOther || '',
      serviceStatus: beneficiary.serviceStatus,
      registrationDate: formatDate(beneficiary.registrationDate),
      verificationStatus: beneficiary.verificationStatus || 'PENDING',
      verifiedBy: beneficiary.verifiedBy || '',
      verificationDate: formatDate(beneficiary.verificationDate),
      notes: beneficiary.notes || '',
    });
    setCurrentStep(1);
    setShowEditModal(true);
  };

  // Open delete confirm
  const openDeleteConfirm = (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setShowDeleteConfirm(true);
  };

  // Handle create
  const handleCreate = async () => {
    // TODO: Handle file upload to S3 if identificationAttachment is set
    let attachmentUrl = formData.identificationAttachmentUrl;
    
    createMutation.mutate({
      projectId: projectIdNum,
      fullName: formData.fullName,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth || undefined,
      identificationType: formData.identificationType as any || undefined,
      identificationTypeOther: formData.identificationType === 'OTHER' ? formData.identificationTypeOther : undefined,
      identificationNumber: formData.identificationNumber || undefined,
      identificationAttachment: attachmentUrl || undefined,
      country: formData.country || undefined,
      governorate: formData.governorate || undefined,
      district: formData.district || undefined,
      village: formData.village || undefined,
      communityType: formData.communityType as any || undefined,
      communityTypeOther: formData.communityType === 'OTHER' ? formData.communityTypeOther : undefined,
      householdSize: formData.householdSize,
      dependents: formData.dependents,
      vulnerabilityCategory: formData.vulnerabilityCategory || undefined,
      vulnerabilityOther: formData.vulnerabilityCategory === 'Other' ? formData.vulnerabilityOther : undefined,
      disabilityStatus: formData.disabilityStatus,
      disabilityType: formData.disabilityStatus ? formData.disabilityType : undefined,
      activityId: formData.activityId ? parseInt(formData.activityId) : undefined,
      serviceType: formData.serviceType as any || undefined,
      serviceTypeOther: formData.serviceType === 'OTHER' ? formData.serviceTypeOther : undefined,
      serviceStatus: formData.serviceStatus,
      registrationDate: formData.registrationDate,
      verificationStatus: formData.verificationStatus as any,
      verifiedBy: formData.verificationStatus === 'VERIFIED' ? formData.verifiedBy : undefined,
      verificationDate: formData.verificationStatus === 'VERIFIED' ? formData.verificationDate : undefined,
      notes: formData.notes || undefined,
    });
  };

  // Handle edit
  const handleEdit = async () => {
    if (!selectedBeneficiary) return;
    
    let attachmentUrl = formData.identificationAttachmentUrl;
    
    updateMutation.mutate({
      id: selectedBeneficiary.id,
      fullName: formData.fullName,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth || undefined,
      identificationType: formData.identificationType as any || undefined,
      identificationTypeOther: formData.identificationType === 'OTHER' ? formData.identificationTypeOther : undefined,
      identificationNumber: formData.identificationNumber || undefined,
      identificationAttachment: attachmentUrl || undefined,
      country: formData.country || undefined,
      governorate: formData.governorate || undefined,
      district: formData.district || undefined,
      village: formData.village || undefined,
      communityType: formData.communityType as any || undefined,
      communityTypeOther: formData.communityType === 'OTHER' ? formData.communityTypeOther : undefined,
      householdSize: formData.householdSize,
      dependents: formData.dependents,
      vulnerabilityCategory: formData.vulnerabilityCategory || undefined,
      vulnerabilityOther: formData.vulnerabilityCategory === 'Other' ? formData.vulnerabilityOther : undefined,
      disabilityStatus: formData.disabilityStatus,
      disabilityType: formData.disabilityStatus ? formData.disabilityType : undefined,
      activityId: formData.activityId ? parseInt(formData.activityId) : undefined,
      serviceType: formData.serviceType as any || undefined,
      serviceTypeOther: formData.serviceType === 'OTHER' ? formData.serviceTypeOther : undefined,
      serviceStatus: formData.serviceStatus,
      registrationDate: formData.registrationDate,
      verificationStatus: formData.verificationStatus as any,
      verifiedBy: formData.verificationStatus === 'VERIFIED' ? formData.verifiedBy : undefined,
      verificationDate: formData.verificationStatus === 'VERIFIED' ? formData.verificationDate : undefined,
      notes: formData.notes || undefined,
    });
  };

  // Handle delete
  const handleDelete = () => {
    if (!selectedBeneficiary) return;
    deleteMutation.mutate({ id: selectedBeneficiary.id });
  };

  // Export to Excel
  const handleExportExcel = async () => {
    const exportData = filteredBeneficiaries.map((beneficiary: Beneficiary) => ({
      fullName: beneficiary.fullName,
      gender: getGenderLabel(beneficiary.gender),
      dateOfBirth: formatDate(beneficiary.dateOfBirth),
      identificationType: beneficiary.identificationType || '',
      identificationNumber: beneficiary.identificationNumber || '',
      country: beneficiary.country || '',
      governorate: beneficiary.governorate || '',
      district: beneficiary.district || '',
      village: beneficiary.village || '',
      communityType: beneficiary.communityType || '',
      householdSize: beneficiary.householdSize || 0,
      dependents: beneficiary.dependents || 0,
      vulnerabilityCategory: beneficiary.vulnerabilityCategory || '',
      disabilityStatus: beneficiary.disabilityStatus ? 'Yes' : 'No',
      serviceType: beneficiary.serviceType || '',
      registrationDate: formatDate(beneficiary.registrationDate),
      verificationStatus: getVerificationStatusLabel(beneficiary.verificationStatus),
      notes: beneficiary.notes || '',
    }));

    const columns: ExcelColumn[] = [
      { name: t.projectDetail.beneficiaryFullName, key: 'fullName', width: 30, type: 'text' },
      { name: t.projectDetail.gender, key: 'gender', width: 12, type: 'text' },
      { name: 'Date of Birth', key: 'dateOfBirth', width: 15, type: 'date' },
      { name: 'ID Type', key: 'identificationType', width: 15, type: 'text' },
      { name: 'ID Number', key: 'identificationNumber', width: 15, type: 'text' },
      { name: 'Country', key: 'country', width: 15, type: 'text' },
      { name: t.projectDetail.governorate, key: 'governorate', width: 20, type: 'text' },
      { name: t.projectDetail.district, key: 'district', width: 20, type: 'text' },
      { name: 'Village/Camp', key: 'village', width: 20, type: 'text' },
      { name: 'Community Type', key: 'communityType', width: 18, type: 'text' },
      { name: 'Household Size', key: 'householdSize', width: 15, type: 'number', totals: 'sum' },
      { name: 'Dependents', key: 'dependents', width: 12, type: 'number', totals: 'sum' },
      { name: 'Vulnerability', key: 'vulnerabilityCategory', width: 25, type: 'text' },
      { name: 'Disability', key: 'disabilityStatus', width: 12, type: 'text' },
      { name: 'Service Type', key: 'serviceType', width: 20, type: 'text' },
      { name: t.projectDetail.registrationDate, key: 'registrationDate', width: 18, type: 'date' },
      { name: 'Verification', key: 'verificationStatus', width: 15, type: 'text' },
      { name: t.common.notes, key: 'notes', width: 40, type: 'text' },
    ];

    await exportToStandardExcel({
      sheetName: t.projectDetail.beneficiariesPageTitle,
      columns,
      data: exportData,
      fileName: `Beneficiaries_Export_${new Date().toISOString().split('T')[0]}`,
      includeTotals: true,
      isRTL,
    });
  };

  // Export Empty Template
  const handleExportTemplate = async () => {
    const columns: ExcelColumn[] = [
      { name: `${t.projectDetail.beneficiaryFullName}*`, key: 'fullName', width: 30, type: 'text' },
      { name: `${t.projectDetail.gender}* (MALE/FEMALE/OTHER)`, key: 'gender', width: 25, type: 'text' },
      { name: 'Date of Birth (YYYY-MM-DD)', key: 'dateOfBirth', width: 22, type: 'date' },
      { name: 'ID Type (ID_CARD/PASSPORT/FAMILY_CARD/OTHER)', key: 'identificationType', width: 35, type: 'text' },
      { name: 'ID Number', key: 'identificationNumber', width: 15, type: 'text' },
      { name: 'Country', key: 'country', width: 15, type: 'text' },
      { name: t.projectDetail.governorate, key: 'governorate', width: 20, type: 'text' },
      { name: t.projectDetail.district, key: 'district', width: 20, type: 'text' },
      { name: 'Village/Camp', key: 'village', width: 20, type: 'text' },
      { name: 'Community Type (IDP/REFUGEE/HOST_COMMUNITY/RETURNEE/OTHER)', key: 'communityType', width: 45, type: 'text' },
      { name: 'Household Size', key: 'householdSize', width: 15, type: 'number' },
      { name: 'Dependents', key: 'dependents', width: 12, type: 'number' },
      { name: 'Vulnerability Category', key: 'vulnerabilityCategory', width: 25, type: 'text' },
      { name: 'Disability (Yes/No)', key: 'disabilityStatus', width: 18, type: 'text' },
      { name: 'Service Type (TRAINING/WORKSHOP/ITEMS_DISTRIBUTION/PSS/OTHER)', key: 'serviceType', width: 45, type: 'text' },
      { name: `${t.projectDetail.registrationDate}* (YYYY-MM-DD)`, key: 'registrationDate', width: 25, type: 'date' },
      { name: t.common.notes, key: 'notes', width: 40, type: 'text' },
    ];

    await exportExcelTemplate({
      sheetName: t.projectDetail.beneficiariesPageTitle,
      columns,
      fileName: 'Beneficiaries_Template',
      isRTL,
    });
  };

  // Import from Excel with preview
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        alert('No worksheet found in the file');
        return;
      }

      const rows: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const rowData = {
          fullName: row.getCell(1).value?.toString() || '',
          gender: row.getCell(2).value?.toString()?.toUpperCase() || 'MALE',
          dateOfBirth: row.getCell(3).value?.toString() || '',
          identificationType: row.getCell(4).value?.toString() || '',
          identificationNumber: row.getCell(5).value?.toString() || '',
          country: row.getCell(6).value?.toString() || '',
          governorate: row.getCell(7).value?.toString() || '',
          district: row.getCell(8).value?.toString() || '',
          village: row.getCell(9).value?.toString() || '',
          communityType: row.getCell(10).value?.toString() || '',
          householdSize: parseInt(row.getCell(11).value?.toString() || '1') || 1,
          dependents: parseInt(row.getCell(12).value?.toString() || '0') || 0,
          vulnerabilityCategory: row.getCell(13).value?.toString() || '',
          disabilityStatus: row.getCell(14).value?.toString()?.toLowerCase() === 'yes',
          serviceType: row.getCell(15).value?.toString() || '',
          registrationDate: row.getCell(16).value?.toString() || new Date().toISOString().split('T')[0],
          notes: row.getCell(17).value?.toString() || '',
        };
        rows.push(rowData);
      });

      // Validate rows
      const { validRows: valid, invalidRows: invalid } = validateImportData(rows, BENEFICIARIES_CONFIG);
      setValidRows(valid);
      setInvalidRows(invalid);
      setShowImportModal(false);
      setShowPreviewDialog(true);

    } catch (error) {
      console.error('Import error:', error);
      alert('Error reading Excel file. Please check the format.');
    }
  };

  // Confirm import
  const handleConfirmImport = () => {
    if (validRows.length === 0) {
      alert('No valid rows to import');
      return;
    }

    bulkImportMutation.mutate({
      projectId: projectIdNum,
      beneficiaries: validRows.map(row => ({
        fullName: row.fullName,
        gender: row.gender,
        dateOfBirth: row.dateOfBirth || undefined,
        identificationType: row.identificationType || undefined,
        identificationNumber: row.identificationNumber || undefined,
        country: row.country || undefined,
        governorate: row.governorate || undefined,
        district: row.district || undefined,
        village: row.village || undefined,
        communityType: row.communityType || undefined,
        householdSize: row.householdSize,
        dependents: row.dependents,
        vulnerabilityCategory: row.vulnerabilityCategory || undefined,
        disabilityStatus: row.disabilityStatus,
        serviceType: row.serviceType || undefined,
        registrationDate: row.registrationDate,
        notes: row.notes || undefined,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 text-start">
            {t.projectDetail.beneficiariesPageTitle}
          </h2>
          <p className="text-sm text-gray-500 text-start">
            {t.projectDetail.manageBeneficiaries}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UnifiedExportButton
            onExportData={handleExportExcel}
            onExportTemplate={handleExportTemplate}
            onImport={() => setShowImportModal(true)}
            dataLabel={t.projectDetail.beneficiariesPageTitle}
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            <span>{t.projectDetail.registerBeneficiary}</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 start-3" />
          <input
            type="text"
            placeholder={t.common.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 ps-10 pe-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-start"
          />
        </div>
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-start"
        >
          <option value="All">{t.projectDetail.allGenders}</option>
          <option value="MALE">{t.projectDetail.genderMale}</option>
          <option value="FEMALE">{t.projectDetail.genderFemale}</option>
          <option value="OTHER">{t.projectDetail.genderOther}</option>
        </select>
        <select
          value={filterVerification}
          onChange={(e) => setFilterVerification(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-start"
        >
          <option value="All">All Verification</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING">Pending</option>
          <option value="NOT_ELIGIBLE">Not Eligible</option>
        </select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <div className="text-sm text-gray-600 text-start">{t.projectDetail.totalBeneficiaries}</div>
          </div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">{stats.total}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            <div className="text-sm text-gray-600 text-start">{t.projectDetail.genderDisaggregation}</div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t.projectDetail.genderMale}:</span>
              <span className="font-medium" dir="ltr">{stats.male}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t.projectDetail.genderFemale}:</span>
              <span className="font-medium" dir="ltr">{stats.female}</span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="text-sm text-gray-600 text-start">Verification Status</div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Verified:</span>
              <span className="font-medium text-green-600" dir="ltr">{stats.verified}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Pending:</span>
              <span className="font-medium text-yellow-600" dir="ltr">{stats.pending}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Not Eligible:</span>
              <span className="font-medium text-red-600" dir="ltr">{stats.notEligible}</span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            <div className="text-sm text-gray-600 text-start">{t.projectDetail.locations}</div>
          </div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">
            {new Set(beneficiaries.map((b: Beneficiary) => b.governorate).filter(Boolean)).size}
          </div>
          <div className="text-xs text-gray-500 mt-1 text-start">{t.projectDetail.uniqueLocations}</div>
        </div>
      </div>

      {/* Beneficiaries Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.beneficiaryFullName}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.gender}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>ID Number</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.governorate}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>Community</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>Verification</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBeneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {t.projectDetail.noBeneficiariesFound}
                  </td>
                </tr>
              ) : (
                filteredBeneficiaries.map((beneficiary: Beneficiary) => (
                  <tr key={beneficiary.id} className="hover:bg-gray-50">
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="font-medium text-gray-900">{beneficiary.fullName}</div>
                      <div className="text-xs text-gray-500" dir="ltr">{beneficiary.phoneNumber || '-'}</div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        beneficiary.gender === 'MALE' ? 'bg-blue-100 text-blue-700' :
                        beneficiary.gender === 'FEMALE' ? 'bg-pink-100 text-pink-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {getGenderLabel(beneficiary.gender)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                      {beneficiary.identificationNumber || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div>{beneficiary.governorate || '-'}</div>
                      <div className="text-xs text-gray-500">{beneficiary.country || ''}</div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        beneficiary.communityType === 'IDP' ? 'bg-orange-100 text-orange-700' :
                        beneficiary.communityType === 'REFUGEE' ? 'bg-purple-100 text-purple-700' :
                        beneficiary.communityType === 'HOST_COMMUNITY' ? 'bg-blue-100 text-blue-700' :
                        beneficiary.communityType === 'RETURNEE' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {beneficiary.communityType || '-'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        beneficiary.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                        beneficiary.verificationStatus === 'NOT_ELIGIBLE' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {getVerificationStatusLabel(beneficiary.verificationStatus)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => openEditModal(beneficiary)}
                          className="text-blue-600 hover:text-blue-800"
                          title={t.common.edit}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(beneficiary)}
                          className="text-red-600 hover:text-red-800"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {showEditModal ? t.common.edit : t.projectDetail.registerBeneficiary}
              </h3>
              <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <BeneficiaryForm
                formData={formData}
                onChange={setFormData}
                onSubmit={showEditModal ? handleEdit : handleCreate}
                onCancel={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                isEdit={showEditModal}
                isLoading={createMutation.isPending || updateMutation.isPending}
                activities={activities}
                project={project}
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
              />
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.importActivities}</h3>
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="w-full mb-4" />
            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded">{t.common.cancel}</button>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedBeneficiary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.confirmDelete}</h3>
            <p className={`text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.common.deleteConfirmMessage.replace('{item}', selectedBeneficiary.fullName)}
            </p>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded">{t.common.cancel}</button>
              <button 
                onClick={handleDelete} 
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <PreImportPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        validRows={validRows}
        invalidRows={invalidRows}
        columns={[
          { key: 'fullName', label: 'Full Name' },
          { key: 'gender', label: 'Gender' },
          { key: 'identificationNumber', label: 'ID Number' },
          { key: 'country', label: 'Country' },
          { key: 'governorate', label: 'Governorate' },
          { key: 'communityType', label: 'Community Type' },
          { key: 'registrationDate', label: 'Registration Date' },
        ]}
        onConfirm={handleConfirmImport}
        isLoading={bulkImportMutation.isPending}
      />
    </div>
  );
}

// Beneficiary Form Component with Steps
interface BeneficiaryFormProps {
  formData: {
    fullName: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth: string;
    identificationType: string;
    identificationTypeOther: string;
    identificationNumber: string;
    identificationAttachment: File | null;
    identificationAttachmentUrl: string;
    country: string;
    governorate: string;
    district: string;
    village: string;
    communityType: string;
    communityTypeOther: string;
    householdSize: number;
    dependents: number;
    vulnerabilityCategory: string;
    vulnerabilityOther: string;
    disabilityStatus: boolean;
    disabilityType: string;
    activityId: string;
    serviceType: string;
    serviceTypeOther: string;
    serviceStatus: 'REGISTERED' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
    registrationDate: string;
    verificationStatus: string;
    verifiedBy: string;
    verificationDate: string;
    notes: string;
  };
  onChange: (data: BeneficiaryFormProps['formData']) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit?: boolean;
  isLoading?: boolean;
  activities: any[];
  project: any;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

function BeneficiaryForm({ formData, onChange, onSubmit, onCancel, isEdit, isLoading, activities, project, currentStep, setCurrentStep }: BeneficiaryFormProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { id: 1, title: 'Basic Demographics', icon: Users },
    { id: 2, title: 'Family & Household', icon: Users },
    { id: 3, title: 'Program & Service', icon: FileText },
    { id: 4, title: 'Verification', icon: CheckCircle },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid image (JPEG, PNG, GIF) or PDF file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      onChange({ ...formData, identificationAttachment: file });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 mb-4">Step 1: Basic Demographics</h4>
            
            {/* Full Name and Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.projectDetail.beneficiaryFullName}*
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => onChange({ ...formData, fullName: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.projectDetail.gender}*
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => onChange({ ...formData, gender: e.target.value as any })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="MALE">{t.projectDetail.genderMale}</option>
                  <option value="FEMALE">{t.projectDetail.genderFemale}</option>
                  <option value="OTHER">{t.projectDetail.genderOther}</option>
                </select>
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => onChange({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                dir="ltr"
              />
            </div>

            {/* Identification Section */}
            <div className="border-t pt-4 mt-4">
              <h5 className="font-medium text-gray-800 mb-3">1.1 Identification (Optional)</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Identification Type
                  </label>
                  <select
                    value={formData.identificationType}
                    onChange={(e) => onChange({ ...formData, identificationType: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="">Select Type</option>
                    {IDENTIFICATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                {formData.identificationType === 'OTHER' && (
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Specify Type
                    </label>
                    <input
                      type="text"
                      value={formData.identificationTypeOther}
                      onChange={(e) => onChange({ ...formData, identificationTypeOther: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder="Specify identification type"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Identification Number
                  </label>
                  <input
                    type="text"
                    value={formData.identificationNumber}
                    onChange={(e) => onChange({ ...formData, identificationNumber: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Attached Copy (Photo/PDF)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                  {formData.identificationAttachmentUrl && (
                    <p className="text-xs text-green-600 mt-1">File attached</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="border-t pt-4 mt-4">
              <h5 className="font-medium text-gray-800 mb-3">1.2 Location</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Country
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => onChange({ ...formData, country: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="">Select Country</option>
                    <optgroup label="MENA">
                      {COUNTRIES.MENA.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Africa">
                      {COUNTRIES.Africa.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Europe">
                      {COUNTRIES.Europe.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail.governorate}
                  </label>
                  <input
                    type="text"
                    value={formData.governorate}
                    onChange={(e) => onChange({ ...formData, governorate: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail.district}
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => onChange({ ...formData, district: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Location/Village or Camp Name
                  </label>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => onChange({ ...formData, village: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>
            </div>

            {/* Community Type Section */}
            <div className="border-t pt-4 mt-4">
              <h5 className="font-medium text-gray-800 mb-3">1.3 Community Type</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Community Type
                  </label>
                  <select
                    value={formData.communityType}
                    onChange={(e) => onChange({ ...formData, communityType: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="">Select Community Type</option>
                    {COMMUNITY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                {formData.communityType === 'OTHER' && (
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Specify Community Type
                    </label>
                    <input
                      type="text"
                      value={formData.communityTypeOther}
                      onChange={(e) => onChange({ ...formData, communityTypeOther: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder="Specify community type"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 mb-4">Step 2: Family & Household Composition</h4>
            
            {/* Household Size and Dependents */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Household Size
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.householdSize}
                  onChange={(e) => onChange({ ...formData, householdSize: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  dir="ltr"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Dependents
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.dependents}
                  onChange={(e) => onChange({ ...formData, dependents: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Vulnerability Categories */}
            <div className="border-t pt-4 mt-4">
              <h5 className="font-medium text-gray-800 mb-3">2.1 Vulnerability Categories</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Vulnerability Category
                  </label>
                  <select
                    value={formData.vulnerabilityCategory}
                    onChange={(e) => onChange({ ...formData, vulnerabilityCategory: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="">Select Category</option>
                    {VULNERABILITY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                {formData.vulnerabilityCategory === 'Other' && (
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Specify Vulnerability
                    </label>
                    <input
                      type="text"
                      value={formData.vulnerabilityOther}
                      onChange={(e) => onChange({ ...formData, vulnerabilityOther: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder="Specify vulnerability category"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Disability */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="disabilityStatus"
                  checked={formData.disabilityStatus}
                  onChange={(e) => onChange({ ...formData, disabilityStatus: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="disabilityStatus" className="text-sm font-medium text-gray-700">
                  Person with disability
                </label>
              </div>
              {formData.disabilityStatus && (
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Disability Type
                  </label>
                  <input
                    type="text"
                    value={formData.disabilityType}
                    onChange={(e) => onChange({ ...formData, disabilityType: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="e.g., Physical, Visual, Hearing, Cognitive"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 mb-4">Step 3: Program & Service Enrollment</h4>
            
            {/* Project (Auto-linked, non-editable) */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                3.1 Project (Auto-linked)*
              </label>
              <input
                type="text"
                value={project?.title || 'Loading...'}
                disabled
                className={`w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed ${isRTL ? 'text-right' : 'text-left'}`}
              />
              <p className="text-xs text-gray-500 mt-1">This field is automatically linked to the current project</p>
            </div>

            {/* Activity and Service Type */}
            <div className="border-t pt-4 mt-4">
              <h5 className="font-medium text-gray-800 mb-3">3.2 Activity / Service Type</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Activity
                  </label>
                  <select
                    value={formData.activityId}
                    onChange={(e) => onChange({ ...formData, activityId: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="">Select Activity</option>
                    {activities.map((activity: any) => (
                      <option key={activity.id} value={activity.id.toString()}>
                        {activity.activityCode ? `${activity.activityCode} - ` : ''}{activity.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Service Type
                  </label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => onChange({ ...formData, serviceType: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="">Select Service Type</option>
                    {SERVICE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {formData.serviceType === 'OTHER' && (
                <div className="mt-3">
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Specify Service Type
                  </label>
                  <input
                    type="text"
                    value={formData.serviceTypeOther}
                    onChange={(e) => onChange({ ...formData, serviceTypeOther: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Specify service type"
                  />
                </div>
              )}
            </div>

            {/* Service Status */}
            <div className="mt-4">
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                Service Status
              </label>
              <select
                value={formData.serviceStatus}
                onChange={(e) => onChange({ ...formData, serviceStatus: e.target.value as any })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="REGISTERED">Registered</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 mb-4">Step 4: Verification & Registration</h4>
            
            {/* Registration Date */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                4.1 Registration Date*
              </label>
              <input
                type="date"
                required
                value={formData.registrationDate}
                onChange={(e) => onChange({ ...formData, registrationDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                dir="ltr"
              />
            </div>

            {/* Verification Status */}
            <div className="border-t pt-4 mt-4">
              <h5 className="font-medium text-gray-800 mb-3">4.3 Verification Status</h5>
              <div className="grid grid-cols-3 gap-3">
                {VERIFICATION_STATUSES.map(status => {
                  const Icon = status.icon;
                  const isSelected = formData.verificationStatus === status.value;
                  return (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => onChange({ ...formData, verificationStatus: status.value })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? status.color === 'green' ? 'border-green-500 bg-green-50 text-green-700' :
                            status.color === 'red' ? 'border-red-500 bg-red-50 text-red-700' :
                            'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{status.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verified By and Date (only shown when Verified is selected) */}
            {formData.verificationStatus === 'VERIFIED' && (
              <div className="border-t pt-4 mt-4">
                <h5 className="font-medium text-gray-800 mb-3">4.4 Verification Details</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Verified By
                    </label>
                    <input
                      type="text"
                      value={formData.verifiedBy}
                      onChange={(e) => onChange({ ...formData, verifiedBy: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder="Name of verifier"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Verification Date
                    </label>
                    <input
                      type="date"
                      value={formData.verificationDate}
                      onChange={(e) => onChange({ ...formData, verificationDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="border-t pt-4 mt-4">
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.common.notes}
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => onChange({ ...formData, notes: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  isActive ? 'bg-primary text-white' :
                  isCompleted ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                <span className="text-sm font-medium sm:hidden">{step.id}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation Buttons */}
      <div className={`flex items-center justify-between pt-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Previous
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t.common.cancel}
          </button>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isLoading || !formData.fullName || !formData.registrationDate}
              className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : (isEdit ? t.common.update : t.common.create)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
