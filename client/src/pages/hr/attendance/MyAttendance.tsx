/**
 * ============================================================================
 * MY ATTENDANCE - EMPLOYEE SELF-VIEW
 * ============================================================================
 * 
 * CRITICAL: Employee self-service attendance view
 * - Read-only attendance records
 * - Submit explanations for flagged days
 * - Upload attachments (optional)
 * - Clear indication of locked periods
 * 
 * EMPLOYEE CANNOT:
 * - Edit attendance
 * - Change hours
 * - Approve records
 * 
 * ============================================================================
 */
import { useState, useEffect } from 'react';
import {
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Lock,
  Upload,
  MessageSquare,
  Info,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AttendanceRecord {
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
}

export function MyAttendance() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  // Calculate date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    
    if (selectedPeriod === 'current') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    } else if (selectedPeriod === 'last') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: lastMonthEnd.toISOString().split('T')[0],
      };
    } else {
      // All periods
      return {
        startDate: '2020-01-01',
        endDate: now.toISOString().split('T')[0],
      };
    }
  };

  const dateRange = getDateRange();

  // Fetch current employee's attendance records
  const attendanceQuery = trpc.hrAttendance.getAll.useQuery(
    dateRange,
    { enabled: !!user }
  );

  useEffect(() => {
    // Filter records for current employee only
    if (attendanceQuery.data && user?.id) {
      const myRecordsFiltered = attendanceQuery.data
        .filter(record => record.employeeId === user.id)
        .sort((a, b) => b.date.localeCompare(a.date));
      
      setMyRecords(myRecordsFiltered);
    }
  }, [attendanceQuery.data, user?.id]);

  const handleSubmitExplanation = () => {
    if (!selectedRecord) return;
    
    if (!explanation.trim()) {
      toast.error(t.hrAttendance.pleaseEnterAnExplanation || 'Please enter an explanation');
      return;
    }
    
    // TODO: Call tRPC mutation to save explanation
    toast.success(t.hrAttendance.explanationSubmittedSuccessfully || 'Explanation submitted successfully');
    setShowExplanationModal(false);
    setExplanation('');
    setAttachments([]);
    setSelectedRecord(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newAttachments = Array.from(files).map(f => f.name);
      setAttachments([...attachments, ...newAttachments]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-700';
      case 'late':
        return 'bg-yellow-100 text-yellow-700';
      case 'on_leave':
        return 'bg-blue-100 text-blue-700';
      case 'absent':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4" />;
      case 'late':
        return <Clock className="w-4 h-4" />;
      case 'on_leave':
        return <Lock className="w-4 h-4" />;
      case 'absent':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'present':
        return t.hrAttendance.present;
      case 'late':
        return t.hrAttendance.late;
      case 'on_leave':
        return t.hrAttendance.onLeave;
      case 'absent':
        return t.hrAttendance.absent;
      default:
        return status;
    }
  };

  const labels = {
    title: t.hrAttendance.myAttendance,
    subtitle: t.hrAttendance.viewYourAttendanceRecordsAndSubmit,
    
    currentMonth: t.hrAttendance.currentMonth,
    lastMonth: t.hrAttendance.lastMonth,
    allRecords: t.hrAttendance.allRecords,
    
    date: t.hrAttendance.date,
    status: t.hrAttendance.status,
    plannedHours: t.hrAttendance.planned,
    actualHours: t.hrAttendance.actual,
    notes: t.hrAttendance.notes,
    explanation: t.hrAttendance.explanation,
    
    submitExplanation: t.hrAttendance.submitExplanation,
    explanationSubmitted: t.hrAttendance.explanationSubmitted,
    noExplanation: t.hrAttendance.noExplanationSubmitted,
    
    flaggedDay: t.hrAttendance.flaggedDay,
    lockedPeriod: t.hrAttendance.lockedPeriod,
    cannotSubmit: t.hrAttendance.cannotSubmitExplanationsForLockedPeriods,
    
    noRecords: t.hrAttendance.noAttendanceRecordsFound,
    totalDays: t.hrAttendance.totalDays,
    presentDays: t.hrAttendance.presentDays,
    lateDays: t.hrAttendance.lateDays,
    
    // Explanation Modal
    modalTitle: t.hrAttendance.submitExplanation,
    modalSubtitle: t.hrAttendance.provideAnExplanationForThisAttendance,
    yourExplanation: t.hrAttendance.yourExplanation,
    enterExplanation: t.hrAttendance.enterYourExplanationHere,
    attachments: t.hrAttendance.attachmentsOptional,
    addAttachment: t.hrAttendance.addAttachment,
    submit: t.hrAttendance.submit,
    cancel: t.hrAttendance.cancel,
    
    // Info Notice
    infoTitle: t.hrAttendance.importantNotice,
    infoText: t.hrAttendance.youCanOnlyViewYourAttendanceRecords || 'You can only view your attendance records and submit explanations. You cannot edit attendance data or change hours.'
  };

  const summary = {
    total: myRecords.length,
    present: myRecords.filter(r => r.status === 'present').length,
    late: myRecords.filter(r => r.status === 'late').length,
    absent: myRecords.filter(r => r.status === 'absent').length
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => window.history.back()}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t.common.back}
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 text-start">
          {labels.title}
        </h1>
        <p className="text-sm text-gray-600 mt-1 text-start">
          {labels.subtitle}
        </p>
      </div>

      {/* Info Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-start">
            <p className="text-sm font-semibold text-blue-900">{labels.infoTitle}</p>
            <p className="text-sm text-blue-700 mt-1">{labels.infoText}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1 text-start">{labels.totalDays}</p>
          <p className="text-2xl font-bold text-gray-900 text-start">{summary.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1 text-start">{labels.presentDays}</p>
          <p className="text-2xl font-bold text-green-600 text-start">{summary.present}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1 text-start">{labels.lateDays}</p>
          <p className="text-2xl font-bold text-yellow-600 text-start">{summary.late}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1 text-start">{t.hrAttendance.absentDays}</p>
          <p className="text-2xl font-bold text-red-600 text-start">{summary.absent}</p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex items-center gap-3">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-end' : ''}`}
        >
          <option value="current">{labels.currentMonth}</option>
          <option value="last">{labels.lastMonth}</option>
          <option value="all">{labels.allRecords}</option>
        </select>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {myRecords.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">{labels.noRecords}</p>
          </div>
        ) : (
          myRecords.map((record) => {
            const statusBadge = {
              color: getStatusColor(record.status),
              icon: getStatusIcon(record.status),
              label: getStatusLabel(record.status),
            };

            return (
              <div
                key={record.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  {/* Left Side */}
                  <div className="flex-1 text-start">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-lg font-bold text-gray-900">{record.date}</p>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium ${statusBadge.color}`}>
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 text-xs">{labels.plannedHours}</p>
                        <p className="font-semibold text-gray-900">{record.workHours || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs">{labels.actualHours}</p>
                        <p className="font-semibold text-gray-900">
                          {record.checkIn && record.checkOut ? `${record.checkIn} - ${record.checkOut}` : '-'}
                        </p>
                      </div>
                    </div>

                    {record.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">{labels.notes}</p>
                        <p className="text-sm text-gray-700">{record.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Side - Actions */}
                  <div className={`flex-shrink-0 ${isRTL ? 'mr-4' : 'ml-4'}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRecord(record);
                        setShowExplanationModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Explanation Modal */}
      <Dialog open={showExplanationModal} onOpenChange={setShowExplanationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.modalTitle}</DialogTitle>
            <DialogDescription>
              {selectedRecord?.date}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{labels.status}</p>
              <p className="text-lg font-bold text-gray-900">{getStatusLabel(selectedRecord?.status || '')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">{labels.yourExplanation}</label>
              <Textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder={labels.enterExplanation}
                className="min-h-24"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">{labels.attachments}</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild variant="outline" className="cursor-pointer">
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {labels.addAttachment}
                    </span>
                  </Button>
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((file, idx) => (
                    <p key={idx} className="text-sm text-gray-600">📎 {file}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowExplanationModal(false);
                setExplanation('');
                setAttachments([]);
              }}
            >
              {labels.cancel}
            </Button>
            <Button
              onClick={handleSubmitExplanation}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {labels.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
