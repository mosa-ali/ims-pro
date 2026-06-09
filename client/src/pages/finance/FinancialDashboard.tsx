import { useState, useMemo } from"react";
import { trpc } from"@/lib/trpc";
import { useAuth } from"@/contexts/AuthContext";
import { useOperatingUnit } from"@/contexts/OperatingUnitContext";
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Label } from"@/components/ui/label";
import { Input } from"@/components/ui/input";
import { Button } from"@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { 
 BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
 XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from"recharts";
import { 
 TrendingUp, TrendingDown, DollarSign, Wallet, AlertCircle, 
 Calendar, Filter, RefreshCw, ArrowLeft, ArrowRight
} from"lucide-react";
import { useNavigate } from '@/lib/router-compat';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

const COLORS = ["#0088FE","#00C49F","#FFBB28","#FF8042","#8884D8","#82CA9D","#FFC658","#FF6B6B"];

export default function FinancialDashboard() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { user } = useAuth();
 const { currentOperatingUnit } = useOperatingUnit();
 const { language, isRTL} = useLanguage();
 const organizationId = currentOperatingUnit?.organizationId || 0;

 const [filters, setFilters] = useState({
 projectId: undefined as number | undefined,
 grantId: undefined as number | undefined,
 startDate:"",
 endDate:"",
 });

 const [cashFlowInterval, setCashFlowInterval] = useState<"daily" |"weekly" |"monthly">("monthly");

 // Queries
 const { data: keyMetrics, refetch: refetchMetrics } = trpc.financialAnalytics.getKeyMetrics.useQuery({
 organizationId,
 ...filters,
 });

 const { data: budgetVsActual = [] } = trpc.financialAnalytics.getBudgetVsActual.useQuery({
 organizationId,
 ...filters,
 groupBy:"category",
 });

 const { data: cashFlowTrends = [] } = trpc.financialAnalytics.getCashFlowTrends.useQuery({
 organizationId,
 startDate: filters.startDate,
 endDate: filters.endDate,
 interval: cashFlowInterval,
 });

 const { data: expenseBreakdown = [] } = trpc.financialAnalytics.getExpenseBreakdown.useQuery({
 organizationId,
 ...filters,
 });

 const { data: topExpenses = [] } = trpc.financialAnalytics.getTopExpenses.useQuery({
 organizationId,
 ...filters,
 limit: 5,
 });

 const formatCurrency = (value: number) => {
 return new Intl.NumberFormat('en-US', {
 style:"currency",
 currency:"USD",
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
 <BackButton onClick={() => navigate('/organization/finance')} label={t.financeModule.backToFinance} />
 <div className="flex justify-between items-center mb-6">
 <div>
 <h1 className="text-3xl font-bold">
 {t.financeModule.financialAnalyticsDashboard}
 </h1>
 <p className="text-muted-foreground mt-1">
 {'Comprehensive financial analytics with interactive charts'}
 </p>
 </div>
 <Button variant="outline" onClick={() => refetchMetrics()}>
 <RefreshCw className="h-4 w-4 me-2" />
 {t.financeModule.refresh}
 </Button>
 </div>

 {/* Filters */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Filter className="h-5 w-5" />
 {t.financeModule.filters}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="space-y-2">
 <Label>{t.financeModule.startDate}</Label>
 <Input
 type="date"
 value={filters.startDate}
 onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.endDate}</Label>
 <Input
 type="date"
 value={filters.endDate}
 onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.cashFlowInterval}</Label>
 <Select value={cashFlowInterval} onValueChange={(value: any) => setCashFlowInterval(value)}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="daily">{t.financeModule.daily}</SelectItem>
 <SelectItem value="weekly">{t.financeModule.weekly}</SelectItem>
 <SelectItem value="monthly">{t.financeModule.monthly}</SelectItem>
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
 {t.financeModule.totalBudget11}
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
 {t.financeModule.totalSpent33}
 </CardTitle>
 <Wallet className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{formatCurrency(keyMetrics?.totalSpent || 0)}</div>
 <p className="text-xs text-muted-foreground mt-1">
 {formatPercentage(keyMetrics?.utilizationRate || 0)} {t.financeModule.utilization34}
 </p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">
 {t.financeModule.remaining}
 </CardTitle>
 {(keyMetrics?.remaining || 0) >= 0 ? (
 <TrendingUp className="h-4 w-4 text-green-500" />
 ) : (
 <TrendingDown className="h-4 w-4 text-red-500" />
 )}
 </CardHeader>
 <CardContent>
 <div className={`text-2xl font-bold ${(keyMetrics?.remaining || 0) < 0 ?"text-red-500" :""}`}>
 {formatCurrency(keyMetrics?.remaining || 0)}
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">
 {t.financeModule.variance35}
 </CardTitle>
 <AlertCircle className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className={`text-2xl font-bold ${(keyMetrics?.variancePercentage || 0) < 0 ?"text-red-500" :"text-green-500"}`}>
 {formatPercentage(keyMetrics?.variancePercentage || 0)}
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Charts */}
 <Tabs defaultValue="budget-vs-actual" className="space-y-4">
 <TabsList>
 <TabsTrigger value="budget-vs-actual">
 {t.financeModule.budgetVsActual}
 </TabsTrigger>
 <TabsTrigger value="cash-flow">
 {t.financeModule.cashFlow}
 </TabsTrigger>
 <TabsTrigger value="expense-breakdown">
 {t.financeModule.expenseBreakdown}
 </TabsTrigger>
 <TabsTrigger value="top-expenses">
 {t.financeModule.topExpenses}
 </TabsTrigger>
 </TabsList>

 {/* Budget vs Actual Chart */}
 <TabsContent value="budget-vs-actual">
 <Card>
 <CardHeader>
 <CardTitle>{t.financeModule.budgetVsActualSpending}</CardTitle>
 <CardDescription>
 {'Comparison of planned budget vs actual spending by category'}
 </CardDescription>
 </CardHeader>
 <CardContent>
 {budgetVsActual.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 {t.financeModule.noDataAvailable}
 </div>
 ) : (
 <ResponsiveContainer width="100%" height={400}>
 <BarChart data={budgetVsActual}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="category" />
 <YAxis />
 <Tooltip formatter={(value: number) => formatCurrency(value)} />
 <Legend />
 <Bar dataKey="budgetAmount" fill="#0088FE" name={t.financeModule.budget} />
 <Bar dataKey="actualAmount" fill="#00C49F" name={t.financeModule.actual} />
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
 <CardTitle>{t.financeModule.cashFlowTrends}</CardTitle>
 <CardDescription>
 {'Cash inflows and outflows over time'}
 </CardDescription>
 </CardHeader>
 <CardContent>
 {cashFlowTrends.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 {t.financeModule.noDataAvailable}
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
 name={t.financeModule.inflow} 
 />
 <Area 
 type="monotone" 
 dataKey="outflow" 
 stackId="2" 
 stroke="#FF8042" 
 fill="#FF8042" 
 name={t.financeModule.outflow} 
 />
 <Line 
 type="monotone" 
 dataKey="net" 
 stroke="#0088FE" 
 strokeWidth={2} 
 name={t.financeModule.net} 
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
 <CardTitle>{t.financeModule.expenseBreakdownByCategory}</CardTitle>
 <CardDescription>
 {'Percentage distribution of expenses by category'}
 </CardDescription>
 </CardHeader>
 <CardContent>
 {expenseBreakdown.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 {t.financeModule.noDataAvailable}
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
 <h3 className="font-semibold">{t.financeModule.categoryDetails}</h3>
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
 {item.count} {t.financeModule.transactions}
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
 <CardTitle>{t.financeModule.top5Expenses}</CardTitle>
 <CardDescription>
 {t.financeModule.largestExpensesByAmount}
 </CardDescription>
 </CardHeader>
 <CardContent>
 {topExpenses.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 {t.financeModule.noDataAvailable}
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
