/**
 * ============================================================================
 * LEAVE BALANCES VIEW
 * ============================================================================
 * 
 * Displays all staff members with their calculated annual leave balances
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { Calendar, Plus, TrendingUp, Users } from 'lucide-react';
import { staffService, StaffMember } from '@/app/services/hrService';
import { leaveBalanceService } from './leaveService';
import { LeaveBalance } from './types';

interface Props {
  language: string;
  isRTL: boolean;
  onRequestLeave: (employee: StaffMember) => void;
}

export function LeaveBalancesView({ language, isRTL, onRequestLeave }: Props) {
  const [balances, setBalances] = useState<(LeaveBalance & { employee: StaffMember })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBalances();
  }, []);

  const loadBalances = () => {
    // Get all active staff
    const allStaff = staffService.getAll().filter(s => s.status === 'active');
    
    // Recalculate all balances
    leaveBalanceService.recalculateAllBalances();
    
    // Get balances
    const allBalances = leaveBalanceService.getAll();
    
    // Merge staff data with balances
    const merged = allStaff.map(staff => {
      const balance = allBalances.find(b => b.staffId === staff.staffId);
      if (balance) {
        return { ...balance, employee: staff };
      } else {
        // Calculate balance if not found
        const calculated = leaveBalanceService.calculateBalance(staff);
        leaveBalanceService.saveBalance(calculated);
        return { ...calculated, employee: staff };
      }
    });
    
    setBalances(merged);
  };

  const filteredBalances = balances.filter(b => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.staffId.toLowerCase().includes(term) ||
      b.employee.fullName.toLowerCase().includes(term) ||
      b.employee.position.toLowerCase().includes(term) ||
      b.employee.department.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getBalanceColor = (available: number) => {
    if (available > 15) return 'text-green-600';
    if (available > 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const t = {
    title: language === 'en' ? 'Staff Leave Balances' : 'أرصدة إجازات الموظفين',
    subtitle: language === 'en' ? 'Annual leave entitlements and balances for all active staff' : 'استحقاقات الإجازات السنوية والأرصدة لجميع الموظفين النشطين',
    search: language === 'en' ? 'Search by Staff ID, Name, Position, Department...' : 'البحث برقم الموظف، الاسم، الوظيفة، القسم...',
    
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    name: language === 'en' ? 'Name' : 'الاسم',
    position: language === 'en' ? 'Position' : 'الوظيفة',
    contractPeriod: language === 'en' ? 'Contract Period' : 'فترة العقد',
    opening: language === 'en' ? 'Opening' : 'افتتاحي',
    used: language === 'en' ? 'Used' : 'مستخدم',
    pending: language === 'en' ? 'Pending' : 'معلق',
    remaining: language === 'en' ? 'Remaining' : 'متبقي',
    available: language === 'en' ? 'Available' : 'متاح',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    requestLeave: language === 'en' ? 'Request Leave' : 'طلب إجازة',
    
    days: language === 'en' ? 'days' : 'أيام',
    noStaff: language === 'en' ? 'No active staff found' : 'لم يتم العثور على موظفين نشطين',
    
    totalStaff: language === 'en' ? 'Total Active Staff' : 'إجمالي الموظفين النشطين',
    avgBalance: language === 'en' ? 'Avg. Available Balance' : 'متوسط الرصيد المتاح',
    totalUsed: language === 'en' ? 'Total Leave Used' : 'إجمالي الإجازات المستخدمة',
    totalPending: language === 'en' ? 'Total Pending' : 'إجمالي المعلق'
  };

  // Statistics
  const stats = {
    totalStaff: filteredBalances.length,
    avgAvailable: filteredBalances.length > 0 
      ? (filteredBalances.reduce((sum, b) => sum + b.availableBalance, 0) / filteredBalances.length).toFixed(1)
      : 0,
    totalUsed: filteredBalances.reduce((sum, b) => sum + b.usedLeave, 0).toFixed(1),
    totalPending: filteredBalances.reduce((sum, b) => sum + b.pendingLeave, 0).toFixed(1)
  };

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
        <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase">{t.totalStaff}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStaff}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase">{t.avgBalance}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.avgAvailable} {t.days}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase">{t.totalUsed}</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalUsed} {t.days}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase">{t.totalPending}</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.totalPending} {t.days}</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-200">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t.search}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filteredBalances.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">{t.noStaff}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.staffId}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.name}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.contractPeriod}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{t.opening}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{t.used}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{t.pending}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{t.remaining}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{t.available}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBalances.map((balance) => (
                <tr key={balance.staffId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{balance.staffId}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div>
                      <p className="font-medium">{balance.employee.fullName}</p>
                      <p className="text-xs text-gray-500">{balance.employee.position}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div>
                      <p>{formatDate(balance.contractStartDate)}</p>
                      <p className="text-gray-500">to {formatDate(balance.contractEndDate)}</p>
                      <p className="text-gray-400 mt-1">({balance.contractDays} days)</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-blue-600">
                      {balance.openingBalance}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-red-600">
                      {balance.usedLeave}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-yellow-600">
                      {balance.pendingLeave}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-900">
                      {balance.remainingBalance}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-lg font-bold ${getBalanceColor(balance.availableBalance)}`}>
                      {balance.availableBalance}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onRequestLeave(balance.employee)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t.requestLeave}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
