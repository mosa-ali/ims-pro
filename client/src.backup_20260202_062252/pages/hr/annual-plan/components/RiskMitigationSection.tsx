/**
 * ============================================================================
 * RISK MITIGATION SECTION
 * ============================================================================
 */

import { useState } from 'react';
import { AlertTriangle, Plus, Edit, Trash2, Save } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { HRAnnualPlan, HRRisk, hrAnnualPlanService, RiskImpact, RiskLikelihood } from '@/app/services/hrAnnualPlanService';

interface RiskMitigationSectionProps {
  plan: HRAnnualPlan;
  isEditing: boolean;
  onUpdate: (plan: HRAnnualPlan) => void;
}

export function RiskMitigationSection({ plan, isEditing, onUpdate }: RiskMitigationSectionProps) {
  const { language, isRTL } = useLanguage();
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<HRRisk>>({});

  const t = {
    title: language === 'en' ? 'HR Risks & Mitigation Plan' : 'مخاطر الموارد البشرية وخطة التخفيف',
    description: language === 'en'
      ? 'Identify HR risks and define mitigation strategies for proactive management'
      : 'تحديد مخاطر الموارد البشرية وتحديد استراتيجيات التخفيف للإدارة الاستباقية',
    addRisk: language === 'en' ? 'Add HR Risk' : 'إضافة مخاطرة',
    
    riskDescription: language === 'en' ? 'Risk Description' : 'وصف المخاطرة',
    impact: language === 'en' ? 'Impact' : 'التأثير',
    likelihood: language === 'en' ? 'Likelihood' : 'الاحتمالية',
    mitigationAction: language === 'en' ? 'Mitigation Action' : 'إجراء التخفيف',
    responsiblePerson: language === 'en' ? 'Responsible Person' : 'الشخص المسؤول',
    timeline: language === 'en' ? 'Timeline' : 'الجدول الزمني',
    
    high: language === 'en' ? 'High' : 'عالي',
    medium: language === 'en' ? 'Medium' : 'متوسط',
    low: language === 'en' ? 'Low' : 'منخفض',
    
    save: language === 'en' ? 'Save' : 'حفظ',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    delete: language === 'en' ? 'Delete' : 'حذف',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    noRisks: language === 'en' ? 'No HR risks identified yet.' : 'لم يتم تحديد مخاطر الموارد البشرية بعد.',
    totalRisks: language === 'en' ? 'Total Identified Risks' : 'إجمالي المخاطر المحددة',
    highRisks: language === 'en' ? 'High Priority Risks' : 'المخاطر ذات الأولوية العالية'
  };

  const resetForm = () => {
    setFormData({});
    setIsAddingNew(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!formData.riskDescription || !formData.mitigationAction) {
      alert(language === 'en' ? 'Please fill required fields' : 'الرجاء ملء الحقول المطلوبة');
      return;
    }

    const newRisk: Omit<HRRisk, 'id'> = {
      riskDescription: formData.riskDescription!,
      impact: (formData.impact as RiskImpact) || 'Medium',
      likelihood: (formData.likelihood as RiskLikelihood) || 'Medium',
      mitigationAction: formData.mitigationAction!,
      responsiblePerson: formData.responsiblePerson || '',
      timeline: formData.timeline || ''
    };

    const updated = hrAnnualPlanService.addHRRisk(plan.id, newRisk);
    if (updated) {
      onUpdate(updated);
      resetForm();
    }
  };

  const handleEdit = (risk: HRRisk) => {
    setFormData(risk);
    setEditingId(risk.id);
    setIsAddingNew(false);
  };

  const handleUpdate = () => {
    if (!editingId) return;
    const updated = hrAnnualPlanService.updateHRRisk(plan.id, editingId, formData);
    if (updated) {
      onUpdate(updated);
      resetForm();
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(language === 'en' ? 'Delete this risk?' : 'حذف هذه المخاطرة؟')) {
      const updated = hrAnnualPlanService.deleteHRRisk(plan.id, id);
      if (updated) onUpdate(updated);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const highRisks = plan.hrRisks.filter(r => r.impact === 'High' || r.likelihood === 'High').length;

  return (
    <div className="space-y-6">
      <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h2>
          <p className="text-sm text-gray-600">{t.description}</p>
        </div>
        {isEditing && !isAddingNew && !editingId && (
          <button onClick={() => setIsAddingNew(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Plus className="w-4 h-4" /><span>{t.addRisk}</span>
          </button>
        )}
      </div>

      {plan.hrRisks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.totalRisks}</p>
            <p className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{plan.hrRisks.length}</p>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <p className={`text-sm text-red-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.highRisks}</p>
            <p className={`text-3xl font-bold text-red-900 ${isRTL ? 'text-right' : 'text-left'}`}>{highRisks}</p>
          </div>
        </div>
      )}

      {(isAddingNew || editingId) && (
        <div className="bg-white rounded-lg border-2 border-red-200 p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {editingId ? (language === 'en' ? 'Edit Risk' : 'تعديل المخاطرة') : (language === 'en' ? 'Add Risk' : 'إضافة مخاطرة')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.riskDescription} *</label>
              <textarea rows={2} value={formData.riskDescription || ''} onChange={(e) => setFormData({ ...formData, riskDescription: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder={language === 'en' ? 'High staff turnover due to security concerns' : 'معدل دوران عالي للموظفين بسبب المخاوف الأمنية'} />
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.impact}</label>
              <select value={formData.impact || 'Medium'} onChange={(e) => setFormData({ ...formData, impact: e.target.value as RiskImpact })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                <option value="High">{t.high}</option>
                <option value="Medium">{t.medium}</option>
                <option value="Low">{t.low}</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.likelihood}</label>
              <select value={formData.likelihood || 'Medium'} onChange={(e) => setFormData({ ...formData, likelihood: e.target.value as RiskLikelihood })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                <option value="High">{t.high}</option>
                <option value="Medium">{t.medium}</option>
                <option value="Low">{t.low}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.mitigationAction} *</label>
              <textarea rows={2} value={formData.mitigationAction || ''} onChange={(e) => setFormData({ ...formData, mitigationAction: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder={language === 'en' ? 'Enhanced security measures and risk allowances' : 'تعزيز التدابير الأمنية وبدلات المخاطر'} />
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.responsiblePerson}</label>
              <input type="text" value={formData.responsiblePerson || ''} onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" placeholder="HR Manager" />
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.timeline}</label>
              <input type="text" value={formData.timeline || ''} onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" placeholder="Ongoing" />
            </div>
          </div>
          <div className={`flex items-center gap-2 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button onClick={editingId ? handleUpdate : handleAdd}
              className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Save className="w-4 h-4" /><span>{t.save}</span>
            </button>
            <button onClick={resetForm} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">{t.cancel}</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {plan.hrRisks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">{t.noRisks}</p>
            {isEditing && (
              <button onClick={() => setIsAddingNew(true)}
                className={`inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Plus className="w-4 h-4" /><span>{t.addRisk}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.riskDescription}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.impact}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.likelihood}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.mitigationAction}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.responsiblePerson}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.timeline}</th>
                  {isEditing && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {plan.hrRisks.map((risk) => (
                  <tr key={risk.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{risk.riskDescription}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getRiskColor(risk.impact)}`}>
                        {risk.impact === 'High' ? t.high : risk.impact === 'Medium' ? t.medium : t.low}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getRiskColor(risk.likelihood)}`}>
                        {risk.likelihood === 'High' ? t.high : risk.likelihood === 'Medium' ? t.medium : t.low}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{risk.mitigationAction}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{risk.responsiblePerson || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{risk.timeline || '-'}</td>
                    {isEditing && (
                      <td className="px-4 py-3 text-center">
                        <div className={`flex items-center justify-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button onClick={() => handleEdit(risk)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title={t.edit}><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(risk.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title={t.delete}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
