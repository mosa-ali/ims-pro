import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Download, Upload, FileSpreadsheet, ArrowRight, Target } from 'lucide-react';
import { useLanguage, formatCurrency, formatNumber } from '@/contexts/LanguageContext';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

interface PipelineOpportunity {
  id: string;
  title: string;
  donorName: string;
  donorType: 'UN' | 'EU' | 'INGO' | 'Foundation' | 'Government' | 'Other';
  fundingWindow: string;
  deadline: string;
  indicativeBudgetMin: number;
  indicativeBudgetMax: number;
  sector: string[];
  country: string;
  governorate: string;
  stage: 'Identified' | 'Under Review' | 'Go Decision' | 'No-Go' | 'Concept Requested' | 'Proposal Requested' | 'Proposal Development' | 'Approved' | 'Rejected';
  probability: number;
  focalPoint: string;
  projectManagerName?: string;
  projectManagerEmail?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const mockOpportunities: PipelineOpportunity[] = [
  {
    id: '1',
    title: 'Emergency Education Support in Conflict Areas',
    donorName: 'UNICEF',
    donorType: 'UN',
    fundingWindow: 'Q3 2024 Emergency Call',
    deadline: '2024-09-30',
    indicativeBudgetMin: 300000,
    indicativeBudgetMax: 500000,
    sector: ['Education in Emergencies', 'Child Protection'],
    country: 'Yemen',
    governorate: 'Sana\'a',
    stage: 'Concept Requested',
    probability: 75,
    focalPoint: 'Sarah Johnson',
    notes: 'Strong alignment with our EiE program. Partner meeting scheduled.',
    createdAt: '2024-05-15T10:00:00Z',
    updatedAt: '2024-06-01T14:30:00Z'
  },
  {
    id: '2',
    title: 'WASH Infrastructure Rehabilitation',
    donorName: 'European Commission - ECHO',
    donorType: 'EU',
    fundingWindow: 'Humanitarian Implementation Plan 2024',
    deadline: '2024-08-15',
    indicativeBudgetMin: 800000,
    indicativeBudgetMax: 1200000,
    sector: ['WASH', 'Health'],
    country: 'Yemen',
    governorate: 'Hodeidah',
    stage: 'Under Review',
    probability: 60,
    focalPoint: 'Ahmed Ali',
    notes: 'Requires consortium approach. Discussing with 2 partners.',
    createdAt: '2024-05-20T09:00:00Z',
    updatedAt: '2024-05-28T11:00:00Z'
  }
];

export function PipelineManagement() {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  
  // Fetch real pipeline opportunities from database
  const { data: pipelineData, isLoading, refetch } = trpc.proposals.getAllPipelineOpportunities.useQuery(
    {
      organizationId: user?.organizationId || 0,
      operatingUnitId: user?.operatingUnitId,
      limit: 100,
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
      id: String(record.id),
      title: record.title,
      donorName: record.donorName,
      donorType: record.donorType,
      fundingWindow: record.fundingWindow || '',
      deadline: record.deadline ? (typeof record.deadline === 'string' ? record.deadline : record.deadline.toISOString().split('T')[0]) : '',
      indicativeBudgetMin: parseFloat(record.indicativeBudgetMin?.toString() || '0'),
      indicativeBudgetMax: parseFloat(record.indicativeBudgetMax?.toString() || '0'),
      sector: Array.isArray(record.sector) ? record.sector : [],
      country: record.country || 'Yemen',
      governorate: record.governorate || '',
      stage: record.stage as PipelineOpportunity['stage'],
      probability: record.probability || 50,
      focalPoint: record.focalPoint || '',
      projectManagerName: record.projectManagerName || undefined,
      projectManagerEmail: record.projectManagerEmail || undefined,
      notes: record.notes || '',
      createdAt: record.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: record.updatedAt?.toISOString() || new Date().toISOString(),
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
    sector: [] as string[],
    country: 'Yemen',
    governorate: '',
    stage: 'Identified' as PipelineOpportunity['stage'],
    probability: 50,
    focalPoint: '',
    projectManagerName: '',
    projectManagerEmail: '',
    notes: ''
  });

  // Translations
  const t = {
    export: isRTL ? 'تصدير' : 'Export',
    template: isRTL ? 'قالب' : 'Template',
    addOpportunity: isRTL ? 'إضافة فرصة' : 'Add Opportunity',
    searchPlaceholder: isRTL ? 'البحث بالعنوان أو الجهة المانحة...' : 'Search by title or donor...',
    stages: {
      All: isRTL ? 'الكل' : 'All',
      Identified: isRTL ? 'محدد' : 'Identified',
      'Under Review': isRTL ? 'قيد المراجعة' : 'Under Review',
      'Go Decision': isRTL ? 'قرار المتابعة' : 'Go Decision',
      'No-Go': isRTL ? 'عدم المتابعة' : 'No-Go',
      'Concept Requested': isRTL ? 'مطلوب ملاحظة مفاهيم' : 'Concept Requested',
      'Proposal Requested': isRTL ? 'مطلوب مقترح' : 'Proposal Requested'
    },
    headers: {
      opportunity: isRTL ? 'الفرصة' : 'OPPORTUNITY',
      donor: isRTL ? 'الجهة المانحة' : 'DONOR',
      budgetRange: isRTL ? 'نطاق الميزانية' : 'BUDGET RANGE',
      deadline: isRTL ? 'الموعد النهائي' : 'DEADLINE',
      stage: isRTL ? 'المرحلة' : 'STAGE',
      probability: isRTL ? 'الاحتمالية' : 'PROBABILITY',
      actions: isRTL ? 'الإجراءات' : 'ACTIONS'
    },
    noOpportunities: isRTL 
      ? 'لم يتم العثور على فرص في خط التمويل. انقر على "إضافة فرصة" للبدء.'
      : 'No pipeline opportunities found. Click "Add Opportunity" to get started.',
    edit: isRTL ? 'تعديل' : 'Edit',
    delete: isRTL ? 'حذف' : 'Delete',
    convertToProposal: isRTL ? 'تحويل إلى مقترح' : 'Convert to Proposal'
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

  // Handlers
  const handleAdd = () => {
    const newOpportunity: PipelineOpportunity = {
      id: `opp-${Date.now()}`,
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setOpportunities([...opportunities, newOpportunity]);
    setShowAddModal(false);
    resetForm();
    alert('Pipeline opportunity created successfully!');
  };

  const handleEdit = () => {
    if (!editingOpportunity) return;

    setOpportunities(opportunities.map(opp =>
      opp.id === editingOpportunity.id ? {
        ...opp,
        ...formData,
        updatedAt: new Date().toISOString()
      } : opp
    ));

    setShowEditModal(false);
    setEditingOpportunity(null);
    resetForm();
    alert('Pipeline opportunity updated successfully!');
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) return;

    setOpportunities(opportunities.filter(opp => opp.id !== showDeleteConfirm.id));
    setShowDeleteConfirm(null);
    alert('Pipeline opportunity deleted successfully!');
  };

  const handleConvertToProposal = (opportunity: PipelineOpportunity) => {
    alert(`Converting "${opportunity.title}" to Proposal/Concept Note...\nThis will create a new proposal with pre-filled donor and budget information.`);
    // TODO: Navigate to proposal creation with pre-filled data
  };

  const openEdit = (opportunity: PipelineOpportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title,
      donorName: opportunity.donorName,
      donorType: opportunity.donorType,
      fundingWindow: opportunity.fundingWindow,
      deadline: opportunity.deadline,
      indicativeBudgetMin: opportunity.indicativeBudgetMin,
      indicativeBudgetMax: opportunity.indicativeBudgetMax,
      sector: opportunity.sector,
      country: opportunity.country,
      governorate: opportunity.governorate,
      stage: opportunity.stage,
      probability: opportunity.probability,
      focalPoint: opportunity.focalPoint,
      projectManagerName: opportunity.projectManagerName || '',
      projectManagerEmail: opportunity.projectManagerEmail || '',
      notes: opportunity.notes
    });
    setShowEditModal(true);
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
      sector: [],
      country: 'Yemen',
      governorate: '',
      stage: 'Identified',
      probability: 50,
      focalPoint: '',
      projectManagerName: '',
      projectManagerEmail: '',
      notes: ''
    });
  };

  // Excel Export
  const handleExportExcel = async () => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Pipeline');

    worksheet.columns = [
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Donor', key: 'donorName', width: 25 },
      { header: 'Donor Type', key: 'donorType', width: 15 },
      { header: 'Funding Window', key: 'fundingWindow', width: 30 },
      { header: 'Deadline', key: 'deadline', width: 12 },
      { header: 'Budget Min (USD)', key: 'indicativeBudgetMin', width: 18 },
      { header: 'Budget Max (USD)', key: 'indicativeBudgetMax', width: 18 },
      { header: 'Sector', key: 'sector', width: 30 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Governorate', key: 'governorate', width: 20 },
      { header: 'Stage', key: 'stage', width: 20 },
      { header: 'Probability %', key: 'probability', width: 12 },
      { header: 'Focal Point', key: 'focalPoint', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

    filteredOpportunities.forEach(opp => {
      worksheet.addRow({
        ...opp,
        sector: opp.sector.join(', ')
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Pipeline_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Excel Template
  const handleExportTemplate = async () => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Pipeline Template');

    worksheet.columns = [
      { header: 'Title*', key: 'title', width: 40 },
      { header: 'Donor Name*', key: 'donorName', width: 25 },
      { header: 'Donor Type*', key: 'donorType', width: 15 },
      { header: 'Funding Window', key: 'fundingWindow', width: 30 },
      { header: 'Deadline (YYYY-MM-DD)', key: 'deadline', width: 20 },
      { header: 'Budget Min (USD)', key: 'indicativeBudgetMin', width: 18 },
      { header: 'Budget Max (USD)', key: 'indicativeBudgetMax', width: 18 },
      { header: 'Sector (comma-separated)', key: 'sector', width: 30 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Governorate', key: 'governorate', width: 20 },
      { header: 'Stage*', key: 'stage', width: 20 },
      { header: 'Probability %', key: 'probability', width: 12 },
      { header: 'Focal Point', key: 'focalPoint', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };

    worksheet.addRow({
      title: 'Example: Education Support Program',
      donorName: 'International Foundation',
      donorType: 'UN',
      fundingWindow: 'Q3 2024',
      deadline: '2024-09-30',
      indicativeBudgetMin: '300000',
      indicativeBudgetMax: '500000',
      sector: 'Education in Emergencies, Child Protection',
      country: 'Yemen',
      governorate: 'Sana\'a',
      stage: 'Identified',
      probability: '50',
      focalPoint: 'John Doe',
      notes: 'Initial exploration phase'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Pipeline_Template_Empty.xlsx');
  };

  // Get stage badge color
  const getStageBadge = (stage: string) => {
    const badges: Record<string, string> = {
      'Identified': 'bg-gray-100 text-gray-700',
      'Under Review': 'bg-blue-100 text-blue-700',
      'Go Decision': 'bg-green-100 text-green-700',
      'No-Go': 'bg-red-100 text-red-700',
      'Concept Requested': 'bg-purple-100 text-purple-700',
      'Proposal Requested': 'bg-orange-100 text-orange-700',
      'Proposal Development': 'bg-indigo-100 text-indigo-700',
      'Approved': 'bg-emerald-100 text-emerald-700',
      'Rejected': 'bg-rose-100 text-rose-700'
    };
    return badges[stage] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-4">
      {/* Actions Bar */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <UnifiedExportButton
            hasData={filteredOpportunities.length > 0}
            onExportData={handleExportExcel}
            onExportTemplate={handleExportTemplate}
            moduleName="Pipeline Opportunities"
            showModal={true}
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-4 h-4" />
          {t.addOpportunity}
        </button>
      </div>

      {/* Filters */}
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        />
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {stages.map(stage => (
            <button
              key={stage}
              onClick={() => setFilterStage(stage)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                filterStage === stage
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {t.stages[stage]}
            </button>
          ))}
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.headers.opportunity}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.headers.donor}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.headers.budgetRange}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.headers.deadline}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.headers.stage}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.headers.probability}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.headers.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {t.noOpportunities}
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map(opp => (
                  <tr key={opp.id} className="hover:bg-gray-50">
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="font-medium text-gray-900" dir="auto">{opp.title}</div>
                      <div className="text-xs text-gray-500 mt-1" dir="auto">{opp.sector.join(', ')}</div>
                      <div className="text-xs text-gray-500" dir="auto">{opp.governorate}, {opp.country}</div>
                    </td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="font-medium text-gray-900" dir="auto">{opp.donorName}</div>
                      <div className="text-xs text-gray-500" dir="auto">{opp.donorType}</div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                      ${formatNumber(opp.indicativeBudgetMin)} - ${formatNumber(opp.indicativeBudgetMax)}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                      {opp.deadline}
                    </td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageBadge(opp.stage)}`}>
                        {t.stages[opp.stage]}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2" dir="ltr">
                          <div
                            className={`h-2 rounded-full ${
                              opp.probability >= 70 ? 'bg-green-500' :
                              opp.probability >= 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${opp.probability}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600" dir="ltr">{opp.probability}%</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => handleConvertToProposal(opp)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Convert to Proposal"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(opp)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title={t.edit}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(opp)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {showAddModal ? 'Add Pipeline Opportunity' : 'Edit Pipeline Opportunity'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Title*</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g., Emergency Education Support Program"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Donor Name*</label>
                    <input
                      type="text"
                      required
                      value={formData.donorName}
                      onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Donor Type*</label>
                    <select
                      value={formData.donorType}
                      onChange={(e) => setFormData({ ...formData, donorType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="UN">UN Agency</option>
                      <option value="EU">European Union</option>
                      <option value="INGO">INGO</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Government">Government</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Funding Window</label>
                    <input
                      type="text"
                      value={formData.fundingWindow}
                      onChange={(e) => setFormData({ ...formData, fundingWindow: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g., Q3 2024 Call"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indicative Budget Min (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.indicativeBudgetMin}
                      onChange={(e) => setFormData({ ...formData, indicativeBudgetMin: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indicative Budget Max (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.indicativeBudgetMax}
                      onChange={(e) => setFormData({ ...formData, indicativeBudgetMax: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sector(s)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {sectors.map(sector => (
                      <label key={sector} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.sector.includes(sector)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, sector: [...formData.sector, sector] });
                            } else {
                              setFormData({ ...formData, sector: formData.sector.filter(s => s !== sector) });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{sector}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Governorate</label>
                    <input
                      type="text"
                      value={formData.governorate}
                      onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stage*</label>
                    <select
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="Identified">Identified</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Go Decision">Go Decision</option>
                      <option value="No-Go">No-Go</option>
                      <option value="Concept Requested">Concept Requested</option>
                      <option value="Proposal Requested">Proposal Requested</option>
                      <option value="Proposal Development">Proposal Development</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={formData.probability}
                        onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-gray-900 w-12">{formData.probability}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Focal Point</label>
                  <input
                    type="text"
                    value={formData.focalPoint}
                    onChange={(e) => setFormData({ ...formData, focalPoint: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager Name</label>
                    <input
                      type="text"
                      value={formData.projectManagerName}
                      onChange={(e) => setFormData({ ...formData, projectManagerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager Email</label>
                    <input
                      type="email"
                      value={formData.projectManagerEmail}
                      onChange={(e) => setFormData({ ...formData, projectManagerEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes & Attachments</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Additional information, partner discussions, etc."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={showAddModal ? handleAdd : handleEdit}
                    className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
                  >
                    {showAddModal ? 'Create Opportunity' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "{showDeleteConfirm.title}"?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}