/**
 * ============================================================================
 * MEAL DOCUMENTS TAB - Central Document View
 * ============================================================================
 * 
 * Filtered view of MEAL-specific documents from Central Document Service
 * 
 * FEATURES:
 * - Auto-generated folder structure (read-only)
 * - System-generated documents from all MEAL tabs
 * - Versioning support
 * - No manual folder creation
 * - No standalone uploads (all uploads through source tabs)
 * - Bilingual support (EN/AR) with full RTL
 * - Accessibility-compliant text sizes
 * - SharePoint/OneDrive sync integration
 * 
 * FOLDER STRUCTURE (AUTO-CREATED):
 * /Documents/Projects/[Project]/MEAL
 * /01_Indicators (تتبع المؤشرات)
 * /02_Surveys (الاستبيانات)
 * /03_Reports (التقارير)
 * /04_Accountability (المساءلة)
 * /99_Other (أخرى)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from 'wouter';
import { 
 Folder, 
 FolderOpen, 
 File, 
 FileText, 
 Download, 
 Eye,
 ChevronRight,
 ChevronDown,
 Lock,
 Clock,
 AlertCircle,
 CheckCircle,
 Upload,
 Cloud,
 RefreshCw,
 ArrowRight,
 History,
 ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@/lib/router-compat';
import { documentService, type DocumentFile, type FolderNode } from '@/services/documentService';
import { SharePointSyncService, type SyncConfiguration } from '@/services/SharePointSyncService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function Documents() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 
 const projectId = searchParams.get('projectId') || '';
 const projectCode = searchParams.get('projectCode') || 'PROJECT';
 const projectName = searchParams.get('projectName') || 'Project';

 const [folderTree, setFolderTree] = useState<FolderNode | null>(null);
 const [selectedFolderId, setSelectedFolderId] = useState<string>('');
 const [documents, setDocuments] = useState<DocumentFile[]>([]);
 const [loading, setLoading] = useState(true);
 const [showSyncPanel, setShowSyncPanel] = useState(false);
 const [showFlowDiagram, setShowFlowDiagram] = useState(false);
 const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
 const [syncConfig, setSyncConfig] = useState<SyncConfiguration | null>(null);
 const [syncing, setSyncing] = useState(false);

 const labels = {
 title: t.mealDocuments.mealDocuments,
 subtitle: t.mealDocuments.documentsSubtitle,
 folderTree: t.mealDocuments.folderStructure,
 documents: t.mealDocuments.documents,
 noDocuments: t.mealDocuments.noDocumentsInThisFolder,
 systemGenerated: t.mealDocuments.systemGenerated,
 autoSynced: t.mealDocuments.autosynced,
 readOnly: t.mealDocuments.readOnly,
 version: t.mealDocuments.version,
 source: t.mealDocuments.source,
 uploadedBy: t.mealDocuments.uploadedBy,
 uploadedAt: t.mealDocuments.uploadedAt,
 download: t.mealDocuments.download,
 preview: t.mealDocuments.preview,
 uploadDisabled: t.mealDocuments.uploadNotAllowed,
 uploadDisabledTooltip: 'Documents are auto-generated from MEAL tabs only. Upload through Indicators, Surveys, Reports, or Accountability tabs.',
 
 // Folder names
 indicators: t.mealDocuments.indicators,
 surveys: t.mealDocuments.surveys,
 reports: t.mealDocuments.reports,
 accountability: t.mealDocuments.accountability,
 other: t.mealDocuments.other,

 // Info messages
 infoTitle: t.mealDocuments.aboutMealDocuments,
 infoMessage: 'Documents are automatically synced from Indicators, Surveys, Reports, and Accountability tabs. Upload documents through their respective tabs, not here.',
 
 noFolders: 'No MEAL folder structure found for this project',
 
 // SharePoint/OneDrive
 cloudSync: t.mealDocuments.cloudSync,
 syncToCloud: t.mealDocuments.syncToSharepointonedrive,
 syncStatus: t.mealDocuments.syncStatus,
 notSynced: t.mealDocuments.notSynced,
 synced: t.mealDocuments.synced,
 syncing: t.mealDocuments.syncing,
 
 // Tab-Folder Flow
 viewFlow: t.mealDocuments.viewDocumentFlow,
 hideFlow: t.mealDocuments.hideFlow,
 flowTitle: t.mealDocuments.mealTabFolderAutosyncFlow,
 flowDescription: 'Each MEAL tab automatically saves documents to its designated folder. Users cannot upload directly to these folders.',
 
 // Version History
 versionHistory: t.mealDocuments.versionHistory,
 showVersions: t.mealDocuments.showVersions,
 hideVersions: t.mealDocuments.hideVersions,
 noVersionHistory: t.mealDocuments.noVersionHistoryAvailable,
 };

 // Initialize/load folder structure and documents
 useEffect(() => {
 if (!projectId) {
 setLoading(false);
 return;
 }

 try {
 // Check if MEAL folders exist, if not create them
 let mealFolders = documentService.getProjectMEALFolders(projectId);
 
 if (!mealFolders) {
 // Auto-create MEAL folder structure
 console.log('Creating MEAL folder structure for project:', projectId);
 documentService.createMEALFolderStructure(projectId, projectCode, projectName);
 
 // Initialize sample data for demo
 if (process.env.NODE_ENV === 'development') {
 documentService.initializeSampleData(projectId, projectCode, projectName);
 }
 }

 // Load folder tree
 const tree = documentService.getFolderTree();
 setFolderTree(tree);

 // Auto-select first MEAL folder if available
 if (mealFolders && !selectedFolderId) {
 setSelectedFolderId(mealFolders.indicators);
 }

 // Load all MEAL documents for this project
 const allDocs = documentService.getAllMEALDocuments(projectId);
 setDocuments(allDocs);

 } catch (error) {
 console.error('Error initializing MEAL documents:', error);
 } finally {
 setLoading(false);
 }
 }, [projectId, projectCode, projectName]);

 // Load documents when folder selection changes
 useEffect(() => {
 if (selectedFolderId) {
 const folderDocs = documentService.getDocumentsInFolder(selectedFolderId);
 setDocuments(folderDocs);
 }
 }, [selectedFolderId]);

 // Load SharePoint sync configuration
 useEffect(() => {
 if (projectId) {
 const config = SharePointSyncService.getSyncConfiguration(projectId);
 setSyncConfig(config);
 }
 }, [projectId]);

 // Handle sync now button
 const handleSyncNow = async () => {
 if (!projectId) return;

 setSyncing(true);
 try {
 await SharePointSyncService.triggerSync(projectId);
 
 // Refresh sync config
 const updatedConfig = SharePointSyncService.getSyncConfiguration(projectId);
 setSyncConfig(updatedConfig);
 
 // Show success message
 alert('✅ Sync completed successfully!');
 } catch (error) {
 console.error('Sync error:', error);
 alert('❌ Sync failed. Please try again.');
 } finally {
 setSyncing(false);
 }
 };

 // Handle connect to SharePoint/OneDrive
 const handleConnectSync = async (provider: 'sharepoint' | 'onedrive') => {
 if (!projectId) return;

 setSyncing(true);
 try {
 // Initialize sync if not already configured
 if (!syncConfig) {
 await SharePointSyncService.initializeSync(
 projectId,
 projectName,
 provider,
 user?.name || 'User',
 {
 root_folder_path: `/Documents/Projects/${projectCode} - ${projectName}/MEAL`,
 sync_direction: 'one-way-to-cloud',
 auto_sync: true,
 conflict_resolution: 'keep-local'
 }
 );
 }

 // Connect to provider
 await SharePointSyncService.connectToProvider(projectId);
 
 // Refresh sync config
 const updatedConfig = SharePointSyncService.getSyncConfiguration(projectId);
 setSyncConfig(updatedConfig);
 
 // Show success message
 alert(`✅ Connected to ${provider === 'sharepoint' ? 'SharePoint' : 'OneDrive'} successfully!`);
 } catch (error) {
 console.error('Connection error:', error);
 alert('❌ Connection failed. Please try again.');
 } finally {
 setSyncing(false);
 }
 };

 // Toggle folder expansion
 const toggleFolder = (folderId: string) => {
 if (!folderTree) return;

 const updateTree = (node: FolderNode): FolderNode => {
 if (node.id === folderId) {
 return { ...node, isExpanded: !node.isExpanded };
 }
 if (node.children) {
 return {
 ...node,
 children: node.children.map(child => updateTree(child))
 };
 }
 return node;
 };

 setFolderTree(updateTree(folderTree));
 };

 // Render folder tree recursively
 const renderFolderTree = (node: FolderNode, level: number = 0): JSX.Element => {
 const hasChildren = node.children && node.children.length > 0;
 const isSelected = selectedFolderId === node.id;
 const displayName = language === 'ar' ? node.nameAr : node.name;

 return (
 <div key={node.id} dir={isRTL ? 'rtl' : 'ltr'}>
 <div
 className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-100 rounded transition-colors ${ isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-700' }`}
 style={{ 
 paddingLeft: isRTL ? '12px' : `${level * 20 + 12}px`, 
 paddingRight: isRTL ? `${level * 20 + 12}px` : '12px' 
 }}
 onClick={() => setSelectedFolderId(node.id)}
 >
 {hasChildren && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 toggleFolder(node.id);
 }}
 className="hover:bg-gray-200 rounded p-1 transition-colors"
 >
 {node.isExpanded ? (
 <ChevronDown className="w-4 h-4" />
 ) : (
 <ChevronRight className={isRTL ? 'rotate-180' : ''} />
 )}
 </button>
 )}
 
 {node.isExpanded ? (
 <FolderOpen className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-blue-500'}`} />
 ) : (
 <Folder className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
 )}
 
 <span className={`text-base flex-1 text-start`}>
 {displayName}
 </span>
 
 {node.documentCount !== undefined && node.documentCount > 0 && (
 <span className="text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-medium">
 {node.documentCount}
 </span>
 )}

 {node.isSystemFolder && (
 <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" title={labels.readOnly} />
 )}
 </div>

 {hasChildren && node.isExpanded && (
 <div>
 {node.children!.map(child => renderFolderTree(child, level + 1))}
 </div>
 )}
 </div>
 );
 };

 // Get file icon based on type
 const getFileIcon = (fileType: DocumentFile['fileType']) => {
 switch (fileType) {
 case 'pdf':
 return <FileText className="w-10 h-10 text-red-500" />;
 case 'excel':
 return <FileText className="w-10 h-10 text-green-600" />;
 case 'word':
 return <FileText className="w-10 h-10 text-blue-600" />;
 case 'csv':
 return <FileText className="w-10 h-10 text-orange-500" />;
 default:
 return <File className="w-10 h-10 text-gray-500" />;
 }
 };

 // Format file size
 const formatFileSize = (bytes: number): string => {
 if (bytes < 1024) return bytes + ' B';
 if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
 return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
 };

 // Format date
 const formatDate = (dateString: string): string => {
 const date = new Date(dateString);
 return date.toLocaleDateString(t.mealDocuments.enus, {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 });
 };

 // Get source tab label
 const getSourceLabel = (source?: DocumentFile['sourceTab']): string => {
 if (!source) return '-';
 
 const labels = {
 indicators: t.mealDocuments.indicatorsTab,
 surveys: t.mealDocuments.surveysTab,
 reports: t.mealDocuments.reportsTab,
 accountability: t.mealDocuments.accountabilityTab,
 };
 
 return labels[source] || '-';
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-96">
 <div className="text-center">
 <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
 <p className="text-base text-gray-600">
 {t.mealDocuments.loadingDocuments}
 </p>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Back to MEAL */}
 <div className="text-start">
 <BackButton onClick={() => navigate('/organization/meal')} label={t.mealDocuments.backToMeal} />
 </div>
 {/* Header */}
 <div className={'text-start'}>
 <h2 className="text-3xl font-bold text-gray-900">{labels.title}</h2>
 <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
 </div>

 {/* Info Banner */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
 <div className={`flex items-start gap-3`}>
 <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className={`flex-1 text-start`}>
 <h4 className="text-lg font-bold text-blue-900 mb-1">{labels.infoTitle}</h4>
 <p className="text-base text-blue-800 leading-relaxed">{labels.infoMessage}</p>
 </div>
 </div>
 </div>

 {/* Action Bar - SharePoint Sync & Flow Diagram */}
 <div className={`flex flex-wrap gap-3`}>
 {/* SharePoint/OneDrive Sync Button */}
 <button
 onClick={() => setShowSyncPanel(!showSyncPanel)}
 className={`flex items-center gap-2 px-5 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors`}
 >
 <Cloud className="w-5 h-5" />
 <span className="text-base font-medium">{labels.syncToCloud}</span>
 </button>

 {/* View Document Flow Button */}
 <button
 onClick={() => setShowFlowDiagram(!showFlowDiagram)}
 className={`flex items-center gap-2 px-5 py-3 bg-white border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors`}
 >
 <ArrowRight className="w-5 h-5" />
 <span className="text-base font-medium">{showFlowDiagram ? labels.hideFlow : labels.viewFlow}</span>
 </button>

 {/* Disabled Upload Button with Tooltip */}
 <div className="relative group">
 <button
 disabled
 className={`flex items-center gap-2 px-5 py-3 bg-gray-100 border-2 border-gray-300 text-gray-400 rounded-lg cursor-not-allowed`}
 >
 <Upload className="w-5 h-5" />
 <span className="text-base font-medium">{labels.uploadDisabled}</span>
 <Lock className="w-4 h-4" />
 </button>
 {/* Tooltip */}
 <div className="absolute bottom-full start-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
 {labels.uploadDisabledTooltip}
 </div>
 </div>
 </div>

 {/* SharePoint/OneDrive Sync Panel */}
 {showSyncPanel && (
 <div className="bg-white border-2 border-blue-600 rounded-lg p-6">
 <div className={`flex items-center justify-between mb-4`}>
 <h3 className="text-xl font-bold text-gray-900">{labels.cloudSync}</h3>
 <button
 onClick={() => setShowSyncPanel(false)}
 className="text-gray-500 hover:text-gray-700 transition-colors"
 >
 ✕
 </button>
 </div>

 <div className={`space-y-4 text-start`}>
 {/* Sync Status */}
 {syncConfig && syncConfig.enabled ? (
 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
 <div className={`flex items-center gap-3`}>
 <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
 <div>
 <p className="text-base font-semibold text-green-900">
 {`${syncConfig.provider === 'sharepoint' ? 'SharePoint' : 'OneDrive'} Connected`}
 </p>
 <p className="text-sm text-green-700">
 {'All MEAL documents are automatically synced to cloud'}
 </p>
 </div>
 </div>
 </div>
 ) : (
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
 <div className={`flex items-center gap-3`}>
 <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
 <div>
 <p className="text-base font-semibold text-yellow-900">
 {t.mealDocuments.notConnected}
 </p>
 <p className="text-sm text-yellow-700">
 {'Connect to SharePoint or OneDrive to enable cloud sync'}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Sync Configuration */}
 {syncConfig && syncConfig.enabled ? (
 <>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">{labels.syncStatus}</p>
 <p className="text-lg font-bold text-gray-900 capitalize">{syncConfig.status || labels.synced}</p>
 </div>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">
 {t.mealDocuments.lastSync}
 </p>
 <p className="text-lg font-bold text-gray-900">
 {syncConfig.last_sync_at ? formatDate(syncConfig.last_sync_at) : '-'}
 </p>
 </div>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">
 {t.mealDocuments.syncedFiles}
 </p>
 <p className="text-lg font-bold text-gray-900">{syncConfig.synced_files} / {syncConfig.total_files}</p>
 </div>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">
 {t.mealDocuments.pendingFiles}
 </p>
 <p className="text-lg font-bold text-gray-900">{syncConfig.pending_files}</p>
 </div>
 </div>

 {/* Sync Now Button */}
 <button
 onClick={handleSyncNow}
 disabled={syncing}
 className={`w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
 <span className="text-base font-medium">
 {syncing 
 ? (t.mealDocuments.syncing) 
 : (t.mealDocuments.syncNow)}
 </span>
 </button>
 </>
 ) : (
 <>
 {/* Connect Buttons */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <button
 onClick={() => handleConnectSync('sharepoint')}
 disabled={syncing}
 className="flex flex-col items-center gap-2 px-5 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
 >
 <Cloud className="w-8 h-8" />
 <span className="text-base font-bold">SharePoint</span>
 </button>
 <button
 onClick={() => handleConnectSync('onedrive')}
 disabled={syncing}
 className="flex flex-col items-center gap-2 px-5 py-4 bg-white border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
 >
 <Cloud className="w-8 h-8" />
 <span className="text-base font-bold">OneDrive</span>
 </button>
 </div>
 </>
 )}

 {/* Info */}
 <p className="text-sm text-gray-600">
 {'✅ Documents are stored in cloud storage and remain accessible even if system is offline'}
 </p>
 </div>
 </div>
 )}

 {/* Document Flow Diagram */}
 {showFlowDiagram && (
 <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-600 rounded-lg p-6">
 <div className={`flex items-center justify-between mb-4`}>
 <h3 className="text-xl font-bold text-gray-900">{labels.flowTitle}</h3>
 <button
 onClick={() => setShowFlowDiagram(false)}
 className="text-gray-500 hover:text-gray-700 transition-colors"
 >
 ✕
 </button>
 </div>

 <p className="text-base text-gray-700 mb-6">{labels.flowDescription}</p>

 {/* Flow Diagram */}
 <div className="space-y-4">
 {[
 { tab: t.mealDocuments.indicatorsTab, folder: '/01_Indicators', color: 'blue' },
 { tab: t.mealDocuments.surveysTab, folder: '/02_Surveys', color: 'green' },
 { tab: t.mealDocuments.reportsTab, folder: '/03_Reports', color: 'purple' },
 { tab: t.mealDocuments.accountabilityTab, folder: '/04_Accountability', color: 'red' },
 ].map((item, index) => (
 <div
 key={index}
 className={`flex items-center gap-4 bg-white rounded-lg p-4 border-2 border-${item.color}-600`}
 >
 {/* Source Tab */}
 <div className={`flex-1 bg-${item.color}-50 rounded-lg p-3 text-center`}>
 <p className="text-base font-bold text-gray-900">{item.tab}</p>
 <p className="text-sm text-gray-600 mt-1">
 {t.mealDocuments.autogeneratesDocuments}
 </p>
 </div>

 {/* Arrow */}
 <ArrowRight className={`w-8 h-8 text-${item.color}-600 flex-shrink-0 ${isRTL ? 'rotate-180' : ''}`} />

 {/* Target Folder */}
 <div className={`flex-1 bg-${item.color}-50 rounded-lg p-3 text-center`}>
 <div className={`flex items-center justify-center gap-2 mb-1`}>
 <Folder className="w-5 h-5 text-gray-700" />
 <p className="text-base font-bold text-gray-900">{item.folder}</p>
 </div>
 <p className="text-sm text-gray-600 mt-1">
 {t.mealDocuments.autosyncedFolder}
 </p>
 </div>

 {/* Lock Icon */}
 <Lock className={`w-6 h-6 text-${item.color}-600 flex-shrink-0`} />
 </div>
 ))}
 </div>

 {/* Legend */}
 <div className="mt-6 bg-white rounded-lg p-4 border border-gray-300">
 <p className="text-base font-bold text-gray-900 mb-2">
 {t.mealDocuments.keyRules}
 </p>
 <ul className={`space-y-1 text-sm text-gray-700 text-start`}>
 <li>✅ {t.mealDocuments.documentsAreSystemgeneratedOnly}</li>
 <li>✅ {t.mealDocuments.noManualUploadsToFolders}</li>
 <li>✅ {t.mealDocuments.foldersAreReadonly}</li>
 <li>✅ {t.mealDocuments.versioningEnabledAutomatically}</li>
 <li>✅ {t.mealDocuments.autosyncedToSharepointonedrive}</li>
 </ul>
 </div>
 </div>
 )}

 {/* Main Content */}
 <div className="flex gap-6">
 {/* Folder Tree Sidebar */}
 <div className="w-80 bg-white rounded-lg border border-gray-200 flex flex-col" style={{ height: '600px' }}>
 <div className={`px-4 py-4 border-b border-gray-200 text-start`}>
 <div className={`flex items-center gap-2 text-base font-semibold text-gray-700`}>
 <Folder className="w-5 h-5 text-blue-600" />
 <span>{labels.folderTree}</span>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto py-2">
 {folderTree ? (
 renderFolderTree(folderTree)
 ) : (
 <div className="p-6 text-center">
 <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-sm text-gray-500">{labels.noFolders}</p>
 </div>
 )}
 </div>
 </div>

 {/* Document List */}
 <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6" style={{ height: '600px', overflow: 'auto' }}>
 {documents.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full">
 <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
 <FileText className="w-12 h-12 text-gray-400" />
 </div>
 <p className="text-base text-gray-500">{labels.noDocuments}</p>
 </div>
 ) : (
 <div className="space-y-4">
 {documents.map(doc => (
 <div
 key={doc.id}
 className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
 >
 <div className={`flex items-start gap-4`}>
 {/* File Icon */}
 <div className="flex-shrink-0">
 {getFileIcon(doc.fileType)}
 </div>

 {/* File Info */}
 <div className={`flex-1 min-w-0 text-start`}>
 <h3 className="text-lg font-bold text-gray-900 mb-1 truncate" title={doc.name}>
 {doc.name}
 </h3>
 
 {/* Auto-Synced Source Badge - Prominent Display */}
 {doc.sourceTab && (
 <div className={`flex items-center gap-2 mb-2`}>
 <span className="inline-flex items-center gap-1.5 text-sm text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
 <RefreshCw className="w-4 h-4" />
 {t.mealDocuments.autosyncedFrom}{' '}
 <span className="font-bold">{getSourceLabel(doc.sourceTab)}</span>
 </span>
 </div>
 )}
 
 <div className="flex flex-wrap gap-3 mt-2">
 {doc.isSystemGenerated && (
 <span className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full">
 <CheckCircle className="w-4 h-4" />
 {labels.systemGenerated}
 </span>
 )}
 
 {doc.isReadOnly && (
 <span className="inline-flex items-center gap-1 text-sm text-orange-700 bg-orange-50 px-3 py-1 rounded-full">
 <Lock className="w-4 h-4" />
 {labels.readOnly}
 </span>
 )}
 
 <span className="inline-flex items-center text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
 {labels.version} {doc.version}
 </span>
 </div>

 <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm text-start`}>
 <div>
 <span className="text-gray-500">{labels.uploadedBy}:</span>{' '}
 <span className="text-gray-900 font-medium">{doc.uploadedBy}</span>
 </div>
 <div>
 <span className="text-gray-500">{labels.uploadedAt}:</span>{' '}
 <span className="text-gray-900 font-medium">{formatDate(doc.uploadedAt)}</span>
 </div>
 <div>
 <span className="text-gray-500">Size:</span>{' '}
 <span className="text-gray-900 font-medium">{formatFileSize(doc.size)}</span>
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className={`flex gap-2 flex-shrink-0`}>
 <button
 className="p-3 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
 title={labels.preview}
 >
 <Eye className="w-5 h-5" />
 </button>
 <button
 className="p-3 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
 title={labels.download}
 >
 <Download className="w-5 h-5" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}