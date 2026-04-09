import { useTranslation } from '@/i18n/useTranslation';
import { useState, useMemo } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

const PASSWORD_RULES = [
 { id: 'length', en: 'At least 8 characters', ar: 'على الأقل 8 أحرف', test: (p: string) => p.length >= 8 },
 { id: 'upper', en: 'One uppercase letter', ar: 'حرف كبير واحد', test: (p: string) => /[A-Z]/.test(p) },
 { id: 'lower', en: 'One lowercase letter', ar: 'حرف صغير واحد', test: (p: string) => /[a-z]/.test(p) },
 { id: 'number', en: 'One number', ar: 'رقم واحد', test: (p: string) => /[0-9]/.test(p) },
 { id: 'special', en: 'One special character (!@#$%^&*)', ar: 'حرف خاص واحد (!@#$%^&*)', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function getPasswordStrength(password: string): { score: number; label: string; labelAr: string; color: string } {
 const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
 if (passed <= 1) return { score: 1, label: 'Very Weak', labelAr: 'ضعيفة جداً', color: 'bg-red-500' };
 if (passed === 2) return { score: 2, label: 'Weak', labelAr: 'ضعيفة', color: 'bg-orange-500' };
 if (passed === 3) return { score: 3, label: 'Fair', labelAr: 'مقبولة', color: 'bg-yellow-500' };
 if (passed === 4) return { score: 4, label: 'Strong', labelAr: 'قوية', color: 'bg-green-500' };
 return { score: 5, label: 'Very Strong', labelAr: 'قوية جداً', color: 'bg-emerald-500' };
}

export default function PasswordResetPage() {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 const [, params] = useRoute('/reset-password/:token');
 const token = params?.token || '';

 const [password, setPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [showConfirm, setShowConfirm] = useState(false);
 const [success, setSuccess] = useState(false);
 const [error, setError] = useState('');

 const strength = useMemo(() => getPasswordStrength(password), [password]);
 const allRulesPassed = PASSWORD_RULES.every(r => r.test(password));
 const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
 const canSubmit = allRulesPassed && passwordsMatch;

 const resetMutation = trpc.ims.passwordManagement.resetPassword.useMutation({
 onSuccess: () => {
 setSuccess(true);
 setError('');
 },
 onError: (err) => {
 setError(err.message || 'Failed to reset password. The token may be expired or invalid.');
 },
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!canSubmit) return;
 resetMutation.mutate({ token, newPassword: password });
 };

 if (success) {
 return (
 <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <CheckCircle className="w-8 h-8 text-green-500" />
 </div>
 <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset Successful</h2>
 <p className="text-gray-600 mb-2">تم إعادة تعيين كلمة المرور بنجاح</p>
 <p className="text-sm text-gray-500 mb-6">You can now log in with your new password.</p>
 <BackButton href="/" label={t.common.goToLogin} />
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
 {/* Header */}
 <div className="text-center mb-6">
 <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
 <Lock className="w-7 h-7 text-blue-600" />
 </div>
 <h1 className="text-xl font-bold text-gray-900">Reset Your Password</h1>
 <p className="text-gray-500 text-sm mt-1">إعادة تعيين كلمة المرور</p>
 <p className="text-gray-500 text-xs mt-1">Enter your new password below</p>
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
 <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
 <p className="text-sm text-red-700">{error}</p>
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 {/* New Password */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">New Password / كلمة المرور الجديدة</label>
 <div className="relative">
 <input
 type={showPassword ? 'text' : 'password'}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder={t.placeholders.enterNewPassword}
 className="w-full border border-gray-200 rounded-lg py-2.5 px-4 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
 >
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>

 {/* Strength Indicator */}
 {password.length > 0 && (
 <div className="mt-2">
 <div className="flex items-center gap-2 mb-1.5">
 <div className="flex-1 flex gap-1">
 {[1, 2, 3, 4, 5].map((level) => (
 <div
 key={level}
 className={`h-1.5 flex-1 rounded-full transition-colors ${ level <= strength.score ? strength.color : 'bg-gray-200' }`}
 />
 ))}
 </div>
 <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>
 {strength.label} / {strength.labelAr}
 </span>
 </div>
 </div>
 )}
 </div>

 {/* Password Rules */}
 {password.length > 0 && (
 <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
 {PASSWORD_RULES.map((rule) => {
 const passed = rule.test(password);
 return (
 <div key={rule.id} className="flex items-center gap-2">
 {passed ? (
 <CheckCircle className="w-3.5 h-3.5 text-green-500" />
 ) : (
 <XCircle className="w-3.5 h-3.5 text-gray-300" />
 )}
 <span className={`text-xs ${passed ? 'text-green-700' : 'text-gray-500'}`}>
 {rule.en} / {rule.ar}
 </span>
 </div>
 );
 })}
 </div>
 )}

 {/* Confirm Password */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password / تأكيد كلمة المرور</label>
 <div className="relative">
 <input
 type={showConfirm ? 'text' : 'password'}
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 placeholder={t.placeholders.confirmNewPassword}
 className={`w-full border rounded-lg py-2.5 px-4 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ confirmPassword.length > 0 && !passwordsMatch ? 'border-red-300' : 'border-gray-200' }`}
 />
 <button
 type="button"
 onClick={() => setShowConfirm(!showConfirm)}
 className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
 >
 {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 {confirmPassword.length > 0 && !passwordsMatch && (
 <p className="text-xs text-red-500 mt-1">Passwords do not match / كلمات المرور غير متطابقة</p>
 )}
 {passwordsMatch && (
 <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
 <CheckCircle className="w-3 h-3" /> Passwords match / كلمات المرور متطابقة
 </p>
 )}
 </div>

 {/* Submit */}
 <button
 type="submit"
 disabled={!canSubmit || resetMutation.isPending}
 className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 {resetMutation.isPending ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
 Processing...
 </>
 ) : (
 <>
 <Shield className="w-4 h-4" />
 Reset Password / إعادة تعيين كلمة المرور
 </>
 )}
 </button>
 </form>
 </div>
 </div>
 );
}
