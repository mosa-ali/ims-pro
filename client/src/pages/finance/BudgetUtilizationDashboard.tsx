/**
 * Budget Utilization Dashboard
 * 
 * Analytics page showing:
 * - Budget utilization across all PRs
 * - Active reservations count per budget line
 * - Total encumbered amounts by project/donor
 * - Remaining budget visualization with drill-down
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown, DollarSign, FileText, Lock, CheckCircle } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";

export default function BudgetUtilizationDashboard() {
  const { language, isRTL} = useLanguage();
 const [selectedBudgetLineId, setSelectedBudgetLineId] = useState<number | null>(null);

 // Fetch budget lines with utilization data
 const { data: budgetLines, isLoading } = trpc.prFinance.getBudgetLinesUtilization.useQuery();

 // Fetch detailed reservations for selected budget line
 const { data: reservations } = trpc.prFinance.getReservationsByBudgetLine.useQuery(
 { budgetLineId: selectedBudgetLineId! },
 { enabled: !!selectedBudgetLineId }
 );

 // Fetch detailed encumbrances for selected budget line
 const { data: encumbrances } = trpc.prFinance.getEncumbrancesByBudgetLine.useQuery(
 { budgetLineId: selectedBudgetLineId! },
 { enabled: !!selectedBudgetLineId }
 );

 if (isLoading) {
 return (
 <div className="container py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
 </div>
 </div>
 );
 }

 const totalBudget = budgetLines?.reduce((sum, bl) => sum + parseFloat(bl.totalAmount || "0"), 0) || 0;
 const totalReserved = budgetLines?.reduce((sum, bl) => sum + parseFloat(bl.totalReserved || "0"), 0) || 0;
 const totalEncumbered = budgetLines?.reduce((sum, bl) => sum + parseFloat(bl.totalEncumbered || "0"), 0) || 0;
 const totalCommitted = totalReserved + totalEncumbered;
 const totalAvailable = totalBudget - totalCommitted;
 const utilizationPercent = totalBudget > 0 ? (totalCommitted / totalBudget) * 100 : 0;

 return (
 <div className="container py-6 max-w-7xl">
 {/* Header */}
 <div className="mb-6">
 <h1 className="text-3xl font-bold">Budget Utilization Dashboard</h1>
 <p className="text-muted-foreground mt-1">Track budget commitments across all purchase requests</p>
 </div>

 {/* Summary Cards */}
 <div className="grid gap-4 md:grid-cols-4 mb-6">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
 <DollarSign className="w-4 h-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
 <p className="text-xs text-muted-foreground">
 {budgetLines?.length || 0} budget lines
 </p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Reserved</CardTitle>
 <FileText className="w-4 h-4 text-blue-600" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-blue-600">${totalReserved.toLocaleString()}</div>
 <p className="text-xs text-muted-foreground">
 Pending PRs
 </p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Encumbered</CardTitle>
 <Lock className="w-4 h-4 text-purple-600" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-purple-600">${totalEncumbered.toLocaleString()}</div>
 <p className="text-xs text-muted-foreground">
 Active POs
 </p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Available</CardTitle>
 <CheckCircle className="w-4 h-4 text-green-600" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-green-600">${totalAvailable.toLocaleString()}</div>
 <p className="text-xs text-muted-foreground">
 {utilizationPercent.toFixed(1)}% utilized
 </p>
 </CardContent>
 </Card>
 </div>

 {/* Overall Utilization */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>Overall Budget Utilization</CardTitle>
 <CardDescription>Breakdown of committed vs available budget</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 <div>
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-medium">Utilization</span>
 <span className="text-sm text-muted-foreground">{utilizationPercent.toFixed(1)}%</span>
 </div>
 <Progress value={utilizationPercent} className="h-3" />
 </div>

 <div className="grid grid-cols-3 gap-4 pt-4 border-t">
 <div>
 <p className="text-sm text-muted-foreground">Reserved (PRs)</p>
 <p className="text-lg font-semibold text-blue-600">${totalReserved.toLocaleString()}</p>
 <p className="text-xs text-muted-foreground">
 {totalBudget > 0 ? ((totalReserved / totalBudget) * 100).toFixed(1) : 0}% of total
 </p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">Encumbered (POs)</p>
 <p className="text-lg font-semibold text-purple-600">${totalEncumbered.toLocaleString()}</p>
 <p className="text-xs text-muted-foreground">
 {totalBudget > 0 ? ((totalEncumbered / totalBudget) * 100).toFixed(1) : 0}% of total
 </p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">Available</p>
 <p className="text-lg font-semibold text-green-600">${totalAvailable.toLocaleString()}</p>
 <p className="text-xs text-muted-foreground">
 {totalBudget > 0 ? ((totalAvailable / totalBudget) * 100).toFixed(1) : 0}% of total
 </p>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Budget Lines Table */}
 <Card>
 <CardHeader>
 <CardTitle>Budget Lines Utilization</CardTitle>
 <CardDescription>Click a budget line to view detailed reservations and encumbrances</CardDescription>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Budget Line</TableHead>
 <TableHead>Project/Donor</TableHead>
 <TableHead className="text-end">Total Budget</TableHead>
 <TableHead className="text-end">Reserved</TableHead>
 <TableHead className="text-end">Encumbered</TableHead>
 <TableHead className="text-end">Available</TableHead>
 <TableHead className="text-end">Utilization</TableHead>
 <TableHead></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {budgetLines && budgetLines.length > 0 ? (
 budgetLines.map((bl) => {
 const total = parseFloat(bl.totalAmount || "0");
 const reserved = parseFloat(bl.totalReserved || "0");
 const encumbered = parseFloat(bl.totalEncumbered || "0");
 const committed = reserved + encumbered;
 const available = total - committed;
 const utilization = total > 0 ? (committed / total) * 100 : 0;

 return (
 <TableRow
 key={bl.id}
 className={selectedBudgetLineId === bl.id ? "bg-muted" : "cursor-pointer hover:bg-muted/50"}
 onClick={() => setSelectedBudgetLineId(bl.id)}
 >
 <TableCell className="font-medium">{bl.code}</TableCell>
 <TableCell>{bl.projectName || bl.donorName || "—"}</TableCell>
 <TableCell className="text-end">${total.toLocaleString()}</TableCell>
 <TableCell className="text-end text-blue-600">${reserved.toLocaleString()}</TableCell>
 <TableCell className="text-end text-purple-600">${encumbered.toLocaleString()}</TableCell>
 <TableCell className="text-end text-green-600">${available.toLocaleString()}</TableCell>
 <TableCell className="text-end">
 <Badge variant={utilization > 90 ? "destructive" : utilization > 70 ? "secondary" : "default"}>
 {utilization.toFixed(1)}%
 </Badge>
 </TableCell>
 <TableCell>
 <Button
 variant="ghost"
 size="sm"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedBudgetLineId(bl.id);
 }}
 >
 Details
 </Button>
 </TableCell>
 </TableRow>
 );
 })
 ) : (
 <TableRow>
 <TableCell colSpan={8} className="text-center text-muted-foreground">
 No budget lines found
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>

 {/* Detailed View for Selected Budget Line */}
 {selectedBudgetLineId && (
 <Card className="mt-6">
 <CardHeader>
 <CardTitle>Budget Line Details</CardTitle>
 <CardDescription>
 Reservations and encumbrances for budget line {budgetLines?.find((bl) => bl.id === selectedBudgetLineId)?.code}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <Tabs defaultValue="reservations">
 <TabsList>
 <TabsTrigger value="reservations">
 Reservations ({reservations?.length || 0})
 </TabsTrigger>
 <TabsTrigger value="encumbrances">
 Encumbrances ({encumbrances?.length || 0})
 </TabsTrigger>
 </TabsList>

 <TabsContent value="reservations" className="space-y-4">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>PR Number</TableHead>
 <TableHead>Reserved Amount</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Created Date</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {reservations && reservations.length > 0 ? (
 reservations.map((res) => (
 <TableRow key={res.id}>
 <TableCell className="font-medium">{res.prNumber}</TableCell>
 <TableCell>${parseFloat(res.reservedAmount || "0").toLocaleString()}</TableCell>
 <TableCell>
 <Badge variant={res.status === "active" ? "default" : "secondary"}>
 {res.status}
 </Badge>
 </TableCell>
 <TableCell>{new Date(res.createdAt).toLocaleDateString()}</TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={4} className="text-center text-muted-foreground">
 No active reservations
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </TabsContent>

 <TabsContent value="encumbrances" className="space-y-4">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>PO Number</TableHead>
 <TableHead>Encumbered Amount</TableHead>
 <TableHead>Liquidated Amount</TableHead>
 <TableHead>Remaining</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Created Date</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {encumbrances && encumbrances.length > 0 ? (
 encumbrances.map((enc) => {
 const encumbered = parseFloat(enc.encumberedAmount || "0");
 const liquidated = parseFloat(enc.liquidatedAmount || "0");
 const remaining = encumbered - liquidated;

 return (
 <TableRow key={enc.id}>
 <TableCell className="font-medium">{enc.poNumber}</TableCell>
 <TableCell>${encumbered.toLocaleString()}</TableCell>
 <TableCell>${liquidated.toLocaleString()}</TableCell>
 <TableCell className="font-semibold">${remaining.toLocaleString()}</TableCell>
 <TableCell>
 <Badge variant={enc.status === "active" ? "default" : enc.status === "liquidated" ? "secondary" : "outline"}>
 {enc.status}
 </Badge>
 </TableCell>
 <TableCell>{new Date(enc.createdAt).toLocaleDateString()}</TableCell>
 </TableRow>
 );
 })
 ) : (
 <TableRow>
 <TableCell colSpan={6} className="text-center text-muted-foreground">
 No active encumbrances
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </TabsContent>
 </Tabs>
 </CardContent>
 </Card>
 )}
 </div>
 );
}
