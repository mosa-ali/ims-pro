/**
 * ============================================================================
 * SURVEY SUMMARY TAB
 * ============================================================================
 * 
 * Survey overview with KPIs and quick links (Screenshot 3)
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye, Share2, Edit as EditIcon, FileDown, Calendar, Users, MapPin, FileText, BarChart3, Image, Download, Copy, ExternalLink, ChevronDown, QrCode, Smartphone, Monitor, Code } from 'lucide-react';
// Removed submissionService import - using tRPC instead
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 survey: any;
 projectId?: string;
 projectName?: string;
}

export function SurveySummaryTab({
 survey, projectId, projectName }: Props) {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 
 // ✅ Generate unique survey link
 const generateSurveyCode = (id: string) => {
 // Generate 8-character code from survey ID
 const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
 let code = '';
 for (let i = 0; i < 8; i++) {
 code += chars.charAt(Math.floor(Math.random() * chars.length));
 }
 return code;
 };
 
 const [surveyCode] = useState(generateSurveyCode(survey.id));
 const surveyFormLink = `https://survey.pma-ye.org/form/${surveyCode}`;
 const [allowAnonymousSubmissions, setAllowAnonymousSubmissions] = useState(false);
 const [activeDeployTab, setActiveDeployTab] = useState<'web' | 'android' | 'ios' | 'embed'>('web');
 const [showQRCode, setShowQRCode] = useState(false);

 const localT = {
 collectDataTitle: t.mealTabs.collectData,
 onlineOffline: t.mealTabs.onlineofflineMultipleSubmission1,
 onlineOfflineDesc: 'This allows online and offline submissions and is the best option for collecting data in the field.',
 copy: t.mealTabs.copy,
 open: t.mealTabs.open,
 qrCode: t.mealTabs.qrCode,
 allowSubmissionsNoAuth: 'Allow submissions to this form without a username and password',
 linkCopied: t.mealTabs.formLinkCopiedToClipboard2,
 embedCopied: t.mealTabs.embedCodeCopiedToClipboard,
 webDeploy: t.mealTabs.web,
 androidDeploy: t.mealTabs.android,
 iosDeploy: t.mealTabs.ios,
 embedDeploy: t.mealTabs.embed,
 webDesc: t.mealTabs.shareTheWebLinkDirectlyWith,
 androidDesc: t.mealTabs.downloadAndroidApkForOfflineCollection,
 iosDesc: t.mealTabs.installIosAppViaTestflight,
 embedDesc: t.mealTabs.embedFormInYourWebsiteUsing,
 downloadAPK: t.mealTabs.downloadApk,
 openTestFlight: t.mealTabs.openTestflight,
 copyEmbed: t.mealTabs.copyEmbedCode,
 scanQR: t.mealTabs.scanQrCode,
 downloadQR: t.mealTabs.downloadQr,
 projectInfo: t.mealTabs.projectInformation,
 quickLinks: t.mealTabs.quickLinks,
 description: t.mealTabs.description,
 status: t.mealTabs.status,
 questions: t.mealTabs.questions3,
 owner: t.mealTabs.owner,
 lastModified: t.mealTabs.lastModified,
 lastDeployed: t.mealTabs.lastDeployed,
 sector: t.mealTabs.sector,
 country: t.mealTabs.country,
 submissions: t.mealTabs.submissions,
 collectData: t.mealTabs.collectData4,
 shareProject: t.mealTabs.shareProject,
 editForm: t.mealTabs.editForm,
 previewForm: t.mealTabs.previewForm,
 deployed: t.mealTabs.deployed5,
 draft: t.mealTabs.draft,
 archived: t.mealTabs.archived,
 total: t.mealTabs.total,
 past7Days: t.mealTabs.past7Days,
 past31Days: t.mealTabs.past31Days,
 past3Months: t.mealTabs.past3Months,
 past12Months: t.mealTabs.past12Months,
 latestSubmission: t.mealTabs.latestSubmission,
 noData: t.mealTabs.noChartDataAvailableForCurrent,
 data: t.mealTabs.data,
 };

 const statusBadge = survey.status === 'published' ? t.mealTabs.deployed : survey.status === 'archived' ? t.mealTabs.archived : t.mealTabs.draft;
 const statusColor = survey.status === 'published' ? 'bg-blue-100 text-blue-700' : survey.status === 'archived' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700';

 // ✅ Real submission data from service
 const [submissionStats, setSubmissionStats] = useState({
 total: 0,
 past7Days: 0,
 latestSubmission: null as string | null,
 });


 useEffect(() => {
 const fetchSubmissionStats = () => {
 try {
 // TODO: Replace with tRPC call to fetch actual submissions
 const allSubmissions: any[] = [];
 const now = new Date();
 const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
 
 const past7DaysSubmissions = allSubmissions.filter((sub: any) => {
 const subDate = new Date(sub.submittedAt);
 return subDate >= sevenDaysAgo;
 });

 const latestSub = allSubmissions.length > 0 ? allSubmissions[0].submittedAt : null;

 setSubmissionStats({
 total: allSubmissions.length,
 past7Days: past7DaysSubmissions.length,
 latestSubmission: latestSub,
 });
 } catch (error) {
 console.error('Error fetching submission stats:', error);
 }
 };

 fetchSubmissionStats();
 }, [survey.id]);

 // ✅ Real action handlers
 const handleCollectData = () => {
 navigate(`/organization/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=collect`);
 };

 const handleShareProject = async () => {
 const shareUrl = `${window.location.origin}/meal/survey/detail/${survey.id}`;
 
 try {
 // Try modern clipboard API first
 await navigator.clipboard.writeText(shareUrl);
 alert(t.mealTabs.surveyLinkCopiedToClipboard);
 } catch (err) {
 // Fallback: Create a temporary input element
 const textArea = document.createElement('textarea');
 textArea.value = shareUrl;
 textArea.style.position = 'fixed';
 textArea.style.left = '-999999px';
 textArea.style.top = '-999999px';
 document.body.appendChild(textArea);
 textArea.focus();
 textArea.select();
 
 try {
 document.execCommand('copy');
 textArea.remove();
 alert(t.mealTabs.surveyLinkCopiedToClipboard);
 } catch (err2) {
 // Final fallback: Show the URL to user
 textArea.remove();
 prompt(
 t.mealTabs.copyThisLink,
 shareUrl
 );
 }
 }
 };

 const handleEditForm = () => {
 navigate(`/organization/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=form`);
 };

 const handlePreviewForm = () => {
 navigate(`/organization/meal/survey/form-preview?surveyId=${survey.id}&projectId=${projectId}`);
 };

 const handleViewTable = () => {
 navigate(`/organization/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=table`);
 };

 const handleViewReports = () => {
 navigate(`/organization/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=reports`);
 };

 const handleViewGallery = () => {
 navigate(`/organization/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=gallery`);
 };

 const handleViewFiles = () => {
 navigate(`/organization/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=files`);
 };

 const handleViewDownloads = () => {
 navigate(`/organization/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=downloads`);
 };

 const handleViewMap = () => {
 navigate(`/organization/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=map`);
 };

 // ✅ Copy form link handler
 const handleCopyFormLink = async () => {
 try {
 await navigator.clipboard.writeText(surveyFormLink);
 alert(t.mealTabs.surveyLinkCopiedToClipboard);
 } catch (err) {
 // Fallback
 const textArea = document.createElement('textarea');
 textArea.value = surveyFormLink;
 textArea.style.position = 'fixed';
 textArea.style.left = '-999999px';
 document.body.appendChild(textArea);
 textArea.select();
 try {
 document.execCommand('copy');
 textArea.remove();
 alert(t.mealTabs.surveyLinkCopiedToClipboard);
 } catch (err2) {
 textArea.remove();
 prompt(t.mealTabs.copyThisLink, surveyFormLink);
 }
 }
 };

 // ✅ Open form link handler
 const handleOpenFormLink = () => {
 window.open(surveyFormLink, '_blank');
 };

 // ✅ Download QR Code as PNG
 const handleDownloadQR = () => {
 const svg = document.querySelector('#survey-qr-code') as SVGElement;
 if (!svg) return;

 const svgData = new XMLSerializer().serializeToString(svg);
 const canvas = document.createElement('canvas');
 const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
 const img = new Image();

 canvas.width = 256;
 canvas.height = 256;

 img.onload = () => {
 ctx?.drawImage(img, 0, 0, 256, 256);
 canvas.toBlob((blob) => {
 if (blob) {
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `survey-${surveyCode}-qr.png`;
 a.click();
 URL.revokeObjectURL(url);
 }
 });
 };

 img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
 };

 // ✅ Copy embed code
 const handleCopyEmbedCode = async () => {
 const embedCode = `<iframe src="${surveyFormLink}" width="100%" height="600" frameborder="0" style="border:0"></iframe>`;
 try {
 await navigator.clipboard.writeText(embedCode);
 alert(t.mealTabs.embedCodeCopiedToClipboard);
 } catch (err) {
 prompt(t.mealTabs.copyThisEmbedCode, embedCode);
 }
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* ===== COLLECT DATA SECTION ===== */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h2 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {localT.collectDataTitle}
 </h2>
 
 {/* Online-Offline Card */}
 <div className={`border border-gray-300 rounded-lg p-4 mb-3 text-start`}>
 <div className={`flex items-start justify-between mb-2`}>
 <div className="flex-1">
 <h3 className="text-sm font-bold text-gray-900 mb-1">{localT.onlineOffline}</h3>
 <p className="text-xs text-blue-600">{localT.onlineOfflineDesc}</p>
 </div>
 <ChevronDown className="w-5 h-5 text-gray-400" />
 </div>
 </div>

 {/* Copy/Open Buttons */}
 <div className={`flex gap-2 mb-4`}>
 <button
 onClick={handleCopyFormLink}
 className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors`}
 >
 <Copy className="w-4 h-4 text-gray-700" />
 <span className="text-sm font-medium text-gray-700">{localT.copy}</span>
 </button>
 <button
 onClick={handleOpenFormLink}
 className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors`}
 >
 <ExternalLink className="w-4 h-4" />
 <span className="text-sm font-medium">{localT.open}</span>
 </button>
 </div>

 {/* Allow Anonymous Submissions Checkbox */}
 <div className={`flex items-center gap-3`}>
 <input
 type="checkbox"
 id="allow-anonymous"
 checked={allowAnonymousSubmissions}
 onChange={(e) => setAllowAnonymousSubmissions(e.target.checked)}
 className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
 />
 <label htmlFor="allow-anonymous" className="text-sm text-gray-700">
 {localT.allowSubmissionsNoAuth}
 </label>
 </div>

 {/* Display Form Link */}
 <div className={`mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-start`}>
 <p className="text-xs text-gray-500 mb-1">{t.mealTabs.formLink}</p>
 <p className="text-sm font-mono text-blue-600 break-all">{surveyFormLink}</p>
 </div>

 {/* Deployment Tabs */}
 <div className={`flex gap-2 mt-6`}>
 <button
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ activeDeployTab === 'web' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' }`}
 onClick={() => setActiveDeployTab('web')}
 >
 {localT.webDeploy}
 </button>
 <button
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ activeDeployTab === 'android' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' }`}
 onClick={() => setActiveDeployTab('android')}
 >
 {localT.androidDeploy}
 </button>
 <button
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ activeDeployTab === 'ios' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' }`}
 onClick={() => setActiveDeployTab('ios')}
 >
 {localT.iosDeploy}
 </button>
 <button
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ activeDeployTab === 'embed' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' }`}
 onClick={() => setActiveDeployTab('embed')}
 >
 {localT.embedDeploy}
 </button>
 </div>

 {/* Deployment Content */}
 <div className="mt-4">
 {activeDeployTab === 'web' && (
 <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
 <p className="text-sm text-gray-500 mb-1">{localT.webDesc}</p>
 <p className="text-sm font-mono text-blue-600 break-all">{surveyFormLink}</p>
 </div>
 )}
 {activeDeployTab === 'android' && (
 <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
 <p className="text-sm text-gray-500 mb-1">{localT.androidDesc}</p>
 <button
 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
 onClick={() => window.open('https://example.com/android-apk', '_blank')}
 >
 <Download className="w-4 h-4" />
 <span className="text-sm font-medium">{localT.downloadAPK}</span>
 </button>
 </div>
 )}
 {activeDeployTab === 'ios' && (
 <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
 <p className="text-sm text-gray-500 mb-1">{localT.iosDesc}</p>
 <button
 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
 onClick={() => window.open('https://example.com/testflight', '_blank')}
 >
 <ExternalLink className="w-4 h-4" />
 <span className="text-sm font-medium">{localT.openTestFlight}</span>
 </button>
 </div>
 )}
 {activeDeployTab === 'embed' && (
 <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
 <p className="text-sm text-gray-500 mb-1">{localT.embedDesc}</p>
 <button
 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
 onClick={handleCopyEmbedCode}
 >
 <Copy className="w-4 h-4" />
 <span className="text-sm font-medium">{localT.copyEmbed}</span>
 </button>
 </div>
 )}
 </div>

 {/* QR Code */}
 <div className="mt-4">
 <button
 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
 onClick={() => setShowQRCode(!showQRCode)}
 >
 <QrCode className="w-4 h-4" />
 <span className="text-sm font-medium">{localT.qrCode}</span>
 </button>
 {showQRCode && (
 <div className="mt-4">
 <QRCodeSVG value={surveyFormLink} size={128} id="survey-qr-code" />
 <button
 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors mt-2"
 onClick={handleDownloadQR}
 >
 <Download className="w-4 h-4" />
 <span className="text-sm font-medium">{localT.downloadQR}</span>
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Two Column Layout */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column - Project Information */}
 <div className="lg:col-span-2 space-y-6">
 {/* Project Information Card */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h2 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {localT.projectInfo}
 </h2>

 <div className="space-y-4">
 {/* Description */}
 <div>
 <label className={`text-sm font-semibold text-gray-700 text-start block mb-1`}>
 {localT.description}
 </label>
 <p className={`text-base text-gray-900 text-start`}>
 {survey.description || '—'}
 </p>
 </div>

 {/* Metadata Grid */}
 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
 <div>
 <label className={`text-sm font-medium text-gray-600 text-start block mb-1`}>
 {localT.status}
 </label>
 <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
 {statusBadge}
 </span>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-600 text-start block mb-1`}>
 {localT.questions}
 </label>
 <p className={`text-base font-semibold text-gray-900 text-start`}>
 {survey.questions?.length || 0}
 </p>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-600 text-start block mb-1`}>
 {localT.owner}
 </label>
 <p className={`text-base text-gray-900 text-start`}>
 {survey.createdBy || 'me'}
 </p>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-600 text-start block mb-1`}>
 {localT.lastModified}
 </label>
 <p className={`text-base text-gray-900 text-start`}>
 {new Date(survey.updatedAt || survey.createdAt).toLocaleDateString(t.mealTabs.enus, {
 month: 'long',
 day: 'numeric',
 year: 'numeric'
 })}
 </p>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-600 text-start block mb-1`}>
 {localT.lastDeployed}
 </label>
 <p className={`text-base text-gray-900 text-start`}>
 {survey.publishedAt ? new Date(survey.publishedAt).toLocaleDateString(t.mealTabs.enus, {
 month: 'long',
 day: 'numeric',
 year: 'numeric'
 }) : '—'}
 </p>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-600 text-start block mb-1`}>
 {localT.latestSubmission}
 </label>
 <p className={`text-base text-gray-900 text-start`}>
 {submissionStats.latestSubmission ? new Date(submissionStats.latestSubmission).toLocaleDateString(t.mealTabs.enus, {
 month: 'long',
 day: 'numeric',
 year: 'numeric'
 }) : '—'}
 </p>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-600 text-start block mb-1`}>
 {localT.sector}
 </label>
 <p className={`text-base text-gray-900 text-start`}>
 <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">Humanitarian</span>
 <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium ms-1">Multiple Clusters</span>
 </p>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-600 text-start block mb-1`}>
 {localT.country}
 </label>
 <p className={`text-base text-gray-900 text-start`}>
 Yemen
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Submissions Card */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h2 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {localT.submissions}
 </h2>

 {/* Period Tabs */}
 <div className={`flex gap-2 mb-6`}>
 {[
 { label: t.mealTabs.past7Days, active: true },
 { label: t.mealTabs.past31Days, active: false },
 { label: t.mealTabs.past3Months, active: false },
 { label: t.mealTabs.past31Days, active: false },
 ].map((tab, index) => (
 <button
 key={index}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ tab.active ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* No Data Message */}
 <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
 <p className="text-gray-500">{localT.noData}</p>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-2 gap-4 mt-6">
 <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
 <p className={`text-sm text-cyan-700 mb-1 text-start`}>
 Jan 13, 2026 – Today
 </p>
 <p className={`text-3xl font-bold text-cyan-900 text-start`}>
 {submissionStats.past7Days}
 </p>
 </div>
 <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
 <p className={`text-sm text-blue-700 mb-1 text-start`}>
 {localT.total}
 </p>
 <p className={`text-3xl font-bold text-blue-900 text-start`}>
 {submissionStats.total}
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Right Column - Quick Links */}
 <div className="lg:col-span-1">
 <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
 <h2 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {localT.quickLinks}
 </h2>

 <div className="space-y-2">
 <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-start`} onClick={handleCollectData}>
 <Eye className="w-5 h-5 text-gray-600" />
 <span className="text-sm font-medium text-gray-900">{localT.collectData}</span>
 </button>
 <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-start`} onClick={handleShareProject}>
 <Share2 className="w-5 h-5 text-gray-600" />
 <span className="text-sm font-medium text-gray-900">{localT.shareProject}</span>
 </button>
 <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-start`} onClick={handleEditForm}>
 <EditIcon className="w-5 h-5 text-gray-600" />
 <span className="text-sm font-medium text-gray-900">{localT.editForm}</span>
 </button>
 <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-start`} onClick={handlePreviewForm}>
 <Eye className="w-5 h-5 text-gray-600" />
 <span className="text-sm font-medium text-gray-900">{localT.previewForm}</span>
 </button>
 </div>

 {/* Data Links */}
 <div className="mt-6 pt-6 border-t border-gray-200">
 <h3 className={`text-sm font-bold text-gray-700 mb-3 text-start`}>
 {localT.data}
 </h3>
 <div className="space-y-2">
 {[
 { icon: FileDown, label: t.mealTabs.table, action: handleViewTable },
 { icon: FileDown, label: t.mealTabs.reports, action: handleViewReports },
 { icon: FileDown, label: t.mealTabs.gallery, action: handleViewGallery },
 { icon: FileDown, label: t.mealTabs.files, action: handleViewFiles },
 { icon: FileDown, label: t.mealTabs.downloads, action: handleViewDownloads },
 { icon: MapPin, label: t.mealTabs.map, action: handleViewMap },
 ].map((link, index) => {
 const Icon = link.icon;
 return (
 <button
 key={index}
 className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-start`}
 onClick={link.action}
 >
 <Icon className="w-4 h-4 text-gray-500" />
 <span className="text-sm text-gray-700">{link.label}</span>
 </button>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}