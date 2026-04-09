/**
 * Donor Document Workspace
 * 
 * Displays documents organized by donor relationship lifecycle
 * Manages donor agreements, communications, reports, and compliance documents
 * 
 * Donor Lifecycle:
 * 1. Donor Registration
 * 2. Agreements & MOUs
 * 3. Communications
 * 4. Reports & Proposals
 * 5. Compliance & Audits
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText, Folder, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DonorStage {
  folderKey: string;
  stageName: string;
  documentCount: number;
}

export function DonorDocumentWorkspace() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Mock data for donor document stages
  const donorStages: DonorStage[] = [
    {
      folderKey: "01_Donor_Registration",
      stageName: language === "en" ? "Donor Registration" : "تسجيل المانح",
      documentCount: 0,
    },
    {
      folderKey: "02_Agreements_MOUs",
      stageName: language === "en" ? "Agreements & MOUs" : "الاتفاقيات والبروتوكولات",
      documentCount: 0,
    },
    {
      folderKey: "03_Communications",
      stageName: language === "en" ? "Communications" : "المراسلات",
      documentCount: 0,
    },
    {
      folderKey: "04_Reports_Proposals",
      stageName: language === "en" ? "Reports & Proposals" : "التقارير والمقترحات",
      documentCount: 0,
    },
    {
      folderKey: "05_Compliance_Audits",
      stageName: language === "en" ? "Compliance & Audits" : "الامتثال والتدقيق",
      documentCount: 0,
    },
  ];

  useEffect(() => {
    if (!selectedStage && donorStages.length > 0) {
      setSelectedStage(donorStages[0].folderKey);
    }
  }, [selectedStage]);

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div>
        <h2 className="text-2xl font-bold mb-2">
          {language === "en" ? "Donor Document Lifecycle" : "دورة حياة وثائق المانح"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {language === "en"
            ? "Documents organized by donor relationship stages"
            : "الوثائق منظمة حسب مراحل علاقة المانح"}
        </p>
      </div>

      {/* Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {donorStages.map((stage) => (
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
              {donorStages.find((s) => s.folderKey === selectedStage)?.stageName}
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
