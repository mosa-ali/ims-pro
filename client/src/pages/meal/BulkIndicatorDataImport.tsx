/**
 * ============================================================================
 * BULK INDICATOR DATA IMPORT
 * ============================================================================
 * 
 * CSV/Excel upload for batch data entry into MEAL indicators tracking.
 * 
 * FEATURES:
 * - Project selector dropdown
 * - Download template CSV
 * - Upload CSV/Excel file
 * - Preview parsed data with validation
 * - Map indicator IDs to indicator names
 * - Import with progress and results summary
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, X, Loader2, Info, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@/lib/router-compat';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface ParsedRow {
 indicatorId: number;
 indicatorName?: string;
 reportingPeriod: string;
 periodStartDate: string;
 periodEndDate: string;
 achievedValue: string;
 dataSource?: string;
 notes?: string;
 isValid: boolean;
 errors: string[];
}

interface ImportResult {
 imported: number;
 skipped: number;
 errors: Array<{ row: number; message: string }>;
}

export function BulkIndicatorDataImport() {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 
 const navigate = useNavigate();
 const fileInputRef = useRef<HTMLInputElement>(null);

 const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
 const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
 const [fileName, setFileName] = useState<string>('');
 const [isImporting, setIsImporting] = useState(false);
 const [importResult, setImportResult] = useState<ImportResult | null>(null);
 const [dragOver, setDragOver] = useState(false);

 // Fetch projects
 const { data: projects } = trpc.projects.list.useQuery();

 // Fetch indicators for selected project
 const { data: projectIndicators } = trpc.indicators.getByProject.useQuery(
 { projectId: selectedProjectId! },
 { enabled: !!selectedProjectId }
 );

 // Auto-select first project
 useEffect(() => {
 if (projects && projects.length > 0 && !selectedProjectId) {
 setSelectedProjectId(projects[0].id);
 }
 }, [projects, selectedProjectId]);

 // Bulk import mutation
 const bulkImportMutation = trpc.mealIndicatorData.bulkImport.useMutation({
 onSuccess: (data) => {
 setImportResult(data);
 setIsImporting(false);
 },
 onError: () => {
 setIsImporting(false);
 },
 });

 const indicatorMap = useMemo(() => {
 const map = new Map<number, string>();
 if (projectIndicators) {
 projectIndicators.forEach((ind: any) => {
 map.set(ind.id, isRTL ? (ind.indicatorNameAr || ind.indicatorName) : ind.indicatorName);
 });
 }
 return map;
 }, [projectIndicators, isRTL]);

 const validIndicatorIds = useMemo(() => {
 return new Set(projectIndicators?.map((ind: any) => ind.id) || []);
 }, [projectIndicators]);

 // Download template CSV
 const handleDownloadTemplate = () => {
 if (!projectIndicators || projectIndicators.length === 0) return;

 const headers = ['Indicator ID', 'Indicator Name (Reference)', 'Reporting Period', 'Period Start Date (YYYY-MM-DD)', 'Period End Date (YYYY-MM-DD)', 'Achieved Value', 'Data Source', 'Notes'];
 const rows = projectIndicators.map((ind: any) => [
 ind.id,
 `"${(ind.indicatorName || '').replace(/"/g, '""')}"`,
 '',
 '',
 '',
 '',
 '',
 '',
 ]);

 const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
 const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `indicator_data_template_${selectedProjectId}.csv`;
 link.click();
 URL.revokeObjectURL(url);
 };

 // Parse CSV file
 const parseCSV = (text: string): ParsedRow[] => {
 const lines = text.split('\n').filter(line => line.trim());
 if (lines.length < 2) return [];

 // Skip header row
 const dataLines = lines.slice(1);
 const rows: ParsedRow[] = [];

 for (const line of dataLines) {
 // Simple CSV parsing (handles quoted fields)
 const fields: string[] = [];
 let current = '';
 let inQuotes = false;
 for (let i = 0; i < line.length; i++) {
 const char = line[i];
 if (char === '"') {
 inQuotes = !inQuotes;
 } else if (char === ',' && !inQuotes) {
 fields.push(current.trim());
 current = '';
 } else {
 current += char;
 }
 }
 fields.push(current.trim());

 const indicatorId = parseInt(fields[0] || '');
 const reportingPeriod = fields[2] || '';
 const periodStartDate = fields[3] || '';
 const periodEndDate = fields[4] || '';
 const achievedValue = fields[5] || '';
 const dataSource = fields[6] || '';
 const notes = fields[7] || '';

 const errors: string[] = [];
 if (isNaN(indicatorId)) errors.push(t.bulkIndicatorDataImport.missingField + ': Indicator ID');
 if (!reportingPeriod) errors.push(t.bulkIndicatorDataImport.missingField + ': Reporting Period');
 if (!periodStartDate) errors.push(t.bulkIndicatorDataImport.missingField + ': Period Start Date');
 if (!periodEndDate) errors.push(t.bulkIndicatorDataImport.missingField + ': Period End Date');
 if (!achievedValue || isNaN(parseFloat(achievedValue))) errors.push(t.bulkIndicatorDataImport.invalidNumber + ': Achieved Value');
 if (!isNaN(indicatorId) && !validIndicatorIds.has(indicatorId)) errors.push(t.bulkIndicatorDataImport.indicatorNotFound + ` (ID: ${indicatorId})`);

 rows.push({
 indicatorId,
 indicatorName: indicatorMap.get(indicatorId) || '',
 reportingPeriod,
 periodStartDate,
 periodEndDate,
 achievedValue,
 dataSource: dataSource || undefined,
 notes: notes || undefined,
 isValid: errors.length === 0,
 errors,
 });
 }

 return rows;
 };

 const handleFileUpload = (file: File) => {
 setFileName(file.name);
 setImportResult(null);
 const reader = new FileReader();
 reader.onload = (e) => {
 try {
 const text = e.target?.result as string;
 const rows = parseCSV(text);
 setParsedRows(rows);
 } catch {
 setParsedRows([]);
 }
 };
 reader.readAsText(file);
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setDragOver(false);
 const file = e.dataTransfer.files[0];
 if (file && file.name.endsWith('.csv')) {
 handleFileUpload(file);
 }
 };

 const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) handleFileUpload(file);
 };

 const handleImport = () => {
 if (!selectedProjectId || parsedRows.length === 0) return;
 const validRows = parsedRows.filter(r => r.isValid);
 if (validRows.length === 0) return;

 setIsImporting(true);
 bulkImportMutation.mutate({
 projectId: selectedProjectId,
 entries: validRows.map(r => ({
 indicatorId: r.indicatorId,
 reportingPeriod: r.reportingPeriod,
 periodStartDate: r.periodStartDate,
 periodEndDate: r.periodEndDate,
 achievedValue: r.achievedValue,
 dataSource: r.dataSource,
 notes: r.notes,
 })),
 });
 };

 const handleClear = () => {
 setParsedRows([]);
 setFileName('');
 setImportResult(null);
 if (fileInputRef.current) fileInputRef.current.value = '';
 };

 const validCount = parsedRows.filter(r => r.isValid).length;
 const invalidCount = parsedRows.filter(r => !r.isValid).length;

 return (
 <div className={`min-h-screen bg-gray-50`} dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-7xl mx-auto px-4 py-6">
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/indicators')} label={t.bulkIndicatorDataImport.backToMeal} />

 {/* Header */}
 <div className="mb-6">
 <h1 className="text-2xl font-bold text-gray-900">{t.bulkIndicatorDataImport.title}</h1>
 <p className="text-gray-500 mt-1">{t.bulkIndicatorDataImport.subtitle}</p>
 </div>

 {/* Project Selector */}
 <div className="mb-6">
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.bulkIndicatorDataImport.selectProject}</label>
 <select
 value={selectedProjectId ?? ''}
 onChange={(e) => {
 setSelectedProjectId(e.target.value ? Number(e.target.value) : null);
 handleClear();
 }}
 className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">{t.bulkIndicatorDataImport.selectProjectPlaceholder}</option>
 {projects?.map((p: any) => (
 <option key={p.id} value={p.id}>
 {isRTL ? (p.titleAr || p.title) : p.title}
 </option>
 ))}
 </select>
 </div>

 {!selectedProjectId ? (
 <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
 <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
 <p className="text-gray-500">{t.bulkIndicatorDataImport.noProject}</p>
 </div>
 ) : (
 <div className="space-y-6">
 {/* Step 1: Download Template */}
 <div className="bg-white rounded-xl border border-gray-200 p-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-1">{t.bulkIndicatorDataImport.step1}</h2>
 <p className="text-sm text-gray-500 mb-4">{t.bulkIndicatorDataImport.step1Desc}</p>
 <Button
 onClick={handleDownloadTemplate}
 variant="outline"
 className="gap-2"
 disabled={!projectIndicators || projectIndicators.length === 0}
 >
 <Download className="w-4 h-4" />
 {t.bulkIndicatorDataImport.downloadTemplate}
 </Button>
 {projectIndicators && (
 <p className="text-xs text-gray-400 mt-2">
 {projectIndicators.length} indicators available
 </p>
 )}
 </div>

 {/* Step 2: Upload File */}
 <div className="bg-white rounded-xl border border-gray-200 p-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-1">{t.bulkIndicatorDataImport.step2}</h2>
 <p className="text-sm text-gray-500 mb-4">{t.bulkIndicatorDataImport.step2Desc}</p>

 {!fileName ? (
 <div
 onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
 onDragLeave={() => setDragOver(false)}
 onDrop={handleDrop}
 className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${ dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400' }`}
 >
 <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
 <p className="text-sm text-gray-600">
 {t.bulkIndicatorDataImport.dragDrop}{' '}
 <button
 onClick={() => fileInputRef.current?.click()}
 className="text-blue-600 hover:text-blue-700 font-medium underline"
 >
 {t.bulkIndicatorDataImport.browse}
 </button>
 </p>
 <p className="text-xs text-gray-400 mt-2">{t.bulkIndicatorDataImport.acceptedFormats}</p>
 <input
 ref={fileInputRef}
 type="file"
 accept=".csv"
 onChange={handleFileInput}
 className="hidden"
 />
 </div>
 ) : (
 <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
 <div className="flex items-center gap-3">
 <FileText className="w-5 h-5 text-blue-600" />
 <div>
 <p className="text-sm font-medium text-gray-900">{fileName}</p>
 <p className="text-xs text-gray-500">
 {parsedRows.length} rows &middot; {validCount} valid &middot; {invalidCount} invalid
 </p>
 </div>
 </div>
 <Button variant="outline" size="sm" onClick={handleClear} className="gap-1">
 <Trash2 className="w-3.5 h-3.5" />
 {t.bulkIndicatorDataImport.clearFile}
 </Button>
 </div>
 )}
 </div>

 {/* Step 3: Preview & Import */}
 {parsedRows.length > 0 && !importResult && (
 <div className="bg-white rounded-xl border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h2 className="text-lg font-semibold text-gray-900">{t.bulkIndicatorDataImport.step3}</h2>
 <p className="text-sm text-gray-500">{t.bulkIndicatorDataImport.step3Desc}</p>
 </div>
 <Button
 onClick={handleImport}
 disabled={isImporting || validCount === 0}
 className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
 >
 {isImporting ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 {t.bulkIndicatorDataImport.importing}
 </>
 ) : (
 <>
 <Upload className="w-4 h-4" />
 {t.bulkIndicatorDataImport.importData} ({validCount})
 </>
 )}
 </Button>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className="px-3 py-2 text-start font-medium text-gray-600">{t.bulkIndicatorDataImport.row}</th>
 <th className="px-3 py-2 text-start font-medium text-gray-600">{t.bulkIndicatorDataImport.indicatorId}</th>
 <th className="px-3 py-2 text-start font-medium text-gray-600">{t.bulkIndicatorDataImport.indicatorName}</th>
 <th className="px-3 py-2 text-start font-medium text-gray-600">{t.bulkIndicatorDataImport.reportingPeriod}</th>
 <th className="px-3 py-2 text-start font-medium text-gray-600">{t.bulkIndicatorDataImport.periodStart}</th>
 <th className="px-3 py-2 text-start font-medium text-gray-600">{t.bulkIndicatorDataImport.periodEnd}</th>
 <th className="px-3 py-2 text-start font-medium text-gray-600">{t.bulkIndicatorDataImport.achievedValue}</th>
 <th className="px-3 py-2 text-start font-medium text-gray-600">{t.bulkIndicatorDataImport.validationStatus}</th>
 </tr>
 </thead>
 <tbody>
 {parsedRows.map((row, idx) => (
 <tr key={idx} className={`border-b border-gray-100 ${!row.isValid ? 'bg-red-50' : ''}`}>
 <td className="px-3 py-2 text-gray-500">{idx + 2}</td>
 <td className="px-3 py-2 font-mono text-xs">{row.indicatorId || '-'}</td>
 <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{row.indicatorName || '-'}</td>
 <td className="px-3 py-2">{row.reportingPeriod || '-'}</td>
 <td className="px-3 py-2">{row.periodStartDate || '-'}</td>
 <td className="px-3 py-2">{row.periodEndDate || '-'}</td>
 <td className="px-3 py-2 font-medium">{row.achievedValue || '-'}</td>
 <td className="px-3 py-2">
 {row.isValid ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
 <CheckCircle className="w-3 h-3" />
 {t.bulkIndicatorDataImport.valid}
 </span>
 ) : (
 <div>
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
 <AlertTriangle className="w-3 h-3" />
 {t.bulkIndicatorDataImport.invalid}
 </span>
 <div className="mt-1 text-xs text-red-600">
 {row.errors.map((err, i) => <div key={i}>{err}</div>)}
 </div>
 </div>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Import Results */}
 {importResult && (
 <div className="bg-white rounded-xl border border-gray-200 p-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.bulkIndicatorDataImport.importResults}</h2>
 
 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
 <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
 <p className="text-2xl font-bold text-green-700">{importResult.imported}</p>
 <p className="text-sm text-green-600">{t.bulkIndicatorDataImport.imported}</p>
 </div>
 <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-200">
 <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
 <p className="text-2xl font-bold text-amber-700">{importResult.skipped}</p>
 <p className="text-sm text-amber-600">{t.bulkIndicatorDataImport.skipped}</p>
 </div>
 <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
 <X className="w-6 h-6 text-red-600 mx-auto mb-2" />
 <p className="text-2xl font-bold text-red-700">{importResult.errors.length}</p>
 <p className="text-sm text-red-600">{t.bulkIndicatorDataImport.errors}</p>
 </div>
 </div>

 {/* Status message */}
 <div className={`rounded-lg p-4 mb-4 ${ importResult.skipped === 0 && importResult.errors.length === 0 ? 'bg-green-50 border border-green-200' : importResult.imported > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200' }`}>
 <p className={`text-sm font-medium ${ importResult.skipped === 0 && importResult.errors.length === 0 ? 'text-green-700' : importResult.imported > 0 ? 'text-amber-700' : 'text-red-700' }`}>
 {importResult.skipped === 0 && importResult.errors.length === 0
 ? t.bulkIndicatorDataImport.importSuccess
 : importResult.imported > 0
 ? t.bulkIndicatorDataImport.importPartial
 : t.bulkIndicatorDataImport.importFailed}
 </p>
 </div>

 {/* Error details */}
 {importResult.errors.length > 0 && (
 <div className="mb-4">
 <h3 className="text-sm font-medium text-gray-700 mb-2">{t.bulkIndicatorDataImport.errors}:</h3>
 <div className="space-y-1">
 {importResult.errors.map((err, i) => (
 <div key={i} className="text-xs text-red-600 bg-red-50 rounded px-3 py-1.5">
 Row {err.row}: {err.message}
 </div>
 ))}
 </div>
 </div>
 )}

 <Button onClick={handleClear} className="gap-2">
 <Upload className="w-4 h-4" />
 {t.bulkIndicatorDataImport.importAnother}
 </Button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
}
