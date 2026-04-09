import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Download, FileText, BarChart3, PieChart } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function ExportVisualization() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("pdf");

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: reports, isLoading } = trpc.logistics.reporting.getExportOptions.useQuery({});
  const exportMutation = trpc.logistics.reporting.exportReport.useMutation();

  const handleExport = async (reportType: string, format: string) => {
    await exportMutation.mutateAsync({ reportType, format });
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isRTL ? "rtl" : "ltr"}`}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/organization/logistics/fleet")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isRTL ? "التقارير والتصدير" : "Reports & Export"}</h1>
            <p className="text-gray-600">{isRTL ? "تصدير التقارير والبيانات بصيغ مختلفة" : "Export reports and data in various formats"}</p>
          </div>
        </div>
      </div>

      {/* Export Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "صيغة التصدير" : "Export Format"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {["pdf", "excel", "csv", "json"].map((format) => (
              <Button
                key={format}
                variant={selectedFormat === format ? "default" : "outline"}
                onClick={() => setSelectedFormat(format)}
              >
                {format.toUpperCase()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isRTL ? "التقارير المتاحة" : "Available Reports"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports?.availableReports && reports.availableReports.length > 0 ? (
              reports.availableReports.map((report: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{report.name}</p>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </div>
                  <Button
                    onClick={() => handleExport(report.id, selectedFormat)}
                    disabled={exportMutation.isPending}
                    size="sm"
                  >
                    <Download className="w-4 h-4 me-2" />
                    {exportMutation.isPending ? (isRTL ? "جاري..." : "Exporting...") : (isRTL ? "تصدير" : "Export")}
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد تقارير" : "No reports available"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visualization Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {isRTL ? "خيارات التصور" : "Visualization Options"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <p className="font-semibold">{isRTL ? "مخطط بياني" : "Bar Chart"}</p>
              </div>
              <p className="text-sm text-gray-600 mb-3">{isRTL ? "عرض البيانات على شكل أعمدة" : "Display data as bars"}</p>
              <Button variant="outline" size="sm" onClick={() => handleExport("bar_chart", selectedFormat)}>
                {isRTL ? "إنشاء" : "Generate"}
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-5 h-5 text-green-600" />
                <p className="font-semibold">{isRTL ? "مخطط دائري" : "Pie Chart"}</p>
              </div>
              <p className="text-sm text-gray-600 mb-3">{isRTL ? "عرض النسب المئوية" : "Display percentages"}</p>
              <Button variant="outline" size="sm" onClick={() => handleExport("pie_chart", selectedFormat)}>
                {isRTL ? "إنشاء" : "Generate"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "التقارير المجدولة" : "Scheduled Reports"}</CardTitle>
          <CardDescription>{isRTL ? "التقارير المرسلة تلقائياً" : "Automatically sent reports"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports?.scheduledReports && reports.scheduledReports.length > 0 ? (
              reports.scheduledReports.map((report: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{report.name}</p>
                    <p className="text-sm text-gray-600">{isRTL ? "التكرار" : "Frequency"}: {report.frequency}</p>
                  </div>
                  <Badge variant={report.active ? "default" : "secondary"}>
                    {report.active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد تقارير مجدولة" : "No scheduled reports"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "سجل التصديرات" : "Export History"}</CardTitle>
          <CardDescription>{isRTL ? "آخر 10 تصديرات" : "Last 10 exports"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reports?.exportHistory && reports.exportHistory.length > 0 ? (
              reports.exportHistory.map((exp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div>
                    <p className="font-semibold">{exp.reportName}</p>
                    <p className="text-gray-600">{new Date(exp.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{exp.format.toUpperCase()}</Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد تصديرات" : "No exports"}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
