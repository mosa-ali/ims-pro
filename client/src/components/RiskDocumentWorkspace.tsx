/**
 * Risk & Compliance Document Workspace
 * 
 * Displays documents organized by risk management and compliance lifecycle
 * Manages risk assessments, mitigation plans, compliance reports, and audit trails
 * 
 * Risk & Compliance Lifecycle:
 * 1. Risk Identification
 * 2. Risk Assessment
 * 3. Mitigation Plans
 * 4. Compliance Reports
 * 5. Audit Trails
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText, Folder, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RiskStage {
  folderKey: string;
  stageName: string;
  documentCount: number;
}

export function RiskDocumentWorkspace() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Mock data for risk & compliance document stages
  const riskStages: RiskStage[] = [
    {
      folderKey: "01_Risk_Identification",
      stageName: language === "en" ? "Risk Identification" : "تحديد المخاطر",
      documentCount: 0,
    },
    {
      folderKey: "02_Risk_Assessment",
      stageName: language === "en" ? "Risk Assessment" : "تقييم المخاطر",
      documentCount: 0,
    },
    {
      folderKey: "03_Mitigation_Plans",
      stageName: language === "en" ? "Mitigation Plans" : "خطط التخفيف",
      documentCount: 0,
    },
    {
      folderKey: "04_Compliance_Reports",
      stageName: language === "en" ? "Compliance Reports" : "تقارير الامتثال",
      documentCount: 0,
    },
    {
      folderKey: "05_Audit_Trails",
      stageName: language === "en" ? "Audit Trails" : "مسارات التدقيق",
      documentCount: 0,
    },
  ];

  useEffect(() => {
    if (!selectedStage && riskStages.length > 0) {
      setSelectedStage(riskStages[0].folderKey);
    }
  }, [selectedStage]);

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div>
        <h2 className="text-2xl font-bold mb-2">
          {language === "en" ? "Risk & Compliance Lifecycle" : "دورة حياة المخاطر والامتثال"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {language === "en"
            ? "Documents organized by risk management and compliance stages"
            : "الوثائق منظمة حسب مراحل إدارة المخاطر والامتثال"}
        </p>
      </div>

      {/* Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {riskStages.map((stage) => (
          <Card
            key={stage.folderKey}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedStage === stage.folderKey ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedStage(stage.folderKey)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Folder className="w-4 h-4" />
                {stage.stageName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stage.documentCount}</p>
              <p className="text-xs text-muted-foreground">
                {language === "en" ? "documents" : "وثائق"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents List */}
      {selectedStage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {riskStages.find((s) => s.folderKey === selectedStage)?.stageName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>
                {language === "en"
                  ? "No documents in this stage"
                  : "لا توجد وثائق في هذه المرحلة"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
