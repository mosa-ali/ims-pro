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

interface Props {
  employee: StaffMember;
  language: string;
  isRTL: boolean;
  onEmployeeUpdate?: () => void;
}

export function EmploymentContractCard({ employee, language, isRTL, onEmployeeUpdate }: Props) {
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

  const t = {
    title: language === 'en' ? 'Employment & Contract' : 'التوظيف والعقد',
    subtitle: language === 'en' ? 'Contract history and employment records' : 'سجل العقود والتوظيف',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    
    currentContract: language === 'en' ? 'Current Contract' : 'العقد الحالي',
    contractType: language === 'en' ? 'Contract Type' : 'نوع العقد',
    startDate: language === 'en' ? 'Start Date' : 'تاريخ البداية',
    endDate: language === 'en' ? 'End Date' : 'تاريخ النهاية',
    position: language === 'en' ? 'Position' : 'المنصب',
    department: language === 'en' ? 'Department' : 'القسم',
    projects: language === 'en' ? 'Projects' : 'المشاريع',
    salary: language === 'en' ? 'Salary' : 'الراتب',
    status: language === 'en' ? 'Status' : 'الحالة',
    
    contractHistory: language === 'en' ? 'Contract History' : 'سجل العقود',
    addContract: language === 'en' ? 'Add Contract' : 'إضافة عقد',
    uploadDocument: language === 'en' ? 'Upload Document' : 'رفع مستند',
    
    active: language === 'en' ? 'Active' : 'نشط',
    expired: language === 'en' ? 'Expired' : 'منتهي',
    terminated: language === 'en' ? 'Terminated' : 'موقوف',
    
    noContracts: language === 'en' ? 'No contract records found' : 'لا توجد سجلات عقود'
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
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
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.title}
            </h3>
            <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.subtitle}
            </p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className={`flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Edit className="w-4 h-4" />
            <span>{t.edit}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Current Employment Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-gray-500 mb-1">{t.contractType}</p>
            <p className="text-sm text-gray-900 font-medium">{employee.contractType}</p>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-gray-500 mb-1">{t.position}</p>
            <p className="text-sm text-gray-900 font-medium">{employee.position}</p>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-gray-500 mb-1">{t.department}</p>
            <p className="text-sm text-gray-900 font-medium">{employee.department}</p>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-gray-500 mb-1">{t.startDate}</p>
            <p className="text-sm text-gray-900 font-medium">{formatDate(employee.contractStartDate)}</p>
          </div>
          {employee.contractEndDate && (
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-xs text-gray-500 mb-1">{t.endDate}</p>
              <p className="text-sm text-gray-900 font-medium">{formatDate(employee.contractEndDate)}</p>
            </div>
          )}
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-gray-500 mb-1">{t.projects}</p>
            <p className="text-sm text-gray-900 font-medium">{employee.projects.join(', ')}</p>
          </div>
        </div>

        {/* Contract History */}
        {contracts.length > 0 && (
          <div>
            <h4 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.contractHistory}
            </h4>
            <div className="space-y-3">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <p className="text-sm font-medium text-gray-900">{contract.contractType}</p>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(contract.status)}`}>
                          {t[contract.status as keyof typeof t] || contract.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {formatDate(contract.startDate)} - {contract.endDate ? formatDate(contract.endDate) : language === 'en' ? 'Ongoing' : 'مستمر'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {contract.position} • {contract.department}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {contract.signedDocumentId ? (
                        <button
                          onClick={() => fileStorageService.downloadFile(contract.signedDocumentId!)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title={language === 'en' ? 'Download' : 'تحميل'}
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
                          title={t.uploadDocument}
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
            <p>{t.noContracts}</p>
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