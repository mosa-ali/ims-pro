// ============================================================================
// BID EVALUATION CRITERIA MANAGEMENT
// Single source of truth for tender evaluation - Excel-like interface
// Auto-syncs to CBA
// Integrated Management System (IMS)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Save, Printer, Lock, Unlock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { bidEvaluationCriteriaService } from '@/services/bidEvaluationCriteriaService';
import type { BidEvaluationCriteria, ProcurementRequest } from '@/types/logistics.types';
import { BidEvaluationCriteriaPrintModal } from './BidEvaluationCriteriaPrintModal';

interface Props {
  pr: ProcurementRequest;
}

export function BidEvaluationCriteriaForm({ pr }: Props) {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  const [criteria, setCriteria] = useState<BidEvaluationCriteria | null>(null);
  const [newBidderName, setNewBidderName] = useState('');
  const [showAddBidder, setShowAddBidder] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<string, string>>({});
  const [showPrintModal, setShowPrintModal] = useState(false);

  const translations = {
    title: language === 'en' ? 'Bid Evaluation Criteria / Checklist' : 'معايير تقييم العطاءات / قائمة المراجعة',
    prNumber: language === 'en' ? 'PR Number' : 'رقم طلب الشراء',
    tenderNumber: language === 'en' ? 'Tender / RFQ Number' : 'رقم العطاء / RFQ',
    evaluationDate: language === 'en' ? 'Evaluation Date' : 'تاريخ التقييم',
    
    bidders: language === 'en' ? 'Bidders' : 'المتقدمون',
    addBidder: language === 'en' ? 'Add Bidder' : 'إضافة متقدم',
    bidderName: language === 'en' ? 'Bidder Name' : 'اسم المتقدم',
    removeBidder: language === 'en' ? 'Remove' : 'إزالة',
    
    section: language === 'en' ? 'Section' : 'القسم',
    requirement: language === 'en' ? 'Requirement' : 'المتطلب',
    details: language === 'en' ? 'Details' : 'التفاصيل',
    weight: language === 'en' ? 'Weight' : 'الوزن',
    
    totalWeight: language === 'en' ? 'Total Weight' : 'إجمالي الوزن',
    bidderTotal: language === 'en' ? 'Total' : 'الإجمالي',
    
    status: language === 'en' ? 'Status' : 'الحالة',
    draft: language === 'en' ? 'Draft' : 'مسودة',
    inProgress: language === 'en' ? 'In Progress' : 'قيد التنفيذ',
    finalized: language === 'en' ? 'Finalized' : 'منتهي',
    
    startEvaluation: language === 'en' ? 'Start Evaluation' : 'بدء التقييم',
    finalizeEvaluation: language === 'en' ? 'Finalize Evaluation' : 'إنهاء التقييم',
    locked: language === 'en' ? 'Locked' : 'مقفل',
    
    save: language === 'en' ? 'Save' : 'حفظ',
    print: language === 'en' ? 'Print' : 'طباعة',
    
    approval: language === 'en' ? 'Approval' : 'الاعتماد',
    preparedBy: language === 'en' ? 'Prepared By' : 'تم الإعداد بواسطة',
    reviewedBy: language === 'en' ? 'Reviewed By' : 'تمت المراجعة بواسطة',
    approvedBy: language === 'en' ? 'Approved By' : 'تم الاعتماد بواسطة',
    
    criteriaLocked: language === 'en' ? 'Criteria are locked. Cannot add or modify requirements.' : 'المعايير مقفلة. لا يمكن إضافة أو تعديل المتطلبات.',
    biddersLocked: language === 'en' ? 'Bidders are locked. Cannot add or remove bidders.' : 'المتقدمون مقفلون. لا يمكن إضافة أو إزالة المتقدمين.',
    startEvaluationConfirm: language === 'en' ? 'Starting evaluation will lock criteria and bidders. Continue?' : 'بدء التقييم سيقفل المعايير والمتقدمين. هل تريد المتابعة؟'
  };

  // Load criteria
  useEffect(() => {
    loadCriteria();
  }, [pr.id]);

  const loadCriteria = () => {
    let loaded = bidEvaluationCriteriaService.getByPRId(pr.id);
    
    if (!loaded) {
      loaded = bidEvaluationCriteriaService.initialize(
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
    
    setCriteria(loaded);
  };

  const handleAddBidder = () => {
    if (!newBidderName.trim() || !criteria) return;
    
    const updated = bidEvaluationCriteriaService.addBidder(
      pr.id,
      newBidderName.trim(),
      user?.id || 'system'
    );
    
    if (updated) {
      setCriteria(updated);
      setNewBidderName('');
      setShowAddBidder(false);
    }
  };

  const handleRemoveBidder = (bidderId: string) => {
    if (!confirm('Remove this bidder?')) return;
    
    const updated = bidEvaluationCriteriaService.removeBidder(
      pr.id,
      bidderId,
      user?.id || 'system'
    );
    
    if (updated) {
      setCriteria(updated);
    }
  };

  const handleScoreChange = (requirementId: string, bidderId: string, value: string) => {
    const key = `${requirementId}_${bidderId}`;
    setEditingScores({ ...editingScores, [key]: value });
  };

  const handleScoreBlur = (requirementId: string, bidderId: string) => {
    const key = `${requirementId}_${bidderId}`;
    const value = editingScores[key];
    
    if (value === undefined) return;
    
    const score = parseFloat(value) || 0;
    const updated = bidEvaluationCriteriaService.updateScore(
      pr.id,
      requirementId,
      bidderId,
      score,
      undefined,
      user?.id || 'system'
    );
    
    if (updated) {
      setCriteria(updated);
    }
  };

  const handleStartEvaluation = () => {
    if (!criteria) return;
    
    if (!confirm(translations.startEvaluationConfirm)) return;
    
    const updated = bidEvaluationCriteriaService.startEvaluation(
      pr.id,
      user?.id || 'system'
    );
    
    if (updated) {
      setCriteria(updated);
    }
  };

  const handleFinalize = () => {
    const updated = bidEvaluationCriteriaService.finalize(
      pr.id,
      user?.id || 'system'
    );
    
    if (updated) {
      setCriteria(updated);
    }
  };

  const handleHeaderChange = (updates: Partial<BidEvaluationCriteria>) => {
    if (!criteria) return;
    const updated = bidEvaluationCriteriaService.updateHeader(
      pr.id,
      updates,
      user?.id || 'system'
    );
    if (updated) {
      setCriteria(updated);
    }
  };

  const getScore = (requirementId: string, bidderId: string): number => {
    if (!criteria) return 0;
    const key = `${requirementId}_${bidderId}`;
    
    if (editingScores[key] !== undefined) {
      return parseFloat(editingScores[key]) || 0;
    }
    
    const scoreEntry = criteria.scores.find(
      s => s.requirementId === requirementId && s.bidderId === bidderId
    );
    return scoreEntry?.score || 0;
  };

  const getBidderTotal = (bidderId: string): number => {
    if (!criteria) return 0;
    return criteria.bidderTotals[bidderId] || 0;
  };

  const groupedRequirements = criteria 
    ? bidEvaluationCriteriaService.getRequirementsBySection(criteria)
    : {};

  if (!criteria) {
    return <div>Loading...</div>;
  }

  const totalWeight = bidEvaluationCriteriaService.getTotalWeight(criteria);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{translations.title}</h2>
          <div className="flex items-center gap-2">
            {criteria.status === 'draft' && (
              <button
                onClick={handleStartEvaluation}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Lock className="w-4 h-4" />
                {translations.startEvaluation}
              </button>
            )}
            {criteria.status === 'in_progress' && (
              <button
                onClick={handleFinalize}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                {translations.finalizeEvaluation}
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations.prNumber}
            </label>
            <div className="text-gray-900 font-semibold">{pr.prNumber}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations.tenderNumber}
            </label>
            <div className="text-gray-900">{criteria.tenderRfqNumber || '-'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations.evaluationDate}
            </label>
            <div className="text-gray-900">{criteria.evaluationDate}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{translations.status}:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              criteria.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              criteria.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {criteria.status === 'draft' ? translations.draft :
               criteria.status === 'in_progress' ? translations.inProgress :
               translations.finalized}
            </span>
          </div>
          
          {criteria.criteriaLocked && (
            <div className="flex items-center gap-2 text-orange-600">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">{translations.criteriaLocked}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bidders Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{translations.bidders}</h3>
          {!criteria.biddersLocked && (
            <button
              onClick={() => setShowAddBidder(!showAddBidder)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              {translations.addBidder}
            </button>
          )}
        </div>

        {showAddBidder && (
          <div className="mb-4 flex items-center gap-2">
            <input
              type="text"
              value={newBidderName}
              onChange={(e) => setNewBidderName(e.target.value)}
              placeholder={translations.bidderName}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleAddBidder()}
            />
            <button
              onClick={handleAddBidder}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {translations.save}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {criteria.bidders.map((bidder, index) => (
            <div
              key={bidder.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <span className="font-medium text-gray-900">
                {index + 1}. {bidder.bidderName}
              </span>
              {!criteria.biddersLocked && (
                <button
                  onClick={() => handleRemoveBidder(bidder.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {criteria.bidders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No bidders added yet
          </div>
        )}
      </div>

      {/* Evaluation Matrix */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300 min-w-[200px]">
                  {translations.section}
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300 min-w-[200px]">
                  {translations.requirement}
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300 min-w-[200px]">
                  {translations.details}
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300 w-20">
                  {translations.weight}
                </th>
                {criteria.bidders.map(bidder => (
                  <th
                    key={bidder.id}
                    className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300 min-w-[120px]"
                  >
                    {bidder.bidderName}
                  </th>
                ))}
              </tr>
            </thead>
            {Object.entries(groupedRequirements).map(([section, requirements]) => (
              <tbody key={section}>
                {/* Section Header */}
                <tr className="bg-blue-50 border-b border-gray-300">
                  <td
                    colSpan={4 + criteria.bidders.length}
                    className="px-4 py-2 text-sm font-bold text-blue-900"
                  >
                    {section}
                  </td>
                </tr>
                
                {/* Requirements */}
                {requirements.map((req, index) => (
                  <tr key={req.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                      {section}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {req.requirementName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                      {req.details}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">
                      {req.weight}
                    </td>
                    
                    {/* Score cells */}
                    {criteria.bidders.map(bidder => (
                      <td
                        key={bidder.id}
                        className="px-2 py-2 border-r border-gray-200"
                      >
                        <input
                          type="number"
                          min="0"
                          max={req.weight}
                          step="0.1"
                          value={getScore(req.id, bidder.id)}
                          onChange={(e) => handleScoreChange(req.id, bidder.id, e.target.value)}
                          onBlur={() => handleScoreBlur(req.id, bidder.id)}
                          className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
            
            {/* Totals Row */}
            <tbody>
              <tr className="bg-gray-100 border-t-2 border-gray-400">
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-r border-gray-300">
                  {translations.totalWeight}
                </td>
                <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300">
                  {totalWeight}
                </td>
                {criteria.bidders.map(bidder => (
                  <td
                    key={bidder.id}
                    className="px-4 py-3 text-center text-lg font-bold text-blue-900 border-r border-gray-300"
                  >
                    {getBidderTotal(bidder.id).toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{translations.approval}</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations.preparedBy}
            </label>
            <input
              type="text"
              value={criteria.preparedByName || ''}
              onChange={(e) => handleHeaderChange({ preparedByName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Name"
            />
            <input
              type="date"
              value={criteria.preparedDate || ''}
              onChange={(e) => handleHeaderChange({ preparedDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations.reviewedBy}
            </label>
            <input
              type="text"
              value={criteria.reviewedByName || ''}
              onChange={(e) => handleHeaderChange({ reviewedByName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Name"
            />
            <input
              type="date"
              value={criteria.reviewedDate || ''}
              onChange={(e) => handleHeaderChange({ reviewedDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations.approvedBy}
            </label>
            <input
              type="text"
              value={criteria.approvedByName || ''}
              onChange={(e) => handleHeaderChange({ approvedByName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Name"
            />
            <input
              type="date"
              value={criteria.approvedDate || ''}
              onChange={(e) => handleHeaderChange({ approvedDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-2"
            />
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {showPrintModal && (
        <BidEvaluationCriteriaPrintModal
          criteria={criteria}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}