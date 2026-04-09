// ============================================================================
// RFQ PRINT MODAL - Print Preview & PDF Export
// ============================================================================

import { X, Printer } from 'lucide-react';
import { RFQPrint } from './RFQPrint';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import type { RequestForQuotation } from '@/services/rfqService';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rfq: RequestForQuotation;
}

export function RFQPrintModal({
  isOpen,
  onClose,
  rfq
}: Props) {
  const { language, isRTL } = useLanguage();

  const t = {
    en: {
      title: 'Print Request for Quotation',
      close: 'Close',
      print: 'Print / Download PDF',
      info: 'The PDF is an official document equal to a printed copy'
    },
    ar: {
      title: 'طباعة طلب عرض أسعار',
      close: 'إغلاق',
      print: 'طباعة / تنزيل PDF',
      info: 'ملف PDF هو وثيقة رسمية تعادل نسخة مطبوعة'
    }
  };

  const trans = language === 'en' ? t.en : t.ar;

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header (Print Hidden) */}
        <div
          className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div>
            <h2 className="text-xl font-bold text-gray-900">{trans.title}</h2>
            <p className="text-sm text-blue-600 mt-1">
              ℹ️ {trans.info}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Print Content - With #print-area ID for isolation */}
        <div
          id="print-area"
          className="px-6 py-4 overflow-y-auto flex-grow print:p-0"
        >
          <RFQPrint 
            rfq={rfq}
            language={language}
            isRTL={isRTL}
          />
        </div>

        {/* Footer (Print Hidden) */}
        <div
          className={`px-6 py-4 border-t border-gray-200 flex items-center justify-between print:hidden ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 ${isRTL ? 'mr-auto' : 'ml-auto'}`}
          >
            {trans.close}
          </button>
          <button
            onClick={handlePrint}
            className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Printer className="w-5 h-5" />
            <span>{trans.print}</span>
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
