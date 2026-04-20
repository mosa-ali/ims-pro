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
 title: t.system.salaryScale.salaryScaleTableGuideline,
 subtitle: t.system.salaryScale.salaryScaleGuidelineSubtitle,

 // Section A: Grade Definition
 sectionA: t.system.salaryScale.aSalaryGradeDefinition,
 gradeDefinition: t.system.salaryScale.gradeDefinition,
 
 gradeExamples: t.system.salaryScale.gradeExamples,
 grades: [
 {
 grade: 'G1',
 title: t.system.salaryScale.entryLevel,
 description: t.system.salaryScale.entryLevel
 },
 {
 grade: 'G2',
 title: t.system.salaryScale.juniorLevel,
 description: t.system.salaryScale.juniorLevel
 },
 {
 grade: 'G3',
 title: t.system.salaryScale.midLevel,
 description: t.system.salaryScale.midLevel
 },
 {
 grade: 'G4',
 title: t.system.salaryScale.seniorLevel,
 description: t.system.salaryScale.seniorLevel
 },
 {
 grade: 'G5',
 title: t.system.salaryScale.executiveLevel,
 description: t.system.salaryScale.executiveLevel
 }
 ],

 // Section B: Position vs Grade
 sectionB: t.system.salaryScale.bPositionVsGradeGuidance,
 positionGuidance: t.system.salaryScale.positionGuidance,
 
 positionNote: t.system.salaryScale.positionNote,

 // Section C: Step Definition
 sectionC: t.system.salaryScale.cStepDefinition,
 stepTitle: t.system.salaryScale.whatIsAStep,
 stepDefinition: t.system.salaryScale.stepDefinition,
 
 stepExplanation: t.system.salaryScale.stepExplanation,
 
 stepProgression: t.system.salaryScale.stepProgression,
 stepRules: t.system.salaryScale.stepRules,

 // Section D: Payroll Warning
 sectionD: t.system.salaryScale.dPayrollDependencyWarning,
 warningTitle: t.system.salaryScale.criticalWarning,
 warningText: t.system.salaryScale.warningText,
 
 warningRules: t.system.salaryScale.warningRules,

 // Additional Notes
 notesTitle: t.system.salaryScale.importantNotes,
 notes: t.system.salaryScale.notes
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
