import { Plus, Edit2, Trash2, X, Download, Upload, FileSpreadsheet, Target } from 'lucide-react';
import { useLanguage, formatCurrency, formatNumber } from '@/contexts/LanguageContext';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

interface PipelineOpportunity {
  id: number;
  title: string;
  donorName: string;
  donorType: 'UN' | 'EU' | 'INGO' | 'Foundation' | 'Government' | 'Other';
  fundingWindow?: string;
  deadline: string;
  indicativeBudgetMin: number;
  indicativeBudgetMax: number;
  sectors: string[];
  country: string;
  governorate?: string;
  stage: 'Identified' | 'Under Review' | 'Go Decision' | 'No-Go' | 'Concept Requested' | 'Proposal Requested' | 'Proposal Development' | 'Approved' | 'Rejected';
  probability: number;
  focalPoint?: string;
  projectManagerName?: string;
  projectManagerEmail?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function PipelineManagement() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  
  // Fetch real pipeline opportunities from database
  const { data: pipelineData, isLoading, refetch } = trpc.proposals.getAllPipelineOpportunities.useQuery(
    {
      limit: 1000,
      offset: 0,
    },
    {
      enabled: !!user?.organizationId,
    }
  );
  
  // Transform database records to match component interface
  const opportunities = useMemo(() => {
    if (!pipelineData) return [];
    return pipelineData.map(record => ({
      id: record.id,
      title: record.title,
      donorName: record.donorName,
      donorType: record.donorType as PipelineOpportunity['donorType'],
      fundingWindow: record.fundingWindow || '',
      deadline: record.deadline ? (typeof record.deadline === 'string' ? record.deadline : record.deadline.toISOString().split('T')[0]) : '',
      indicativeBudgetMin: parseFloat(record.indicativeBudgetMin?.toString() || '0'),
      indicativeBudgetMax: parseFloat(record.indicativeBudgetMax?.toString() || '0'),
      sectors: Array.isArray(record.sectors) ? record.sectors : [],
      country: record.country || '',
      governorate: record.governorate || '',
      stage: record.stage as PipelineOpportunity['stage'],
      probability: record.probability || 50,
      focalPoint: record.focalPoint || '',
      projectManagerName: record.projectManagerName || undefined,
      projectManagerEmail: record.projectManagerEmail || undefined,
      notes: record.notes || '',
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : (record.createdAt?.toISOString() || new Date().toISOString()),
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : (record.updatedAt?.toISOString() || new Date().toISOString()),
    }));
  }, [pipelineData]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<PipelineOpportunity | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<PipelineOpportunity | null>(null);
  const [filterStage, setFilterStage] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    donorName: '',
    donorType: 'UN' as PipelineOpportunity['donorType'],
    fundingWindow: '',
    deadline: '',
    indicativeBudgetMin: 0,
    indicativeBudgetMax: 0,
    sectors: [] as string[],
    country: '',
    governorate: '',
    stage: 'Identified' as PipelineOpportunity['stage'],
    probability: 50,
    focalPoint: '',
    projectManagerName: '',
    projectManagerEmail: '',
    notes: ''
  });

  // Translations - with fallback values for all keys
  const getStageLabel = (stage: string): string => {
    const stageLabels: Record<string, string> = {
      All: (t?.proposals?.all as string) || 'All',
      Identified: (t?.proposals?.identified as string) || 'Identified',
      'Under Review': (t?.proposals?.underReview as string) || 'Under Review',
      'Go Decision': (t?.proposals?.goDecision as string) || 'Go Decision',
      'No-Go': (t?.proposals?.nogo as string) || 'No-Go',
      'Concept Requested': (t?.proposals?.conceptRequested as string) || 'Concept Requested',
      'Proposal Requested': (t?.proposals?.proposalRequested as string) || 'Proposal Requested',
      'Proposal Development': (t?.proposals?.proposalDevelopment as string) || 'Proposal Development',
      'Approved': (t?.proposals?.approved as string) || 'Approved',
      'Rejected': (t?.proposals?.rejected as string) || 'Rejected'
    };
    return stageLabels[stage] || stage;
  };

  const labels = {
    export: (t?.proposals?.export as string) || 'Export',
    template: (t?.proposals?.template as string) || 'Template',
    addOpportunity: (t?.proposals?.addOpportunity as string) || 'Add Opportunity',
    searchPlaceholder: (t?.proposals?.searchByTitleOrDonor as string) || 'Search by title or donor...',
    headers: {
      opportunity: (t?.proposals?.opportunity as string) || 'Opportunity',
      donor: (t?.proposals?.donor as string) || 'Donor',
      budgetRange: (t?.proposals?.budgetRange as string) || 'Budget Range',
      deadline: (t?.proposals?.deadline as string) || 'Deadline',
      stage: (t?.proposals?.stage as string) || 'Stage',
      probability: (t?.proposals?.probability as string) || 'Probability',
      actions: (t?.proposals?.actions as string) || 'Actions'
    },
    noOpportunities: isRTL 
      ? 'لم يتم العثور على فرص في خط التمويل. انقر على "إضافة فرصة" للبدء.'
      : 'No pipeline opportunities found. Click "Add Opportunity" to get started.',
    edit: (t?.proposals?.edit as string) || 'Edit',
    delete: (t?.proposals?.delete as string) || 'Delete',
    convertToProposal: (t?.proposals?.convertToProposal as string) || 'Convert to Proposal'
  };

  const sectors = ['Education in Emergencies', 'WASH', 'Health', 'Protection', 'Child Protection', 'Livelihoods', 'Food Security', 'Nutrition'];
  const stages = ['All', 'Identified', 'Under Review', 'Go Decision', 'No-Go', 'Concept Requested', 'Proposal Requested', 'Proposal Development', 'Approved', 'Rejected'];

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.donorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === 'All' || opp.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  // Mutations
  const createMutation = trpc.proposals.createPipelineOpportunity.useMutation();
  const updateMutation = trpc.proposals.updatePipelineOpportunity.useMutation();
  const deleteMutation = trpc.proposals.deletePipelineOpportunity.useMutation();

  // Handlers
  const handleAdd = async () => {
    try {
      await createMutation.mutateAsync({
        title: formData.title,
        donorName: formData.donorName,
        donorType: formData.donorType,
        fundingWindow: formData.fundingWindow,
        deadline: formData.deadline,
        indicativeBudgetMin: formData.indicativeBudgetMin,
        indicativeBudgetMax: formData.indicativeBudgetMax,
        sector: formData.sectors,
        country: formData.country,
        governorate: formData.governorate,
        stage: formData.stage,
        probability: formData.probability,
        focalPoint: formData.focalPoint,
        notes: formData.notes
      });
      setShowAddModal(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      alert('Failed to create opportunity. Please try again.');
    }
  };

  const handleEdit = async (opportunity: PipelineOpportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title,
      donorName: opportunity.donorName,
      donorType: opportunity.donorType,
      fundingWindow: opportunity.fundingWindow || '',
      deadline: opportunity.deadline,
      indicativeBudgetMin: opportunity.indicativeBudgetMin,
      indicativeBudgetMax: opportunity.indicativeBudgetMax,
      sectors: opportunity.sectors,
      country: opportunity.country,
      governorate: opportunity.governorate || '',
      stage: opportunity.stage,
      probability: opportunity.probability,
      focalPoint: opportunity.focalPoint || '',
      projectManagerName: opportunity.projectManagerName || '',
      projectManagerEmail: opportunity.projectManagerEmail || '',
      notes: opportunity.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingOpportunity) return;
    try {
      await updateMutation.mutateAsync({
        id: editingOpportunity.id,
        title: formData.title,
        donorName: formData.donorName,
        donorType: formData.donorType,
        fundingWindow: formData.fundingWindow,
        deadline: formData.deadline,
        indicativeBudgetMin: formData.indicativeBudgetMin,
        indicativeBudgetMax: formData.indicativeBudgetMax,
        sector: formData.sectors,
        country: formData.country,
        governorate: formData.governorate,
        stage: formData.stage,
        probability: formData.probability,
        focalPoint: formData.focalPoint,
        notes: formData.notes
      });
      setShowEditModal(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Failed to update opportunity:', error);
      alert('Failed to update opportunity. Please try again.');
    }
  };

  const handleDelete = async (opportunity: PipelineOpportunity) => {
    try {
      await deleteMutation.mutateAsync({ id: opportunity.id });
      setShowDeleteConfirm(null);
      refetch();
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
      alert('Failed to delete opportunity. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      donorName: '',
      donorType: 'UN',
      fundingWindow: '',
      deadline: '',
      indicativeBudgetMin: 0,
      indicativeBudgetMax: 0,
      sectors: [],
      country: '',
      governorate: '',
      stage: 'Identified',
      probability: 50,
      focalPoint: '',
      projectManagerName: '',
      projectManagerEmail: '',
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
      <div className="flex justify-between items-center">
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {labels.addOpportunity}
        </Button>
      </div>

      {/* Stage Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {stages.map(stage => (
          <Button
            key={stage}
            variant={filterStage === stage ? 'default' : 'outline'}
            onClick={() => setFilterStage(stage)}
            size="sm"
          >
            {getStageLabel(stage)}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder={labels.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <UnifiedExportButton data={filteredOpportunities} filename="pipeline-opportunities" />
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
                <th className="text-left p-3">{labels.headers.opportunity}</th>
                <th className="text-left p-3">{labels.headers.donor}</th>
                <th className="text-left p-3">{labels.headers.budgetRange}</th>
                <th className="text-left p-3">{labels.headers.deadline}</th>
                <th className="text-left p-3">{labels.headers.stage}</th>
                <th className="text-left p-3">{labels.headers.probability}</th>
                <th className="text-left p-3">{labels.headers.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.map(opp => (
                <tr key={opp.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{opp.title}</td>
                  <td className="p-3">{opp.donorName}</td>
                  <td className="p-3">{formatCurrency(opp.indicativeBudgetMin)} - {formatCurrency(opp.indicativeBudgetMax)}</td>
                  <td className="p-3">{opp.deadline}</td>
                  <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{getStageLabel(opp.stage)}</span></td>
                  <td className="p-3">{opp.probability}%</td>
                  <td className="p-3 flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(opp)} disabled={updateMutation.isPending}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(opp)} disabled={deleteMutation.isPending}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Opportunity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <Card className="p-6 max-w-2xl w-full m-4">
            <h2 className="text-lg font-bold mb-4">Add Pipeline Opportunity</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Opportunity Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Emergency Education Support Program"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Donor Name *</label>
                  <Input
                    value={formData.donorName}
                    onChange={(e) => setFormData({...formData, donorName: e.target.value})}
                    placeholder="e.g., UNICEF"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Donor Type *</label>
                  <select
                    value={formData.donorType}
                    onChange={(e) => setFormData({...formData, donorType: e.target.value as PipelineOpportunity['donorType']})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="UN">UN</option>
                    <option value="EU">EU</option>
                    <option value="INGO">INGO</option>
                    <option value="Foundation">Foundation</option>
                    <option value="Government">Government</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Deadline *</label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country *</label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="e.g., Yemen"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Budget</label>
                  <Input
                    type="number"
                    value={formData.indicativeBudgetMin}
                    onChange={(e) => setFormData({...formData, indicativeBudgetMin: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Budget</label>
                  <Input
                    type="number"
                    value={formData.indicativeBudgetMax}
                    onChange={(e) => setFormData({...formData, indicativeBudgetMax: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stage</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({...formData, stage: e.target.value as PipelineOpportunity['stage']})}
                  className="w-full border rounded px-3 py-2"
                >
                  {stages.filter(s => s !== 'All').map(stage => (
                    <option key={stage} value={stage}>{getStageLabel(stage)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional information..."
                  className="w-full border rounded px-3 py-2 min-h-24"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleAdd}>Create Opportunity</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md">
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="text-muted-foreground mb-6">Are you sure you want to delete this opportunity?</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(showDeleteConfirm)}>Delete</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
