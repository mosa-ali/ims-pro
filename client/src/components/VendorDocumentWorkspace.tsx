/**
 * Vendor Document Workspace
 * 
 * Displays documents organized by the 5-stage vendor lifecycle
 * Automatically routes documents as vendors progress through workflow stages
 * 
 * Vendor Lifecycle:
 * 1. Vendor Registration
 * 2. Compliance Documents
 * 3. Performance Reports
 * 4. Contracts
 * 5. Payment Records
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText, Folder, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VendorStage {
  folderKey: string;
  stageName: string;
  documentCount: number;
}

export function VendorDocumentWorkspace() {  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Fetch workflow stages with document counts
  const { data: workflowData, isLoading, error } = trpc.vendorDocument.getWorkflowStages.useQuery(
    {},
    {
      enabled: !!user,
    }
  );

  // Fetch documents for selected stage
  const { data: stageDocuments, isLoading: isLoadingStage } =
    trpc.vendorDocument.getByStage.useQuery(
      {
        stage: selectedStage || "01_Vendor_Registration",
      },
      {
        enabled: !!user && !!selectedStage,
      }
    );

  useEffect(() => {
    if (workflowData?.length > 0) {
      setSelectedStage(workflowData[0].stage);
    }
  }, [workflowData]);

  const translations = {
    en: {
      title: "Vendor Document Workflow",
      description: "Documents organized by vendor lifecycle stages",
      noDocuments: "No documents in this stage",
      documents: "Documents",
      stages: "Vendor Stages",
      loading: "Loading...",
      error: "Error loading documents",
      selectStage: "Select a stage to view documents",
    },
    ar: {
      title: "سير العمل الوثائقي للمورد",
      description: "وثائق منظمة حسب مراحل دورة حياة المورد",
      noDocuments: "لا توجد وثائق في هذه المرحلة",
      documents: "الوثائق",
      stages: "مراحل المورد",
      loading: "جاري التحميل...",
      error: "خطأ في تحميل الوثائق",
      selectStage: "اختر مرحلة لعرض الوثائق",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const getStageDisplayName = (stage: string) => {
    const stageNames: Record<string, { en: string; ar: string }> = {
      "01_Vendor_Registration": { en: "Vendor Registration", ar: "تسجيل المورد" },
      "02_Compliance_Documents": { en: "Compliance Documents", ar: "وثائق الامتثال" },
      "03_Performance_Reports": { en: "Performance Reports", ar: "تقارير الأداء" },
      "04_Contracts": { en: "Contracts", ar: "العقود" },
      "05_Payment_Records": { en: "Payment Records", ar: "سجلات الدفع" },
    };
    const names = stageNames[stage];
    return names ? names[language as keyof typeof names] : stage;
  };

  if (error || !workflowData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error ? t.error : 'No workflow data available'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground">{t.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stages Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.stages}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : (
                workflowData?.map((stage: any) => (
                  <button
                    key={stage.stage}
                    onClick={() => setSelectedStage(stage.stage)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedStage === stage.stage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <div className="font-medium">{getStageDisplayName(stage.stage)}</div>
                    <div className="text-sm opacity-75">{stage.documentCount} {t.documents}</div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Documents View */}
        <div className="lg:col-span-3">
          {!selectedStage ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">{t.selectStage}</p>
              </CardContent>
            </Card>
          ) : isLoadingStage ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : stageDocuments && stageDocuments.length > 0 ? (
            <div className="space-y-4">
              {stageDocuments.map((doc: any) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{doc.fileName}</h3>
                          <p className="text-sm text-muted-foreground truncate">{doc.description}</p>
                          <div className="text-xs text-muted-foreground mt-2">
                            {new Date(doc.createdAt).toLocaleDateString(
                              language === "ar" ? "ar-SA" : "en-US"
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">{t.noDocuments}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
