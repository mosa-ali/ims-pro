/**
 * Implementation Monitoring Sub-Card - Contract Management
 * 4 sections: Deliverables Checklist, Primary Handover, Final Handover, Observations
 * Auto-created when contract is approved
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Edit,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const translations = {
  en: {
    title: "Implementation Monitoring",
    description: "Track deliverables, handovers, and site observations",
    // Tabs
    checklist: "Deliverables Checklist",
    primaryHandover: "Primary Handover",
    finalHandover: "Final Handover",
    observations: "Observations",
    // Monitoring record
    monitoringStatus: "Monitoring Status",
    overallProgress: "Overall Progress",
    notes: "Notes",
    // Checklist
    addItem: "Add Item",
    editItem: "Edit Item",
    itemTitle: "Item Title",
    itemDescription: "Description",
    expectedDate: "Expected Date",
    actualDate: "Actual Date",
    completionStatus: "Status",
    pending: "Pending",
    inProgress: "In Progress",
    completed: "Completed",
    delayed: "Delayed",
    noItems: "No checklist items yet",
    // Handover
    addHandover: "Add Handover Record",
    handoverDate: "Handover Date",
    handoverType: "Type",
    handoverNotes: "Notes",
    receivedBy: "Received By",
    deliveredBy: "Delivered By",
    handoverStatus: "Status",
    handoverPending: "Pending",
    handoverCompleted: "Completed",
    handoverRejected: "Rejected",
    noHandovers: "No handover records yet",
    // Observations
    addObservation: "Add Observation",
    observationDate: "Date",
    observationType: "Type",
    observationSite: "Site Visit",
    observationQuality: "Quality Issue",
    observationSafety: "Safety Concern",
    observationGeneral: "General",
    observationDescription: "Description",
    severity: "Severity",
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
    actionRequired: "Action Required",
    noObservations: "No observations recorded yet",
    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    created: "Record added successfully",
    updated: "Record updated successfully",
    deleted: "Record deleted successfully",
    notStarted: "Not Started",
    active: "Active",
    onHold: "On Hold",
    closed: "Closed",
  },
  ar: {
    title: "متابعة التنفيذ",
    description: "تتبع المخرجات والتسليم والملاحظات الميدانية",
    // Tabs
    checklist: "قائمة المخرجات",
    primaryHandover: "التسليم الأولي",
    finalHandover: "التسليم النهائي",
    observations: "الملاحظات",
    // Monitoring record
    monitoringStatus: "حالة المتابعة",
    overallProgress: "التقدم الإجمالي",
    notes: "ملاحظات",
    // Checklist
    addItem: "إضافة عنصر",
    editItem: "تعديل العنصر",
    itemTitle: "عنوان العنصر",
    itemDescription: "الوصف",
    expectedDate: "التاريخ المتوقع",
    actualDate: "التاريخ الفعلي",
    completionStatus: "الحالة",
    pending: "معلق",
    inProgress: "قيد التنفيذ",
    completed: "مكتمل",
    delayed: "متأخر",
    noItems: "لا توجد عناصر في القائمة بعد",
    // Handover
    addHandover: "إضافة سجل تسليم",
    handoverDate: "تاريخ التسليم",
    handoverType: "النوع",
    handoverNotes: "ملاحظات",
    receivedBy: "المستلم",
    deliveredBy: "المسلّم",
    handoverStatus: "الحالة",
    handoverPending: "معلق",
    handoverCompleted: "مكتمل",
    handoverRejected: "مرفوض",
    noHandovers: "لا توجد سجلات تسليم بعد",
    // Observations
    addObservation: "إضافة ملاحظة",
    observationDate: "التاريخ",
    observationType: "النوع",
    observationSite: "زيارة ميدانية",
    observationQuality: "مشكلة جودة",
    observationSafety: "مخاوف سلامة",
    observationGeneral: "عام",
    observationDescription: "الوصف",
    severity: "الخطورة",
    low: "منخفض",
    medium: "متوسط",
    high: "عالي",
    critical: "حرج",
    actionRequired: "إجراء مطلوب",
    noObservations: "لم يتم تسجيل ملاحظات بعد",
    // Common
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    created: "تمت الإضافة بنجاح",
    updated: "تم التحديث بنجاح",
    deleted: "تم الحذف بنجاح",
    notStarted: "لم يبدأ",
    active: "نشط",
    onHold: "معلق",
    closed: "مغلق",
  },
};

interface ImplementationMonitoringSubCardProps {
  contractId: number;
  purchaseRequestId: number;
}

export default function ImplementationMonitoringSubCard({ contractId }: ImplementationMonitoringSubCardProps) {  const { language } = useLanguage();
  const isRTL = language === "ar";
  const t = translations[language as keyof typeof translations] || translations.en;
  const [activeTab, setActiveTab] = useState("checklist");

  // Fetch monitoring record
  const { data: monitoring, isLoading: monitoringLoading, refetch: refetchMonitoring } =
    trpc.procurementPhaseA.implementationMonitoring.getByContract.useQuery(
      { contractId },
      { enabled: contractId > 0 }
    );

  const {
          data: monitoringStatus
        } = trpc.procurementPhaseA.implementationMonitoring.getStatus.useQuery(
          { contractId },
          { enabled: contractId > 0 }
      );

  // Initialize monitoring if needed
  const initMut = trpc.procurementPhaseA.implementationMonitoring.initialize.useMutation({
    onSuccess: () => {
      refetchMonitoring();
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-initialize if no monitoring record exists
  if (!monitoringLoading && !monitoring && contractId > 0) {
    // Will be initialized on first render
  }

  if (monitoringLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!monitoring) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground mb-2">{t.title}</p>
          <p className="text-sm text-muted-foreground/70 mb-4">{t.description}</p>
          <Button
            onClick={() => initMut.mutate({ contractId })}
            disabled={initMut.isPending}
          >
            {initMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isRTL ? "بدء المتابعة" : "Initialize Monitoring"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card className="border-l-4 border-l-teal-500">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-teal-600" />
              <h3 className="text-lg font-semibold">{t.title}</h3>
            </div>
            <Badge
                className={
                  monitoring.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : monitoring.status === "in_progress"
                    ? "bg-blue-100 text-blue-700"
                    : monitoring.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
                }
              >
                {monitoring.status === "completed"
                  ? t.completed
                  : monitoring.status === "in_progress"
                  ? t.inProgress
                  : monitoring.status === "pending"
                  ? t.pending
                  : t.notStarted}
              </Badge>
          </div>
          {monitoringStatus && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{t.overallProgress}</span>
                  <span>{monitoringStatus.progress}%</span>
                </div>

                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${monitoringStatus.progress}%`
                    }}
                  />
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="checklist" className="text-xs">
            <FileCheck className="w-3.5 h-3.5 mr-1" />
            {t.checklist}
          </TabsTrigger>
          <TabsTrigger value="primary-handover" className="text-xs">
            {t.primaryHandover}
          </TabsTrigger>
          <TabsTrigger value="final-handover" className="text-xs">
            {t.finalHandover}
          </TabsTrigger>
          <TabsTrigger value="observations" className="text-xs">
            <Eye className="w-3.5 h-3.5 mr-1" />
            {t.observations}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist">
          <ChecklistSection monitoringId={monitoring.id} t={t} isRTL={isRTL} />
        </TabsContent>
        <TabsContent value="primary-handover">
          <HandoverSection monitoringId={monitoring.id} handoverType="primary" t={t} isRTL={isRTL} />
        </TabsContent>
        <TabsContent value="final-handover">
          <HandoverSection monitoringId={monitoring.id} handoverType="final" t={t} isRTL={isRTL} />
        </TabsContent>
        <TabsContent value="observations">
          <ObservationsSection monitoringId={monitoring.id} t={t} isRTL={isRTL} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// CHECKLIST SECTION
// ============================================================================
function ChecklistSection({ monitoringId, t, isRTL }: { monitoringId: number; t: any; isRTL: boolean }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    expectedDate: "",
    actualDate: "",
    completionStatus: "pending",
  });

  const { data: items, isLoading, refetch } = trpc.procurementPhaseA.implementationMonitoring.listChecklist.useQuery(
    { monitoringId },
    { enabled: monitoringId > 0 }
  );

  const createMut = trpc.procurementPhaseA.implementationMonitoring.addChecklistItem.useMutation({
    onSuccess: () => { toast.success(t.created); setShowDialog(false); resetForm(); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMut = trpc.procurementPhaseA.implementationMonitoring.deleteChecklistItem.useMutation({
    onSuccess: () => { toast.success(t.deleted); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: "", description: "", expectedDate: "", actualDate: "", completionStatus: "pending" });
  };

  const handleSave = () => {
      if (!form.title.trim()) {
        toast.error(
          isRTL
            ? "يرجى إدخال وصف العنصر"
            : "Checklist item description is required"
        );
        return;
      }

      createMut.mutate({
        monitoringId,
        itemDescription: form.title.trim(),
        orderIndex: 0
      });
    };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      expectedDate: item.expectedDate ? new Date(item.expectedDate).toISOString().split("T")[0] : "",
      actualDate: item.actualDate ? new Date(item.actualDate).toISOString().split("T")[0] : "",
      completionStatus: item.completionStatus || "pending",
    });
    setShowDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: t.pending, className: "bg-gray-100 text-gray-600" },
      in_progress: { label: t.inProgress, className: "bg-blue-100 text-blue-700" },
      completed: { label: t.completed, className: "bg-green-100 text-green-700" },
      delayed: { label: t.delayed, className: "bg-red-100 text-red-700" },
    };
    const c = config[status] || config.pending;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2" size="sm">
          <Plus className="w-4 h-4" />
          {t.addItem}
        </Button>
      </div>

      {!items || items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileCheck className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t.noItems}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.itemTitle}</TableHead>
                <TableHead>{t.expectedDate}</TableHead>
                <TableHead>{t.actualDate}</TableHead>
                <TableHead>{t.completionStatus}</TableHead>
                <TableHead className="text-center">{isRTL ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>{item.expectedDate ? new Date(item.expectedDate).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>{item.actualDate ? new Date(item.actualDate).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>{getStatusBadge(item.completionStatus)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteMut.mutate({ id: item.id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t.editItem : t.addItem}</DialogTitle>
            <DialogDescription>{isRTL ? "أدخل تفاصيل العنصر" : "Enter item details"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.itemTitle} *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>{t.itemDescription}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t.expectedDate}</Label>
                <Input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
              </div>
              <div>
                <Label>{t.actualDate}</Label>
                <Input type="date" value={form.actualDate} onChange={(e) => setForm({ ...form, actualDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{t.completionStatus}</Label>
              <Select value={form.completionStatus} onValueChange={(v) => setForm({ ...form, completionStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t.pending}</SelectItem>
                  <SelectItem value="in_progress">{t.inProgress}</SelectItem>
                  <SelectItem value="completed">{t.completed}</SelectItem>
                  <SelectItem value="delayed">{t.delayed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>{t.cancel}</Button>
            <Button onClick={handleSave} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// HANDOVER SECTION
// ============================================================================
function HandoverSection({ monitoringId, handoverType, t, isRTL }: { monitoringId: number; handoverType: "primary" | "final"; t: any; isRTL: boolean }) {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    handoverDate: "",
    deliveredBy: "",
    receivedBy: "",
    notes: "",
    status: "pending",
  });

  const queryType = handoverType === "primary" ? "listPrimaryHandovers" : "listFinalHandovers";
  const createType = handoverType === "primary" ? "addPrimaryHandover" : "addFinalHandover";

  const { data: handovers, isLoading, refetch } = (trpc.procurementPhaseA.implementationMonitoring as any)[queryType].useQuery(
    { monitoringId },
    { enabled: monitoringId > 0 }
  );

  const createMut = (trpc.procurementPhaseA.implementationMonitoring as any)[createType].useMutation({
    onSuccess: () => { toast.success(t.created); setShowDialog(false); resetForm(); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm({ handoverDate: "", deliveredBy: "", receivedBy: "", notes: "", status: "pending" });
  };

  const handleSave = () => {
    createMut.mutate({
      monitoringId,
      handoverDate: form.handoverDate ? new Date(form.handoverDate) : new Date(),
      deliveredBy: form.deliveredBy || undefined,
      receivedBy: form.receivedBy || undefined,
      notes: form.notes || undefined,
      status: form.status as any,
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: t.handoverPending, className: "bg-yellow-100 text-yellow-700" },
      completed: { label: t.handoverCompleted, className: "bg-green-100 text-green-700" },
      rejected: { label: t.handoverRejected, className: "bg-red-100 text-red-700" },
    };
    const c = config[status] || config.pending;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2" size="sm">
          <Plus className="w-4 h-4" />
          {t.addHandover}
        </Button>
      </div>

      {!handovers || handovers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileCheck className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t.noHandovers}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.handoverDate}</TableHead>
                <TableHead>{t.deliveredBy}</TableHead>
                <TableHead>{t.receivedBy}</TableHead>
                <TableHead>{t.handoverNotes}</TableHead>
                <TableHead>{t.handoverStatus}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {handovers.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell>{h.handoverDate ? new Date(h.handoverDate).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>{h.deliveredBy || "-"}</TableCell>
                  <TableCell>{h.receivedBy || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{h.notes || "-"}</TableCell>
                  <TableCell>{getStatusBadge(h.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.addHandover}</DialogTitle>
            <DialogDescription>{isRTL ? "أدخل تفاصيل التسليم" : "Enter handover details"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.handoverDate} *</Label>
              <Input type="date" value={form.handoverDate} onChange={(e) => setForm({ ...form, handoverDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t.deliveredBy}</Label>
                <Input value={form.deliveredBy} onChange={(e) => setForm({ ...form, deliveredBy: e.target.value })} />
              </div>
              <div>
                <Label>{t.receivedBy}</Label>
                <Input value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{t.handoverNotes}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>{t.handoverStatus}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t.handoverPending}</SelectItem>
                  <SelectItem value="completed">{t.handoverCompleted}</SelectItem>
                  <SelectItem value="rejected">{t.handoverRejected}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>{t.cancel}</Button>
            <Button onClick={handleSave} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// OBSERVATIONS SECTION
// ============================================================================
function ObservationsSection({ monitoringId, t, isRTL }: { monitoringId: number; t: any; isRTL: boolean }) {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    observationDate: "",
    observationType: "general",
    description: "",
    severity: "medium",
    actionRequired: "",
  });

  const { data: observations, isLoading, refetch } = trpc.procurementPhaseA.implementationMonitoring.listObservations.useQuery(
    { monitoringId },
    { enabled: monitoringId > 0 }
  );

  const createMut = trpc.procurementPhaseA.implementationMonitoring.addObservation.useMutation({
    onSuccess: () => { toast.success(t.created); setShowDialog(false); resetForm(); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm({ observationDate: "", observationType: "general", description: "", severity: "medium", actionRequired: "" });
  };

  const handleSave = () => {
    createMut.mutate({
      monitoringId,
      observationDate: form.observationDate ? new Date(form.observationDate) : new Date(),
      observationType: form.observationType as any,
      description: form.description,
      actionRequired: form.actionRequired || undefined,
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      site_visit: t.observationSite,
      quality_issue: t.observationQuality,
      safety_concern: t.observationSafety,
      general: t.observationGeneral,
    };
    return labels[type] || type;
  };

  const getSeverityBadge = (severity: string) => {
    const config: Record<string, { label: string; className: string }> = {
      low: { label: t.low, className: "bg-green-100 text-green-700" },
      medium: { label: t.medium, className: "bg-yellow-100 text-yellow-700" },
      high: { label: t.high, className: "bg-orange-100 text-orange-700" },
      critical: { label: t.critical, className: "bg-red-100 text-red-700" },
    };
    const c = config[severity] || config.medium;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2" size="sm">
          <Plus className="w-4 h-4" />
          {t.addObservation}
        </Button>
      </div>

      {!observations || observations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Eye className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t.noObservations}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.observationDate}</TableHead>
                <TableHead>{t.observationType}</TableHead>
                <TableHead>{t.observationDescription}</TableHead>
                <TableHead>{t.severity}</TableHead>
                <TableHead>{t.actionRequired}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {observations.map((obs: any) => (
                <TableRow key={obs.id}>
                  <TableCell>{obs.observationDate ? new Date(obs.observationDate).toLocaleDateString() : "-"}</TableCell>
                  <TableCell><Badge variant="outline">{getTypeLabel(obs.observationType)}</Badge></TableCell>
                  <TableCell className="max-w-[250px] truncate">{obs.description}</TableCell>
                  <TableCell>{getSeverityBadge(obs.severity)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{obs.actionRequired || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.addObservation}</DialogTitle>
            <DialogDescription>{isRTL ? "أدخل تفاصيل الملاحظة" : "Enter observation details"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.observationDate}</Label>
              <Input type="date" value={form.observationDate} onChange={(e) => setForm({ ...form, observationDate: e.target.value })} />
            </div>
            <div>
              <Label>{t.observationType}</Label>
              <Select value={form.observationType} onValueChange={(v) => setForm({ ...form, observationType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="site_visit">{t.observationSite}</SelectItem>
                  <SelectItem value="quality_issue">{t.observationQuality}</SelectItem>
                  <SelectItem value="safety_concern">{t.observationSafety}</SelectItem>
                  <SelectItem value="general">{t.observationGeneral}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.observationDescription} *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>{t.severity}</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t.low}</SelectItem>
                  <SelectItem value="medium">{t.medium}</SelectItem>
                  <SelectItem value="high">{t.high}</SelectItem>
                  <SelectItem value="critical">{t.critical}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.actionRequired}</Label>
              <Textarea value={form.actionRequired} onChange={(e) => setForm({ ...form, actionRequired: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>{t.cancel}</Button>
            <Button onClick={handleSave} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
