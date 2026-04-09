/**
 * ============================================================================
 * TRAINING PLAN SECTION
 * ============================================================================
 */

import { useState } from 'react';
import { GraduationCap, Plus, Edit, Trash2, Save } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { HRAnnualPlan, TrainingPlanEntry, hrAnnualPlanService, Priority, TrainingType } from '@/app/services/hrAnnualPlanService';
import { useTranslation } from '@/i18n/useTranslation';

interface TrainingPlanSectionProps {
 plan: HRAnnualPlan;
 isEditing: boolean;
 onUpdate: (plan: HRAnnualPlan) => void;
}

export function TrainingPlanSection({
 plan, isEditing, onUpdate }: TrainingPlanSectionProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 const [isAddingNew, setIsAddingNew] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [formData, setFormData] = useState<Partial<TrainingPlanEntry>>({});

 const localT = {
 title: t.hrAnnualPlan.trainingCapacityDevelopmentPlan,
 description: 'Planned training activities for capacity building (execution tracked in Training Management module)',
 addTraining: t.hrAnnualPlan.addTrainingActivity,
 
 targetGroup: t.hrAnnualPlan.targetGroup,
 trainingTopic: t.hrAnnualPlan.trainingTopic,
 objective: t.hrAnnualPlan.objective,
 type: t.hrAnnualPlan.type,
 plannedPeriod: t.hrAnnualPlan.plannedPeriod,
 estimatedCost: t.hrAnnualPlan.estimatedCost,
 priority: t.hrAnnualPlan.priority,
 
 internal: t.hrAnnualPlan.internal,
 external: t.hrAnnualPlan.external,
 high: t.hrAnnualPlan.high,
 medium: t.hrAnnualPlan.medium,
 low: t.hrAnnualPlan.low,
 
 save: t.hrAnnualPlan.save,
 cancel: t.hrAnnualPlan.cancel,
 edit: t.hrAnnualPlan.edit,
 delete: t.hrAnnualPlan.delete,
 actions: t.hrAnnualPlan.actions2,
 
 noTraining: t.hrAnnualPlan.noTrainingActivitiesPlannedYet,
 totalActivities: t.hrAnnualPlan.totalTrainingActivities,
 totalBudget: t.hrAnnualPlan.totalTrainingBudget
 };

 const resetForm = () => {
 setFormData({});
 setIsAddingNew(false);
 setEditingId(null);
 };

 const handleAdd = () => {
 if (!formData.targetGroup || !formData.trainingTopic) {
 alert(t.hrAnnualPlan.pleaseFillRequiredFields);
 return;
 }

 const newEntry: Omit<TrainingPlanEntry, 'id'> = {
 targetGroup: formData.targetGroup!,
 trainingTopic: formData.trainingTopic!,
 objective: formData.objective || '',
 type: (formData.type as TrainingType) || 'Internal',
 plannedPeriod: formData.plannedPeriod || '',
 estimatedCost: formData.estimatedCost || 0,
 priority: (formData.priority as Priority) || 'Medium'
 };

 const updated = hrAnnualPlanService.addTrainingEntry(plan.id, newEntry);
 if (updated) {
 onUpdate(updated);
 resetForm();
 }
 };

 const handleEdit = (entry: TrainingPlanEntry) => {
 setFormData(entry);
 setEditingId(entry.id);
 setIsAddingNew(false);
 };

 const handleUpdate = () => {
 if (!editingId) return;
 const updated = hrAnnualPlanService.updateTrainingEntry(plan.id, editingId, formData);
 if (updated) {
 onUpdate(updated);
 resetForm();
 }
 };

 const handleDelete = (id: string) => {
 if (confirm(t.hrAnnualPlan.deleteThisTrainingActivity)) {
 const updated = hrAnnualPlanService.deleteTrainingEntry(plan.id, id);
 if (updated) onUpdate(updated);
 }
 };

 const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
 const totalCost = plan.trainingPlan.reduce((sum, t) => sum + t.estimatedCost, 0);
 const getPriorityColor = (priority: string) => {
 switch (priority) {
 case 'High': return 'bg-red-100 text-red-700 border-red-200';
 case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
 case 'Low': return 'bg-green-100 text-green-700 border-green-200';
 default: return 'bg-gray-100 text-gray-700 border-gray-200';
 }
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className={`flex items-start justify-between`}>
 <div className={'text-start'}>
 <h2 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h2>
 <p className="text-sm text-gray-600">{t.description}</p>
 </div>
 {isEditing && !isAddingNew && !editingId && (
 <button
 onClick={() => setIsAddingNew(true)}
 className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700`}
 >
 <Plus className="w-4 h-4" />
 <span>{t.addTraining}</span>
 </button>
 )}
 </div>

 {plan.trainingPlan.length > 0 && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{t.totalActivities}</p>
 <p className={`text-3xl font-bold text-gray-900 text-start`}>{plan.trainingPlan.length}</p>
 </div>
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{t.totalBudget}</p>
 <p className={`text-3xl font-bold text-gray-900 text-start`}>{formatCurrency(totalCost)}</p>
 </div>
 </div>
 )}

 {(isAddingNew || editingId) && (
 <div className="bg-white rounded-lg border-2 border-indigo-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {editingId ? (t.hrAnnualPlan.editTraining) : (t.hrAnnualPlan.addTraining)}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.targetGroup} *</label>
 <input type="text" value={formData.targetGroup || ''} onChange={(e) => setFormData({ ...formData, targetGroup: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder={t.hrAnnualPlan.egProgramStaff} />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.trainingTopic} *</label>
 <input type="text" value={formData.trainingTopic || ''} onChange={(e) => setFormData({ ...formData, trainingTopic: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder={t.hrAnnualPlan.protectionMainstreaming} />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.type}</label>
 <select value={formData.type || 'Internal'} onChange={(e) => setFormData({ ...formData, type: e.target.value as TrainingType })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
 <option value="Internal">{t.internal}</option>
 <option value="External">{t.external}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.priority}</label>
 <select value={formData.priority || 'Medium'} onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
 <option value="High">{t.high}</option>
 <option value="Medium">{t.medium}</option>
 <option value="Low">{t.low}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.plannedPeriod}</label>
 <input type="text" value={formData.plannedPeriod || ''} onChange={(e) => setFormData({ ...formData, plannedPeriod: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder={t.placeholders.q22026} />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.estimatedCost} ($)</label>
 <input type="number" min="0" value={formData.estimatedCost || ''} onChange={(e) => setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="15000" />
 </div>
 <div className="md:col-span-2">
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>{t.objective}</label>
 <textarea rows={2} value={formData.objective || ''} onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder={t.hrAnnualPlan.trainingObjective} />
 </div>
 </div>
 <div className={`flex items-center gap-2 mt-4`}>
 <button onClick={editingId ? handleUpdate : handleAdd}
 className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700`}>
 <Save className="w-4 h-4" /><span>{t.save}</span>
 </button>
 <button onClick={resetForm} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">{t.cancel}</button>
 </div>
 </div>
 )}

 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {plan.trainingPlan.length === 0 ? (
 <div className="px-6 py-12 text-center">
 <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600 mb-4">{t.noTraining}</p>
 {isEditing && (
 <button onClick={() => setIsAddingNew(true)}
 className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700`}>
 <Plus className="w-4 h-4" /><span>{t.addTraining}</span>
 </button>
 )}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.targetGroup}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.trainingTopic}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.type}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.plannedPeriod}</th>
 <th className="px-4 py-3 text-end text-xs font-semibold text-gray-700">{t.estimatedCost}</th>
 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.priority}</th>
 {isEditing && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.actions}</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {plan.trainingPlan.map((training) => (
 <tr key={training.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-medium text-gray-900">{training.targetGroup}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{training.trainingTopic}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{training.type === 'Internal' ? t.internal : t.external}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{training.plannedPeriod}</td>
 <td className="px-4 py-3 text-sm text-end font-semibold text-gray-900">{formatCurrency(training.estimatedCost)}</td>
 <td className="px-4 py-3 text-center">
 <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(training.priority)}`}>
 {training.priority === 'High' ? t.high : training.priority === 'Medium' ? t.medium : t.low}
 </span>
 </td>
 {isEditing && (
 <td className="px-4 py-3 text-center">
 <div className={`flex items-center justify-center gap-1`}>
 <button onClick={() => handleEdit(training)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title={t.edit}><Edit className="w-4 h-4" /></button>
 <button onClick={() => handleDelete(training.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title={t.delete}><Trash2 className="w-4 h-4" /></button>
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
