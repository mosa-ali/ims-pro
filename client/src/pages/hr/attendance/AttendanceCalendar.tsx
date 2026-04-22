/**
 * ============================================================================
 * ATTENDANCE CALENDAR
 * ============================================================================
 * 
 * Day / Week / Month calendar views
 * - Shift-based visualization
 * - Status indicators (Present, Absent, Late, etc.)
 * - Source badges
 * - Overtime indicators
 * - Click to view details
 * 
 * ============================================================================
 */
import { useState, useEffect } from 'react';
import {
 ChevronLeft,
 ChevronRight,
 Calendar as CalendarIcon,
 Clock,
 Timer,
 AlertCircle,
 CheckCircle,
 XCircle,
 Eye
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

type ViewMode = 'day' | 'week' | 'month';

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

export function AttendanceCalendar() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();

 const [viewMode, setViewMode] = useState<ViewMode>('month');
 const [currentDate, setCurrentDate] = useState(new Date());
 const [records, setRecords] = useState<AttendanceWithEmployee[]>([]);
 const [selectedRecord, setSelectedRecord] = useState<AttendanceWithEmployee | null>(null);
 const [showDetailModal, setShowDetailModal] = useState(false);

 // Calculate date range based on view mode
 const getDateRangeStart = (): Date => {
   if (viewMode === 'day') {
     return currentDate;
   } else if (viewMode === 'week') {
     return getWeekStart(currentDate);
   } else {
     return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
   }
 };

 const getDateRangeEnd = (): Date => {
   if (viewMode === 'day') {
     return currentDate;
   } else if (viewMode === 'week') {
     const start = getWeekStart(currentDate);
     const end = new Date(start);
     end.setDate(end.getDate() + 6);
     return end;
   } else {
     return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
   }
 };

 // Fetch attendance records via tRPC with real-time polling
 const attendanceQuery = trpc.hrAttendance.getAll.useQuery(
   {
     startDate: getDateRangeStart().toISOString().split('T')[0],
     endDate: getDateRangeEnd().toISOString().split('T')[0],
   },
   {
     enabled: !!user,
     refetchInterval: 30000, // Poll every 30 seconds for real-time updates
     refetchIntervalInBackground: true, // Continue polling even when tab is not focused
   }
 );

 // Fetch employees to map names (cached, no polling needed)
 const employeesQuery = trpc.hrEmployees.getAll.useQuery(
   { limit: 1000, offset: 0 },
   {
     enabled: !!user,
     staleTime: 5 * 60 * 1000, // Cache for 5 minutes
   }
 );

 useEffect(() => {
   // Refetch when date or view mode changes
   attendanceQuery.refetch();
 }, [currentDate, viewMode]);

 useEffect(() => {
   // Merge attendance with employee data
   if (attendanceQuery.data && employeesQuery.data) {
     const employeeMap = new Map(
       employeesQuery.data.map(emp => [emp.id, emp])
     );

     const mergedRecords = attendanceQuery.data.map(record => ({
       ...record,
       employeeName: (employeeMap.get(record.employeeId)?.firstName || '') + ' ' + (employeeMap.get(record.employeeId)?.lastName || ''),
       employeeCode: employeeMap.get(record.employeeId)?.employeeCode || '',
     }));

     setRecords(mergedRecords);
   }
 }, [attendanceQuery.data, employeesQuery.data]);

 const getWeekStart = (date: Date): Date => {
   const d = new Date(date);
   const day = d.getDay();
   const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
   return new Date(d.setDate(diff));
 };

 const navigatePrevious = () => {
   const newDate = new Date(currentDate);
   if (viewMode === 'day') {
     newDate.setDate(newDate.getDate() - 1);
   } else if (viewMode === 'week') {
     newDate.setDate(newDate.getDate() - 7);
   } else {
     newDate.setMonth(newDate.getMonth() - 1);
   }
   setCurrentDate(newDate);
 };

 const navigateNext = () => {
   const newDate = new Date(currentDate);
   if (viewMode === 'day') {
     newDate.setDate(newDate.getDate() + 1);
   } else if (viewMode === 'week') {
     newDate.setDate(newDate.getDate() + 7);
   } else {
     newDate.setMonth(newDate.getMonth() + 1);
   }
   setCurrentDate(newDate);
 };

 const navigateToday = () => {
   setCurrentDate(new Date());
 };

 const getStatusColor = (status: string) => {
   switch (status) {
     case 'present':
       return 'bg-green-100 text-green-700';
     case 'absent':
       return 'bg-red-100 text-red-700';
     case 'late':
       return 'bg-yellow-100 text-yellow-700';
     case 'half_day':
       return 'bg-orange-100 text-orange-700';
     case 'on_leave':
       return 'bg-blue-100 text-blue-700';
     case 'holiday':
       return 'bg-purple-100 text-purple-700';
     case 'weekend':
       return 'bg-gray-100 text-gray-700';
     default:
       return 'bg-gray-100 text-gray-700';
   }
 };

 const getStatusLabel = (status: string): string => {
   switch (status) {
     case 'present':
       return t.hrAttendance.present;
     case 'absent':
       return t.hrAttendance.absent;
     case 'late':
       return t.hrAttendance.late;
     case 'half_day':
       return t.hrAttendance.halfDay || 'Half Day';
     case 'on_leave':
       return t.hrAttendance.onLeave;
     case 'holiday':
       return t.hrAttendance.holiday || 'Holiday';
     case 'weekend':
       return t.hrAttendance.weekend || 'Weekend';
     default:
       return status;
   }
 };

 const labels = {
   title: t.hrAttendance.attendanceCalendar,
   subtitle: t.hrAttendance.visualAttendanceTrackingWithDayWeek,
   day: t.hrAttendance.day,
   week: t.hrAttendance.week,
   month: t.hrAttendance.month,
   today: t.hrAttendance.today,
   staffName: t.hrAttendance.staffName,
   date: t.hrAttendance.date,
   status: t.hrAttendance.status,
   view: t.hrAttendance.view,
   noRecords: t.hrAttendance.noAttendanceRecordsFound,
 };

 // Group records by date for calendar view
 const recordsByDate = new Map<string, AttendanceWithEmployee[]>();
 records.forEach(record => {
   const dateKey = record.date;
   if (!recordsByDate.has(dateKey)) {
     recordsByDate.set(dateKey, []);
   }
   recordsByDate.get(dateKey)!.push(record);
 });





 const renderMonthView = () => {
   const year = currentDate.getFullYear();
   const month = currentDate.getMonth();
   const firstDay = new Date(year, month, 1);
   const lastDay = new Date(year, month + 1, 0);
 
 // Adjust to Monday start
 const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
 const daysInMonth = lastDay.getDate();
 
 const days = [];
 
 // Previous month padding
 for (let i = 0; i < startDay; i++) {
 days.push(null);
 }
 
 // Current month days
 for (let i = 1; i <= daysInMonth; i++) {
 days.push(i);
 }

 return (
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
 {dayNames.map((day, idx) => (
 <div key={idx} className={`p-3 text-center font-semibold text-sm text-gray-700 text-start`}>
 {day}
 </div>
 ))}
 </div>
 <div className="grid grid-cols-7">
 {days.map((day, idx) => {
 if (day === null) {
 return <div key={idx} className="border-r border-b border-gray-200 p-2 min-h-[120px] bg-gray-50"></div>;
 }

 const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
 const dayRecords = records.filter(r => r.date === dateStr);
 const isToday = dateStr === new Date().toISOString().split('T')[0];

 return (
 <div 
 key={idx} 
 className={`border-r border-b border-gray-200 p-2 min-h-[120px] ${isToday ? 'bg-blue-50' : ''}`}
 >
 <p className={`text-sm font-semibold mb-2 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</p>
 {dayRecords.slice(0, 3).map(record => (
 <div
 key={record.id}
 className={`mb-1 p-1 rounded text-xs cursor-pointer hover:shadow-md transition-all ${getStatusColor(record.status)}`}
 onClick={() => {
 setSelectedRecord(record);
 setShowDetailModal(true);
 }}
 >
 <div className="font-medium truncate">{record.employeeName.split(' ')[0]}</div>
 <div className="text-xs">{getStatusLabel(record.status)}</div>
 </div>
 ))}
 {dayRecords.length > 3 && (
 <p className="text-xs text-gray-500 mt-1">+{dayRecords.length - 3} {t.hrAttendance.more}</p>
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

 {/* Controls */}
 <div className={`flex items-center justify-between flex-wrap gap-4`}>
 {/* View Mode Tabs */}
 <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
 <button
 onClick={() => setViewMode('day')}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ viewMode === 'day' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900' }`}
 >
 {labels.day}
 </button>
 <button
 onClick={() => setViewMode('week')}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ viewMode === 'week' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900' }`}
 >
 {labels.week}
 </button>
 <button
 onClick={() => setViewMode('month')}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ viewMode === 'month' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900' }`}
 >
 {labels.month}
 </button>
 </div>

 {/* Navigation */}
 <div className={`flex items-center gap-3`}>
 <button
 onClick={navigatePrevious}
 className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
 >
 {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
 </button>
 
 <div className="px-4 py-2 bg-gray-50 rounded-lg min-w-[250px] text-center">
 <p className="font-semibold text-gray-900">
 {currentDate.toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA', {
 year: 'numeric',
 month: 'long',
 day: viewMode === 'day' ? 'numeric' : undefined,
 })}
 </p>
 </div>

 <button
 onClick={navigateNext}
 className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
 >
 {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
 </button>

 <button
 onClick={navigateToday}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
 >
 {labels.today}
 </button>
 </div>
 </div>

 {/* Calendar View */}
 {attendanceQuery.isLoading ? (
 <div className="text-center py-8 text-gray-500">
 {t.common.loadingData}
 </div>
 ) : records.length === 0 ? (
 <div className="text-center py-8 text-gray-500">
 {labels.noRecords}
 </div>
 ) : (
 renderMonthView()
 )}

 {/* Detail Modal */}
 {showDetailModal && selectedRecord && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
 <div className={`p-6 border-b border-gray-200 text-start`}>
 <h2 className="text-xl font-bold text-gray-900">
 {t.hrAttendance.attendanceDetail}
 </h2>
 <p className="text-sm text-gray-600 mt-1">{selectedRecord.staffName} - {selectedRecord.date}</p>
 </div>

 <div className={`p-6 space-y-4 text-start`}>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.status}</p>
 <p className="font-semibold">{selectedRecord.status}</p>
 </div>
 {selectedRecord.checkIn && (
 <div>
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.checkIn}:</p>
 <p className="font-semibold">{selectedRecord.checkIn}</p>
 </div>
 )}
 {selectedRecord.checkOut && (
 <div>
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.checkOut}:</p>
 <p className="font-semibold">{selectedRecord.checkOut}</p>
 </div>
 )}
 {selectedRecord.workHours && (
 <div>
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.hours}:</p>
 <p className="font-semibold">{selectedRecord.workHours}</p>
 </div>
 )}
 {selectedRecord.overtimeHours && parseFloat(selectedRecord.overtimeHours) > 0 && (
 <div>
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.overtime}:</p>
 <p className="font-semibold text-purple-600">{selectedRecord.overtimeHours}</p>
 </div>
 )}
 </div>

 {selectedRecord.notes && (
 <div className="p-3 bg-gray-50 rounded-lg">
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.notes}:</p>
 <p className="text-sm text-gray-900">{selectedRecord.notes}</p>
 </div>
 )}
 </div>

 <div className={`p-6 border-t border-gray-200 text-start`}>
 <button
 onClick={() => setShowDetailModal(false)}
 className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
 >
 {t.common.close}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}