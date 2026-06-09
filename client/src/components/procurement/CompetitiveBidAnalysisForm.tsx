// ============================================================================
// COMPETITIVE BID ANALYSIS (CBA) FORM
// Official tender evaluation document for procurement > USD 25,000
// Auto-syncs from Bid Evaluation Criteria - Audit-critical
// Integrated Management System (IMS)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Save, Printer, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { competitiveBidAnalysisService } from '@/services/competitiveBidAnalysisService';
import { bidEvaluationCriteriaService } from '@/services/bidEvaluationCriteriaService';
import { CompetitiveBidAnalysisPrintModal } from './CompetitiveBidAnalysisPrintModal';
import { useTranslation } from '@/i18n/useTranslation';
import type { CompetitiveBidAnalysis, ProcurementRequest } from '@/types/logistics.types';

interface Props {
 pr: ProcurementRequest;
}

export function CompetitiveBidAnalysisForm({
 pr }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();

 const [cba, setCBA] = useState<CompetitiveBidAnalysis | null>(null);
 const [selectedSupplier, setSelectedSupplier] = useState('');
 const [justification, setJustification] = useState('');
 const [showPrintModal, setShowPrintModal] = useState(false);

 const translations = {
 title: t.procurement.competitiveBidAnalysisCba,
 cbaNumber: t.procurement.cbaNumber,
 prNumber: t.procurement.prNumber,
 tenderNumber: t.procurement.tenderRfqNumber2,
 date: t.procurement.date,
 country: t.procurement.country,
 currency: t.procurement.currency,
 budgetLine: t.procurement.budgetLine,
 budgetAmount: t.procurement.budgetAmount,
 
 technicalEvaluation: t.procurement.technicalEvaluation50Points,
 criteria: t.procurement.criteria,
 maxScore: t.procurement.maxScore,
 totalTechnical: t.procurement.totalTechnical,
 percentage: t.procurement.percentage,
 qualified: t.procurement.qualified,
 notQualified: t.procurement.notQualified,
 threshold: t.procurement.technicalThreshold70,
 
 financialEvaluation: t.procurement.financialEvaluation50Points,
 bidder: t.procurement.bidder,
 offeredPrice: t.procurement.offeredPrice,
 financialScore: t.procurement.financialScore,
 
 finalScore: t.procurement.finalScore100Points,
 technical: t.procurement.technical50,
 financial: t.procurement.financial50,
 total: t.procurement.total100,
 rank: t.procurement.rank,
 
 decision: t.procurement.decisionJustification,
 lowestBidAmount: t.procurement.lowestBidAmount,
 selectedSupplier: t.procurement.selectedSupplier,
 selectionJustification: t.procurement.justificationMandatoryIfNotLowestBidder,
 
 approvalSignatures: t.procurement.approvalSignatures,
 committeeMember: t.procurement.evaluationCommitteeMember,
 finalApproval: t.procurement.finalApproval,
 name: t.procurement.name,
 signature: t.procurement.signature,
 
 syncFromCriteria: t.procurement.syncFromCriteria,
 save: t.procurement.save,
 print: t.procurement.print,
 complete: t.procurement.completeCba,
 approve: t.procurement.approveLock,
 
 status: t.procurement.status,
 draft: t.procurement.draft,
 inEvaluation: t.procurement.inEvaluation,
 completed: t.procurement.completed,
 approved: t.procurement.approved,
 locked: t.procurement.locked,
 
 noBidders: t.procurement.noBiddersFoundPleaseAddBidders,
 justificationRequired: t.procurement.justificationIsRequiredWhenSelectedSupplier
 };

 // Load CBA
 useEffect(() => {
 loadCBA();
 }, [pr.id]);

 const loadCBA = () => {
 let loaded = competitiveBidAnalysisService.getByPRId(pr.id);
 
 if (!loaded) {
 // Check if evaluation criteria exists
 const evalCriteria = bidEvaluationCriteriaService.getByPRId(pr.id);
 if (!evalCriteria) {
 // Initialize evaluation criteria first
 bidEvaluationCriteriaService.initialize(
 pr.id,
 pr.prNumber,
 undefined,
 pr.organizationId,
 pr.organizationName || '',
 pr.operatingUnitId,
 pr.operatingUnitName || '',
 user?.id || 'system'
 );
 }
 
 loaded = competitiveBidAnalysisService.initializeFromPR(
 pr.id,
 pr.prNumber,
 undefined,
 pr.organizationId,
 pr.organizationName || '',
 pr.organizationLogo,
 pr.operatingUnitId,
 pr.operatingUnitName || '',
 pr.country || '',
 pr.currency,
 pr.budgetLineId,
 pr.budgetLineName,
 pr.budgetAvailable,
 user?.id || 'system'
 );
 }
 
 setCBA(loaded);
 if (loaded.selectedSupplierId) {
 setSelectedSupplier(loaded.selectedSupplierId);
 }
 setJustification(loaded.selectionJustification || '');
 };

 const handleSyncBidders = () => {
 if (!cba) return;
 
 const updated = competitiveBidAnalysisService.syncBiddersFromCriteria(
 pr.id,
 user?.id || 'system'
 );
 
 if (updated) {
 setCBA(updated);
 }
 };

 const handleTechnicalScoreChange = (bidderId: string, criterionId: string, value: string) => {
 if (!cba) return;
 
 const score = parseFloat(value) || 0;
 const updated = competitiveBidAnalysisService.updateTechnicalScore(
 cba.id,
 bidderId,
 criterionId,
 score,
 user?.id || 'system'
 );
 
 if (updated) {
 setCBA(updated);
 }
 };

 const handleFinancialPriceChange = (bidderId: string, value: string) => {
 if (!cba) return;
 
 const price = parseFloat(value) || 0;
 const updated = competitiveBidAnalysisService.updateFinancialPrice(
 cba.id,
 bidderId,
 price,
 user?.id || 'system'
 );
 
 if (updated) {
 setCBA(updated);
 }
 };

 const handleSelectSupplier = () => {
 if (!cba || !selectedSupplier) return;
 
 const supplierName = competitiveBidAnalysisService.getBidderName(cba, selectedSupplier);
 
 try {
 const updated = competitiveBidAnalysisService.selectSupplier(
 cba.id,
 selectedSupplier,
 supplierName,
 justification,
 user?.id || 'system'
 );
 
 if (updated) {
 setCBA(updated);
 }
 } catch (error: any) {
 alert(error.message || translations.justificationRequired);
 }
 };

 const handleComplete = () => {
 if (!cba) return;
 
 try {
 const updated = competitiveBidAnalysisService.complete(
 cba.id,
 user?.id || 'system'
 );
 
 if (updated) {
 setCBA(updated);
 }
 } catch (error: any) {
 alert(error.message);
 }
 };

 const handleApprove = () => {
 if (!cba) return;
 
 if (!confirm('Approve and lock CBA? This cannot be undone.')) return;
 
 const updated = competitiveBidAnalysisService.approve(
 cba.id,
 user?.id || 'system'
 );
 
 if (updated) {
 setCBA(updated);
 }
 };

 const getTechnicalScore = (bidderId: string, criterionId: string): number => {
 if (!cba) return 0;
 const techScore = cba.technicalScores.find(s => s.bidderId === bidderId);
 return techScore?.criterionScores[criterionId] || 0;
 };

 const getBidderTechnicalScore = (bidderId: string) => {
 if (!cba) return null;
 return cba.technicalScores.find(s => s.bidderId === bidderId);
 };

 const getBidderFinancialScore = (bidderId: string) => {
 if (!cba) return null;
 return cba.financialScores.find(s => s.bidderId === bidderId);
 };

 const getBidderFinalScore = (bidderId: string) => {
 if (!cba) return null;
 return cba.finalScores.find(s => s.bidderId === bidderId);
 };

 if (!cba) {
 return <div>{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h2 className="text-xl font-bold text-gray-900">{translations.title}</h2>
 <div className="text-sm text-gray-600 mt-1">{cba.organizationName}</div>
 </div>
 <div className="flex items-center gap-2">
 {!cba.locked && (
 <button
 onClick={handleSyncBidders}
 className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
 title="Sync bidders from Evaluation Criteria"
 >
 <RefreshCw className="w-4 h-4" />
 {translations.syncFromCriteria}
 </button>
 )}
 {cba.status === 'in_evaluation' && (
 <button
 onClick={handleComplete}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Save className="w-4 h-4" />
 {translations.complete}
 </button>
 )}
 {cba.status === 'completed' && !cba.locked && (
 <button
 onClick={handleApprove}
 className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
 >
 <Lock className="w-4 h-4" />
 {translations.approve}
 </button>
 )}
 <button
 onClick={() => setShowPrintModal(true)}
 className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
 >
 <Printer className="w-4 h-4" />
 {translations.print}
 </button>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {translations.cbaNumber}
 </label>
 <div className="text-gray-900 font-semibold">{cba.cbaNumber}</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {translations.prNumber}
 </label>
 <div className="text-gray-900">{cba.prNumber}</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {translations.date}
 </label>
 <div className="text-gray-900">{cba.cbaDate}</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {translations.currency}
 </label>
 <div className="text-gray-900">{cba.currency}</div>
 </div>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {translations.budgetLine}
 </label>
 <div className="text-gray-900">{cba.budgetLineName}</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {translations.budgetAmount}
 </label>
 <div className="text-gray-900 font-semibold">
 {cba.currency} {cba.budgetAmount.toLocaleString()}
 </div>
 </div>
 </div>

 <div className="mt-4">
 <span className={`px-3 py-1 rounded-full text-sm font-medium ${ cba.status === 'draft' ? 'bg-gray-100 text-gray-800' : cba.status === 'in_evaluation' ? 'bg-blue-100 text-blue-800' : cba.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800' }`}>
 {cba.status === 'draft' ? translations.draft :
 cba.status === 'in_evaluation' ? translations.inEvaluation :
 cba.status === 'completed' ? translations.completed :
 translations.approved}
 </span>
 {cba.locked && (
 <span className="ms-2 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
 <Lock className="w-3 h-3 inline me-1" />
 {translations.locked}
 </span>
 )}
 </div>
 </div>

 {cba.bidders.length === 0 ? (
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
 <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
 <p className="text-yellow-800">{translations.noBidders}</p>
 </div>
 ) : (
 <>
 {/* Technical Evaluation */}
 <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
 <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
 <h3 className="text-lg font-bold text-blue-900">{translations.technicalEvaluation}</h3>
 <p className="text-sm text-blue-700 mt-1">{translations.threshold}</p>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-gray-100 border-b border-gray-300">
 <th className="px-4 py-3 text-start text-sm font-bold text-gray-900 border-r border-gray-300">
 {translations.criteria}
 </th>
 <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300 w-24">
 {translations.maxScore}
 </th>
 {cba.bidders.map(bidder => (
 <th
 key={bidder.id}
 className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300 min-w-[120px]"
 >
 {bidder.companyName}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {cba.technicalCriteria.map(criterion => (
 <tr key={criterion.id} className="border-b border-gray-200 hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
 {criterion.criterionName}
 </td>
 <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">
 {criterion.maxScore}
 </td>
 {cba.bidders.map(bidder => (
 <td key={bidder.id} className="px-2 py-2 border-r border-gray-200">
 <input
 type="number"
 min="0"
 max={criterion.maxScore}
 step="0.1"
 value={getTechnicalScore(bidder.id, criterion.id)}
 onChange={(e) => handleTechnicalScoreChange(bidder.id, criterion.id, e.target.value)}
 disabled={cba.locked}
 className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
 />
 </td>
 ))}
 </tr>
 ))}
 
 {/* Technical Totals */}
 <tr className="bg-gray-100 border-t-2 border-gray-400">
 <td className="px-4 py-3 text-end text-sm font-bold text-gray-900 border-r border-gray-300">
 {translations.totalTechnical}
 </td>
 <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300">
 50
 </td>
 {cba.bidders.map(bidder => {
 const techScore = getBidderTechnicalScore(bidder.id);
 return (
 <td
 key={bidder.id}
 className={`px-4 py-3 text-center font-bold border-r border-gray-300 ${ techScore?.qualifiedForFinancial ? 'text-green-900 bg-green-50' : 'text-red-900 bg-red-50' }`}
 >
 <div className="text-lg">{techScore?.totalTechnicalScore.toFixed(2) || '0.00'}</div>
 <div className="text-xs">({techScore?.technicalPercentage.toFixed(1) || '0.0'}%)</div>
 <div className="text-xs font-semibold mt-1">
 {techScore?.qualifiedForFinancial ? translations.qualified : translations.notQualified}
 </div>
 </td>
 );
 })}
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* Financial Evaluation */}
 <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
 <div className="bg-green-50 border-b border-green-200 px-6 py-3">
 <h3 className="text-lg font-bold text-green-900">{translations.financialEvaluation}</h3>
 <p className="text-sm text-green-700 mt-1">Only qualified bidders (≥70% technical) are evaluated</p>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-gray-100 border-b border-gray-300">
 <th className="px-4 py-3 text-start text-sm font-bold text-gray-900 border-r border-gray-300">
 {translations.bidder}
 </th>
 <th className="px-4 py-3 text-end text-sm font-bold text-gray-900 border-r border-gray-300">
 {translations.offeredPrice}
 </th>
 <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300">
 {translations.financialScore}
 </th>
 </tr>
 </thead>
 <tbody>
 {cba.bidders.map(bidder => {
 const techScore = getBidderTechnicalScore(bidder.id);
 const finScore = getBidderFinancialScore(bidder.id);
 const isQualified = techScore?.qualifiedForFinancial || false;
 
 return (
 <tr key={bidder.id} className={`border-b border-gray-200 ${!isQualified ? 'bg-gray-50' : ''}`}>
 <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
 {bidder.companyName}
 {!isQualified && (
 <span className="ms-2 text-xs text-red-600">(Not Qualified)</span>
 )}
 </td>
 <td className="px-4 py-3 border-r border-gray-200">
 <input
 type="number"
 min="0"
 step="0.01"
 value={finScore?.offeredPrice || 0}
 onChange={(e) => handleFinancialPriceChange(bidder.id, e.target.value)}
 disabled={cba.locked || !isQualified}
 className="w-full px-3 py-2 text-end border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
 />
 </td>
 <td className="px-4 py-3 text-center text-lg font-bold text-green-900 border-r border-gray-200">
 {isQualified ? (finScore?.financialScore.toFixed(2) || '0.00') : '-'}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Final Scores */}
 <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
 <div className="bg-purple-50 border-b border-purple-200 px-6 py-3">
 <h3 className="text-lg font-bold text-purple-900">{translations.finalScore}</h3>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-gray-100 border-b border-gray-300">
 <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300 w-16">
 {translations.rank}
 </th>
 <th className="px-4 py-3 text-start text-sm font-bold text-gray-900 border-r border-gray-300">
 {translations.bidder}
 </th>
 <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300">
 {translations.technical}
 </th>
 <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300">
 {translations.financial}
 </th>
 <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300">
 {translations.total}
 </th>
 </tr>
 </thead>
 <tbody>
 {cba.finalScores.map(score => {
 const bidder = cba.bidders.find(b => b.id === score.bidderId);
 return (
 <tr
 key={score.bidderId}
 className={`border-b border-gray-200 ${ score.rank === 1 ? 'bg-yellow-50' : '' }`}
 >
 <td className="px-4 py-3 text-center font-bold text-gray-900 border-r border-gray-200">
 #{score.rank}
 </td>
 <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
 {bidder?.companyName}
 {score.rank === 1 && (
 <span className="ms-2 text-xs text-yellow-700 font-semibold">HIGHEST SCORE</span>
 )}
 </td>
 <td className="px-4 py-3 text-center font-semibold text-blue-900 border-r border-gray-200">
 {score.technicalScore.toFixed(2)}
 </td>
 <td className="px-4 py-3 text-center font-semibold text-green-900 border-r border-gray-200">
 {score.financialScore.toFixed(2)}
 </td>
 <td className="px-4 py-3 text-center text-lg font-bold text-purple-900 border-r border-gray-200">
 {score.totalScore.toFixed(2)}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Decision & Justification */}
 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="text-lg font-bold text-gray-900 mb-4">{translations.decision}</h3>
 
 <div className="grid grid-cols-2 gap-6 mb-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {translations.lowestBidAmount}
 </label>
 <div className="text-2xl font-bold text-green-900">
 {cba.currency} {cba.lowestBidAmount.toLocaleString()}
 </div>
 {cba.lowestBidderId && (
 <div className="text-sm text-gray-600 mt-1">
 ({competitiveBidAnalysisService.getBidderName(cba, cba.lowestBidderId)})
 </div>
 )}
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {translations.selectedSupplier}
 </label>
 <select
 value={selectedSupplier}
 onChange={(e) => setSelectedSupplier(e.target.value)}
 disabled={cba.locked}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="">{isRTL ? 'اختيار المورد...' : 'Select Supplier...'}</option>
 {cba.bidders.map(bidder => (
 <option key={bidder.id} value={bidder.id}>
 {bidder.companyName}
 </option>
 ))}
 </select>
 </div>
 </div>

 {selectedSupplier && selectedSupplier !== cba.lowestBidderId && (
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
 <AlertCircle className="w-5 h-5 text-yellow-600 inline me-2" />
 <span className="text-yellow-800 font-medium">{translations.justificationRequired}</span>
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {translations.selectionJustification}
 </label>
 <textarea
 value={justification}
 onChange={(e) => setJustification(e.target.value)}
 disabled={cba.locked}
 rows={4}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 placeholder={t.placeholders.provideDetailedJustificationForSupplierSelection}
 />
 </div>

 {!cba.locked && (
 <button
 onClick={handleSelectSupplier}
 className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 {translations.save}
 </button>
 )}
 </div>

 {/* Approval Signatures */}
 <div className="bg-white border border-gray-200 rounded-lg p-6">
 <h3 className="text-lg font-bold text-gray-900 mb-4">{translations.approvalSignatures}</h3>
 
 <div className="grid grid-cols-2 gap-6">
 {cba.approvalSignatures.map((sig, index) => (
 <div key={index} className="border border-gray-200 rounded-lg p-4">
 <div className="text-sm font-medium text-gray-700 mb-3">{sig.role}</div>
 <input
 type="text"
 value={sig.name || ''}
 disabled={cba.locked}
 placeholder={translations.name}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
 />
 <input
 type="date"
 value={sig.date || ''}
 disabled={cba.locked}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>
 ))}
 </div>
 </div>
 </>
 )}
 
 {/* Print Modal */}
 {showPrintModal && (
 <CompetitiveBidAnalysisPrintModal
 cba={cba}
 onClose={() => setShowPrintModal(false)}
 />
 )}
 </div>
 );
}