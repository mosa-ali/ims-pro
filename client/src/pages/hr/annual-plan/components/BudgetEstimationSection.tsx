/**
 * ============================================================================
 * BUDGET ESTIMATION SECTION
 * ============================================================================
 * 
 * Salary costs (auto-calculated) + Non-salary costs (manual entry)
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { DollarSign, Plus, Edit, Trash2, Save } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { HRAnnualPlan, NonSalaryCost, hrAnnualPlanService } from '@/app/services/hrAnnualPlanService';
import { useTranslation } from '@/i18n/useTranslation';

interface BudgetEstimationSectionProps {
 plan: HRAnnualPlan;
 isEditing: boolean;
 onUpdate: (plan: HRAnnualPlan) => void;
}

export function BudgetEstimationSection({
 plan, isEditing, onUpdate }: BudgetEstimationSectionProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 const [isAddingCost, setIsAddingCost] = useState(false);
 const [editingCostId, setEditingCostId] = useState<string | null>(null);
 const [costFormData, setCostFormData] = useState<Partial<NonSalaryCost>>({});

 const localT = {
 title: t.hrAnnualPlan.hrCostBudgetEstimation,
 salaryCostForecast: t.hrAnnualPlan.salaryCostForecast,
 nonSalaryCosts: t.hrAnnualPlan.nonsalaryHrCosts,
 budgetSummary: t.hrAnnualPlan.hrBudgetSummary,
 
 // Salary forecast labels
 position: t.hrAnnualPlan.position,
 quantity: t.hrAnnualPlan.qty,
 annualSalary: t.hrAnnualPlan.annualSalary,
 allowances: t.hrAnnualPlan.allowances,
 totalCost: t.hrAnnualPlan.totalCost,
 
 // Non-salary cost labels
 addCost: t.hrAnnualPlan.addCostItem,
 category: t.hrAnnualPlan.category,
 description: t.hrAnnualPlan.description,
 estimatedAmount: t.hrAnnualPlan.estimatedAmount,
 notes: t.hrAnnualPlan.notes,
 
 // Categories
 recruitment: t.hrAnnualPlan.recruitment,
 training: t.hrAnnualPlan.training,
 insurance: t.hrAnnualPlan.insurance,
 medical: t.hrAnnualPlan.medical,
 endOfService: t.hrAnnualPlan.endOfService,
 other: t.hrAnnualPlan.other,
 
 // Actions
 save: t.hrAnnualPlan.save,
 cancel: t.hrAnnualPlan.cancel,
 edit: t.hrAnnualPlan.edit,
 delete: t.hrAnnualPlan.delete,
 actions: t.hrAnnualPlan.actions2,
 
 // Summary
 totalSalaryCost: t.hrAnnualPlan.totalSalaryCost,
 totalNonSalaryCost: t.hrAnnualPlan.totalNonsalaryCost,
 grandTotalHRBudget: t.hrAnnualPlan.grandTotalHrBudget,
 
 // Messages
 noCosts: t.hrAnnualPlan.noNonsalaryCostsAddedYet,
 autoCalculated: t.hrAnnualPlan.autocalculatedFromPlannedPositions
 };

 const resetForm = () => {
 setCostFormData({});
 setIsAddingCost(false);
 setEditingCostId(null);
 };

 const handleAddCost = () => {
 if (!costFormData.category || !costFormData.estimatedAmount) {
 alert(t.hrAnnualPlan.pleaseFillRequiredFields);
 return;
 }

 const newCost: Omit<NonSalaryCost, 'id'> = {
 category: costFormData.category!,
 description: costFormData.description || '',
 estimatedAmount: costFormData.estimatedAmount!,
 notes: costFormData.notes || ''
 };

 const updated = hrAnnualPlanService.addNonSalaryCost(plan.id, newCost);
 if (updated) {
 onUpdate(updated);
 resetForm();
 }
 };

 const handleEditCost = (cost: NonSalaryCost) => {
 setCostFormData(cost);
 setEditingCostId(cost.id);
 setIsAddingCost(false);
 };

 const handleUpdateCost = () => {
 if (!editingCostId) return;

 const updated = hrAnnualPlanService.updateNonSalaryCost(plan.id, editingCostId, costFormData);
 if (updated) {
 onUpdate(updated);
 resetForm();
 }
 };

 const handleDeleteCost = (costId: string) => {
 if (confirm(t.hrAnnualPlan.deleteThisCostItem)) {
 const updated = hrAnnualPlanService.deleteNonSalaryCost(plan.id, costId);
 if (updated) {
 onUpdate(updated);
 }
 }
 };

 const formatCurrency = (amount: number) => {
 return `$${amount.toLocaleString()}`;
 };

 // Calculate salary cost
 const totalSalaryCost = plan.plannedPositions.reduce((sum, p) => {
 const cost = ((p.annualSalaryCost || 0) + (p.allowances || 0)) * p.numberOfPositions;
 return sum + cost;
 }, 0);

 // Calculate non-salary cost
 const totalNonSalaryCost = plan.nonSalaryCosts.reduce((sum, c) => sum + c.estimatedAmount, 0);

 // Grand total
 const grandTotal = totalSalaryCost + totalNonSalaryCost;

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Section Header */}
 <div className={'text-start'}>
 <h2 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h2>
 </div>

 {/* Budget Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
 <p className={`text-sm text-blue-700 mb-1 text-start`}>
 {t.totalSalaryCost}
 </p>
 <p className={`text-2xl font-bold text-blue-900 text-start`}>
 {formatCurrency(totalSalaryCost)}
 </p>
 </div>

 <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
 <p className={`text-sm text-purple-700 mb-1 text-start`}>
 {t.totalNonSalaryCost}
 </p>
 <p className={`text-2xl font-bold text-purple-900 text-start`}>
 {formatCurrency(totalNonSalaryCost)}
 </p>
 </div>

 <div className="bg-indigo-50 rounded-lg border-2 border-indigo-300 p-4">
 <p className={`text-sm text-indigo-700 mb-1 font-semibold text-start`}>
 {t.grandTotalHRBudget}
 </p>
 <p className={`text-2xl font-bold text-indigo-900 text-start`}>
 {formatCurrency(grandTotal)}
 </p>
 </div>
 </div>

 {/* Salary Cost Forecast */}
 <div>
 <div className={`flex items-center justify-between mb-4`}>
 <h3 className="text-lg font-semibold text-gray-900">{t.salaryCostForecast}</h3>
 <span className="text-xs text-gray-500 italic">{t.autoCalculated}</span>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.position}</th>
 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.quantity}</th>
 <th className="px-4 py-3 text-end text-xs font-semibold text-gray-700">{t.annualSalary}</th>
 <th className="px-4 py-3 text-end text-xs font-semibold text-gray-700">{t.allowances}</th>
 <th className="px-4 py-3 text-end text-xs font-semibold text-gray-700">{t.totalCost}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {plan.plannedPositions.map((position) => {
 const positionTotal = ((position.annualSalaryCost || 0) + (position.allowances || 0)) * position.numberOfPositions;
 return (
 <tr key={position.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-medium text-gray-900">{position.positionTitle}</td>
 <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">{position.numberOfPositions}</td>
 <td className="px-4 py-3 text-sm text-end text-gray-700">{formatCurrency(position.annualSalaryCost || 0)}</td>
 <td className="px-4 py-3 text-sm text-end text-gray-700">{formatCurrency(position.allowances || 0)}</td>
 <td className="px-4 py-3 text-sm text-end font-bold text-gray-900">{formatCurrency(positionTotal)}</td>
 </tr>
 );
 })}
 <tr className="bg-blue-50 font-bold">
 <td colSpan={4} className="px-4 py-3 text-sm text-end">{t.totalSalaryCost}</td>
 <td className="px-4 py-3 text-sm text-end font-bold text-blue-900">{formatCurrency(totalSalaryCost)}</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 </div>

 {/* Non-Salary Costs */}
 <div>
 <div className={`flex items-center justify-between mb-4`}>
 <h3 className="text-lg font-semibold text-gray-900">{t.nonSalaryCosts}</h3>
 {isEditing && !isAddingCost && !editingCostId && (
 <button
 onClick={() => setIsAddingCost(true)}
 className={`flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700`}
 >
 <Plus className="w-4 h-4" />
 <span>{t.addCost}</span>
 </button>
 )}
 </div>

 {/* Add/Edit Form */}
 {(isAddingCost || editingCostId) && (
 <div className="bg-white rounded-lg border-2 border-purple-200 p-6 mb-4">
 <h4 className={`text-base font-semibold text-gray-900 mb-4 text-start`}>
 {editingCostId ? (t.hrAnnualPlan.editCostItem) : (t.hrAnnualPlan.addCostItem)}
 </h4>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.category} *
 </label>
 <select
 value={costFormData.category || ''}
 onChange={(e) => setCostFormData({ ...costFormData, category: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 >
 <option value="">Select...</option>
 <option value="Recruitment">{t.recruitment}</option>
 <option value="Training">{t.training}</option>
 <option value="Insurance">{t.insurance}</option>
 <option value="Medical">{t.medical}</option>
 <option value="End of Service">{t.endOfService}</option>
 <option value="Other">{t.other}</option>
 </select>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.estimatedAmount} * ($)
 </label>
 <input
 type="number"
 min="0"
 value={costFormData.estimatedAmount || ''}
 onChange={(e) => setCostFormData({ ...costFormData, estimatedAmount: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 placeholder="25000"
 />
 </div>

 <div className="md:col-span-2">
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.description}
 </label>
 <input
 type="text"
 value={costFormData.description || ''}
 onChange={(e) => setCostFormData({ ...costFormData, description: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 placeholder={t.hrAnnualPlan.briefDescription}
 />
 </div>

 <div className="md:col-span-2">
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.notes}
 </label>
 <textarea
 rows={2}
 value={costFormData.notes || ''}
 onChange={(e) => setCostFormData({ ...costFormData, notes: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
 placeholder={t.hrAnnualPlan.additionalNotes}
 />
 </div>
 </div>

 <div className={`flex items-center gap-2 mt-4`}>
 <button
 onClick={editingCostId ? handleUpdateCost : handleAddCost}
 className={`flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700`}
 >
 <Save className="w-4 h-4" />
 <span>{t.save}</span>
 </button>
 <button
 onClick={resetForm}
 className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
 >
 {t.cancel}
 </button>
 </div>
 </div>
 )}

 {/* Non-Salary Costs Table */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {plan.nonSalaryCosts.length === 0 ? (
 <div className="px-6 py-12 text-center">
 <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600 mb-4">{t.noCosts}</p>
 {isEditing && (
 <button
 onClick={() => setIsAddingCost(true)}
 className={`inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700`}
 >
 <Plus className="w-4 h-4" />
 <span>{t.addCost}</span>
 </button>
 )}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.category}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.description}</th>
 <th className="px-4 py-3 text-end text-xs font-semibold text-gray-700">{t.estimatedAmount}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.notes}</th>
 {isEditing && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.actions}</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {plan.nonSalaryCosts.map((cost) => (
 <tr key={cost.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-medium text-gray-900">{cost.category}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{cost.description}</td>
 <td className="px-4 py-3 text-sm text-end font-semibold text-gray-900">
 {formatCurrency(cost.estimatedAmount)}
 </td>
 <td className="px-4 py-3 text-sm text-gray-600">{cost.notes || '-'}</td>
 {isEditing && (
 <td className="px-4 py-3 text-center">
 <div className={`flex items-center justify-center gap-1`}>
 <button
 onClick={() => handleEditCost(cost)}
 className="p-1 text-blue-600 hover:bg-blue-50 rounded"
 title={t.edit}
 >
 <Edit className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDeleteCost(cost.id)}
 className="p-1 text-red-600 hover:bg-red-50 rounded"
 title={t.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 )}
 </tr>
 ))}
 <tr className="bg-purple-50 font-bold">
 <td colSpan={2} className="px-4 py-3 text-sm text-end">{t.totalNonSalaryCost}</td>
 <td className="px-4 py-3 text-sm text-end font-bold text-purple-900">{formatCurrency(totalNonSalaryCost)}</td>
 <td colSpan={isEditing ? 2 : 1}></td>
 </tr>
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
