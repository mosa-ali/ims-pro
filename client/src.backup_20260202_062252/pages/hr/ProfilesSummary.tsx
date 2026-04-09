/**
 * ============================================================================
 * PROFILES SUMMARY - KPI Dashboard
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { ArrowLeft, Users, Archive, DoorOpen, UserPlus, FileText, TrendingUp, Building2, Globe2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { staffService } from '@/app/services/hrService';
import { useEffect, useState } from 'react';

export function ProfilesSummary() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalActive: 0,
    totalArchived: 0,
    totalExited: 0,
    newHires30: 0,
    newHires60: 0,
    newHires90: 0,
    contractsExpiring: 0,
    byDepartment: [] as { dept: string; count: number }[],
    byGender: { male: 0, female: 0, other: 0 }
  });

  useEffect(() => {
    const allStaff = staffService.getAll();
    const today = new Date();

    const active = allStaff.filter(s => s.status === 'active');
    const archived = allStaff.filter(s => s.status === 'ended');
    const exited = allStaff.filter(s => s.status === 'exited');

    // New hires calculations
    const days30Ago = new Date(today);
    days30Ago.setDate(today.getDate() - 30);
    const days60Ago = new Date(today);
    days60Ago.setDate(today.getDate() - 60);
    const days90Ago = new Date(today);
    days90Ago.setDate(today.getDate() - 90);

    const newHires30 = active.filter(s => s.hireDate && new Date(s.hireDate) >= days30Ago).length;
    const newHires60 = active.filter(s => s.hireDate && new Date(s.hireDate) >= days60Ago).length;
    const newHires90 = active.filter(s => s.hireDate && new Date(s.hireDate) >= days90Ago).length;

    // Contract renewals
    const days60Future = new Date(today);
    days60Future.setDate(today.getDate() + 60);
    const contractsExpiring = active.filter(s => {
      if (!s.contractEndDate) return false;
      const endDate = new Date(s.contractEndDate);
      return endDate <= days60Future && endDate >= today;
    }).length;

    // By department
    const deptMap = new Map<string, number>();
    active.forEach(s => {
      deptMap.set(s.department, (deptMap.get(s.department) || 0) + 1);
    });
    const byDepartment = Array.from(deptMap.entries())
      .map(([dept, count]) => ({ dept, count }))
      .sort((a, b) => b.count - a.count);

    // By gender
    const byGender = {
      male: active.filter(s => s.gender === 'Male').length,
      female: active.filter(s => s.gender === 'Female').length,
      other: active.filter(s => s.gender === 'Other').length
    };

    setStats({
      totalActive: active.length,
      totalArchived: archived.length,
      totalExited: exited.length,
      newHires30,
      newHires60,
      newHires90,
      contractsExpiring,
      byDepartment,
      byGender
    });
  }, []);

  const t = {
    title: language === 'en' ? 'Profiles Summary' : 'ملخص الملفات',
    subtitle: language === 'en' ? 'KPIs and statistics dashboard' : 'لوحة المؤشرات والإحصاءات',
    
    totalActive: language === 'en' ? 'Total Active Staff' : 'إجمالي الموظفين النشطين',
    totalArchived: language === 'en' ? 'Archived' : 'مؤرشف',
    totalExited: language === 'en' ? 'Exited' : 'غادر',
    newHires: language === 'en' ? 'New Hires' : 'التعيينات الجديدة',
    last30Days: language === 'en' ? 'Last 30 Days' : 'آخر 30 يوماً',
    last60Days: language === 'en' ? 'Last 60 Days' : 'آخر 60 يوماً',
    last90Days: language === 'en' ? 'Last 90 Days' : 'آخر 90 يوماً',
    contractsExpiring: language === 'en' ? 'Contracts Expiring Soon' : 'عقود تنتهي قريباً',
    within60Days: language === 'en' ? 'Within 60 Days' : 'خلال 60 يوماً',
    staffByDepartment: language === 'en' ? 'Staff by Department' : 'الموظفون حسب القسم',
    genderDistribution: language === 'en' ? 'Gender Distribution' : 'توزيع الجنس',
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    other: language === 'en' ? 'Other' : 'آخر'
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/organization/hr/employees-profiles')}
        className="text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
      </button>

      {/* Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-600 mt-1">{t.subtitle}</p>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-green-50 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{t.totalActive}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalActive}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-gray-50 rounded-lg">
              <Archive className="w-6 h-6 text-gray-600" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{t.totalArchived}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalArchived}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-red-50 rounded-lg">
              <DoorOpen className="w-6 h-6 text-red-600" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{t.totalExited}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalExited}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">{t.newHires}</h3>
          </div>
          <div className="space-y-2">
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{t.last30Days}:</span>
              <span className="text-sm font-semibold text-gray-900">{stats.newHires30}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{t.last60Days}:</span>
              <span className="text-sm font-semibold text-gray-900">{stats.newHires60}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{t.last90Days}:</span>
              <span className="text-sm font-semibold text-gray-900">{stats.newHires90}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <FileText className="w-5 h-5 text-orange-600" />
            <h3 className="text-base font-semibold text-gray-900">{t.contractsExpiring}</h3>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-4xl font-bold text-orange-600">{stats.contractsExpiring}</p>
            <p className="text-sm text-gray-600 mt-1">{t.within60Days}</p>
          </div>
        </div>
      </div>

      {/* Department Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className={`text-base font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.staffByDepartment}
        </h3>
        <div className="space-y-3">
          {stats.byDepartment.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className={`flex justify-between items-center text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-700">{item.dept}</span>
                <span className="font-semibold text-gray-900">{item.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(item.count / stats.totalActive) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gender Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className={`text-base font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.genderDistribution}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className={`text-center ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-2xl font-bold text-blue-600">{stats.byGender.male}</p>
            <p className="text-sm text-gray-600">{t.male}</p>
          </div>
          <div className={`text-center ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-2xl font-bold text-pink-600">{stats.byGender.female}</p>
            <p className="text-sm text-gray-600">{t.female}</p>
          </div>
          <div className={`text-center ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-2xl font-bold text-gray-600">{stats.byGender.other}</p>
            <p className="text-sm text-gray-600">{t.other}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
