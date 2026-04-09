/**
 * Procurement Workspace
 * Central hub for managing a single procurement request through its lifecycle
 * Includes 9 tabs: PR Details, QA, CBA, Evaluation, PO, GRN, Delivery, Payment, Documents, Audit
 */

import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Scale,
  BarChart3,
  ClipboardCheck,
  ShoppingCart,
  Package,
  Truck,
  CreditCard,
  FolderOpen,
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

// Status indicator component
function StatusIndicator({ status, label }: { status: "completed" | "in_progress" | "pending"; label: string }) {
  const icons = {
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    in_progress: <Clock className="h-4 w-4 text-yellow-500" />,
    pending: <AlertCircle className="h-4 w-4 text-gray-400" />,
  };
  
  const colors = {
    completed: "bg-green-50 text-green-700 border-green-200",
    in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
    pending: "bg-gray-50 text-gray-500 border-gray-200",
  };
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${colors[status]}`}>
      {icons[status]}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

// Coming Soon placeholder component
function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Clock className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-md">{description}</p>
      <Badge variant="outline" className="mt-4">Coming Soon</Badge>
    </div>
  );
}

export default function ProcurementWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState("details");
  
  const prId = parseInt(id || "0");
  
  // Fetch PR details
  const { data: pr, isLoading } = trpc.logistics.purchaseRequests.getById.useQuery(
    { id: prId },
    { enabled: prId > 0 }
  );
  
  // Fetch line items
  const { data: lineItemsData } = trpc.logistics.purchaseRequests.getLineItems.useQuery(
    { purchaseRequestId: prId },
    { enabled: prId > 0 }
  );
  
  const lineItems = lineItemsData?.items || [];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!pr) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Purchase Request Not Found</h3>
        <Button variant="outline" onClick={() => navigate("/logistics/purchase-requests")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>
    );
  }
  
  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  
  // Determine workflow status for each step
  const getWorkflowStatus = (step: string): "completed" | "in_progress" | "pending" => {
    if (pr.status === "approved") {
      if (step === "pr") return "completed";
      if (step === "qa") return "in_progress";
    }
    if (pr.status === "pending") {
      if (step === "pr") return "in_progress";
    }
    if (step === "pr" && pr.status === "draft") return "in_progress";
    return "pending";
  };
  
  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/logistics/purchase-requests")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{pr.prNumber}</h1>
              <Badge className={statusColors[pr.status || "draft"]}>
                {pr.status?.toUpperCase() || "DRAFT"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {isRTL ? pr.projectTitleAr : pr.projectTitle} • {pr.department}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/logistics/purchase-requests/${prId}/print`)}>
            <Printer className="h-4 w-4 mr-2" />
            {t("print")}
          </Button>
        </div>
      </div>
      
      {/* Workflow Status Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <StatusIndicator status={getWorkflowStatus("pr")} label={t("purchaseRequest")} />
            <div className="h-px w-8 bg-gray-200" />
            <StatusIndicator status={getWorkflowStatus("qa")} label={t("quotationAnalysis")} />
            <div className="h-px w-8 bg-gray-200" />
            <StatusIndicator status={getWorkflowStatus("po")} label={t("purchaseOrder")} />
            <div className="h-px w-8 bg-gray-200" />
            <StatusIndicator status={getWorkflowStatus("grn")} label={t("goodsReceipt")} />
            <div className="h-px w-8 bg-gray-200" />
            <StatusIndicator status={getWorkflowStatus("payment")} label={t("payment")} />
          </div>
        </CardContent>
      </Card>
      
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 lg:grid-cols-10 gap-1 h-auto p-1">
          <TabsTrigger value="details" className="flex items-center gap-1 text-xs">
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">{t("prDetails")}</span>
          </TabsTrigger>
          <TabsTrigger value="qa" className="flex items-center gap-1 text-xs">
            <Scale className="h-3 w-3" />
            <span className="hidden sm:inline">QA</span>
          </TabsTrigger>
          <TabsTrigger value="cba" className="flex items-center gap-1 text-xs">
            <BarChart3 className="h-3 w-3" />
            <span className="hidden sm:inline">CBA</span>
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="flex items-center gap-1 text-xs">
            <ClipboardCheck className="h-3 w-3" />
            <span className="hidden sm:inline">{t("evaluation")}</span>
          </TabsTrigger>
          <TabsTrigger value="po" className="flex items-center gap-1 text-xs">
            <ShoppingCart className="h-3 w-3" />
            <span className="hidden sm:inline">PO</span>
          </TabsTrigger>
          <TabsTrigger value="grn" className="flex items-center gap-1 text-xs">
            <Package className="h-3 w-3" />
            <span className="hidden sm:inline">GRN</span>
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-1 text-xs">
            <Truck className="h-3 w-3" />
            <span className="hidden sm:inline">{t("delivery")}</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-1 text-xs">
            <CreditCard className="h-3 w-3" />
            <span className="hidden sm:inline">{t("payment")}</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1 text-xs">
            <FolderOpen className="h-3 w-3" />
            <span className="hidden sm:inline">{t("documents")}</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1 text-xs">
            <History className="h-3 w-3" />
            <span className="hidden sm:inline">{t("auditLog")}</span>
          </TabsTrigger>
        </TabsList>
        
        {/* PR Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t("basicInformation")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("prNumber")}</p>
                    <p className="font-medium">{pr.prNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("category")}</p>
                    <p className="font-medium capitalize">{pr.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("urgency")}</p>
                    <Badge variant={pr.urgency === "high" ? "destructive" : pr.urgency === "normal" ? "default" : "secondary"}>
                      {pr.urgency?.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("status")}</p>
                    <Badge className={statusColors[pr.status || "draft"]}>
                      {pr.status?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">{t("projectTitle")}</p>
                  <p className="font-medium">{isRTL ? pr.projectTitleAr : pr.projectTitle}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Budget Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t("budgetInformation")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("donor")}</p>
                    <p className="font-medium">{pr.donor || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("budgetCode")}</p>
                    <p className="font-medium">{pr.budgetCode || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("subBudgetLine")}</p>
                    <p className="font-medium">{pr.subBudgetLine || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("currency")}</p>
                    <p className="font-medium">{pr.currency || "USD"}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">{t("totalAmount")}</p>
                  <p className="text-2xl font-bold text-primary">
                    {pr.currency || "USD"} {parseFloat(pr.totalAmount || "0").toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Requester Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t("requesterInformation")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("requesterName")}</p>
                    <p className="font-medium">{pr.requesterName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("email")}</p>
                    <p className="font-medium">{pr.requesterEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("department")}</p>
                    <p className="font-medium">{pr.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("neededByDate")}</p>
                    <p className="font-medium">
                      {pr.neededByDate ? new Date(pr.neededByDate).toLocaleDateString() : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Justification */}
            <Card>
              <CardHeader>
                <CardTitle>{t("justification")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t("justificationEn")}</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-md">{pr.justificationEn || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t("justificationAr")}</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-md" dir="rtl">{pr.justificationAr || "-"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>{t("lineItems")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">#</th>
                      <th className="text-left py-3 px-4 font-medium">{t("description")}</th>
                      <th className="text-right py-3 px-4 font-medium">{t("quantity")}</th>
                      <th className="text-left py-3 px-4 font-medium">{t("unit")}</th>
                      <th className="text-right py-3 px-4 font-medium">{t("unitPrice")}</th>
                      <th className="text-right py-3 px-4 font-medium">{t("total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item: any, index: number) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.descriptionAr && (
                              <p className="text-sm text-muted-foreground" dir="rtl">{item.descriptionAr}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">{item.quantity}</td>
                        <td className="py-3 px-4">{item.unit}</td>
                        <td className="py-3 px-4 text-right">{parseFloat(item.unitPrice || "0").toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium">{parseFloat(item.totalPrice || "0").toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="py-3 px-4 text-right font-semibold">{t("total")}:</td>
                      <td className="py-3 px-4 text-right font-bold text-primary">
                        {pr.currency || "USD"} {parseFloat(pr.totalAmount || "0").toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* QA Tab */}
        <TabsContent value="qa">
          <ComingSoon 
            title="Quotation Analysis (QA)" 
            description="Compare quotations from multiple suppliers for simple RFQs. This feature is under development and will be available soon."
          />
        </TabsContent>
        
        {/* CBA Tab */}
        <TabsContent value="cba">
          <ComingSoon 
            title="Comparative Bid Analysis (CBA)" 
            description="Evaluate and compare bids from multiple suppliers for formal tenders. This feature is under development and will be available soon."
          />
        </TabsContent>
        
        {/* Evaluation Tab */}
        <TabsContent value="evaluation">
          <ComingSoon 
            title="Evaluation Criteria Management" 
            description="Define and manage evaluation criteria for supplier selection. Excel-style table for criteria weighting and scoring."
          />
        </TabsContent>
        
        {/* PO Tab */}
        <TabsContent value="po">
          <ComingSoon 
            title="Purchase Order Integration" 
            description="Generate and manage purchase orders linked to this procurement request. Track PO status and delivery schedules."
          />
        </TabsContent>
        
        {/* GRN Tab */}
        <TabsContent value="grn">
          <ComingSoon 
            title="Goods Receipt Note Integration" 
            description="Record goods received against purchase orders. Track quantities, conditions, and inspection results."
          />
        </TabsContent>
        
        {/* Delivery Tab */}
        <TabsContent value="delivery">
          <ComingSoon 
            title="Delivery Note Management" 
            description="Manage delivery notes and track shipment status. Coordinate with suppliers on delivery schedules."
          />
        </TabsContent>
        
        {/* Payment Tab */}
        <TabsContent value="payment">
          <ComingSoon 
            title="Payment & Invoice Management" 
            description="Track payments and invoices related to this procurement. Manage payment schedules and reconciliation."
          />
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents">
          <ComingSoon 
            title="Documents Management" 
            description="Store and manage all documents related to this procurement. Attach contracts, quotations, and supporting documents."
          />
        </TabsContent>
        
        {/* Audit Tab */}
        <TabsContent value="audit">
          <ComingSoon 
            title="Audit Log" 
            description="View complete history of all actions and changes made to this procurement request. Track approvals, modifications, and status changes."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
