import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import toast from 'react-hot-toast';

interface GrantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  grant?: any; // Existing grant for edit mode
  onSuccess?: () => void;
}

export function GrantFormModal({ isOpen, onClose, grant, onSuccess }: GrantFormModalProps) {
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();
  const utils = trpc.useUtils();

  // Form state
  const [formData, setFormData] = useState({
    grantNumber: '',
    grantName: '',
    donorName: '',
    donorReference: '',
    currency: 'USD',
    grantAmount: '',
    startDate: '',
    endDate: '',
    status: 'pending' as 'active' | 'completed' | 'pending' | 'on_hold',
    projectId: '',
    sector: '',
    responsible: '',
    description: '',
    reportingFrequency: 'quarterly',
    coFunding: false,
    coFunderName: '',
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = trpc.projects.list.useQuery({
    organizationId: currentOrganizationId || 1,
    operatingUnitId: currentOperatingUnitId || 1,
  }, {
    enabled: !!currentOrganizationId && !!currentOperatingUnitId,
  });

  // Create/Update mutations
  const createMutation = trpc.grants.create.useMutation({
    onSuccess: () => {
      utils.grants.list.invalidate();
      utils.grants.getKPIs.invalidate();
      toast.success('Grant created successfully!');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create grant');
    },
  });

  const updateMutation = trpc.grants.update.useMutation({
    onSuccess: () => {
      utils.grants.list.invalidate();
      utils.grants.getKPIs.invalidate();
      toast.success('Grant updated successfully!');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update grant');
    },
  });

  // Load grant data for edit mode
  useEffect(() => {
    if (grant) {
      setFormData({
        grantNumber: grant.grantNumber || '',
        grantName: grant.grantName || '',
        donorName: grant.donorName || '',
        donorReference: grant.donorReference || '',
        currency: grant.currency || 'USD',
        grantAmount: grant.grantAmount?.toString() || '',
        startDate: grant.startDate ? new Date(grant.startDate).toISOString().split('T')[0] : '',
        endDate: grant.endDate ? new Date(grant.endDate).toISOString().split('T')[0] : '',
        status: grant.status || 'pending',
        projectId: grant.projectId?.toString() || '',
        sector: grant.sector || '',
        responsible: grant.responsible || '',
        description: grant.description || '',
        reportingFrequency: grant.reportingFrequency || 'quarterly',
        coFunding: grant.coFunding || false,
        coFunderName: grant.coFunderName || '',
      });
    }
  }, [grant]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.grantNumber || !formData.grantName || !formData.donorName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.projectId) {
      toast.error('Please select a project');
      return;
    }

    if (!formData.grantAmount || parseFloat(formData.grantAmount) <= 0) {
      toast.error('Grant amount must be greater than 0');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    const grantData = {
      grantNumber: formData.grantNumber,
      grantName: formData.grantName,
      donorName: formData.donorName,
      donorReference: formData.donorReference,
      currency: formData.currency,
      grantAmount: parseFloat(formData.grantAmount),
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: formData.status,
      projectId: parseInt(formData.projectId),
      sector: formData.sector,
      responsible: formData.responsible,
      description: formData.description,
      reportingFrequency: formData.reportingFrequency,
      coFunding: formData.coFunding,
      coFunderName: formData.coFunderName,
    };

    if (grant) {
      updateMutation.mutate({ id: grant.id, ...grantData });
    } else {
      createMutation.mutate(grantData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {grant ? 'Edit Grant' : 'Add New Grant'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grantNumber">Grant Number *</Label>
                <Input
                  id="grantNumber"
                  value={formData.grantNumber}
                  onChange={(e) => setFormData({ ...formData, grantNumber: e.target.value })}
                  placeholder="e.g., GR-2024-001"
                  required
                />
              </div>

              <div>
                <Label htmlFor="grantName">Grant Name *</Label>
                <Input
                  id="grantName"
                  value={formData.grantName}
                  onChange={(e) => setFormData({ ...formData, grantName: e.target.value })}
                  placeholder="e.g., Education Support Program"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="donorName">Donor Name *</Label>
                <Input
                  id="donorName"
                  value={formData.donorName}
                  onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                  placeholder="e.g., UNICEF"
                  required
                />
              </div>

              <div>
                <Label htmlFor="donorReference">Donor Reference</Label>
                <Input
                  id="donorReference"
                  value={formData.donorReference}
                  onChange={(e) => setFormData({ ...formData, donorReference: e.target.value })}
                  placeholder="e.g., DON-REF-2024-123"
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Financial Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                    <SelectItem value="YER">YER - Yemeni Rial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="grantAmount">Grant Amount *</Label>
                <Input
                  id="grantAmount"
                  type="number"
                  step="0.01"
                  value={formData.grantAmount}
                  onChange={(e) => setFormData({ ...formData, grantAmount: e.target.value })}
                  placeholder="e.g., 500000"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="coFunding"
                  checked={formData.coFunding}
                  onChange={(e) => setFormData({ ...formData, coFunding: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="coFunding">Co-Funding</Label>
              </div>

              {formData.coFunding && (
                <div>
                  <Label htmlFor="coFunderName">Co-Funder Name</Label>
                  <Input
                    id="coFunderName"
                    value={formData.coFunderName}
                    onChange={(e) => setFormData({ ...formData, coFunderName: e.target.value })}
                    placeholder="e.g., World Bank"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Timeline & Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Timeline & Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Project Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Project Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectId">Linked Project</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.code} - {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sector">Sector</Label>
                <Input
                  id="sector"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  placeholder="e.g., Education, Health"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responsible">Responsible Person</Label>
                <Input
                  id="responsible"
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  placeholder="e.g., John Doe"
                />
              </div>

              <div>
                <Label htmlFor="reportingFrequency">Reporting Frequency</Label>
                <Select
                  value={formData.reportingFrequency}
                  onValueChange={(value) => setFormData({ ...formData, reportingFrequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter grant description and objectives..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : grant
                ? 'Update Grant'
                : 'Create Grant'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
