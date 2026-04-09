// ============================================================================
// REQUEST FOR QUOTATION - PROFESSIONAL PRINT LAYOUT
// Matches PR print standard with proper document structure
// ============================================================================

import { formatDate } from '@/utils/formatters';
import { getOrganizationSettings } from '@/services/organizationService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import type { RequestForQuotation } from '@/services/rfqService';

interface Props {
 rfq: RequestForQuotation;
 language: 'en' | 'ar';
 isRTL: boolean;
}

export function RFQPrint({
 rfq, language, isRTL }: Props) {
 const { t } = useTranslation();
 const orgSettings = getOrganizationSettings();
 const orgName = language === 'ar' && orgSettings.nameAr ? orgSettings.nameAr : orgSettings.name;

 const localT = {
 en: {
 docTitle: 'Request for Quotation (RFQ)',
 rfqNumber: 'RFQ Reference No.',
 prNumber: 'PR Reference No.',
 issueDate: 'Issue Date',
 submissionDeadline: 'Submission Deadline',
 procurementMethod: 'Procurement Method',
 currency: 'Currency',
 operatingUnit: 'Operating Unit',
 country: 'Country',
 contactPerson: 'Contact Person',
 email: 'Email',
 phone: 'Phone',
 contactInfo: 'Contact Information',
 deliveryLocation: 'Delivery Location',
 requiredDeliveryDate: 'Required Delivery Date',
 deliveryRequirements: 'Delivery Requirements',
 itemsRequested: 'Items Requested',
 itemNo: '#',
 description: 'Item Description',
 specification: 'Specification',
 qty: 'Quantity',
 unit: 'Unit',
 termsConditions: 'Terms & Conditions',
 suppliers: 'Suppliers / Bidders',
 supplierName: 'Supplier Name',
 contactPersonCol: 'Contact Person',
 emailCol: 'Email',
 phoneCol: 'Phone',
 responseDeadline: 'Response Deadline',
 status: 'Status',
 preparedBy: 'Prepared By',
 approvedBy: 'Approved By',
 name: 'Name',
 date: 'Date',
 signature: 'Signature',
 // Procurement Methods
 quotation: 'Quotation',
 tender: 'Tender (> USD 25K)',
 // Default values
 noSuppliers: 'No suppliers added yet',
 noItems: 'No items',
 noTerms: 'Standard terms and conditions apply',
 notSpecified: 'N/A'
 },
 ar: {
 docTitle: 'طلب عرض أسعار (RFQ)',
 rfqNumber: 'رقم المرجع RFQ',
 prNumber: 'رقم المرجع PR',
 issueDate: 'تاريخ الإصدار',
 submissionDeadline: 'آخر موعد للتقديم',
 procurementMethod: 'طريقة الشراء',
 currency: 'العملة',
 operatingUnit: 'وحدة التشغيل',
 country: 'البلد',
 contactPerson: 'جهة الاتصال',
 email: 'البريد الإلكتروني',
 phone: 'الهاتف',
 contactInfo: 'معلومات الاتصال',
 deliveryLocation: 'موقع التسليم',
 requiredDeliveryDate: 'تاريخ التسليم المطلوب',
 deliveryRequirements: 'متطلبات التسليم',
 itemsRequested: 'الأصناف المطلوبة',
 itemNo: '#',
 description: 'وصف الصنف',
 specification: 'المواصفات',
 qty: 'الكمية',
 unit: 'الوحدة',
 termsConditions: 'الشروط والأحكام',
 suppliers: 'الموردون / مقدمو العروض',
 supplierName: 'اسم المورد',
 contactPersonCol: 'جهة الاتصال',
 emailCol: 'البريد الإلكتروني',
 phoneCol: 'الهاتف',
 responseDeadline: 'موعد الرد',
 status: 'الحالة',
 preparedBy: 'أعده',
 approvedBy: 'اعتمده',
 name: 'الاسم',
 date: 'التاريخ',
 signature: 'التوقيع',
 // Procurement Methods
 quotation: 'عرض أسعار',
 tender: 'مناقصة (> USD 25K)',
 // Default values
 noSuppliers: 'لم يتم إضافة موردين بعد',
 noItems: 'لا توجد أصناف',
 noTerms: 'تطبق الشروط والأحكام القياسية',
 notSpecified: 'غير محدد'
 }
 };

 const trans = language === 'en' ? localT.en : localT.ar;

 const formatDate = (dateString: string) => {
 if (!dateString) return trans.notSpecified;
 const date = new Date(dateString);
 return date.toLocaleDateString(t.procurement.enus1, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 return (
 <div className="print-document">
 {/* PRINT HEADER */}
 <div className="mb-6">
 {/* Logo + Organization Name Row */}
 <div className={`flex items-start justify-between mb-3`}>
 {/* Organization Name + Document Title */}
 <div className={'text-start'}>
 <h2 className="text-xl font-bold text-black">{orgName}</h2>
 <h3 className="text-lg font-semibold text-black mt-1">{trans.docTitle}</h3>
 </div>
 
 {/* Organization Logo */}
 {(orgSettings.logo || rfq.organizationLogo) && (
 <img 
 src={orgSettings.logo || rfq.organizationLogo} 
 alt="Organization Logo" 
 className="h-16 w-auto object-contain flex-shrink-0"
 />
 )}
 </div>
 
 {/* Document Info Grid */}
 <div className={`grid grid-cols-2 gap-4 text-sm pt-3 border-t-2 border-black text-start`}>
 <div>
 <span className="font-semibold">{trans.rfqNumber}:</span> {rfq.rfqNumber}
 </div>
 <div>
 <span className="font-semibold">{trans.prNumber}:</span> {rfq.prNumber}
 </div>
 <div>
 <span className="font-semibold">{trans.issueDate}:</span> {formatDate(rfq.issueDate)}
 </div>
 <div>
 <span className="font-semibold text-red-600">{trans.submissionDeadline}:</span> <span className="font-bold text-red-600">{formatDate(rfq.submissionDeadline)}</span>
 </div>
 <div>
 <span className="font-semibold">{trans.procurementMethod}:</span> {rfq.procurementMethod === 'tender' ? trans.tender : trans.quotation}
 </div>
 <div>
 <span className="font-semibold">{trans.currency}:</span> {rfq.currency}
 </div>
 </div>
 </div>

 {/* META SECTION */}
 <div className="mb-6">
 <div className={`grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-start`}>
 <div>
 <span className="font-semibold">{trans.operatingUnit}:</span> {rfq.operatingUnitName}
 </div>
 <div>
 <span className="font-semibold">{trans.country}:</span> {rfq.country}
 </div>
 </div>
 </div>

 {/* CONTACT INFORMATION */}
 <div className="mb-6 bg-gray-50 border border-gray-300 rounded p-4">
 <h3 className="font-bold text-sm mb-3 border-b border-gray-300 pb-2">{trans.contactInfo}</h3>
 <div className={`grid grid-cols-3 gap-4 text-sm text-start`}>
 <div>
 <span className="font-semibold">{trans.contactPerson}:</span>
 <p className="mt-1">{rfq.contactPerson}</p>
 </div>
 <div>
 <span className="font-semibold">{trans.email}:</span>
 <p className="mt-1">{rfq.contactEmail}</p>
 </div>
 <div>
 <span className="font-semibold">{trans.phone}:</span>
 <p className="mt-1">{rfq.contactPhone}</p>
 </div>
 </div>
 </div>

 {/* DELIVERY REQUIREMENTS */}
 <div className="mb-6 bg-blue-50 border border-blue-300 rounded p-4">
 <h3 className="font-bold text-sm mb-3 border-b border-blue-300 pb-2">{trans.deliveryRequirements}</h3>
 <div className={`grid grid-cols-2 gap-4 text-sm text-start`}>
 <div>
 <span className="font-semibold">{trans.deliveryLocation}:</span>
 <p className="mt-1">{rfq.deliveryLocation}</p>
 </div>
 <div>
 <span className="font-semibold">{trans.requiredDeliveryDate}:</span>
 <p className="mt-1">{formatDate(rfq.requiredDeliveryDate)}</p>
 </div>
 </div>
 </div>

 {/* ITEMS TABLE */}
 <div className="mb-6">
 <h3 className="font-bold text-sm mb-3">{trans.itemsRequested}</h3>
 <table className="w-full text-xs border-collapse border border-black">
 <thead>
 <tr className="bg-gray-100">
 <th className={`px-2 py-2 border border-black font-bold text-start`} style={{ width: '5%' }}>
 {trans.itemNo}
 </th>
 <th className={`px-2 py-2 border border-black font-bold text-start`} style={{ width: '30%' }}>
 {trans.description}
 </th>
 <th className={`px-2 py-2 border border-black font-bold text-start`} style={{ width: '35%' }}>
 {trans.specification}
 </th>
 <th className="px-2 py-2 border border-black font-bold text-center" style={{ width: '15%' }}>
 {trans.qty}
 </th>
 <th className="px-2 py-2 border border-black font-bold text-center" style={{ width: '15%' }}>
 {trans.unit}
 </th>
 </tr>
 </thead>
 <tbody>
 {rfq.items && rfq.items.length > 0 ? (
 rfq.items.map((item, index) => (
 <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
 <td className={`px-2 py-2 border border-black text-start`}>
 {index + 1}
 </td>
 <td className={`px-2 py-2 border border-black text-start`}>
 {item.itemName}
 </td>
 <td className={`px-2 py-2 border border-black text-start`}>
 {item.specification || '-'}
 </td>
 <td className="px-2 py-2 border border-black text-center" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
 {item.quantity}
 </td>
 <td className="px-2 py-2 border border-black text-center">
 {item.unit}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={5} className="px-2 py-4 border border-black text-center text-gray-500">
 {trans.noItems}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* TERMS & CONDITIONS */}
 <div className="mb-8">
 <h3 className="font-bold text-sm mb-3 border-b border-black pb-1">{trans.termsConditions}:</h3>
 <div className="text-xs leading-relaxed whitespace-pre-line">
 {rfq.terms || trans.noTerms}
 </div>
 </div>

 {/* SUPPLIERS TABLE - Show empty table if no suppliers */}
 <div className="mb-12">
 <h3 className="font-bold text-sm mb-3">{trans.suppliers}</h3>
 <table className="w-full text-xs border-collapse border border-black">
 <thead>
 <tr className="bg-gray-100">
 <th className={`px-2 py-2 border border-black font-bold text-start`} style={{ width: '5%' }}>
 {trans.itemNo}
 </th>
 <th className={`px-2 py-2 border border-black font-bold text-start`} style={{ width: '25%' }}>
 {trans.supplierName}
 </th>
 <th className={`px-2 py-2 border border-black font-bold text-start`} style={{ width: '20%' }}>
 {trans.contactPersonCol}
 </th>
 <th className={`px-2 py-2 border border-black font-bold text-start`} style={{ width: '25%' }}>
 {trans.emailCol}
 </th>
 <th className={`px-2 py-2 border border-black font-bold text-start`} style={{ width: '25%' }}>
 {trans.phoneCol}
 </th>
 </tr>
 </thead>
 <tbody>
 {rfq.suppliers && rfq.suppliers.length > 0 ? (
 rfq.suppliers.map((supplier, index) => (
 <tr key={supplier.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
 <td className={`px-2 py-2 border border-black text-start`}>
 {index + 1}
 </td>
 <td className={`px-2 py-2 border border-black text-start`}>
 {supplier.supplierName}
 </td>
 <td className={`px-2 py-2 border border-black text-start`}>
 {supplier.contactPerson || '-'}
 </td>
 <td className={`px-2 py-2 border border-black text-start`}>
 {supplier.email}
 </td>
 <td className={`px-2 py-2 border border-black text-start`}>
 {supplier.phone || '-'}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={5} className="px-2 py-4 border border-black text-center text-gray-500">
 {trans.noSuppliers}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* SIGNATURE SECTION */}
 <div className="mt-12">
 <div className={`grid grid-cols-2 gap-8 text-sm ${isRTL ? 'direction-rtl' : ''}`}>
 {isRTL ? (
 // RTL Order: reversed
 <>
 <div className="text-end">
 <p className="font-bold mb-1">{trans.approvedBy}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>__________________</p>
 <p className="text-xs mt-1">{trans.name}</p>
 <p className="mt-4">__________________</p>
 <p className="text-xs">{trans.date}</p>
 </div>
 </div>
 <div className="text-end">
 <p className="font-bold mb-1">{trans.preparedBy}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>{rfq.contactPerson}</p>
 <p className="text-xs mt-1">{trans.name}</p>
 <p className="mt-4">__________________</p>
 <p className="text-xs">{trans.date}</p>
 </div>
 </div>
 </>
 ) : (
 // LTR Order
 <>
 <div>
 <p className="font-bold mb-1">{trans.preparedBy}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>{rfq.contactPerson}</p>
 <p className="text-xs mt-1">{trans.name}</p>
 <p className="mt-4">__________________</p>
 <p className="text-xs">{trans.date}</p>
 </div>
 </div>
 <div>
 <p className="font-bold mb-1">{trans.approvedBy}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>__________________</p>
 <p className="text-xs mt-1">{trans.name}</p>
 <p className="mt-4">__________________</p>
 <p className="text-xs">{trans.date}</p>
 </div>
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 );
}
