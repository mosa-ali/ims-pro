/**
 * Procurement Document Workspace
 * 
 * Displays documents organized by the 13-stage procurement lifecycle
 * Automatically routes documents as PRs progress through workflow stages
 * 
 * Procurement Lifecycle:
 * 1. Purchase Requests
 * 2. RFQ / Tender Documents
 * 3. Bid Opening Minutes
 * 4. Supplier Quotations
 * 5. Bid Evaluation
 * 6. Competitive Bid Analysis
 * 7. Contracts
 * 8. Purchase Orders
 * 9. Goods Receipt Notes
 * 10. Delivery Notes
 * 11. Service Acceptance Certificates
 * 12. Payments
 * 13. Audit Logs
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText, Folder, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProcurementStage {
  folderKey: string;
  stageName: string;
  documentCount: number;
}

export function ProcurementDocumentWorkspace() {  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Fetch workflow stages with document counts
  const { data: workflowData, isLoading, error } = trpc.procurementDocument.getWorkflowStages.useQuery(
    {},
    {
      enabled: !!user,
    }
  );

  // Fetch documents for selected stage
  const { data: stageDocuments, isLoading: isLoadingStage } =
    trpc.procurementDocument.getByStage.useQuery(
      {
        folderKey: selectedStage || "01_Purchase_Requests",
      },
      {
        enabled: !!user && !!selectedStage,
      }
    );

  useEffect(() => {
    if (workflowData?.stages && workflowData.stages.length > 0) {
      setSelectedStage(workflowData.stages[0].folderKey);
    }
  }, [workflowData]);

  const translations = {
    en: {
      title: "Procurement Document Workflow",
      description: "Documents organized by procurement lifecycle stages",
      noDocuments: "No documents in this stage",
      documents: "Documents",
      stages: "Procurement Stages",
      loading: "Loading...",
      error: "Error loading documents",
      selectStage: "Select a stage to view documents",
    },
    ar: {
      title: "سير العمل الوثائقي للمشتريات",
      description: "الوثائق منظمة حسب مراحل دورة حياة المشتريات",
      noDocuments: "لا توجد وثائق في هذه المرحلة",
      documents: "الوثائق",
      stages: "مراحل المشتريات",
      loading: "جاري التحميل...",
      error: "خطأ في تحميل الوثائق",
      selectStage: "اختر مرحلة لعرض الوثائق",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  if (isLoading) {
    return (
      <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" dir={isRTL ? "rtl" : "ltr"}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t.error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stages Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.stages}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {workflowData?.stages && workflowData.stages.length > 0 ? (
                workflowData.stages.map((stage) => (
                  <button
                    key={stage.folderKey}
                    onClick={() => setSelectedStage(stage.folderKey)}
                    className={`w-full text-${isRTL ? "right" : "left"} px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
                      selectedStage === stage.folderKey
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Folder className="h-4 w-4 flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-medium text-sm">{stage.stageName}</p>
                        <p className="text-xs opacity-75">{stage.documentCount} {t.documents}</p>
                      </div>
                    </div>
                    {selectedStage === stage.folderKey && (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t.selectStage}</p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t.documents}</span>
                  <span className="font-bold text-lg">{workflowData?.totalDocuments || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedStage && workflowData?.stages
                  ? workflowData.stages.find((s) => s.folderKey === selectedStage)?.stageName
                  : t.selectStage}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStage ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : stageDocuments?.documents && stageDocuments.documents.length > 0 ? (
                <div className="space-y-2">
                  {stageDocuments.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.documentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.documentType} • {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          {isRTL ? "تحميل" : "Download"}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Folder className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t.noDocuments}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
