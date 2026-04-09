/**
 * Penalties Sub-Card - Contract Management
 * Manages delay, quality, and compliance penalties
 * CRUD with auto-calculation based on penalty type and parameters
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
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

const translations = {
  en: {
    title: "Penalties Management",
    description: "Manage delay, quality, and compliance penalties for this contract",
    addPenalty: "Add Penalty",
    editPenalty: "Edit Penalty",
    noPenalties: "No penalties have been added yet",
    penaltyType: "Penalty Type",
    delay: "Delay Penalty",
    quality: "Quality Penalty",
    compliance: "Compliance Penalty",
    other: "Other",
    description_: "Description",
    ratePerDay: "Rate per Day",
    maxPercentage: "Max % of Contract",
    daysDelayed: "Days Delayed",
    calculatedAmount: "Calculated Amount",
    status: "Status",
    pending: "Pending",
    applied: "Applied",
    waived: "Waived",
    applyPenalty: "Apply Penalty",
    waivePenalty: "Waive Penalty",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this penalty?",
    penaltyCreated: "Penalty added successfully",
    penaltyUpdated: "Penalty updated successfully",
    penaltyDeleted: "Penalty deleted successfully",
    penaltyApplied: "Penalty applied successfully",
    penaltyWaived: "Penalty waived successfully",
    totalPenalties: "Total Penalties",
    appliedAmount: "Applied Amount",
    pendingAmount: "Pending Amount",
    fixedAmount: "Fixed Amount",
  },
  ar: {
    title: "إدارة الغرامات",
    description: "إدارة غرامات التأخير والجودة والامتثال لهذا العقد",
    addPenalty: "إضافة غرامة",
    editPenalty: "تعديل الغرامة",
    noPenalties: "لم يتم إضافة غرامات بعد",
    penaltyType: "نوع الغرامة",
    delay: "غرامة تأخير",
    quality: "غرامة جودة",
    compliance: "غرامة امتثال",
    other: "أخرى",
    description_: "الوصف",
    ratePerDay: "المعدل اليومي",
    maxPercentage: "الحد الأقصى % من العقد",
    daysDelayed: "أيام التأخير",
    calculatedAmount: "المبلغ المحسوب",
    status: "الحالة",
    pending: "معلق",
    applied: "مطبق",
    waived: "تم التنازل",
    applyPenalty: "تطبيق الغرامة",
    waivePenalty: "التنازل عن الغرامة",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    confirmDelete: "هل أنت متأكد من حذف هذه الغرامة؟",
    penaltyCreated: "تمت إضافة الغرامة بنجاح",
    penaltyUpdated: "تم تحديث الغرامة بنجاح",
    penaltyDeleted: "تم حذف الغرامة بنجاح",
    penaltyApplied: "تم تطبيق الغرامة بنجاح",
    penaltyWaived: "تم التنازل عن الغرامة بنجاح",
    totalPenalties: "إجمالي الغرامات",
    appliedAmount: "المبلغ المطبق",
    pendingAmount: "المبلغ المعلق",
    fixedAmount: "مبلغ ثابت",
  },
};

interface PenaltiesSubCardProps {
  contractId: number;
  purchaseRequestId: number;
}

export default function PenaltiesSubCard({ contractId }: PenaltiesSubCardProps) {  const { language } = useLanguage();
  const isRTL = language === "ar";
  const t = translations[language as keyof typeof translations] || translations.en;

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    penaltyType: "delay" as string,
    description: "",
    ratePerDay: "",
    maxPercentage: "",
    daysDelayed: "",
    fixedAmount: "",
  });

  // Queries
  const { data: penalties, isLoading, refetch } = trpc.procurementPhaseA.contractPenalties.list.useQuery(
    { contractId },
    { enabled: contractId > 0 }
  );

  const utils = trpc.useUtils();

  // Mutations
  const createMut = trpc.procurementPhaseA.contractPenalties.create.useMutation({
    onSuccess: () => {
      toast.success(t.penaltyCreated);
      setShowDialog(false);
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.procurementPhaseA.contractPenalties.update.useMutation({
    onSuccess: () => {
      toast.success(t.penaltyUpdated);
      setShowDialog(false);
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMut = trpc.procurementPhaseA.contractPenalties.delete.useMutation({
    onSuccess: () => {
      toast.success(t.penaltyDeleted);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const applyMut = trpc.procurementPhaseA.contractPenalties.applyPenalty.useMutation({
    onSuccess: () => {
      toast.success(t.penaltyApplied);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const waiveMut = trpc.procurementPhaseA.contractPenalties.waive.useMutation({
    onSuccess: () => {
      toast.success(t.penaltyWaived);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      penaltyType: "delay",
      description: "",
      ratePerDay: "",
      maxPercentage: "",
      daysDelayed: "",
      fixedAmount: "",
    });
  };

  const handleSave = () => {
    const payload = {
      contractId,
      penaltyType: form.penaltyType as any,
      description: form.description || undefined,
      ratePerDay: form.ratePerDay || undefined,
      maxPercentage: form.maxPercentage || undefined,
      daysDelayed: form.daysDelayed ? parseInt(form.daysDelayed) : undefined,
      fixedAmount: form.fixedAmount || undefined,
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleEdit = (penalty: any) => {
    setEditingId(penalty.id);
    setForm({
      penaltyType: penalty.penaltyType,
      description: penalty.description || "",
      ratePerDay: penalty.ratePerDay || "",
      maxPercentage: penalty.maxPercentage || "",
      daysDelayed: penalty.daysDelayed?.toString() || "",
      fixedAmount: penalty.fixedAmount || "",
    });
    setShowDialog(true);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      delay: t.delay,
      quality: t.quality,
      compliance: t.compliance,
      other: t.other,
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: t.pending, className: "bg-yellow-100 text-yellow-700", icon: Clock },
      applied: { label: t.applied, className: "bg-red-100 text-red-700", icon: CheckCircle },
      waived: { label: t.waived, className: "bg-gray-100 text-gray-600", icon: XCircle },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge className={`gap-1 ${c.className}`}>
        <Icon className="w-3 h-3" />
        {c.label}
      </Badge>
    );
  };

  // Summary calculations
  const totalAmount = penalties?.reduce((sum: number, p: any) => sum + parseFloat(p.calculatedAmount || "0"), 0) || 0;
  const appliedAmount = penalties?.filter((p: any) => p.status === "applied").reduce((sum: number, p: any) => sum + parseFloat(p.calculatedAmount || "0"), 0) || 0;
  const pendingAmount = penalties?.filter((p: any) => p.status === "pending").reduce((sum: number, p: any) => sum + parseFloat(p.calculatedAmount || "0"), 0) || 0;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t.totalPenalties}</p>
            <p className="text-lg font-bold">${totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t.appliedAmount}</p>
            <p className="text-lg font-bold text-red-600">${appliedAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t.pendingAmount}</p>
            <p className="text-lg font-bold text-yellow-600">${pendingAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold">{t.title}</h3>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2" size="sm">
          <Plus className="w-4 h-4" />
          {t.addPenalty}
        </Button>
      </div>

      {/* Penalties Table */}
      {!penalties || penalties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">{t.noPenalties}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.penaltyType}</TableHead>
                <TableHead>{t.description_}</TableHead>
                <TableHead>{t.ratePerDay}</TableHead>
                <TableHead>{t.daysDelayed}</TableHead>
                <TableHead>{t.calculatedAmount}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="text-center">{isRTL ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {penalties.map((penalty: any) => (
                <TableRow key={penalty.id}>
                  <TableCell>
                    <Badge variant="outline">{getTypeLabel(penalty.penaltyType)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{penalty.description || "-"}</TableCell>
                  <TableCell>{penalty.ratePerDay ? `$${penalty.ratePerDay}` : "-"}</TableCell>
                  <TableCell>{penalty.daysDelayed || "-"}</TableCell>
                  <TableCell className="font-semibold">${parseFloat(penalty.calculatedAmount || "0").toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(penalty.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {penalty.status === "pending" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(penalty)} title={t.editPenalty}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => applyMut.mutate({ id: penalty.id })}
                            title={t.applyPenalty}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500"
                            onClick={() => waiveMut.mutate({ id: penalty.id, reason: "Waived by manager" })}
                            title={t.waivePenalty}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => {
                              if (confirm(t.confirmDelete)) {
                                deleteMut.mutate({ id: penalty.id });
                              }
                            }}
                            title={t.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { resetForm(); } setShowDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t.editPenalty : t.addPenalty}</DialogTitle>
            <DialogDescription>
              {isRTL ? "أدخل تفاصيل الغرامة" : "Enter penalty details"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.penaltyType} *</Label>
              <Select value={form.penaltyType} onValueChange={(v) => setForm({ ...form, penaltyType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="delay">{t.delay}</SelectItem>
                  <SelectItem value="quality">{t.quality}</SelectItem>
                  <SelectItem value="compliance">{t.compliance}</SelectItem>
                  <SelectItem value="other">{t.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.description_}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            {form.penaltyType === "delay" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t.ratePerDay}</Label>
                    <Input
                      type="number"
                      value={form.ratePerDay}
                      onChange={(e) => setForm({ ...form, ratePerDay: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>{t.daysDelayed}</Label>
                    <Input
                      type="number"
                      value={form.daysDelayed}
                      onChange={(e) => setForm({ ...form, daysDelayed: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label>{t.maxPercentage}</Label>
                  <Input
                    type="number"
                    value={form.maxPercentage}
                    onChange={(e) => setForm({ ...form, maxPercentage: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </>
            ) : (
              <div>
                <Label>{t.fixedAmount}</Label>
                <Input
                  type="number"
                  value={form.fixedAmount}
                  onChange={(e) => setForm({ ...form, fixedAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
