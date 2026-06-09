/**
 * ============================================================================
 * ATTENDANCE CALENDAR - FIXED VERSION
 * ============================================================================
 */

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type ViewMode = "day" | "week" | "month";

interface AttendanceWithEmployee {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: string | null;
  overtimeHours: string | null;
  location: string | null;
  notes: string | null;
  employeeName: string;
  employeeCode: string;
}

/* =========================================================
   DATE HELPERS (function declarations = no hoisting issues)
========================================================= */

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function getWeekDates(date: Date): Date[] {
  const start = getWeekStart(date);
  const days: Date[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  return days;
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function getMonthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDay =
    firstDay.getDay() === 0
      ? 6
      : firstDay.getDay() - 1;

  const days = [];

  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(i);
  }

  return days;
}

export function AttendanceCalendar() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  const [viewMode, setViewMode] =
    useState<ViewMode>("month");

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [records, setRecords] = useState<
    AttendanceWithEmployee[]
  >([]);

  const [selectedRecord, setSelectedRecord] =
    useState<AttendanceWithEmployee | null>(null);

  const [showDetailModal, setShowDetailModal] =
    useState(false);

  /* =========================================
     DATE RANGE
  ========================================= */

  function getDateRangeStart() {
    if (viewMode === "day") return currentDate;

    if (viewMode === "week") {
      return getWeekStart(currentDate);
    }

    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
  }

  function getDateRangeEnd() {
    if (viewMode === "day") return currentDate;

    if (viewMode === "week") {
      const start = getWeekStart(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return end;
    }

    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );
  }

  /* =========================================
     API CALLS
  ========================================= */

  const attendanceQuery =
    trpc.hrAttendance.getAll.useQuery(
      {
        startDate: formatDate(
          getDateRangeStart()
        ),
        endDate: formatDate(
          getDateRangeEnd()
        ),
      },
      {
        enabled: !!user,
      }
    );

  const employeesQuery =
    trpc.hrEmployees.getAll.useQuery(
      {
        limit: 1000,
        offset: 0,
      },
      {
        enabled: !!user,
      }
    );

  useEffect(() => {
    if (
      attendanceQuery.data &&
      employeesQuery.data
    ) {
      const employeeMap = new Map(
        employeesQuery.data.map((emp) => [
          emp.id,
          emp,
        ])
      );

      const merged =
        attendanceQuery.data.map((record) => ({
          ...record,
          employeeName:
            `${employeeMap.get(record.employeeId)?.firstName || ""} ${
              employeeMap.get(record.employeeId)?.lastName || ""
            }`.trim(),
          employeeCode:
            employeeMap.get(record.employeeId)
              ?.employeeCode || "",
        }));

      setRecords(merged);
    }
  }, [
    attendanceQuery.data,
    employeesQuery.data,
  ]);

  /* =========================================
     NAVIGATION
  ========================================= */

  const navigatePrevious = () => {
    const d = new Date(currentDate);

    if (viewMode === "day") d.setDate(d.getDate() - 1);
    else if (viewMode === "week")
      d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);

    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);

    if (viewMode === "day") d.setDate(d.getDate() + 1);
    else if (viewMode === "week")
      d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);

    setCurrentDate(d);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (
    status: string
  ) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-700";
      case "absent":
        return "bg-red-100 text-red-700";
      case "late":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  /* =========================================
     DAY VIEW
  ========================================= */

  const renderDayView = () => {
    return (
      <div className="bg-white rounded-lg border p-6">
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No attendance records found
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className={`p-4 rounded-lg ${getStatusColor(
                  record.status
                )}`}
              >
                <div className="font-medium">
                  {record.employeeName}
                </div>
                <div className="text-sm">
                  {record.checkIn || "--"} →{" "}
                  {record.checkOut || "--"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* =========================================
     WEEK VIEW
  ========================================= */

  const renderWeekView = () => {
    const weekDates =
      getWeekDates(currentDate);

    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {weekDates.map((date, i) => (
            <div
              key={i}
              className="p-3 text-center font-semibold"
            >
              {date.toLocaleDateString(
                language === "en"
                  ? "en-US"
                  : "ar-SA",
                {
                  weekday: "short",
                  day: "numeric",
                }
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-h-[300px]">
          {weekDates.map((date, i) => {
            const dayRecords =
              records.filter(
                (r) =>
                  r.date === formatDate(date)
              );

            return (
              <div
                key={i}
                className="border-r p-2"
              >
                {dayRecords.length === 0 ? (
                  <div className="text-xs text-gray-400">
                    No records
                  </div>
                ) : (
                  dayRecords.map((record) => (
                    <div
                      key={record.id}
                      className={`mb-2 p-2 rounded text-xs ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {
                        record.employeeName.split(
                          " "
                        )[0]
                      }
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* =========================================
     MONTH VIEW
  ========================================= */

  const renderMonthView = () => {
    const days =
      getMonthDays(currentDate);

    const year =
      currentDate.getFullYear();
    const month =
      currentDate.getMonth();

    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Week Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {[
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun",
          ].map((day) => (
            <div
              key={day}
              className="p-3 text-center font-semibold text-sm"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Dates */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={index}
                  className="min-h-[120px] border bg-gray-50"
                />
              );
            }

            const dateStr =
              `${year}-${String(
                month + 1
              ).padStart(
                2,
                "0"
              )}-${String(day).padStart(
                2,
                "0"
              )}`;

            const dayRecords =
              records.filter(
                (r) =>
                  r.date === dateStr
              );

            const isToday =
              dateStr ===
              formatDate(new Date());

            return (
              <div
                key={index}
                className={`min-h-[120px] border p-2 ${
                  isToday
                    ? "bg-blue-50"
                    : ""
                }`}
              >
                <div className="font-semibold mb-2">
                  {day}
                </div>

                {dayRecords
                  .slice(0, 3)
                  .map((record) => (
                    <div
                      key={record.id}
                      className={`mb-1 p-1 rounded text-xs ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {
                        record.employeeName.split(
                          " "
                        )[0]
                      }
                    </div>
                  ))}

                {dayRecords.length >
                  3 && (
                  <div className="text-xs text-gray-500">
                    +
                    {dayRecords.length -
                      3}{" "}
                    more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <BackButton
        href="/organization/hr/attendance"
        label={
          t.hrAttendance
            .attendanceDashboard
        }
      />

      <div>
        <h1 className="text-2xl font-bold">
          {t.hrAttendance
            .attendanceCalendar}
        </h1>
      </div>

      {/* Controls */}
      <div className="flex justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          {(["day", "week", "month"] as ViewMode[]).map(
            (mode) => (
              <button
                key={mode}
                onClick={() =>
                  setViewMode(mode)
                }
                className={`px-4 py-2 rounded ${
                  viewMode === mode
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100"
                }`}
              >
                {mode}
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrevious}
          >
            <ChevronLeft />
          </button>

          <div className="font-semibold">
            {currentDate.toLocaleDateString()}
          </div>

          <button
            onClick={navigateNext}
          >
            <ChevronRight />
          </button>

          <button
            onClick={navigateToday}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Today
          </button>
        </div>
      </div>

      {/* Render Views */}
      {attendanceQuery.isLoading ? (
        <div className="text-center py-8">
          Loading...
        </div>
      ) : (
        <>
          {viewMode === "day" &&
            renderDayView()}
          {viewMode === "week" &&
            renderWeekView()}
          {viewMode === "month" &&
            renderMonthView()}
        </>
      )}
    </div>
  );
}