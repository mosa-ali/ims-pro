/**
 * Retention Sub-Card - Contract Management
 * Manages retention percentage, held amounts, and release conditions
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  ShieldCheck,
  Plus,
  Trash2,
  Edit,
  Loader2,
  CheckCircle,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

const translations = {
  en: {
    title: "Retention Money Management",
    description: "Configure retention terms and track held/released amounts",
    addTerm: "Add Retention Term",
    editTerm: "Edit Retention Term",
    noTerms: "No retention terms defined yet",
    milestoneLabel: "Milestone / Phase",
    retentionPercentage: "Retention %",
    retentionHeld: "Amount Held",
    retentionReleased: "Amount Released",
    releaseCondition: "Release Condition",
    releaseDate: "Release Date",
    status: "Status",
    held: "Held",
    partiallyReleased: "Partially Released",
    released: "Released",
    release: "Release",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this retention term?",
    created: "Retention term added",
    updated: "Retention term updated",
    deleted: "Retention term deleted",
    releasedSuccess: "Retention released successfully",
    totalHeld: "Total Held",
    totalReleased: "Total Released",
    balance: "Balance",
    releaseAmount: "Release Amount",
    releaseReason: "Release Reason",
  },
  ar: {
    title: "إدارة أموال الاحتجاز",
    description: "تكوين شروط الاحتجاز وتتبع المبالغ المحتجزة والمفرج عنها",
    addTerm: "إضافة شرط احتجاز",
    editTerm: "تعديل شرط الاحتجاز",
    noTerms: "لم يتم تحديد شروط احتجاز بعد",
    milestoneLabel: "المرحلة / الفترة",
    retentionPercentage: "نسبة الاحتجاز %",
    retentionHeld: "المبلغ المحتجز",
    retentionReleased: "المبلغ المفرج عنه",
    releaseCondition: "شرط الإفراج",
    releaseDate: "تاريخ الإفراج",
    status: "الحالة",
    held: "محتجز",
    partiallyReleased: "مفرج جزئياً",
    released: "مفرج عنه",
    release: "إفراج",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    confirmDelete: "هل أنت متأكد من حذف شرط الاحتجاز هذا؟",
    created: "تمت إضافة شرط الاحتجاز",
    updated: "تم تحديث شرط الاحتجاز",
    deleted: "تم حذف شرط الاحتجاز",
    releasedSuccess: "تم الإفراج عن الاحتجاز بنجاح",
    totalHeld: "إجمالي المحتجز",
    totalReleased: "إجمالي المفرج عنه",
    balance: "الرصيد",
    releaseAmount: "مبلغ الإفراج",
    releaseReason: "سبب الإفراج",
  },
};

interface RetentionSubCardProps {
  contractId: number;
  purchaseRequestId: number;
}

export default function RetentionSubCard({ contractId }: RetentionSubCardProps) {  const { language } = useLanguage();
  const isRTL = language === "ar";
  const t = translations[language as keyof typeof translations] || translations.en;

  const [showDialog, setShowDialog] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [releasingId, setReleasingId] = useState<number | null>(null);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [releaseReason, setReleaseReason] = useState("");
  const [form, setForm] = useState({
    milestoneLabel: "",
    retentionPercentage: "",
    retentionHeld: "",
    releaseCondition: "",
    releaseDate: "",
  });

  // Queries
  const { data: terms, isLoading, refetch } = trpc.procurementPhaseA.contractRetention.list.useQuery(
    { contractId },
    { enabled: contractId > 0 }
  );

  // Mutations
  const createMut = trpc.procurementPhaseA.contractRetention.create.useMutation({
    onSuccess: () => {
      toast.success(t.created);
      setShowDialog(false);
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.procurementPhaseA.contractRetention.update.useMutation({
    onSuccess: () => {
      toast.success(t.updated);
      setShowDialog(false);
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMut = trpc.procurementPhaseA.contractRetention.delete.useMutation({
    onSuccess: () => {
      toast.success(t.deleted);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const releaseMut = trpc.procurementPhaseA.contractRetention.release.useMutation({
    onSuccess: () => {
      toast.success(t.releasedSuccess);
      setShowReleaseDialog(false);
      setReleasingId(null);
      setReleaseAmount("");
      setReleaseReason("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      milestoneLabel: "",
      retentionPercentage: "",
      retentionHeld: "",
      releaseCondition: "",
      releaseDate: "",
    });
  };

  const handleSave = () => {
    const payload = {
      contractId,
      milestoneLabel: form.milestoneLabel || undefined,
      retentionPercentage: form.retentionPercentage,
      retentionHeld: form.retentionHeld || undefined,
      releaseCondition: form.releaseCondition || undefined,
      releaseDate: form.releaseDate ? new Date(form.releaseDate) : undefined,
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleEdit = (term: any) => {
    setEditingId(term.id);
    setForm({
      milestoneLabel: term.milestoneLabel || "",
      retentionPercentage: term.retentionPercentage || "",
      retentionHeld: term.retentionHeld || "",
      releaseCondition: term.releaseCondition || "",
      releaseDate: term.releaseDate ? new Date(term.releaseDate).toISOString().split("T")[0] : "",
    });
    setShowDialog(true);
  };

  const handleRelease = (term: any) => {
    setReleasingId(term.id);
    setReleaseAmount(String(parseFloat(term.retentionHeld || "0") - parseFloat(term.retentionReleased || "0")));
    setShowReleaseDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      held: { label: t.held, className: "bg-orange-100 text-orange-700", icon: Lock },
      partially_released: { label: t.partiallyReleased, className: "bg-blue-100 text-blue-700", icon: Unlock },
      released: { label: t.released, className: "bg-green-100 text-green-700", icon: CheckCircle },
    };
    const c = config[status] || config.held;
    const Icon = c.icon;
    return (
      <Badge className={`gap-1 ${c.className}`}>
        <Icon className="w-3 h-3" />
        {c.label}
      </Badge>
    );
  };

  // Summary
  const totalHeld = terms?.reduce((sum: number, t: any) => sum + parseFloat(t.retentionHeld || "0"), 0) || 0;
  const totalReleased = terms?.reduce((sum: number, t: any) => sum + parseFloat(t.retentionReleased || "0"), 0) || 0;
  const balance = totalHeld - totalReleased;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t.totalHeld}</p>
            <p className="text-lg font-bold text-purple-600">${totalHeld.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t.totalReleased}</p>
            <p className="text-lg font-bold text-green-600">${totalReleased.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t.balance}</p>
            <p className="text-lg font-bold">${balance.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold">{t.title}</h3>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2" size="sm">
          <Plus className="w-4 h-4" />
          {t.addTerm}
        </Button>
      </div>

      {/* Retention Table */}
      {!terms || terms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">{t.noTerms}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.milestoneLabel}</TableHead>
                <TableHead>{t.retentionPercentage}</TableHead>
                <TableHead>{t.retentionHeld}</TableHead>
                <TableHead>{t.retentionReleased}</TableHead>
                <TableHead>{t.releaseCondition}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="text-center">{isRTL ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.map((term: any) => (
                <TableRow key={term.id}>
                  <TableCell>{term.milestoneLabel || "-"}</TableCell>
                  <TableCell className="font-semibold">{term.retentionPercentage}%</TableCell>
                  <TableCell className="font-semibold text-purple-600">${parseFloat(term.retentionHeld || "0").toLocaleString()}</TableCell>
                  <TableCell className="text-green-600">${parseFloat(term.retentionReleased || "0").toLocaleString()}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{term.releaseCondition || "-"}</TableCell>
                  <TableCell>{getStatusBadge(term.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {term.status !== "released" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(term)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleRelease(term)}
                            title={t.release}
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => {
                              if (confirm(t.confirmDelete)) {
                                deleteMut.mutate({ id: term.id });
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
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t.editTerm : t.addTerm}</DialogTitle>
            <DialogDescription>
              {isRTL ? "أدخل تفاصيل شرط الاحتجاز" : "Enter retention term details"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.milestoneLabel}</Label>
              <Input
                value={form.milestoneLabel}
                onChange={(e) => setForm({ ...form, milestoneLabel: e.target.value })}
                placeholder={isRTL ? "مثال: المرحلة الأولى" : "e.g., Phase 1 Completion"}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t.retentionPercentage} *</Label>
                <Input
                  type="number"
                  value={form.retentionPercentage}
                  onChange={(e) => setForm({ ...form, retentionPercentage: e.target.value })}
                  placeholder="10"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Label>{t.retentionHeld}</Label>
                <Input
                  type="number"
                  value={form.retentionHeld}
                  onChange={(e) => setForm({ ...form, retentionHeld: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label>{t.releaseCondition}</Label>
              <Textarea
                value={form.releaseCondition}
                onChange={(e) => setForm({ ...form, releaseCondition: e.target.value })}
                rows={2}
                placeholder={isRTL ? "شرط الإفراج عن المبلغ المحتجز" : "Condition for releasing the retained amount"}
              />
            </div>
            <div>
              <Label>{t.releaseDate}</Label>
              <Input
                type="date"
                value={form.releaseDate}
                onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
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

      {/* Release Dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={(open) => { if (!open) { setReleasingId(null); setReleaseAmount(""); setReleaseReason(""); } setShowReleaseDialog(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.release}</DialogTitle>
            <DialogDescription>
              {isRTL ? "أدخل مبلغ وسبب الإفراج" : "Enter release amount and reason"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.releaseAmount} *</Label>
              <Input
                type="number"
                value={releaseAmount}
                onChange={(e) => setReleaseAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>{t.releaseReason}</Label>
              <Textarea
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                if (releasingId && releaseAmount) {
                  releaseMut.mutate({
                    id: releasingId,
                    releaseAmount,
                    reason: releaseReason || undefined,
                  });
                }
              }}
              disabled={releaseMut.isPending}
            >
              {releaseMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t.release}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
