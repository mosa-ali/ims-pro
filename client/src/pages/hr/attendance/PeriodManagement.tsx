/**
 * ============================================================================
 * ATTENDANCE PERIOD MANAGEMENT
 * ============================================================================
 * Production Version
 * - Uses MySQL persisted periods
 * - Uses tRPC backend
 * - Multi-org isolation
 * - Multi-operating unit isolation
 * - RTL/LTR support
 * - Auto-create current + next 3 months
 * ============================================================================
 */

import { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  Calendar,
  AlertCircle,
  Clock,
} from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";
import { trpc } from "@/lib/trpc";

interface AttendancePeriod {
  id: number;
  periodMonth: number;
  periodYear: number;
  monthName: string;
  status:
  | "open"
  | "locked"
  | "processing_payroll"
  | "paid";
  lockDeadline: string | null;
  totalRecords: number;
  approvedRecords: number;
  pendingRecords: number;
  lockedBy?: string | null;
  lockedAt?: string | null;
}

export function PeriodManagement() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const [selectedPeriod, setSelectedPeriod] =
    useState<AttendancePeriod | null>(null);

  const [showLockConfirmation, setShowLockConfirmation] =
    useState(false);

  const [showUnlockConfirmation, setShowUnlockConfirmation] =
    useState(false);

  /*
  =====================================================
  LOAD PERIODS FROM DATABASE
  =====================================================
  */
  const {
    data: periods = [],
    refetch,
    isLoading,
  } = trpc.hrAttendance.getAttendancePeriods.useQuery();

  /*
  =====================================================
  AUTO CREATE CURRENT + NEXT 3 MONTHS
  =====================================================
  */
  const createPeriodMutation =
    trpc.hrAttendance.createOrUpdateAttendancePeriod.useMutation({
      onSuccess: () => {
        refetch();
      },
    });

  useEffect(() => {
    const now = new Date();

    for (let i = 0; i < 4; i++) {
      const target = new Date(
        now.getFullYear(),
        now.getMonth() + i,
        1
      );

      createPeriodMutation.mutate({
        periodMonth: target.getMonth() + 1,
        periodYear: target.getFullYear(),
      });
    }
  }, []);

  /*
  =====================================================
  LOCK PERIOD
  =====================================================
  */
  const lockMutation =
    trpc.hrAttendance.lockAttendancePeriod.useMutation({
      onSuccess: () => {
        refetch();
        setShowLockConfirmation(false);
        setSelectedPeriod(null);
      },
    });

  const handleLockPeriod = () => {
    if (!selectedPeriod) return;

    lockMutation.mutate({
      periodMonth: selectedPeriod.periodMonth,
      periodYear: selectedPeriod.periodYear,
    });
  };

  /*
  =====================================================
  UNLOCK PERIOD
  =====================================================
  */
  const unlockMutation =
    trpc.hrAttendance.unlockAttendancePeriod.useMutation({
      onSuccess: () => {
        refetch();
        setShowUnlockConfirmation(false);
        setSelectedPeriod(null);
      },
    });

  const handleUnlockPeriod = () => {
    if (!selectedPeriod) return;

    unlockMutation.mutate({
      periodMonth: selectedPeriod.periodMonth,
      periodYear: selectedPeriod.periodYear,
    });
  };

  const labels = {
    title: t.hrAttendance.periodManagement,
    subtitle: t.hr.periodManagementSubtitle,
    open: t.hrAttendance.open,
    locked: t.hrAttendance.locked,
    lockPeriod: t.hrAttendance.lockPeriod,
    unlockPeriod: t.hrAttendance.unlockPeriod,
    totalRecords: t.hrAttendance.totalRecords,
    approvedRecords: t.hrAttendance.approved,
    pendingRecords: t.hrAttendance.pending,
    lockDeadline: t.hrAttendance.lockDeadline,
    confirm: t.hrAttendance.confirm,
    cancel: t.hrAttendance.cancel,
    noPeriods: t.hrAttendance.noPeriodsFound,
    lockedBy: t.hrAttendance.lockedBy,
    lockedAt: t.hrAttendance.lockedAt,
    aboutLocking: t.hrAttendance.aboutPeriodLocking,
  };

  return (
    <div
      className="space-y-6"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Back Button */}
      <BackButton
        href="/organization/hr/attendance"
        label={t.hrAttendance.attendanceDashboard}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 text-start">
          {labels.title}
        </h1>

        <p className="text-sm text-gray-600 mt-1 text-start">
          {labels.subtitle}
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-1" />

          <div className="text-start">
            <p className="font-semibold text-blue-900">
              {labels.aboutLocking}
            </p>

            <p className="text-sm text-blue-700 mt-1">
              Locking a period prevents modifications and protects payroll integrity.
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white p-10 rounded-lg text-center">
          Loading periods...
        </div>
      )}

      {/* No periods */}
      {!isLoading && periods.length === 0 && (
        <div className="bg-white p-10 rounded-lg text-center">
          <Calendar className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p>{labels.noPeriods}</p>
        </div>
      )}

      {/* Period list */}
      {!isLoading &&
        periods.map((period: AttendancePeriod) => {
          const isLocked = period.status === "1";

          const approvalProgress =
            period.totalRecords > 0
              ? Math.round(
                  (period.approvedRecords /
                    period.totalRecords) *
                    100
                )
              : 0;

          return (
            <div
              key={period.id}
              className="bg-white rounded-lg border p-6"
            >
              <div className="flex justify-between items-start gap-6">

                {/* Left */}
                <div className="flex-1 text-start">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-xl font-bold">
                      {period.monthName} {period.periodYear}
                    </h3>

                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        isLocked
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {isLocked
                        ? labels.locked
                        : labels.open}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        {labels.totalRecords}
                      </p>
                      <p className="font-bold text-lg">
                        {period.totalRecords}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        {labels.approvedRecords}
                      </p>
                      <p className="font-bold text-lg text-green-600">
                        {period.approvedRecords}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        {labels.pendingRecords}
                      </p>
                      <p className="font-bold text-lg text-orange-600">
                        {period.pendingRecords}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${approvalProgress}%`,
                        }}
                      />
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {labels.lockDeadline}:{" "}
                      {period.lockDeadline || "-"}
                    </div>
                  )}

                  {isLocked && period.lockedBy && (
                    <div className="mt-3 text-sm text-red-600">
                      {labels.lockedBy}: {period.lockedBy}
                    </div>
                  )}
                </div>

                {/* Right actions */}
                <div>
                  {isLocked ? (
                    <button
                      onClick={() => {
                        setSelectedPeriod(period);
                        setShowUnlockConfirmation(true);
                      }}
                      className="px-5 py-3 bg-green-600 text-white rounded-lg"
                    >
                      {labels.unlockPeriod}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedPeriod(period);
                        setShowLockConfirmation(true);
                      }}
                      className="px-5 py-3 bg-red-600 text-white rounded-lg"
                    >
                      {labels.lockPeriod}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

      {/* Lock Modal */}
      {showLockConfirmation && selectedPeriod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h2 className="text-xl font-bold mb-4">
              {labels.lockPeriod}
            </h2>

            <p className="mb-6">
              {selectedPeriod.monthName}{" "}
              {selectedPeriod.periodYear}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleLockPeriod}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg"
              >
                {labels.confirm}
              </button>

              <button
                onClick={() => {
                  setShowLockConfirmation(false);
                  setSelectedPeriod(null);
                }}
                className="flex-1 border py-3 rounded-lg"
              >
                {labels.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {showUnlockConfirmation && selectedPeriod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h2 className="text-xl font-bold mb-4">
              {labels.unlockPeriod}
            </h2>

            <p className="mb-6">
              {selectedPeriod.monthName}{" "}
              {selectedPeriod.periodYear}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleUnlockPeriod}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg"
              >
                {labels.confirm}
              </button>

              <button
                onClick={() => {
                  setShowUnlockConfirmation(false);
                  setSelectedPeriod(null);
                }}
                className="flex-1 border py-3 rounded-lg"
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