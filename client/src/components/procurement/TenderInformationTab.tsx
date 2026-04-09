// ============================================================================
// TENDER INFORMATION TAB COMPONENT
// Integrated Management System (IMS)
// 100% SPECIFICATION COMPLIANT
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
 Megaphone, 
 Users, 
 Calendar, 
 Globe, 
 Plus, 
 Trash2, 
 Printer, 
 Clock,
 ExternalLink,
 ShieldCheck,
 FileText
} from 'lucide-react';
import { tenderAnnouncementService } from '@/services/tenderAnnouncementService';
import { useAuth } from '@/_core/hooks/useAuth';
import { BidReceiptAcknowledgementPrintModal } from '@/components/procurement/BidReceiptAcknowledgementPrintModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import type { 
 ProcurementRequest, 
 TenderAnnouncement, 
 TenderBidder 
} from '@/types/logistics.types';

interface Props {
 pr: ProcurementRequest;
 language: 'en' | 'ar';
 onUpdate?: () => void;
}

export function TenderInformationTab({
 pr, language, onUpdate }: Props) {
 const { t } = useTranslation();
 const { user } = useAuth();
 const [announcement, setAnnouncement] = useState<TenderAnnouncement | null>(null);
 const [showAddBidder, setShowAddBidder] = useState(false);
 const [printModalBidder, setPrintModalBidder] = useState<TenderBidder | null>(null);
 
 const [newBidder, setNewBidder] = useState({
 name: '',
 submissionDate: new Date().toISOString().split('T')[0],
 totalOfferCost: 0,
 currency: pr.currency,
 status: 'received' as const
 });

 useEffect(() => {
 const data = tenderAnnouncementService.initializeAnnouncement(pr.id, pr.prNumber, user?.id || 'system');
 setAnnouncement(data);
 }, [pr.id, user]);

 if (!announcement) return null;

 const handleAnnouncementChange = (field: keyof TenderAnnouncement, value: any) => {
 const updated = { ...announcement, [field]: value };
 setAnnouncement(updated);
 tenderAnnouncementService.saveAnnouncement(updated);
 };

 const handleAddBidder = () => {
 if (!newBidder.name) return;
 tenderAnnouncementService.addBidder(announcement.id, newBidder);
 const data = tenderAnnouncementService.getAnnouncementByPRId(pr.id);
 setAnnouncement(data);
 setShowAddBidder(false);
 setNewBidder({
 name: '',
 submissionDate: new Date().toISOString().split('T')[0],
 totalOfferCost: 0,
 currency: pr.currency,
 status: 'received'
 });
 if (onUpdate) onUpdate();
 };

 const handleDeleteBidder = (bidderId: string) => {
 if (confirm(isRTL ? 'حذف هذا المتقدم؟' : 'Delete this bidder entry?')) {
 const updatedBidders = announcement.bidders.filter(b => b.id !== bidderId);
 const updated = { ...announcement, bidders: updatedBidders };
 setAnnouncement(updated);
 tenderAnnouncementService.saveAnnouncement(updated);
 if (onUpdate) onUpdate();
 }
 };

 const handleMarkAsPrinted = (bidderId: string) => {
 tenderAnnouncementService.markReceiptPrinted(announcement.id, bidderId);
 const data = tenderAnnouncementService.getAnnouncementByPRId(pr.id);
 setAnnouncement(data);
 if (onUpdate) onUpdate();
 };

 const { language, isRTL} = useLanguage();
 const today = new Date().toISOString().split('T')[0];
 const isExpired = announcement.endDate && today >= announcement.endDate;

 return (
 <div className="space-y-8 animate-in fade-in duration-500">
 
 {/* 📢 ANNOUNCEMENT DETAILS */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
 <div className="bg-blue-600 px-6 py-4 border-b border-blue-700 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="bg-blue-500 p-2 rounded-lg text-white">
 <Megaphone className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-white uppercase tracking-wider">
 {t.procurement.tenderAnnouncementDetails}
 </h3>
 <p className="text-[10px] text-blue-100 font-medium">{isRTL ? 'مناقصة عامة - طلب شراء > 25,000 دولار' : 'Public Tender - PR > USD 25,000'}</p>
 </div>
 </div>
 {isExpired && (
 <div className="bg-white/10 px-3 py-1 rounded-full flex items-center gap-2">
 <Clock className="w-3 h-3 text-white" />
 <span className="text-[10px] font-bold text-white uppercase">{isRTL ? 'تم إغلاق الإعلان' : 'Announcement Closed'}</span>
 </div>
 )}
 </div>

 <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 {t.procurement.startDate}
 </label>
 <input 
 type="date"
 value={announcement.startDate}
 onChange={(e) => handleAnnouncementChange('startDate', e.target.value)}
 className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 {t.procurement.endDate}
 </label>
 <input 
 type="date"
 value={announcement.endDate}
 min={announcement.startDate}
 onChange={(e) => handleAnnouncementChange('endDate', e.target.value)}
 className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
 <Globe className="w-3 h-3" />
 {t.procurement.announcementChannel}
 </label>
 <select 
 value={announcement.channel}
 onChange={(e) => handleAnnouncementChange('channel', e.target.value)}
 className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
 >
 <option value="website">Website</option>
 <option value="newspaper">Newspaper</option>
 <option value="donor_portal">{isRTL ? 'بوابة المانحين' : 'Donor Portal'}</option>
 <option value="other">Other</option>
 </select>
 </div>

 <div className="md:col-span-2 space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
 <ExternalLink className="w-3 h-3" />
 {t.procurement.announcementLinkReferenceUrl}
 </label>
 <input 
 type="url"
 placeholder="https://..."
 value={announcement.referenceUrl || ''}
 onChange={(e) => handleAnnouncementChange('referenceUrl', e.target.value)}
 className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
 <FileText className="w-3 h-3" />
 {t.procurement.noticeIdReference}
 </label>
 <input 
 type="text"
 placeholder={t.placeholders.eGTender2026001}
 value={announcement.noticeId || ''}
 onChange={(e) => handleAnnouncementChange('noticeId', e.target.value)}
 className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>

 {/* 👥 BIDDER SUMMARY */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
 <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Users className="w-5 h-5 text-gray-600" />
 <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
 {t.procurement.biddersSubmissionRegistry}
 </h3>
 </div>
 <button 
 onClick={() => setShowAddBidder(true)}
 className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
 >
 <Plus className="w-3 h-3" />
 {t.procurement.registerNewBidder}
 </button>
 </div>

 {showAddBidder && (
 <div className="p-6 bg-gray-50 border-b border-gray-200 animate-in slide-in-from-top duration-300">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-gray-500 uppercase">{isRTL ? 'اسم المتقدم' : 'Bidder Name'}</label>
 <input 
 type="text" 
 value={newBidder.name}
 onChange={(e) => setNewBidder({...newBidder, name: e.target.value})}
 className="w-full p-2 bg-white border border-gray-300 rounded text-sm font-bold"
 placeholder={t.placeholders.companyLegalName}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-gray-500 uppercase">{isRTL ? 'تاريخ الاستلام' : 'Date Received'}</label>
 <input 
 type="date" 
 value={newBidder.submissionDate}
 onChange={(e) => setNewBidder({...newBidder, submissionDate: e.target.value})}
 className="w-full p-2 bg-white border border-gray-300 rounded text-sm"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-gray-500 uppercase">{isRTL ? `إجمالي العرض (${pr.currency})` : `Total Offer (${pr.currency})`}</label>
 <input 
 type="number" 
 value={newBidder.totalOfferCost}
 onChange={(e) => setNewBidder({...newBidder, totalOfferCost: parseFloat(e.target.value) || 0})}
 className="w-full p-2 bg-white border border-gray-300 rounded text-sm font-bold"
 />
 </div>
 <div className="flex items-end gap-2">
 <button 
 onClick={handleAddBidder}
 className="flex-1 p-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700"
 >
 {isRTL ? 'تسجيل عطاء' : 'Register Bid'}
 </button>
 <button 
 onClick={() => setShowAddBidder(false)}
 className="p-2 bg-gray-200 text-gray-600 rounded text-sm font-bold hover:bg-gray-300"
 >
 {isRTL ? 'إلغاء' : 'Cancel'}
 </button>
 </div>
 </div>
 </div>
 )}

 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50/50">
 <th className="px-6 py-3 text-start text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">{isRTL ? 'اسم المتقدم' : 'Bidder Name'}</th>
 <th className="px-6 py-3 text-start text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">{isRTL ? 'تاريخ الاستلام' : 'Date Received'}</th>
 <th className="px-6 py-3 text-end text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">{isRTL ? 'إجمالي العرض' : 'Total Offer'}</th>
 <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">{isRTL ? 'الحالة' : 'Status'}</th>
 <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">{isRTL ? 'الإيصال' : 'Receipt'}</th>
 <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">{isRTL ? 'الإجراءات' : 'Actions'}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {announcement.bidders.length === 0 ? (
 <tr>
 <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 font-medium">
 {isRTL ? 'لم يتم تسجيل أي عطاءات بعد لهذا الإعلان.' : 'No bids registered yet for this tender announcement.'}
 </td>
 </tr>
 ) : (
 announcement.bidders.map((bidder) => (
 <tr key={bidder.id} className="hover:bg-gray-50/30">
 <td className="px-6 py-4 text-sm font-bold text-gray-900">{bidder.name}</td>
 <td className="px-6 py-4 text-sm text-gray-600">{bidder.submissionDate}</td>
 <td className="px-6 py-4 text-sm font-black text-gray-900 text-end">
 {bidder.currency} {bidder.totalOfferCost.toLocaleString()}
 </td>
 <td className="px-6 py-4 text-center">
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ bidder.status === 'disqualified' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700' }`}>
 {bidder.status}
 </span>
 </td>
 <td className="px-6 py-4 text-center">
 <button 
 onClick={() => setPrintModalBidder(bidder)}
 className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border text-[10px] font-bold transition-colors ${ bidder.receiptPrinted ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50' }`}
 >
 <Printer className="w-3 h-3" />
 {bidder.receiptPrinted ? (isRTL ? 'إعادة طباعة' : 'REPRINT') : (isRTL ? 'طباعة الإيصال' : 'PRINT RECEIPT')}
 </button>
 </td>
 <td className="px-6 py-4 text-end">
 <button 
 onClick={() => handleDeleteBidder(bidder.id)}
 className="text-gray-400 hover:text-red-600 transition-colors"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* 🧭 USER MESSAGE / BLOCKER */}
 <div className={`p-6 rounded-xl border flex items-start gap-4 ${ isExpired ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200' }`}>
 <div className={`p-2 rounded-lg ${isExpired ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
 {isExpired ? <ShieldCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
 </div>
 <div>
 <h4 className={`text-sm font-bold uppercase tracking-wider mb-1 ${isExpired ? 'text-green-900' : 'text-yellow-900'}`}>
 {isExpired ? (isRTL ? 'انتهت فترة المناقصة' : 'Tender Period Completed') : (isRTL ? 'فترة إعلان المناقصة نشطة' : 'Tender Announcement Period Active')}
 </h4>
 <p className={`text-sm font-medium ${isExpired ? 'text-green-700' : 'text-yellow-700'}`}>
{isExpired 
	 ? (isRTL ? 'انتهت فترة الإعلان. تحليل العطاءات مصرح به الآن.' : 'The announcement period has closed. Bid Analysis (BA/CBA) is now authorized.') 
	 : (isRTL ? 'فترة إعلان المناقصة لا تزال مفتوحة. لا يمكن إنشاء تحليل العطاءات إلا بعد تاريخ انتهاء الإعلان.' : 'Tender announcement period is still open. Bid Analysis (BA) can only be created after the announcement end date.')}
 </p>
 </div>
 </div>

 {/* 🖨️ PROFESSIONAL PRINT MODAL */}
 {printModalBidder && (
 <BidReceiptAcknowledgementPrintModal 
 pr={pr}
 bidder={printModalBidder}
 noticeId={announcement.noticeId}
 isOpen={!!printModalBidder}
 onClose={() => setPrintModalBidder(null)}
 onPrinted={() => handleMarkAsPrinted(printModalBidder.id)}
 />
 )}
 </div>
 );
}
