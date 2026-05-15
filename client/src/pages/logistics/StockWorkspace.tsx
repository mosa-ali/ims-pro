import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, ChevronRight, FileText, Download } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

interface StockWorkspaceProps {
  onBack?: () => void;
}

const STOCK_STAGES = [
  { id: "receipts", label: "Receipts", labelAr: "الإيصالات" },
  { id: "transfers", label: "Transfers", labelAr: "التحويلات" },
  { id: "inventory", label: "Inventory Reports", labelAr: "تقارير المخزون" },
  { id: "adjustments", label: "Adjustments", labelAr: "التعديلات" },
  { id: "audits", label: "Audits", labelAr: "التدقيقات" },
];

export function StockWorkspace({ onBack }: StockWorkspaceProps) {
  const { language, isRTL } = useLanguage();
  const { currentOrganization } = useOrganization();
 const brandingQuery = trpc.settings.branding.get.useQuery();
 const branding = brandingQuery.data;
 const organizationId = currentOrganization?.id;
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Fetch workflow stages
  const { data: stages = [] } = trpc.stockDocument.getWorkflowStages.useQuery(
    { organizationId: currentOrganization?.id || 0 },
    { enabled: !!organizationId }
  );

  // Fetch documents by stage
  const { data: stageDocuments = [] } = trpc.stockDocument.getByStage.useQuery(
    { stage: selectedStage || "", organizationId: organizationId || 0 },
    { enabled: !!selectedStage && !!organizationId }
  );

  // Calculate stage statistics
  const stageStats = useMemo(() => {
    const stats: Record<string, number> = {};
    stages.forEach((stage: any) => {
      stats[stage.id] = stage.documentCount || 0;
    });
    return stats;
  }, [stages]);

  const totalDocuments = Object.values(stageStats).reduce((a: number, b: number) => a + b, 0);

  const t = {
    title: language === "ar" ? "إدارة المخزون" : "Stock Management",
    description: language === "ar" ? "المستندات منظمة حسب مراحل دورة حياة المخزون" : "Documents organized by stock lifecycle stages",
    noDocuments: language === "ar" ? "لا توجد مستندات في هذه المرحلة" : "No documents in this stage",
    documents: language === "ar" ? "المستندات" : "Documents",
  };

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-600 mt-2">{t.description}</p>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            {language === "ar" ? "العودة" : "Back"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Stages Sidebar */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {language === "ar" ? "مراحل المخزون" : "Stock Stages"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {STOCK_STAGES.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedStage === stage.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {language === "ar" ? stage.labelAr : stage.label}
                      </p>
                      <p className="text-sm text-gray-500">
                        {stageStats[stage.id] || 0} {t.documents}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{totalDocuments}</p>
                <p className="text-sm text-gray-600 mt-2">{t.documents}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents View */}
        <div className="col-span-2">
          {selectedStage ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === "ar"
                    ? STOCK_STAGES.find((s) => s.id === selectedStage)?.labelAr
                    : STOCK_STAGES.find((s) => s.id === selectedStage)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stageDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {stageDocuments.map((doc: any) => (
                      <div
                        key={doc.documentId}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.fileName}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{doc.documentType}</Badge>
                          {doc.filePath && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(doc.filePath, "_blank")}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">{t.noDocuments}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-gray-500">
                  {language === "ar"
                    ? "اختر مرحلة لعرض المستندات"
                    : "Select a stage to view documents"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
