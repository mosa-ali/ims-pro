/**
 * ============================================================================
 * ATTENDANCE PERIOD MANAGEMENT
 * ============================================================================
 * 
 * Lock and unlock attendance periods for payroll
 * - Visual status indicators
 * - Lock/unlock actions
 * - Period statistics
 * - Lock deadline warnings
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { useState, useEffect } from 'react';
import {
 Lock,
 Unlock,
 Calendar,
 AlertCircle,
 CheckCircle,
 Clock,
 FileText
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { attendanceService, AttendancePeriod } from '@/app/services/attendanceService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function PeriodManagement() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();

 const [periods, setPeriods] = useState<AttendancePeriod[]>([]);
 const [selectedPeriod, setSelectedPeriod] = useState<AttendancePeriod | null>(null);
 const [showLockConfirmation, setShowLockConfirmation] = useState(false);
 const [showUnlockConfirmation, setShowUnlockConfirmation] = useState(false);

 useEffect(() => {
 loadPeriods();
 }, []);

 const loadPeriods = () => {
 // Get all periods
 let allPeriods = attendanceService.getAllPeriods();
 
 // Create current and next 3 months if they don't exist
 const now = new Date();
 for (let i = 0; i < 4; i++) {
 const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
 const periodMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
 
 const exists = allPeriods.find(p => p.month === periodMonth);
 if (!exists) {
 const newPeriod = attendanceService.createOrUpdatePeriod(periodMonth);
 allPeriods.push(newPeriod);
 }
 }
 
 // Sort by month descending
 allPeriods.sort((a, b) => b.month.localeCompare(a.month));
 
 setPeriods(allPeriods);
 };

 const handleLockPeriod = () => {
 if (!selectedPeriod) return;
 
 const success = attendanceService.lockPeriod(selectedPeriod.month, 'Current User'); // TODO: Get real user
 
 if (success) {
 setShowLockConfirmation(false);
 setSelectedPeriod(null);
 loadPeriods();
 alert('Period locked successfully');
 }
 };

 const handleUnlockPeriod = () => {
 if (!selectedPeriod) return;
 
 const success = attendanceService.unlockPeriod(selectedPeriod.month);
 
 if (success) {
 setShowUnlockConfirmation(false);
 setSelectedPeriod(null);
 loadPeriods();
 alert('Period unlocked successfully');
 }
 };

 const openLockConfirmation = (period: AttendancePeriod) => {
 setSelectedPeriod(period);
 setShowLockConfirmation(true);
 };

 const openUnlockConfirmation = (period: AttendancePeriod) => {
 setSelectedPeriod(period);
 setShowUnlockConfirmation(true);
 };

 const labels = {
 title: t.hrAttendance.periodManagement,
 subtitle: t.hr.periodManagementSubtitle,
 
 period: t.hrAttendance.period,
 status: t.hrAttendance.status,
 lockDeadline: t.hrAttendance.lockDeadline,
 statistics: t.hrAttendance.statistics,
 actions: t.hrAttendance.actions,
 
 open: t.hrAttendance.open,
 locked: t.hrAttendance.locked,
 
 lockPeriod: t.hrAttendance.lockPeriod,
 unlockPeriod: t.hrAttendance.unlockPeriod,
 
 totalRecords: t.hrAttendance.totalRecords,
 approvedRecords: t.hrAttendance.approved,
 pendingRecords: t.hrAttendance.pending,
 
 lockedBy: t.hrAttendance.lockedBy,
 lockedAt: t.hrAttendance.lockedAt,
 
 // Confirmation Modals
 lockConfirmTitle: t.hrAttendance.confirmPeriodLock,
 lockConfirmMessage: 'Are you sure you want to lock this period? Once locked, no attendance records can be added or modified for this period.',
 
 unlockConfirmTitle: t.hrAttendance.confirmPeriodUnlock,
 unlockConfirmMessage: 'Are you sure you want to unlock this period? This will allow modifications to attendance records again.',
 
 confirm: t.hrAttendance.confirm,
 cancel: t.hrAttendance.cancel,
 
 // Warnings
 pendingWarning: 'Warning: This period has pending approvals. It is recommended to approve all records before locking.',
 
 noPeriods: t.hrAttendance.noPeriodsFound
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 <BackButton href="/organization/hr/attendance" label={t.hrAttendance.attendanceDashboard} />

 {/* Header */}
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 text-start`}>
 {labels.title}
 </h1>
 <p className={`text-sm text-gray-600 mt-1 text-start`}>
 {labels.subtitle}
 </p>
 </div>

 {/* Info Banner */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <div className={`flex items-start gap-3`}>
 <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm font-semibold text-blue-900">
 {t.hrAttendance.aboutPeriodLocking}
 </p>
 <p className="text-sm text-blue-700 mt-1">
 {'Locking a period prevents any changes to attendance records for that month. This ensures data integrity for payroll processing. Only unlock periods if corrections are absolutely necessary.'}
 </p>
 </div>
 </div>
 </div>

 {/* Periods List */}
 <div className="space-y-4">
 {periods.length === 0 ? (
 <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
 <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-500">{labels.noPeriods}</p>
 </div>
 ) : (
 periods.map((period) => {
 const isLocked = period.status === 'locked';
 const hasPendingApprovals = period.pendingRecords > 0;
 const approvalProgress = period.totalRecords > 0 
 ? Math.round((period.approvedRecords / period.totalRecords) * 100) 
 : 0;

 return (
 <div
 key={period.id}
 className={`bg-white rounded-lg border-2 ${isLocked ? 'border-red-300' : 'border-gray-200'} p-6`}
 >
 <div className={`flex items-start justify-between`}>
 {/* Left Side - Period Info */}
 <div className={`flex-1 text-start`}>
 <div className={`flex items-center gap-3 mb-3`}>
 <h3 className="text-xl font-bold text-gray-900">
 {period.monthName} {period.year}
 </h3>
 <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${ isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700' }`}>
 {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
 {isLocked ? labels.locked : labels.open}
 </span>
 </div>

 {/* Statistics */}
 <div className="grid grid-cols-3 gap-4 mb-4">
 <div>
 <p className="text-xs text-gray-600 mb-1">{labels.totalRecords}</p>
 <p className="text-lg font-bold text-gray-900">{period.totalRecords}</p>
 </div>
 <div>
 <p className="text-xs text-gray-600 mb-1">{labels.approvedRecords}</p>
 <p className="text-lg font-bold text-green-600">{period.approvedRecords}</p>
 </div>
 <div>
 <p className="text-xs text-gray-600 mb-1">{labels.pendingRecords}</p>
 <p className="text-lg font-bold text-orange-600">{period.pendingRecords}</p>
 </div>
 </div>

 {/* Approval Progress Bar */}
 <div className="mb-4">
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div
 className="bg-green-500 h-2 rounded-full transition-all"
 style={{ width: `${approvalProgress}%` }}
 ></div>
 </div>
 <p className="text-xs text-gray-600 mt-1">
 {approvalProgress}% {t.hrAttendance.approved}
 </p>
 </div>

 {/* Lock Deadline */}
 {!isLocked && (
 <div className={`flex items-center gap-2 text-sm`}>
 <Clock className="w-4 h-4 text-gray-600" />
 <span className="text-gray-600">
 {labels.lockDeadline}: <span className="font-semibold text-gray-900">{period.lockDeadline}</span>
 </span>
 </div>
 )}

 {/* Locked Info */}
 {isLocked && period.lockedBy && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
 <p className="text-xs text-red-700">
 {labels.lockedBy}: <span className="font-semibold">{period.lockedBy}</span>
 </p>
 {period.lockedAt && (
 <p className="text-xs text-red-600 mt-1">
 {labels.lockedAt}: {new Date(period.lockedAt).toLocaleString()}
 </p>
 )}
 </div>
 )}

 {/* Warning for Pending Approvals */}
 {!isLocked && hasPendingApprovals && (
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
 <div className={`flex items-start gap-2`}>
 <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
 <p className="text-xs text-yellow-700">{labels.pendingWarning}</p>
 </div>
 </div>
 )}
 </div>

 {/* Right Side - Actions */}
 <div className="flex-shrink-0">
 {isLocked ? (
 <button
 onClick={() => openUnlockConfirmation(period)}
 className={`flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors`}
 >
 <Unlock className="w-5 h-5" />
 <span>{labels.unlockPeriod}</span>
 </button>
 ) : (
 <button
 onClick={() => openLockConfirmation(period)}
 className={`flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors`}
 >
 <Lock className="w-5 h-5" />
 <span>{labels.lockPeriod}</span>
 </button>
 )}
 </div>
 </div>
 </div>
 );
 })
 )}
 </div>

 {/* Lock Confirmation Modal */}
 {showLockConfirmation && selectedPeriod && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg max-w-md w-full">
 <div className={`p-6 border-b border-gray-200 text-start`}>
 <div className={`flex items-center gap-3 mb-2`}>
 <div className="p-2 bg-red-100 rounded-lg">
 <Lock className="w-6 h-6 text-red-600" />
 </div>
 <h2 className="text-xl font-bold text-gray-900">{labels.lockConfirmTitle}</h2>
 </div>
 <p className="text-sm text-gray-600">
 {selectedPeriod.monthName} {selectedPeriod.year}
 </p>
 </div>

 <div className={`p-6 text-start`}>
 <p className="text-gray-700 mb-4">{labels.lockConfirmMessage}</p>
 
 {selectedPeriod.pendingRecords > 0 && (
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
 <div className={`flex items-start gap-2`}>
 <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-yellow-700">{labels.pendingWarning}</p>
 </div>
 </div>
 )}
 </div>

 <div className={`p-6 border-t border-gray-200 flex items-center gap-3`}>
 <button
 onClick={handleLockPeriod}
 className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
 >
 {labels.confirm}
 </button>
 <button
 onClick={() => {
 setShowLockConfirmation(false);
 setSelectedPeriod(null);
 }}
 className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
 >
 {labels.cancel}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Unlock Confirmation Modal */}
 {showUnlockConfirmation && selectedPeriod && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg max-w-md w-full">
 <div className={`p-6 border-b border-gray-200 text-start`}>
 <div className={`flex items-center gap-3 mb-2`}>
 <div className="p-2 bg-green-100 rounded-lg">
 <Unlock className="w-6 h-6 text-green-600" />
 </div>
 <h2 className="text-xl font-bold text-gray-900">{labels.unlockConfirmTitle}</h2>
 </div>
 <p className="text-sm text-gray-600">
 {selectedPeriod.monthName} {selectedPeriod.year}
 </p>
 </div>

 <div className={`p-6 text-start`}>
 <p className="text-gray-700">{labels.unlockConfirmMessage}</p>
 </div>

 <div className={`p-6 border-t border-gray-200 flex items-center gap-3`}>
 <button
 onClick={handleUnlockPeriod}
 className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
 >
 {labels.confirm}
 </button>
 <button
 onClick={() => {
 setShowUnlockConfirmation(false);
 setSelectedPeriod(null);
 }}
 className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
 >
 {labels.cancel}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
