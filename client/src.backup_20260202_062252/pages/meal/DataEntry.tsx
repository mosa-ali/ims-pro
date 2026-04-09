/**
 * ============================================================================
 * DATA ENTRY FORM
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Data entry form for indicator values with disaggregated data
 * 
 * FEATURES:
 * - Achieved value input
 * - Disaggregated data (Male, Female, Boys, Girls)
 * - Notes and comments
 * - Evidence file attachment
 * - Geolocation capture
 * - Save draft or submit
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useRef } from 'react';
import { Upload, MapPin, Save, Send } from 'lucide-react';

export function DataEntry() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const id = searchParams.get('id') || '';
  const mode = searchParams.get('mode') || '';
  const indicatorId = parseInt(id);

  const [value, setValue] = useState('');
  const [maleCount, setMaleCount] = useState('');
  const [femaleCount, setFemaleCount] = useState('');
  const [boysCount, setBoysCount] = useState('');
  const [girlsCount, setGirlsCount] = useState('');
  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const t = {
    title: language === 'en' ? 'Data Entry' : 'إدخال البيانات',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    indicator: language === 'en' ? 'Indicator' : 'المؤشر',
    achievedValue: language === 'en' ? 'Achieved Value' : 'القيمة المحققة',
    enterValue: language === 'en' ? 'Enter value in' : 'أدخل القيمة في',
    units: language === 'en' ? 'units' : 'وحدات',
    unit: language === 'en' ? 'Unit' : 'الوحدة',
    disaggregatedData: language === 'en' ? 'Disaggregated Data' : 'البيانات المفصلة',
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    boys: language === 'en' ? 'Boys' : 'أولاد',
    girls: language === 'en' ? 'Girls' : 'بنات',
    totalIndividuals: language === 'en' ? 'Total Individuals' : 'إجمالي الأفراد',
    notes: language === 'en' ? 'Notes / Comments' : 'ملاحظات / تعليقات',
    notesPlaceholder: language === 'en'
      ? 'Add any relevant notes or observations...'
      : 'أضف أي ملاحظات أو ملاحظات ذات صلة...',
    evidence: language === 'en' ? 'Evidence / Supporting Documents' : 'الأدلة / المستندات الداعمة',
    attachFile: language === 'en' ? 'Attach photo or document' : 'إرفاق صورة أو مستند',
    browse: language === 'en' ? 'Browse' : 'تصفح',
    geolocation: language === 'en' ? 'Geolocation' : 'الموقع الجغرافي',
    captureLocation: language === 'en' ? 'Capture current location' : 'التقاط الموقع الحالي',
    getLocation: language === 'en' ? 'Get Location' : 'الحصول على الموقع',
    saveDraft: language === 'en' ? 'Save Draft' : 'حفظ كمسودة',
    submit: language === 'en' ? 'Submit' : 'إرسال',
    validationError: language === 'en' ? 'Validation Error' : 'خطأ في التحقق',
    enterValidValue: language === 'en' ? 'Please enter a valid numeric value' : 'يرجى إدخال قيمة رقمية صحيحة',
    success: language === 'en' ? 'Success' : 'نجح',
    draftSaved: language === 'en' ? 'Draft saved successfully' : 'تم حفظ المسودة بنجاح',
    submitSuccess: language === 'en' ? 'Value submitted successfully' : 'تم إرسال القيمة بنجاح',
    totalText: language === 'en' ? 'Total Individuals' : 'إجمالي الأفراد',
    evidenceAttached: language === 'en' ? 'Evidence file attached' : 'تم إرفاق ملف الأدلة',
    locationCaptured: language === 'en' ? 'Location captured' : 'تم التقاط الموقع',
    locationError: language === 'en'
      ? 'Failed to get location. Please enable location services.'
      : 'فشل الحصول على الموقع. يرجى تمكين خدمات الموقع.',
  };

  // Mock indicator data
  const indicator = {
    id: indicatorId,
    indicatorName: language === 'en'
      ? 'Number of beneficiaries reached with assistance'
      : 'عدد المستفيدين الذين تم الوصول إليهم بالمساعدة',
    unitType: language === 'en' ? 'persons' : 'أشخاص',
  };

  const handlePickEvidence = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEvidence(file);
      alert(t.evidenceAttached);
    }
  };

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(coords);
          alert(
            `${t.locationCaptured}: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
          );
        },
        (error) => {
          alert(t.locationError);
          console.error('Geolocation error:', error);
        }
      );
    } else {
      alert(t.locationError);
    }
  };

  const handleSaveDraft = () => {
    handleSubmit(true);
  };

  const handleSubmitFinal = () => {
    handleSubmit(false);
  };

  const handleSubmit = (draft: boolean) => {
    if (!value || isNaN(parseFloat(value))) {
      alert(t.enterValidValue);
      return;
    }

    const total =
      (parseFloat(maleCount) || 0) +
      (parseFloat(femaleCount) || 0) +
      (parseFloat(boysCount) || 0) +
      (parseFloat(girlsCount) || 0);

    const message = `${draft ? t.draftSaved : t.submitSuccess}\n\n${t.totalText}: ${total}\n${t.male}: ${maleCount || 0}\n${t.female}: ${femaleCount || 0}\n${t.boys}: ${boysCount || 0}\n${t.girls}: ${girlsCount || 0}`;

    alert(message);
    window.history.back();
  };

  const totalIndividuals =
    (parseFloat(maleCount) || 0) +
    (parseFloat(femaleCount) || 0) +
    (parseFloat(boysCount) || 0) +
    (parseFloat(girlsCount) || 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className={`p-6 border-b border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h1 className="text-2xl font-bold text-gray-900 flex-1">{t.title}</h1>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-blue-600">{t.cancel}</span>
          </button>
        </div>

        {indicator && (
          <div className="rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-600 mb-1">{t.indicator}</p>
            <p className="text-base font-semibold text-gray-900">{indicator.indicatorName}</p>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="p-6 space-y-6">
        {/* Achieved Value */}
        <div>
          <label className={`text-base font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.achievedValue} *
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`${t.enterValue} ${indicator?.unitType || t.units}`}
            className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          />
          <p className={`text-xs text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.unit}: {indicator?.unitType || 'N/A'}
          </p>
        </div>

        {/* Disaggregated Data */}
        <div>
          <h2 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.disaggregatedData}
          </h2>

          <div className={`grid grid-cols-2 gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.male}
              </label>
              <input
                type="number"
                value={maleCount}
                onChange={(e) => setMaleCount(e.target.value)}
                placeholder="0"
                className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              />
            </div>

            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.female}
              </label>
              <input
                type="number"
                value={femaleCount}
                onChange={(e) => setFemaleCount(e.target.value)}
                placeholder="0"
                className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              />
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.boys}
              </label>
              <input
                type="number"
                value={boysCount}
                onChange={(e) => setBoysCount(e.target.value)}
                placeholder="0"
                className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              />
            </div>

            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.girls}
              </label>
              <input
                type="number"
                value={girlsCount}
                onChange={(e) => setGirlsCount(e.target.value)}
                placeholder="0"
                className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              />
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-gray-50">
            <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.totalIndividuals}
            </p>
            <p className="text-2xl font-bold text-blue-600">{totalIndividuals}</p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={`text-base font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.notes}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={4}
            className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          />
        </div>

        {/* Evidence Attachment */}
        <div>
          <label className={`text-base font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.evidence}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handlePickEvidence}
            className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}
          >
            <span className={evidence ? 'text-gray-900' : 'text-gray-500'}>
              {evidence ? evidence.name : t.attachFile}
            </span>
            <Upload className="w-5 h-5 text-blue-600" />
          </button>
        </div>

        {/* Geolocation */}
        <div>
          <label className={`text-base font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.geolocation}
          </label>
          <button
            onClick={handleGetLocation}
            className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}
          >
            <span className={location ? 'text-gray-900' : 'text-gray-500'}>
              {location
                ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                : t.captureLocation}
            </span>
            <MapPin className="w-5 h-5 text-blue-600" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleSaveDraft}
            className="flex-1 px-6 py-4 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-900 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {t.saveDraft}
            </span>
          </button>

          <button
            onClick={handleSubmitFinal}
            className="flex-1 px-6 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <span className="font-semibold text-white flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> {t.submit}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
