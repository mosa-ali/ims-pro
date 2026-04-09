/**
 * ============================================================================
 * INDICATOR CHARTS & VISUALIZATIONS
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Chart components for indicator visualization
 * 
 * FEATURES:
 * - Achievement bar chart
 * - Progress over time chart
 * - Disaggregation toggle
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';

interface ChartDataPoint {
  indicatorName: string;
  achievementPercent: number;
  status: string;
  target: number;
  actual: number;
}

interface ProgressDataPoint {
  period: string;
  target: number;
  actual: number;
}

export function AchievementBarChart({ data }: { data: ChartDataPoint[] }) {
  const { language, isRTL } = useLanguage();

  const t = {
    title: language === 'en' ? 'Achievement by Indicator' : 'الإنجاز حسب المؤشر',
    targetLabel: language === 'en' ? 'Target:' : 'الهدف:',
    actualLabel: language === 'en' ? 'Actual:' : 'الفعلي:',
    noData: language === 'en' ? 'No data available' : 'لا توجد بيانات متاحة',
  };

  if (!data || data.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center" style={{ minHeight: '200px' }}>
        <p className="text-gray-500">{t.noData}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.title}
      </h3>

      <div className="space-y-2">
        {data.map((item, index) => {
          const percentage = Math.min(item.achievementPercent, 100);
          const statusColor =
            item.achievementPercent >= 100
              ? '#4CAF50'
              : item.achievementPercent >= 90
              ? '#FFC107'
              : item.achievementPercent >= 60
              ? '#FF9800'
              : '#F44336';

          return (
            <div key={index} className="mb-4">
              <div className={`flex justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <p className={`text-xs font-semibold text-gray-900 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {item.indicatorName.substring(0, 30)}...
                </p>
                <p className="text-xs font-bold" style={{ color: statusColor }}>
                  {item.achievementPercent}%
                </p>
              </div>

              <div className="h-6 rounded-lg overflow-hidden bg-gray-100 border border-gray-300">
                <div
                  className="h-full flex items-center justify-center"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: statusColor,
                  }}
                >
                  {percentage > 20 && (
                    <span className="text-xs font-bold text-white">{item.achievementPercent}%</span>
                  )}
                </div>
              </div>

              <p className={`text-xs text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.targetLabel} {item.target} | {t.actualLabel} {item.actual}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProgressOverTimeChart({ data }: { data: ProgressDataPoint[] }) {
  const { language, isRTL } = useLanguage();

  const t = {
    title: language === 'en' ? 'Progress Over Time' : 'التقدم عبر الزمن',
    target: language === 'en' ? 'Target' : 'الهدف',
    actual: language === 'en' ? 'Actual' : 'الفعلي',
    period: language === 'en' ? 'Period' : 'الفترة',
    variance: language === 'en' ? 'Variance' : 'التباين',
    visualComparison: language === 'en' ? 'Visual Comparison' : 'المقارنة المرئية',
    targetLabel: language === 'en' ? 'Target:' : 'الهدف:',
    actualLabel: language === 'en' ? 'Actual:' : 'الفعلي:',
    noData: language === 'en' ? 'No progress data available' : 'لا توجد بيانات تقدم متاحة',
  };

  if (!data || data.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center" style={{ minHeight: '250px' }}>
        <p className="text-gray-500">{t.noData}</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Math.max(d.target, d.actual)));

  return (
    <div className="p-4">
      <h3 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.title}
      </h3>

      {/* Legend */}
      <div className={`flex gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-4 h-4 bg-blue-600" />
          <span className="text-xs text-gray-900">{t.target}</span>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-4 h-4 bg-green-600" />
          <span className="text-xs text-gray-900">{t.actual}</span>
        </div>
      </div>

      {/* Table View */}
      <div className="rounded-lg overflow-hidden bg-white border border-gray-200">
        <div className={`flex p-3 bg-blue-600 border-b border-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <p className="flex-1 text-xs font-bold text-white">{t.period}</p>
          <p className="flex-1 text-xs font-bold text-white text-center">{t.target}</p>
          <p className="flex-1 text-xs font-bold text-white text-center">{t.actual}</p>
          <p className="flex-1 text-xs font-bold text-white text-center">{t.variance}</p>
        </div>

        {data.map((item, index) => {
          const variance = item.actual - item.target;
          const variancePercent = item.target > 0 ? (variance / item.target) * 100 : 0;
          const varianceColor = variance >= 0 ? '#4CAF50' : '#F44336';

          return (
            <div
              key={index}
              className={`flex p-3 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <p className={`flex-1 text-xs font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {item.period}
              </p>
              <p className="flex-1 text-xs text-center text-gray-900">{item.target}</p>
              <p className="flex-1 text-xs text-center font-bold text-gray-900">{item.actual}</p>
              <p className="flex-1 text-xs text-center font-bold" style={{ color: varianceColor }}>
                {variancePercent > 0 ? '+' : ''}
                {variancePercent.toFixed(0)}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Visual Bars */}
      <div className="mt-6">
        <h4 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.visualComparison}
        </h4>
        {data.map((item, index) => {
          const targetPercent = (item.target / maxValue) * 100;
          const actualPercent = (item.actual / maxValue) * 100;

          return (
            <div key={index} className="mb-4">
              <p className={`text-xs font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {item.period}
              </p>

              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <p className={`text-xs text-gray-600 ${isRTL ? 'ml-2' : 'mr-2'}`} style={{ width: '48px' }}>
                  {t.targetLabel}
                </p>
                <div className="flex-1 h-4 bg-blue-600 rounded" style={{ width: `${targetPercent}%` }} />
                <p className="text-xs font-bold text-gray-900" style={{ width: '40px' }}>
                  {item.target}
                </p>
              </div>

              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <p className={`text-xs text-gray-600 ${isRTL ? 'ml-2' : 'mr-2'}`} style={{ width: '48px' }}>
                  {t.actualLabel}
                </p>
                <div className="flex-1 h-4 bg-green-600 rounded" style={{ width: `${actualPercent}%` }} />
                <p className="text-xs font-bold text-gray-900" style={{ width: '40px' }}>
                  {item.actual}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DisaggregationToggle({ onSelect }: { onSelect: (type: string) => void }) {
  const { language, isRTL } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);

  const t = {
    title: language === 'en' ? 'Disaggregation' : 'التفصيل',
    gender: language === 'en' ? 'Gender' : 'الجنس',
    ageGroup: language === 'en' ? 'Age Group' : 'الفئة العمرية',
    location: language === 'en' ? 'Location' : 'الموقع',
  };

  const options = [
    { label: t.gender, value: 'gender' },
    { label: t.ageGroup, value: 'age' },
    { label: t.location, value: 'location' },
  ];

  return (
    <div className="p-4">
      <h3 className={`text-lg font-bold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.title}
      </h3>

      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setSelected(selected === option.value ? null : option.value);
              onSelect(selected === option.value ? '' : option.value);
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selected === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="text-sm font-semibold">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
