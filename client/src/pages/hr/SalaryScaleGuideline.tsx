/**
 * ============================================================================
 * SALARY SCALE GUIDELINE TAB
 * ============================================================================
 * READ-ONLY guidance for HR users on how to use the Salary Scale Table
 * ============================================================================
 */

import { BookOpen, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface GuidelineProps {
 language: string;
 isRTL: boolean;
}

export function SalaryScaleGuideline({
 language, isRTL }: GuidelineProps) {
 const { t } = useTranslation();
 const localT = {
 title: t.salaryScale.salaryScaleTableGuideline,
 subtitle: t.salaryScale.salaryScaleGuidelineSubtitle,

 // Section A: Grade Definition
 sectionA: t.salaryScale.aSalaryGradeDefinition,
 gradeDefinition: t.salaryScale.gradeDefinition,
 
 gradeExamples: t.salaryScale.gradeExamples,
 grades: [
 {
 grade: 'G1',
 title: t.salaryScale.entryLevel,
 description: t.salaryScale.entryLevel
 },
 {
 grade: 'G2',
 title: t.salaryScale.juniorLevel,
 description: t.salaryScale.juniorLevel
 },
 {
 grade: 'G3',
 title: t.salaryScale.midLevel,
 description: t.salaryScale.midLevel
 },
 {
 grade: 'G4',
 title: t.salaryScale.seniorLevel,
 description: t.salaryScale.seniorLevel
 },
 {
 grade: 'G5',
 title: t.salaryScale.executiveLevel,
 description: t.salaryScale.executiveLevel
 }
 ],

 // Section B: Position vs Grade
 sectionB: t.salaryScale.bPositionVsGradeGuidance,
 positionGuidance: t.salaryScale.positionGuidance,
 
 positionNote: t.salaryScale.positionNote,

 // Section C: Step Definition
 sectionC: t.salaryScale.cStepDefinition,
 stepTitle: t.salaryScale.whatIsAStep,
 stepDefinition: t.salaryScale.stepDefinition,
 
 stepExplanation: t.salaryScale.stepExplanation,
 
 stepProgression: t.salaryScale.stepProgression,
 stepRules: t.salaryScale.stepRules,

 // Section D: Payroll Warning
 sectionD: t.salaryScale.dPayrollDependencyWarning,
 warningTitle: t.salaryScale.criticalWarning,
 warningText: t.salaryScale.warningText,
 
 warningRules: t.salaryScale.warningRules,

 // Additional Notes
 notesTitle: t.salaryScale.importantNotes,
 notes: t.salaryScale.notes
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className={'text-start'}>
 <h3 className="text-xl font-bold text-gray-900">{localT.title}</h3>
 <p className="text-sm text-gray-600 mt-1">{localT.subtitle}</p>
 </div>

 {/* Section A: Grade Definition */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center gap-3 mb-4">
 <BookOpen className="w-6 h-6 text-blue-600" />
 <h4 className="text-lg font-semibold text-gray-900">{localT.sectionA}</h4>
 </div>
 <p className="text-gray-700 mb-4">{localT.gradeDefinition}</p>
 
 <h5 className="font-semibold text-gray-900 mb-3">{localT.gradeExamples}</h5>
 <div className="space-y-3">
 {localT.grades.map((grade) => (
 <div key={grade.grade} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
 <div className="flex-shrink-0 w-12 h-12 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold">
 {grade.grade}
 </div>
 <div className="flex-1">
 <div className="font-semibold text-gray-900">{grade.title}</div>
 <div className="text-sm text-gray-600">{grade.description}</div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Section B: Position vs Grade */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center gap-3 mb-4">
 <Info className="w-6 h-6 text-green-600" />
 <h4 className="text-lg font-semibold text-gray-900">{localT.sectionB}</h4>
 </div>
 <p className="text-gray-700 mb-3">{localT.positionGuidance}</p>
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <p className="text-sm text-blue-900">{localT.positionNote}</p>
 </div>
 </div>

 {/* Section C: Step Definition */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center gap-3 mb-4">
 <TrendingUp className="w-6 h-6 text-indigo-600" />
 <h4 className="text-lg font-semibold text-gray-900">{localT.sectionC}</h4>
 </div>
 
 <h5 className="font-semibold text-gray-900 mb-2">{localT.stepTitle}</h5>
 <p className="text-gray-700 mb-3">{localT.stepDefinition}</p>
 <p className="text-gray-700 mb-4">{localT.stepExplanation}</p>
 
 <h5 className="font-semibold text-gray-900 mb-2">{localT.stepProgression}</h5>
 <ul className="space-y-2">
 {localT.stepRules.map((rule, index) => (
 <li key={index} className="flex items-start gap-2">
 <span className="text-indigo-600 mt-1">•</span>
 <span className="text-gray-700">{rule}</span>
 </li>
 ))}
 </ul>
 </div>

 {/* Section D: Payroll Warning */}
 <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-6">
 <div className="flex items-center gap-3 mb-4">
 <AlertTriangle className="w-6 h-6 text-amber-600" />
 <h4 className="text-lg font-semibold text-amber-900">{localT.sectionD}</h4>
 </div>
 
 <div className="bg-white rounded-lg p-4 mb-4">
 <h5 className="font-bold text-amber-900 mb-2">{localT.warningTitle}</h5>
 <p className="text-amber-800">{localT.warningText}</p>
 </div>
 
 <ul className="space-y-2">
 {localT.warningRules.map((rule, index) => (
 <li key={index} className="flex items-start gap-2">
 <AlertTriangle className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
 <span className="text-amber-900">{rule}</span>
 </li>
 ))}
 </ul>
 </div>

 {/* Additional Notes */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h4 className="font-semibold text-gray-900 mb-3">{localT.notesTitle}</h4>
 <ul className="space-y-2">
 {localT.notes.map((note, index) => (
 <li key={index} className="flex items-start gap-2">
 <span className="text-blue-600 mt-1">ℹ️</span>
 <span className="text-gray-700">{note}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 );
}
