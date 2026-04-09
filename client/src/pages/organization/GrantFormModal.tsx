import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

// Project interface (matching the one in ProjectsManagementDashboard)
interface Project {
 id: string;
 title: string;
 code: string;
 projectName?: string;
 projectCode?: string;
}

interface Grant {
 id: string;
 grantNumber: string;
 grantName: string;
 donorName: string;
 donorReference: string;
 currency: string;
 grantAmount: number;
 startDate: string;
 endDate: string;
 status: 'Active' | 'Completed' | 'Pending' | 'On Hold';
 reportingStatus: 'On track' | 'Due' | 'Overdue';
 projectId: string;
 projectName: string;
 sector: string;
 responsible: string;
 description: string;
 reportingFrequency: string;
 coFunding: boolean;
 coFunderName: string;
 createdAt: string;
 updatedAt: string;
}

interface GrantFormModalProps {
 grant: Partial<Grant> | null;
 isRTL: boolean;
 onClose: () => void;
 onSave: (grant: Omit<Grant, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function GrantFormModal({
 grant, isRTL, onClose, onSave }: GrantFormModalProps) {
 const { t } = useTranslation();
 const [formData, setFormData] = useState({
 grantNumber: grant?.grantNumber || '',
 grantName: grant?.grantName || '',
 donorName: grant?.donorName || '',
 donorReference: grant?.donorReference || '',
 currency: grant?.currency || 'USD',
 grantAmount: grant?.grantAmount || 0,
 startDate: grant?.startDate || '',
 endDate: grant?.endDate || '',
 status: grant?.status || 'Pending' as const,
 reportingStatus: grant?.reportingStatus || 'On track' as const,
 projectId: grant?.projectId || '',
 projectName: grant?.projectName || '',
 sector: grant?.sector || '',
 responsible: grant?.responsible || '',
 description: grant?.description || '',
 reportingFrequency: grant?.reportingFrequency || 'Quarterly',
 coFunding: grant?.coFunding || false,
 coFunderName: grant?.coFunderName || ''
 });

 const [errors, setErrors] = useState<Record<string, string>>({});

 // ✅ Load projects from database via trpc
 const { data: projectsData = [] } = trpc.projects.list.useQuery({});
 const projects: Project[] = projectsData.map(p => ({
 id: String(p.id),
 title: p.title || '',
 code: p.code || '',
 }));

 const validate = () => {
 const newErrors: Record<string, string> = {};
 
 if (!formData.grantNumber.trim()) newErrors.grantNumber = t.organizationModule.grantNumberIsRequired;
 if (!formData.grantName.trim()) newErrors.grantName = t.organizationModule.grantNameIsRequired;
 if (!formData.donorName.trim()) newErrors.donorName = t.organizationModule.donorNameIsRequired;
 if (!formData.projectName.trim()) newErrors.projectName = t.organizationModule.projectNameIsRequired;
 if (formData.grantAmount <= 0) newErrors.grantAmount = t.organizationModule.amountMustBeGreaterThan0;
 if (!formData.startDate) newErrors.startDate = t.organizationModule.startDateIsRequired;
 if (!formData.endDate) newErrors.endDate = t.organizationModule.endDateIsRequired;
 if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
 newErrors.endDate = t.organizationModule.endDateMustBeAfterStart;
 }
 if (!formData.responsible.trim()) newErrors.responsible = t.organizationModule.responsiblePersonIsRequired;
 if (!formData.sector.trim()) newErrors.sector = t.organizationModule.sectorIsRequired;

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (validate()) {
 onSave(formData);
 }
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
 {/* Header */}
 <div className={`bg-primary text-white p-6 flex items-center justify-between`}>
 <h2 className="text-xl font-bold">
 {grant 
 ? (t.organizationModule.updateGrant)
 : (t.organizationModule.addNewGrant)
 }
 </h2>
 <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg">
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
 <div className="space-y-6">
 {/* Grant Identification */}
 <div>
 <h3 className={`text-sm font-semibold text-gray-900 mb-3 text-start`}>
 {t.organizationModule.grantIdentification}
 </h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.grantNumber5}
 </label>
 <input
 type="text"
 value={formData.grantNumber}
 onChange={(e) => setFormData({ ...formData, grantNumber: e.target.value })}
 className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.grantNumber ? 'border-red-500' : 'border-gray-300'} text-start`}
 placeholder={t.organizationModule.egGr2024001}
 />
 {errors.grantNumber && <p className="text-xs text-red-600 mt-1">{errors.grantNumber}</p>}
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.donorReference}
 </label>
 <input
 type="text"
 value={formData.donorReference}
 onChange={(e) => setFormData({ ...formData, donorReference: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary text-start`}
 placeholder={t.organizationModule.egDonref001}
 />
 </div>
 </div>

 <div className="mt-4">
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.grantName6}
 </label>
 <input
 type="text"
 value={formData.grantName}
 onChange={(e) => setFormData({ ...formData, grantName: e.target.value })}
 className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.grantName ? 'border-red-500' : 'border-gray-300'} text-start`}
 placeholder={t.organizationModule.enterGrantName}
 />
 {errors.grantName && <p className="text-xs text-red-600 mt-1">{errors.grantName}</p>}
 </div>

 <div className="mt-4">
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.description}
 </label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 rows={3}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary text-start`}
 placeholder={t.organizationModule.grantDescription}
 />
 </div>
 </div>

 {/* Donor & Project */}
 <div>
 <h3 className={`text-sm font-semibold text-gray-900 mb-3 text-start`}>
 {t.organizationModule.donorProject}
 </h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.donorName}
 </label>
 <input
 type="text"
 value={formData.donorName}
 onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
 className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.donorName ? 'border-red-500' : 'border-gray-300'} text-start`}
 placeholder={t.organizationModule.egEuropeanUnion}
 />
 {errors.donorName && <p className="text-xs text-red-600 mt-1">{errors.donorName}</p>}
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.projectName}
 </label>
 <select
 value={formData.projectId}
 onChange={(e) => {
 const selectedProject = projects.find(p => p.id === e.target.value);
 if (selectedProject) {
 setFormData({ 
 ...formData, 
 projectId: selectedProject.id,
 projectName: selectedProject.title || selectedProject.projectName || ''
 });
 }
 }}
 className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.projectName ? 'border-red-500' : 'border-gray-300'} text-start`}
 >
 <option value="">{t.organizationModule.selectProject}</option>
 {projects.map((project) => (
 <option key={project.id} value={project.id}>
 {project.projectCode ? `${project.projectCode} - ` : ''}{project.title || project.projectName}
 </option>
 ))}
 </select>
 {errors.projectName && <p className="text-xs text-red-600 mt-1">{errors.projectName}</p>}
 {projects.length === 0 && (
 <p className="text-xs text-amber-600 mt-1">
 {t.organizationModule.noProjectsAvailablePleaseCreateA}
 </p>
 )}
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.sectorTheme}
 </label>
 <input
 type="text"
 value={formData.sector}
 onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
 className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.sector ? 'border-red-500' : 'border-gray-300'} text-start`}
 placeholder={t.organizationModule.egEducation}
 />
 {errors.sector && <p className="text-xs text-red-600 mt-1">{errors.sector}</p>}
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.responsiblePerson}
 </label>
 <input
 type="text"
 value={formData.responsible}
 onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
 className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.responsible ? 'border-red-500' : 'border-gray-300'} text-start`}
 placeholder={t.organizationModule.nameOfResponsiblePerson}
 />
 {errors.responsible && <p className="text-xs text-red-600 mt-1">{errors.responsible}</p>}
 </div>
 </div>
 </div>

 {/* Financial Details */}
 <div>
 <h3 className={`text-sm font-semibold text-gray-900 mb-3 text-start`}>
 {t.organizationModule.financialDetails}
 </h3>
 <div className="grid grid-cols-3 gap-4">
 <div className="col-span-2">
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.grantAmount7}
 </label>
 <input
 type="number"
 min="0"
 step="0.01"
 value={formData.grantAmount}
 onChange={(e) => setFormData({ ...formData, grantAmount: parseFloat(e.target.value) || 0 })}
 className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.grantAmount ? 'border-red-500' : 'border-gray-300'}`}
 />
 {errors.grantAmount && <p className="text-xs text-red-600 mt-1">{errors.grantAmount}</p>}
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.currency}
 </label>
 <select
 value={formData.currency}
 onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary text-start`}
 >
 <option value="USD">USD</option>
 <option value="EUR">EUR</option>
 <option value="GBP">GBP</option>
 <option value="CHF">CHF</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mt-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.cofunding}
 </label>
 <select
 value={formData.coFunding ? 'yes' : 'no'}
 onChange={(e) => setFormData({ ...formData, coFunding: e.target.value === 'yes' })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary text-start`}
 >
 <option value="no">{t.organizationModule.no}</option>
 <option value="yes">{t.organizationModule.yes}</option>
 </select>
 </div>

 {formData.coFunding && (
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.cofunderName}
 </label>
 <input
 type="text"
 value={formData.coFunderName}
 onChange={(e) => setFormData({ ...formData, coFunderName: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary text-start`}
 placeholder={t.organizationModule.cofunderName8}
 />
 </div>
 )}
 </div>
 </div>

 {/* Dates & Reporting */}
 <div>
 <h3 className={`text-sm font-semibold text-gray-900 mb-3 text-start`}>
 {t.organizationModule.datesReporting}
 </h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.startDate9}
 </label>
 <input
 type="date"
 value={formData.startDate}
 onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
 className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.startDate ? 'border-red-500' : 'border-gray-300'}`}
 />
 {errors.startDate && <p className="text-xs text-red-600 mt-1">{errors.startDate}</p>}
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.endDate10}
 </label>
 <input
 type="date"
 value={formData.endDate}
 onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
 className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary ${errors.endDate ? 'border-red-500' : 'border-gray-300'}`}
 />
 {errors.endDate && <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>}
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.reportingFrequency}
 </label>
 <select
 value={formData.reportingFrequency}
 onChange={(e) => setFormData({ ...formData, reportingFrequency: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary text-start`}
 >
 <option value="Monthly">{t.organizationModule.monthly}</option>
 <option value="Quarterly">{t.organizationModule.quarterly}</option>
 <option value="Bi-annual">{t.organizationModule.biannual}</option>
 <option value="Annual">{t.organizationModule.annual}</option>
 </select>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.reportingStatus}
 </label>
 <select
 value={formData.reportingStatus}
 onChange={(e) => setFormData({ ...formData, reportingStatus: e.target.value as typeof formData.reportingStatus })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary text-start`}
 >
 <option value="On track">{t.organizationModule.onTrack}</option>
 <option value="Due">{t.organizationModule.due}</option>
 <option value="Overdue">{t.organizationModule.overdue}</option>
 </select>
 </div>
 </div>
 </div>

 {/* Status */}
 <div>
 <h3 className={`text-sm font-semibold text-gray-900 mb-3 text-start`}>
 {t.organizationModule.status}
 </h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.organizationModule.grantStatus}
 </label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary text-start`}
 >
 <option value="Pending">{t.organizationModule.pending}</option>
 <option value="Active">{t.organizationModule.active}</option>
 <option value="On Hold">{t.organizationModule.onHold}</option>
 <option value="Completed">{t.organizationModule.completed}</option>
 </select>
 </div>
 </div>
 </div>
 </div>

 {/* Form Actions */}
 <div className={`flex items-center gap-3 mt-6 pt-6 border-t border-gray-200`}>
 <button
 type="submit"
 className="flex-1 px-4 py-2.5 bg-primary text-white rounded-md hover:bg-primary/90 font-medium transition-colors"
 >
 {grant 
 ? (t.organizationModule.updateGrant)
 : (t.organizationModule.createGrant)
 }
 </button>
 <button
 type="button"
 onClick={onClose}
 className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 font-medium transition-colors"
 >
 {t.organizationModule.cancel}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}