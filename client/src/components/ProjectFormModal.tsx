// ============================================================================
// PROJECT FORM MODAL
// Modal dialog for creating and editing projects
// ============================================================================

import { useTranslation } from '@/i18n/useTranslation';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toInputDate } from '@/lib/safeDateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from '@/components/ui/dialog';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';

interface Project {
 id?: number;
 projectCode: string;
 title: string;
 description?: string;
 status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
 startDate: string;
 endDate: string;
 totalBudget: number;
 currency: 'USD' | 'EUR' | 'GBP' | 'CHF' | 'SAR' | 'YER';
 sectors: string[];
 donor?: string;
 implementingPartner?: string;
 location?: string;
}

interface ProjectFormModalProps {
 open: boolean;
 onClose: () => void;
 onSubmit: (data: Omit<Project, 'id'>) => void;
 project?: Project | null;
 isLoading?: boolean;
}

const SECTORS = [
 'Child Protection',
 'Education in Emergency',
 'WASH',
 'Health',
 'Nutrition',
 'Shelter',
 'Food Security',
 'Livelihoods',
 'Protection',
 'Camp Management',
];

export function ProjectFormModal({
 open,
 onClose,
 onSubmit,
 project,
 isLoading = false,
}: ProjectFormModalProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
const [formData, setFormData] = useState<Omit<Project, 'id'>>({
 projectCode: '',
 title: '',
 description: '',
 status: 'planning',
 startDate: '',
 endDate: '',
 totalBudget: 0,
 currency: 'USD',
 sectors: [],
 donor: '',
 implementingPartner: '',
 location: '',
 });

 const [errors, setErrors] = useState<Record<string, string>>({});

 // Use the safe date utility function from safeDateUtils

 // Initialize form with project data when editing
 useEffect(() => {
 if (project) {
 console.log('[ProjectFormModal] Loading project:', {
 projectCode: project.projectCode,
 status: project.status,
 statusType: typeof project.status,
 fullProject: project
 });
 setFormData({
 projectCode: project.projectCode,
 title: project.title,
 description: project.description || '',
 status: project.status,
 startDate: toInputDate(project.startDate),
 endDate: toInputDate(project.endDate),
 totalBudget: project.totalBudget,
 currency: project.currency,
 sectors: (() => {
 try {
 console.log('[ProjectFormModal] Raw sectors from backend:', project.sectors, 'Type:', typeof project.sectors);
 if (Array.isArray(project.sectors)) {
 console.log('[ProjectFormModal] Sectors is already an array:', project.sectors);
 return project.sectors;
 }
 if (typeof project.sectors === 'string') {
 const parsed = JSON.parse(project.sectors);
 console.log('[ProjectFormModal] Parsed sectors from string:', parsed);
 return parsed;
 }
 console.log('[ProjectFormModal] Sectors is neither array nor string, returning empty array');
 return [];
 } catch (error) {
 console.error('[ProjectFormModal] Error parsing sectors:', error, 'Raw value:', project.sectors);
 return [];
 }
 })(),
 donor: project.donor || '',
 implementingPartner: project.implementingPartner || '',
 location: project.location || '',
 });
 } else {
 // Reset form for new project
 setFormData({
 projectCode: '',
 title: '',
 description: '',
 status: 'planning',
 startDate: '',
 endDate: '',
 totalBudget: 0,
 currency: 'USD',
 sectors: [],
 donor: '',
 implementingPartner: '',
 location: '',
 });
 }
 setErrors({});
 }, [project, open]);

 const validate = (): boolean => {
 const newErrors: Record<string, string> = {};

 if (!formData.projectCode.trim()) newErrors.projectCode = t.projectFormModal.codeRequired;
 if (!formData.title.trim()) newErrors.title = t.projectFormModal.titleRequired;
 if (!formData.startDate) newErrors.startDate = t.projectFormModal.startDateRequired;
 if (!formData.endDate) newErrors.endDate = t.projectFormModal.endDateRequired;
 if (formData.totalBudget <= 0) newErrors.totalBudget = t.projectFormModal.budgetPositive;
 if (formData.sectors.length === 0) newErrors.sectors = t.projectFormModal.sectorsRequired;

 // Validate date range
 if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
 newErrors.endDate = t.projectFormModal.endDateAfterStart;
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (validate()) {
 // Transform data to match backend expectations
 const transformedData = {
 ...formData,
 // Convert string numbers to actual numbers
 totalBudget: typeof formData.totalBudget === 'string' ? parseFloat(formData.totalBudget) : formData.totalBudget,
 // Use safe date utility to handle all date formats (Date, MySQL dates, strings, etc.)
 startDate: toInputDate(formData.startDate),
 endDate: toInputDate(formData.endDate),
 };
 console.log('[ProjectFormModal] Final transformed data:', transformedData);
 onSubmit(transformedData);
 }
 };

 const toggleSector = (sector: string) => {
 setFormData((prev) => {
 const newSectors = prev.sectors.includes(sector)
 ? prev.sectors.filter((s) => s !== sector)
 : [...prev.sectors, sector];
 
 console.log('[ProjectFormModal] toggleSector:', { sector, oldSectors: prev.sectors, newSectors });
 
 // Clear sectors error when at least one sector is selected
 if (newSectors.length > 0 && errors.sectors) {
 setErrors((prevErrors) => {
 const { sectors, ...rest } = prevErrors;
 return rest;
 });
 }
 
 return {
 ...prev,
 sectors: newSectors,
 };
 });
 };

 return (
 <Dialog open={open} onOpenChange={onClose}>
 <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>
 {project ? t.projectFormModal.editProject : t.projectFormModal.createNewProject}
 </DialogTitle>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Project Code */}
 <div>
 <Label htmlFor="projectCode">
 {t.projectFormModal.projectCode} <span className="text-red-500">{t.projectFormModal.required}</span>
 </Label>
 <Input
 id="projectCode"
 value={formData.projectCode}
 onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
 placeholder={t.projectFormModal.projectCodePlaceholder}
 disabled={!!project} // Disable code editing for existing projects
 />
 {errors.projectCode && <p className="text-sm text-red-500 mt-1">{errors.projectCode}</p>}
 </div>

 {/* Project Title */}
 <div>
 <Label htmlFor="title">
 {t.projectFormModal.projectTitle} <span className="text-red-500">{t.projectFormModal.required}</span>
 </Label>
 <Input
 id="title"
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 placeholder={t.projectFormModal.projectTitlePlaceholder}
 />
 {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
 </div>

 {/* Status & Dates Row */}
 <div className="grid grid-cols-3 gap-4">
 <div>
 <Label htmlFor="status">
 {t.projectFormModal.status} <span className="text-red-500">{t.projectFormModal.required}</span>
 </Label>
 <select
 id="status"
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
 >
 <option value="planning">{t.projectFormModal.planning}</option>
 <option value="active">{t.projectFormModal.active}</option>
 <option value="on_hold">{t.projectFormModal.onHold}</option>
 <option value="completed">{t.projectFormModal.completed}</option>
 <option value="cancelled">{t.projectFormModal.cancelled}</option>
 </select>
 </div>

 <div>
 <Label htmlFor="startDate">
 {t.projectFormModal.startDate} <span className="text-red-500">{t.projectFormModal.required}</span>
 </Label>
 <Input
 id="startDate"
 type="date"
 value={formData.startDate}
 onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
 />
 {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
 </div>

 <div>
 <Label htmlFor="endDate">
 {t.projectFormModal.endDate} <span className="text-red-500">{t.projectFormModal.required}</span>
 </Label>
 <Input
 id="endDate"
 type="date"
 value={formData.endDate}
 onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
 />
 {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>}
 </div>
 </div>

 {/* Financial Information Row */}
 <div className="grid grid-cols-3 gap-4">
 <div>
 <Label htmlFor="totalBudget">
 {t.projectFormModal.totalBudget} <span className="text-red-500">{t.projectFormModal.required}</span>
 </Label>
 <Input
 id="totalBudget"
 type="number"
 min="0"
 step="0.01"
 value={formData.totalBudget}
 onChange={(e) => setFormData({ ...formData, totalBudget: parseFloat(e.target.value) || 0 })}
 />
 {errors.totalBudget && <p className="text-sm text-red-500 mt-1">{errors.totalBudget}</p>}
 </div>

 <div>
 <Label htmlFor="currency">
 {t.projectFormModal.currency} <span className="text-red-500">{t.projectFormModal.required}</span>
 </Label>
 <Select
 value={formData.currency}
 onValueChange={(value: any) => setFormData({ ...formData, currency: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 <SelectItem value="CHF">CHF</SelectItem>
 <SelectItem value="SAR">SAR</SelectItem>
 <SelectItem value="YER">YER</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Sectors (Multi-select) */}
 <div>
 <Label>
 {t.projectFormModal.sectors} <span className="text-red-500">{t.projectFormModal.required}</span>
 </Label>
 <div className="grid grid-cols-2 gap-3 mt-2 p-4 border border-gray-200 rounded-md">
 {SECTORS.map((sector) => (
 <label key={sector} className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={formData.sectors.includes(sector)}
 onChange={() => toggleSector(sector)}
 className="w-4 h-4"
 />
 <span className="text-sm">{sector}</span>
 </label>
 ))}
 </div>
 {errors.sectors && <p className="text-sm text-red-500 mt-1">{errors.sectors}</p>}
 </div>

 {/* Donor & Implementing Partner Row */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="donor">{t.projectFormModal.donor}</Label>
 <Input
 id="donor"
 value={formData.donor}
 onChange={(e) => setFormData({ ...formData, donor: e.target.value })}
 placeholder={t.projectFormModal.donorPlaceholder}
 />
 </div>

 <div>
 <Label htmlFor="implementingPartner">{t.projectFormModal.implementingPartner}</Label>
 <Input
 id="implementingPartner"
 value={formData.implementingPartner}
 onChange={(e) => setFormData({ ...formData, implementingPartner: e.target.value })}
 placeholder={t.projectFormModal.partnerPlaceholder}
 />
 </div>
 </div>

 {/* Location */}
 <div>
 <Label htmlFor="location">{t.projectFormModal.location}</Label>
 <Input
 id="location"
 value={formData.location}
 onChange={(e) => setFormData({ ...formData, location: e.target.value })}
 placeholder={t.projectFormModal.locationPlaceholder}
 />
 </div>

 {/* Description */}
 <div>
 <Label htmlFor="description">{t.projectFormModal.projectFormDescription}</Label>
 <textarea
 id="description"
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder={t.projectFormModal.descriptionPlaceholder}
 className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md"
 />
 </div>

 <DialogFooter>
 <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
 {t.projectFormModal.cancel}
 </Button>
 <Button type="submit" disabled={isLoading}>
 {isLoading 
 ? t.projectFormModal.saving 
 : project 
 ? t.projectFormModal.updateProject 
 : t.projectFormModal.createProject
 }
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
