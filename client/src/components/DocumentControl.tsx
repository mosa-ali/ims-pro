import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Eye, Trash2, Plus, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DocumentControlProps {
  prId: number;
  prNumber: string;
  paymentStatus?: string;
  onDocumentsGenerated?: () => void;
}

const DOCUMENT_TYPES = [
  { id: "PR", label: "Purchase Request", labelAr: "طلب الشراء" },
  { id: "RFQ", label: "Request for Quotation", labelAr: "طلب عرض أسعار" },
  { id: "PO", label: "Purchase Order", labelAr: "أمر الشراء" },
  { id: "GRN", label: "Goods Receipt Note", labelAr: "إيصال استلام البضائع" },
  { id: "DELIVERY", label: "Delivery Note", labelAr: "ملاحظة التسليم" },
  { id: "PAYMENT", label: "Payment Document", labelAr: "وثيقة الدفع" },
];

const SYNC_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  synced: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
};

const SYNC_STATUS_LABELS = {
  pending: { en: "Pending Sync", ar: "في انتظار المزامنة" },
  synced: { en: "Synced", ar: "تمت المزامنة" },
  error: { en: "Sync Error", ar: "خطأ في المزامنة" },
};

export function DocumentControl({
  prId,
  prNumber,
  paymentStatus,
  onDocumentsGenerated,
}: DocumentControlProps) {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Queries
  const { data: documents, isLoading, refetch } = trpc.prDocument.getPRDocuments.useQuery(
    { prId },
    { enabled: !!prId }
  );

  const { data: docStatus } = trpc.prDocument.getDocumentStatus.useQuery(
    { prId },
    { enabled: !!prId }
  );

  // Mutations
  const generateDocMutation = trpc.prDocument.generatePRDocument.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم إنشاء المستند بنجاح" : "Document generated successfully");
      refetch();
      onDocumentsGenerated?.();
      setSelectedDocType(null);
    },
    onError: (error) => {
      toast.error(
        language === "ar"
          ? "فشل في إنشاء المستند"
          : "Failed to generate document"
      );
      console.error(error);
    },
  });

  const deleteDocMutation = trpc.prDocument.deletePRDocument.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم حذف المستند" : "Document deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(language === "ar" ? "فشل الحذف" : "Failed to delete");
      console.error(error);
    },
  });

  const syncDocsMutation = trpc.prDocument.syncDocumentsToCentral.useMutation({
    onSuccess: () => {
      toast.success(
        language === "ar"
          ? "تم مزامنة المستندات بنجاح"
          : "Documents synced successfully"
      );
      refetch();
    },
    onError: (error) => {
      toast.error(
        language === "ar" ? "فشلت المزامنة" : "Sync failed"
      );
      console.error(error);
    },
  });

  const handleGenerateDocument = async (docType: string) => {
    setIsGenerating(true);
    try {
      await generateDocMutation.mutateAsync({
        prId,
        documentType: docType as any,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (
      confirm(
        language === "ar"
          ? "هل أنت متأكد من حذف هذا المستند؟"
          : "Are you sure you want to delete this document?"
      )
    ) {
      await deleteDocMutation.mutateAsync({ documentId });
    }
  };

  const handleSyncDocuments = async () => {
    if (paymentStatus !== "paid") {
      toast.warning(
        language === "ar"
          ? "يمكن مزامنة المستندات فقط بعد إكمال الدفع"
          : "Documents can only be synced after payment is completed"
      );
      return;
    }
    await syncDocsMutation.mutateAsync({ prId });
  };

  const handlePreviewDocument = (doc: any) => {
    setPreviewDoc(doc);
    setShowPreview(true);
  };

  const handleDownloadDocument = (doc: any) => {
    if (doc.filePath) {
      window.open(doc.filePath, "_blank");
    }
  };

  const isRTLClass = isRTL ? "rtl" : "ltr";

  return (
    <div className={`space-y-4 ${isRTLClass}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Document Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {language === "ar" ? "إنشاء المستندات" : "Generate Documents"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {DOCUMENT_TYPES.map((docType) => (
              <Button
                key={docType.id}
                variant="outline"
                size="sm"
                onClick={() => handleGenerateDocument(docType.id)}
                disabled={isGenerating || !user}
                className="text-xs"
              >
                {isGenerating && selectedDocType === docType.id && (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                )}
                {language === "ar" ? docType.labelAr : docType.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documents List Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {language === "ar" ? "المستندات المُنشأة" : "Generated Documents"}
            </CardTitle>
            {documents && documents.length > 0 && (
              <Badge variant="secondary">{documents.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === "ar"
                ? "لم يتم إنشاء أي مستندات بعد"
                : "No documents generated yet"}
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{doc.fileName}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString(
                        language === "ar" ? "ar-SA" : "en-US"
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    <Badge
                      className={SYNC_STATUS_COLORS[doc.syncStatus as keyof typeof SYNC_STATUS_COLORS]}
                      variant="secondary"
                    >
                      {language === "ar"
                        ? SYNC_STATUS_LABELS[doc.syncStatus as keyof typeof SYNC_STATUS_LABELS].ar
                        : SYNC_STATUS_LABELS[doc.syncStatus as keyof typeof SYNC_STATUS_LABELS].en}
                    </Badge>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewDocument(doc)}
                      title={language === "ar" ? "معاينة" : "Preview"}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadDocument(doc)}
                      title={language === "ar" ? "تحميل" : "Download"}
                    >
                      <Download className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.documentId)}
                      title={language === "ar" ? "حذف" : "Delete"}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Status Section */}
      {docStatus && (
        <Card>
          <CardHeader>
            <CardTitle>
              {language === "ar" ? "حالة المستندات" : "Document Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{docStatus.total}</div>
                <div className="text-sm text-muted-foreground">
                  {language === "ar" ? "إجمالي" : "Total"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {docStatus.pending}
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === "ar" ? "في الانتظار" : "Pending"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {docStatus.synced}
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === "ar" ? "تمت المزامنة" : "Synced"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {docStatus.error}
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === "ar" ? "أخطاء" : "Errors"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Documents Button */}
      {documents && documents.length > 0 && (
        <Button
          onClick={handleSyncDocuments}
          disabled={syncDocsMutation.isPending || paymentStatus !== "paid"}
          className="w-full"
        >
          {syncDocsMutation.isPending && (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          )}
          {language === "ar"
            ? "مزامنة المستندات مع المستندات المركزية"
            : "Sync Documents to Central Documents"}
        </Button>
      )}

      {/* Document Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "معاينة المستند" : "Document Preview"}
            </DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">
                      {language === "ar" ? "اسم الملف:" : "File Name:"}
                    </span>
                    <div>{previewDoc.fileName}</div>
                  </div>
                  <div>
                    <span className="font-semibold">
                      {language === "ar" ? "الحجم:" : "Size:"}
                    </span>
                    <div>{(previewDoc.fileSize / 1024).toFixed(2)} KB</div>
                  </div>
                  <div>
                    <span className="font-semibold">
                      {language === "ar" ? "التاريخ:" : "Date:"}
                    </span>
                    <div>
                      {new Date(previewDoc.uploadedAt).toLocaleDateString(
                        language === "ar" ? "ar-SA" : "en-US"
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold">
                      {language === "ar" ? "الحالة:" : "Status:"}
                    </span>
                    <div>{previewDoc.syncStatus}</div>
                  </div>
                </div>
              </div>

              {previewDoc.filePath && (
                <iframe
                  src={previewDoc.filePath}
                  className="w-full h-96 border rounded-lg"
                  title="Document Preview"
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
            >
              {language === "ar" ? "إغلاق" : "Close"}
            </Button>
            {previewDoc?.filePath && (
              <Button onClick={() => handleDownloadDocument(previewDoc)}>
                <Download className="w-4 h-4 mr-2" />
                {language === "ar" ? "تحميل" : "Download"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
