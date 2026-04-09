import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Edit, Save, X, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";

/**
 * Quotation Analysis Detail Page
 * Full-featured management page with CRUD operations and workflow
 */
export default function QuotationAnalysisDetail() {
 const { id } = useParams();
 const [, setLocation] = useLocation();
 const [isEditing, setIsEditing] = useState(false);

 const qaId = parseInt(id!);

 // Fetch QA data
 const { data: qa, isLoading, refetch } = trpc.logistics.quotationAnalysis.getById.useQuery({ id: qaId });
 
 // Fetch PR data for context
 const { data: pr } = trpc.logistics.prWorkspace.getById.useQuery(
 { id: qa?.purchaseRequestId || 0 },
 { enabled: !!qa?.purchaseRequestId }
 );

 // Mutations
 const updateQA = trpc.logistics.quotationAnalysis.update.useMutation({
 onSuccess: () => {
 toast.success("Quotation Analysis updated successfully");
 setIsEditing(false);
 refetch();
 },
 onError: (error) => {
 toast.error(`Failed to update: ${error.message}`);
 },
 });

 const updateStatus = trpc.logistics.quotationAnalysis.updateStatus.useMutation({
 onSuccess: () => {
 toast.success("Status updated successfully");
 refetch();
 },
 onError: (error) => {
 toast.error(`Failed to update status: ${error.message}`);
 },
 });

 const [formData, setFormData] = useState({
 analysisDate: "",
 evaluationCriteria: "",
 recommendation: "",
 selectedSupplierId: null as number | null,
 justification: "",
 estimatedDeliveryDays: 0,
 notes: "",
 });

 // Initialize form when QA data loads
 useState(() => {
 if (qa && !isEditing) {
 setFormData({
 analysisDate: qa.analysisDate || "",
 evaluationCriteria: qa.evaluationCriteria || "",
 recommendation: qa.recommendation || "",
 selectedSupplierId: qa.selectedSupplierId,
 justification: qa.justification || "",
 estimatedDeliveryDays: qa.estimatedDeliveryDays || 0,
 notes: qa.notes || "",
 });
 }
 });

 const handleSave = () => {
 updateQA.mutate({
 id: qaId,
 ...formData,
 });
 };

 const handleStatusChange = (newStatus: string) => {
 updateStatus.mutate({
 id: qaId,
 status: newStatus as any,
 });
 };

 if (isLoading) {
 return (
 <div className="container py-8">
 <div className="animate-pulse space-y-4">
 <div className="h-8 bg-gray-200 rounded w-1/3"></div>
 <div className="h-64 bg-gray-200 rounded"></div>
 </div>
 </div>
 );
 }

 if (!qa) {
 return (
 <div className="container py-8">
 <Card className="p-8 text-center">
 <p className="text-muted-foreground">Quotation Analysis not found</p>
 <Button asChild className="mt-4">
 <Link href="/organization/logistics/purchase-requests">
 Back to Purchase Requests
 </Link>
 </Button>
 </Card>
 </div>
 );
 }

 const getStatusColor = (status: string) => {
 switch (status) {
 case "draft": return "bg-gray-500";
 case "under_review": return "bg-blue-500";
 case "approved": return "bg-green-500";
 case "rejected": return "bg-red-500";
 default: return "bg-gray-500";
 }
 };

 return (
 <div className="container py-8 space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton href={`/organization/logistics/procurement-workspace/${qa.purchaseRequestId}`}  />
 <div>
 <h1 className="text-3xl font-bold">Quotation Analysis</h1>
 <p className="text-muted-foreground">
 {qa.qaNumber} • PR: {pr?.prNumber}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Badge className={getStatusColor(qa.status)}>
 {qa.status.replace("_", " ").toUpperCase()}
 </Badge>
 
 {!isEditing && (
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setLocation(`/organization/logistics/quotation-analysis/${qa.id}/print`)}
 >
 <Printer className="h-4 w-4 me-2" />
 Print
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setIsEditing(true)}
 >
 <Edit className="h-4 w-4 me-2" />
 Edit
 </Button>
 </>
 )}

 {isEditing && (
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setIsEditing(false);
 // Reset form
 }}
 >
 <X className="h-4 w-4 me-2" />
 Cancel
 </Button>
 <Button
 size="sm"
 onClick={handleSave}
 disabled={updateQA.isPending}
 >
 <Save className="h-4 w-4 me-2" />
 Save Changes
 </Button>
 </>
 )}
 </div>
 </div>

 {/* Main Content */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column - QA Details */}
 <div className="lg:col-span-2 space-y-6">
 <Card className="p-6">
 <h2 className="text-xl font-semibold mb-4">Analysis Details</h2>
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>Analysis Date</Label>
 {isEditing ? (
 <Input
 type="date"
 value={formData.analysisDate}
 onChange={(e) => setFormData({ ...formData, analysisDate: e.target.value })}
 />
 ) : (
 <p className="text-sm mt-1">{qa.analysisDate || "-"}</p>
 )}
 </div>

 <div>
 <Label>Estimated Delivery (Days)</Label>
 {isEditing ? (
 <Input
 type="number"
 value={formData.estimatedDeliveryDays}
 onChange={(e) => setFormData({ ...formData, estimatedDeliveryDays: parseInt(e.target.value) })}
 />
 ) : (
 <p className="text-sm mt-1">{qa.estimatedDeliveryDays || "-"}</p>
 )}
 </div>

 <div className="col-span-2">
 <Label>Evaluation Criteria</Label>
 {isEditing ? (
 <Textarea
 value={formData.evaluationCriteria}
 onChange={(e) => setFormData({ ...formData, evaluationCriteria: e.target.value })}
 rows={3}
 />
 ) : (
 <p className="text-sm mt-1 whitespace-pre-wrap">{qa.evaluationCriteria || "-"}</p>
 )}
 </div>

 <div className="col-span-2">
 <Label>Recommendation</Label>
 {isEditing ? (
 <Textarea
 value={formData.recommendation}
 onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
 rows={3}
 />
 ) : (
 <p className="text-sm mt-1 whitespace-pre-wrap">{qa.recommendation || "-"}</p>
 )}
 </div>

 <div className="col-span-2">
 <Label>Justification</Label>
 {isEditing ? (
 <Textarea
 value={formData.justification}
 onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
 rows={2}
 />
 ) : (
 <p className="text-sm mt-1 whitespace-pre-wrap">{qa.justification || "-"}</p>
 )}
 </div>

 <div className="col-span-2">
 <Label>Notes</Label>
 {isEditing ? (
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={2}
 />
 ) : (
 <p className="text-sm mt-1 whitespace-pre-wrap">{qa.notes || "-"}</p>
 )}
 </div>
 </div>
 </Card>

 {/* Line Items */}
 <Card className="p-6">
 <h2 className="text-xl font-semibold mb-4">Line Items</h2>
 <div className="text-sm text-muted-foreground">
 Line items are auto-copied from Purchase Request
 </div>
 {/* TODO: Display line items table */}
 </Card>

 {/* Supplier Quotations */}
 <Card className="p-6">
 <h2 className="text-xl font-semibold mb-4">Supplier Quotations</h2>
 <div className="text-sm text-muted-foreground">
 Quotations received from invited suppliers
 </div>
 {/* TODO: Display supplier quotations */}
 </Card>
 </div>

 {/* Right Column - Workflow Actions */}
 <div className="space-y-6">
 <Card className="p-6">
 <h2 className="text-lg font-semibold mb-4">Workflow Actions</h2>
 
 <div className="space-y-3">
 {qa.status === "draft" && (
 <Button
 className="w-full"
 onClick={() => handleStatusChange("under_review")}
 disabled={updateStatus.isPending}
 >
 Submit for Review
 </Button>
 )}

 {qa.status === "under_review" && (
 <>
 <Button
 className="w-full"
 onClick={() => handleStatusChange("approved")}
 disabled={updateStatus.isPending}
 >
 Approve Analysis
 </Button>
 <Button
 className="w-full"
 variant="destructive"
 onClick={() => handleStatusChange("rejected")}
 disabled={updateStatus.isPending}
 >
 Reject Analysis
 </Button>
 </>
 )}

 {qa.status === "approved" && (
 <div className="text-sm text-green-600 font-medium">
 ✓ Analysis Approved - Ready for PO Creation
 </div>
 )}
 </div>
 </Card>

 <Card className="p-6">
 <h2 className="text-lg font-semibold mb-4">Related Documents</h2>
 <div className="space-y-2 text-sm">
 <Link href={`/organization/logistics/purchase-requests/${qa.purchaseRequestId}`} className="block text-blue-600 hover:underline">
 → Purchase Request
 </Link>
 {/* TODO: Add links to RFQ, PO when available */}
 </div>
 </Card>
 </div>
 </div>
 </div>
 );
}
