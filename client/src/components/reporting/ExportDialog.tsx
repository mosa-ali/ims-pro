import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTypes: Array<{ value: string; label: string }>;
  onExport: (options: ExportOptions) => Promise<void>;
  isLoading?: boolean;
}

export interface ExportOptions {
  format: "pdf" | "excel";
  reportType: string;
  title: string;
  organizationName: string;
  includeCharts: boolean;
  includeSummary: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  filters?: Record<string, any>;
}

export function ExportDialog({

  open,
  onOpenChange,
  reportTypes,
  onExport,
  isLoading = false,
}: ExportDialogProps) {
  const { language, isRTL } = useLanguage();
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [reportType, setReportType] = useState(reportTypes[0]?.value || "");
  const [title, setTitle] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const translations = {
    en: {
      title: "Export Report",
      description: "Configure and export your fleet report",
      format: "Export Format",
      reportType: "Report Type",
      reportTitle: "Report Title",
      organizationName: "Organization Name",
      options: "Report Options",
      includeCharts: "Include Charts",
      includeSummary: "Include Summary",
      dateRange: "Date Range",
      from: "From",
      to: "To",
      export: "Export",
      cancel: "Cancel",
      pdf: "PDF Document",
      excel: "Excel Spreadsheet",
    },
    ar: {
      title: "تصدير التقرير",
      description: "قم بتكوين وتصدير تقرير الأسطول الخاص بك",
      format: "صيغة التصدير",
      reportType: "نوع التقرير",
      reportTitle: "عنوان التقرير",
      organizationName: "اسم المنظمة",
      options: "خيارات التقرير",
      includeCharts: "تضمين الرسوم البيانية",
      includeSummary: "تضمين الملخص",
      dateRange: "نطاق التاريخ",
      from: "من",
      to: "إلى",
      export: "تصدير",
      cancel: "إلغاء",
      pdf: "وثيقة PDF",
      excel: "جدول بيانات Excel",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const handleExport = async () => {
    const options: ExportOptions = {
      format,
      reportType,
      title: title || reportTypes.find((rt) => rt.value === reportType)?.label || "",
      organizationName,
      includeCharts,
      includeSummary,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    try {
      await onExport(options);
      onOpenChange(false);
      // Reset form
      setFormat("pdf");
      setReportType(reportTypes[0]?.value || "");
      setTitle("");
      setOrganizationName("");
      setIncludeCharts(true);
      setIncludeSummary(true);
      setDateFrom("");
      setDateTo("");
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t.format}</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as "pdf" | "excel")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">
                  {t.pdf}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="font-normal cursor-pointer">
                  {t.excel}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="report-type">{t.reportType}</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Report Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t.reportTitle}</Label>
            <input
              id="title"
              type="text"
              placeholder={t.reportTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            />
          </div>

          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="org-name">{t.organizationName}</Label>
            <input
              id="org-name"
              type="text"
              placeholder={t.organizationName}
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            />
          </div>

          {/* Report Options */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t.options}</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="charts"
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                />
                <Label htmlFor="charts" className="font-normal cursor-pointer">
                  {t.includeCharts}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="summary"
                  checked={includeSummary}
                  onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                />
                <Label htmlFor="summary" className="font-normal cursor-pointer">
                  {t.includeSummary}
                </Label>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t.dateRange}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="date-from" className="text-xs">
                  {t.from}
                </Label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-to" className="text-xs">
                  {t.to}
                </Label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button onClick={handleExport} disabled={isLoading || !reportType}>
            {isLoading ? "Exporting..." : t.export}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
