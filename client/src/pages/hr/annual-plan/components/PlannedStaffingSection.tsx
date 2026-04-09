/**
 * ============================================================================
 * PLANNED STAFFING SECTION
 * ============================================================================
 * 
 * Planned positions for the year
 * Full CRUD operations
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { Plus, Edit, Trash2, X, Save } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { HRAnnualPlan, PlannedPosition, hrAnnualPlanService, ContractType } from '@/app/services/hrAnnualPlanService';
import { useTranslation } from '@/i18n/useTranslation';

interface PlannedStaffingSectionProps {
 plan: HRAnnualPlan;
 isEditing: boolean;
 onUpdate: (plan: HRAnnualPlan) => void;
}

export function PlannedStaffingSection({
 plan, isEditing, onUpdate }: PlannedStaffingSectionProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 const [isAddingNew, setIsAddingNew] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [formData, setFormData] = useState<Partial<PlannedPosition>>({});

 const localT = {
 title: t.hrAnnualPlan.plannedStaffingRequirements,
 description: 'Define new positions required for the planning year, including justification and funding sources',
 addPosition: t.hrAnnualPlan.addPlannedPosition,
 
 // Form labels
 positionTitle: t.hrAnnualPlan.positionTitle,
 department: t.hrAnnualPlan.department,
 projectProgram: t.hrAnnualPlan.projectprogram,
 grade: t.hrAnnualPlan.grade,
 contractType: t.hrAnnualPlan.contractType,
 numberOfPositions: t.hrAnnualPlan.numberOfPositions,
 plannedStartDate: t.hrAnnualPlan.plannedStartDate,
 plannedEndDate: t.hrAnnualPlan.plannedEndDate,
 justification: t.hrAnnualPlan.justification,
 fundingSource: t.hrAnnualPlan.fundingSource,
 annualSalaryCost: t.hrAnnualPlan.annualSalaryCost,
 allowances: t.hrAnnualPlan.allowances,
 totalCost: t.hrAnnualPlan.totalCostPerPosition,
 
 // Actions
 save: t.hrAnnualPlan.save,
 cancel: t.hrAnnualPlan.cancel,
 edit: t.hrAnnualPlan.edit,
 delete: t.hrAnnualPlan.delete,
 
 // Table headers
 position: t.hrAnnualPlan.position,
 dept: t.hrAnnualPlan.dept,
 project: t.hrAnnualPlan.project,
 quantity: t.hrAnnualPlan.qty,
 dates: t.hrAnnualPlan.period,
 funding: t.hrAnnualPlan.funding,
 cost: t.hrAnnualPlan.cost,
 actions: t.hrAnnualPlan.actions2,
 
 // Messages
 noPositions: 'No planned positions yet. Add positions to build your staffing plan.',
 totalPositions: t.hrAnnualPlan.totalPositions,
 totalEstimatedCost: t.hrAnnualPlan.totalEstimatedCost,
 
 // Contract types
 fixedTerm: t.hrAnnualPlan.fixedterm,
 shortTerm: t.hrAnnualPlan.shortterm,
 consultancy: t.hrAnnualPlan.consultancy,
 permanent: t.hrAnnualPlan.permanent,
 
 // Funding sources
 grant: t.hrAnnualPlan.grant,
 core: t.hrAnnualPlan.core,
 tbd: t.hrAnnualPlan.tbd
 };

 const resetForm = () => {
 setFormData({});
 setIsAddingNew(false);
 setEditingId(null);
 };

 const handleAdd = () => {
 if (!formData.positionTitle || !formData.department || !formData.numberOfPositions) {
 alert(t.hrAnnualPlan.pleaseFillRequiredFields);
 return;
 }

 const newPosition: Omit<PlannedPosition, 'id'> = {
 positionTitle: formData.positionTitle!,
 department: formData.department!,
 projectProgram: formData.projectProgram || '',
 grade: formData.grade || '',
 contractType: (formData.contractType as ContractType) || 'Fixed-Term',
 numberOfPositions: formData.numberOfPositions!,
 plannedStartDate: formData.plannedStartDate || '',
 plannedEndDate: formData.plannedEndDate || '',
 justification: formData.justification || '',
 fundingSource: formData.fundingSource || 'TBD',
 annualSalaryCost: formData.annualSalaryCost || 0,
 allowances: formData.allowances || 0,
 totalCost: (formData.annualSalaryCost || 0) + (formData.allowances || 0)
 };

 const updated = hrAnnualPlanService.addPlannedPosition(plan.id, newPosition);
 if (updated) {
 onUpdate(updated);
 resetForm();
 }
 };

 const handleEdit = (position: PlannedPosition) => {
 setFormData(position);
 setEditingId(position.id);
 setIsAddingNew(false);
 };

 const handleUpdate = () => {
 if (!editingId) return;

 const updated = hrAnnualPlanService.updatePlannedPosition(plan.id, editingId, {
 ...formData,
 totalCost: (formData.annualSalaryCost || 0) + (formData.allowances || 0)
 });
 
 if (updated) {
 onUpdate(updated);
 resetForm();
 }
 };

 const handleDelete = (positionId: string) => {
 if (confirm(t.hrAnnualPlan.deleteThisPosition)) {
 const updated = hrAnnualPlanService.deletePlannedPosition(plan.id, positionId);
 if (updated) {
 onUpdate(updated);
 }
 }
 };

 const formatCurrency = (amount: number) => {
 return `$${amount.toLocaleString()}`;
 };

 const formatDate = (dateString: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrAnnualPlan.en, {
 year: 'numeric',
 month: 'short'
 });
 };

 const totalPositions = plan.plannedPositions.reduce((sum, p) => sum + p.numberOfPositions, 0);
 const totalCost = plan.plannedPositions.reduce((sum, p) => {
 const cost = (p.totalCost || 0) * p.numberOfPositions;
 return sum + cost;
 }, 0);

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Section Header */}
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
 <span>{t.addPosition}</span>
 </button>
 )}
 </div>

 {/* Summary Cards */}
 {plan.plannedPositions.length > 0 && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>
 {t.totalPositions}
 </p>
 <p className={`text-3xl font-bold text-gray-900 text-start`}>
 {totalPositions}
 </p>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>
 {t.totalEstimatedCost}
 </p>
 <p className={`text-3xl font-bold text-gray-900 text-start`}>
 {formatCurrency(totalCost)}
 </p>
 </div>
 </div>
 )}

 {/* Add/Edit Form */}
 {(isAddingNew || editingId) && (
 <div className="bg-white rounded-lg border-2 border-indigo-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {editingId ? (t.hrAnnualPlan.editPosition) : (t.hrAnnualPlan.addNewPosition)}
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Position Title */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.positionTitle} *
 </label>
 <input
 type="text"
 value={formData.positionTitle || ''}
 onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 placeholder={t.hrAnnualPlan.egProgramOfficer}
 />
 </div>

 {/* Department */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.department} *
 </label>
 <select
 value={formData.department || ''}
 onChange={(e) => setFormData({ ...formData, department: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 >
 <option value="">Select...</option>
 <option value="Programs">Programs</option>
 <option value="Operations">Operations</option>
 <option value="Finance">Finance</option>
 <option value="HR">Human Resources</option>
 <option value="Logistics">Logistics</option>
 </select>
 </div>

 {/* Project/Program */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.projectProgram}
 </label>
 <input
 type="text"
 value={formData.projectProgram || ''}
 onChange={(e) => setFormData({ ...formData, projectProgram: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 placeholder={t.placeholders.echoYem001}
 />
 </div>

 {/* Grade */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.grade}
 </label>
 <select
 value={formData.grade || ''}
 onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 >
 <option value="">Select...</option>
 <option value="G1">G1</option>
 <option value="G2">G2</option>
 <option value="G3">G3</option>
 <option value="G4">G4</option>
 <option value="G5">G5</option>
 <option value="G6">G6</option>
 <option value="G7">G7</option>
 </select>
 </div>

 {/* Contract Type */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.contractType}
 </label>
 <select
 value={formData.contractType || 'Fixed-Term'}
 onChange={(e) => setFormData({ ...formData, contractType: e.target.value as ContractType })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 >
 <option value="Fixed-Term">{t.fixedTerm}</option>
 <option value="Short-Term">{t.shortTerm}</option>
 <option value="Consultancy">{t.consultancy}</option>
 <option value="Permanent">{t.permanent}</option>
 </select>
 </div>

 {/* Number of Positions */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.numberOfPositions} *
 </label>
 <input
 type="number"
 min="1"
 value={formData.numberOfPositions || ''}
 onChange={(e) => setFormData({ ...formData, numberOfPositions: parseInt(e.target.value) || 1 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 />
 </div>

 {/* Planned Start Date */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.plannedStartDate}
 </label>
 <input
 type="date"
 value={formData.plannedStartDate || ''}
 onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 />
 </div>

 {/* Planned End Date */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.plannedEndDate}
 </label>
 <input
 type="date"
 value={formData.plannedEndDate || ''}
 onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 />
 </div>

 {/* Funding Source */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.fundingSource}
 </label>
 <select
 value={formData.fundingSource || 'TBD'}
 onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 >
 <option value="Grant">{t.grant}</option>
 <option value="Core">{t.core}</option>
 <option value="TBD">{t.tbd}</option>
 </select>
 </div>

 {/* Annual Salary Cost */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.annualSalaryCost}
 </label>
 <input
 type="number"
 min="0"
 value={formData.annualSalaryCost || ''}
 onChange={(e) => setFormData({ ...formData, annualSalaryCost: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 placeholder="40000"
 />
 </div>

 {/* Allowances */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.allowances}
 </label>
 <input
 type="number"
 min="0"
 value={formData.allowances || ''}
 onChange={(e) => setFormData({ ...formData, allowances: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 placeholder="5000"
 />
 </div>

 {/* Justification */}
 <div className="md:col-span-2">
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.justification}
 </label>
 <textarea
 rows={3}
 value={formData.justification || ''}
 onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
 placeholder={t.hrAnnualPlan.explainWhyThisPositionIsNeeded}
 />
 </div>
 </div>

 {/* Form Actions */}
 <div className={`flex items-center gap-2 mt-4`}>
 <button
 onClick={editingId ? handleUpdate : handleAdd}
 className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700`}
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

 {/* Positions Table */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {plan.plannedPositions.length === 0 ? (
 <div className="px-6 py-12 text-center">
 <p className="text-gray-600 mb-4">{t.noPositions}</p>
 {isEditing && (
 <button
 onClick={() => setIsAddingNew(true)}
 className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700`}
 >
 <Plus className="w-4 h-4" />
 <span>{t.addPosition}</span>
 </button>
 )}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.position}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.dept}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.project}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.grade}</th>
 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.quantity}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.dates}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.funding}</th>
 <th className="px-4 py-3 text-end text-xs font-semibold text-gray-700">{t.cost}</th>
 {isEditing && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.actions}</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {plan.plannedPositions.map((position) => (
 <tr key={position.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-medium text-gray-900">{position.positionTitle}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{position.department}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{position.projectProgram || '-'}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{position.grade || '-'}</td>
 <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">{position.numberOfPositions}</td>
 <td className="px-4 py-3 text-sm text-gray-700">
 {formatDate(position.plannedStartDate)} - {formatDate(position.plannedEndDate)}
 </td>
 <td className="px-4 py-3 text-sm">
 <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ position.fundingSource === 'Grant' ? 'bg-green-100 text-green-700' : position.fundingSource === 'Core' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700' }`}>
 {position.fundingSource}
 </span>
 </td>
 <td className="px-4 py-3 text-sm text-end font-semibold text-gray-900">
 {formatCurrency((position.totalCost || 0) * position.numberOfPositions)}
 </td>
 {isEditing && (
 <td className="px-4 py-3 text-center">
 <div className={`flex items-center justify-center gap-1`}>
 <button
 onClick={() => handleEdit(position)}
 className="p-1 text-blue-600 hover:bg-blue-50 rounded"
 title={t.edit}
 >
 <Edit className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDelete(position.id)}
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
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 );
}
