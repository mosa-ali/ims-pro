// ============================================================================
// BID RECEIPT ACKNOWLEDGEMENT - PROFESSIONAL PRINT LAYOUT
// Integrated Management System (IMS)
// 100% SPECIFICATION COMPLIANT - EN/AR BILINGUAL
// ============================================================================

import { formatDate } from '@/utils/formatters';
import React from 'react';
import { getOrganizationSettings } from '@/services/organizationService';
import type { ProcurementRequest, TenderBidder } from '@/types/logistics.types';

interface Props {
  pr: ProcurementRequest;
  bidder: TenderBidder;
  noticeId?: string;
  language: 'en' | 'ar';
  isRTL: boolean;
}

export function BidReceiptAcknowledgementPrint({ pr, bidder, noticeId, language, isRTL }: Props) {
  const orgSettings = getOrganizationSettings();
  const orgName = language === 'ar' && orgSettings.nameAr ? orgSettings.nameAr : orgSettings.name;

  const t = {
    en: {
      docTitle: 'Bid Receipt Acknowledgement',
      docSubTitle: 'Formal Procurement Control Document',
      prNumber: 'PR Reference No.',
      noticeId: 'Tender Notice ID',
      submissionDate: 'Submission Date',
      bidderName: 'Bidder / Company Name',
      offerAmount: 'Total Offer Cost',
      operatingUnit: 'Operating Unit',
      projectName: 'Project Name',
      acknowledgementStatement: 'This document confirms that the above-mentioned bidder has submitted a bid in response to the referenced tender. Receipt does not imply evaluation, qualification, or acceptance of the bid. The evaluation will be conducted following the formal closing of the announcement period in accordance with the organization\'s procurement policy.',
      orgSection: 'FOR ORGANIZATION ACKNOWLEDGEMENT',
      bidderSection: 'FOR BIDDER REPRESENTATIVE',
      nameTitle: 'Name & Title',
      date: 'Date',
      seal: 'Name / Company Seal',
      signature: 'Signature',
      original: 'ORIGINAL ISSUANCE',
      reprint: 'OFFICIAL REPRINT',
      systemRef: 'System Audit Ref',
      printDate: 'Print Date',
      notSpecified: 'N/A'
    },
    ar: {
      docTitle: 'إقرار استلام عطاء',
      docSubTitle: 'وثيقة رقابة مشتريات رسمية',
      prNumber: 'رقم مرجع طلب الشراء (PR)',
      noticeId: 'رقم إعلان المناقصة',
      submissionDate: 'تاريخ التقديم',
      bidderName: 'اسم مقدم العرض / الشركة',
      offerAmount: 'إجمالي مبلغ العرض',
      operatingUnit: 'وحدة التشغيل',
      projectName: 'اسم المشروع',
      acknowledgementStatement: 'تؤكد هذه الوثيقة أن مقدم العرض المذكور أعلاه قد قدم عطاءً استجابة للمناقصة المشار إليها. لا يعني الاستلام تقييماً أو تأهيلاً أو قبولاً للعطاء. سيتم إجراء التقييم بعد الإغلاق الرسمي لفترة الإعلان وفقاً لسياسة المشتريات الخاصة بالمنظمة.',
      orgSection: 'إقرار جهة العمل (المنظمة)',
      bidderSection: 'إقرار ممثل مقدم العرض',
      nameTitle: 'الاسم والمسمى الوظيفي',
      date: 'التاريخ',
      seal: 'الاسم / ختم الشركة',
      signature: 'التوقيع',
      original: 'إصدار أصلي',
      reprint: 'إعادة طباعة رسمية',
      systemRef: 'مرجع تدقيق النظام',
      printDate: 'تاريخ الطباعة',
      notSpecified: 'غير محدد'
    }
  };

  const trans = language === 'en' ? t.en : t.ar;

  const formatDate = (dateString: string) => {
    if (!dateString) return trans.notSpecified;
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="print-document bg-white p-4">
      {/* PRINT HEADER */}
      <div className="mb-8">
        {/* Logo + Organization Name Row */}
        <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-2xl font-bold text-black">{orgName}</h2>
            <h3 className="text-xl font-semibold text-gray-800 mt-1">{trans.docTitle}</h3>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mt-1">{trans.docSubTitle}</p>
          </div>
          
          {(orgSettings.logo || pr.organizationLogo) && (
            <img 
              src={orgSettings.logo || pr.organizationLogo} 
              alt="Organization Logo" 
              className="h-20 w-auto object-contain flex-shrink-0"
            />
          )}
        </div>
        
        {/* Document Info Bar */}
        <div className={`grid grid-cols-2 gap-4 text-sm pt-4 border-t-4 border-black ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="space-y-1">
            <p><span className="font-bold uppercase text-[10px] text-gray-500 block">{trans.prNumber}</span> <span className="text-lg font-black">{pr.prNumber}</span></p>
            <p><span className="font-bold uppercase text-[10px] text-gray-500 block">{trans.noticeId}</span> <span className="font-bold">{noticeId || trans.notSpecified}</span></p>
          </div>
          <div className={`space-y-1 ${isRTL ? 'text-left' : 'text-right'}`}>
            <p><span className="font-bold uppercase text-[10px] text-gray-500 block">{trans.printDate}</span> <span className="font-medium">{new Date().toLocaleString(language === 'en' ? 'en-US' : 'ar-SA')}</span></p>
            <p><span className="font-bold uppercase text-[10px] text-gray-500 block">{trans.operatingUnit}</span> <span className="font-bold">{pr.operatingUnitName || 'Headquarters'}</span></p>
          </div>
        </div>
      </div>

      {/* CORE DETAILS SECTION */}
      <div className="mb-10 bg-gray-50 p-6 border-2 border-gray-200 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{trans.bidderName}</label>
              <p className="text-xl font-black text-gray-900 uppercase">{bidder.name}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{trans.submissionDate}</label>
              <p className="text-lg font-bold text-gray-900">{formatDate(bidder.submissionDate)}</p>
            </div>
          </div>
          
          <div className={`space-y-4 ${isRTL ? 'text-left' : 'text-right'}`}>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{trans.projectName}</label>
              <p className="text-lg font-bold text-gray-900">{pr.projectName || trans.notSpecified}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{trans.operatingUnit}</label>
              <p className="text-lg font-bold text-gray-900">{pr.operatingUnitName || 'Headquarters'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* OFFICIAL STATEMENT */}
      <div className="mb-12 p-8 border-2 border-dashed border-gray-400 bg-white rounded-xl">
        <p className="text-sm font-bold text-gray-700 leading-relaxed italic text-center">
          "{trans.acknowledgementStatement}"
        </p>
      </div>

      {/* SIGNATURE SECTION */}
      <div className={`grid grid-cols-2 gap-16 pt-8 ${isRTL ? 'direction-rtl' : ''}`}>
        <div className="space-y-8">
          <p className="text-[10px] font-black text-gray-900 uppercase border-b-2 border-black pb-2 tracking-tighter">{trans.orgSection}</p>
          <div className="space-y-6">
            <div className="h-16 border-b border-gray-300"></div>
            <p className="text-xs font-bold text-gray-400 uppercase text-center">{trans.signature}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">{trans.nameTitle}</p>
                <div className="h-8 border-b border-gray-100"></div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">{trans.date}</p>
                <div className="h-8 border-b border-gray-100"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <p className="text-[10px] font-black text-gray-900 uppercase border-b-2 border-black pb-2 tracking-tighter">{trans.bidderSection}</p>
          <div className="space-y-6">
            <div className="h-16 border-b border-gray-300"></div>
            <p className="text-xs font-bold text-gray-400 uppercase text-center">{trans.signature}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">{trans.seal}</p>
                <div className="h-8 border-b border-gray-100"></div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">{trans.date}</p>
                <div className="h-8 border-b border-gray-100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER METADATA */}
      <div className="mt-24 pt-8 border-t border-gray-100 text-center">
        <div className="inline-block px-4 py-1 bg-gray-900 text-white text-[9px] font-black uppercase tracking-[0.3em] rounded mb-2">
          {bidder.receiptPrinted ? trans.reprint : trans.original}
        </div>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          {trans.systemRef}: <span className="text-gray-600">{bidder.id}</span>
        </p>
      </div>
    </div>
  );
}
