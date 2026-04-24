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
import { useTranslation } from "@/i18n/useTranslation";

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
    penaltyPercentage: 'Penalty Percentage',
    actions: 'Actions',
    waivedByManager: 'Waived By Manager',
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
    penaltyPercentage: 'نسبة الغرامة',
    actions: 'الاجراءات',
    waivedByManager: 'تم التنازل عنه من قبل المدير',  
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
    penaltyType: "delay",
    description: "",
    ratePerDay: "",
    maxPercentage: "",
    daysDelayed: "",
    fixedAmount: "",
    penaltyPercentage: "",
    calculatedAmount: "",
    contractValue: ""
  });

  // Queries
    const {
      data: penalties,
      isLoading,
      refetch
    } = trpc.procurementPhaseA.contractPenalties.list.useQuery(
      { contractId },
      { enabled: contractId > 0 }
    );

    const {
      data: contract
    } = trpc.procurementPhaseA.contracts.getById.useQuery(
      { id: contractId },
      { enabled: contractId > 0 }
    );

    // Contract total value
    const contractValue = Number(
      contract?.contractValue || 0
    );

    const utils = trpc.useUtils();


    // Mutations
    const createMut =
      trpc.procurementPhaseA.contractPenalties.create.useMutation({
        onSuccess: () => {
          toast.success(t.penaltyCreated);
          setShowDialog(false);
          resetForm();
          refetch();
        },
        onError: (err) => toast.error(err.message),
      });

    const updateMut =
      trpc.procurementPhaseA.contractPenalties.update.useMutation({
        onSuccess: () => {
          toast.success(t.penaltyUpdated);
          setShowDialog(false);
          resetForm();
          refetch();
        },
        onError: (err) => toast.error(err.message),
      });

    const deleteMut =
      trpc.procurementPhaseA.contractPenalties.delete.useMutation({
        onSuccess: () => {
          toast.success(t.penaltyDeleted);
          refetch();
        },
        onError: (err) => toast.error(err.message),
      });

    const applyMut =
      trpc.procurementPhaseA.contractPenalties.applyPenalty.useMutation({
        onSuccess: () => {
          toast.success(t.penaltyApplied);
          refetch();
        },
        onError: (err) => toast.error(err.message),
      });

    const waiveMut =
      trpc.procurementPhaseA.contractPenalties.waive.useMutation({
        onSuccess: () => {
          toast.success(t.penaltyWaived);
          refetch();
        },
        onError: (err) => toast.error(err.message),
      });


    // Reset form
    const resetForm = () => {
      setEditingId(null);

      setForm({
        penaltyType: "delay",
        description: "",
        ratePerDay: "",
        maxPercentage: "",
        daysDelayed: "",
        fixedAmount: "",
        penaltyPercentage: "",
        calculatedAmount: "",
        contractValue: contractValue.toString()
      });
    };

    // Auto calculation helper
    const calculatePenaltyAmount = (
      percentage: string,
      amount: string
    ) => {
      const pct = Number(percentage || 0);
      const amt = Number(amount || 0);

      // Percentage-based calculation
      if (pct > 0) {
        const calculated =
          (contractValue * pct) / 100;

        if (calculated > contractValue) {
          toast.error(
            isRTL
              ? "قيمة الغرامة تتجاوز قيمة العقد"
              : "Penalty exceeds contract value"
          );
          return;
        }

        setForm((prev) => ({
          ...prev,
          fixedAmount: calculated.toFixed(2),
          calculatedAmount: calculated.toFixed(2),
        }));
      }

      // Manual amount validation
      if (amt > contractValue) {
        toast.error(
          isRTL
            ? "مبلغ الغرامة أكبر من قيمة العقد"
            : "Penalty amount cannot exceed contract value"
        );
      }
    };

  const handleSave = () => {
  // Description validation
    if (!form.description.trim()) {
      toast.error(
        isRTL
          ? "يرجى إدخال وصف الغرامة"
          : "Penalty description is required"
      );
      return;
    }

    let penaltyPercentage = "";

    if (form.penaltyType === "delay") {
      if (!form.ratePerDay || Number(form.ratePerDay) <= 0) {
        toast.error(
          isRTL
            ? "يرجى إدخال معدل يومي صحيح"
            : "Valid daily rate is required"
        );
        return;
      }

      penaltyPercentage = form.ratePerDay;
    } else {
      if (!form.fixedAmount || Number(form.fixedAmount) <= 0) {
        toast.error(
          isRTL
            ? "يرجى إدخال مبلغ صحيح"
            : "Valid fixed amount is required"
        );
        return;
      }

      /**
       * Backend expects percentage
       * For fixed penalties we map fixed amount
       * to percentage field temporarily.
       *
       * Better long-term fix:
       * backend should support fixedAmount separately.
       */
      penaltyPercentage = form.fixedAmount;
    }

    const payload = {
      contractId,
      penaltyType: form.penaltyType as
        | "delay"
        | "quality"
        | "compliance",

      // FIXED FIELD NAME
      penaltyDescription: form.description.trim(),

      // FIXED FIELD NAME
      penaltyPercentage,

      delayDaysThreshold:
        form.daysDelayed
          ? parseInt(form.daysDelayed)
          : 0,

      penaltyBase: "contract_value" as const,

      maxPenaltyLimitPct:
        form.maxPercentage || "10.00",

      remarks: undefined,
    };

    if (editingId) {
      updateMut.mutate({
        id: editingId,
        ...payload,
      });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleEdit = (penalty: any) => {
    setEditingId(penalty.id);
    setForm({
        penaltyType: penalty.penaltyType,
        description: penalty.penaltyDescription || "",

        ratePerDay:
          penalty.penaltyType === "delay"
            ? penalty.penaltyPercentage || ""
            : "",

        maxPercentage:
          penalty.maxPenaltyLimitPct || "",

        daysDelayed:
          penalty.delayDaysThreshold?.toString() || "",

        fixedAmount:
          penalty.penaltyType !== "delay"
            ? penalty.calculatedAmount || ""
            : "",

        penaltyPercentage:
          penalty.penaltyType !== "delay"
            ? penalty.penaltyPercentage || ""
            : "",

        calculatedAmount:
          penalty.calculatedAmount || "",

        contractValue:
          contractValue.toString()
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
    const totalAmount =
      penalties?.reduce(
        (sum: number, p: any) =>
          sum + Number(p.calculatedAmount || 0),
        0
      ) || 0;

    const appliedAmount =
      penalties
        ?.filter((p: any) => p.status === "applied")
        .reduce(
          (sum: number, p: any) =>
            sum + Number(p.calculatedAmount || 0),
          0
        ) || 0;

    const pendingAmount =
      penalties
        ?.filter((p: any) =>
          ["draft", "pending"].includes(p.status)
        )
        .reduce(
          (sum: number, p: any) =>
            sum + Number(p.calculatedAmount || 0),
          0
        ) || 0;

    if (isLoading) {
      return <Skeleton className="h-64 w-full" />;
    }

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">
                {t.totalPenalties}
              </p>
              <p className="text-lg font-bold">
                ${totalAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">
                {t.appliedAmount}
              </p>
              <p className="text-lg font-bold text-red-600">
                ${appliedAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">
                {t.pendingAmount}
              </p>
              <p className="text-lg font-bold text-yellow-600">
                ${pendingAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold">
              {t.title}
            </h3>
          </div>

          <Button
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
            className="gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            {t.addPenalty}
          </Button>
        </div>

        {/* Penalties Table */}
        {!penalties || penalties.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {t.noPenalties}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.penaltyType}</TableHead>
                  <TableHead>{t.description_}</TableHead>
                  <TableHead>{t.penaltyPercentage}</TableHead>
                  <TableHead>{t.daysDelayed}</TableHead>
                  <TableHead>{t.calculatedAmount}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead className="text-center">
                    {t.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {penalties.map((penalty: any) => (
                  <TableRow key={penalty.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {getTypeLabel(
                          penalty.penaltyType
                        )}
                      </Badge>
                    </TableCell>

                    <TableCell className="max-w-[200px] truncate">
                      {penalty.penaltyDescription || "-"}
                    </TableCell>

                    <TableCell>
                      {penalty.penaltyPercentage
                        ? `${penalty.penaltyPercentage}%`
                        : "-"}
                    </TableCell>

                    <TableCell>
                      {penalty.delayDaysThreshold || "-"}
                    </TableCell>

                    <TableCell className="font-semibold">
                      $
                      {Number(
                        penalty.calculatedAmount || 0
                      ).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(
                        penalty.status
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {penalty.status === "draft" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleEdit(penalty)
                              }
                              title={t.editPenalty}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() =>
                                applyMut.mutate({
                                  id: penalty.id
                                })
                              }
                              title={t.applyPenalty}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500"
                              onClick={() =>
                                waiveMut.mutate({
                                  id: penalty.id,
                                  remarks:
                                    t.waivedByManager
                                })
                              }
                              title={t.waivePenalty}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => {
                                if (
                                  confirm(
                                    t.confirmDelete
                                  )
                                ) {
                                  deleteMut.mutate({
                                    id: penalty.id
                                  });
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
<Dialog
  open={showDialog}
  onOpenChange={(open) => {
    if (!open) resetForm();
    setShowDialog(open);
  }}
>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>
        {editingId ? t.editPenalty : t.addPenalty}
      </DialogTitle>
      <DialogDescription>
        {t.description}
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Penalty Type */}
      <div>
        <Label>{t.penaltyType}</Label>
        <Select
          value={form.penaltyType}
          onValueChange={(value) =>
            setForm({
              ...form,
              penaltyType: value
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delay">
              {t.delay}
            </SelectItem>
            <SelectItem value="quality">
              {t.quality}
            </SelectItem>
            <SelectItem value="compliance">
              {t.compliance}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div>
        <Label>{t.description_}</Label>
        <Textarea
          value={form.description}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value
            })
          }
        />
      </div>

      {/* Delay Penalty */}
      {form.penaltyType === "delay" ? (
        <>
          <div>
            <Label>{t.ratePerDay}</Label>
            <Input
              type="number"
              value={form.ratePerDay}
              onChange={(e) =>
                setForm({
                  ...form,
                  ratePerDay: e.target.value
                })
              }
            />
          </div>

          <div>
            <Label>{t.daysDelayed}</Label>
            <Input
              type="number"
              value={form.daysDelayed}
              onChange={(e) =>
                setForm({
                  ...form,
                  daysDelayed: e.target.value
                })
              }
            />
          </div>

          <div>
            <Label>{t.maxPercentage}</Label>
            <Input
              type="number"
              value={form.maxPercentage}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxPercentage: e.target.value
                })
              }
            />
          </div>
        </>
      ) : (
        <>
          {/* Percentage input */}
          <div>
            <Label>{t.penaltyPercentage}</Label>
            <Input
              type="number"
              value={form.penaltyPercentage}
              onChange={(e) => {
                const value = e.target.value;

                setForm({
                  ...form,
                  penaltyPercentage: value
                });

                calculatePenaltyAmount(
                  value,
                  form.fixedAmount
                );
              }}
            />
          </div>

          {/* Fixed amount */}
          <div>
            <Label>{t.fixedAmount}</Label>
            <Input
              type="number"
              value={form.fixedAmount}
              onChange={(e) => {
                const value = e.target.value;

                setForm({
                  ...form,
                  fixedAmount: value
                });

                calculatePenaltyAmount(
                  form.penaltyPercentage,
                  value
                );
              }}
            />
          </div>

          {/* Auto calculated */}
          <div>
            <Label>{t.calculatedAmount}</Label>
            <Input
              value={form.calculatedAmount}
              readOnly
              disabled
            />
          </div>
        </>
      )}
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          resetForm();
          setShowDialog(false);
        }}
      >
        {t.cancel}
      </Button>

      <Button
        onClick={handleSave}
        disabled={
          createMut.isPending ||
          updateMut.isPending
        }
      >
        {(createMut.isPending ||
          updateMut.isPending) && (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        )}
        {t.save}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

</div>
);
}