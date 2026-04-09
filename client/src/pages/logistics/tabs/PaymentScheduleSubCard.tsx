/**
 * Payment Schedule Sub-Card - Contract Management
 * Manages advance, milestone, progress, and final payment schedule entries
 * Must total 100% of contract value
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  CalendarClock,
  Plus,
  Trash2,
  Edit,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

const translations = {
  en: {
    title: "Payment Schedule",
    description: "Define the payment schedule for this contract. Total must equal 100%.",
    addEntry: "Add Payment",
    editEntry: "Edit Payment",
    noEntries: "No payment schedule entries defined yet",
    paymentType: "Payment Type",
    advance: "Advance Payment",
    milestone: "Milestone Payment",
    progress: "Progress Payment",
    final: "Final Payment",
    description_: "Description",
    percentage: "Percentage (%)",
    amount: "Amount",
    dueDate: "Due Date",
    status: "Status",
    scheduled: "Scheduled",
    invoiced: "Invoiced",
    paid: "Paid",
    overdue: "Overdue",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this payment entry?",
    created: "Payment schedule entry added",
    updated: "Payment schedule entry updated",
    deleted: "Payment schedule entry deleted",
    totalPercentage: "Total Allocation",
    remaining: "Remaining",
    warning100: "Total allocation must equal 100%",
    orderIndex: "Order",
  },
  ar: {
    title: "جدول الدفعات",
    description: "تحديد جدول الدفعات لهذا العقد. يجب أن يساوي الإجمالي 100%.",
    addEntry: "إضافة دفعة",
    editEntry: "تعديل الدفعة",
    noEntries: "لم يتم تحديد جدول دفعات بعد",
    paymentType: "نوع الدفعة",
    advance: "دفعة مقدمة",
    milestone: "دفعة مرحلية",
    progress: "دفعة تقدمية",
    final: "دفعة نهائية",
    description_: "الوصف",
    percentage: "النسبة (%)",
    amount: "المبلغ",
    dueDate: "تاريخ الاستحقاق",
    status: "الحالة",
    scheduled: "مجدول",
    invoiced: "مفوتر",
    paid: "مدفوع",
    overdue: "متأخر",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    confirmDelete: "هل أنت متأكد من حذف هذه الدفعة؟",
    created: "تمت إضافة الدفعة بنجاح",
    updated: "تم تحديث الدفعة بنجاح",
    deleted: "تم حذف الدفعة بنجاح",
    totalPercentage: "إجمالي التخصيص",
    remaining: "المتبقي",
    warning100: "يجب أن يساوي إجمالي التخصيص 100%",
    orderIndex: "الترتيب",
  },
};

interface PaymentScheduleSubCardProps {
  contractId: number;
  purchaseRequestId: number;
}

export default function PaymentScheduleSubCard({ contractId }: PaymentScheduleSubCardProps) {  const { language } = useLanguage();
  const isRTL = language === "ar";
  const t = translations[language as keyof typeof translations] || translations.en;

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    paymentType: "milestone" as string,
    description: "",
    percentage: "",
    amount: "",
    dueDate: "",
    orderIndex: "0",
  });

  // Queries
  const { data: entries, isLoading, refetch } = trpc.procurementPhaseA.contractPaymentSchedule.list.useQuery(
    { contractId },
    { enabled: contractId > 0 }
  );

  // Mutations
  const createMut = trpc.procurementPhaseA.contractPaymentSchedule.create.useMutation({
    onSuccess: () => {
      toast.success(t.created);
      setShowDialog(false);
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.procurementPhaseA.contractPaymentSchedule.update.useMutation({
    onSuccess: () => {
      toast.success(t.updated);
      setShowDialog(false);
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMut = trpc.procurementPhaseA.contractPaymentSchedule.delete.useMutation({
    onSuccess: () => {
      toast.success(t.deleted);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      paymentType: "milestone",
      description: "",
      percentage: "",
      amount: "",
      dueDate: "",
      orderIndex: "0",
    });
  };

  const handleSave = () => {
    const payload = {
      contractId,
      paymentType: form.paymentType as any,
      description: form.description || undefined,
      percentage: form.percentage || undefined,
      amount: form.amount || undefined,
      dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
      orderIndex: parseInt(form.orderIndex) || 0,
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setForm({
      paymentType: entry.paymentType,
      description: entry.description || "",
      percentage: entry.percentage || "",
      amount: entry.amount || "",
      dueDate: entry.dueDate ? new Date(entry.dueDate).toISOString().split("T")[0] : "",
      orderIndex: entry.orderIndex?.toString() || "0",
    });
    setShowDialog(true);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      advance: t.advance,
      milestone: t.milestone,
      progress: t.progress,
      final: t.final,
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      scheduled: { label: t.scheduled, className: "bg-blue-100 text-blue-700" },
      invoiced: { label: t.invoiced, className: "bg-yellow-100 text-yellow-700" },
      paid: { label: t.paid, className: "bg-green-100 text-green-700" },
      overdue: { label: t.overdue, className: "bg-red-100 text-red-700" },
    };
    const c = config[status] || config.scheduled;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  // Calculate totals
  const totalPercentage = useMemo(() => {
    return entries?.reduce((sum: number, e: any) => sum + parseFloat(e.percentage || "0"), 0) || 0;
  }, [entries]);

  const totalAmount = useMemo(() => {
    return entries?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0) || 0;
  }, [entries]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Allocation Progress */}
      <Card className={`border-l-4 ${totalPercentage === 100 ? "border-l-green-500" : totalPercentage > 100 ? "border-l-red-500" : "border-l-blue-500"}`}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t.totalPercentage}</span>
            <span className={`text-lg font-bold ${totalPercentage === 100 ? "text-green-600" : totalPercentage > 100 ? "text-red-600" : "text-blue-600"}`}>
              {totalPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(totalPercentage, 100)} className="h-2" />
          {totalPercentage !== 100 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
              <AlertCircle className="w-3 h-3" />
              <span>{t.warning100} ({t.remaining}: {(100 - totalPercentage).toFixed(1)}%)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold">{t.title}</h3>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2" size="sm">
          <Plus className="w-4 h-4" />
          {t.addEntry}
        </Button>
      </div>

      {/* Schedule Table */}
      {!entries || entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarClock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">{t.noEntries}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{t.paymentType}</TableHead>
                <TableHead>{t.description_}</TableHead>
                <TableHead>{t.percentage}</TableHead>
                <TableHead>{t.amount}</TableHead>
                <TableHead>{t.dueDate}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="text-center">{isRTL ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry: any, idx: number) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTypeLabel(entry.paymentType)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                  <TableCell className="font-semibold">{entry.percentage}%</TableCell>
                  <TableCell className="font-semibold">${parseFloat(entry.amount || "0").toLocaleString()}</TableCell>
                  <TableCell>
                    {entry.dueDate ? new Date(entry.dueDate).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {entry.status === "scheduled" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => {
                              if (confirm(t.confirmDelete)) {
                                deleteMut.mutate({ id: entry.id });
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {/* Total row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3} className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableCell>
                <TableCell>{totalPercentage.toFixed(1)}%</TableCell>
                <TableCell>${totalAmount.toLocaleString()}</TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t.editEntry : t.addEntry}</DialogTitle>
            <DialogDescription>
              {isRTL ? "أدخل تفاصيل الدفعة" : "Enter payment schedule details"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.paymentType} *</Label>
              <Select value={form.paymentType} onValueChange={(v) => setForm({ ...form, paymentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="advance">{t.advance}</SelectItem>
                  <SelectItem value="milestone">{t.milestone}</SelectItem>
                  <SelectItem value="progress">{t.progress}</SelectItem>
                  <SelectItem value="final">{t.final}</SelectItem>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t.percentage} *</Label>
                <Input
                  type="number"
                  value={form.percentage}
                  onChange={(e) => setForm({ ...form, percentage: e.target.value })}
                  placeholder="25"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Label>{t.amount}</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label>{t.dueDate}</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
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
