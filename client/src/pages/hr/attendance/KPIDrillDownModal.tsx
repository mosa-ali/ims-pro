/**
 * ============================================================================
 * KPI DRILL-DOWN MODAL
 * ============================================================================
 * 
 * Detailed view for each KPI card with:
 * - Filtering (date range, status, department, etc.)
 * - Sorting (by any column)
 * - CSV export
 * - Real-time data updates
 * 
 * ============================================================================
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

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

interface KPIDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  kpiType: 'pending_approvals' | 'overtime' | 'attendance_rate' | 'late_arrivals' | 'absent_count' | 'on_leave_count';
  records: KPIRecord[];
  isLoading?: boolean;
}

export function KPIDrillDownModal({
  isOpen,
  onClose,
  title,
  kpiType,
  records,
  isLoading = false,
}: KPIDrillDownModalProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(r => new Date(r.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(r => new Date(r.date) <= new Date(dateTo));
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.staffName.toLowerCase().includes(term) ||
        r.staffId.toLowerCase().includes(term)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy as keyof KPIRecord];
      let bVal: any = b[sortBy as keyof KPIRecord];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [records, dateFrom, dateTo, statusFilter, searchTerm, sortBy, sortOrder]);

  // CSV export function
  const exportToCSV = () => {
    const headers = ['Staff Name', 'Staff ID', 'Date', 'Status', 'Work Hours', 'Overtime Hours', 'Approval Status', 'Notes'];
    const rows = filteredRecords.map(r => [
      r.staffName,
      r.staffId,
      r.date,
      r.status,
      r.workHours?.toFixed(2) || '-',
      r.overtimeHours?.toFixed(2) || '-',
      r.approvalStatus || '-',
      r.notes || '-',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronUp className="w-4 h-4 text-gray-300" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600" />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-4 border-b pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.hrAttendance.dateFrom}
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.hrAttendance.dateTo}
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.hrAttendance.status}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.hrAttendance.all}</SelectItem>
                  <SelectItem value="present">{t.hrAttendance.present}</SelectItem>
                  <SelectItem value="absent">{t.hrAttendance.absent}</SelectItem>
                  <SelectItem value="late">{t.hrAttendance.late}</SelectItem>
                  <SelectItem value="half_day">{t.hrAttendance.halfDay}</SelectItem>
                  <SelectItem value="on_leave">{t.hrAttendance.onLeave}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.hrAttendance.search}
              </label>
              <Input
                type="text"
                placeholder={t.hrAttendance.searchByNameOrId}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t.hrAttendance.exportCSV}
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600 py-2">
          {t.hrAttendance.showing} {filteredRecords.length} {t.hrAttendance.of} {records.length} {t.hrAttendance.records}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('staffName')}
                >
                  <div className="flex items-center gap-2">
                    {t.hrAttendance.staffName}
                    <SortIcon column="staffName" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('staffId')}
                >
                  <div className="flex items-center gap-2">
                    {t.hrAttendance.staffId}
                    <SortIcon column="staffId" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    {t.hrAttendance.date}
                    <SortIcon column="date" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    {t.hrAttendance.status}
                    <SortIcon column="status" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  {t.hrAttendance.workHours}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  {t.hrAttendance.overtimeHours}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  {t.hrAttendance.approvalStatus}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {t.hrAttendance.loading}...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {t.hrAttendance.noRecordsFound}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{record.staffName}</td>
                    <td className="px-4 py-3 text-gray-600">{record.staffId}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' :
                        record.status === 'absent' ? 'bg-red-100 text-red-800' :
                        record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                        record.status === 'on_leave' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {record.workHours?.toFixed(2) || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {record.overtimeHours?.toFixed(2) || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {record.approvalStatus && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          record.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                          record.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.approvalStatus}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
