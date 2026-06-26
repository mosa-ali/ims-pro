import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, AlertCircle, 
  Calendar, Filter, RefreshCw, ArrowLeft, ArrowRight
} from "lucide-react";
import { useNavigate } from '@/lib/router-compat';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6B6B"];

export default function FinancialDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOperatingUnit } = useOperatingUnit();
  const { language, isRTL } = useLanguage();
  const organizationId = currentOperatingUnit?.organizationId || 0;

  // ========== HELPER FUNCTION TO GET TEXT BY LANGUAGE ==========
  const getText = (en: string, ar: string, it: string): string => {
    switch (language) {
      case "ar":
        return ar;
      case "it":
        return it;
      case "en":
      default:
        return en;
    }
  };

  const [filters, setFilters] = useState({
    projectId: undefined as number | undefined,
    grantId: undefined as number | undefined,
    startDate: "",
    endDate: "",
  });

  const [cashFlowInterval, setCashFlowInterval] = useState<"daily" | "weekly" | "monthly">("monthly");

  // Queries
  const { data: keyMetrics, refetch: refetchMetrics } = trpc.financialAnalytics.getKeyMetrics.useQuery({
    
    ...filters,
  });

  const { data: budgetVsActual = [] } = trpc.financialAnalytics.getBudgetVsActual.useQuery({
    
    ...filters,
    groupBy: "category",
  });

  const { data: cashFlowTrends = [] } = trpc.financialAnalytics.getCashFlowTrends.useQuery({
    
    startDate: filters.startDate,
    endDate: filters.endDate,
    interval: cashFlowInterval,
  });

  const { data: expenseBreakdown = [] } = trpc.financialAnalytics.getExpenseBreakdown.useQuery({
    
    ...filters,
  });

  const { data: topExpenses = [] } = trpc.financialAnalytics.getTopExpenses.useQuery({
    
    ...filters,
    limit: 5,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Navigation */}
      <BackButton onClick={() => navigate('/organization/finance')} label={getText(
        t.financeModule.backToFinance || "Back to Finance",
        t.financeModule.backToFinance || "العودة إلى المالية",
        t.financeModule.backToFinance || "Torna a Finanza"
      )} />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {getText(
              t.financeModule.financialAnalyticsDashboard || "Financial Analytics Dashboard",
              t.financeModule.financialAnalyticsDashboard || "لوحة تحكم التحليلات المالية",
              t.financeModule.financialAnalyticsDashboard || "Dashboard di Analitiche Finanziarie"
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {getText(
              "Comprehensive financial analytics with interactive charts",
              "تحليلات مالية شاملة مع مخططات تفاعلية",
              "Analitiche finanziarie complete con grafici interattivi"
            )}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchMetrics()}>
          <RefreshCw className="h-4 w-4 me-2" />
          {getText(
            t.financeModule.refresh || "Refresh",
            t.financeModule.refresh || "تحديث",
            t.financeModule.refresh || "Aggiorna"
          )}
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {getText(
              t.financeModule.filters || "Filters",
              t.financeModule.filters || "المرشحات",
              t.financeModule.filters || "Filtri"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{getText(
                t.financeModule.startDate || "Start Date",
                t.financeModule.startDate || "تاريخ البداية",
                t.financeModule.startDate || "Data di Inizio"
              )}</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{getText(
                t.financeModule.endDate || "End Date",
                t.financeModule.endDate || "تاريخ النهاية",
                t.financeModule.endDate || "Data di Fine"
              )}</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{getText(
                t.financeModule.cashFlowInterval || "Cash Flow Interval",
                t.financeModule.cashFlowInterval || "فترة التدفق النقدي",
                t.financeModule.cashFlowInterval || "Intervallo di Flusso di Cassa"
              )}</Label>
              <Select value={cashFlowInterval} onValueChange={(value: any) => setCashFlowInterval(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{getText(
                    t.financeModule.daily || "Daily",
                    t.financeModule.daily || "يومي",
                    t.financeModule.daily || "Giornaliero"
                  )}</SelectItem>
                  <SelectItem value="weekly">{getText(
                    t.financeModule.weekly || "Weekly",
                    t.financeModule.weekly || "أسبوعي",
                    t.financeModule.weekly || "Settimanale"
                  )}</SelectItem>
                  <SelectItem value="monthly">{getText(
                    t.financeModule.monthly || "Monthly",
                    t.financeModule.monthly || "شهري",
                    t.financeModule.monthly || "Mensile"
                  )}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {getText(
                t.financeModule.totalBudget11 || "Total Budget",
                t.financeModule.totalBudget11 || "إجمالي الميزانية",
                t.financeModule.totalBudget11 || "Budget Totale"
              )}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(keyMetrics?.totalBudget || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {getText(
                t.financeModule.totalSpent33 || "Total Spent",
                t.financeModule.totalSpent33 || "إجمالي المبلغ المنفق",
                t.financeModule.totalSpent33 || "Totale Speso"
              )}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(keyMetrics?.totalSpent || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(keyMetrics?.utilizationRate || 0)} {getText(
                t.financeModule.utilization34 || "utilization",
                t.financeModule.utilization34 || "الاستخدام",
                t.financeModule.utilization34 || "utilizzo"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {getText(
                t.financeModule.remaining || "Remaining",
                t.financeModule.remaining || "المتبقي",
                t.financeModule.remaining || "Rimanente"
              )}
            </CardTitle>
            {(keyMetrics?.remaining || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(keyMetrics?.remaining || 0) < 0 ? "text-red-500" : ""}`}>
              {formatCurrency(keyMetrics?.remaining || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {getText(
                t.financeModule.variance35 || "Variance",
                t.financeModule.variance35 || "التباين",
                t.financeModule.variance35 || "Varianza"
              )}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(keyMetrics?.variancePercentage || 0) < 0 ? "text-red-500" : "text-green-500"}`}>
              {formatPercentage(keyMetrics?.variancePercentage || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="budget-vs-actual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="budget-vs-actual">
            {getText(
              t.financeModule.budgetVsActual || "Budget vs Actual",
              t.financeModule.budgetVsActual || "الميزانية مقابل الفعلي",
              t.financeModule.budgetVsActual || "Budget vs Effettivo"
            )}
          </TabsTrigger>
          <TabsTrigger value="cash-flow">
            {getText(
              t.financeModule.cashFlow || "Cash Flow",
              t.financeModule.cashFlow || "التدفق النقدي",
              t.financeModule.cashFlow || "Flusso di Cassa"
            )}
          </TabsTrigger>
          <TabsTrigger value="expense-breakdown">
            {getText(
              t.financeModule.expenseBreakdown || "Expense Breakdown",
              t.financeModule.expenseBreakdown || "تفصيل النفقات",
              t.financeModule.expenseBreakdown || "Ripartizione delle Spese"
            )}
          </TabsTrigger>
          <TabsTrigger value="top-expenses">
            {getText(
              t.financeModule.topExpenses || "Top Expenses",
              t.financeModule.topExpenses || "أكبر النفقات",
              t.financeModule.topExpenses || "Spese Principali"
            )}
          </TabsTrigger>
        </TabsList>

        {/* Budget vs Actual Chart */}
        <TabsContent value="budget-vs-actual">
          <Card>
            <CardHeader>
              <CardTitle>{getText(
                t.financeModule.budgetVsActualSpending || "Budget vs Actual Spending",
                t.financeModule.budgetVsActualSpending || "الميزانية مقابل النفقات الفعلية",
                t.financeModule.budgetVsActualSpending || "Budget vs Spesa Effettiva"
              )}</CardTitle>
              <CardDescription>
                {getText(
                  "Comparison of planned budget vs actual spending by category",
                  "مقارنة الميزانية المخطط لها مقابل النفقات الفعلية حسب الفئة",
                  "Confronto tra budget pianificato e spesa effettiva per categoria"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {budgetVsActual.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {getText(
                    t.financeModule.noDataAvailable || "No data available",
                    t.financeModule.noDataAvailable || "لا توجد بيانات متاحة",
                    t.financeModule.noDataAvailable || "Nessun dato disponibile"
                  )}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={budgetVsActual}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="budgetAmount" fill="#0088FE" name={getText(
                      t.financeModule.budget || "Budget",
                      t.financeModule.budget || "الميزانية",
                      t.financeModule.budget || "Budget"
                    )} />
                    <Bar dataKey="actualAmount" fill="#00C49F" name={getText(
                      t.financeModule.actual || "Actual",
                      t.financeModule.actual || "الفعلي",
                      t.financeModule.actual || "Effettivo"
                    )} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Chart */}
        <TabsContent value="cash-flow">
          <Card>
            <CardHeader>
              <CardTitle>{getText(
                t.financeModule.cashFlowTrends || "Cash Flow Trends",
                t.financeModule.cashFlowTrends || "اتجاهات التدفق النقدي",
                t.financeModule.cashFlowTrends || "Tendenze del Flusso di Cassa"
              )}</CardTitle>
              <CardDescription>
                {getText(
                  "Cash inflows and outflows over time",
                  "التدفقات النقدية الداخلة والخارجة بمرور الوقت",
                  "Flussi di cassa in entrata e in uscita nel tempo"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cashFlowTrends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {getText(
                    t.financeModule.noDataAvailable || "No data available",
                    t.financeModule.noDataAvailable || "لا توجد بيانات متاحة",
                    t.financeModule.noDataAvailable || "Nessun dato disponibile"
                  )}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={cashFlowTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="inflow" 
                      stackId="1" 
                      stroke="#00C49F" 
                      fill="#00C49F" 
                      name={getText(
                        t.financeModule.inflow || "Inflow",
                        t.financeModule.inflow || "التدفق الداخل",
                        t.financeModule.inflow || "Afflusso"
                      )}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="outflow" 
                      stackId="2" 
                      stroke="#FF8042" 
                      fill="#FF8042" 
                      name={getText(
                        t.financeModule.outflow || "Outflow",
                        t.financeModule.outflow || "التدفق الخارج",
                        t.financeModule.outflow || "Deflusso"
                      )}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="net" 
                      stroke="#0088FE" 
                      strokeWidth={2} 
                      name={getText(
                        t.financeModule.net || "Net",
                        t.financeModule.net || "الصافي",
                        t.financeModule.net || "Netto"
                      )}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Breakdown Chart */}
        <TabsContent value="expense-breakdown">
          <Card>
            <CardHeader>
              <CardTitle>{getText(
                t.financeModule.expenseBreakdownByCategory || "Expense Breakdown by Category",
                t.financeModule.expenseBreakdownByCategory || "تفصيل النفقات حسب الفئة",
                t.financeModule.expenseBreakdownByCategory || "Ripartizione delle Spese per Categoria"
              )}</CardTitle>
              <CardDescription>
                {getText(
                  "Percentage distribution of expenses by category",
                  "توزيع النسبة المئوية للنفقات حسب الفئة",
                  "Distribuzione percentuale delle spese per categoria"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expenseBreakdown.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {getText(
                    t.financeModule.noDataAvailable || "No data available",
                    t.financeModule.noDataAvailable || "لا توجد بيانات متاحة",
                    t.financeModule.noDataAvailable || "Nessun dato disponibile"
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.category}: ${formatPercentage(entry.percentage)}`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-4">
                    <h3 className="font-semibold">{getText(
                      t.financeModule.categoryDetails || "Category Details",
                      t.financeModule.categoryDetails || "تفاصيل الفئة",
                      t.financeModule.categoryDetails || "Dettagli della Categoria"
                    )}</h3>
                    {expenseBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <div className="font-medium">{item.category}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.count} {getText(
                                t.financeModule.transactions || "transactions",
                                t.financeModule.transactions || "المعاملات",
                                t.financeModule.transactions || "transazioni"
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="font-semibold">{formatCurrency(item.amount)}</div>
                          <div className="text-sm text-muted-foreground">{formatPercentage(item.percentage)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Expenses */}
        <TabsContent value="top-expenses">
          <Card>
            <CardHeader>
              <CardTitle>{getText(
                t.financeModule.top5Expenses || "Top 5 Expenses",
                t.financeModule.top5Expenses || "أفضل 5 نفقات",
                t.financeModule.top5Expenses || "Top 5 Spese"
              )}</CardTitle>
              <CardDescription>
                {getText(
                  t.financeModule.largestExpensesByAmount || "Largest expenses by amount",
                  t.financeModule.largestExpensesByAmount || "أكبر النفقات حسب المبلغ",
                  t.financeModule.largestExpensesByAmount || "Spese più grandi per importo"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topExpenses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {getText(
                    t.financeModule.noDataAvailable || "No data available",
                    t.financeModule.noDataAvailable || "لا توجد بيانات متاحة",
                    t.financeModule.noDataAvailable || "Nessun dato disponibile"
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {topExpenses.map((expense: any, index) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{expense.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(expense.expenditureDate).toLocaleDateString('en-US')} • {expense.category}
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="font-bold text-lg">{formatCurrency(parseFloat(expense.amount))}</div>
                        <div className="text-sm text-muted-foreground">{expense.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
