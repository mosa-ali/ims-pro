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

interface BudgetEstimationSectionProps {
  plan: HRAnnualPlan;
  isEditing: boolean;
  onUpdate: (plan: HRAnnualPlan) => void;
}

export function BudgetEstimationSection({ plan, isEditing, onUpdate }: BudgetEstimationSectionProps) {
  const { language, isRTL } = useLanguage();
  
  const [isAddingCost, setIsAddingCost] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [costFormData, setCostFormData] = useState<Partial<NonSalaryCost>>({});

  const t = {
    title: language === 'en' ? 'HR Cost & Budget Estimation' : 'تقدير تكلفة الموارد البشرية والميزانية',
    salaryCostForecast: language === 'en' ? 'Salary Cost Forecast' : 'توقعات تكلفة الرواتب',
    nonSalaryCosts: language === 'en' ? 'Non-Salary HR Costs' : 'تكاليف الموارد البشرية غير المرتبطة بالرواتب',
    budgetSummary: language === 'en' ? 'HR Budget Summary' : 'ملخص ميزانية الموارد البشرية',
    
    // Salary forecast labels
    position: language === 'en' ? 'Position' : 'الوظيفة',
    quantity: language === 'en' ? 'Qty' : 'العدد',
    annualSalary: language === 'en' ? 'Annual Salary' : 'الراتب السنوي',
    allowances: language === 'en' ? 'Allowances' : 'البدلات',
    totalCost: language === 'en' ? 'Total Cost' : 'إجمالي التكلفة',
    
    // Non-salary cost labels
    addCost: language === 'en' ? 'Add Cost Item' : 'إضافة بند تكلفة',
    category: language === 'en' ? 'Category' : 'الفئة',
    description: language === 'en' ? 'Description' : 'الوصف',
    estimatedAmount: language === 'en' ? 'Estimated Amount' : 'المبلغ المقدر',
    notes: language === 'en' ? 'Notes' : 'ملاحظات',
    
    // Categories
    recruitment: language === 'en' ? 'Recruitment' : 'التوظيف',
    training: language === 'en' ? 'Training' : 'التدريب',
    insurance: language === 'en' ? 'Insurance' : 'التأمين',
    medical: language === 'en' ? 'Medical' : 'الطبي',
    endOfService: language === 'en' ? 'End of Service' : 'نهاية الخدمة',
    other: language === 'en' ? 'Other' : 'أخرى',
    
    // Actions
    save: language === 'en' ? 'Save' : 'حفظ',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    delete: language === 'en' ? 'Delete' : 'حذف',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    // Summary
    totalSalaryCost: language === 'en' ? 'Total Salary Cost' : 'إجمالي تكلفة الرواتب',
    totalNonSalaryCost: language === 'en' ? 'Total Non-Salary Cost' : 'إجمالي التكلفة غير المرتبطة بالرواتب',
    grandTotalHRBudget: language === 'en' ? 'Grand Total HR Budget' : 'إجمالي ميزانية الموارد البشرية',
    
    // Messages
    noCosts: language === 'en' ? 'No non-salary costs added yet.' : 'لم تتم إضافة تكاليف غير مرتبطة بالرواتب بعد.',
    autoCalculated: language === 'en' ? 'Auto-calculated from planned positions' : 'محسوبة تلقائياً من الوظائف المخططة'
  };

  const resetForm = () => {
    setCostFormData({});
    setIsAddingCost(false);
    setEditingCostId(null);
  };

  const handleAddCost = () => {
    if (!costFormData.category || !costFormData.estimatedAmount) {
      alert(language === 'en' ? 'Please fill required fields' : 'الرجاء ملء الحقول المطلوبة');
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
    if (confirm(language === 'en' ? 'Delete this cost item?' : 'حذف بند التكلفة هذا؟')) {
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
    <div className="space-y-6">
      {/* Section Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h2>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className={`text-sm text-blue-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.totalSalaryCost}
          </p>
          <p className={`text-2xl font-bold text-blue-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {formatCurrency(totalSalaryCost)}
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <p className={`text-sm text-purple-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.totalNonSalaryCost}
          </p>
          <p className={`text-2xl font-bold text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {formatCurrency(totalNonSalaryCost)}
          </p>
        </div>

        <div className="bg-indigo-50 rounded-lg border-2 border-indigo-300 p-4">
          <p className={`text-sm text-indigo-700 mb-1 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.grandTotalHRBudget}
          </p>
          <p className={`text-2xl font-bold text-indigo-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {formatCurrency(grandTotal)}
          </p>
        </div>
      </div>

      {/* Salary Cost Forecast */}
      <div>
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="text-lg font-semibold text-gray-900">{t.salaryCostForecast}</h3>
          <span className="text-xs text-gray-500 italic">{t.autoCalculated}</span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.position}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.quantity}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{t.annualSalary}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{t.allowances}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{t.totalCost}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {plan.plannedPositions.map((position) => {
                  const positionTotal = ((position.annualSalaryCost || 0) + (position.allowances || 0)) * position.numberOfPositions;
                  return (
                    <tr key={position.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{position.positionTitle}</td>
                      <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">{position.numberOfPositions}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(position.annualSalaryCost || 0)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(position.allowances || 0)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{formatCurrency(positionTotal)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-blue-50 font-bold">
                  <td colSpan={4} className="px-4 py-3 text-sm text-right">{t.totalSalaryCost}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-blue-900">{formatCurrency(totalSalaryCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Non-Salary Costs */}
      <div>
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="text-lg font-semibold text-gray-900">{t.nonSalaryCosts}</h3>
          {isEditing && !isAddingCost && !editingCostId && (
            <button
              onClick={() => setIsAddingCost(true)}
              className={`flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Plus className="w-4 h-4" />
              <span>{t.addCost}</span>
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(isAddingCost || editingCostId) && (
          <div className="bg-white rounded-lg border-2 border-purple-200 p-6 mb-4">
            <h4 className={`text-base font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {editingCostId ? (language === 'en' ? 'Edit Cost Item' : 'تعديل بند التكلفة') : (language === 'en' ? 'Add Cost Item' : 'إضافة بند تكلفة')}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.description}
                </label>
                <input
                  type="text"
                  value={costFormData.description || ''}
                  onChange={(e) => setCostFormData({ ...costFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder={language === 'en' ? 'Brief description...' : 'وصف موجز...'}
                />
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.notes}
                </label>
                <textarea
                  rows={2}
                  value={costFormData.notes || ''}
                  onChange={(e) => setCostFormData({ ...costFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder={language === 'en' ? 'Additional notes...' : 'ملاحظات إضافية...'}
                />
              </div>
            </div>

            <div className={`flex items-center gap-2 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={editingCostId ? handleUpdateCost : handleAddCost}
                className={`flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 ${isRTL ? 'flex-row-reverse' : ''}`}
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
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addCost}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.category}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.description}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{t.estimatedAmount}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.notes}</th>
                    {isEditing && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.actions}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {plan.nonSalaryCosts.map((cost) => (
                    <tr key={cost.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{cost.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cost.description}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {formatCurrency(cost.estimatedAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cost.notes || '-'}</td>
                      {isEditing && (
                        <td className="px-4 py-3 text-center">
                          <div className={`flex items-center justify-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                    <td colSpan={2} className="px-4 py-3 text-sm text-right">{t.totalNonSalaryCost}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-purple-900">{formatCurrency(totalNonSalaryCost)}</td>
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
