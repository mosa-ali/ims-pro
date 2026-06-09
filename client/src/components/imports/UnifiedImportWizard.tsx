/**
 * ============================================================================
 * UNIFIED IMPORT WIZARD - SYSTEM-WIDE STANDARD
 * ============================================================================
 * 
 * PURPOSE: Single, standardized Excel import flow for ALL modules
 * 
 * CRITICAL REQUIREMENTS:
 * - ONE wizard for entire system (no module-specific variants)
 * - 3-step process: File Selection → Settings & Preview → Results
 * - Full RTL/LTR support with proper mirroring
 * - Smart Import logic with duplicate detection
 * - Module-agnostic, project-aware
 * 
 * APPLIES TO:
 * - Activities, Tasks, Beneficiaries, Indicators, Case Management
 * - Finance Overview, Forecast Plan, Procurement Plan
 * - Active Grants, MEAL, and ALL future modules
 * 
 * ❌ NO module-specific import designs allowed
 * ❌ NO one-click/blind import allowed
 * ❌ NO different behaviors per module
 * 
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import { 
 X, 
 Upload, 
 FileText, 
 AlertCircle, 
 CheckCircle, 
 Info,
 ChevronRight,
 ChevronLeft,
 FileSpreadsheet
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';

export type ImportModule = 
 | 'activities'
 | 'tasks'
 | 'beneficiaries'
 | 'indicators'
 | 'case-management'
 | 'finance-overview'
 | 'forecast-plan'
 | 'procurement-plan'
 | 'active-grants'
 | 'meal'
 | 'chart-of-accounts'
 | 'budgets'
 | 'expenditures';

interface ImportWizardProps {
 isOpen: boolean;
 onClose: () => void;
 module: ImportModule;
 projectId?: string;
 projectCode?: string;
 projectName?: string;
 onImportComplete?: (result: ImportResult) => void;
}

interface ImportResult {
 importId: string;
 totalRows: number;
 inserted: number;
 updated: number;
 skipped: number;
 failed: number;
 errors: Array<{ row: number; error: string }>;
}

interface PreviewSummary {
 totalRows: number;
 toInsert: number;
 toUpdate: number;
 toSkip: number;
 failed: number;
 failureReasons: Array<{ reason: string; count: number }>;
}

type WizardStep = 'file-selection' | 'settings-preview' | 'results';

export function UnifiedImportWizard({
 isOpen,
 onClose,
 module,
 projectId,
 projectCode,
 projectName,
 onImportComplete
}: ImportWizardProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();

 const [currentStep, setCurrentStep] = useState<WizardStep>('file-selection');
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [allowDuplicates, setAllowDuplicates] = useState(false);
 const [previewSummary, setPreviewSummary] = useState<PreviewSummary | null>(null);
 const [importResult, setImportResult] = useState<ImportResult | null>(null);
 const [isProcessing, setIsProcessing] = useState(false);
 const [uploadError, setUploadError] = useState<string | null>(null);

 // Translations
 const labels = {
 // Wizard title
 wizardTitle: t.components.importFromExcel,
 
 // Module names
 moduleNames: {
 'activities': t.components.activities,
 'tasks': t.components.tasksManagement,
 'beneficiaries': t.components.beneficiaries,
 'indicators': t.components.indicators,
 'case-management': t.components.caseManagement,
 'finance-overview': t.components.financeOverview,
 'forecast-plan': t.components.forecastPlan,
 'procurement-plan': t.components.procurementPlan,
 'active-grants': t.components.activeGrants,
 'meal': language === 'en' ? 'MEAL' : 'MEAL',
 'chart-of-accounts': t.components.chartOfAccounts,
 'budgets': t.components.budgets,
 'expenditures': t.components.expenditures
 },
 
 // Step 1: File Selection
 selectFile: t.components.selectExcelFile,
 dragDrop: t.components.dragAndDropYourExcelFile,
 supportedFormats: t.components.supportedFormatsXlsxXlsMax10mb,
 fileSelected: t.components.fileSelected,
 changeFile: t.components.changeFile,
 
 // Step 2: Settings & Preview
 importSettings: t.components.importSettings,
 fileSummary: t.components.fileSummary,
 fileName: t.components.fileName,
 fileSize: t.components.fileSize,
 module: t.components.module,
 project: t.components.project,
 uploadedBy: t.components.uploadedBy,
 uploadedAt: t.components.uploadedAt,
 
 duplicateSettings: t.components.duplicateDataSettings,
 allowDuplicates: t.components.allowDuplicates,
 allowDuplicatesDesc: language === 'en' 
 ? 'Import records even if they already exist' 
 : 'استيراد السجلات حتى لو كانت موجودة بالفعل',
 
 smartImportLogic: t.components.smartImportLogic,
 smartImportDesc: language === 'en'
 ? 'The system automatically detects existing records and intelligently decides whether to insert new records or update existing ones based on unique identifiers.'
 : 'يكتشف النظام السجلات الموجودة تلقائياً ويقرر بذكاء ما إذا كان سيتم إدراج سجلات جديدة أو تحديث السجلات الموجودة بناءً على المعرفات الفريدة.',
 
 previewSummary: t.components.previewSummary,
 totalRows: t.components.totalRowsDetected,
 rowsToInsert: t.components.rowsToInsert,
 rowsToUpdate: t.components.rowsToUpdate,
 rowsToSkip: t.components.rowsToSkip,
 rowsFailed: t.components.rowsFailedValidation,
 
 reviewMessage: language === 'en'
 ? 'Review the settings and click "Finish Import" to proceed.'
 : 'راجع الإعدادات وانقر على "إنهاء الاستيراد" للمتابعة.',
 
 // Step 3: Results
 importComplete: t.components.importComplete,
 importSuccess: t.components.importCompletedSuccessfully,
 importId: t.components.importId,
 recordsInserted: t.components.recordsInserted,
 recordsUpdated: t.components.recordsUpdated,
 recordsSkipped: t.components.recordsSkipped,
 recordsFailed: t.components.recordsFailed,
 viewHistory: t.components.viewImportHistory,
 
 // Actions
 cancel: t.components.cancel,
 next: t.components.next,
 back: t.components.back,
 finishImport: t.components.finishImport,
 close: t.components.close,
 
 // Errors
 fileRequired: t.components.pleaseSelectAFile,
 invalidFileType: t.components.invalidFileTypePleaseUploadXlsx,
 fileTooLarge: t.components.fileSizeExceeds10mb,
 uploadFailed: t.components.uploadFailedPleaseTryAgain
 };

 // Reset wizard
 const resetWizard = useCallback(() => {
 setCurrentStep('file-selection');
 setSelectedFile(null);
 setAllowDuplicates(false);
 setPreviewSummary(null);
 setImportResult(null);
 setUploadError(null);
 }, []);

 // Handle file selection
 const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 // Validate file
 const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
 if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
 setUploadError(t.invalidFileType);
 return;
 }

 if (file.size > 10 * 1024 * 1024) {
 setUploadError(t.fileTooLarge);
 return;
 }

 setSelectedFile(file);
 setUploadError(null);
 };

 // Process file and generate preview
 const generatePreview = async () => {
 if (!selectedFile) return;

 setIsProcessing(true);
 
 // Simulate processing
 await new Promise(resolve => setTimeout(resolve, 1500));

 // Mock preview data
 const mockPreview: PreviewSummary = {
 totalRows: 52,
 toInsert: 35,
 toUpdate: 12,
 toSkip: allowDuplicates ? 0 : 3,
 failed: 2,
 failureReasons: [
 { reason: 'Missing required field: Title', count: 1 },
 { reason: 'Invalid date format', count: 1 }
 ]
 };

 setPreviewSummary(mockPreview);
 setIsProcessing(false);
 setCurrentStep('settings-preview');
 };

 // Execute import
 const executeImport = async () => {
 if (!selectedFile || !previewSummary) return;

 setIsProcessing(true);

 // Simulate import execution
 await new Promise(resolve => setTimeout(resolve, 2000));

 const result: ImportResult = {
 importId: `IMP-${Date.now()}`,
 totalRows: previewSummary.totalRows,
 inserted: previewSummary.toInsert,
 updated: previewSummary.toUpdate,
 skipped: previewSummary.toSkip,
 failed: previewSummary.failed,
 errors: previewSummary.failureReasons.map((fr, idx) => ({
 row: idx + 1,
 error: fr.reason
 }))
 };

 setImportResult(result);
 setIsProcessing(false);
 setCurrentStep('results');

 if (onImportComplete) {
 onImportComplete(result);
 }
 };

 // Handle close
 const handleClose = () => {
 resetWizard();
 onClose();
 };

 // Format file size
 const formatFileSize = (bytes: number) => {
 if (bytes < 1024) return `${bytes} B`;
 if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
 return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
 {/* Header */}
 <div className={`flex items-center justify-between p-6 border-b`}>
 <h2 className="text-2xl font-bold text-gray-900">{labels.wizardTitle}</h2>
 <button
 onClick={handleClose}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-6">
 {/* STEP 1: File Selection */}
 {currentStep === 'file-selection' && (
 <div className="space-y-6">
 <div className={'text-start'}>
 <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.selectFile}</h3>
 <p className="text-sm text-gray-600">
 {labels.moduleNames[module]} {projectCode && `• ${projectCode}`}
 </p>
 </div>

 {!selectedFile ? (
 <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
 <input
 type="file"
 accept=".xlsx,.xls"
 onChange={handleFileSelect}
 className="hidden"
 id="file-upload"
 />
 <label htmlFor="file-upload" className="cursor-pointer">
 <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
 <p className="text-base text-gray-700 mb-2">{t.dragDrop}</p>
 <p className="text-sm text-gray-500">{t.supportedFormats}</p>
 </label>
 </div>
 ) : (
 <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3`}>
 <FileSpreadsheet className="w-8 h-8 text-blue-600 flex-shrink-0" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-semibold text-gray-900">{selectedFile.name}</p>
 <p className="text-xs text-gray-600">{formatFileSize(selectedFile.size)}</p>
 </div>
 <button
 onClick={() => setSelectedFile(null)}
 className="text-sm text-blue-600 hover:text-blue-700 font-medium"
 >
 {t.changeFile}
 </button>
 </div>
 )}

 {uploadError && (
 <div className={`bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2`}>
 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-red-700">{uploadError}</p>
 </div>
 )}
 </div>
 )}

 {/* STEP 2: Settings & Preview */}
 {currentStep === 'settings-preview' && (
 <div className="space-y-6">
 {/* File Summary Card */}
 <div className="bg-gray-50 rounded-lg p-4 space-y-3">
 <h3 className="text-base font-semibold text-gray-900">{t.fileSummary}</h3>
 <div className="grid grid-cols-2 gap-3 text-sm">
 <div>
 <span className="text-gray-600">{t.fileName}:</span>
 <p className="font-medium text-gray-900 mt-0.5">{selectedFile?.name}</p>
 </div>
 <div>
 <span className="text-gray-600">{t.fileSize}:</span>
 <p className="font-medium text-gray-900 mt-0.5">{selectedFile && formatFileSize(selectedFile.size)}</p>
 </div>
 <div>
 <span className="text-gray-600">{t.module}:</span>
 <p className="font-medium text-gray-900 mt-0.5">{labels.moduleNames[module]}</p>
 </div>
 {projectCode && (
 <div>
 <span className="text-gray-600">{t.project}:</span>
 <p className="font-medium text-gray-900 mt-0.5">{projectCode}</p>
 </div>
 )}
 <div>
 <span className="text-gray-600">{t.uploadedBy}:</span>
 <p className="font-medium text-gray-900 mt-0.5">{user?.name || 'User'}</p>
 </div>
 <div>
 <span className="text-gray-600">{t.uploadedAt}:</span>
 <p className="font-medium text-gray-900 mt-0.5">
 {new Date().toLocaleString(t.components.en)}
 </p>
 </div>
 </div>
 </div>

 {/* Duplicate Settings */}
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <h3 className="text-base font-semibold text-gray-900 mb-3">{t.duplicateSettings}</h3>
 <div className={`flex items-start gap-3`}>
 <div className="flex-1">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={allowDuplicates}
 onChange={(e) => setAllowDuplicates(e.target.checked)}
 className="w-5 h-5 text-blue-600 rounded"
 />
 <div>
 <span className="text-sm font-medium text-gray-900">{t.allowDuplicates}</span>
 <p className="text-xs text-gray-600 mt-0.5">{t.allowDuplicatesDesc}</p>
 </div>
 </label>
 </div>
 </div>
 </div>

 {/* Smart Import Logic */}
 <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 text-start`}>
 <div className={`flex items-start gap-2`}>
 <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div>
 <h4 className="text-sm font-semibold text-blue-900 mb-1">{t.smartImportLogic}</h4>
 <p className="text-sm text-blue-700 leading-relaxed">{t.smartImportDesc}</p>
 </div>
 </div>
 </div>

 {/* Preview Summary */}
 {previewSummary && (
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <h3 className="text-base font-semibold text-gray-900 mb-3">{t.previewSummary}</h3>
 <div className="space-y-2">
 <div className={`flex justify-between items-center`}>
 <span className="text-sm text-gray-600">{t.totalRows}</span>
 <span className="text-sm font-semibold text-gray-900">{previewSummary.totalRows}</span>
 </div>
 <div className={`flex justify-between items-center`}>
 <span className="text-sm text-gray-600">{t.rowsToInsert}</span>
 <span className="text-sm font-semibold text-green-700">{previewSummary.toInsert}</span>
 </div>
 <div className={`flex justify-between items-center`}>
 <span className="text-sm text-gray-600">{t.rowsToUpdate}</span>
 <span className="text-sm font-semibold text-blue-700">{previewSummary.toUpdate}</span>
 </div>
 <div className={`flex justify-between items-center`}>
 <span className="text-sm text-gray-600">{t.rowsToSkip}</span>
 <span className="text-sm font-semibold text-gray-700">{previewSummary.toSkip}</span>
 </div>
 {previewSummary.failed > 0 && (
 <div className={`flex justify-between items-center`}>
 <span className="text-sm text-gray-600">{t.rowsFailed}</span>
 <span className="text-sm font-semibold text-red-700">{previewSummary.failed}</span>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Review Message */}
 <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2`}>
 <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-blue-700">{t.reviewMessage}</p>
 </div>
 </div>
 )}

 {/* STEP 3: Results */}
 {currentStep === 'results' && importResult && (
 <div className="space-y-6">
 {/* Success Banner */}
 <div className={`bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3`}>
 <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
 <div className={`flex-1 text-start`}>
 <h3 className="text-lg font-semibold text-green-900 mb-1">{t.importSuccess}</h3>
 <p className="text-sm text-green-700">
 {t.importId}: <span className="font-mono font-semibold">{importResult.importId}</span>
 </p>
 </div>
 </div>

 {/* Results Summary */}
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <h3 className="text-base font-semibold text-gray-900 mb-4">{t.previewSummary}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-gray-50 rounded-lg p-3 text-center">
 <div className="text-2xl font-bold text-gray-900">{importResult.totalRows}</div>
 <div className="text-sm text-gray-600 mt-1">{t.totalRows}</div>
 </div>
 <div className="bg-green-50 rounded-lg p-3 text-center">
 <div className="text-2xl font-bold text-green-700">{importResult.inserted}</div>
 <div className="text-sm text-gray-600 mt-1">{t.recordsInserted}</div>
 </div>
 <div className="bg-blue-50 rounded-lg p-3 text-center">
 <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
 <div className="text-sm text-gray-600 mt-1">{t.recordsUpdated}</div>
 </div>
 <div className="bg-gray-100 rounded-lg p-3 text-center">
 <div className="text-2xl font-bold text-gray-700">{importResult.skipped}</div>
 <div className="text-sm text-gray-600 mt-1">{t.recordsSkipped}</div>
 </div>
 {importResult.failed > 0 && (
 <div className="bg-red-50 rounded-lg p-3 text-center col-span-2">
 <div className="text-2xl font-bold text-red-700">{importResult.failed}</div>
 <div className="text-sm text-gray-600 mt-1">{t.recordsFailed}</div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Footer Actions */}
 <div className={`border-t p-6 flex items-center justify-between`}>
 {currentStep === 'file-selection' && (
 <>
 <button
 onClick={handleClose}
 className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
 >
 {t.cancel}
 </button>
 <button
 onClick={generatePreview}
 disabled={!selectedFile || isProcessing}
 className={`flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`} data-back-nav>
 <span>{isProcessing ? (t.components.processing) : t.next}</span>
 {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
 </button>
 </>
 )}

 {currentStep === 'settings-preview' && (
 <>
 <button
 onClick={() => setCurrentStep('file-selection')}
 className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors`}
 >
 {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
 <span>{t.back}</span>
 </button>
 <button
 onClick={executeImport}
 disabled={isProcessing}
 className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isProcessing ? (t.components.importing) : t.finishImport}
 </button>
 </>
 )}

 {currentStep === 'results' && (
 <>
 <div></div>
 <button
 onClick={handleClose}
 className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
 >
 {t.close}
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 );
}
