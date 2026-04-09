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

import { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackToModulesButton } from '../BackToModulesButton';
import { attendanceService, AttendancePeriod } from '@/app/services/attendanceService';

export function PeriodManagement() {
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
      alert(language === 'en' 
        ? 'Period locked successfully' 
        : 'تم إغلاق الفترة بنجاح');
    }
  };

  const handleUnlockPeriod = () => {
    if (!selectedPeriod) return;
    
    const success = attendanceService.unlockPeriod(selectedPeriod.month);
    
    if (success) {
      setShowUnlockConfirmation(false);
      setSelectedPeriod(null);
      loadPeriods();
      alert(language === 'en' 
        ? 'Period unlocked successfully' 
        : 'تم فتح الفترة بنجاح');
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

  const t = {
    title: language === 'en' ? 'Period Management' : 'إدارة الفترات',
    subtitle: language === 'en' 
      ? 'Lock and unlock attendance periods for payroll processing' 
      : 'إغلاق وفتح فترات الحضور لمعالجة الرواتب',
    
    period: language === 'en' ? 'Period' : 'الفترة',
    status: language === 'en' ? 'Status' : 'الحالة',
    lockDeadline: language === 'en' ? 'Lock Deadline' : 'موعد الإغلاق',
    statistics: language === 'en' ? 'Statistics' : 'إحصائيات',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    open: language === 'en' ? 'Open' : 'مفتوح',
    locked: language === 'en' ? 'Locked' : 'مغلق',
    
    lockPeriod: language === 'en' ? 'Lock Period' : 'إغلاق الفترة',
    unlockPeriod: language === 'en' ? 'Unlock Period' : 'فتح الفترة',
    
    totalRecords: language === 'en' ? 'Total Records' : 'إجمالي السجلات',
    approvedRecords: language === 'en' ? 'Approved' : 'معتمد',
    pendingRecords: language === 'en' ? 'Pending' : 'معلق',
    
    lockedBy: language === 'en' ? 'Locked By' : 'أغلقت بواسطة',
    lockedAt: language === 'en' ? 'Locked At' : 'تاريخ الإغلاق',
    
    // Confirmation Modals
    lockConfirmTitle: language === 'en' ? 'Confirm Period Lock' : 'تأكيد إغلاق الفترة',
    lockConfirmMessage: language === 'en' 
      ? 'Are you sure you want to lock this period? Once locked, no attendance records can be added or modified for this period.' 
      : 'هل أنت متأكد من إغلاق هذه الفترة؟ بمجرد الإغلاق، لن يمكن إضافة أو تعديل أي سجلات حضور لهذه الفترة.',
    
    unlockConfirmTitle: language === 'en' ? 'Confirm Period Unlock' : 'تأكيد فتح الفترة',
    unlockConfirmMessage: language === 'en' 
      ? 'Are you sure you want to unlock this period? This will allow modifications to attendance records again.' 
      : 'هل أنت متأكد من فتح هذه الفترة؟ سيسمح هذا بتعديل سجلات الحضور مرة أخرى.',
    
    confirm: language === 'en' ? 'Confirm' : 'تأكيد',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    
    // Warnings
    pendingWarning: language === 'en' 
      ? 'Warning: This period has pending approvals. It is recommended to approve all records before locking.' 
      : 'تحذير: هذه الفترة تحتوي على موافقات معلقة. يوصى بالموافقة على جميع السجلات قبل الإغلاق.',
    
    noPeriods: language === 'en' ? 'No periods found' : 'لم يتم العثور على فترات'
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackToModulesButton 
        targetPath="/organization/hr/attendance"
        parentModuleName={language === 'en' ? 'Attendance Dashboard' : 'لوحة الحضور'}
      />

      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.title}
        </h1>
        <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.subtitle}
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm font-semibold text-blue-900">
              {language === 'en' ? 'About Period Locking' : 'حول إغلاق الفترات'}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {language === 'en'
                ? 'Locking a period prevents any changes to attendance records for that month. This ensures data integrity for payroll processing. Only unlock periods if corrections are absolutely necessary.'
                : 'يمنع إغلاق الفترة أي تغييرات على سجلات الحضور لذلك الشهر. يضمن ذلك سلامة البيانات لمعالجة الرواتب. فتح الفترات فقط إذا كانت التصحيحات ضرورية للغاية.'}
            </p>
          </div>
        </div>
      </div>

      {/* Periods List */}
      <div className="space-y-4">
        {periods.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">{t.noPeriods}</p>
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
                <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {/* Left Side - Period Info */}
                  <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h3 className="text-xl font-bold text-gray-900">
                        {period.monthName} {period.year}
                      </h3>
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                        isLocked 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        {isLocked ? t.locked : t.open}
                      </span>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">{t.totalRecords}</p>
                        <p className="text-lg font-bold text-gray-900">{period.totalRecords}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">{t.approvedRecords}</p>
                        <p className="text-lg font-bold text-green-600">{period.approvedRecords}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">{t.pendingRecords}</p>
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
                        {approvalProgress}% {language === 'en' ? 'Approved' : 'معتمد'}
                      </p>
                    </div>

                    {/* Lock Deadline */}
                    {!isLocked && (
                      <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-600">
                          {t.lockDeadline}: <span className="font-semibold text-gray-900">{period.lockDeadline}</span>
                        </span>
                      </div>
                    )}

                    {/* Locked Info */}
                    {isLocked && period.lockedBy && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                        <p className="text-xs text-red-700">
                          {t.lockedBy}: <span className="font-semibold">{period.lockedBy}</span>
                        </p>
                        {period.lockedAt && (
                          <p className="text-xs text-red-600 mt-1">
                            {t.lockedAt}: {new Date(period.lockedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Warning for Pending Approvals */}
                    {!isLocked && hasPendingApprovals && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                        <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-700">{t.pendingWarning}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Side - Actions */}
                  <div className="flex-shrink-0">
                    {isLocked ? (
                      <button
                        onClick={() => openUnlockConfirmation(period)}
                        className={`flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Unlock className="w-5 h-5" />
                        <span>{t.unlockPeriod}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => openLockConfirmation(period)}
                        className={`flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Lock className="w-5 h-5" />
                        <span>{t.lockPeriod}</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className={`p-6 border-b border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="p-2 bg-red-100 rounded-lg">
                  <Lock className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t.lockConfirmTitle}</h2>
              </div>
              <p className="text-sm text-gray-600">
                {selectedPeriod.monthName} {selectedPeriod.year}
              </p>
            </div>

            <div className={`p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-gray-700 mb-4">{t.lockConfirmMessage}</p>
              
              {selectedPeriod.pendingRecords > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-700">{t.pendingWarning}</p>
                  </div>
                </div>
              )}
            </div>

            <div className={`p-6 border-t border-gray-200 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={handleLockPeriod}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                {t.confirm}
              </button>
              <button
                onClick={() => {
                  setShowLockConfirmation(false);
                  setSelectedPeriod(null);
                }}
                className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Confirmation Modal */}
      {showUnlockConfirmation && selectedPeriod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className={`p-6 border-b border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Unlock className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t.unlockConfirmTitle}</h2>
              </div>
              <p className="text-sm text-gray-600">
                {selectedPeriod.monthName} {selectedPeriod.year}
              </p>
            </div>

            <div className={`p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-gray-700">{t.unlockConfirmMessage}</p>
            </div>

            <div className={`p-6 border-t border-gray-200 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={handleUnlockPeriod}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                {t.confirm}
              </button>
              <button
                onClick={() => {
                  setShowUnlockConfirmation(false);
                  setSelectedPeriod(null);
                }}
                className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
