import React, { useState, useEffect } from 'react';
import { X, Search, FileText, DollarSign, Calendar, Building2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { procurementRequestService } from '@/services/procurementRequestService';
import { determineProcurementProcess } from '@/types/logistics.types';
import type { ProcurementRequest } from '@/types/logistics.types';

interface PRSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPR: (pr: ProcurementRequest) => void;
}

export function PRSelectionModal({ isOpen, onClose, onSelectPR }: PRSelectionModalProps) {
  const { language, isRTL } = useLanguage();
  const { currentOperatingUnit } = useOperatingUnit();
  const [searchTerm, setSearchTerm] = useState('');
  const [approvedPRs, setApprovedPRs] = useState<ProcurementRequest[]>([]);
  const [selectedPR, setSelectedPR] = useState<ProcurementRequest | null>(null);

  const t = {
    en: {
      title: 'Select Procurement Request',
      subtitle: 'System will automatically determine if Quotation Analysis or Bid Analysis is required based on the PR amount',
      search: 'Search PR Number, description...',
      prNumber: 'PR Number',
      description: 'Description',
      amount: 'Total Amount',
      requestDate: 'Request Date',
      department: 'Department',
      processType: 'Process Type',
      noApprovedPRs: 'No Approved Procurement Requests',
      noApprovedPRsDesc: 'There are no approved PRs available for analysis. PRs must be approved before creating quotation or bid analysis.',
      cancel: 'Cancel',
      selectContinue: 'Select & Continue',
      selectPRFirst: 'Please select a PR to continue',
      
      // Process Types
      single_quotation: 'Single Quotation (1 quote)',
      multiple_quotations: 'Multiple Quotations (min 3 quotes)',
      extended_quotations: 'Extended Quotations (3-5 quotes)',
      tender: 'Formal Tender / CBA',
      
      costRange: 'Cost Range'
    },
    ar: {
      title: 'اختر طلب الشراء',
      subtitle: 'سيحدد النظام تلقائيًا ما إذا كان تحليل عروض الأسعار أو تحليل المناقصات مطلوبًا بناءً على مبلغ طلب الشراء',
      search: 'ابحث في رقم طلب الشراء، الوصف...',
      prNumber: 'رقم طلب الشراء',
      description: 'الوصف',
      amount: 'المبلغ الإجمالي',
      requestDate: 'تاريخ الطلب',
      department: 'القسم',
      processType: 'نوع العملية',
      noApprovedPRs: 'لا توجد طلبات شراء معتمدة',
      noApprovedPRsDesc: 'لا توجد طلبات شراء معتمدة متاحة للتحليل. يجب الموافقة على طلبات الشراء قبل إنشاء تحليل عروض الأسعار أو المناقصات.',
      cancel: 'إلغاء',
      selectContinue: 'اختر ومتابعة',
      selectPRFirst: 'الرجاء اختيار طلب شراء للمتابعة',
      
      // Process Types
      single_quotation: 'عرض سعر واحد (عرض واحد)',
      multiple_quotations: 'عروض أسعار متعددة (3 عروض كحد أدنى)',
      extended_quotations: 'عروض أسعار موسعة (3-5 عروض)',
      tender: 'مناقصة رسمية / تحليل المناقصات التنافسية',
      
      costRange: 'نطاق التكلفة'
    }
  };

  const translations = language === 'en' ? t.en : t.ar;

  // Load approved PRs
  useEffect(() => {
    if (isOpen) {
      const allPRs = procurementRequestService.getAllRequests();
      const approved = allPRs.filter(pr => 
        pr.status === 'approved' && 
        pr.operatingUnitId === currentOperatingUnit?.id
      );
      setApprovedPRs(approved);
      setSelectedPR(null);
      setSearchTerm('');
    }
  }, [isOpen, currentOperatingUnit]);

  // Filter PRs based on search
  const filteredPRs = approvedPRs.filter(pr => {
    const searchLower = searchTerm.toLowerCase();
    return (
      pr.prNumber.toLowerCase().includes(searchLower) ||
      pr.description.toLowerCase().includes(searchLower) ||
      pr.requestingDepartment.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = () => {
    if (selectedPR) {
      onSelectPR(selectedPR);
      onClose();
    }
  };

  const getProcessInfo = (costUSD: number) => {
    const process = determineProcurementProcess(costUSD);
    return {
      type: process.processType,
      label: translations[process.processType as keyof typeof translations] || process.processType,
      range: costUSD <= 1000 ? '$0 - $1,000' :
             costUSD <= 5000 ? '$1,001 - $5,000' :
             costUSD <= 25000 ? '$5,001 - $25,000' :
             '> $25,000',
      color: costUSD <= 1000 ? 'bg-green-100 text-green-800 border-green-200' :
             costUSD <= 5000 ? 'bg-blue-100 text-blue-800 border-blue-200' :
             costUSD <= 25000 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
             'bg-red-100 text-red-800 border-red-200'
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{translations.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{translations.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={translations.search}
              className={`w-full border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
            />
          </div>
        </div>

        {/* PR List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredPRs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {translations.noApprovedPRs}
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                {translations.noApprovedPRsDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPRs.map((pr) => {
                const processInfo = getProcessInfo(pr.totalEstimatedCost);
                const isSelected = selectedPR?.id === pr.id;
                
                return (
                  <button
                    key={pr.id}
                    onClick={() => setSelectedPR(pr)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <FileText className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1">
                            {pr.prNumber}
                          </div>
                          <div className="text-sm text-gray-600 line-clamp-2">
                            {pr.description}
                          </div>
                        </div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${processInfo.color} whitespace-nowrap`}>
                        {processInfo.label}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{translations.amount}</div>
                        <div className="font-semibold text-gray-900">
                          {pr.currency} {pr.totalEstimatedCost.toLocaleString()}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{translations.costRange}</div>
                        <div className="font-medium text-gray-700">
                          {processInfo.range}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{translations.requestDate}</div>
                        <div className="font-medium text-gray-700">
                          {new Date(pr.requestDate).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-500 text-xs mb-1">{translations.department}</div>
                        <div className="font-medium text-gray-700 truncate">
                          {pr.requestingDepartment}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedPR ? (
              <span className="font-medium text-gray-900">
                {translations.processType}: {getProcessInfo(selectedPR.totalEstimatedCost).label}
              </span>
            ) : (
              translations.selectPRFirst
            )}
          </div>
          
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              {translations.cancel}
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedPR}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedPR
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {translations.selectContinue}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
