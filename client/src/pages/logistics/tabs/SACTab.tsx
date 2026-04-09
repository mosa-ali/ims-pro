/**
 * SAC (Service Acceptance Certificate) Tab - Embedded in ProcurementWorkspace
 * Manages SACs for consultancy contracts (Type 2 flow)
 * Features: Create SAC, link to milestones, inline signing (in SACForm)
 * Bilingual EN/AR support
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Plus, CheckCircle, Clock, Loader2, Trash2, FileCheck, ExternalLink
} from "lucide-react";

interface SACTabProps {
  purchaseRequestId: number;
  prNumber?: string;
}

export default function SACTab({ purchaseRequestId }: SACTabProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // Fetch contract for this PR (SAC requires an approved contract)
  const { data: contract } = trpc.procurementPhaseA.contracts.getByPR.useQuery(
    { purchaseRequestId },
    { enabled: purchaseRequestId > 0 }
  );

  // Fetch SACs for this PR
  const { data: sacs, isLoading: sacsLoading, refetch: refetchSacs } =
    trpc.procurementPhaseA.sac.listByPR.useQuery(
      { purchaseRequestId },
      { enabled: purchaseRequestId > 0 }
    );

  // Fetch SAC summary (requires contractId)
  const { data: summary, refetch: refetchSummary } =
    trpc.procurementPhaseA.sac.summary.useQuery(
      { contractId: contract?.id || 0 },
      { enabled: !!contract?.id }
    );

  // Fetch milestones for linking
  const { data: milestones } = trpc.procurementPhaseA.contracts.getMilestones.useQuery(
    { contractId: contract?.id || 0 },
    { enabled: !!contract?.id }
  );

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create form state
  const [sacNumber, setSacNumber] = useState("");
  const [sacAmount, setSacAmount] = useState("");
  const [sacDate, setSacDate] = useState("");
  const [sacDeliverables, setSacDeliverables] = useState("");
  const [linkedMilestoneId, setLinkedMilestoneId] = useState("");

  // Mutations
  const createSac = trpc.procurementPhaseA.sac.create.useMutation({
    onSuccess: () => {
      toast.success(t.procurement.sacCreated || "SAC created");
      setShowCreateDialog(false);
      resetCreateForm();
      refetchSacs();
      refetchSummary();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSac = trpc.procurementPhaseA.sac.delete.useMutation({
    onSuccess: () => {
      toast.success(t.procurement.sacDeleted || "SAC deleted");
      refetchSacs();
      refetchSummary();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetCreateForm = () => {
    setSacNumber("");
    setSacAmount("");
    setSacDate("");
    setSacDeliverables("");
    setLinkedMilestoneId("");
  };

  const handleCreate = () => {
    if (!sacDeliverables.trim() || !sacAmount || !sacDate) {
      toast.error("Please fill all required fields");
      return;
    }
    createSac.mutate({
      contractId: contract?.id || 0,
      deliverables: sacDeliverables.trim(),
      approvedAmount: sacAmount,
      currency: contract?.currency || "USD",
      acceptanceDate: new Date(sacDate),
      milestoneId: linkedMilestoneId && linkedMilestoneId !== "none" ? parseInt(linkedMilestoneId, 10) : undefined,
    });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      draft: isRTL ? "مسودة" : "Draft",
      approved: isRTL ? "موقّع" : "Signed",
      rejected: isRTL ? "مرفوض" : "Rejected",
    };
    return <Badge className={colors[status] || "bg-gray-100"}>{labels[status] || status}</Badge>;
  };

  // Loading state
  if (sacsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Contract not approved - block SAC creation
  const contractApproved = contract && (contract.status === "approved" || contract.status === "active");
  const contractCurrency = contract?.currency || "USD";
  const contractVal = parseFloat(contract?.contractValue || "0");
  const totalApproved = parseFloat(String(summary?.totalApproved || "0"));
  const effectiveApproved = summary?.effectiveApproved ?? totalApproved;
  const hasPartialCompletion = effectiveApproved !== totalApproved;
  const coveragePercent = contractVal > 0 ? (effectiveApproved / contractVal) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t.procurement.sacTitle}</CardTitle>
              <CardDescription>
                {summary?.count || 0} {t.procurement.sacRecords}
              </CardDescription>
            </div>
            {contractApproved && (
              <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1">
                <Plus className="w-4 h-4" /> {t.procurement.createSac}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Coverage progress */}
          {contractVal > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>
                  {t.procurement.sacProgress}: {contractCurrency} {effectiveApproved.toLocaleString()} / {contractCurrency} {contractVal.toLocaleString()}
                  {hasPartialCompletion && (
                    <span className="text-amber-600 ml-1">
                      ({isRTL ? 'المبلغ الكامل' : 'Full amount'}: {contractCurrency} {totalApproved.toLocaleString()})
                    </span>
                  )}
                </span>
                <span>{coveragePercent.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(coveragePercent, 100)} className="h-2" />
              {hasPartialCompletion && (
                <p className="text-xs text-amber-600 mt-1">
                  {isRTL ? 'تم خصم نسبة الإنجاز الجزئي من التكلفة الإجمالية' : 'Partial completion percentage deducted from total cost'}
                </p>
              )}
            </div>
          )}

          {!contractApproved && (
            <div className="text-center py-8 text-yellow-600 bg-yellow-50 rounded-lg">
              <Clock className="w-10 h-10 mx-auto mb-3 text-yellow-400" />
              <p className="text-sm font-medium">{t.procurement.contractNotApproved || t.procurement.sacRequiresContract}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SAC List */}
      {(sacs || []).length === 0 && contractApproved ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium mb-2">{t.procurement.noSacs}</p>
              <p className="text-xs text-gray-400">{t.procurement.createFirstSac}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(sacs || []).map((sac: any) => (
            <Card key={sac.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <FileCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{sac.sacNumber || `SAC #${sac.id}`}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(sac.acceptanceDate).toLocaleDateString()}
                        {sac.deliverables && ` — ${sac.deliverables.substring(0, 60)}${sac.deliverables.length > 60 ? "..." : ""}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{contractCurrency} {Number(sac.approvedAmount || 0).toLocaleString()}</span>
                    {statusBadge(sac.status)}
                    <div className="flex gap-1">
                      {sac.status === "draft" && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
                            onClick={() => window.location.href = `/organization/logistics/procurement-workspace/sac-form/${sac.id}?prId=${purchaseRequestId}`}>
                            <ExternalLink className="w-3 h-3" /> {isRTL ? "تعديل وتوقيع" : "Edit & Sign"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500"
                            onClick={() => { if (confirm(t.procurement.confirmDeleteSac)) deleteSac.mutate({ id: sac.id }); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {sac.status === "approved" && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create SAC Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.procurement.createSac}</DialogTitle>
            <DialogDescription>{t.procurement.createSacDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.procurement.deliverables} *</Label>
              <Textarea value={sacDeliverables} onChange={(e) => setSacDeliverables(e.target.value)}
                placeholder={t.procurement.deliverablesPlaceholder} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.procurement.sacAmount} *</Label>
                <Input type="number" step="0.01" value={sacAmount} onChange={(e) => setSacAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.procurement.acceptanceDate} *</Label>
                <Input type="date" value={sacDate} onChange={(e) => setSacDate(e.target.value)} />
              </div>
            </div>
            {(milestones || []).length > 0 && (
              <div className="space-y-2">
                <Label>{t.procurement.linkedMilestone}</Label>
                <Select value={linkedMilestoneId} onValueChange={setLinkedMilestoneId}>
                  <SelectTrigger><SelectValue placeholder={t.procurement.selectMilestone} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.procurement.noMilestone}</SelectItem>
                    {(milestones || []).map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.title} — {contractCurrency} {Number(m.amount || 0).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t.procurement.cancel}</Button>
            <Button onClick={handleCreate} disabled={createSac.isPending} className="gap-2">
              {createSac.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.procurement.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
