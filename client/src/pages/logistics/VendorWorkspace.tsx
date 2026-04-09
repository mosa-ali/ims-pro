import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, ChevronRight, FileText, Download } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

interface VendorWorkspaceProps {
  onBack?: () => void;
}

const VENDOR_STAGES = [
  { id: "registration", label: "Registration", labelAr: "التسجيل" },
  { id: "compliance", label: "Compliance", labelAr: "الامتثال" },
  { id: "performance", label: "Performance", labelAr: "الأداء" },
  { id: "contracts", label: "Contracts", labelAr: "العقود" },
  { id: "payments", label: "Payments", labelAr: "المدفوعات" },
];

export function VendorWorkspace({ onBack }: VendorWorkspaceProps) {
  const { language, isRTL } = useLanguage();
  const { organizationId } = useOrganization();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Fetch workflow stages
  const { data: stages = [] } = trpc.vendorDocument.getWorkflowStages.useQuery(
    { organizationId: organizationId || 0 },
    { enabled: !!organizationId }
  );

  // Fetch documents by stage
  const { data: stageDocuments = [] } = trpc.vendorDocument.getByStage.useQuery(
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
    title: language === "ar" ? "إدارة البائعين" : "Vendor Management",
    description: language === "ar" ? "المستندات منظمة حسب مراحل دورة حياة البائع" : "Documents organized by vendor lifecycle stages",
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
                {language === "ar" ? "مراحل البائع" : "Vendor Stages"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {VENDOR_STAGES.map((stage) => (
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
                    ? VENDOR_STAGES.find((s) => s.id === selectedStage)?.labelAr
                    : VENDOR_STAGES.find((s) => s.id === selectedStage)?.label}
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
                          <FileText className="w-5 h-5 text-blue-500" />
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
