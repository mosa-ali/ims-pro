/**
 * ============================================================================
 * ATTENDANCE DASHBOARD (REAL DATABASE VERSION)
 * ============================================================================
 * Uses:
 * - tRPC real database queries
 * - Real attendance KPIs
 * - Real overtime
 * - Real pending approvals
 * - Real flagged records
 * - Real attendance records for drilldown
 * ============================================================================
 */

import { useState, useEffect, useMemo } from "react";
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
  Unlock
} from "lucide-react";

import { useNavigate } from "@/lib/router-compat";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { trpc } from "@/lib/trpc";

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

interface KPIRecord {
  id: number;
  employeeId: number;
  staffName: string;
  staffId: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  workHours?: number;
  overtimeHours?: number;
  approvalStatus?: string;
  notes?: string;
}

export function AttendanceDashboard() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

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

  const [drillDownModal, setDrillDownModal] = useState({
    isOpen: false,
    type: null as
      | "pending_approvals"
      | "overtime"
      | "attendance_rate"
      | "late_arrivals"
      | "absent_count"
      | "on_leave_count"
      | null,
    title: ""
  });

  /**
   * Current month date range
   */
  const currentMonthRange = useMemo(() => {
    const now = new Date();

    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    )
      .toISOString()
      .split("T")[0];

    const endDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0];

    return {
      startDate,
      endDate
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
   * Real dashboard metrics
   */
  const {
    data: dashboardMetrics,
    isLoading: metricsLoading
  } = trpc.hrAttendance.getDashboardMetrics.useQuery(
    currentMonthRange,
    {
      enabled: !!currentOrganizationId,
      refetchInterval: 30000
    }
  );

  /**
   * Real attendance records
   */
  const {
    data: attendanceRecords = []
  } = trpc.hrAttendance.getAll.useQuery(
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
   * Load dashboard stats
   */
  useEffect(() => {
    if (!dashboardMetrics) return;

    const today = new Date().toISOString().split("T")[0];

    const todayRecords = (attendanceRecords as any[]).filter(
      (r) => r.date === today
    );

    const flaggedCount = (attendanceRecords as any[]).filter(
      (r) =>
        r.status === "late" ||
        r.status === "absent" ||
        r.approvalStatus === "rejected"
    ).length;

    setStats({
      totalStaff: employeeCounts?.active ?? 0,

      presentToday: todayRecords.filter(
        (r) =>
          r.status === "present" ||
          r.status === "half_day"
      ).length,

      absentToday: todayRecords.filter(
        (r) => r.status === "absent"
      ).length,

      lateArrivals: todayRecords.filter(
        (r) => r.status === "late"
      ).length,

      overtimeHoursToday: todayRecords.reduce(
        (sum, r) =>
          sum + Number(r.overtimeHours || 0),
        0
      ),

      overtimeHoursPeriod:
        dashboardMetrics.overtimeHours || 0,

      pendingApprovals:
        dashboardMetrics.pendingApprovalsCount || 0,

      flaggedRecords: flaggedCount
    });

    /**
     * Temporary period logic
     * until dedicated attendance_periods table exists
     */
    const now = new Date();

    setCurrentPeriod({
      monthName: now.toLocaleString("en-US", {
        month: "long"
      }),
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

  }, [dashboardMetrics, attendanceRecords, employeeCounts]);

  /**
   * Drilldown
   */
  const openDrillDown = (type: any, title: string) => {
    setDrillDownModal({
      isOpen: true,
      type,
      title
    });
  };

  const closeDrillDown = () => {
    setDrillDownModal({
      isOpen: false,
      type: null,
      title: ""
    });
  };

  const getDrillDownRecords = (): KPIRecord[] => {
    if (!drillDownModal.type) return [];

    const records = (attendanceRecords as any[]);

    switch (drillDownModal.type) {
      case "pending_approvals":
        return records.filter(
          (r) => r.approvalStatus === "pending"
        );

      case "overtime":
        return records.filter(
          (r) => Number(r.overtimeHours || 0) > 0
        );

      case "late_arrivals":
        return records.filter(
          (r) => r.status === "late"
        );

      case "absent_count":
        return records.filter(
          (r) => r.status === "absent"
        );

      case "on_leave_count":
        return records.filter(
          (r) => r.status === "on_leave"
        );

      default:
        return records;
    }
  };

  const KPI_CARD = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    color: string,
    onClick?: () => void
  ) => (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border p-6 cursor-pointer hover:shadow-lg transition"
    >
      <div className="mb-4">{icon}</div>

      <div className="text-start">
        <p className="text-sm text-gray-600">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>
          {value}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className="space-y-6"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <BackButton
        href="/organization/hr"
        label={t.hrAttendance.hrDashboard}
      />

      <div>
        <h1 className="text-2xl font-bold">
          {t.hrAttendance.attendanceManagement}
        </h1>
        <p className="text-sm text-gray-600">
          {t.hr.attendanceSubtitle}
        </p>
      </div>

      {/* Current Period */}
      {currentPeriod && (
        <div className="bg-blue-50 border rounded-lg p-4 flex justify-between">
          <div className="flex gap-3 items-center">
            <Unlock className="w-5 h-5 text-blue-600" />

            <div>
              <p className="font-semibold">
                Current Period:{" "}
                {currentPeriod.monthName}{" "}
                {currentPeriod.year}
              </p>

              <p className="text-sm text-gray-600">
                Lock Deadline:{" "}
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
            Period Management
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI_CARD(
          "Total Staff",
          stats.totalStaff,
          <Users className="w-6 h-6 text-gray-600" />,
          "text-gray-900"
        )}

        {KPI_CARD(
          "Present Today",
          stats.presentToday,
          <UserCheck className="w-6 h-6 text-green-600" />,
          "text-green-600"
        )}

        {KPI_CARD(
          "Absent Today",
          stats.absentToday,
          <UserX className="w-6 h-6 text-red-600" />,
          "text-red-600"
        )}

        {KPI_CARD(
          "Late Arrivals",
          stats.lateArrivals,
          <Clock className="w-6 h-6 text-yellow-600" />,
          "text-yellow-600"
        )}

        {KPI_CARD(
          "Overtime Today",
          stats.overtimeHoursToday.toFixed(1),
          <Timer className="w-6 h-6 text-purple-600" />,
          "text-purple-600"
        )}

        {KPI_CARD(
          "Overtime This Month",
          stats.overtimeHoursPeriod.toFixed(1),
          <Timer className="w-6 h-6 text-indigo-600" />,
          "text-indigo-600"
        )}

        {KPI_CARD(
          "Pending Approvals",
          stats.pendingApprovals,
          <AlertCircle className="w-6 h-6 text-orange-600" />,
          "text-orange-600",
          () =>
            openDrillDown(
              "pending_approvals",
              "Pending Approvals"
            )
        )}

        {KPI_CARD(
          "Flagged Records",
          stats.flaggedRecords,
          <AlertCircle className="w-6 h-6 text-pink-600" />,
          "text-pink-600"
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() =>
            navigate(
              "/organization/hr/attendance/calendar"
            )
          }
          className="p-4 bg-white border rounded-lg"
        >
          <Calendar className="w-6 h-6 text-blue-600 mb-2" />
          View Calendar
        </button>

        <button
          onClick={() =>
            navigate(
              "/organization/hr/attendance/records"
            )
          }
          className="p-4 bg-white border rounded-lg"
        >
          <FileText className="w-6 h-6 text-green-600 mb-2" />
          View Records
        </button>

        <button
          onClick={() =>
            navigate(
              "/organization/hr/attendance/reports"
            )
          }
          className="p-4 bg-white border rounded-lg"
        >
          <Download className="w-6 h-6 text-orange-600 mb-2" />
          Reports
        </button>
      </div>

      {/* Drilldown modal */}
      {drillDownModal.type && (
        <KPIDrillDownModal
          isOpen={drillDownModal.isOpen}
          onClose={closeDrillDown}
          title={drillDownModal.title}
          kpiType={drillDownModal.type}
          records={getDrillDownRecords()}
          isLoading={metricsLoading}
        />
      )}
    </div>
  );
}