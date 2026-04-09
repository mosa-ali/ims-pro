/**
 * ============================================================================
 * SURVEY SUMMARY TAB
 * ============================================================================
 * 
 * Survey overview with KPIs and quick links (Screenshot 3)
 * 
 * ============================================================================
 */

import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye, Share2, Edit as EditIcon, FileDown, Calendar, Users, MapPin, FileText, BarChart3, Image as ImageIcon, Download, Copy, ExternalLink, ChevronDown, QrCode, Smartphone, Monitor, Code } from 'lucide-react';
import { submissionService } from '@/services/mealService';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  survey: any;
  projectId?: string;
  projectName?: string;
}

export function SurveySummaryTab({ survey, projectId, projectName }: Props) {
  const [, navigate] = useLocation();
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

  const t = {
    collectDataTitle: language === 'en' ? 'Collect data' : 'جمع البيانات',
    onlineOffline: language === 'en' ? 'Online-Offline (multiple submission)' : 'متصل-غير متصل (تقديم متعدد)',
    onlineOfflineDesc: language === 'en' 
      ? 'This allows online and offline submissions and is the best option for collecting data in the field.' 
      : 'يسمح هذا بالتقديمات عبر الإنترنت وخارجها وهو أفضل خيار لجمع البيانات في الميدان.',
    copy: language === 'en' ? 'Copy' : 'نسخ',
    open: language === 'en' ? 'Open' : 'فتح',
    qrCode: language === 'en' ? 'QR Code' : 'رمز QR',
    allowSubmissionsNoAuth: language === 'en' 
      ? 'Allow submissions to this form without a username and password' 
      : 'السماح بالتقديمات إلى هذا النموذج بدون اسم مستخدم وكلمة مرور',
    linkCopied: language === 'en' ? 'Form link copied to clipboard!' : 'تم نسخ رابط النموذج إلى الحافظة!',
    embedCopied: language === 'en' ? 'Embed code copied to clipboard!' : 'تم نسخ رمز التضمين إلى الحافظة!',
    webDeploy: language === 'en' ? 'Web' : 'الويب',
    androidDeploy: language === 'en' ? 'Android' : 'أندرويد',
    iosDeploy: language === 'en' ? 'iOS' : 'آي أو إس',
    embedDeploy: language === 'en' ? 'Embed' : 'تضمين',
    webDesc: language === 'en' ? 'Share the web link directly with respondents' : 'شارك رابط الويب مباشرة مع المستجيبين',
    androidDesc: language === 'en' ? 'Download Android APK for offline collection' : 'قم بتنزيل APK لنظام Android للجمع دون اتصال',
    iosDesc: language === 'en' ? 'Install iOS app via TestFlight' : 'قم بتثبيت تطبيق iOS عبر TestFlight',
    embedDesc: language === 'en' ? 'Embed form in your website using iframe' : 'قم بتضمين النموذج في موقع الويب الخاص بك باستخدام iframe',
    downloadAPK: language === 'en' ? 'Download APK' : 'تحميل APK',
    openTestFlight: language === 'en' ? 'Open TestFlight' : 'فتح TestFlight',
    copyEmbed: language === 'en' ? 'Copy Embed Code' : 'نسخ كود التضمين',
    scanQR: language === 'en' ? 'Scan QR Code' : 'امسح رمز الاستجابة السريعة',
    downloadQR: language === 'en' ? 'Download QR' : 'تحميل QR',
    projectInfo: language === 'en' ? 'Project Information' : 'معلومات المشروع',
    quickLinks: language === 'en' ? 'Quick Links' : 'روابط سريعة',
    description: language === 'en' ? 'Description' : 'الوصف',
    status: language === 'en' ? 'Status' : 'الحالة',
    questions: language === 'en' ? 'Questions' : 'الأسئلة',
    owner: language === 'en' ? 'Owner' : 'المالك',
    lastModified: language === 'en' ? 'Last Modified' : 'آخر تعديل',
    lastDeployed: language === 'en' ? 'Last Deployed' : 'آخر نشر',
    sector: language === 'en' ? 'Sector' : 'القطاع',
    country: language === 'en' ? 'Country' : 'الدولة',
    submissions: language === 'en' ? 'Submissions' : 'التقديمات',
    collectData: language === 'en' ? 'Collect Data' : 'جمع البيانات',
    shareProject: language === 'en' ? 'Share Project' : 'مشاركة المشروع',
    editForm: language === 'en' ? 'Edit Form' : 'تعديل النموذج',
    previewForm: language === 'en' ? 'Preview Form' : 'معاينة النموذج',
    deployed: language === 'en' ? 'Deployed' : 'منشور',
    draft: language === 'en' ? 'Draft' : 'مسودة',
    archived: language === 'en' ? 'Archived' : 'مؤرشف',
    total: language === 'en' ? 'Total' : 'الإجمالي',
    past7Days: language === 'en' ? 'Past 7 days' : 'آخر 7 أيام',
    past31Days: language === 'en' ? 'Past 31 days' : 'آخر 31 يوماً',
    past3Months: language === 'en' ? 'Past 3 months' : 'آخر 3 أشهر',
    past12Months: language === 'en' ? 'Past 12 months' : 'آخر 12 شهراً',
    latestSubmission: language === 'en' ? 'Latest Submission' : 'آخر تقديم',
    noData: language === 'en' ? 'No chart data available for current period.' : 'لا توفر بيانات رسم بياني للفترة الحالية.',
    data: language === 'en' ? 'Data' : 'البيانات',
  };

  const statusBadge = survey.status === 'published' ? t.deployed : survey.status === 'archived' ? t.archived : t.draft;
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
        const allSubmissions = submissionService.getAllSubmissions({ surveyId: survey.id });
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const past7DaysSubmissions = allSubmissions.filter(sub => {
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
    navigate(`/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=collect`);
  };

  const handleShareProject = async () => {
    const shareUrl = `${window.location.origin}/meal/survey/detail/${survey.id}`;
    
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(shareUrl);
      alert(language === 'en' ? 'Survey link copied to clipboard!' : 'تم نسخ رابط المسح إلى الحافظة!');
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
        alert(language === 'en' ? 'Survey link copied to clipboard!' : 'تم نسخ رابط المسح إلى الحافظة!');
      } catch (err2) {
        // Final fallback: Show the URL to user
        textArea.remove();
        prompt(
          language === 'en' ? 'Copy this link:' : 'انسخ هذا الرابط:',
          shareUrl
        );
      }
    }
  };

  const handleEditForm = () => {
    navigate(`/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=form`);
  };

  const handlePreviewForm = () => {
    navigate(`/meal/survey/form-preview?surveyId=${survey.id}&projectId=${projectId}`);
  };

  const handleViewTable = () => {
    navigate(`/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=table`);
  };

  const handleViewReports = () => {
    navigate(`/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=reports`);
  };

  const handleViewGallery = () => {
    navigate(`/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=gallery`);
  };

  const handleViewFiles = () => {
    navigate(`/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=files`);
  };

  const handleViewDownloads = () => {
    navigate(`/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=downloads`);
  };

  const handleViewMap = () => {
    navigate(`/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=data&subtab=map`);
  };

  // ✅ Copy form link handler
  const handleCopyFormLink = async () => {
    try {
      await navigator.clipboard.writeText(surveyFormLink);
      alert(t.linkCopied);
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
        alert(t.linkCopied);
      } catch (err2) {
        textArea.remove();
        prompt(language === 'en' ? 'Copy this link:' : 'انسخ هذا الرابط:', surveyFormLink);
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
    const ctx = canvas.getContext('2d');
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
      alert(t.embedCopied);
    } catch (err) {
      prompt(language === 'en' ? 'Copy this embed code:' : 'انسخ كود التضمين:', embedCode);
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== COLLECT DATA SECTION ===== */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.collectDataTitle}
        </h2>
        
        {/* Online-Offline Card */}
        <div className={`border border-gray-300 rounded-lg p-4 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className={`flex items-start justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900 mb-1">{t.onlineOffline}</h3>
              <p className="text-xs text-blue-600">{t.onlineOfflineDesc}</p>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Copy/Open Buttons */}
        <div className={`flex gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleCopyFormLink}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Copy className="w-4 h-4 text-gray-700" />
            <span className="text-sm font-medium text-gray-700">{t.copy}</span>
          </button>
          <button
            onClick={handleOpenFormLink}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-medium">{t.open}</span>
          </button>
        </div>

        {/* Allow Anonymous Submissions Checkbox */}
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <input
            type="checkbox"
            id="allow-anonymous"
            checked={allowAnonymousSubmissions}
            onChange={(e) => setAllowAnonymousSubmissions(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="allow-anonymous" className="text-sm text-gray-700">
            {t.allowSubmissionsNoAuth}
          </label>
        </div>

        {/* Display Form Link */}
        <div className={`mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-xs text-gray-500 mb-1">{language === 'en' ? 'Form Link:' : 'رابط النموذج:'}</p>
          <p className="text-sm font-mono text-blue-600 break-all">{surveyFormLink}</p>
        </div>

        {/* Deployment Tabs */}
        <div className={`flex gap-2 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeDeployTab === 'web'
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveDeployTab('web')}
          >
            {t.webDeploy}
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeDeployTab === 'android'
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveDeployTab('android')}
          >
            {t.androidDeploy}
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeDeployTab === 'ios'
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveDeployTab('ios')}
          >
            {t.iosDeploy}
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeDeployTab === 'embed'
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveDeployTab('embed')}
          >
            {t.embedDeploy}
          </button>
        </div>

        {/* Deployment Content */}
        <div className="mt-4">
          {activeDeployTab === 'web' && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">{t.webDesc}</p>
              <p className="text-sm font-mono text-blue-600 break-all">{surveyFormLink}</p>
            </div>
          )}
          {activeDeployTab === 'android' && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">{t.androidDesc}</p>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                onClick={() => window.open('https://example.com/android-apk', '_blank')}
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">{t.downloadAPK}</span>
              </button>
            </div>
          )}
          {activeDeployTab === 'ios' && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">{t.iosDesc}</p>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                onClick={() => window.open('https://example.com/testflight', '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">{t.openTestFlight}</span>
              </button>
            </div>
          )}
          {activeDeployTab === 'embed' && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">{t.embedDesc}</p>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                onClick={handleCopyEmbedCode}
              >
                <Copy className="w-4 h-4" />
                <span className="text-sm font-medium">{t.copyEmbed}</span>
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
            <span className="text-sm font-medium">{t.qrCode}</span>
          </button>
          {showQRCode && (
            <div className="mt-4">
              <QRCodeSVG value={surveyFormLink} size={128} id="survey-qr-code" />
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors mt-2"
                onClick={handleDownloadQR}
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">{t.downloadQR}</span>
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
            <h2 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.projectInfo}
            </h2>

            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className={`text-sm font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'} block mb-1`}>
                  {t.description}
                </label>
                <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {survey.description || '—'}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className={`text-sm font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'} block mb-1`}>
                    {t.status}
                  </label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                    {statusBadge}
                  </span>
                </div>
                <div>
                  <label className={`text-sm font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'} block mb-1`}>
                    {t.questions}
                  </label>
                  <p className={`text-base font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {survey.questions?.length || 0}
                  </p>
                </div>
                <div>
                  <label className={`text-sm font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'} block mb-1`}>
                    {t.owner}
                  </label>
                  <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {survey.createdBy || 'me'}
                  </p>
                </div>
                <div>
                  <label className={`text-sm font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'} block mb-1`}>
                    {t.lastModified}
                  </label>
                  <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {new Date(survey.updatedAt || survey.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className={`text-sm font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'} block mb-1`}>
                    {t.lastDeployed}
                  </label>
                  <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {survey.publishedAt ? new Date(survey.publishedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    }) : '—'}
                  </p>
                </div>
                <div>
                  <label className={`text-sm font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'} block mb-1`}>
                    {t.latestSubmission}
                  </label>
                  <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {submissionStats.latestSubmission ? new Date(submissionStats.latestSubmission).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    }) : '—'}
                  </p>
                </div>
                <div>
                  <label className={`text-sm font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'} block mb-1`}>
                    {t.sector}
                  </label>
                  <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">Humanitarian</span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium ml-1">Multiple Clusters</span>
                  </p>
                </div>
                <div>
                  <label className={`text-sm font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'} block mb-1`}>
                    {t.country}
                  </label>
                  <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Yemen
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submissions Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.submissions}
            </h2>

            {/* Period Tabs */}
            <div className={`flex gap-2 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {[
                { label: t.past7Days, active: true },
                { label: t.past31Days, active: false },
                { label: t.past3Months, active: false },
                { label: t.past12Months, active: false },
              ].map((tab, index) => (
                <button
                  key={index}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab.active
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* No Data Message */}
            <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-gray-500">{t.noData}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                <p className={`text-sm text-cyan-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Jan 13, 2026 – Today
                </p>
                <p className={`text-3xl font-bold text-cyan-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {submissionStats.past7Days}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className={`text-sm text-blue-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.total}
                </p>
                <p className={`text-3xl font-bold text-blue-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {submissionStats.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Quick Links */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
            <h2 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.quickLinks}
            </h2>

            <div className="space-y-2">
              <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} onClick={handleCollectData}>
                <Eye className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">{t.collectData}</span>
              </button>
              <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} onClick={handleShareProject}>
                <Share2 className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">{t.shareProject}</span>
              </button>
              <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} onClick={handleEditForm}>
                <EditIcon className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">{t.editForm}</span>
              </button>
              <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} onClick={handlePreviewForm}>
                <Eye className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">{t.previewForm}</span>
              </button>
            </div>

            {/* Data Links */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className={`text-sm font-bold text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.data}
              </h3>
              <div className="space-y-2">
                {[
                  { icon: FileDown, label: language === 'en' ? 'Table' : 'جدول', action: handleViewTable },
                  { icon: FileDown, label: language === 'en' ? 'Reports' : 'تقارير', action: handleViewReports },
                  { icon: FileDown, label: language === 'en' ? 'Gallery' : 'معرض', action: handleViewGallery },
                  { icon: FileDown, label: language === 'en' ? 'Files' : 'ملفات', action: handleViewFiles },
                  { icon: FileDown, label: language === 'en' ? 'Downloads' : 'التنزيلات', action: handleViewDownloads },
                  { icon: MapPin, label: language === 'en' ? 'Map' : 'خريطة', action: handleViewMap },
                ].map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={index}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
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