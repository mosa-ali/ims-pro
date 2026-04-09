/**
 * Scheduled Reports Management
 * Configure automated report generation and email delivery
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "wouter";
import { Plus, Trash2, Edit, Calendar, Mail, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

const REPORT_TYPES = [
 { value: "procurement_cycle_time", label: "Procurement Cycle Time" },
 { value: "supplier_performance", label: "Supplier Performance" },
 { value: "po_aging", label: "PO Aging" },
 { value: "spending_analysis", label: "Spending Analysis" },
 { value: "inventory_summary", label: "Inventory Summary" },
];

const FREQUENCIES = [
 { value: "weekly", label: "Weekly" },
 { value: "monthly", label: "Monthly" },
];

const DAYS_OF_WEEK = [
 { value: 0, label: "Sunday" },
 { value: 1, label: "Monday" },
 { value: 2, label: "Tuesday" },
 { value: 3, label: "Wednesday" },
 { value: 4, label: "Thursday" },
 { value: 5, label: "Friday" },
 { value: 6, label: "Saturday" },
];

export default function ScheduledReports() {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;

 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [editingId, setEditingId] = useState<number | null>(null);
 const [formData, setFormData] = useState({
 reportType: "procurement_cycle_time",
 frequency: "weekly",
 recipients: "",
 dayOfWeek: 1,
 dayOfMonth: 1,
 enabled: true,
 });

 const { data: scheduledReports, isLoading, refetch } = trpc.logistics.scheduledReports.list.useQuery();
 const createMutation = trpc.logistics.scheduledReports.create.useMutation();
 const updateMutation = trpc.logistics.scheduledReports.update.useMutation();
 const deleteMutation = trpc.logistics.scheduledReports.delete.useMutation();

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 const recipientEmails = formData.recipients
 .split(",")
 .map((email) => email.trim())
 .filter((email) => email.length > 0);

 if (recipientEmails.length === 0) {
 toast.error("Please enter at least one recipient email");
 return;
 }

 try {
 if (editingId) {
 await updateMutation.mutateAsync({
 id: editingId,
 reportType: formData.reportType as any,
 frequency: formData.frequency as any,
 recipients: recipientEmails,
 dayOfWeek: formData.frequency === "weekly" ? formData.dayOfWeek : undefined,
 dayOfMonth: formData.frequency === "monthly" ? formData.dayOfMonth : undefined,
 enabled: formData.enabled,
 });
 toast.success("Scheduled report updated successfully");
 } else {
 await createMutation.mutateAsync({
 reportType: formData.reportType as any,
 frequency: formData.frequency as any,
 recipients: recipientEmails,
 dayOfWeek: formData.frequency === "weekly" ? formData.dayOfWeek : undefined,
 dayOfMonth: formData.frequency === "monthly" ? formData.dayOfMonth : undefined,
 enabled: formData.enabled,
 });
 toast.success("Scheduled report created successfully");
 }

 setIsDialogOpen(false);
 setEditingId(null);
 setFormData({
 reportType: "procurement_cycle_time",
 frequency: "weekly",
 recipients: "",
 dayOfWeek: 1,
 dayOfMonth: 1,
 enabled: true,
 });
 refetch();
 } catch (error: any) {
 toast.error(error.message || "Failed to save scheduled report");
 }
 };

 const handleEdit = (report: any) => {
 setEditingId(report.id);
 setFormData({
 reportType: report.reportType,
 frequency: report.frequency,
 recipients: JSON.parse(report.recipients || "[]").join(", "),
 dayOfWeek: report.dayOfWeek || 1,
 dayOfMonth: report.dayOfMonth || 1,
 enabled: report.enabled,
 });
 setIsDialogOpen(true);
 };

 const handleDelete = async (id: number) => {
 if (!confirm("Are you sure you want to delete this scheduled report?")) return;

 try {
 await deleteMutation.mutateAsync({ id });
 toast.success("Scheduled report deleted successfully");
 refetch();
 } catch (error: any) {
 toast.error(error.message || "Failed to delete scheduled report");
 }
 };

 const handleToggleEnabled = async (report: any) => {
 try {
 await updateMutation.mutateAsync({
 id: report.id,
 enabled: !report.enabled,
 });
 toast.success(`Report ${!report.enabled ? "enabled" : "disabled"} successfully`);
 refetch();
 } catch (error: any) {
 toast.error(error.message || "Failed to update report status");
 }
 };

 return (
 <div className="container py-8 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton href="/organization/logistics/reports" iconOnly />
 <div>
 <h1 className="text-3xl font-bold">{isRTL ? 'التقارير المجدولة' : 'Scheduled Reports'}</h1>
 <p className="text-muted-foreground">Configure automated report generation and email delivery</p>
 </div>
 </div>

 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
 <DialogTrigger asChild>
 <Button onClick={() => {
 setEditingId(null);
 setFormData({
 reportType: "procurement_cycle_time",
 frequency: "weekly",
 recipients: "",
 dayOfWeek: 1,
 dayOfMonth: 1,
 enabled: true,
 });
 }}>
 <Plus className="h-4 w-4 me-2" />
 New Schedule
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{editingId ? "Edit" : "Create"} Scheduled Report</DialogTitle>
 <DialogDescription>
 Configure automated report generation and email delivery to stakeholders
 </DialogDescription>
 </DialogHeader>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <Label>{isRTL ? 'نوع التقرير' : 'Report Type'}</Label>
 <Select
 value={formData.reportType}
 onValueChange={(value) => setFormData({ ...formData, reportType: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {REPORT_TYPES.map((type) => (
 <SelectItem key={type.value} value={type.value}>
 {type.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <Label>{isRTL ? 'التكرار' : 'Frequency'}</Label>
 <Select
 value={formData.frequency}
 onValueChange={(value) => setFormData({ ...formData, frequency: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {FREQUENCIES.map((freq) => (
 <SelectItem key={freq.value} value={freq.value}>
 {freq.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {formData.frequency === "weekly" && (
 <div>
 <Label>Day of Week</Label>
 <Select
 value={formData.dayOfWeek.toString()}
 onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {DAYS_OF_WEEK.map((day) => (
 <SelectItem key={day.value} value={day.value.toString()}>
 {day.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 )}

 {formData.frequency === "monthly" && (
 <div>
 <Label>Day of Month (1-31)</Label>
 <Input
 type="number"
 min="1"
 max="31"
 value={formData.dayOfMonth}
 onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
 />
 </div>
 )}

 <div>
 <Label>Recipients (comma-separated emails)</Label>
 <Input
 type="text"
 placeholder={t.placeholders.programManagerExampleComLogisticsExampleComFinance}
 value={formData.recipients}
 onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
 required
 />
 <p className="text-xs text-muted-foreground mt-1">
 Enter email addresses for Program Manager, Logistics, and Finance teams
 </p>
 </div>

 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 id="enabled"
 checked={formData.enabled}
 onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
 />
 <Label htmlFor="enabled">Enable this schedule</Label>
 </div>

 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
 Cancel
 </Button>
 <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
 {editingId ? "Update" : "Create"} Schedule
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>

 {/* Scheduled Reports List */}
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'الجداول النشطة' : 'Active Schedules'}</CardTitle>
 <CardDescription>Manage automated report generation schedules</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
 ) : scheduledReports && scheduledReports.length > 0 ? (
 <div className="space-y-4">
 {scheduledReports.map((report: any) => (
 <div
 key={report.id}
 className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
 >
 <div className="flex-1">
 <div className="flex items-center gap-3">
 <h3 className="font-semibold">
 {REPORT_TYPES.find((t) => t.value === report.reportType)?.label || report.reportType}
 </h3>
 <span
 className={`px-2 py-1 rounded text-xs ${ report.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800" }`}
 >
 {report.enabled ? "Enabled" : "Disabled"}
 </span>
 </div>
 <div className="mt-2 space-y-1 text-sm text-muted-foreground">
 <div className="flex items-center gap-2">
 <Calendar className="h-4 w-4" />
 <span>
 {report.frequency === "weekly"
 ? `Every ${DAYS_OF_WEEK.find((d) => d.value === report.dayOfWeek)?.label || "Monday"}`
 : `Monthly on day ${report.dayOfMonth}`}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <Mail className="h-4 w-4" />
 <span>{JSON.parse(report.recipients || "[]").join(", ")}</span>
 </div>
 {report.nextRunAt && (
 <div className="text-xs">
 Next run: {new Date(report.nextRunAt).toLocaleString()}
 </div>
 )}
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleToggleEnabled(report)}
 title={report.enabled ? "Disable" : "Enable"}
 >
 {report.enabled ? (
 <Power className="h-4 w-4 text-green-600" />
 ) : (
 <PowerOff className="h-4 w-4 text-gray-400" />
 )}
 </Button>
 <Button variant="ghost" size="icon" onClick={() => handleEdit(report)}>
 <Edit className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDelete(report.id)}
 className="text-red-600 hover:text-red-700"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-12">
 <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
 <p className="text-muted-foreground mb-4">No scheduled reports yet</p>
 <Button onClick={() => setIsDialogOpen(true)}>
 <Plus className="h-4 w-4 me-2" />
 Create First Schedule
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
