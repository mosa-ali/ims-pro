// ============================================================================
// PROJECT FORM MODAL
// Modal dialog for creating and editing projects
// ============================================================================

import { useState, useEffect } from 'react';
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
import { useLanguage } from '@/contexts/LanguageContext';

interface Project {
  id?: number;
  code: string;
  title: string;
  description?: string;
  status: 'ongoing' | 'planned' | 'completed' | 'not_started';
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
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState<Omit<Project, 'id'>>({
    code: '',
    title: '',
    description: '',
    status: 'planned',
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

  // Helper function to format date to YYYY-MM-DD for HTML date input
  const formatDateForInput = (date: string | Date): string => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().split('T')[0];
  };

  // Initialize form with project data when editing
  useEffect(() => {
    if (project) {
      setFormData({
        code: project.code,
        title: project.title,
        description: project.description || '',
        status: project.status,
        startDate: formatDateForInput(project.startDate),
        endDate: formatDateForInput(project.endDate),
        totalBudget: project.totalBudget,
        currency: project.currency,
        sectors: project.sectors,
        donor: project.donor || '',
        implementingPartner: project.implementingPartner || '',
        location: project.location || '',
      });
    } else {
      // Reset form for new project
      setFormData({
        code: '',
        title: '',
        description: '',
        status: 'planned',
        startDate: '',
        endDate: '',
        totalBudget: 0,
        spent: 0,
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

    if (!formData.code.trim()) newErrors.code = t('organization.projectForm.validation.codeRequired');
    if (!formData.title.trim()) newErrors.title = t('organization.projectForm.validation.titleRequired');
    if (!formData.startDate) newErrors.startDate = t('organization.projectForm.validation.startDateRequired');
    if (!formData.endDate) newErrors.endDate = t('organization.projectForm.validation.endDateRequired');
    if (formData.totalBudget <= 0) newErrors.totalBudget = t('organization.projectForm.validation.budgetPositive');
    if (formData.sectors.length === 0) newErrors.sectors = t('organization.projectForm.validation.sectorsRequired');

    // Validate date range
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = t('organization.projectForm.validation.endDateAfterStart');
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
        // Ensure dates are strings (ISO format)
        startDate: formData.startDate instanceof Date ? formData.startDate.toISOString().split('T')[0] : formData.startDate,
        endDate: formData.endDate instanceof Date ? formData.endDate.toISOString().split('T')[0] : formData.endDate,
      };
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
            {project ? t('organization.projectForm.editProject') : t('organization.projectForm.createNewProject')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Code */}
          <div>
            <Label htmlFor="code">
              {t('organization.projectForm.projectCode')} <span className="text-red-500">{t('organization.projectForm.required')}</span>
            </Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder={t('organization.projectForm.projectCodePlaceholder')}
              disabled={!!project} // Disable code editing for existing projects
            />
            {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
          </div>

          {/* Project Title */}
          <div>
            <Label htmlFor="title">
              {t('organization.projectForm.projectTitle')} <span className="text-red-500">{t('organization.projectForm.required')}</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('organization.projectForm.projectTitlePlaceholder')}
            />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Status & Dates Row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">
                {t('organization.projectForm.status')} <span className="text-red-500">{t('organization.projectForm.required')}</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ongoing">{t('organization.projectForm.ongoing')}</SelectItem>
                  <SelectItem value="planned">{t('organization.projectForm.planned')}</SelectItem>
                  <SelectItem value="completed">{t('organization.projectForm.completed')}</SelectItem>
                  <SelectItem value="not_started">{t('organization.projectForm.notStarted')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">
                {t('organization.projectForm.startDate')} <span className="text-red-500">{t('organization.projectForm.required')}</span>
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
                {t('organization.projectForm.endDate')} <span className="text-red-500">{t('organization.projectForm.required')}</span>
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
                {t('organization.projectForm.totalBudget')} <span className="text-red-500">{t('organization.projectForm.required')}</span>
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
                {t('organization.projectForm.currency')} <span className="text-red-500">{t('organization.projectForm.required')}</span>
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
              {t('organization.projectForm.sectors')} <span className="text-red-500">{t('organization.projectForm.required')}</span>
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
              <Label htmlFor="donor">{t('organization.projectForm.donor')}</Label>
              <Input
                id="donor"
                value={formData.donor}
                onChange={(e) => setFormData({ ...formData, donor: e.target.value })}
                placeholder={t('organization.projectForm.donorPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="implementingPartner">{t('organization.projectForm.implementingPartner')}</Label>
              <Input
                id="implementingPartner"
                value={formData.implementingPartner}
                onChange={(e) => setFormData({ ...formData, implementingPartner: e.target.value })}
                placeholder={t('organization.projectForm.partnerPlaceholder')}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">{t('organization.projectForm.location')}</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={t('organization.projectForm.locationPlaceholder')}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">{t('organization.projectForm.description')}</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('organization.projectForm.descriptionPlaceholder')}
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? t('organization.projectForm.saving') 
                : project 
                  ? t('organization.projectForm.updateProject') 
                  : t('organization.projectForm.createProject')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
