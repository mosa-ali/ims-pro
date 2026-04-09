// ============================================================================
// QUOTATION ANALYSIS (QA) FORM COMPONENT
// Integrated Management System (IMS)
// 100% SPECIFICATION COMPLIANT
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
 FileText, 
 Save, 
 Printer, 
 AlertCircle, 
 CheckCircle, 
 Trophy, 
 ChevronRight,
 Calculator,
 ShieldCheck,
 AlertTriangle
} from 'lucide-react';
import { analysisFormService } from '@/services/analysisFormService';
import { procurementRequestService } from '@/services/procurementRequestService';
import { evaluationCriteriaService } from '@/services/evaluationCriteriaService';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import type { 
 QuotationAnalysis, 
 ProcurementRequest, 
 QuotationSupplierData 
} from '@/types/logistics.types';

interface Props {
 analysisId: string;
 onUpdate?: () => void;
 language: 'en' | 'ar';
}

export function QuotationAnalysisForm({
 analysisId, onUpdate, language }: Props) {
 const { t } = useTranslation();
 const [analysis, setAnalysis] = useState<QuotationAnalysis | null>(null);
 const [pr, setPR] = useState<ProcurementRequest | null>(null);
 const [criteriaSet, setCriteriaSet] = useState<any>(null);
 const [errors, setErrors] = useState<string[]>([]);
 const [isSaving, setIsSaving] = useState(false);

 useEffect(() => {
 loadData();
 }, [analysisId]);

 const loadData = () => {
 const data = analysisFormService.getAnalysisById(analysisId);
 if (data) {
 setAnalysis(data);
 const prData = procurementRequestService.getRequestById(data.prId);
 setPR(prData);
 const cSet = evaluationCriteriaService.getCriteriaByPRId(data.prId);
 setCriteriaSet(cSet);
 }
 };

 if (!analysis || !pr) return null;
 const isReadOnly = analysis.status !== 'draft';

 const handlePriceChange = (supplierId: string, itemId: string, unitPrice: number) => {
 if (isReadOnly) return;
 analysisFormService.updateSupplierPrice(analysisId, supplierId, itemId, unitPrice);
 loadData();
 if (onUpdate) onUpdate();
 };

 const handleSave = () => {
 setIsSaving(true);
 // Validation
 const newErrors: string[] = [];
 if (analysis.suppliers.length < analysis.minQuotationsRequired) {
 newErrors.push(`Minimum ${analysis.minQuotationsRequired} quotations required.`);
 }
 
 analysis.suppliers.forEach(s => {
 const missingPrices = s.itemPrices.some(p => p.unitPrice <= 0);
 if (missingPrices) {
 newErrors.push(`Missing prices for ${s.supplierName}.`);
 }
 });

 if (newErrors.length > 0) {
 setErrors(newErrors);
 setIsSaving(false);
 return;
 }

 setErrors([]);
 analysisFormService.saveAnalysis(analysis);
 setIsSaving(false);
 alert('Analysis saved successfully.');
 };

 const handlePrint = () => {
 window.print();
 };

 // Helper to get technical score for a supplier
 const getTechnicalScore = (supplierId: string) => {
 const evalScoreObj = analysis.supplierEvaluationScores?.find(s => s.supplierId === supplierId);
 if (!evalScoreObj || !criteriaSet) return 0;

 const financialCriterion = criteriaSet.criteria.find((c: any) => 
 c.criterionName.toLowerCase().includes('price') || 
 c.criterionName.toLowerCase().includes('financial')
 );

 return criteriaSet.criteria
 .filter((c: any) => c.id !== financialCriterion?.id)
 .reduce((sum: number, c: any) => {
 const score = evalScoreObj.criterionScores[c.id] || 0;
 return sum + (score * c.weight / 100);
 }, 0);
 };

 // Helper to get financial score for a supplier
 const getFinancialScore = (supplierId: string) => {
 const supplier = analysis.suppliers.find(s => s.supplierId === supplierId);
 if (!supplier || supplier.subtotal === 0 || !criteriaSet) return 0;

 const financialCriterion = criteriaSet.criteria.find((c: any) => 
 c.criterionName.toLowerCase().includes('price') || 
 c.criterionName.toLowerCase().includes('financial')
 );
 const maxFinancialWeight = financialCriterion?.weight || 40;

 return (analysis.lowestQuotedAmount / supplier.subtotal) * maxFinancialWeight;
 };

 return (
 <div className="space-y-8 print:space-y-4 print:p-0">
 {/* 2️⃣ HEADER SECTION (READ-ONLY) */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
 <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="bg-blue-600 p-2 rounded-lg text-white">
 <ShieldCheck className="w-5 h-5" />
 </div>
 <div>
 <h2 className="text-lg font-bold text-gray-900">
 {analysis.qaNumber} - {analysis.processType.replace('_', ' ').toUpperCase()}
 </h2>
 <p className="text-sm text-blue-700 font-medium">
 {t.procurement.quotationAnalysisForm}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {!isReadOnly && (
 <button
 onClick={handleSave}
 disabled={isSaving}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm shadow-sm"
 >
 <Save className="w-4 h-4" />
 {t.procurement.saveDraft}
 </button>
 )}
 <button
 onClick={handlePrint}
 className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-bold text-sm shadow-sm"
 >
 <Printer className="w-4 h-4" />
 {t.procurement.printOfficialQa}
 </button>
 </div>
 </div>

 <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white">
 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.procurement.prNumber}</label>
 <p className="text-sm font-bold text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{analysis.prNumber}</p>
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.procurement.projectName}</label>
 <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{pr.projectName || 'N/A'}</p>
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.procurement.donorGrant}</label>
 <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{pr.donorName || 'N/A'}</p>
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.procurement.budgetLine}</label>
 <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{pr.budgetLineName}</p>
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.procurement.currency}</label>
 <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{pr.currency}</p>
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.procurement.totalPrAmount}</label>
 <p className="text-sm font-bold text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">{pr.currency} {pr.totalEstimatedCost.toLocaleString()}</p>
 </div>
 <div className="space-y-1 md:col-span-2">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.procurement.processType}</label>
 <p className="text-sm font-bold text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
 {analysis.processType.replace('_', ' ').toUpperCase()}
 </p>
 </div>
 </div>
 </div>

 {/* 3️⃣ & 4️⃣ SUPPLIER OFFER MATRIX */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
 <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
 <Calculator className="w-5 h-5 text-gray-600" />
 <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
 {t.procurement.supplierOfferMatrix}
 </h3>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-gray-50/50">
 <th key="col-h" className="px-6 py-4 text-start text-xs font-bold text-gray-500 uppercase border-b border-gray-200 w-16">#</th>
 <th key="col-desc" className="px-6 py-4 text-start text-xs font-bold text-gray-500 uppercase border-b border-gray-200 min-w-[250px]">{t.procurement.itemDescription}</th>
 <th key="col-qty" className="px-6 py-4 text-start text-xs font-bold text-gray-500 uppercase border-b border-gray-200 w-24">{t.procurement.qty}</th>
 <th key="col-unit" className="px-6 py-4 text-start text-xs font-bold text-gray-500 uppercase border-b border-gray-200 w-24">{t.procurement.unit}</th>
 {analysis.suppliers.map((supplier) => (
 <th key={`supplier-h-${supplier.supplierId}`} className="px-6 py-4 text-center text-xs font-bold text-white uppercase border-b border-gray-200 bg-blue-600 min-w-[180px]">
 {supplier.supplierName}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {pr.items.map((item, idx) => (
 <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
 <td className="px-6 py-4 text-sm text-gray-500 font-medium">{idx + 1}</td>
 <td className="px-6 py-4">
 <p className="text-sm font-bold text-gray-900">{item.description}</p>
 {item.detailedSpecification && (
 <p className="text-xs text-gray-500 mt-1">{item.detailedSpecification}</p>
 )}
 </td>
 <td className="px-6 py-4 text-sm font-bold text-gray-900 text-center">{item.quantity}</td>
 <td className="px-6 py-4 text-sm text-gray-600 text-center">{item.unit}</td>
 {analysis.suppliers.map((supplier) => {
 const supplierItem = supplier.itemPrices.find(ip => ip.itemId === item.id);
 return (
 <td key={supplier.supplierId} className="px-6 py-4 bg-blue-50/20">
 <div className="space-y-1">
 <div className="relative">
 <span className="absolute start-2 top-1.5 text-xs text-gray-400">{pr.currency}</span>
 <input
 type="number"
 value={supplierItem?.unitPrice || ''}
 onChange={(e) => handlePriceChange(supplier.supplierId, item.id, parseFloat(e.target.value) || 0)}
 disabled={isReadOnly}
 placeholder="0.00"
 className="w-full ps-10 pe-3 py-1.5 text-sm font-bold text-end border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
 />
 </div>
 <div className="flex justify-between text-[10px] font-bold text-blue-700 px-1">
 <span>TOTAL:</span>
 <span>{pr.currency} {(supplierItem?.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
 </div>
 </div>
 </td>
 );
 })}
 </tr>
 ))}
 {/* SUB-TOTALS ROW */}
 <tr className="bg-gray-100/50">
 <td colSpan={4} className="px-6 py-4 text-end text-xs font-bold text-gray-900 uppercase tracking-wider">
 {t.procurement.supplierSubtotal}
 </td>
 {analysis.suppliers.map((supplier) => (
 <td key={supplier.supplierId} className="px-6 py-4 text-center">
 <span className={`text-sm font-black p-2 rounded ${ supplier.subtotal === analysis.lowestQuotedAmount && supplier.subtotal > 0 ? 'bg-green-100 text-green-700 border border-green-200' : 'text-gray-900' }`}>
 {pr.currency} {supplier.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
 </span>
 </td>
 ))}
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* 5️⃣, 6️⃣ & 7️⃣ EVALUATION & RESULT SECTION */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Technical Evaluation Summary */}
 <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
 <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
 <Trophy className="w-5 h-5 text-gray-600" />
 <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
 {t.procurement.evaluationScoringSummary}
 </h3>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50/30">
 <th key="h-supplier" className="px-6 py-4 text-start text-xs font-bold text-gray-500 uppercase">{t.procurement.supplier}</th>
 <th key="h-tech" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">{t.procurement.technical}</th>
 <th key="h-fin" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">{t.procurement.financial}</th>
 <th key="h-total" className="px-6 py-4 text-center text-xs font-bold text-white uppercase bg-gray-900">{t.procurement.totalScore}</th>
 <th key="h-rank" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">{t.procurement.rank}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {analysis.suppliers.sort((a,b) => (b.score || 0) - (a.score || 0)).map((supplier) => {
 const tech = getTechnicalScore(supplier.supplierId);
 const fin = getFinancialScore(supplier.supplierId);
 return (
 <tr key={supplier.supplierId} className={`${supplier.isBestValue ? 'bg-green-50/30' : ''}`}>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2">
 {supplier.isBestValue && <Trophy className="w-4 h-4 text-yellow-500" />}
 <span className="text-sm font-bold text-gray-900">{supplier.supplierName}</span>
 </div>
 </td>
 <td className="px-6 py-4 text-center text-sm font-medium text-gray-700">{tech.toFixed(2)}</td>
 <td className="px-6 py-4 text-center text-sm font-medium text-gray-700">{fin.toFixed(2)}</td>
 <td className="px-6 py-4 text-center bg-gray-50">
 <span className="text-sm font-black text-gray-900">{(supplier.score || 0).toFixed(2)}</span>
 </td>
 <td className="px-6 py-4 text-center">
 <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${ supplier.rank === 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600' }`}>
 {supplier.rank || '-'}
 </span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* 7️⃣ Final Selection & Best Value Recommendation */}
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
 <div className="bg-green-600 px-6 py-4 border-b border-green-700 flex items-center gap-2">
 <CheckCircle className="w-5 h-5 text-white" />
 <h3 className="text-sm font-bold text-white uppercase tracking-wider">
 {t.procurement.finalSelection}
 </h3>
 </div>
 <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
 {analysis.suppliers.find(s => s.isBestValue) ? (
 <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
 <p className="text-xs font-bold text-green-700 uppercase mb-1">{t.procurement.bestEvaluatedSupplier}</p>
 <p className="text-lg font-black text-green-900">
 {analysis.suppliers.find(s => s.isBestValue)?.supplierName}
 </p>
 <div className="mt-2 flex items-center gap-1 text-[10px] text-green-700 font-bold">
 <Calculator className="w-3 h-3" />
 <span>TOTAL SCORE: {analysis.suppliers.find(s => s.isBestValue)?.score.toFixed(2)}</span>
 </div>
 </div>
 ) : (
 <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg flex items-center gap-3">
 <AlertTriangle className="w-5 h-5 text-yellow-600" />
 <p className="text-xs font-bold text-yellow-700">{t.procurement.pleaseCompleteAllPricingAndTechnical}</p>
 </div>
 )}

 <div className="space-y-4 pt-4">
 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.procurement.selectedSupplier}</label>
 <select 
 className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
 value={analysis.selectedSupplierId}
 disabled={isReadOnly}
 onChange={(e) => {
 const s = analysis.suppliers.find(sup => sup.supplierId === e.target.value);
 setAnalysis({
 ...analysis,
 selectedSupplierId: e.target.value,
 selectedSupplierName: s?.supplierName || ''
 });
 }}
 >
 <option value="">-- Select Supplier --</option>
 {analysis.suppliers.map(s => (
 <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.procurement.selectionJustification}</label>
 <textarea 
 className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500"
 placeholder={t.placeholders.mandatoryJustificationForSupplierSelection}
 value={analysis.selectionJustification}
 disabled={isReadOnly}
 onChange={(e) => setAnalysis({ ...analysis, selectionJustification: e.target.value })}
 />
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* 9️⃣ VALIDATION ERRORS */}
 {errors.length > 0 && (
 <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
 <div className="space-y-1">
 <h4 className="text-sm font-bold text-red-900 uppercase tracking-wider">{t.procurement.blockingValidationErrors}</h4>
 <ul className="list-disc list-inside text-sm text-red-700 font-medium">
 {errors.map((err, idx) => <li key={idx}>{err}</li>)}
 </ul>
 </div>
 </div>
 )}

 {/* 1️⃣1️⃣ PRINT-ONLY SIGNATURE SECTION */}
 <div className="hidden print:grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200 bg-white">
 <div className="text-center space-y-4">
 <p className="text-xs font-bold text-gray-500 uppercase">{isRTL ? 'أعدّه (اللوجستيات)' : 'Prepared By (Logistics)'}</p>
 <div className="h-16 border-b border-gray-300 mx-auto w-40"></div>
 <p className="text-sm font-bold text-gray-900">Name: _________________</p>
 <p className="text-xs text-gray-500">Date: ____/____/2026</p>
 </div>
 <div className="text-center space-y-4">
 <p className="text-xs font-bold text-gray-500 uppercase">{isRTL ? 'راجعه (المالية)' : 'Reviewed By (Finance)'}</p>
 <div className="h-16 border-b border-gray-300 mx-auto w-40"></div>
 <p className="text-sm font-bold text-gray-900">Name: _________________</p>
 <p className="text-xs text-gray-500">Date: ____/____/2026</p>
 </div>
 <div className="text-center space-y-4">
 <p className="text-xs font-bold text-gray-500 uppercase">{isRTL ? 'اعتمده (المدير)' : 'Approved By (Director)'}</p>
 <div className="h-16 border-b border-gray-300 mx-auto w-40"></div>
 <p className="text-sm font-bold text-gray-900">Name: _________________</p>
 <p className="text-xs text-gray-500">Date: ____/____/2026</p>
 </div>
 </div>
 </div>
 );
}
