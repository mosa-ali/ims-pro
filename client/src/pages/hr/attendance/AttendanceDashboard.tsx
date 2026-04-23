/**
 * ============================================================================
 * ATTENDANCE DASHBOARD - FINAL PRODUCTION VERSION
 * ============================================================================
 * Features:
 * - Real tRPC attendance metrics
 * - Real employee counts
 * - Real overtime calculations
 * - Real flagged records
 * - Period management support
 * - RTL/LTR support
 * - Translation-safe (NO hardcoded UI labels)
 * - Restored quick action cards
 * - Drilldown support
 * ============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Timer,
  AlertCircle,
  Calendar,
  FileText,
  Download,
  Lock,
  ClipboardCheck
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useNavigate } from "@/lib/router-compat";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";

import { BackButton } from "@/components/BackButton";
import { KPIDrillDownModal } from "./KPIDrillDownModal";

interface AttendanceStats {
  totalStaff: number;
  presentToday: number;
  absentToday: number;
  lateArrivals: number;
  overtimeHoursToday: number;
  overtimeHoursPeriod: number;
  pendingApprovals: number;
  flaggedRecords: number;
}

interface AttendancePeriod {
  monthName: string;
  year: number;
  status: "open" | "locked";
  lockDeadline: string;
}

export function AttendanceDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();

  const [stats, setStats] = useState<AttendanceStats>({
    totalStaff: 0,
    presentToday: 0,
    absentToday: 0,
    lateArrivals: 0,
    overtimeHoursToday: 0,
    overtimeHoursPeriod: 0,
    pendingApprovals: 0,
    flaggedRecords: 0
  });

  const [currentPeriod, setCurrentPeriod] =
    useState<AttendancePeriod | null>(null);

  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownType, setDrilldownType] = useState<string>("");

  /**
   * Translation labels
   */
  const labels = {
    title: t.hrAttendance.attendanceManagement,
    subtitle: t.hr.attendanceSubtitle,

    totalStaff: t.hrAttendance.totalStaff,
    presentToday: t.hrAttendance.presentToday,
    absentToday: t.hrAttendance.absentToday,
    lateArrivals: t.hrAttendance.lateArrivals,
    overtimeToday: t.hrAttendance.overtimeToday,
    overtimePeriod: t.hrAttendance.overtimeThisMonth,
    pendingApprovals: t.hrAttendance.pendingApprovals,
    flaggedRecords: t.hrAttendance.flaggedRecords,

    currentPeriod: t.hrAttendance.currentPeriod,
    lockDeadline: t.hrAttendance.lockDeadline,

    viewCalendar: t.hrAttendance.viewCalendar,
    viewRecords: t.hrAttendance.viewAllRecords,
    myAttendance: t.hrAttendance.myAttendance,
    overtimeManagement: t.hrAttendance.overtimeManagement,
    printReports: t.hrAttendance.printReports,
    periodManagement: t.hrAttendance.periodManagement,

    viewDetails: t.hrAttendance.viewDetails,
    hours: t.hrAttendance.hours1,
    records: t.hrAttendance.records
  };

  /**
   * Current month range
   */
  const currentMonthRange = useMemo(() => {
    const now = new Date();

    return {
      startDate: new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      )
        .toISOString()
        .split("T")[0],

      endDate: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      )
        .toISOString()
        .split("T")[0]
    };
  }, []);

  /**
   * Employee count
   */
  const { data: employeeCounts } =
    trpc.hrEmployees.getCounts.useQuery(
      {},
      {
        enabled: !!currentOrganizationId
      }
    );

  /**
   * Dashboard metrics
   */
  const { data: dashboardMetrics } =
    trpc.hrAttendance.getDashboardMetrics.useQuery(
      currentMonthRange,
      {
        enabled: !!currentOrganizationId,
        refetchInterval: 30000
      }
    );

  /**
   * Attendance records
   */
  const { data: attendanceRecords = [] } =
    trpc.hrAttendance.getAll.useQuery(
      {
        startDate: currentMonthRange.startDate,
        endDate: currentMonthRange.endDate,
        limit: 5000
      },
      {
        enabled: !!currentOrganizationId
      }
    );

  /**
   * Attendance periods table
   */
  const { data: periodData } =
    trpc.hrAttendance.getCurrentPeriod.useQuery(
      undefined,
      {
        enabled: !!currentOrganizationId
      }
    );

  /**
   * Calculate real stats
   */
  useEffect(() => {
    if (!attendanceRecords) return;

    const today = new Date().toISOString().split("T")[0];

    const todayRecords = attendanceRecords.filter(
      (r: any) => r.date === today
    );

    const flagged = attendanceRecords.filter(
      (r: any) =>
        r.status === "late" ||
        r.status === "absent" ||
        r.approvalStatus === "rejected"
    );

    setStats({
      totalStaff: employeeCounts?.active || 0,

      presentToday: todayRecords.filter(
        (r: any) =>
          r.status === "present" ||
          r.status === "half_day"
      ).length,

      absentToday: todayRecords.filter(
        (r: any) => r.status === "absent"
      ).length,

      lateArrivals: todayRecords.filter(
        (r: any) => r.status === "late"
      ).length,

      overtimeHoursToday: todayRecords.reduce(
        (sum: number, r: any) =>
          sum + Number(r.overtimeHours || 0),
        0
      ),

      overtimeHoursPeriod:
        dashboardMetrics?.overtimeHours || 0,

      pendingApprovals:
        dashboardMetrics?.pendingApprovalsCount || 0,

      flaggedRecords: flagged.length
    });
  }, [
    attendanceRecords,
    dashboardMetrics,
    employeeCounts
  ]);

  /**
   * Current period
   */
  useEffect(() => {
    if (periodData) {
      setCurrentPeriod(periodData);
      return;
    }

    const now = new Date();

    setCurrentPeriod({
      monthName: now.toLocaleString(
        isRTL ? "ar" : "en",
        { month: "long" }
      ),
      year: now.getFullYear(),
      status: "open",
      lockDeadline: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        4
      )
        .toISOString()
        .split("T")[0]
    });
  }, [periodData, isRTL]);

  const openDrilldown = (type: string) => {
    setDrilldownType(type);
    setDrilldownOpen(true);
  };

  const renderKPICard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    color: string,
    clickable?: boolean,
    onClick?: () => void
  ) => (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white rounded-lg border p-6 ${
        clickable
          ? "cursor-pointer hover:shadow-lg"
          : ""
      } transition`}
    >
      <div className="mb-4">{icon}</div>

      <div className="text-start">
        <p className="text-sm text-gray-600">
          {title}
        </p>

        <p className={`text-3xl font-bold ${color}`}>
          {value}
        </p>
      </div>
    </div>
  );

  const renderQuickAction = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    route: string
  ) => (
    <button
      onClick={() => navigate(route)}
      className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-lg transition"
    >
      <div className="p-3 bg-gray-50 rounded-lg">
        {icon}
      </div>

      <div className="text-start">
        <p className="font-semibold">
          {title}
        </p>
        <p className="text-xs text-gray-500">
          {subtitle}
        </p>
      </div>
    </button>
  );

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="space-y-6"
    >
      <BackButton
        href="/organization/hr"
        label={t.hrAttendance.hrDashboard}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {labels.title}
        </h1>
        <p className="text-gray-600 text-sm">
          {labels.subtitle}
        </p>
      </div>

      {/* Current Period */}
      {currentPeriod && (
        <div className="bg-blue-50 border rounded-lg p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-blue-600" />

            <div>
              <p className="font-semibold">
                {labels.currentPeriod}:{" "}
                {currentPeriod.monthName}{" "}
                {currentPeriod.year}
              </p>

              <p className="text-sm text-gray-600">
                {labels.lockDeadline}:{" "}
                {currentPeriod.lockDeadline}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              navigate(
                "/organization/hr/attendance/periods"
              )
            }
            className="px-4 py-2 bg-white border rounded-lg"
          >
            {labels.periodManagement}
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderKPICard(
          labels.totalStaff,
          stats.totalStaff,
          <Users className="w-6 h-6 text-gray-600" />,
          "text-gray-900"
        )}

        {renderKPICard(
          labels.presentToday,
          stats.presentToday,
          <UserCheck className="w-6 h-6 text-green-600" />,
          "text-green-600"
        )}

        {renderKPICard(
          labels.absentToday,
          stats.absentToday,
          <UserX className="w-6 h-6 text-red-600" />,
          "text-red-600"
        )}

        {renderKPICard(
          labels.lateArrivals,
          stats.lateArrivals,
          <Clock className="w-6 h-6 text-yellow-600" />,
          "text-yellow-600"
        )}

        {renderKPICard(
          labels.overtimeToday,
          stats.overtimeHoursToday.toFixed(1),
          <Timer className="w-6 h-6 text-purple-600" />,
          "text-purple-600"
        )}

        {renderKPICard(
          labels.overtimePeriod,
          stats.overtimeHoursPeriod.toFixed(1),
          <Timer className="w-6 h-6 text-indigo-600" />,
          "text-indigo-600"
        )}

        {renderKPICard(
          labels.pendingApprovals,
          stats.pendingApprovals,
          <AlertCircle className="w-6 h-6 text-orange-600" />,
          "text-orange-600",
          true,
          () => openDrilldown("pending")
        )}

        {renderKPICard(
          labels.flaggedRecords,
          stats.flaggedRecords,
          <AlertCircle className="w-6 h-6 text-pink-600" />,
          "text-pink-600"
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderQuickAction(
          labels.viewCalendar,
          t.hrAttendance.dayWeekMonthViews,
          <Calendar className="w-6 h-6 text-blue-600" />,
          "/organization/hr/attendance/calendar"
        )}

        {renderQuickAction(
          labels.viewRecords,
          t.hrAttendance.searchFilterExport,
          <FileText className="w-6 h-6 text-green-600" />,
          "/organization/hr/attendance/records"
        )}

        {renderQuickAction(
          labels.myAttendance,
          t.hrAttendance.viewSubmitExplanations,
          <ClipboardCheck className="w-6 h-6 text-purple-600" />,
          "/organization/hr/attendance/my-attendance"
        )}

        {renderQuickAction(
          labels.overtimeManagement,
          t.hrAttendance.approveTrackOvertime,
          <Timer className="w-6 h-6 text-indigo-600" />,
          "/organization/hr/attendance/overtime"
        )}

        {renderQuickAction(
          labels.printReports,
          t.hrAttendance.monthlySheetsExports,
          <Download className="w-6 h-6 text-orange-600" />,
          "/organization/hr/attendance/reports"
        )}

        {renderQuickAction(
          labels.periodManagement,
          t.hrAttendance.lockUnlockPeriods,
          <Lock className="w-6 h-6 text-red-600" />,
          "/organization/hr/attendance/periods"
        )}
      </div>

      {/* Drilldown Modal */}
      {drilldownOpen && (
        <KPIDrillDownModal
          open={drilldownOpen}
          type={drilldownType}
          onClose={() => setDrilldownOpen(false)}
        />
      )}
    </div>
  );
}