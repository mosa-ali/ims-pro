import React from 'react';
import { AlertTriangle, Loader2, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface SystemStatusScreenProps {
 status: 'INITIALIZING' | 'UNAVAILABLE' | 'ERROR' | 'READY';
 message?: string;
 onRetry?: () => void;
}

export const SystemStatusScreen: React.FC<SystemStatusScreenProps> = ({ 
 status, 
 message, 
 onRetry 
}) => {
 const { language } = useTranslation();
 const isRtl = language === 'ar';

 const contentMap = {
 INITIALIZING: {
 title: isRtl ? 'جاري تهيئة النظام' : 'System Initializing',
 description: message || (isRtl 
 ? 'الخدمات الخلفية تبدأ حالياً. يرجى الانتظار.' 
 : 'Backend services are starting. Please wait.'),
 icon: <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />,
 color: 'blue'
 },
 UNAVAILABLE: {
 title: isRtl ? 'النظام غير متاح' : 'System Unavailable',
 description: message || (isRtl 
 ? 'لا يمكن الوصول إلى الخدمات الأساسية حالياً.' 
 : 'Core services are currently unreachable.'),
 icon: <AlertTriangle className="w-16 h-16 text-amber-500" />,
 color: 'amber'
 },
 ERROR: {
 title: isRtl ? 'خطأ في النظام' : 'System Error',
 description: message || (isRtl 
 ? 'حدث خطأ غير متوقع أثناء فحص جاهزية النظام.' 
 : 'An unexpected error occurred during readiness check.'),
 icon: <ShieldAlert className="w-16 h-16 text-red-500" />,
 color: 'red'
 },
 READY: {
 title: isRtl ? 'النظام جاهز' : 'System Ready',
 description: message || (isRtl 
 ? 'جميع الخدمات تعمل بشكل صحيح. النظام جاهز للاستخدام.' 
 : 'All services are operational. The system is ready for use.'),
 icon: <CheckCircle2 className="w-16 h-16 text-green-500" />,
 color: 'green'
 }
 };

 const content = contentMap[status] || contentMap.ERROR;

 return (
 <div className={`min-h-screen flex items-center justify-center bg-gray-50 p-4 ${isRtl ? 'rtl' : 'ltr'}`}>
 <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
 <div className="flex justify-center mb-6">
 {content.icon}
 </div>
 
 <h1 className="text-2xl font-bold text-gray-900 mb-2">
 {content.title}
 </h1>
 
 <p className="text-gray-600 mb-8">
 {content.description}
 </p>

 <div className="space-y-4">
 {(status === 'UNAVAILABLE' || status === 'ERROR') && (
 <button
 type="button"
 onClick={onRetry || (() => window.location.reload())}
 className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
 >
 <RefreshCw className="w-4 h-4" />
 {isRtl ? 'إعادة المحاولة' : 'Retry Connection'}
 </button>
 )}
 
 <div className="pt-4 border-t border-gray-100">
 <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
 {isRtl ? 'حالة النظام' : 'System Status Gate'}
 </p>
 <div className="mt-2 flex items-center justify-center gap-2">
 <span className={`w-2 h-2 rounded-full ${status === 'INITIALIZING' ? 'bg-blue-400 animate-pulse' : status === 'READY' ? 'bg-green-500' : 'bg-red-400'}`}></span>
 <span className="text-sm text-gray-500">
 {status === 'INITIALIZING' 
 ? (isRtl ? 'جاري التحقق...' : 'Checking readiness...') 
 : status === 'READY'
 ? (isRtl ? 'متصل' : 'Connected')
 : (isRtl ? 'فشل الاتصال' : 'Connection failed')}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};
