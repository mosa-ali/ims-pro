/**
 * PR Workspace Page
 * 
 * Dedicated end-to-end procurement workspace for each Purchase Request
 * Visual workflow: PR → RFQ → Evaluation → PO → GRN → Payment → Closure
 * 
 * Features:
 * - Workflow tracker with status indicators
 * - Tabbed interface for each procurement stage
 * - Progressive tab unlocking based on workflow status
 * - Bilingual support (EN/AR) with RTL
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useParams, useNavigate } from "@/lib/router-compat";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, XCircle, FolderOpen } from "lucide-react";
import { EvidencePanel } from "@/components/EvidencePanel";
import { PRPaymentCard } from "@/components/procurement/PRPaymentCard";
import { useState } from "react";
import { BackButton } from "@/components/BackButton";

type WorkflowStage = {
 id: string;
 label: string;
 status: "pending" | "in_progress" | "completed" | "skipped";
 completedAt?: Date | null;
 completedBy?: number | null;
};

export default function PRWorkspacePage() {
 const { id } = useParams();
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const [activeTab, setActiveTab] = useState("pr");

 const prId = parseInt(id || "0");

 // Fetch PR details
 const { data: pr, isLoading: prLoading } = trpc.logistics.prWorkspace.getById.useQuery(
 { id: prId },
 { enabled: !!prId }
 );

 // Fetch workflow tracker
 const { data: workflow, isLoading: workflowLoading } =
 trpc.logistics.workflowTracker.getByPRId.useQuery(
 { purchaseRequestId: prId },
 { enabled: !!prId }
 );

 if (prLoading || workflowLoading) {
 return (
 <div className="container mx-auto py-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">{t.pRWorkspacePage.loading}</div>
 </div>
 );
 }

 if (!pr) {
 return (
 <div className="container mx-auto py-8">
 <div className="text-center text-red-600">{t.pRWorkspacePage.error}</div>
 </div>
 );
 }

 // Build workflow stages from tracker data
 const workflowStages: WorkflowStage[] = workflow
 ? [
 {
 id: "pr",
 label: t.pRWorkspacePage.prDetails,
 status: workflow.prStatus,
 completedAt: workflow.prCompletedAt,
 completedBy: workflow.prCompletedBy,
 },
 {
 id: "rfq",
 label: t.pRWorkspacePage.rfqStage,
 status: workflow.rfqStatus,
 completedAt: workflow.rfqCompletedAt,
 completedBy: workflow.rfqCompletedBy,
 },
 {
 id: "evaluation",
 label: t.pRWorkspacePage.evaluationStage,
 status: workflow.evaluationStatus,
 completedAt: workflow.evaluationCompletedAt,
 completedBy: workflow.evaluationCompletedBy,
 },
 {
 id: "po",
 label: t.pRWorkspacePage.poStage,
 status: workflow.poStatus,
 completedAt: workflow.poCompletedAt,
 completedBy: workflow.poCompletedBy,
 },
 {
 id: "grn",
 label: t.pRWorkspacePage.grnStage,
 status: workflow.grnStatus,
 completedAt: workflow.grnCompletedAt,
 completedBy: workflow.grnCompletedBy,
 },
 {
 id: "payment",
 label: t.pRWorkspacePage.paymentStage,
 status: workflow.paymentStatus,
 completedAt: workflow.paymentCompletedAt,
 completedBy: workflow.paymentCompletedBy,
 },
 {
 id: "closure",
 label: t.pRWorkspacePage.closureStage,
 status: workflow.closureStatus,
 completedAt: workflow.closureCompletedAt,
 completedBy: workflow.closureCompletedBy,
 },
 ]
 : [];

 const getStatusIcon = (status: string) => {
 switch (status) {
 case "completed":
 return <CheckCircle2 className="h-5 w-5 text-green-600" />;
 case "in_progress":
 return <Clock className="h-5 w-5 text-blue-600" />;
 case "skipped":
 return <XCircle className="h-5 w-5 text-gray-400" />;
 default:
 return <Circle className="h-5 w-5 text-gray-300" />;
 }
 };

 const getStatusBadge = (status: string) => {
 const statusMap = {
 pending: { variant: "secondary" as const, label: t.pRWorkspacePage.pending },
 in_progress: { variant: "default" as const, label: t.pRWorkspacePage.inProgress },
 completed: { variant: "default" as const, label: t.pRWorkspacePage.completed },
 skipped: { variant: "secondary" as const, label: t.pRWorkspacePage.skipped },
 };
 const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
 return <Badge variant={config.variant}>{config.label}</Badge>;
 };

 return (
 <div className="container mx-auto py-6 space-y-6">
 {/* Back Button */}
 <div>
 <BackButton onClick={() => navigate("/logistics/purchase-requests")} label={t.pRWorkspacePage.backToPRList} />
 </div>

 {/* Header */}
 <div>
 <h1 className="text-3xl font-bold">{t.pRWorkspacePage.prWorkspace}</h1>
 <p className="text-muted-foreground mt-1">
 {pr.prNumber} - {pr.projectTitle}
 </p>
 </div>

 {/* Workflow Tracker */}
 {workflow && workflow.workspaceActivated ? (
 <Card className="p-6">
 <h2 className="text-xl font-semibold mb-4">{t.pRWorkspacePage.workflowTracker}</h2>
 <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4">
 {workflowStages.map((stage, index) => (
 <div key={stage.id} className="flex items-center gap-4">
 <div className="flex flex-col items-center min-w-[120px]">
 <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-gray-200 bg-white">
 {getStatusIcon(stage.status)}
 </div>
 <div className="mt-2 text-sm font-medium text-center">{stage.label}</div>
 <div className="mt-1">{getStatusBadge(stage.status)}</div>
 {stage.completedAt && (
 <div className="mt-1 text-xs text-muted-foreground">
 {new Date(stage.completedAt).toLocaleDateString()}
 </div>
 )}
 </div>
 {index < workflowStages.length - 1 && (
 <div className="h-0.5 w-12 bg-gray-200 flex-shrink-0" />
 )}
 </div>
 ))}
 </div>
 </Card>
 ) : (
 <Card className="p-6">
 <div className="text-center text-muted-foreground">{t.pRWorkspacePage.workspaceNotActivated}</div>
 </Card>
 )}

 {/* Tabbed Content */}
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList className="grid w-full grid-cols-8">
 <TabsTrigger value="pr">{t.pRWorkspacePage.prDetails}</TabsTrigger>
 <TabsTrigger value="rfq" disabled={!workflow?.workspaceActivated}>
 {t.pRWorkspacePage.rfqStage}
 </TabsTrigger>
 <TabsTrigger value="evaluation" disabled={!workflow?.workspaceActivated}>
 {t.pRWorkspacePage.evaluationStage}
 </TabsTrigger>
 <TabsTrigger value="po" disabled={!workflow?.workspaceActivated}>
 {t.pRWorkspacePage.poStage}
 </TabsTrigger>
 <TabsTrigger value="grn" disabled={!workflow?.workspaceActivated}>
 {t.pRWorkspacePage.grnStage}
 </TabsTrigger>
 <TabsTrigger value="payment" disabled={!workflow?.workspaceActivated}>
 {t.pRWorkspacePage.paymentStage}
 </TabsTrigger>
 <TabsTrigger value="closure" disabled={!workflow?.workspaceActivated}>
 {t.pRWorkspacePage.closureStage}
 </TabsTrigger>
 <TabsTrigger value="evidence">
 <FolderOpen className="h-4 w-4 me-2 inline" />
 {t.pRWorkspacePage.evidence}
 </TabsTrigger>
 </TabsList>

 <TabsContent value="pr" className="space-y-4">
 <Card className="p-6">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <div className="text-sm text-muted-foreground">{t.pRWorkspacePage.prNumber}</div>
 <div className="font-medium">{pr.prNumber}</div>
 </div>
 <div>
 <div className="text-sm text-muted-foreground">{t.pRWorkspacePage.status}</div>
 <div className="font-medium">{pr.status}</div>
 </div>
 <div>
 <div className="text-sm text-muted-foreground">{t.pRWorkspacePage.requester}</div>
 <div className="font-medium">{pr.requesterName}</div>
 </div>
 <div>
 <div className="text-sm text-muted-foreground">{t.pRWorkspacePage.project}</div>
 <div className="font-medium">{pr.projectTitle}</div>
 </div>
 <div>
 <div className="text-sm text-muted-foreground">{t.pRWorkspacePage.totalAmount}</div>
 <div className="font-medium">
 {pr.currency} {parseFloat(pr.prTotalUSD || "0").toLocaleString()}
 </div>
 </div>
 <div>
 <div className="text-sm text-muted-foreground">{t.pRWorkspacePage.urgency}</div>
 <div className="font-medium">{pr.urgency}</div>
 </div>
 {pr.neededBy && (
 <div>
 <div className="text-sm text-muted-foreground">{t.pRWorkspacePage.neededBy}</div>
 <div className="font-medium">
 {new Date(pr.neededBy).toLocaleDateString()}
 </div>
 </div>
 )}
 {pr.justification && (
 <div className="col-span-2">
 <div className="text-sm text-muted-foreground">{t.pRWorkspacePage.justification}</div>
 <div className="font-medium">{pr.justification}</div>
 </div>
 )}
 </div>
 </Card>

 {/* Line Items */}
 {pr.lineItems && pr.lineItems.length > 0 && (
 <Card className="p-6">
 <h3 className="text-lg font-semibold mb-4">{t.pRWorkspacePage.lineItems}</h3>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b">
 <th className="text-start py-2">{t.pRWorkspacePage.description}</th>
 <th className="text-end py-2">{t.pRWorkspacePage.quantity}</th>
 <th className="text-end py-2">{t.pRWorkspacePage.unitPrice}</th>
 <th className="text-end py-2">{t.pRWorkspacePage.total}</th>
 </tr>
 </thead>
 <tbody>
 {pr.lineItems.map((item: any, index: number) => (
 <tr key={index} className="border-b">
 <td className="py-2">{item.description}</td>
 <td className="text-end py-2">
 {parseFloat(item.quantity)} {item.unit}
 </td>
 <td className="text-end py-2">
 {pr.exchangeTo || pr.currency} {(parseFloat(item.unitPrice) * (pr.exchangeRate || 1)).toLocaleString()}
 </td>
 <td className="text-end py-2">
 {pr.exchangeTo || pr.currency} {(parseFloat(item.totalPrice) * (pr.exchangeRate || 1)).toLocaleString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 )}
 </TabsContent>

 <TabsContent value="rfq">
 <Card className="p-6">
 <div className="text-center text-muted-foreground">
 RFQ Stage - Coming Soon
 </div>
 </Card>
 </TabsContent>

 <TabsContent value="evaluation">
 <Card className="p-6">
 <div className="text-center text-muted-foreground">
 Evaluation Stage - Coming Soon
 </div>
 </Card>
 </TabsContent>

 <TabsContent value="po">
 <Card className="p-6">
 <div className="text-center text-muted-foreground">
 Purchase Order Stage - Coming Soon
 </div>
 </Card>
 </TabsContent>

 <TabsContent value="grn">
 <Card className="p-6">
 <div className="text-center text-muted-foreground">
 Goods Receipt Stage - Coming Soon
 </div>
 </Card>
 </TabsContent>

 <TabsContent value="payment">
 <Card className="p-6">
 <div className="space-y-6">
 <div>
 <h3 className="text-lg font-semibold mb-4">Payment & Payables</h3>
 <p className="text-sm text-muted-foreground mb-6">
 Track all payables created from accepted GRNs for this Purchase Request
 </p>
 </div>
 <PRPaymentCard prId={id} />
 </div>
 </Card>
 </TabsContent>

 <TabsContent value="closure">
 <Card className="p-6">
 <div className="text-center text-muted-foreground">
 Closure Stage - Coming Soon
 </div>
 </Card>
 </TabsContent>

 <TabsContent value="evidence">
 <EvidencePanel entityType="PurchaseRequest" entityId={id || ''} />
 </TabsContent>
 </Tabs>
 </div>
 );
}
