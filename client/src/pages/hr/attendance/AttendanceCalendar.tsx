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
import { Link } from 'wouter';

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
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { attendanceService, AttendanceRecord } from '@/app/services/attendanceService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

type ViewMode = 'day' | 'week' | 'month';

export function AttendanceCalendar() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();

 const [viewMode, setViewMode] = useState<ViewMode>('month');
 const [currentDate, setCurrentDate] = useState(new Date());
 const [records, setRecords] = useState<AttendanceRecord[]>([]);
 const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
 const [showDetailModal, setShowDetailModal] = useState(false);

 useEffect(() => {
 loadRecords();
 }, [currentDate, viewMode]);

 const loadRecords = () => {
 let startDate: string;
 let endDate: string;

 if (viewMode === 'day') {
 const dateStr = currentDate.toISOString().split('T')[0];
 startDate = dateStr;
 endDate = dateStr;
 } else if (viewMode === 'week') {
 const start = getWeekStart(currentDate);
 const end = new Date(start);
 end.setDate(end.getDate() + 6);
 startDate = start.toISOString().split('T')[0];
 endDate = end.toISOString().split('T')[0];
 } else {
 const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
 const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
 startDate = start.toISOString().split('T')[0];
 endDate = end.toISOString().split('T')[0];
 }

 const allRecords = attendanceService.getByDateRange(startDate, endDate);
 setRecords(allRecords);
 };

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

 const goToToday = () => {
 setCurrentDate(new Date());
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'present': return 'bg-green-100 border-green-300 text-green-700';
 case 'absent': return 'bg-red-100 border-red-300 text-red-700';
 case 'late': return 'bg-yellow-100 border-yellow-300 text-yellow-700';
 case 'on_leave': return 'bg-blue-100 border-blue-300 text-blue-700';
 case 'field_work': return 'bg-purple-100 border-purple-300 text-purple-700';
 case 'overtime': return 'bg-indigo-100 border-indigo-300 text-indigo-700';
 default: return 'bg-gray-100 border-gray-300 text-gray-700';
 }
 };

 const getSourceBadge = (source: string) => {
 switch (source) {
 case 'microsoft_teams_shifts': return '🟦';
 case 'manual_hr_entry': return '🟨';
 case 'microsoft_teams_presence': return '⚪';
 default: return '⚫';
 }
 };

 const labels = {
 title: t.hrAttendance.attendanceCalendar,
 subtitle: t.hrAttendance.visualAttendanceTrackingWithDayWeek,
 
 day: t.hrAttendance.day,
 week: t.hrAttendance.week,
 month: t.hrAttendance.month,
 today: t.hrAttendance.today,
 
 previous: t.hrAttendance.previous,
 next: t.hrAttendance.next,
 
 staff: t.hrAttendance.staff,
 status: t.hrAttendance.status,
 hours: t.hrAttendance.hours,
 overtime: t.hrAttendance.overtime,
 
 present: t.hrAttendance.present,
 absent: t.hrAttendance.absent,
 late: t.hrAttendance.late,
 onLeave: t.hrAttendance.onLeave,
 fieldWork: t.hrAttendance.fieldWork,
 
 noRecords: t.hrAttendance.noAttendanceRecordsForThisPeriod,
 
 mondayShort: t.hrAttendance.mon,
 tuesdayShort: t.hrAttendance.tue,
 wednesdayShort: t.hrAttendance.wed,
 thursdayShort: t.hrAttendance.thu,
 fridayShort: t.hrAttendance.fri,
 saturdayShort: t.hrAttendance.sat,
 sundayShort: t.hrAttendance.sun
 };

 const monthNames = language === 'en'
 ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
 : ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

 const dayNames = [labels.mondayShort, labels.tuesdayShort, labels.wednesdayShort, labels.thursdayShort, labels.fridayShort, labels.saturdayShort, labels.sundayShort];

 const getCurrentPeriodLabel = () => {
 if (viewMode === 'day') {
 return currentDate.toLocaleDateString(t.hrAttendance.enus, { 
 weekday: 'long', 
 year: 'numeric', 
 month: 'long', 
 day: 'numeric' 
 });
 } else if (viewMode === 'week') {
 const weekStart = getWeekStart(currentDate);
 const weekEnd = new Date(weekStart);
 weekEnd.setDate(weekEnd.getDate() + 6);
 return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
 } else {
 return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
 }
 };

 const renderDayView = () => {
 const dateStr = currentDate.toISOString().split('T')[0];
 const dayRecords = records.filter(r => r.date === dateStr);

 if (dayRecords.length === 0) {
 return (
 <div className="bg-white rounded-lg border border-gray-200 p-12 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
 <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-500">{labels.noRecords}</p>
 </div>
 );
 }

 return (
 <div className="space-y-3">
 {dayRecords.map(record => (
 <div
 key={record.id}
 className={`bg-white rounded-lg border-2 p-4 hover:shadow-md transition-all cursor-pointer ${getStatusColor(record.status)}`}
 onClick={() => {
 setSelectedRecord(record);
 setShowDetailModal(true);
 }}
 >
 <div className={`flex items-center justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className={`flex items-center gap-2 mb-2`}>
 <span className="text-lg">{getSourceBadge(record.source)}</span>
 <h3 className="font-bold text-gray-900">{record.staffName}</h3>
 {record.isFlagged && <AlertCircle className="w-4 h-4 text-red-500" />}
 </div>
 <div className={`grid grid-cols-3 gap-4 text-sm text-start`}>
 <div>
 <p className="text-gray-600">{t.hrAttendance.planned}</p>
 <p className="font-semibold">{record.plannedShiftStart} - {record.plannedShiftEnd}</p>
 </div>
 <div>
 <p className="text-gray-600">{t.hrAttendance.actual}</p>
 <p className="font-semibold">{record.actualCheckIn || '-'} - {record.actualCheckOut || '-'}</p>
 </div>
 <div>
 <p className="text-gray-600">{labels.overtime}</p>
 <p className="font-semibold">{record.overtimeHours > 0 ? `${record.overtimeHours.toFixed(1)}h` : '-'}</p>
 </div>
 </div>
 </div>
 <Eye className="w-5 h-5 text-gray-400" />
 </div>
 </div>
 ))}
 </div>
 );
 };

 const renderWeekView = () => {
 const weekStart = getWeekStart(currentDate);
 const weekDays = Array.from({ length: 7 }, (_, i) => {
 const d = new Date(weekStart);
 d.setDate(d.getDate() + i);
 return d;
 });

 return (
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="grid grid-cols-7 border-b border-gray-200">
 {weekDays.map((day, idx) => (
 <div key={idx} className={`p-4 text-center border-r border-gray-200 last:border-e-0 text-start`}>
 <p className="text-xs text-gray-600 mb-1">{dayNames[idx]}</p>
 <p className="text-lg font-bold text-gray-900">{day.getDate()}</p>
 </div>
 ))}
 </div>
 <div className="grid grid-cols-7">
 {weekDays.map((day, idx) => {
 const dateStr = day.toISOString().split('T')[0];
 const dayRecords = records.filter(r => r.date === dateStr);
 
 return (
 <div key={idx} className="border-r border-gray-200 last:border-e-0 p-2 min-h-[200px]">
 {dayRecords.map(record => (
 <div
 key={record.id}
 className={`mb-2 p-2 rounded border text-xs cursor-pointer hover:shadow-md transition-all ${getStatusColor(record.status)}`}
 onClick={() => {
 setSelectedRecord(record);
 setShowDetailModal(true);
 }}
 >
 <div className="flex items-center gap-1 mb-1">
 <span className="text-xs">{getSourceBadge(record.source)}</span>
 <p className="font-semibold truncate flex-1">{record.staffName}</p>
 </div>
 <p className="text-xs">{record.plannedShiftStart}</p>
 {record.overtimeHours > 0 && (
 <div className="flex items-center gap-1 mt-1">
 <Timer className="w-3 h-3" />
 <span>{record.overtimeHours.toFixed(1)}h</span>
 </div>
 )}
 </div>
 ))}
 </div>
 );
 })}
 </div>
 </div>
 );
 };

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
 <div className="flex items-center gap-1">
 <span className="text-xs">{getSourceBadge(record.source)}</span>
 <p className="truncate flex-1 font-medium">{record.staffName.split(' ')[0]}</p>
 </div>
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
 <p className="font-semibold text-gray-900">{getCurrentPeriodLabel()}</p>
 </div>

 <button
 onClick={navigateNext}
 className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
 >
 {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
 </button>

 <button
 onClick={goToToday}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
 >
 {labels.today}
 </button>
 </div>
 </div>

 {/* Calendar View */}
 {viewMode === 'day' && renderDayView()}
 {viewMode === 'week' && renderWeekView()}
 {viewMode === 'month' && renderMonthView()}

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
 <div>
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.source}</p>
 <p className="font-semibold">{getSourceBadge(selectedRecord.source)} {selectedRecord.source}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.plannedHours}</p>
 <p className="font-semibold">{selectedRecord.plannedHours}h</p>
 </div>
 <div>
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.actualHours}</p>
 <p className="font-semibold">{selectedRecord.actualHours}h</p>
 </div>
 {selectedRecord.overtimeHours > 0 && (
 <div>
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.overtime}</p>
 <p className="font-semibold text-purple-600">{selectedRecord.overtimeHours.toFixed(1)}h</p>
 </div>
 )}
 </div>

 {selectedRecord.notes && (
 <div className="p-3 bg-gray-50 rounded-lg">
 <p className="text-sm text-gray-600 mb-1">{t.hrAttendance.notes}</p>
 <p className="text-sm text-gray-900">{selectedRecord.notes}</p>
 </div>
 )}
 </div>

 <div className={`p-6 border-t border-gray-200 text-start`}>
 <button
 onClick={() => setShowDetailModal(false)}
 className="w-full px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
 >
 {t.hrAttendance.close}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}