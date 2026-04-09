/**
 * ============================================================================
 * INDICATOR DATA ENTRY FORM
 * ============================================================================
 * 
 * Complete form for entering indicator data with disaggregation
 * 
 * FEATURES:
 * - Full CRUD operations
 * - Disaggregated data entry (gender, age, location, disability)
 * - Data validation
 * - Bilingual support (EN/AR) with RTL
 * - Period selection
 * - Verification workflow
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { indicatorDataService, indicatorService, type IndicatorDataEntry } from '@/services/mealService';

export function IndicatorDataEntryForm() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  const projectId = searchParams.get('projectId') || '';
  const indicatorId = searchParams.get('indicatorId') || '';
  const entryId = searchParams.get('id');
  const isEditing = !!entryId;

  const [indicator, setIndicator] = useState<any>(null);
  const [period, setPeriod] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  
  // Disaggregated data
  const [male, setMale] = useState('');
  const [female, setFemale] = useState('');
  const [ageGroup0_5, setAgeGroup0_5] = useState('');
  const [ageGroup6_17, setAgeGroup6_17] = useState('');
  const [ageGroup18_59, setAgeGroup18_59] = useState('');
  const [ageGroup60Plus, setAgeGroup60Plus] = useState('');
  const [pwd, setPwd] = useState('');
  const [nonPwd, setNonPwd] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const t = {
    title: language === 'en' ? 'Indicator Data Entry' : 'إدخال بيانات المؤشر',
    titleEdit: language === 'en' ? 'Edit Data Entry' : 'تعديل إدخال البيانات',
    back: language === 'en' ? 'Back' : 'رجوع',
    indicator: language === 'en' ? 'Indicator' : 'المؤشر',
    period: language === 'en' ? 'Reporting Period' : 'فترة الإبلاغ',
    periodPlaceholder: language === 'en' ? 'YYYY-MM (e.g., 2024-01)' : 'سنة-شهر (مثال: 2024-01)',
    value: language === 'en' ? 'Total Value' : 'القيمة الإجمالية',
    valuePlaceholder: language === 'en' ? 'Enter total value' : 'أدخل القيمة الإجمالية',
    disaggregation: language === 'en' ? 'Disaggregated Data' : 'البيانات المفصلة',
    gender: language === 'en' ? 'Gender Disaggregation' : 'التفصيل حسب الجنس',
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    age: language === 'en' ? 'Age Disaggregation' : 'التفصيل حسب العمر',
    age0_5: language === 'en' ? '0-5 years' : '0-5 سنوات',
    age6_17: language === 'en' ? '6-17 years' : '6-17 سنة',
    age18_59: language === 'en' ? '18-59 years' : '18-59 سنة',
    age60Plus: language === 'en' ? '60+ years' : '60+ سنة',
    disability: language === 'en' ? 'Disability Disaggregation' : 'التفصيل حسب الإعاقة',
    pwd: language === 'en' ? 'Persons with Disabilities' : 'الأشخاص ذوو الإعاقة',
    nonPwd: language === 'en' ? 'Persons without Disabilities' : 'الأشخاص بدون إعاقة',
    notes: language === 'en' ? 'Notes (Optional)' : 'ملاحظات (اختياري)',
    notesPlaceholder: language === 'en' ? 'Add any relevant notes or comments...' : 'أضف أي ملاحظات أو تعليقات ذات صلة...',
    save: language === 'en' ? 'Save Data' : 'حفظ البيانات',
    update: language === 'en' ? 'Update Data' : 'تحديث البيانات',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    saving: language === 'en' ? 'Saving...' : 'جاري الحفظ...',
    periodRequired: language === 'en' ? 'Please enter a reporting period' : 'يرجى إدخال فترة الإبلاغ',
    valueRequired: language === 'en' ? 'Please enter a value' : 'يرجى إدخال قيمة',
    invalidPeriod: language === 'en' ? 'Invalid period format. Use YYYY-MM' : 'تنسيق فترة غير صالح. استخدم سنة-شهر',
    saveError: language === 'en' ? 'Failed to save data' : 'فشل حفظ البيانات',
    dataCreated: language === 'en' ? 'Data entry created successfully' : 'تم إنشاء إدخال البيانات بنجاح',
    dataUpdated: language === 'en' ? 'Data entry updated successfully' : 'تم تحديث إدخال البيانات بنجاح',
    verified: language === 'en' ? 'Verified' : 'تم التحقق',
    pending: language === 'en' ? 'Pending Verification' : 'في انتظار التحقق',
  };

  // Load indicator
  useEffect(() => {
    if (indicatorId) {
      const ind = indicatorService.getIndicatorById(indicatorId);
      if (ind) {
        setIndicator(ind);
      }
    }
  }, [indicatorId]);

  // Load existing entry if editing
  useEffect(() => {
    if (entryId) {
      const entries = indicatorDataService.getAllDataEntries({ indicatorId });
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        setPeriod(entry.period);
        setValue(entry.value.toString());
        setNotes(entry.notes || '');
        
        if (entry.disaggregatedData) {
          setMale(entry.disaggregatedData.male?.toString() || '');
          setFemale(entry.disaggregatedData.female?.toString() || '');
          
          if (entry.disaggregatedData.ageGroups) {
            setAgeGroup0_5(entry.disaggregatedData.ageGroups['0-5']?.toString() || '');
            setAgeGroup6_17(entry.disaggregatedData.ageGroups['6-17']?.toString() || '');
            setAgeGroup18_59(entry.disaggregatedData.ageGroups['18-59']?.toString() || '');
            setAgeGroup60Plus(entry.disaggregatedData.ageGroups['60+']?.toString() || '');
          }
          
          if (entry.disaggregatedData.disability) {
            setPwd(entry.disaggregatedData.disability.pwd?.toString() || '');
            setNonPwd(entry.disaggregatedData.disability.nonPwd?.toString() || '');
          }
        }
      }
    }
  }, [entryId, indicatorId]);

  const validateForm = (): boolean => {
    if (!period.trim()) {
      setError(t.periodRequired);
      return false;
    }
    
    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      setError(t.invalidPeriod);
      return false;
    }
    
    if (!value.trim() || parseFloat(value) < 0) {
      setError(t.valueRequired);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const disaggregatedData: any = {};

      // Add gender disaggregation if available
      if (male || female) {
        disaggregatedData.male = parseFloat(male) || 0;
        disaggregatedData.female = parseFloat(female) || 0;
      }

      // Add age disaggregation if available
      if (ageGroup0_5 || ageGroup6_17 || ageGroup18_59 || ageGroup60Plus) {
        disaggregatedData.ageGroups = {
          '0-5': parseFloat(ageGroup0_5) || 0,
          '6-17': parseFloat(ageGroup6_17) || 0,
          '18-59': parseFloat(ageGroup18_59) || 0,
          '60+': parseFloat(ageGroup60Plus) || 0,
        };
      }

      // Add disability disaggregation if available
      if (pwd || nonPwd) {
        disaggregatedData.disability = {
          pwd: parseFloat(pwd) || 0,
          nonPwd: parseFloat(nonPwd) || 0,
        };
      }

      const data = {
        indicatorId,
        projectId,
        period: period.trim(),
        value: parseFloat(value),
        disaggregatedData: Object.keys(disaggregatedData).length > 0 ? disaggregatedData : undefined,
        notes: notes.trim() || undefined,
        enteredBy: user?.openId || 'system',
      };

      if (isEditing && entryId) {
        indicatorDataService.updateDataEntry(entryId, data, user?.openId || 'system');
        setSuccess(t.dataUpdated);
      } else {
        indicatorDataService.addDataEntry(data, user?.openId || 'system');
        setSuccess(t.dataCreated);
      }

      setTimeout(() => {
        window.history.back();
      }, 1500);
    } catch (err: any) {
      setError(err.message || t.saveError);
    } finally {
      setLoading(false);
    }
  };

  if (!indicator) {
    return (
      <div className="p-6">
        <p>Loading indicator...</p>
      </div>
    );
  }

  const hasGenderDisaggregation = indicator.disaggregation?.includes('gender');
  const hasAgeDisaggregation = indicator.disaggregation?.includes('age');
  const hasDisabilityDisaggregation = indicator.disaggregation?.includes('disability');

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isEditing ? t.titleEdit : t.title}
          </h1>
          <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.indicator}: {language === 'en' ? indicator.name : (indicator.nameAr || indicator.name)}
          </p>
        </div>
        <button
          onClick={() => window.history.back()}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {t.back}
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className={`mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className={`text-sm text-red-800 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>
        </div>
      )}

      {success && (
        <div className={`mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className={`text-sm text-green-800 ${isRTL ? 'text-right' : 'text-left'}`}>{success}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
        {/* Period and Value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Period */}
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.period} <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder={t.periodPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
              required
              dir="ltr"
            />
          </div>

          {/* Total Value */}
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.value} <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t.valuePlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
              required
              min="0"
              step="0.01"
              dir="ltr"
            />
          </div>
        </div>

        {/* Disaggregated Data */}
        {(hasGenderDisaggregation || hasAgeDisaggregation || hasDisabilityDisaggregation) && (
          <div className="border-t border-gray-200 pt-6">
            <h2 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.disaggregation}
            </h2>

            {/* Gender Disaggregation */}
            {hasGenderDisaggregation && (
              <div className="mb-6">
                <h3 className={`text-sm font-medium text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.gender}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.male}
                    </label>
                    <input
                      type="number"
                      value={male}
                      onChange={(e) => setMale(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                      min="0"
                      step="0.01"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.female}
                    </label>
                    <input
                      type="number"
                      value={female}
                      onChange={(e) => setFemale(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                      min="0"
                      step="0.01"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Age Disaggregation */}
            {hasAgeDisaggregation && (
              <div className="mb-6">
                <h3 className={`text-sm font-medium text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.age}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.age0_5}
                    </label>
                    <input
                      type="number"
                      value={ageGroup0_5}
                      onChange={(e) => setAgeGroup0_5(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                      min="0"
                      step="0.01"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.age6_17}
                    </label>
                    <input
                      type="number"
                      value={ageGroup6_17}
                      onChange={(e) => setAgeGroup6_17(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                      min="0"
                      step="0.01"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.age18_59}
                    </label>
                    <input
                      type="number"
                      value={ageGroup18_59}
                      onChange={(e) => setAgeGroup18_59(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                      min="0"
                      step="0.01"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.age60Plus}
                    </label>
                    <input
                      type="number"
                      value={ageGroup60Plus}
                      onChange={(e) => setAgeGroup60Plus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                      min="0"
                      step="0.01"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Disability Disaggregation */}
            {hasDisabilityDisaggregation && (
              <div className="mb-6">
                <h3 className={`text-sm font-medium text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.disability}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.pwd}
                    </label>
                    <input
                      type="number"
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                      min="0"
                      step="0.01"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.nonPwd}
                    </label>
                    <input
                      type="number"
                      value={nonPwd}
                      onChange={(e) => setNonPwd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                      min="0"
                      step="0.01"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="border-t border-gray-200 pt-6">
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.notes}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            placeholder={t.notesPlaceholder}
          />
        </div>

        {/* Actions */}
        <div className={`flex gap-3 pt-6 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t.saving}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? t.update : t.save}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
