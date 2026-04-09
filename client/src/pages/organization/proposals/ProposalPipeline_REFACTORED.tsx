import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { BackButton } from '@/components/BackButton';

interface PipelineOpportunity {
  id: number;
  title: string;
  donorName: string;
  stage: string;
  probability: number;
  indicativeBudgetMin: number;
  indicativeBudgetMax: number;
  deadline: string;
  createdAt: string;
}

export function ProposalPipeline() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  // Fetch real pipeline opportunities from database
  const { data: pipelineData, isLoading } = trpc.proposals.getAllPipelineOpportunities.useQuery(
    {
      limit: 1000,
      offset: 0,
    },
    {
      enabled: !!user?.organizationId,
    }
  );

  // Fetch KPI data
  const { data: kpis } = trpc.proposals.getPipelineKPIs.useQuery(
    {},
    {
      enabled: !!user?.organizationId,
    }
  );

  // Transform data for visualization
  const opportunities = useMemo(() => {
    if (!pipelineData) return [];
    return pipelineData.map(record => ({
      id: record.id,
      title: record.title,
      donorName: record.donorName,
      stage: record.stage || 'Identified',
      probability: record.probability || 50,
      indicativeBudgetMin: parseFloat(record.indicativeBudgetMin?.toString() || '0'),
      indicativeBudgetMax: parseFloat(record.indicativeBudgetMax?.toString() || '0'),
      deadline: record.deadline ? (typeof record.deadline === 'string' ? record.deadline : record.deadline.toISOString().split('T')[0]) : '',
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : (record.createdAt?.toISOString() || new Date().toISOString()),
    }));
  }, [pipelineData]);

  // Calculate stage distribution
  const stageDistribution = useMemo(() => {
    const stages: Record<string, number> = {};
    opportunities.forEach(opp => {
      stages[opp.stage] = (stages[opp.stage] || 0) + 1;
    });
    return Object.entries(stages).map(([stage, count]) => ({
      name: stage,
      value: count,
      opportunities: count
    }));
  }, [opportunities]);

  // Calculate probability distribution
  const probabilityDistribution = useMemo(() => {
    const ranges = {
      '0-25%': 0,
      '26-50%': 0,
      '51-75%': 0,
      '76-100%': 0
    };
    opportunities.forEach(opp => {
      if (opp.probability <= 25) ranges['0-25%']++;
      else if (opp.probability <= 50) ranges['26-50%']++;
      else if (opp.probability <= 75) ranges['51-75%']++;
      else ranges['76-100%']++;
    });
    return Object.entries(ranges).map(([range, count]) => ({
      name: range,
      opportunities: count
    }));
  }, [opportunities]);

  // Calculate budget by stage
  const budgetByStage = useMemo(() => {
    const stages: Record<string, number> = {};
    opportunities.forEach(opp => {
      const avgBudget = (opp.indicativeBudgetMin + opp.indicativeBudgetMax) / 2;
      stages[opp.stage] = (stages[opp.stage] || 0) + avgBudget;
    });
    return Object.entries(stages).map(([stage, budget]) => ({
      stage,
      budget: Math.round(budget / 1000) // Convert to thousands
    }));
  }, [opportunities]);

  const labels = {
    title: (t?.proposals?.proposalPipeline as string) || 'Proposal Pipeline',
    subtitle: (t?.proposals?.trackFundingOpportunitiesDevelopProposalsAnd as string) || 'Track funding opportunities and proposal development',
    stageDistribution: 'Opportunities by Stage',
    probabilityDistribution: 'Probability Distribution',
    budgetByStage: 'Average Budget by Stage (USD Thousands)',
    totalOpportunities: (t?.proposals?.totalOpportunities as string) || 'Total Opportunities',
    averageProbability: (t?.proposals?.averageProbability as string) || 'Average Probability',
    totalBudget: (t?.proposals?.totalBudget as string) || 'Total Budget',
    noData: (t?.proposals?.noOpportunitiesFound as string) || 'No opportunities found'
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6366f1'];

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

      <div>
        <h1 className="text-3xl font-bold">{labels.title}</h1>
        <p className="text-muted-foreground mt-1">{labels.subtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">{labels.totalOpportunities}</p>
          <p className="text-3xl font-bold mt-2">{opportunities.length}</p>
          <p className="text-xs text-muted-foreground mt-2">From database</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">{labels.averageProbability}</p>
          <p className="text-3xl font-bold mt-2">
            {opportunities.length > 0 ? Math.round(opportunities.reduce((sum, opp) => sum + opp.probability, 0) / opportunities.length) : 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-2">Weighted average</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">{labels.totalBudget}</p>
          <p className="text-3xl font-bold mt-2">
            {formatCurrency(
              opportunities.reduce((sum, opp) => sum + ((opp.indicativeBudgetMin + opp.indicativeBudgetMax) / 2), 0)
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Average budget</p>
        </Card>
      </div>

      {/* Charts */}
      {opportunities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stage Distribution */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">{labels.stageDistribution}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stageDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Probability Distribution */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">{labels.probabilityDistribution}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={probabilityDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="opportunities" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Budget by Stage */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="font-semibold mb-4">{labels.budgetByStage}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetByStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="budget" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          {labels.noData}
        </Card>
      )}

      {/* Opportunities Table */}
      {opportunities.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">All Opportunities</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Donor</th>
                  <th className="text-left p-2">Stage</th>
                  <th className="text-left p-2">Probability</th>
                  <th className="text-left p-2">Budget Range</th>
                  <th className="text-left p-2">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map(opp => (
                  <tr key={opp.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{opp.title}</td>
                    <td className="p-2">{opp.donorName}</td>
                    <td className="p-2">{opp.stage}</td>
                    <td className="p-2">{opp.probability}%</td>
                    <td className="p-2">{formatCurrency(opp.indicativeBudgetMin)} - {formatCurrency(opp.indicativeBudgetMax)}</td>
                    <td className="p-2">{opp.deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
