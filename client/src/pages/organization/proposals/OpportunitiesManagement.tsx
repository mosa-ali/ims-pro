import { Plus, Edit2, Trash2, X, ExternalLink, Loader2 } from 'lucide-react';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useState, useMemo } from 'react';
import { BackButton } from '@/components/BackButton';

interface Opportunity {
  id: number;
  donorName: string;
  cfpLink?: string;
  interestArea: string[];
  geographicAreas: string;
  applicationDeadline: string;
  allocatedBudget?: number;
  currency: string;
  isCoFunding: boolean;
  applicationLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function OpportunitiesManagement() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  // Fetch real funding opportunities from database
  const { data: opportunitiesData, isLoading, refetch } = trpc.proposals.getAllFundingOpportunities.useQuery(
    {
      limit: 1000,
      offset: 0,
    },
    {
      enabled: !!user?.organizationId,
    }
  );

  // Transform database records
  const opportunities = useMemo(() => {
    if (!opportunitiesData) return [];
    return opportunitiesData.map(record => ({
      id: record.id,
      donorName: record.donorName,
      cfpLink: record.cfpLink || undefined,
      interestArea: Array.isArray(record.interestArea) ? record.interestArea : [],
      geographicAreas: record.geographicAreas || '',
      applicationDeadline: record.applicationDeadline ? (typeof record.applicationDeadline === 'string' ? record.applicationDeadline : record.applicationDeadline.toISOString().split('T')[0]) : '',
      allocatedBudget: record.allocatedBudget ? parseFloat(record.allocatedBudget.toString()) : undefined,
      currency: record.currency || 'USD',
      isCoFunding: record.isCoFunding || false,
      applicationLink: record.applicationLink || undefined,
      notes: record.notes || undefined,
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : (record.createdAt?.toISOString() || new Date().toISOString()),
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : (record.updatedAt?.toISOString() || new Date().toISOString()),
    }));
  }, [opportunitiesData]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Opportunity | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    donorName: '',
    cfpLink: '',
    interestArea: [] as string[],
    geographicAreas: '',
    applicationDeadline: '',
    allocatedBudget: '',
    currency: 'USD',
    isCoFunding: false,
    applicationLink: '',
    notes: ''
  });

  const labels = {
    title: (t?.proposals?.opportunitiesManagement as string) || 'Opportunities Management',
    subtitle: (t?.proposals?.trackFundingCallsAndOpportunitiesBefore as string) || 'Track funding calls and opportunities',
    addOpportunity: (t?.proposals?.addOpportunity as string) || 'Add Opportunity',
    exportExcel: (t?.proposals?.exportExcel as string) || 'Export',
    search: (t?.proposals?.searchByDonorOrInterestArea as string) || 'Search by donor or interest area...',
    donor: (t?.proposals?.donorsFoundations as string) || 'Donor',
    cfpLink: (t?.proposals?.cfpLink as string) || 'CFP Link',
    interestArea: (t?.proposals?.interestArea as string) || 'Interest Area',
    geographicAreas: (t?.proposals?.geographicAreas as string) || 'Geographic Areas',
    deadline: (t?.proposals?.applicationDeadline as string) || 'Deadline',
    budget: (t?.proposals?.allocatedBudget as string) || 'Budget',
    currency: (t?.proposals?.currency as string) || 'Currency',
    coFunding: (t?.proposals?.cofunding as string) || 'Co-Funding',
    applicationLink: (t?.proposals?.applicationLink as string) || 'Application Link',
    actions: (t?.proposals?.actions as string) || 'Actions',
    yes: (t?.proposals?.yes as string) || 'Yes',
    no: (t?.proposals?.no as string) || 'No',
    edit: (t?.proposals?.edit as string) || 'Edit',
    delete: (t?.proposals?.delete as string) || 'Delete',
    cancel: (t?.proposals?.cancel as string) || 'Cancel',
    save: (t?.proposals?.save as string) || 'Save',
    addNew: (t?.proposals?.addNewOpportunity as string) || 'Add New Opportunity',
    editOpportunity: (t?.proposals?.editOpportunity as string) || 'Edit Opportunity',
    deleteConfirm: (t?.proposals?.areYouSureYouWantTo as string) || 'Are you sure?',
    notes: (t?.proposals?.notes as string) || 'Notes',
    required: (t?.proposals?.required as string) || 'Required',
    noOpportunities: isRTL 
      ? 'لم يتم العثور على فرص. انقر على "إضافة فرصة" للبدء.'
      : 'No opportunities found. Click "Add Opportunity" to get started.'
  };

  const interestAreas = ['Education in Emergencies', 'WASH', 'Health', 'Protection', 'Child Protection', 'Livelihoods', 'Food Security', 'Nutrition'];

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.interestArea.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Handlers
  const handleAdd = async () => {
    // TODO: Implement API call to create opportunity using tRPC
    // const createMutation = trpc.proposals.createFundingOpportunity.useMutation();
    // await createMutation.mutateAsync(formData);
    setShowAddModal(false);
    resetForm();
    refetch();
  };

  const handleEdit = async (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      donorName: opportunity.donorName,
      cfpLink: opportunity.cfpLink || '',
      interestArea: opportunity.interestArea,
      geographicAreas: opportunity.geographicAreas,
      applicationDeadline: opportunity.applicationDeadline,
      allocatedBudget: opportunity.allocatedBudget?.toString() || '',
      currency: opportunity.currency,
      isCoFunding: opportunity.isCoFunding,
      applicationLink: opportunity.applicationLink || '',
      notes: opportunity.notes || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async (opportunity: Opportunity) => {
    // TODO: Implement API call to delete opportunity using tRPC
    // const deleteMutation = trpc.proposals.deleteFundingOpportunity.useMutation();
    // await deleteMutation.mutateAsync({ id: opportunity.id });
    setShowDeleteConfirm(null);
    refetch();
  };

  const resetForm = () => {
    setFormData({
      donorName: '',
      cfpLink: '',
      interestArea: [],
      geographicAreas: '',
      applicationDeadline: '',
      allocatedBudget: '',
      currency: 'USD',
      isCoFunding: false,
      applicationLink: '',
      notes: ''
    });
    setEditingOpportunity(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <BackButton />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{labels.title}</h1>
          <p className="text-muted-foreground mt-1">{labels.subtitle}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {labels.addOpportunity}
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder={labels.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Table */}
      {filteredOpportunities.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          {labels.noOpportunities}
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">{labels.donor}</th>
                <th className="text-left p-3">{labels.interestArea}</th>
                <th className="text-left p-3">{labels.geographicAreas}</th>
                <th className="text-left p-3">{labels.deadline}</th>
                <th className="text-left p-3">{labels.budget}</th>
                <th className="text-left p-3">{labels.coFunding}</th>
                <th className="text-left p-3">{labels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.map(opp => (
                <tr key={opp.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{opp.donorName}</td>
                  <td className="p-3">{opp.interestArea.join(', ')}</td>
                  <td className="p-3">{opp.geographicAreas}</td>
                  <td className="p-3">{opp.applicationDeadline}</td>
                  <td className="p-3">{opp.allocatedBudget ? formatCurrency(opp.allocatedBudget) : '-'}</td>
                  <td className="p-3">{opp.isCoFunding ? labels.yes : labels.no}</td>
                  <td className="p-3 flex gap-2">
                    {opp.cfpLink && (
                      <a href={opp.cfpLink} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(opp)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(opp)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md">
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="text-muted-foreground mb-6">{labels.deleteConfirm}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>{labels.cancel}</Button>
              <Button variant="destructive" onClick={() => handleDelete(showDeleteConfirm)}>{labels.delete}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
