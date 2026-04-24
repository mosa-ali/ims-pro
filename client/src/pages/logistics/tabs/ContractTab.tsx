/**
 * Contract Management Tab - Embedded in ProcurementWorkspace
 * Manages contracts for all services categories (Type 2 flow)
 * Features: Auto-populate vendor/value/currency from winner data,
 *           Auto-generate contract number (CON-[OU]-[Year]-[Seq]),
 *           Milestones, approval workflow
 * Bilingual EN/AR support
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Plus, Save, FileText, CheckCircle, XCircle, Clock,
  Loader2, Trash2, Send, Info, Lock, Pen, QrCode
} from "lucide-react";
import SignatureCapture from "@/components/SignatureCapture";

interface ContractTabProps {
  purchaseRequestId: number;
  prNumber?: string;
}

export default function ContractTab({ purchaseRequestId }: ContractTabProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // Fetch contract for this PR
  const { data: contract, isLoading: contractLoading, refetch: refetchContract } =
    trpc.procurementPhaseA.contracts.getByPR.useQuery(
      { purchaseRequestId },
      { enabled: purchaseRequestId > 0 }
    );

  // Fetch winner data for auto-populating contract fields
  const { data: winnerData, isLoading: winnerLoading } =
    trpc.procurementPhaseA.contracts.getWinnerData.useQuery(
      { purchaseRequestId },
      { enabled: purchaseRequestId > 0 && !contract }
    );

  // Fetch milestones if contract exists
  const { data: milestones, refetch: refetchMilestones } =
    trpc.procurementPhaseA.contracts.getMilestones.useQuery(
      { contractId: contract?.id || 0 },
      { enabled: !!contract?.id }
    );

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");

  // Create form state - only user-editable fields
  const [paymentStructure, setPaymentStructure] = useState<string>("lump_sum");
  const [retentionPercentage, setRetentionPercentage] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Milestone form state
  const [milestoneRows, setMilestoneRows] = useState<Array<{
    title: string; description: string; amount: string; dueDate: string;
  }>>([{ title: "", description: "", amount: "", dueDate: "" }]);

  // Mutations
  const createContract = trpc.procurementPhaseA.contracts.create.useMutation({
    onSuccess: (data) => {
      toast.success(
        `${t.procurement.contractCreated || "Contract created"}: ${data.contractNumber}`
      );
      setShowCreateDialog(false);
      refetchContract();
    },
    onError: (err) => toast.error(err.message),
  });

  const submitForApproval = trpc.procurementPhaseA.contracts.submitForApproval.useMutation({
    onSuccess: () => {
      toast.success(t.procurement.contractSubmitted || "Contract submitted for approval");
      refetchContract();
    },
    onError: (err) => toast.error(err.message),
  });

  const approveContract = trpc.procurementPhaseA.contracts.approve.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.status === "approved"
          ? (t.procurement.contractApprovedSuccess || "Contract approved")
          : (t.procurement.contractRejected || "Contract rejected")
      );
      setShowApprovalDialog(false);
      refetchContract();
    },
    onError: (err) => toast.error(err.message),
  });

  const addMilestonesMut = trpc.procurementPhaseA.contracts.addMilestones.useMutation({
    onSuccess: () => {
      toast.success(t.procurement.milestonesAdded || "Milestones saved");
      setShowMilestoneDialog(false);
      refetchMilestones();
    },
    onError: (err) => toast.error(err.message),
  });

  // Handlers
  const handleCreate = () => {
    if (!startDate || !endDate) {
      toast.error(isRTL ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields (start date, end date)");
      return;
    }
    if (!winnerData) {
      toast.error(isRTL ? "لا توجد بيانات فائز لهذا الطلب" : "No winner data available for this PR");
      return;
    }
    createContract.mutate({
      purchaseRequestId,
      paymentStructure: paymentStructure as any,
      retentionPercentage,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  };

  const handleSubmit = () => {
    if (!contract) return;
    submitForApproval.mutate({ id: contract.id });
  };

  const handleApproval = () => {
    if (!contract) return;
    approveContract.mutate({
      id: contract.id,
      approve: approvalAction === "approve",
    });
  };

  const handleSignatureApproval = (data: { signerName: string; signerTitle: string; signatureDataUrl: string }) => {
    if (!contract) return;
    approveContract.mutate({
      id: contract.id,
      approve: true,
      signatureDataUrl: data.signatureDataUrl,
      signerName: data.signerName,
      signerTitle: data.signerTitle,
    });
    setShowSignatureDialog(false);
  };

  const handleSaveMilestones = () => {
    if (!contract) return;
    const validRows = milestoneRows.filter(r => r.title.trim() && r.amount);
    if (validRows.length === 0) {
      toast.error("Add at least one milestone");
      return;
    }
    addMilestonesMut.mutate({
      contractId: contract.id,
      milestones: validRows.map((r, i) => ({
        title: r.title.trim(),
        description: r.description || undefined,
        amount: r.amount,
        currency: contract.currency || 'USD',
        dueDate: r.dueDate ? new Date(r.dueDate) : undefined,
        orderIndex: i,
      })),
    });
  };

  const addMilestoneRow = () => {
    setMilestoneRows([...milestoneRows, { title: "", description: "", amount: "", dueDate: "" }]);
  };

  const removeMilestoneRow = (index: number) => {
    setMilestoneRows(milestoneRows.filter((_, i) => i !== index));
  };

  const updateMilestoneRow = (index: number, field: string, value: string) => {
    const updated = [...milestoneRows];
    (updated[index] as any)[field] = value;
    setMilestoneRows(updated);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      pending_approval: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      active: "bg-blue-100 text-blue-700",
      completed: "bg-purple-100 text-purple-700",
      terminated: "bg-red-100 text-red-700",
    };
    return <Badge className={colors[status] || "bg-gray-100"}>{status.replace("_", " ")}</Badge>;
  };

  const getPathLabel = (path: string) => {
    switch (path) {
      case 'cba': return isRTL ? 'تحليل العطاءات المقارن' : 'Comparative Bid Analysis (CBA)';
      case 'qa': return isRTL ? 'تحليل عروض الأسعار' : 'Quotation Analysis (QA)';
      case 'rfq': return isRTL ? 'طلب عرض أسعار' : 'Request for Quotation (RFQ)';
      default: return path;
    }
  };

  // Loading state
  if (contractLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // No contract yet - show create prompt
  if (!contract) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">{t.procurement.contractNotCreated}</p>
            <p className="text-sm mb-6">{t.procurement.contractRequiresCbaAwarded}</p>

            {/* Show winner data preview if available */}
            {winnerLoading && (
              <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRTL ? 'جاري تحميل بيانات الفائز...' : 'Loading winner data...'}
              </div>
            )}
            {winnerData && (
              <div className="max-w-md mx-auto mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-start">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">
                    {isRTL ? 'بيانات الفائز جاهزة' : 'Winner Data Ready'}
                  </span>
                  <Badge variant="outline" className="text-xs">{getPathLabel(winnerData.path)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">{isRTL ? 'المورد:' : 'Vendor:'}</span>
                    <p className="font-medium">{winnerData.vendorName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{isRTL ? 'القيمة:' : 'Value:'}</span>
                    <p className="font-medium">{winnerData.currency} {Number(winnerData.quotedAmount).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
            {!winnerLoading && !winnerData && (
              <div className="max-w-md mx-auto mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-start">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">
                    {isRTL ? 'لا توجد بيانات فائز' : 'No Winner Data Available'}
                  </span>
                </div>
                <p className="text-xs text-amber-600">
                  {isRTL
                    ? 'يجب إكمال عملية التقييم (CBA/QA/RFQ) واختيار الفائز قبل إنشاء العقد'
                    : 'Complete the evaluation process (CBA/QA/RFQ) and select a winner before creating a contract'}
                </p>
              </div>
            )}

            <Button
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
              disabled={!winnerData}
            >
              <Plus className="w-4 h-4" />
              {t.procurement.createContract}
            </Button>
          </div>

          {/* Create Contract Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t.procurement.createContract}</DialogTitle>
                <DialogDescription>
                  {isRTL
                    ? 'سيتم ملء بيانات المورد والقيمة ورقم العقد تلقائياً'
                    : 'Vendor, value, and contract number are auto-populated from the evaluation process'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">

                {/* Auto-populated fields (read-only) */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                      {isRTL ? 'حقول تلقائية (للقراءة فقط)' : 'Auto-populated fields (read-only)'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-blue-700">{isRTL ? 'رقم العقد' : 'Contract Number'}</Label>
                    <div className="flex items-center gap-2 p-2 bg-white/70 rounded border border-blue-100">
                      <Lock className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-mono text-gray-700">
                        {isRTL ? 'سيتم إنشاؤه تلقائياً (CON-[OU]-[السنة]-[رقم])' : 'Auto-generated (CON-[OU]-[Year]-[Seq])'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-blue-700">{t.procurement.selectVendor}</Label>
                    <div className="flex items-center gap-2 p-2 bg-white/70 rounded border border-blue-100">
                      <Lock className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-medium">{winnerData?.vendorName || '-'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-blue-700">{t.procurement.contractValue}</Label>
                      <div className="flex items-center gap-2 p-2 bg-white/70 rounded border border-blue-100">
                        <Lock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm font-bold">
                          {winnerData ? Number(winnerData.quotedAmount).toLocaleString() : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-blue-700">{t.procurement.currency}</Label>
                      <div className="flex items-center gap-2 p-2 bg-white/70 rounded border border-blue-100">
                        <Lock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm font-medium">{winnerData?.currency || 'USD'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-blue-700">{isRTL ? 'مسار التقييم' : 'Evaluation Path'}</Label>
                    <div className="flex items-center gap-2 p-2 bg-white/70 rounded border border-blue-100">
                      <Info className="w-3 h-3 text-blue-500" />
                      <span className="text-sm">{winnerData ? getPathLabel(winnerData.path) : '-'}</span>
                    </div>
                  </div>
                </div>

                {/* User-editable fields */}
                <div className="space-y-2">
                  <Label>{t.procurement.paymentStructure} *</Label>
                  <Select value={paymentStructure} onValueChange={setPaymentStructure}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lump_sum">{t.procurement.lumpSum}</SelectItem>
                      <SelectItem value="percentage_based">{t.procurement.percentageBased}</SelectItem>
                      <SelectItem value="fixed_amount">{t.procurement.fixedAmount}</SelectItem>
                      <SelectItem value="deliverable_based">{t.procurement.deliverableBased}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.procurement.retentionPercentage}</Label>
                  <Input type="number" step="0.01" min="0" max="100" value={retentionPercentage} onChange={(e) => setRetentionPercentage(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.procurement.startDate} *</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.procurement.endDate} *</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t.procurement.cancel}</Button>
                <Button onClick={handleCreate} disabled={createContract.isPending || !winnerData} className="gap-2">
                  {createContract.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t.procurement.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Contract exists - show details (guard against undefined)
  if (!contract) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }
  const milestoneTotal = (milestones || []).reduce((sum: number, m: any) => sum + parseFloat(m.amount || "0"), 0);
  const contractVal = parseFloat(contract.contractValue || "0");
  const milestoneProgress = contractVal > 0 ? (milestoneTotal / contractVal) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Contract Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t.procurement.contractDetails}</CardTitle>
              <CardDescription>{contract.contractNumber}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(contract.status)}
              {contract.status === "draft" && (
                <Button size="sm" onClick={handleSubmit} disabled={submitForApproval.isPending} className="gap-1">
                  {submitForApproval.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {t.procurement.submitForApproval}
                </Button>
              )}
              {contract.status === "pending_approval" && (
                <>
                  <Button size="sm" variant="default" className="gap-1 bg-green-600 hover:bg-green-700"
                    onClick={() => setShowSignatureDialog(true)}>
                    <Pen className="w-3 h-3" /> {isRTL ? 'توقيع واعتماد' : 'Sign & Approve'}
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1"
                    onClick={() => { setApprovalAction("reject"); setShowApprovalDialog(true); }}>
                    <XCircle className="w-3 h-3" /> {t.procurement.reject}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Row 1: Contract Number, Vendor, Contract Value */}
            <div>
              <p className="text-xs text-gray-500 mb-1">{isRTL ? 'رقم العقد' : 'Contract Number'}</p>
              <p className="text-sm font-medium">{contract.contractNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.procurement.contractVendor}</p>
              <p className="text-sm font-medium">{contract.vendorName || `Vendor #${contract.vendorId}`}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.procurement.contractValue}</p>
              <p className="text-lg font-bold">{contract.currency} {Number(contract.contractValue || 0).toLocaleString()}</p>
            </div>

            {/* Row 2: Payment Structure, Retention %, Start Date */}
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.procurement.paymentStructure}</p>
              <p className="text-sm font-medium capitalize">{contract.paymentStructure?.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.procurement.retentionPercentage}</p>
              <p className="text-sm font-medium">{contract.retentionPercentage || "0"}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.procurement.startDate}</p>
              <p className="text-sm font-medium">{contract.startDate ? new Date(contract.startDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : "-"}</p>
            </div>

            {/* Row 3: End Date, Project, Donor */}
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.procurement.endDate}</p>
              <p className="text-sm font-medium">{contract.endDate ? new Date(contract.endDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{isRTL ? 'المشروع' : 'Project'}</p>
              <p className="text-sm font-medium">{contract.projectTitle || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{isRTL ? 'الجهة المانحة' : 'Donor'}</p>
              <p className="text-sm font-medium">{contract.donorName || "-"}</p>
            </div>

            {/* Row 4: Budget Line */}
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-gray-500 mb-1">{isRTL ? 'بند الميزانية' : 'Budget Line'}</p>
              <p className="text-sm font-medium">
                {contract.budgetTitle || contract.budgetCode || "-"}
                {contract.subBudgetLine ? ` — ${contract.subBudgetLine}` : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Digital Signature Display - shown when contract is approved */}
      {contract.status === 'approved' && (contract as any).signatureImageUrl && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pen className="w-4 h-4 text-green-600" />
              {isRTL ? 'التوقيع الرقمي' : 'Digital Signature'}
              <Badge className="bg-green-100 text-green-700 ms-2">
                <CheckCircle className="w-3 h-3 me-1" /> {isRTL ? 'موقّع' : 'Signed'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 border">
                <img
                  src={(contract as any).signatureImageUrl}
                  alt="Digital Signature"
                  className="max-h-24 mx-auto"
                />
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'اسم الموقّع' : 'Signer Name'}</p>
                  <p className="text-sm font-medium">{(contract as any).signatureSignerName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'المسمى الوظيفي' : 'Title / Role'}</p>
                  <p className="text-sm font-medium">{(contract as any).signatureSignerTitle || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'تاريخ التوقيع' : 'Signed At'}</p>
                  <p className="text-sm font-medium">
                    {(contract as any).signatureTimestamp
                      ? new Date((contract as any).signatureTimestamp).toLocaleString()
                      : '-'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'رمز التحقق' : 'Verification Code'}</p>
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {(contract as any).signatureVerificationCode || '-'}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t.procurement.milestones}</CardTitle>
              <CardDescription>{t.procurement.milestonesDesc}</CardDescription>
            </div>
            {(contract.status === "draft" || contract.status === "approved" || contract.status === "active") && (
              <Button size="sm" variant="outline" onClick={() => setShowMilestoneDialog(true)} className="gap-1">
                <Plus className="w-3 h-3" /> {t.procurement.addMilestone}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Milestone progress */}
          {(milestones || []).length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t.procurement.milestoneTotal}: {contract.currency} {milestoneTotal.toLocaleString()}</span>
                <span>{milestoneProgress.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(milestoneProgress, 100)} className="h-2" />
            </div>
          )}

          {/* Milestone list */}
          {!milestones || milestones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">{t.procurement.noMilestones}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {milestones.map((m: any, idx: number) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-6">#{idx + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{m.title}</p>
                      {m.description && <p className="text-xs text-gray-500">{m.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">{contract.currency} {Number(m.amount || 0).toLocaleString()}</span>
                    {m.dueDate && <span className="text-xs text-gray-500">{new Date(m.dueDate).toLocaleDateString()}</span>}
                    <Badge className={m.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                      {m.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? t.procurement.approveContract : t.procurement.rejectContract}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve" ? t.procurement.approveContractDesc : t.procurement.rejectContractDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>{t.procurement.cancel}</Button>
            <Button
              onClick={handleApproval}
              disabled={approveContract.isPending}
              className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={approvalAction === "reject" ? "destructive" : "default"}
            >
              {approveContract.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {approvalAction === "approve" ? t.procurement.confirmApprove : t.procurement.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={showMilestoneDialog} onOpenChange={setShowMilestoneDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.procurement.milestones}</DialogTitle>
            <DialogDescription>{t.procurement.milestonesDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {milestoneRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                <div className="col-span-4 space-y-1">
                  <Label className="text-xs">{t.procurement.milestoneTitle} *</Label>
                  <Input value={row.title} onChange={(e) => updateMilestoneRow(idx, "title", e.target.value)} placeholder="Milestone title" />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">{t.procurement.milestoneAmount} *</Label>
                  <Input type="number" step="0.01" value={row.amount} onChange={(e) => updateMilestoneRow(idx, "amount", e.target.value)} />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">{t.procurement.milestoneDueDate}</Label>
                  <Input type="date" value={row.dueDate} onChange={(e) => updateMilestoneRow(idx, "dueDate", e.target.value)} />
                </div>
                <div className="col-span-2 flex justify-end">
                  {milestoneRows.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeMilestoneRow(idx)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addMilestoneRow} className="gap-1 w-full">
              <Plus className="w-3 h-3" /> {t.procurement.addMilestone}
            </Button>
            {/* Total */}
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">{t.procurement.milestoneTotal}</span>
              <span className="text-sm font-bold">
                {contract.currency} {milestoneRows.reduce((s, r) => s + parseFloat(r.amount || "0"), 0).toLocaleString()}
                {" / "}{contract.currency} {contractVal.toLocaleString()}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMilestoneDialog(false)}>{t.procurement.cancel}</Button>
            <Button onClick={handleSaveMilestones} disabled={addMilestonesMut.isPending} className="gap-2">
              {addMilestonesMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t.procurement.saveMilestones}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digital Signature Dialog */}
      <SignatureCapture
        open={showSignatureDialog}
        onClose={() => setShowSignatureDialog(false)}
        onSave={handleSignatureApproval}
        defaultName=""
        defaultTitle=""
        isRTL={isRTL}
        saving={approveContract.isPending}
        labels={{
          title: isRTL ? 'التوقيع الرقمي - اعتماد العقد' : 'Digital Signature - Contract Approval',
          description: isRTL ? 'ارسم توقيعك لاعتماد هذا العقد. سيتم إنشاء رمز تحقق QR تلقائياً.' : 'Draw your signature to approve this contract. A QR verification code will be generated automatically.',
          nameLabel: isRTL ? 'اسم الموقّع' : 'Signer Name',
          titleLabel: isRTL ? 'المسمى الوظيفي' : 'Title / Role',
          namePlaceholder: isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name',
          titlePlaceholder: isRTL ? 'مدير المشروع' : 'Project Manager',
          drawSignature: isRTL ? 'ارسم توقيعك أدناه' : 'Draw your signature below',
          clearSignature: isRTL ? 'مسح' : 'Clear',
          saveSignature: isRTL ? 'توقيع واعتماد العقد' : 'Sign & Approve Contract',
          cancel: isRTL ? 'إلغاء' : 'Cancel',
          signatureRequired: isRTL ? 'يرجى رسم التوقيع' : 'Please draw your signature',
          nameRequired: isRTL ? 'يرجى إدخال الاسم' : 'Please enter your name',
        }}
      />
    </div>
  );
}
