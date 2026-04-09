// ============================================================================
// BID RECEIPT ACKNOWLEDGEMENT - PRINT MODAL
// Integrated Management System (IMS)
// ============================================================================

import React, { useState } from 'react';
import { X, Printer, Languages } from 'lucide-react';
import { BidReceiptAcknowledgementPrint } from './BidReceiptAcknowledgementPrint';
import { useTranslation } from '@/i18n/useTranslation';
import type { ProcurementRequest, TenderBidder } from '@/types/logistics.types';
import { useLanguage } from '@/contexts/LanguageContext';
interface Props {
 pr: ProcurementRequest;
 bidder: TenderBidder;
 noticeId?: string;
 isOpen: boolean;
 onClose: () => void;
 onPrinted?: () => void;
}

export function BidReceiptAcknowledgementPrintModal({
 pr, 
 bidder, 
 noticeId,
 isOpen, 
 onClose,
 onPrinted 
}: Props) {
 const { t } = useTranslation();
  const { isRTL } = useLanguage(); 
 const [language, setLanguage] = useState<'en' | 'ar'>('en');

 if (!isOpen) return null;

 const handlePrint = () => {
 window.print();
 if (onPrinted) onPrinted();
 };

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
 
 {/* MODAL HEADER */}
 <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
 <div className="flex items-center gap-3">
 <div className="bg-blue-600 p-2 rounded-lg text-white">
 <Printer className="w-5 h-5" />
 </div>
 <div>
 <h2 className="text-lg font-bold text-gray-900">{isRTL ? 'طباعة إيصال العطاء' : 'Print Bid Receipt'}</h2>
 <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Reference: {pr.prNumber} | Bidder: {bidder.name}</p>
 </div>
 </div>
 
 <div className="flex items-center gap-4">
 {/* Language Toggle */}
 <div className="flex bg-gray-100 p-1 rounded-lg">
 <button 
 onClick={() => setLanguage('en')}
 className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${ t.procurement.bgwhiteTextblue600Shadowsm }`}
 >
 ENGLISH
 </button>
 <button 
 onClick={() => setLanguage('ar')}
 className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${ t.procurement.textgray500Hovertextgray700 }`}
 >
 العربية
 </button>
 </div>

 <button 
 onClick={handlePrint}
 className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
 >
 <Printer className="w-4 h-4" />
 Print Document
 </button>
 
 <button 
 onClick={onClose}
 className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* PRINT PREVIEW AREA */}
 <div className="flex-1 overflow-y-auto p-12 bg-gray-50/50">
 <div className="mx-auto bg-white shadow-xl ring-1 ring-gray-200 p-8 min-h-[11in] w-full max-w-[8.5in]">
 {/* The Print Component */}
 <div className="print-content">
 <BidReceiptAcknowledgementPrint 
 pr={pr}
 bidder={bidder}
 noticeId={noticeId}
 language={language}
 isRTL={language === 'ar'}
 />
 </div>
 </div>
 </div>

 {/* MODAL FOOTER */}
 <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white sticky bottom-0 z-10">
 <p className="me-auto text-[10px] text-gray-400 font-medium flex items-center gap-1">
 <Languages className="w-3 h-3" />
 Selected Language: {t.procurement.englishLtr}
 </p>
 <button 
 onClick={onClose}
 className="px-6 py-2 text-gray-600 font-bold text-sm hover:bg-gray-50 rounded-xl transition-colors"
 >
 Close Preview
 </button>
 </div>
 </div>

 <style dangerouslySetInnerHTML={{ __html: `
 @media print {
 body * { visibility: hidden !important; }
 .print-content, .print-content * { visibility: visible !important; }
 .print-content {
 position: absolute !important;
 left: 0 !important;
 top: 0 !important;
 width: 100% !important;
 margin: 0 !important;
 padding: 0 !important;
 }
 @page { size: A4; margin: 10mm; }
 }
 `}} />
 </div>
 );
}
