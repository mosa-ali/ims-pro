import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Building2,
  Briefcase,
  Phone,
  FileText,
  RefreshCw,
  Users,
} from "lucide-react";

type StatusFilter = "all" | "new" | "approved" | "rejected";

interface AccessRequest {
  id: string;
  fullName: string;
  email: string;
  organizationName: string;
  operatingUnitName: string;
  jobTitle: string;
  reasonForAccess: string;
  phoneNumber?: string | null;
  status: string;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  createdAt: Date;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const statusIcons: Record<string, React.ReactNode> = {
  new: <Clock className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

export default function AccessRequestsPage() {
  const { isRTL } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; action: "approve" | "reject" | null }>({
    open: false,
    action: null,
  });
  const [reviewNotes, setReviewNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: paginatedData, isLoading, refetch } = trpc.requestAccess.getAllRequests.useQuery(
    { status: statusFilter, page: currentPage, pageSize },
    { refetchOnWindowFocus: false }
  );

  const requests = paginatedData?.requests ?? [];
  const pagination = paginatedData?.pagination ?? { page: 1, pageSize: 20, totalCount: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false };

  const approveMutation = trpc.requestAccess.approveRequest.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تمت الموافقة على الطلب" : "Request approved successfully");
      setReviewDialog({ open: false, action: null });
      setReviewNotes("");
      setSelectedRequest(null);
      utils.requestAccess.getAllRequests.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const rejectMutation = trpc.requestAccess.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تم رفض الطلب" : "Request rejected");
      setReviewDialog({ open: false, action: null });
      setReviewNotes("");
      setSelectedRequest(null);
      utils.requestAccess.getAllRequests.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleReview = (request: AccessRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setReviewNotes("");
    setReviewDialog({ open: true, action });
  };

  const handleConfirmReview = () => {
    if (!selectedRequest || !reviewDialog.action) return;
    if (reviewDialog.action === "approve") {
      approveMutation.mutate({ requestId: selectedRequest.id, notes: reviewNotes });
    } else {
      rejectMutation.mutate({ requestId: selectedRequest.id, reason: reviewNotes });
    }
  };

  const counts = {
    all: requests.length,
    new: requests.filter((r) => r.status === "new").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className={cn("p-6 space-y-6", isRTL && "text-right")} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isRTL ? "طلبات الوصول" : "Access Requests"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "مراجعة وإدارة طلبات الوصول المعلقة"
              : "Review and manage pending access requests"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {isRTL ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["all", "new", "approved", "rejected"] as StatusFilter[]).map((status) => (
          <Card
            key={status}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              statusFilter === status && "ring-2 ring-primary"
            )}
            onClick={() => setStatusFilter(status)}
          >
            <CardContent className="p-4">
              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {isRTL
                      ? { all: "الكل", new: "جديد", approved: "موافق عليه", rejected: "مرفوض" }[status]
                      : status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{counts[status]}</p>
                </div>
                <Users className="w-8 h-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
        <Label className="text-sm font-medium">{isRTL ? "تصفية حسب الحالة:" : "Filter by status:"}</Label>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
            <SelectItem value="new">{isRTL ? "جديد" : "New"}</SelectItem>
            <SelectItem value="approved">{isRTL ? "موافق عليه" : "Approved"}</SelectItem>
            <SelectItem value="rejected">{isRTL ? "مرفوض" : "Rejected"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardListEmpty className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {isRTL ? "لا توجد طلبات" : "No requests found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className={cn("flex items-start justify-between gap-4", isRTL && "flex-row-reverse")}>
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Name + Status */}
                    <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                      <h3 className="font-semibold text-foreground truncate">{request.fullName}</h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "flex items-center gap-1 text-xs capitalize",
                          statusColors[request.status] || "bg-gray-100 text-gray-800"
                        )}
                      >
                        {statusIcons[request.status]}
                        {isRTL
                          ? { new: "جديد", approved: "موافق عليه", rejected: "مرفوض" }[request.status] || request.status
                          : request.status}
                      </Badge>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{request.email}</span>
                      </div>
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{request.organizationName} — {request.operatingUnitName}</span>
                      </div>
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{request.jobTitle}</span>
                      </div>
                      {request.phoneNumber && (
                        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{request.phoneNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Reason */}
                    <div className={cn("flex items-start gap-2 text-sm", isRTL && "flex-row-reverse")}>
                      <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
                      <p className="text-muted-foreground line-clamp-2">{request.reasonForAccess}</p>
                    </div>

                    {/* Review notes if reviewed */}
                    {request.reviewNotes && (
                      <p className="text-xs text-muted-foreground italic bg-muted/50 rounded px-2 py-1">
                        {isRTL ? "ملاحظات المراجعة: " : "Review notes: "}{request.reviewNotes}
                      </p>
                    )}

                    {/* Submitted date */}
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "تاريخ التقديم: " : "Submitted: "}
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Right: Actions */}
                  {request.status === "new" && (
                    <div className={cn("flex flex-col gap-2 flex-shrink-0", isRTL && "items-end")}>
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleReview(request as AccessRequest, "approve")}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {isRTL ? "موافقة" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handleReview(request as AccessRequest, "reject")}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {isRTL ? "رفض" : "Reject"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog({ open, action: reviewDialog.action })}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approve"
                ? isRTL ? "الموافقة على الطلب" : "Approve Request"
                : isRTL ? "رفض الطلب" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {isRTL ? "مقدم الطلب: " : "Applicant: "}
                  <strong>{selectedRequest.fullName}</strong> ({selectedRequest.email})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label htmlFor="review-notes">
              {reviewDialog.action === "approve"
                ? isRTL ? "ملاحظات (اختياري)" : "Notes (optional)"
                : isRTL ? "سبب الرفض (اختياري)" : "Reason for rejection (optional)"}
            </Label>
            <Textarea
              id="review-notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                reviewDialog.action === "approve"
                  ? isRTL ? "أضف ملاحظات للموافقة..." : "Add approval notes..."
                  : isRTL ? "اذكر سبب الرفض..." : "State the reason for rejection..."
              }
              rows={3}
              className={isRTL ? "text-right" : ""}
            />
          </div>

          <DialogFooter className={cn(isRTL && "flex-row-reverse")}>
            <Button
              variant="outline"
              onClick={() => setReviewDialog({ open: false, action: null })}
            >
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleConfirmReview}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={
                reviewDialog.action === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {approveMutation.isPending || rejectMutation.isPending
                ? isRTL ? "جارٍ المعالجة..." : "Processing..."
                : reviewDialog.action === "approve"
                ? isRTL ? "تأكيد الموافقة" : "Confirm Approval"
                : isRTL ? "تأكيد الرفض" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline empty state icon
function ClipboardListEmpty({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
