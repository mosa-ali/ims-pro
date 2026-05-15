import { Plus, Download, RefreshCw, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';
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

const formatSqlDate = (dateValue?: string | Date | null) => {
  if (!dateValue) return null;

  return new Date(dateValue)
    .toISOString()
    .split("T")[0]; // YYYY-MM-DD
};
const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

type DeadlineStatus = 'open' | 'closing-soon' | 'closed';

export function FundingOpportunities() {
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

  // Fetch KPI data
  const { data: kpis } = trpc.proposals.getOpportunitiesKPIs.useQuery(
    {},
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
      applicationDeadline: record.applicationDeadline ? (typeof record.applicationDeadline === 'string' ? record.applicationDeadline : record.applicationDeadline.toISOString().slice(0, 19).replace('T', ' ')) : '',
      allocatedBudget: record.allocatedBudget ? parseFloat(record.allocatedBudget.toString()) : undefined,
      currency: record.currency || 'USD',
      isCoFunding: record.isCoFunding || false,
      applicationLink: record.applicationLink || undefined,
      notes: record.notes || undefined,
      createdAt: nowSql,
      updatedAt: nowSql,
    }));
  }, [opportunitiesData]);

  // Calculate deadline status
  const getDeadlineStatus = (deadline: string): DeadlineStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return 'closed';
    if (daysUntil <= 7) return 'closing-soon';
    return 'open';
  };

  // State management
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // Labels
  const labels = {
    title: (t?.proposals?.fundingOpportunities as string) || 'Funding Opportunities',
    subtitle: (t?.proposals?.trackFundingCallsAndOpportunitiesBefore as string) || 'Track funding calls and opportunities before internal decision',
    addOpportunity: (t?.proposals?.addOpportunity as string) || 'Add Opportunity',
    export: (t?.proposals?.export as string) || 'Export',
    refresh: (t?.proposals?.refresh as string) || 'Refresh',
    showDeleted: (t?.proposals?.showDeleted as string) || 'Show Deleted',
    totalOpportunities: (t?.proposals?.totalOpportunities as string) || 'Total Opportunities',
    activeOpportunities: (t?.proposals?.activeOpportunities as string) || 'Active Opportunities',
    opportunityTypes: (t?.proposals?.opportunityTypes as string) || 'Opportunity Types',
    expiringOpportunities: (t?.proposals?.expiringOpportunities as string) || 'Expiring Soon (7 days)',
    search: (t?.proposals?.searchOpportunities as string) || 'Search opportunities...',
    allTypes: (t?.proposals?.allTypes as string) || 'All Types',
    allStatus: (t?.proposals?.allStatus as string) || 'All Status',
    code: (t?.proposals?.code as string) || 'Code',
    name: (t?.proposals?.name as string) || 'Name',
    type: (t?.proposals?.type as string) || 'Type',
    contact: (t?.proposals?.contact as string) || 'Contact',
    email: (t?.proposals?.email as string) || 'Email',
    status: (t?.proposals?.status as string) || 'Status',
    actions: (t?.proposals?.actions as string) || 'Actions',
    noOpportunities: isRTL 
      ? 'لم يتم العثور على فرص تمويل. انقر على "إضافة فرصة" للبدء.'
      : 'No funding opportunities found. Click "Add Opportunity" to get started.',
    open: (t?.proposals?.open as string) || 'Open',
    closingSoon: (t?.proposals?.closingSoon as string) || 'Closing Soon',
    closed: (t?.proposals?.closed as string) || 'Closed'
  };

  const donorTypes = ['UN', 'EU', 'INGO', 'Foundation', 'Government', 'Other'];
  const statuses = ['All', 'Open', 'Closing Soon', 'Closed'];

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    const typeMatch = filterType === 'All' || opp.donorName.includes(filterType);
    const statusMatch = filterStatus === 'All' || getDeadlineStatus(opp.applicationDeadline) === filterStatus.toLowerCase().replace(' ', '-');
    const searchMatch = opp.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.geographicAreas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.interestArea.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()));
    return typeMatch && statusMatch && searchMatch;
  });

  // Calculate KPI values
  const kpiValues = useMemo(() => {
    const total = opportunities.length;
    const active = opportunities.filter(opp => getDeadlineStatus(opp.applicationDeadline) !== 'closed').length;
    const expiringIn7Days = opportunities.filter(opp => getDeadlineStatus(opp.applicationDeadline) === 'closing-soon').length;
    const types = new Set(opportunities.map(opp => opp.donorName.split('-')[0])).size;

    return { total, active, expiringIn7Days, types };
  }, [opportunities]);

  // Get status badge color
  const getStatusBadgeColor = (status: DeadlineStatus): string => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closing-soon': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: DeadlineStatus): string => {
    switch (status) {
      case 'open': return labels.open;
      case 'closing-soon': return labels.closingSoon;
      case 'closed': return labels.closed;
      default: return 'Unknown';
    }
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

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{labels.title}</h1>
          <p className="text-muted-foreground mt-1">{labels.subtitle}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {labels.addOpportunity}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{labels.totalOpportunities}</p>
              <p className="text-2xl font-bold mt-1">{kpiValues.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-lg">📋</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{labels.activeOpportunities}</p>
              <p className="text-2xl font-bold mt-1">{kpiValues.active}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-lg">✅</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{labels.expiringOpportunities}</p>
              <p className="text-2xl font-bold mt-1">{kpiValues.expiringIn7Days}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-lg">⏰</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{labels.opportunityTypes}</p>
              <p className="text-2xl font-bold mt-1">{kpiValues.types}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-lg">🏢</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <Input
            placeholder={labels.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
            {labels.export}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="All">{labels.allTypes}</option>
            {donorTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status === 'All' ? labels.allStatus : status}</option>
            ))}
          </select>

          <Button
            variant={showDeleted ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowDeleted(!showDeleted)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {labels.showDeleted}
          </Button>
        </div>
      </div>

      {/* Table */}
      {filteredOpportunities.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          {labels.noOpportunities}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="text-left p-3 font-semibold text-sm">{labels.name}</th>
                  <th className="text-left p-3 font-semibold text-sm">{labels.type}</th>
                  <th className="text-left p-3 font-semibold text-sm">Interest Area</th>
                  <th className="text-left p-3 font-semibold text-sm">Geographic Areas</th>
                  <th className="text-left p-3 font-semibold text-sm">{labels.status}</th>
                  <th className="text-left p-3 font-semibold text-sm">Deadline</th>
                  <th className="text-left p-3 font-semibold text-sm">Budget</th>
                  <th className="text-left p-3 font-semibold text-sm">{labels.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.map((opp, idx) => {
                  const status = getDeadlineStatus(opp.applicationDeadline);
                  return (
                    <tr key={opp.id} className={`border-b hover:bg-muted/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-muted/30'}`}>
                      <td className="p-3 font-medium text-sm">{opp.donorName}</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {opp.donorName.split('-')[0] || 'Other'}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{opp.interestArea.join(', ') || '-'}</td>
                      <td className="p-3 text-sm">{opp.geographicAreas}</td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{opp.applicationDeadline}</td>
                      <td className="p-3 text-sm">{opp.allocatedBudget ? formatCurrency(opp.allocatedBudget) : '-'}</td>
                      <td className="p-3 text-sm flex gap-1">
                        {opp.cfpLink && (
                          <a href={opp.cfpLink} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" title="Open CFP">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        {opp.applicationLink && (
                          <a href={opp.applicationLink} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" title="Open Application">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
