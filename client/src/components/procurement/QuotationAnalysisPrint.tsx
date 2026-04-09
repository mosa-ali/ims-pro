// ============================================================================
// QUOTATION ANALYSIS (QA) PRINT LAYOUT
// Official A4 format for non-tender procurement
// Integrated Management System (IMS)
// ============================================================================

import React from 'react';
import type { QuotationAnalysis, ProcurementRequest } from '@/types/logistics.types';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
 qa: QuotationAnalysis;
 pr: ProcurementRequest;
}

export function QuotationAnalysisPrint({ qa, pr }: Props) {
  const { language, isRTL } = useLanguage();
 const getSupplierName = (supplierId: string) => {
 const supplier = qa.suppliers.find(s => s.supplierId === supplierId);
 return supplier?.supplierName || 'Unknown';
 };

 const getItemPrice = (itemId: string, supplierId: string): number => {
 const supplier = qa.suppliers.find(s => s.supplierId === supplierId);
 const price = supplier?.itemPrices.find((p: any) => p.itemId === itemId);
 return price?.unitPrice || 0;
 };

 const getItemTotal = (itemId: string, supplierId: string): number => {
 const item = pr.items.find(i => i.id === itemId);
 if (!item) return 0;
 const unitPrice = getItemPrice(itemId, supplierId);
 return item.quantity * unitPrice;
 };

 const getTechnicalScore = (supplierId: string) => {
 const evalScore = qa.supplierEvaluationScores?.find((s: any) => s.supplierId === supplierId);
 return evalScore?.technicalScore || 0;
 };

 const getFinancialScore = (supplierId: string) => {
 const evalScore = qa.supplierEvaluationScores?.find((s: any) => s.supplierId === supplierId);
 return evalScore?.financialScore || 0;
 };

 const getFinalScore = (supplierId: string) => {
 const supplier = qa.suppliers.find(s => s.supplierId === supplierId);
 return supplier?.score || 0;
 };

 return (
 <div className="print-document bg-white p-8" style={{ width: '210mm', minHeight: '297mm' }}>
 {/* OFFICIAL HEADER - NGO LETTERHEAD */}
 <div className="mb-6">
 {/* Logo + Organization Name Row */}
 <div className="flex items-start justify-between mb-3">
 <div className="text-start">
 <h2 className="text-xl font-bold text-black">{(qa as any).organizationName || 'Organization'}</h2>
 <h3 className="text-lg font-semibold text-black mt-1">{isRTL ? 'تحليل العروض' : 'Quotation Analysis (QA)'}</h3>
 </div>
 
 {(qa as any).organizationLogo && (
 <img 
 src={(qa as any).organizationLogo} 
 alt="Organization Logo" 
 className="h-16 w-auto object-contain flex-shrink-0"
 />
 )}
 </div>
 
 {/* Document Info Grid */}
 <div className="grid grid-cols-4 gap-3 pt-3 border-t-2 border-black text-xs">
 <div>
 <span className="font-semibold">QA Number:</span>
 <span className="ms-2">{qa.qaNumber}</span>
 </div>
 <div>
 <span className="font-semibold">PR Number:</span>
 <span className="ms-2">{qa.prNumber}</span>
 </div>
 <div>
 <span className="font-semibold">Date:</span>
 <span className="ms-2">{qa.analysisDate}</span>
 </div>
 <div>
 <span className="font-semibold">Currency:</span>
 <span className="ms-2">{qa.currency}</span>
 </div>
 {(qa as any).projectName && (
 <div className="col-span-2">
 <span className="font-semibold">Project:</span>
 <span className="ms-2">{(qa as any).projectName}</span>
 </div>
 )}
 <div>
 <span className="font-semibold">{isRTL ? 'بند الميزانية:' : 'Budget Line:'}</span>
 <span className="ms-2">{(qa as any).budgetLineName || qa.budgetLineId}</span>
 </div>
 <div>
 <span className="font-semibold">{isRTL ? 'المبلغ الإجمالي:' : 'Total Amount:'}</span>
 <span className="ms-2 font-bold">{qa.currency} {((qa as any).totalPRAmount || qa.estimatedBudget || 0).toLocaleString()}</span>
 </div>
 </div>
 </div>

 {/* ITEM LINES */}
 <div className="mb-6">
 <h3 className="text-sm font-bold text-black border-b-2 border-black pb-1 mb-2">
 ITEM LINES
 </h3>
 <table className="w-full border-collapse border border-black text-xs">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-black px-2 py-1 text-start font-bold w-8">#</th>
 <th className="border border-black px-2 py-1 text-start font-bold">{isRTL ? 'الوصف' : 'Description'}</th>
 <th className="border border-black px-2 py-1 text-start font-bold">Specification</th>
 <th className="border border-black px-2 py-1 text-center font-bold w-16">Qty</th>
 <th className="border border-black px-2 py-1 text-center font-bold w-16">{isRTL ? 'الوحدة' : 'Unit'}</th>
 </tr>
 </thead>
 <tbody>
 {pr.items.map((item, index) => (
 <tr key={item.id}>
 <td className="border border-black px-2 py-1">{index + 1}</td>
 <td className="border border-black px-2 py-1 font-medium">{item.description}</td>
 <td className="border border-black px-2 py-1">{(item as any).specification || (item as any).specifications || ''}</td>
 <td className="border border-black px-2 py-1 text-center font-semibold">{item.quantity}</td>
 <td className="border border-black px-2 py-1 text-center">{item.unit}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* SUPPLIER COMPARISON TABLE */}
 <div className="mb-6">
 <h3 className="text-sm font-bold text-black border-b-2 border-black pb-1 mb-2">
 SUPPLIER OFFER COMPARISON
 </h3>
 <table className="w-full border-collapse border border-black text-xs">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-black px-2 py-1 text-start font-bold">{isRTL ? 'البند' : 'Item'}</th>
 <th className="border border-black px-2 py-1 text-center font-bold w-12">Qty</th>
 {qa.suppliers.map(supplier => (
 <th key={supplier.supplierId} className="border border-black px-2 py-1 text-center font-bold" colSpan={2}>
 {supplier.supplierName}
 </th>
 ))}
 </tr>
 <tr className="bg-gray-50">
 <th className="border border-black px-2 py-1"></th>
 <th className="border border-black px-2 py-1"></th>
 {qa.suppliers.map(supplier => (
 <React.Fragment key={supplier.supplierId}>
 <th className="border border-black px-2 py-1 text-center text-xs font-semibold">{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
 <th className="border border-black px-2 py-1 text-center text-xs font-semibold">{isRTL ? 'الإجمالي' : 'Total'}</th>
 </React.Fragment>
 ))}
 </tr>
 </thead>
 <tbody>
 {pr.items.map(item => (
 <tr key={item.id}>
 <td className="border border-black px-2 py-1 font-medium">{item.description}</td>
 <td className="border border-black px-2 py-1 text-center font-semibold">{item.quantity}</td>
 {qa.suppliers.map(supplier => {
 const unitPrice = getItemPrice(item.id, supplier.supplierId);
 const itemTotal = getItemTotal(item.id, supplier.supplierId);
 return (
 <React.Fragment key={supplier.supplierId}>
 <td className="border border-black px-2 py-1 text-center">
 {qa.currency} {unitPrice.toLocaleString()}
 </td>
 <td className="border border-black px-2 py-1 text-center font-semibold">
 {qa.currency} {itemTotal.toLocaleString()}
 </td>
 </React.Fragment>
 );
 })}
 </tr>
 ))}
 
 {/* Subtotals */}
 <tr className="bg-gray-100 font-bold">
 <td colSpan={2} className="border border-black px-2 py-1 text-end">SUBTOTAL</td>
 {qa.suppliers.map(supplier => {
 const finScore = getFinancialScore(supplier.supplierId);
 return (
 <td key={supplier.supplierId} colSpan={2} className="border border-black px-2 py-1 text-center text-base">
 {qa.currency} {finScore?.subtotal.toLocaleString() || '0.00'}
 </td>
 );
 })}
 </tr>
 </tbody>
 </table>
 </div>

 {/* TECHNICAL EVALUATION */}
 <div className="mb-6">
 <h3 className="text-sm font-bold text-black border-b-2 border-black pb-1 mb-2">
 TECHNICAL & ADMINISTRATIVE EVALUATION
 </h3>
 <table className="w-full border-collapse border border-black text-xs">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-black px-2 py-1 text-start font-bold">{isRTL ? 'المعايير' : 'Criteria'}</th>
 <th className="border border-black px-2 py-1 text-center font-bold w-16">{isRTL ? 'الوزن' : 'Weight'}</th>
 {qa.suppliers.map(supplier => (
 <th key={supplier.supplierId} className="border border-black px-2 py-1 text-center font-bold">
 {supplier.supplierName}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {qa.technicalCriteria.map(criterion => (
 <tr key={criterion.id}>
 <td className="border border-black px-2 py-1 font-medium">{criterion.criterionName}</td>
 <td className="border border-black px-2 py-1 text-center font-semibold">{criterion.maxScore}</td>
 {qa.suppliers.map(supplier => {
 const techScore = getTechnicalScore(supplier.supplierId);
 const score = (techScore as any)?.criterionScores?.[criterion.id] || 0;
 return (
 <td key={supplier.supplierId} className="border border-black px-2 py-1 text-center">
 {score.toFixed(1)}
 </td>
 );
 })}
 </tr>
 ))}
 
 {/* Technical Totals */}
 <tr className="bg-gray-100 font-bold">
 <td colSpan={2} className="border border-black px-2 py-1 text-end">TOTAL TECHNICAL</td>
 {qa.suppliers.map(supplier => {
 const techScore = getTechnicalScore(supplier.supplierId);
 return (
 <td key={supplier.supplierId} className="border border-black px-2 py-1 text-center text-base">
 {(techScore as any)?.totalTechnicalScore?.toFixed(2) || '0.00'}
 </td>
 );
 })}
 </tr>
 </tbody>
 </table>
 </div>

 {/* FINAL SCORES */}
 <div className="mb-8">
 <h3 className="text-sm font-bold text-black border-b-2 border-black pb-1 mb-2">
 FINAL SCORES & RANKING
 </h3>
 <table className="w-full border-collapse border border-black text-xs">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-black px-2 py-1 text-center font-bold w-12">{isRTL ? 'الترتيب' : 'Rank'}</th>
 <th className="border border-black px-2 py-1 text-start font-bold">{isRTL ? 'المورد' : 'Supplier'}</th>
 <th className="border border-black px-2 py-1 text-center font-bold">{isRTL ? 'فني' : 'Technical'}</th>
 <th className="border border-black px-2 py-1 text-center font-bold">{isRTL ? 'مالي' : 'Financial'}</th>
 <th className="border border-black px-2 py-1 text-center font-bold">{isRTL ? 'الإجمالي' : 'Total'}</th>
 </tr>
 </thead>
 <tbody>
 {(qa as any).finalScores?.map((score: any) => {
 const supplier = qa.suppliers.find(s => s.supplierId === score.supplierId);
 const isBestEvaluated = score.supplierId === (qa as any).bestEvaluatedSupplierId;
 const isLowestPrice = score.supplierId === (qa as any).lowestPriceSupplierId;
 
 return (
 <tr key={score.supplierId} className={score.rank === 1 ? 'bg-gray-100' : ''}>
 <td className="border border-black px-2 py-1 text-center font-bold">#{score.rank}</td>
 <td className="border border-black px-2 py-1 font-medium">
 {supplier?.supplierName}
 {isBestEvaluated && <span className="ms-2 text-xs font-bold">★ Best Evaluated</span>}
 {isLowestPrice && <span className="ms-2 text-xs font-bold">💰 Lowest Price</span>}
 </td>
 <td className="border border-black px-2 py-1 text-center font-semibold">
 {score.technicalScore.toFixed(2)}
 </td>
 <td className="border border-black px-2 py-1 text-center font-semibold">
 {score.financialScore.toFixed(2)}
 </td>
 <td className="border border-black px-2 py-1 text-center font-bold text-base">
 {score.totalScore.toFixed(2)}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* SELECTION & JUSTIFICATION */}
 <div className="mb-8 border border-black p-3">
 <h3 className="text-sm font-bold text-black mb-3 border-b border-black pb-1">
 SUPPLIER SELECTION
 </h3>
 
 <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
 <div>
 <span className="font-semibold">{isRTL ? 'أقل مبلغ سعر:' : 'Lowest Price Amount:'}</span>
 <span className="ms-2 text-base font-bold">
 {qa.currency} {((qa as any).lowestPriceAmount || qa.lowestQuotedAmount || 0).toLocaleString()}
 </span>
 {(qa as any).lowestPriceSupplierId && (
 <div className="text-xs mt-1">
 ({getSupplierName((qa as any).lowestPriceSupplierId)})
 </div>
 )}
 </div>
 <div>
 <span className="font-semibold">{isRTL ? 'المورد المختار:' : 'Selected Supplier:'}</span>
 <span className="ms-2 text-base font-bold">
 {qa.selectedSupplierName || '-'}
 </span>
 </div>
 </div>

 {qa.selectionJustification && (
 <div className="text-xs">
 <div className="font-semibold mb-1">Justification:</div>
 <div className="p-2 whitespace-pre-wrap">
 {qa.selectionJustification}
 </div>
 </div>
 )}
 </div>

 {/* APPROVAL SIGNATURES - CLEAN FORMAT */}
 <div className="mt-12">
 <h3 className="text-sm font-bold text-black mb-4 border-b border-black pb-1">
 APPROVAL & SIGNATURES
 </h3>
 
 <div className="grid grid-cols-3 gap-8 text-sm">
 {qa.approvalSignatures.map((sig, index) => (
 <div key={index}>
 <p className="font-bold mb-1">{sig.role}:</p>
 <div className="border-t-2 border-black mt-8 pt-2">
 <p>{sig.name || '__________________'}</p>
 <p className="text-xs mt-1">{isRTL ? 'الاسم' : 'Name'}</p>
 <p className="mt-4">{sig.date || '__________________'}</p>
 <p className="text-xs">{isRTL ? 'التاريخ' : 'Date'}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
