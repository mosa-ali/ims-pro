/**
 * ============================================================================
 * SALARY SCALE GUIDELINE TAB
 * ============================================================================
 * READ-ONLY guidance for HR users on how to use the Salary Scale Table
 * ============================================================================
 */

import { BookOpen, AlertTriangle, Info, TrendingUp } from 'lucide-react';

interface GuidelineProps {
  language: string;
  isRTL: boolean;
}

export function SalaryScaleGuideline({ language, isRTL }: GuidelineProps) {
  const t = {
    title: language === 'en' ? 'Salary Scale Table - Guideline' : 'دليل جدول الرواتب',
    subtitle: language === 'en' 
      ? 'How to use the Salary Scale Table correctly'
      : 'كيفية استخدام جدول الرواتب بشكل صحيح',

    // Section A: Grade Definition
    sectionA: language === 'en' ? 'A. Salary Grade Definition' : 'أ. تعريف درجات الرواتب',
    gradeDefinition: language === 'en'
      ? 'A Grade represents the seniority level and responsibility scope of a position within the organization.'
      : 'تمثل الدرجة مستوى الأقدمية ونطاق المسؤولية للمنصب داخل المنظمة.',
    
    gradeExamples: language === 'en' ? 'Grade Examples:' : 'أمثلة على الدرجات:',
    grades: [
      {
        grade: 'G1',
        title: language === 'en' ? 'Entry Level' : 'المستوى التمهيدي',
        description: language === 'en' 
          ? 'Junior / Assistant roles with basic responsibilities'
          : 'أدوار مساعدة / مبتدئة بمسؤوليات أساسية'
      },
      {
        grade: 'G2',
        title: language === 'en' ? 'Junior Level' : 'المستوى المبتدئ',
        description: language === 'en'
          ? 'Officer / Technical roles with moderate responsibilities'
          : 'أدوار فنية / موظفين بمسؤوليات متوسطة'
      },
      {
        grade: 'G3',
        title: language === 'en' ? 'Mid Level' : 'المستوى المتوسط',
        description: language === 'en'
          ? 'Coordinator / Senior Officer roles with significant responsibilities'
          : 'أدوار منسقين / موظفين كبار بمسؤوليات كبيرة'
      },
      {
        grade: 'G4',
        title: language === 'en' ? 'Senior Level' : 'المستوى الأول',
        description: language === 'en'
          ? 'Manager / Head of Unit roles with leadership responsibilities'
          : 'أدوار مدراء / رؤساء وحدات بمسؤوليات قيادية'
      },
      {
        grade: 'G5',
        title: language === 'en' ? 'Executive Level' : 'المستوى التنفيذي',
        description: language === 'en'
          ? 'Director / Senior Management with strategic responsibilities'
          : 'أدوار مدراء تنفيذيين / إدارة عليا بمسؤوليات استراتيجية'
      }
    ],

    // Section B: Position vs Grade
    sectionB: language === 'en' ? 'B. Position vs Grade Guidance' : 'ب. إرشادات المنصب مقابل الدرجة',
    positionGuidance: language === 'en'
      ? 'Grades are organizational decisions and may vary based on project requirements, donor policies, and local context. The Salary Scale Table supports flexibility.'
      : 'الدرجات هي قرارات تنظيمية وقد تختلف بناءً على متطلبات المشروع وسياسات الجهات المانحة والسياق المحلي. جدول الرواتب يدعم المرونة.',
    
    positionNote: language === 'en'
      ? 'The same position title may have different grades across different projects or organizations.'
      : 'قد يكون لنفس المسمى الوظيفي درجات مختلفة عبر مشاريع أو منظمات مختلفة.',

    // Section C: Step Definition
    sectionC: language === 'en' ? 'C. Step Definition' : 'ج. تعريف المستويات',
    stepTitle: language === 'en' ? 'What is a Step?' : 'ما هو المستوى؟',
    stepDefinition: language === 'en'
      ? 'Steps represent salary progression within the same grade. They do NOT change job title or grade.'
      : 'تمثل المستويات التقدم في الراتب ضمن نفس الدرجة. لا تغير المسمى الوظيفي أو الدرجة.',
    
    stepExplanation: language === 'en'
      ? 'Step 1 represents the entry salary within a grade. Higher steps (Step 2, Step 3) reflect salary progression while remaining in the same grade.'
      : 'المستوى 1 يمثل الراتب الأولي ضمن الدرجة. المستويات الأعلى (المستوى 2، المستوى 3) تعكس التقدم في الراتب مع البقاء في نفس الدرجة.',
    
    stepProgression: language === 'en' ? 'Step Progression:' : 'التقدم في المستويات:',
    stepRules: [
      language === 'en' 
        ? 'Steps are usually annual or performance-based'
        : 'المستويات عادة ما تكون سنوية أو بناءً على الأداء',
      language === 'en'
        ? 'Moving from Step 1 to Step 2 increases salary without changing grade'
        : 'الانتقال من المستوى 1 إلى المستوى 2 يزيد الراتب دون تغيير الدرجة',
      language === 'en'
        ? 'Maximum salary in a grade is typically reached at the highest step'
        : 'الحد الأقصى للراتب في الدرجة يتم الوصول إليه عادة في أعلى مستوى'
    ],

    // Section D: Payroll Warning
    sectionD: language === 'en' ? 'D. Payroll Dependency Warning' : 'د. تحذير تبعية كشف الرواتب',
    warningTitle: language === 'en' ? 'CRITICAL WARNING' : 'تحذير حرج',
    warningText: language === 'en'
      ? 'Payroll calculations depend directly on the Salary Scale Table. Incorrect setup may result in incorrect payroll.'
      : 'تعتمد حسابات كشف الرواتب مباشرة على جدول الرواتب. الإعداد غير الصحيح قد يؤدي إلى كشف رواتب غير صحيح.',
    
    warningRules: [
      language === 'en'
        ? 'Only records with Status = Active will be read by Payroll'
        : 'فقط السجلات ذات الحالة = نشط سيتم قراءتها من قبل كشف الرواتب',
      language === 'en'
        ? 'Draft records are ignored by Payroll'
        : 'السجلات المسودة يتم تجاهلها من قبل كشف الرواتب',
      language === 'en'
        ? 'Historical/Superseded versions remain read-only for audit purposes'
        : 'النسخ التاريخية/المستبدلة تبقى للقراءة فقط لأغراض التدقيق',
      language === 'en'
        ? 'Always verify salary data before activating a record'
        : 'تحقق دائماً من بيانات الراتب قبل تفعيل السجل'
    ],

    // Additional Notes
    notesTitle: language === 'en' ? 'Important Notes' : 'ملاحظات مهمة',
    notes: [
      language === 'en'
        ? 'This is guidance only - no automatic validation is enforced'
        : 'هذا دليل فقط - لا يتم فرض التحقق التلقائي',
      language === 'en'
        ? 'Organizations can customize grades and steps based on their policies'
        : 'يمكن للمنظمات تخصيص الدرجات والمستويات بناءً على سياساتها',
      language === 'en'
        ? 'All salary changes must be documented with effective dates'
        : 'يجب توثيق جميع تغييرات الرواتب مع تواريخ السريان'
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h3 className="text-xl font-bold text-gray-900">{t.title}</h3>
        <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
      </div>

      {/* Section A: Grade Definition */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h4 className="text-lg font-semibold text-gray-900">{t.sectionA}</h4>
        </div>
        <p className="text-gray-700 mb-4">{t.gradeDefinition}</p>
        
        <h5 className="font-semibold text-gray-900 mb-3">{t.gradeExamples}</h5>
        <div className="space-y-3">
          {t.grades.map((grade) => (
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
          <h4 className="text-lg font-semibold text-gray-900">{t.sectionB}</h4>
        </div>
        <p className="text-gray-700 mb-3">{t.positionGuidance}</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">{t.positionNote}</p>
        </div>
      </div>

      {/* Section C: Step Definition */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-indigo-600" />
          <h4 className="text-lg font-semibold text-gray-900">{t.sectionC}</h4>
        </div>
        
        <h5 className="font-semibold text-gray-900 mb-2">{t.stepTitle}</h5>
        <p className="text-gray-700 mb-3">{t.stepDefinition}</p>
        <p className="text-gray-700 mb-4">{t.stepExplanation}</p>
        
        <h5 className="font-semibold text-gray-900 mb-2">{t.stepProgression}</h5>
        <ul className="space-y-2">
          {t.stepRules.map((rule, index) => (
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
          <h4 className="text-lg font-semibold text-amber-900">{t.sectionD}</h4>
        </div>
        
        <div className="bg-white rounded-lg p-4 mb-4">
          <h5 className="font-bold text-amber-900 mb-2">{t.warningTitle}</h5>
          <p className="text-amber-800">{t.warningText}</p>
        </div>
        
        <ul className="space-y-2">
          {t.warningRules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
              <span className="text-amber-900">{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Additional Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-3">{t.notesTitle}</h4>
        <ul className="space-y-2">
          {t.notes.map((note, index) => (
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
