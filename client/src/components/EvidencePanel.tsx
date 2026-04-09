import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface EvidencePanelProps {
 /**
 * Type of entity (e.g., "Payment", "Activity", "Contract")
 */
 entityType: string;
 
 /**
 * ID of the entity
 */
 entityId: string;
 
 /**
 * Optional: Module name for filtering (e.g., "finance", "hr", "projects")
 */
 module?: string;
 
 /**
 * Optional: Screen name for filtering (e.g., "payments", "contracts")
 */
 screen?: string;
}

/**
 * Evidence Panel Component
 * 
 * Displays all evidence documents linked to a specific entity with:
 * - Sync status indicators
 * - View/Download actions
 * - Last sync timestamp
 * - Refresh capability
 * 
 * Usage:
 * ```tsx
 * <EvidencePanel 
 * entityType="Payment" 
 * entityId={paymentId.toString()} 
 * module="finance"
 * screen="payments"
 * />
 * ```
 */
export function EvidencePanel({ entityType, entityId, module, screen }: EvidencePanelProps) {
 const [isRefreshing, setIsRefreshing] = useState(false);
 
 // Fetch evidence documents for this entity
 const { data: evidenceDocuments, isLoading, refetch } = trpc.documents.getEvidenceDocuments.useQuery({
 entityType,
 entityId,
 module,
 screen,
 });
 
 const handleRefresh = async () => {
 setIsRefreshing(true);
 await refetch();
 setIsRefreshing(false);
 };
 
 const handleView = (documentId: number) => {
 // Open document in new tab
 window.open(`/api/documents/${documentId}/view`, "_blank");
 };
 
 const handleDownload = (documentId: number, fileName: string) => {
 // Trigger download
 const link = document.createElement("a");
 link.href = `/api/documents/${documentId}/download`;
 link.download = fileName;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };
 
 const getSyncStatusBadge = (syncStatus: string) => {
 switch (syncStatus) {
 case "synced":
 return (
 <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
 <CheckCircle2 className="w-3 h-3 me-1" />
 Synced
 </Badge>
 );
 case "pending":
 return (
 <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">
 <Clock className="w-3 h-3 me-1" />
 Pending
 </Badge>
 );
 case "error":
 return (
 <Badge variant="destructive">
 <XCircle className="w-3 h-3 me-1" />
 Error
 </Badge>
 );
 default:
 return (
 <Badge variant="secondary">
 {syncStatus}
 </Badge>
 );
 }
 };
 
 if (isLoading) {
 return (
 <Card>
 <CardHeader>
 <CardTitle className="text-lg flex items-center gap-2">
 <FileText className="w-5 h-5" />
 Linked Documents
 </CardTitle>
 <CardDescription>Loading evidence documents...</CardDescription>
 </CardHeader>
 </Card>
 );
 }
 
 return (
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="text-lg flex items-center gap-2">
 <FileText className="w-5 h-5" />
 Linked Documents
 </CardTitle>
 <CardDescription>
 Evidence documents automatically synced from system actions
 </CardDescription>
 </div>
 <Button
 variant="outline"
 size="sm"
 onClick={handleRefresh}
 disabled={isRefreshing}
 >
 <RefreshCw className={`w-4 h-4 me-2 ${isRefreshing ? "animate-spin" : ""}`} />
 Refresh
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 {!evidenceDocuments || evidenceDocuments.length === 0 ? (
 <div className="text-center py-8 text-muted-foreground">
 <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
 <p>No evidence documents found</p>
 <p className="text-sm mt-1">
 Documents will appear here automatically when actions are performed
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 {evidenceDocuments.map((doc: any) => (
 <div
 key={doc.documentId}
 className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
 >
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <FileText className="w-5 h-5 text-muted-foreground" />
 <div>
 <p className="font-medium">{doc.fileName}</p>
 <p className="text-sm text-muted-foreground">
 {doc.syncSource && (
 <span className="capitalize">{doc.syncSource.replace(/_/g, " ")}</span>
 )}
 {doc.uploadedAt && (
 <span className="ms-2">
 • {format(new Date(doc.uploadedAt), "MMM dd, yyyy HH:mm")}
 </span>
 )}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 ms-8">
 {getSyncStatusBadge(doc.syncStatus)}
 {doc.version && doc.version > 1 && (
 <Badge variant="outline" className="text-xs">
 v{doc.version}
 </Badge>
 )}
 <span className="text-xs text-muted-foreground">
 {(doc.fileSize / 1024).toFixed(1)} KB
 </span>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleView(doc.documentId)}
 >
 <Eye className="w-4 h-4 me-1" />
 View
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDownload(doc.documentId, doc.fileName)}
 >
 <Download className="w-4 h-4 me-1" />
 Download
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 );
}
