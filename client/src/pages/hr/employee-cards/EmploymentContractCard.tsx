/**
 * ============================================================================
 * 2. EMPLOYMENT & CONTRACT CARD
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { FileText, Plus, Calendar, Edit, Download, Upload } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { contractService, ContractRecord } from '@/app/services/employeeRecordsService';
import { FileUploadModal } from '@/app/components/hr/FileUploadModal';
import { fileStorageService } from '@/app/services/fileStorageService';
import { EditEmploymentContractModal } from '../modals/EditEmploymentContractModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 language: string;
 isRTL: boolean;
 onEmployeeUpdate?: () => void;
}

export function EmploymentContractCard({
 employee, language, isRTL, onEmployeeUpdate }: Props) {
 const { t } = useTranslation();
 const [contracts, setContracts] = useState<ContractRecord[]>([]);
 const [showUploadModal, setShowUploadModal] = useState(false);
 const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
 const [showEditModal, setShowEditModal] = useState(false);

 const handleEmployeeUpdated = (updated: StaffMember) => {
 if (onEmployeeUpdate) {
 onEmployeeUpdate();
 }
 setShowEditModal(false);
 };

 useEffect(() => {
 loadContracts();
 }, [employee.id]);

 const loadContracts = () => {
 const records = contractService.getAll(employee.id);
 setContracts(records);
 };

 const handleFileUpload = async (file: File, notes?: string) => {
 if (selectedContractId) {
 const fileMetadata = await fileStorageService.uploadFile(
 file,
 employee.id,
 'contract',
 'Current User' // TODO: Get from auth context
 );
 
 contractService.update(selectedContractId, {
 signedDocumentId: fileMetadata.id
 });
 
 loadContracts();
 }
 };

 const localT = {
 title: t.hrEmployeeCards.employmentContract,
 subtitle: t.hrEmployeeCards.contractHistoryAndEmploymentRecords,
 edit: t.hrEmployeeCards.edit,
 
 currentContract: t.hrEmployeeCards.currentContract,
 contractType: t.hrEmployeeCards.contractType,
 startDate: t.hrEmployeeCards.startDate,
 endDate: t.hrEmployeeCards.endDate,
 position: t.hrEmployeeCards.position,
 department: t.hrEmployeeCards.department,
 projects: t.hrEmployeeCards.projects,
 salary: t.hrEmployeeCards.salary,
 status: t.hrEmployeeCards.status,
 
 contractHistory: t.hrEmployeeCards.contractHistory,
 addContract: t.hrEmployeeCards.addContract,
 uploadDocument: t.hrEmployeeCards.uploadDocument,
 
 active: t.hrEmployeeCards.active,
 expired: t.hrEmployeeCards.expired,
 terminated: t.hrEmployeeCards.terminated,
 
 noContracts: t.hrEmployeeCards.noContractRecordsFound
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrEmployeeCards.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const formatCurrency = (amount: number, currency: string) => {
 return new Intl.NumberFormat(t.hrEmployeeCards.en, {
 style: 'currency',
 currency: currency
 }).format(amount);
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'active': return 'bg-green-100 text-green-700 border-green-200';
 case 'expired': return 'bg-gray-100 text-gray-700 border-gray-200';
 case 'terminated': return 'bg-red-100 text-red-700 border-red-200';
 default: return 'bg-gray-100 text-gray-600 border-gray-200';
 }
 };

 return (
 <div className="bg-white rounded-lg border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200">
 <div className={`flex items-center justify-between`}>
 <div>
 <h3 className={`text-lg font-semibold text-gray-900 text-start`}>
 {localT.title}
 </h3>
 <p className={`text-sm text-gray-600 mt-1 text-start`}>
 {localT.subtitle}
 </p>
 </div>
 <button
 onClick={() => setShowEditModal(true)}
 className={`flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <Edit className="w-4 h-4" />
 <span>{localT.edit}</span>
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="p-6 space-y-6">
 {/* Current Employment Info */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className={'text-start'}>
 <p className="text-xs text-gray-500 mb-1">{localT.contractType}</p>
 <p className="text-sm text-gray-900 font-medium">{employee.contractType}</p>
 </div>
 <div className={'text-start'}>
 <p className="text-xs text-gray-500 mb-1">{localT.position}</p>
 <p className="text-sm text-gray-900 font-medium">{employee.position}</p>
 </div>
 <div className={'text-start'}>
 <p className="text-xs text-gray-500 mb-1">{localT.department}</p>
 <p className="text-sm text-gray-900 font-medium">{employee.department}</p>
 </div>
 <div className={'text-start'}>
 <p className="text-xs text-gray-500 mb-1">{localT.startDate}</p>
 <p className="text-sm text-gray-900 font-medium">{formatDate(employee.contractStartDate)}</p>
 </div>
 {employee.contractEndDate && (
 <div className={'text-start'}>
 <p className="text-xs text-gray-500 mb-1">{localT.endDate}</p>
 <p className="text-sm text-gray-900 font-medium">{formatDate(employee.contractEndDate)}</p>
 </div>
 )}
 <div className={'text-start'}>
 <p className="text-xs text-gray-500 mb-1">{localT.projects}</p>
 <p className="text-sm text-gray-900 font-medium">
 {Array.isArray(employee.projects) ? employee.projects.join(', ') : (employee.projects || '-')}
 </p>
 </div>
 </div>

 {/* Contract History */}
 {contracts.length > 0 && (
 <div>
 <h4 className={`text-sm font-semibold text-gray-900 mb-3 text-start`}>
 {localT.contractHistory}
 </h4>
 <div className="space-y-3">
 {contracts.map((contract) => (
 <div
 key={contract.id}
 className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
 >
 <div className={`flex items-center justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className={`flex items-center gap-2 mb-2`}>
 <p className="text-sm font-medium text-gray-900">{contract.contractType}</p>
 <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(contract.status)}`}>
 {localT[contract.status as keyof typeof localT] || contract.status}
 </span>
 </div>
 <p className="text-xs text-gray-600">
 {formatDate(contract.startDate)} - {contract.endDate ? formatDate(contract.endDate) : localT.ongoing}
 </p>
 <p className="text-xs text-gray-600 mt-1">
 {contract.position} • {contract.department}
 </p>
 </div>
 <div className={`flex items-center gap-2`}>
 {contract.signedDocumentId ? (
 <button
 onClick={() => fileStorageService.downloadFile(contract.signedDocumentId!)}
 className="p-2 text-blue-600 hover:bg-blue-50 rounded"
 title={t.download || 'Download'}
 >
 <Download className="w-4 h-4" />
 </button>
 ) : (
 <button
 onClick={() => {
 setSelectedContractId(contract.id);
 setShowUploadModal(true);
 }}
 className="p-2 text-gray-600 hover:bg-gray-50 rounded"
 title={localT.uploadDocument}
 >
 <Upload className="w-4 h-4" />
 </button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {contracts.length === 0 && (
 <div className="text-center py-8 text-gray-500">
 <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
 <p>{localT.noContracts}</p>
 </div>
 )}
 </div>

 {/* File Upload Modal */}
 <FileUploadModal
 isOpen={showUploadModal}
 onClose={() => {
 setShowUploadModal(false);
 setSelectedContractId(null);
 }}
 onUpload={handleFileUpload}
 title={{ en: 'Upload Contract Document', ar: 'رفع مستند العقد' }}
 acceptedTypes=".pdf,.doc,.docx"
 />

 {/* Edit Modal */}
 {showEditModal && (
 <EditEmploymentContractModal
 employee={employee}
 onClose={() => setShowEditModal(false)}
 onSave={handleEmployeeUpdated}
 />
 )}
 </div>
 );
}