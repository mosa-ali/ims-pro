// ============================================================================
// COMPETITIVE BID ANALYSIS PRINT MODAL
// Print preview and isolation using #print-area technique
// Integrated Management System (IMS)
// ============================================================================

import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CompetitiveBidAnalysisPrint } from './CompetitiveBidAnalysisPrint';
import type { CompetitiveBidAnalysis } from '@/types/logistics.types';

interface Props {
  cba: CompetitiveBidAnalysis;
  onClose: () => void;
}

export function CompetitiveBidAnalysisPrintModal({ cba, onClose }: Props) {
  const { language } = useLanguage();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const translations = {
    printPreview: language === 'en' ? 'Print Preview' : 'معاينة الطباعة',
    print: language === 'en' ? 'Print' : 'طباعة',
    close: language === 'en' ? 'Close' : 'إغلاق'
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full h-full max-w-7xl bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Modal Header - NO PRINT */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 no-print">
          <h2 className="text-xl font-bold text-gray-900">{translations.printPreview}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              {translations.print}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Preview Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-8 no-print">
          <div className="mx-auto bg-white shadow-lg" style={{ width: '210mm' }}>
            <div ref={printAreaRef} id="print-area">
              <CompetitiveBidAnalysisPrint cba={cba} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
