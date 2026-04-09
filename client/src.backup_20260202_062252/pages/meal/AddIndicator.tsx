/**
 * ============================================================================
 * ADD/EDIT INDICATOR FORM
 * ============================================================================
 * 
 * Complete form for creating and editing project indicators
 * 
 * FEATURES:
 * - Full CRUD operations
 * - Form validation
 * - Duplicate prevention
 * - Bilingual support (EN/AR) with RTL
 * - Auto-save drafts
 * - Business logic validation
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { indicatorService, type IndicatorType, type DataSource, type MeasurementUnit, type DisaggregationType } from '@/services/mealService';

export function AddIndicator() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const { user } = useAuth();

  const projectId = searchParams.get('projectId') || '';
  const indicatorId = searchParams.get('id');
  const isEditing = !!indicatorId;

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IndicatorType>('output');
  const [category, setCategory] = useState('');
  const [sector, setSector] = useState('');
  const [unit, setUnit] = useState<MeasurementUnit>('number');
  const [dataSource, setDataSource] = useState<DataSource>('manual');
  const [collectionFrequency, setCollectionFrequency] = useState<'monthly' | 'quarterly' | 'annually' | 'adhoc'>('monthly');
  const [baseline, setBaseline] = useState<string>('0');
  const [target, setTarget] = useState<string>('');
  const [disaggregation, setDisaggregation] = useState<DisaggregationType[]>([]);
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load existing indicator if editing
  useEffect(() => {
    if (isEditing && indicatorId) {
      const indicator = indicatorService.getIndicatorById(indicatorId);
      if (indicator) {
        setCode(indicator.code);
        setName(indicator.name);
        setDescription(indicator.description);
        setType(indicator.type);
        setCategory(indicator.category);
        setSector(indicator.sector);
        setUnit(indicator.unit);
        setDataSource(indicator.dataSource);
        setCollectionFrequency(indicator.collectionFrequency);
        setBaseline(indicator.baseline.toString());
        setTarget(indicator.target.toString());
        setDisaggregation(indicator.disaggregation);
        setResponsiblePerson(indicator.responsiblePerson);
        setStatus(indicator.status);
      }
    }
  }, [isEditing, indicatorId]);

  const handleDisaggregationToggle = (value: DisaggregationType) => {
    if (disaggregation.includes(value)) {
      setDisaggregation(disaggregation.filter(d => d !== value));
    } else {
      setDisaggregation([...disaggregation, value]);
    }
  };

  const validateForm = (): boolean => {
    if (!code.trim()) {
      setError(t.meal.indicatorCodeRequired);
      return false;
    }
    if (!name.trim()) {
      setError(t.meal.indicatorNameRequired);
      return false;
    }
    if (!category.trim()) {
      setError(t.meal.categoryRequired);
      return false;
    }
    if (!sector.trim()) {
      setError(t.meal.sectorRequired);
      return false;
    }
    if (!target.trim() || parseFloat(target) <= 0) {
      setError(t.meal.targetRequired);
      return false;
    }
    if (!responsiblePerson.trim()) {
      setError(t.meal.responsiblePersonRequired);
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
      const data = {
        projectId,
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        type,
        category: category.trim(),
        sector: sector.trim(),
        unit,
        dataSource,
        collectionFrequency,
        baseline: parseFloat(baseline) || 0,
        target: parseFloat(target),
        disaggregation,
        responsiblePerson: responsiblePerson.trim(),
        status,
        createdBy: user?.openId || 'system',
      };

      if (isEditing && indicatorId) {
        indicatorService.updateIndicator(indicatorId, data, user?.openId || 'system');
        setSuccess(t.meal.indicatorUpdated);
      } else {
        indicatorService.createIndicator(data, user?.openId || 'system');
        setSuccess(t.meal.indicatorCreated);
      }

      setTimeout(() => {
        navigate(`/meal/indicators?projectId=${projectId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || t.meal.saveError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isEditing ? t.meal.editIndicator : t.meal.addIndicator}
          </h1>
          <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.meal.project}: {projectId}
          </p>
        </div>
        <button
          onClick={() => window.history.back()}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {t.common.back}
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
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className={`text-sm text-green-800 ${isRTL ? 'text-right' : 'text-left'}`}>{success}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
        {/* Basic Information */}
        <div>
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.meal.basicInformation}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Indicator Code */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.meal.indicatorCode} <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                placeholder="e.g., IND-001"
                required
                dir="ltr"
              />
            </div>

            {/* Type */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.meal.indicatorType} <span className="text-red-600">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as IndicatorType)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                required
              >
                <option value="output">{t.meal.output}</option>
                <option value="outcome">{t.meal.outcome}</option>
                <option value="impact">{t.meal.impact}</option>
              </select>
            </div>
          </div>

          {/* Indicator Name - SINGLE FIELD WITH LANGUAGE-BASED UI */}
          <div className="mt-4">
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.meal.indicatorName} <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
              placeholder={t.meal.indicatorNamePlaceholder || (isRTL ? 'مثال: عدد المستفيدين الذين تم الوصول إليهم' : 'e.g., Number of beneficiaries reached')}
              required
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Description - SINGLE FIELD WITH LANGUAGE-BASED UI */}
          <div className="mt-4">
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.meal.description}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
              placeholder={t.meal.descriptionPlaceholder || (isRTL ? 'صف ما يقيسه هذا المؤشر...' : 'Describe what this indicator measures...')}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        {/* Classification */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.meal.classification}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.meal.category} <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                placeholder={t.meal.categoryPlaceholder}
                required
              />
            </div>

            {/* Sector */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.meal.sector} <span className="text-red-600">*</span>
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                required
              >
                <option value="">{t.meal.selectSector}</option>
                <option value="Protection">{t.meal.sectorProtection}</option>
                <option value="Health">{t.meal.sectorHealth}</option>
                <option value="Education">{t.meal.sectorEducation}</option>
                <option value="WASH">{t.meal.sectorWASH}</option>
                <option value="Nutrition">{t.meal.sectorNutrition}</option>
                <option value="Livelihoods">{t.meal.sectorLivelihoods}</option>
                <option value="Multi-sector">{t.meal.sectorMultiSector}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Measurement */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.meal.measurement}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Unit */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.meal.unit} <span className="text-red-600">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as MeasurementUnit)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                required
              >
                <option value="number">{t.meal.unitNumber}</option>
                <option value="percentage">{t.meal.unitPercentage}</option>
                <option value="ratio">{t.meal.unitRatio}</option>
                <option value="index">{t.meal.unitIndex}</option>
              </select>
            </div>

            {/* Baseline */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.meal.baseline}
              </label>
              <input
                type="number"
                value={baseline}
                onChange={(e) => setBaseline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                placeholder="0"
                min="0"
                step="0.01"
                dir="ltr"
              />
            </div>

            {/* Target */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.meal.target} <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                placeholder="1000"
                min="0"
                step="0.01"
                required
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Data Collection */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.meal.dataCollection}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data Source */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.meal.dataSource} <span className="text-red-600">*</span>
              </label>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value as DataSource)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                required
              >
                <option value="manual">{t.meal.sourceManual}</option>
                <option value="survey">{t.meal.sourceSurvey}</option>
                <option value="automatic">{t.meal.sourceAutomatic}</option>
                <option value="external">{t.meal.sourceExternal}</option>
              </select>
            </div>

            {/* Collection Frequency */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.meal.collectionFrequency} <span className="text-red-600">*</span>
              </label>
              <select
                value={collectionFrequency}
                onChange={(e) => setCollectionFrequency(e.target.value as any)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                required
              >
                <option value="monthly">{t.meal.frequencyMonthly}</option>
                <option value="quarterly">{t.meal.frequencyQuarterly}</option>
                <option value="annually">{t.meal.frequencyAnnually}</option>
                <option value="adhoc">{t.meal.frequencyAdhoc}</option>
              </select>
            </div>
          </div>

          {/* Responsible Person */}
          <div className="mt-4">
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.meal.responsiblePerson} <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
              placeholder={t.meal.responsiblePersonPlaceholder}
              required
            />
          </div>
        </div>

        {/* Disaggregation */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.meal.disaggregation}
          </h2>
          <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.meal.disaggregationDesc}
          </p>

          <div className="flex flex-wrap gap-3">
            {(['gender', 'age', 'location', 'disability'] as DisaggregationType[]).map((option) => (
              <label
                key={option}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
                  disaggregation.includes(option)
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                } ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={disaggregation.includes(option)}
                  onChange={() => handleDisaggregationToggle(option)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">
                  {option === 'gender' && t.meal.disaggregationGender}
                  {option === 'age' && t.meal.disaggregationAge}
                  {option === 'location' && t.meal.disaggregationLocation}
                  {option === 'disability' && t.meal.disaggregationDisability}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="border-t border-gray-200 pt-6">
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.meal.status}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            className={`w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="active">{t.meal.statusActive}</option>
            <option value="inactive">{t.meal.statusInactive}</option>
          </select>
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
                {t.common.loading}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? t.common.update : t.common.save}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t.common.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}