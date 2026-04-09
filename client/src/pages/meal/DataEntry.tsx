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

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useRef } from 'react';
import { Upload, MapPin, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function DataEntry() {
 const { t } = useTranslation();
 const navigate = useNavigate();
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

 const labels = {
 title: t.meal.dataEntry,
 cancel: t.meal.cancel,
 indicator: t.meal.indicator9,
 achievedValue: t.meal.achievedValue,
 enterValue: t.meal.enterValueIn,
 units: t.meal.units,
 unit: t.meal.unit,
 disaggregatedData: t.meal.disaggregatedData,
 male: t.meal.male,
 female: t.meal.female,
 boys: t.meal.boys,
 girls: t.meal.girls,
 totalIndividuals: t.meal.totalIndividuals,
 notes: t.meal.notesComments,
 notesPlaceholder: 'Add any relevant notes or observations...',
 evidence: t.meal.evidenceSupportingDocuments,
 attachFile: t.meal.attachPhotoOrDocument,
 browse: t.meal.browse,
 geolocation: t.meal.geolocation,
 captureLocation: t.meal.captureCurrentLocation,
 getLocation: t.meal.getLocation,
 saveDraft: t.meal.saveDraft,
 submit: t.meal.submit,
 validationError: t.meal.validationError,
 enterValidValue: t.meal.pleaseEnterAValidNumericValue,
 success: t.meal.success,
 draftSaved: t.meal.draftSavedSuccessfully,
 submitSuccess: t.meal.valueSubmittedSuccessfully,
 totalText: t.meal.totalIndividuals,
 evidenceAttached: t.meal.evidenceFileAttached,
 locationCaptured: t.meal.locationCaptured,
 locationError: 'Failed to get location. Please enable location services.',
 };

 // Mock indicator data
 const indicator = {
 id: indicatorId,
 indicatorName: 'Number of beneficiaries reached with assistance',
 unitType: t.meal.persons,
 };

 const handlePickEvidence = () => {
 fileInputRef.current?.click();
 };

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 setEvidence(file);
 alert(labels.evidenceAttached);
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
 `${labels.locationCaptured}: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
 );
 },
 (error) => {
 alert(labels.locationError);
 console.error('Geolocation error:', error);
 }
 );
 } else {
 alert(labels.locationError);
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
 alert(labels.enterValidValue);
 return;
 }

 const total =
 (parseFloat(maleCount) || 0) +
 (parseFloat(femaleCount) || 0) +
 (parseFloat(boysCount) || 0) +
 (parseFloat(girlsCount) || 0);

 const message = `${draft ? labels.draftSaved : labels.submitSuccess}\n\n${labels.totalText}: ${total}\n${labels.male}: ${maleCount || 0}\n${labels.female}: ${femaleCount || 0}\n${labels.boys}: ${boysCount || 0}\n${labels.girls}: ${girlsCount || 0}`;

 alert(message);
 navigate('/organization/meal/survey');
 };

 const totalIndividuals =
 (parseFloat(maleCount) || 0) +
 (parseFloat(femaleCount) || 0) +
 (parseFloat(boysCount) || 0) +
 (parseFloat(girlsCount) || 0);

 return (
 <div className="max-w-4xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.meal.backToSurveys} />
 {/* Header */}
 <div className={`p-6 border-b border-gray-200 text-start`}>
 <div className={`flex items-center justify-between mb-4`}>
 <h1 className="text-2xl font-bold text-gray-900 flex-1">{labels.title}</h1>
 <button
 onClick={() => navigate('/organization/meal/survey')}
 className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 >
 <span className="text-sm font-semibold text-blue-600">{labels.cancel}</span>
 </button>
 </div>

 {indicator && (
 <div className="rounded-lg p-4 bg-gray-50">
 <p className="text-sm text-gray-600 mb-1">{labels.indicator}</p>
 <p className="text-base font-semibold text-gray-900">{indicator.indicatorName}</p>
 </div>
 )}
 </div>

 {/* Form */}
 <div className="p-6 space-y-6">
 {/* Achieved Value */}
 <div>
 <label className={`text-base font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.achievedValue} *
 </label>
 <input
 type="number"
 value={value}
 onChange={(e) => setValue(e.target.value)}
 placeholder={`${labels.enterValue} ${indicator?.unitType || labels.units}`}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 <p className={`text-xs text-gray-600 mt-1 text-start`}>
 {labels.unit}: {indicator?.unitType || 'N/A'}
 </p>
 </div>

 {/* Disaggregated Data */}
 <div>
 <h2 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {labels.disaggregatedData}
 </h2>

 <div className={`grid grid-cols-2 gap-4 mb-4`}>
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.male}
 </label>
 <input
 type="number"
 value={maleCount}
 onChange={(e) => setMaleCount(e.target.value)}
 placeholder="0"
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.female}
 </label>
 <input
 type="number"
 value={femaleCount}
 onChange={(e) => setFemaleCount(e.target.value)}
 placeholder="0"
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>
 </div>

 <div className={`grid grid-cols-2 gap-4`}>
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.boys}
 </label>
 <input
 type="number"
 value={boysCount}
 onChange={(e) => setBoysCount(e.target.value)}
 placeholder="0"
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.girls}
 </label>
 <input
 type="number"
 value={girlsCount}
 onChange={(e) => setGirlsCount(e.target.value)}
 placeholder="0"
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>
 </div>

 <div className="mt-4 p-4 rounded-lg bg-gray-50">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>
 {labels.totalIndividuals}
 </p>
 <p className="text-2xl font-bold text-blue-600">{totalIndividuals}</p>
 </div>
 </div>

 {/* Notes */}
 <div>
 <label className={`text-base font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.notes}
 </label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder={labels.notesPlaceholder}
 rows={4}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${ 'text-start' }`}
 />
 </div>

 {/* Evidence Attachment */}
 <div>
 <label className={`text-base font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.evidence}
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
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between ${ ''}`}
 >
 <span className={evidence ? 'text-gray-900' : 'text-gray-500'}>
 {evidence ? evidence.name : labels.attachFile}
 </span>
 <Upload className="w-5 h-5 text-blue-600" />
 </button>
 </div>

 {/* Geolocation */}
 <div>
 <label className={`text-base font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.geolocation}
 </label>
 <button
 onClick={handleGetLocation}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between ${ ''}`}
 >
 <span className={location ? 'text-gray-900' : 'text-gray-500'}>
 {location
 ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
 : labels.captureLocation}
 </span>
 <MapPin className="w-5 h-5 text-blue-600" />
 </button>
 </div>

 {/* Action Buttons */}
 <div className={`flex gap-4`}>
 <button
 onClick={handleSaveDraft}
 className="flex-1 px-6 py-4 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 >
 <span className="font-semibold text-gray-900 flex items-center justify-center gap-2">
 <Save className="w-4 h-4" /> {labels.saveDraft}
 </span>
 </button>

 <button
 onClick={handleSubmitFinal}
 className="flex-1 px-6 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="font-semibold text-white flex items-center justify-center gap-2">
 <Send className="w-4 h-4" /> {labels.submit}
 </span>
 </button>
 </div>
 </div>
 </div>
 );
}
