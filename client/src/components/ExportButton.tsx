import { Button } from "@/components/ui/button";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface ExportButtonProps {
 onExportWithData: () => void;
 onExportEmptyTemplate: () => void;
 language?: "en" | "ar";
 disabled?: boolean;
 variant?: "default" | "outline" | "secondary" | "ghost";
 size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Unified Export Button Component (System-Wide UX Standard)
 * 
 * Replaces separate "Download Template" and "Export" buttons with a single button
 * that provides dropdown options for:
 * - Export with data (existing records)
 * - Export empty template (headers only, zero data rows)
 * 
 * @param onExportWithData - Callback when user selects "Export with data"
 * @param onExportEmptyTemplate - Callback when user selects "Export empty template"
 * @param language - UI language (en/ar) for bilingual support
 * @param disabled - Whether the button is disabled
 * @param variant - Button style variant
 * @param size - Button size
 */
export function ExportButton({
 onExportWithData,
 onExportEmptyTemplate,
 language = "en",
 disabled = false,
 variant = "outline",
 size = "default",
}: ExportButtonProps) {
 const { t } = useTranslation();
 const labels = {
 en: {
 export: "Export",
 exportWithData: "Export with data",
 exportEmptyTemplate: "Export empty template",
 },
 ar: {
 export: "تصدير",
 exportWithData: "تصدير مع البيانات",
 exportEmptyTemplate: "تصدير قالب فارغ",
 },
 };

 const localT = labels[language];

 return (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant={variant} size={size} disabled={disabled}>
 <Download className="w-4 h-4 me-2" />
 {localT.export}
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align={t.components.end}>
 <DropdownMenuItem onClick={onExportWithData} disabled={disabled}>
 <FileSpreadsheet className="w-4 h-4 me-2" />
 {localT.exportWithData}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={onExportEmptyTemplate} disabled={disabled}>
 <FileText className="w-4 h-4 me-2" />
 {localT.exportEmptyTemplate}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 );
}
