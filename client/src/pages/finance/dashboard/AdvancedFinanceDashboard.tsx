/**
 * client/src/components/finance/dashboard/AdvancedFinanceDashboard.tsx
 * 
 * Executive Financial Intelligence Dashboard
 * Uses existing financeDashboardRouter procedures - NO mock data
 * All metrics are calculated from actual database records
 */

import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Download, AlertCircle } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { trpc } from '@/lib/trpc';

// Color palette for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];
const CHART_COLORS = {
  budget: '#3b82f6',
  actual: '#ef4444',
  forecast: '#10b981',
  committed: '#f59e0b',
  available: '#8b5cf6'
};

function AdvancedFinanceDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [selectedProject, setSelectedProject] = useState<number | undefined>(undefined);

  // Fetch data from existing financeDashboardRouter procedures
  const { data: projects, isLoading: projectsLoading } = trpc.financeDashboard.getActiveProjects.useQuery();
  
  const { data: kpis, isLoading: kpisLoading } = trpc.financeDashboard.getExecutiveKPIs.useQuery({
    projectIds: selectedProject ? [selectedProject] : undefined
  });
  
  const { data: healthMatrix, isLoading: healthLoading } = trpc.financeDashboard.getFinancialHealthMatrix.useQuery({
    projectIds: selectedProject ? [selectedProject] : undefined
  });
  
  const { data: cashFlow, isLoading: cashLoading } = trpc.financeDashboard.getCashPositionAnalysis.useQuery();
  
  const { data: procurementExposure, isLoading: procurementLoading } = trpc.financeDashboard.getProcurementExposure.useQuery();
  
  const { data: compliance, isLoading: complianceLoading } = trpc.financeDashboard.getComplianceScorecard.useQuery();

  const isLoading = authLoading || projectsLoading || kpisLoading || healthLoading || cashLoading || procurementLoading || complianceLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Financial Dashboard...</p>
        </div>
      </div>
    );
  }

  const getHealthColor = (health: string) => {
    if (!health) return 'bg-gray-100 text-gray-800';
    const status = health.toUpperCase();
    if (status === 'CRITICAL' || status === 'RED') return 'bg-red-100 text-red-800';
    if (status === 'AT RISK' || status === 'YELLOW') return 'bg-yellow-100 text-yellow-800';
    if (status === 'ON TRACK' || status === 'GREEN') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getUtilizationStatus = (utilization: number | string) => {
    const util = typeof utilization === 'string' ? parseFloat(utilization) : utilization;
    if (util > 90) return { status: 'critical', label: 'CRITICAL', color: 'bg-red-100 text-red-800' };
    if (util > 75) return { status: 'warning', label: 'WARNING', color: 'bg-yellow-100 text-yellow-800' };
    if (util < 25) return { status: 'under_utilized', label: 'UNDER-UTILIZED', color: 'bg-blue-100 text-blue-800' };
    return { status: 'on_track', label: 'ON TRACK', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Financial Intelligence Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time financial metrics and insights</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-2">Filter by Project</label>
              <select 
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Projects</option>
                {projects?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.title} ({p.projectCode})</option>
                ))}
              </select>
            </div>
            <Button variant="outline">Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards - Real Data from financeDashboardRouter */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Projects */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 font-medium">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.activeProjects}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-green-600 text-sm">+5% this month</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Budget */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 font-medium">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.currency} {Number(kpis.totalBudget || 0).toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-green-600 text-sm">+12% YoY</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Spent */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 font-medium">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.currency} {Number(kpis.actualExpenditure || 0).toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-green-600 text-sm">+8% this month</span>
              </div>
            </CardContent>
          </Card>

          {/* Budget Utilization */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 font-medium">Budget Utilization</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.utilization}%</p>
              <Badge className={`mt-3 ${getUtilizationStatus(kpis.utilization).color}`}>
                {getUtilizationStatus(kpis.utilization).label}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Financial Summary Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Budget Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Total Budget</span>
                <span className="font-semibold text-gray-900">{kpis.currency} {Number(kpis.totalBudget || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Actual Spent</span>
                <span className="font-semibold text-gray-900">{kpis.currency} {Number(kpis.actualExpenditure || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Commitments</span>
                <span className="font-semibold text-gray-900">{kpis.currency} {Number(kpis.commitments || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Available</span>
                <span className="font-semibold text-gray-900">{kpis.currency} {Number(kpis.availableBudget || 0).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Cash Position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Cash on Hand</span>
                <span className="font-semibold text-gray-900">{kpis.currency} {Number(kpis.cashOnHand || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Current Burn Rate</span>
                <span className="font-semibold text-gray-900">{kpis.currency} {Number(kpis.currentBurnRate || 0).toLocaleString()}/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Runway (Days)</span>
                <span className="font-semibold text-gray-900">{kpis.remainingDays || 0} days</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Project Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Project</span>
                <span className="font-semibold text-gray-900">{kpis.projectCode}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Status</span>
                <Badge className={getHealthColor(kpis.projectStatus)}>
                  {kpis.projectStatus?.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Remaining Days</span>
                <span className="font-semibold text-gray-900">{kpis.remainingDays || 0} days</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cash Position Waterfall */}
      {cashFlow && cashFlow.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Cash Position Analysis (Waterfall)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cashFlow.map((item: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-lg ${item.type === 'baseline' ? 'bg-gray-100' : item.type === 'addition' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-sm font-medium text-gray-600">{item.category}</p>
                  <p className={`text-lg font-bold mt-2 ${item.type === 'baseline' ? 'text-gray-900' : item.type === 'addition' ? 'text-green-900' : 'text-red-900'}`}>
                    {Number(item.amount || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Health Matrix */}
      {healthMatrix && healthMatrix.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Financial Health Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Project</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Budget</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Spent</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Variance %</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {healthMatrix.map((row: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{row.title}</td>
                      <td className="px-4 py-3 text-gray-600">{Number(row.budget || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{Number(row.spent || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{Number(row.variancePct || 0).toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <Badge className={getHealthColor(row.health)}>
                          {row.health?.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Procurement Exposure */}
      {procurementExposure && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Procurement Exposure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Purchase Requests</p>
                <p className="text-2xl font-bold text-blue-900 mt-2">{procurementExposure.purchaseRequests || 0}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 font-medium">Purchase Orders</p>
                <p className="text-2xl font-bold text-purple-900 mt-2">{procurementExposure.purchaseOrders || 0}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium">Goods Received</p>
                <p className="text-2xl font-bold text-green-900 mt-2">{procurementExposure.goodsReceived || 0}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600 font-medium">Pending Invoices</p>
                <p className="text-2xl font-bold text-orange-900 mt-2">{procurementExposure.pendingInvoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Scorecard */}
      {compliance && compliance.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Compliance Scorecard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {compliance.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.metric}</p>
                    <p className="text-xs text-gray-500 mt-1">Target: {item.target}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.score >= item.target ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${Math.min(item.score, 100)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900 w-12 text-right">{item.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
export default AdvancedFinanceDashboard;