/**
 * Service Acceptance Certificate (SAC) Management Page - Type 2 Consultancy
 * Handles: List, Create (navigate to form), View, Edit, Delete, Print
 * Flow: Contract Approved → Create SAC(s) → Sign (in form) → Invoice
 *
 * Uses inline translations pattern per IMSInlineTranslationsGuideline.md
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  FileCheck,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Pencil,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";

// ============================================================================
// BILINGUAL TRANSLATIONS
// ============================================================================
const translations = {
  en: {
    // Page
    pageTitle: "Service Acceptance Certificates",
    back: "Back",
    contractRequired: "Contract Required",
    noContractForSac: "No contract found for this PR. Please create a contract first.",
    contractNotApproved: "The contract must be approved before creating SACs.",
    monitoringRequired: "Implementation Monitoring Required",
    monitoringRequiredDesc: "Works PRs require implementation monitoring to be set up before SAC can be created. Please configure Implementation Monitoring in the Contract Management section first.",
    monitoringIncomplete: "Implementation Monitoring Incomplete",
    monitoringIncompleteDesc: "Works PRs require implementation monitoring to be completed before SAC can be created.",
    monitoringStatus: "Monitoring Status",
    goToContractManagement: "Go to Contract Management",

    // Summary
    contractValue: "Contract Value",
    totalAllocated: "Total Allocated",
    totalApproved: "Total Approved",
    remaining: "Remaining",
    sacCoverage: "SAC Coverage",
    budgetLine: "Budget Line",
    totalBudgetLine: "Total Budget Line",

    // SAC List
    sacList: "SAC List",
    certificates: "certificates",
    approved: "approved",
    noSacs: "No SACs created yet",
    createFirstSac: "Create a Service Acceptance Certificate for completed deliverables",

    // Table Headers
    sacNumber: "SAC Number",
    deliverables: "Deliverables",
    amount: "Amount",
    acceptanceDate: "Acceptance Date",
    status: "Status",
    actions: "Actions",

    // Status Labels
    statusDraft: "Draft",
    statusSigned: "Signed",
    statusApproved: "Approved",
    statusRejected: "Rejected",

    // Actions
    createSac: "Create SAC",
    view: "View",
    edit: "Edit",
    print: "Print PDF",
    delete: "Delete",

    // Messages
    sacDeleted: "SAC deleted",
    confirmDeleteSac: "Are you sure you want to delete this SAC?",
  },
  ar: {
    // Page
    pageTitle: "شهادات قبول الخدمة",
    back: "رجوع",
    contractRequired: "العقد مطلوب",
    noContractForSac: "لا يوجد عقد لطلب الشراء هذا. يرجى إنشاء عقد أولاً.",
    contractNotApproved: "يجب الموافقة على العقد قبل إنشاء شهادات قبول الخدمة.",
    monitoringRequired: "متابعة التنفيذ مطلوبة",
    monitoringRequiredDesc: "طلبات الأعمال تتطلب إعداد متابعة التنفيذ قبل إنشاء شهادة القبول. يرجى تكوين متابعة التنفيذ في قسم إدارة العقد أولاً.",
    monitoringIncomplete: "متابعة التنفيذ غير مكتملة",
    monitoringIncompleteDesc: "طلبات الأعمال تتطلب إكمال متابعة التنفيذ قبل إنشاء شهادة القبول.",
    monitoringStatus: "حالة المتابعة",
    goToContractManagement: "الذهاب إلى إدارة العقد",

    // Summary
    contractValue: "قيمة العقد",
    totalAllocated: "إجمالي المخصص",
    totalApproved: "إجمالي المعتمد",
    remaining: "المتبقي",
    sacCoverage: "تغطية شهادات القبول",
    budgetLine: "بند الميزانية",
    totalBudgetLine: "إجمالي بند الميزانية",

    // SAC List
    sacList: "قائمة شهادات القبول",
    certificates: "شهادات",
    approved: "معتمدة",
    noSacs: "لم يتم إنشاء شهادات قبول بعد",
    createFirstSac: "أنشئ شهادة قبول خدمة للمخرجات المكتملة",

    // Table Headers
    sacNumber: "رقم الشهادة",
    deliverables: "المخرجات",
    amount: "المبلغ",
    acceptanceDate: "تاريخ القبول",
    status: "الحالة",
    actions: "الإجراءات",

    // Status Labels
    statusDraft: "مسودة",
    statusSigned: "موقّع",
    statusApproved: "معتمد",
    statusRejected: "مرفوض",

    // Actions
    createSac: "إنشاء شهادة قبول",
    view: "عرض",
    edit: "تعديل",
    print: "طباعة PDF",
    delete: "حذف",

    // Messages
    sacDeleted: "تم حذف شهادة القبول",
    confirmDeleteSac: "هل أنت متأكد من حذف شهادة القبول هذه؟",
  },
};

// Status option arrays with bilingual labels
const statusOptions = [
  { value: "draft", labelEn: "Draft", labelAr: "مسودة" },
  { value: "approved", labelEn: "Signed", labelAr: "موقّع" },
  { value: "rejected", labelEn: "Rejected", labelAr: "مرفوض" },
];

export default function SACManagement() {  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const t = translations[language as keyof typeof translations] || translations.en;
  const prId = parseInt(id!, 10);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
  const generatePDF = trpc.logistics.generatePDF.useMutation();

  // Helper: get translated status label
  const getStatusLabel = (status: string) => {
    const option = statusOptions.find((o) => o.value === status);
    return isRTL ? option?.labelAr || status : option?.labelEn || status;
  };

  // Fetch PR data
  const { data: pr, isLoading: prLoading } = trpc.logistics.prWorkspace.getById.useQuery(
    { id: prId },
    { enabled: !!id && prId > 0 }
  );

  // Determine if this is a Goods PR >= $25K (contract chain but SAC depends on GRN, not contract approval)
  const prCategory = pr?.category?.toLowerCase() || '';
  const isGoodsCategory = prCategory === 'goods';
  const prTotalUsd = Number(pr?.totalAmount || 0);
  const isGoodsContractRequired = isGoodsCategory && prTotalUsd >= 25000;

  // Fetch contract for this PR
  const { data: contract, isLoading: contractLoading } =
    trpc.procurementPhaseA.contracts.getByPR.useQuery(
      { purchaseRequestId: prId },
      { enabled: !!id && prId > 0 }
    );

  // Fetch GRN list for Goods PRs (SAC depends on GRN, not contract approval)
  const {
    data: grnList,
    isLoading: grnLoading,
  } = trpc.procurementPhaseA.grn.getByPR.useQuery(
    { purchaseRequestId: prId },
    { enabled: isGoodsContractRequired && !!id && prId > 0 }
  );

  // Check if SAC can be created (includes category-specific monitoring rules)
  const { data: canCreateResult } =
    trpc.procurementPhaseA.sac.canCreate.useQuery(
      { contractId: contract?.id || 0 },
      { enabled: !!contract?.id }
    );

  // Fetch SAC list for the contract
  const { data: sacList, isLoading: sacListLoading, refetch: refetchSacList } =
    trpc.procurementPhaseA.sac.listByContract.useQuery(
      { contractId: contract?.id || 0 },
      { enabled: !!contract?.id }
    );

  // Fetch SAC summary
  const { data: sacSummary, refetch: refetchSummary } =
    trpc.procurementPhaseA.sac.summary.useQuery(
      { contractId: contract?.id || 0 },
      { enabled: !!contract?.id }
    );

  // Mutations
  const deleteSAC = trpc.procurementPhaseA.sac.delete.useMutation({
    onSuccess: () => {
      toast.success(t.sacDeleted);
      refetchSacList();
      refetchSummary();
    },
    onError: (err) => toast.error(err.message),
  });

  // Handlers
  const handleDelete = (sacId: number) => {
    if (confirm(t.confirmDeleteSac)) {
      deleteSAC.mutate({ id: sacId });
    }
  };

  const handleCreateSac = () => {
    if (!contract) return;
    setLocation(
      `/organization/logistics/procurement-workspace/sac-form/new?contractId=${contract.id}&prId=${prId}`
    );
  };

  const handleViewSac = (sacId: number) => {
    setLocation(
      `/organization/logistics/procurement-workspace/sac-form/${sacId}?mode=view&prId=${prId}`
    );
  };

  const handleEditSac = (sacId: number) => {
    setLocation(
      `/organization/logistics/procurement-workspace/sac-form/${sacId}?mode=edit&prId=${prId}`
    );
  };

  const handlePrintSac = async (sacId: number) => {

  try {

    setGeneratingPdfId(sacId);

    const result = await generatePDF.mutateAsync({
      documentType: "sac",
      documentId: Number(sacId),
      language: isRTL ? "ar" : "en",
    });

    if (!result?.pdf || !result.pdf.startsWith("JVBER")) {

      toast.error(
        isRTL
          ? "ملف PDF غير صالح"
          : "Invalid PDF generated"
      );

      return;
    }

    const binaryString = atob(result.pdf);

    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
      type: "application/pdf",
    });

    const url = window.URL.createObjectURL(blob);

    window.open(url, "_blank");

    toast.success(
      isRTL
        ? "تم إنشاء ملف PDF بنجاح"
        : "PDF generated successfully"
    );

  } catch (error: any) {

    console.error("PDF generation error:", error);

    toast.error(
      error?.message ||
      (isRTL
        ? "خطأ في إنشاء PDF"
        : "Error generating PDF")
    );

  } finally {

    setGeneratingPdfId(null);

  }
};

  // Computed
  const contractApproved = contract && ["approved", "active"].includes(contract.status);
  // For Goods >= $25K, SAC is allowed after GRN exists (contract may still be draft)
  const hasGRN = Array.isArray(grnList) && grnList.length > 0;
  const sacAccessAllowed = isGoodsContractRequired
  ? Boolean(contract?.id) && hasGRN
  : contractApproved;
  const sacCreationBlocked = canCreateResult && !canCreateResult.allowed;
  const isMonitoringBlock = canCreateResult?.reason === 'WORKS_MONITORING_REQUIRED' || canCreateResult?.reason === 'WORKS_MONITORING_INCOMPLETE';
  const progressPercent = sacSummary
    ? Math.min(100, (sacSummary.totalAllocated / sacSummary.contractValue) * 100)
    : 0;

  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  // Loading
  if (
  prLoading ||
    contractLoading ||
    (isGoodsContractRequired && grnLoading)
    ) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!sacAccessAllowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="bg-white rounded-lg border p-12 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isGoodsContractRequired
              ? (isRTL ? 'مطلوب إذن استلام البضائع' : 'GRN Required')
              : t.contractRequired}
          </h2>
          <p className="text-gray-600 mb-6">
            {isGoodsContractRequired
              ? (!contract
                ? (isRTL ? 'لا يوجد عقد لهذا الطلب. يرجى إنشاء عقد أولاً.' : 'No contract found for this PR. Please create a contract first.')
                : (isRTL ? 'يجب إنشاء إذن استلام بضائع (GRN) قبل إنشاء شهادة قبول البضائع' : 'A Goods Receipt Note (GRN) must be created before creating a Goods Acceptance Certificate'))
              : (!contract ? t.noContractForSac : t.contractNotApproved)}
          </p>
          <Button onClick={() => setLocation(`/organization/logistics/procurement-workspace/${prId}`)}>
            {t.back}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <BackButton onClick={() => setLocation(`/organization/logistics/procurement-workspace/${prId}`)} label={t.back} />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-teal-50">
                <FileCheck className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isGoodsContractRequired
                    ? (isRTL ? 'شهادات قبول البضائع' : 'Goods Acceptance Certificates')
                    : t.pageTitle}
                </h1>
                <p className="text-sm text-gray-500">
                  {contract?.contractNumber || "-"} — {pr?.prNumber}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleCreateSac} 
              className="gap-2"
              disabled={!!sacCreationBlocked}
              title={sacCreationBlocked ? (canCreateResult?.data?.message || '') : ''}
            >
              <Plus className="w-4 h-4" />
              {t.createSac}
            </Button>
          </div>
        </div>

        {/* Works PR: Monitoring Requirement Banner */}
        {isMonitoringBlock && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-amber-100">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-800 mb-1">
                    {canCreateResult?.reason === 'WORKS_MONITORING_REQUIRED' ? t.monitoringRequired : t.monitoringIncomplete}
                  </h3>
                  <p className="text-sm text-amber-700 mb-3">
                    {canCreateResult?.reason === 'WORKS_MONITORING_REQUIRED' ? t.monitoringRequiredDesc : t.monitoringIncompleteDesc}
                  </p>
                  {canCreateResult?.data?.monitoringStatus && (
                    <div className="flex items-center gap-4 text-xs text-amber-600 mb-3">
                      <span>{t.monitoringStatus}: <strong>{canCreateResult.data.monitoringStatus}</strong></span>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-amber-300 text-amber-800 hover:bg-amber-100"
                    onClick={() => setLocation(`/organization/logistics/procurement-workspace/${prId}`)}
                  >
                    {t.goToContractManagement}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {sacSummary && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              {/* Row 1: Budget Line and Total Budget Line */}
              {(sacSummary.budgetTitle || sacSummary.budgetCode) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t.budgetLine}</p>
                    <p className="text-sm font-medium">
                      {sacSummary.budgetTitle || sacSummary.budgetCode || "-"}
                      {sacSummary.subBudgetLine ? ` \u2014 ${sacSummary.subBudgetLine}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t.totalBudgetLine}</p>
                    <p className="text-lg font-bold text-purple-600">
                      <span dir="ltr">{sacSummary.prCurrency} {sacSummary.totalBudgetLine.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Row 2: Contract financial summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.contractValue}</p>
                  <p className="text-lg font-bold">
                    <span dir="ltr">{sacSummary.currency} {sacSummary.contractValue.toLocaleString()}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.totalAllocated}</p>
                  <p className="text-lg font-bold text-blue-600">
                    <span dir="ltr">{sacSummary.currency} {sacSummary.totalAllocated.toLocaleString()}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.totalApproved}</p>
                  <p className="text-lg font-bold text-green-600">
                    <span dir="ltr">{sacSummary.currency} {sacSummary.totalApproved.toLocaleString()}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.remaining}</p>
                  <p className="text-lg font-bold text-orange-600">
                    <span dir="ltr">{sacSummary.currency} {sacSummary.remainingToAllocate.toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.sacCoverage}</span>
                  <span dir="ltr">{progressPercent.toFixed(1)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* SAC List */}
        <Card>
          <CardHeader>
            <CardTitle>{t.sacList}</CardTitle>
            <CardDescription>
              {sacList?.length || 0} {t.certificates} · {sacSummary?.approvedCount || 0} {t.approved}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sacListLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !sacList || sacList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">{t.noSacs}</p>
                <p className="text-sm mb-4">{t.createFirstSac}</p>
                <Button onClick={handleCreateSac} className="gap-2" disabled={!!sacCreationBlocked}>
                  <Plus className="w-4 h-4" />
                  {t.createSac}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.sacNumber}</TableHead>
                    <TableHead>{t.deliverables}</TableHead>
                    <TableHead className="text-end">{t.amount}</TableHead>
                    <TableHead>{t.acceptanceDate}</TableHead>
                    <TableHead className="text-center">{t.status}</TableHead>
                    <TableHead className="text-center">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sacList.map((sac: any) => (
                    <TableRow key={sac.id}>
                      <TableCell className="font-mono text-sm">{sac.sacNumber}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{sac.deliverables}</TableCell>
                      <TableCell className="text-end font-medium">
                        <span dir="ltr">{sac.currency || contract?.currency || ""} {Number(sac.approvedAmount || 0).toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        {sac.acceptanceDate ? new Date(sac.acceptanceDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={statusColor[sac.status] || statusColor.draft}>
                          {getStatusLabel(sac.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View (always available) */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewSac(sac.id)}
                            title={t.view}
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>

                          {/* Edit (draft only) */}
                          {sac.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSac(sac.id)}
                              title={t.edit}
                            >
                              <Pencil className="w-4 h-4 text-blue-500" />
                            </Button>
                          )}

                          {/* Signed indicator */}
                          {sac.status === "approved" && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}

                          {/* Print PDF (always available) */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrintSac(sac.id)}
                            title={t.print}
                          >
                            {generatingPdfId === sac.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                            ) : (
                              <Printer className="w-4 h-4 text-gray-500" />
                            )}
                          </Button>

                          {/* Delete (draft only) */}
                          {sac.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(sac.id)}
                              title={t.delete}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
