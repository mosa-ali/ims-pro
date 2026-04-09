import { useState } from 'react';
import { X, Save, Download, FileText, CheckCircle, AlertCircle, ArrowLeft, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BudgetSection, CoFundingSection } from '@/pages/organization/proposals/BudgetSection';
import { ActivitiesSection, ImplementationPlanSection } from '@/pages/organization/proposals/ActivitiesSection';

interface ProposalEditorProps {
  proposal: any;
  onClose: () => void;
}

interface ProposalSection {
  key: string;
  title: string;
  required: boolean;
  wordLimit?: number;
  completed: boolean;
}

const PROPOSAL_SECTIONS: ProposalSection[] = [
  { key: 'proposal_summary', title: 'Proposal Summary', required: true, completed: false },
  { key: 'context', title: 'Context & Problem Analysis', required: true, wordLimit: 500, completed: false },
  { key: 'needs', title: 'Needs Assessment Summary', required: true, wordLimit: 300, completed: false },
  { key: 'target', title: 'Target Population', required: true, completed: false },
  { key: 'overall_objective', title: 'Overall Objective', required: true, wordLimit: 150, completed: false },
  { key: 'specific_objectives', title: 'Specific Objectives', required: true, completed: false },
  { key: 'expected_results', title: 'Expected Results', required: true, completed: false },
  { key: 'activities', title: 'Activities', required: true, completed: false },
  { key: 'implementation_plan', title: 'Implementation Plan', required: true, completed: false },
  { key: 'proposed_budget', title: 'Proposed Budget', required: true, completed: false },
  { key: 'co_funding', title: 'Co-Funding Sources', required: false, completed: false },
  { key: 'crosscutting', title: 'Cross-Cutting Issues', required: true, wordLimit: 400, completed: false },
  { key: 'coordination', title: 'Coordination & Complementarity', required: false, wordLimit: 300, completed: false },
  { key: 'risks', title: 'Risk Analysis & Mitigation', required: true, completed: false },
  { key: 'sustainability', title: 'Sustainability & Exit Strategy', required: true, wordLimit: 400, completed: false },
  { key: 'meal', title: 'MEAL Framework', required: true, completed: false },
  { key: 'capacity', title: 'Organizational Capacity', required: true, wordLimit: 300, completed: false }
];

export function ProposalEditor({ proposal, onClose }: ProposalEditorProps) {
  const { isRTL } = useLanguage();
  const [activeSection, setActiveSection] = useState('context');
  const [hasChanges, setHasChanges] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Translations
  const t = {
    sections: {
      proposal_summary: isRTL ? 'ملخص امقترح' : 'Proposal Summary',
      context: isRTL ? 'السياق وتحليل المشكلة' : 'Context & Problem Analysis',
      needs: isRTL ? 'ملخص تقييم الاحتياجات' : 'Needs Assessment Summary',
      target: isRTL ? 'الفئة المستهدفة' : 'Target Population',
      overall_objective: isRTL ? 'الهدف العام' : 'Overall Objective',
      specific_objectives: isRTL ? 'الأهداف المحددة' : 'Specific Objectives',
      expected_results: isRTL ? 'النتائج المتوقعة' : 'Expected Results',
      activities: isRTL ? 'الأنشطة' : 'Activities',
      implementation_plan: isRTL ? 'خطة التنفيذ' : 'Implementation Plan',
      proposed_budget: isRTL ? 'الميزانية المقترحة' : 'Proposed Budget',
      co_funding: isRTL ? 'مصادر التمويل المشترك' : 'Co-Funding Sources',
      crosscutting: isRTL ? 'القضايا الشاملة' : 'Cross-Cutting Issues',
      coordination: isRTL ? 'التنسيق والتكامل' : 'Coordination & Complementarity',
      risks: isRTL ? 'تحليل المخاطر والتخفيف' : 'Risk Analysis & Mitigation',
      sustainability: isRTL ? 'الاستدامة واستراتيجية الخروج' : 'Sustainability & Exit Strategy',
      meal: isRTL ? 'إطار القياس والتقييم والمساءلة والتعلم' : 'MEAL Framework',
      capacity: isRTL ? 'القدرة المؤسسية' : 'Organizational Capacity'
    },
    proposalSections: isRTL ? 'أقسام المقترح' : 'Proposal Sections',
    overallCompletion: isRTL ? 'نسبة الإنجاز الإجمالية' : 'Overall Completion',
    export: isRTL ? 'تصدير' : 'Export',
    saveChanges: isRTL ? 'حفظ التغييرات' : 'Save Changes',
    backToList: isRTL ? 'العودة إلى قائمة المقترحات' : 'Back to proposals list',
    exportProposal: isRTL ? 'تصدير المقترح' : 'Export Proposal',
    chooseExportFormat: isRTL ? 'اختر تنسيق التصدير:' : 'Choose export format:',
    exportAsPDF: isRTL ? 'تصدير بصيغة PDF' : 'Export as PDF',
    exportAsWord: isRTL ? 'تصدير بصيغة Word (.docx)' : 'Export as Word (.docx)',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    maxWords: isRTL ? 'الحد الأقصى' : 'Max',
    words: isRTL ? 'كلمات' : 'words',
    wordCount: isRTL ? 'عدد الكلمات' : 'Word count',
    wordsRemaining: isRTL ? 'الكلمات المتبقية' : 'words remaining',
    required: isRTL ? 'مطلوب' : 'Required',
    addRow: isRTL ? 'إضافة صف' : 'Add Row',
    addObjective: isRTL ? 'إضافة هدف' : 'Add Objective',
    addResult: isRTL ? 'إضافة نتيجة' : 'Add Result',
    addRisk: isRTL ? 'إضافة مخاطرة' : 'Add Risk',
    addIndicator: isRTL ? 'إضافة مؤشر' : 'Add Indicator',
    // Target Population
    targetPopulation: isRTL ? 'تفصيل الفئة المستهدفة' : 'Target Population Disaggregation',
    type: isRTL ? 'النوع' : 'Type',
    female18: isRTL ? 'إناث (18+)' : 'Female (18+)',
    male18: isRTL ? 'ذكور (18+)' : 'Male (18+)',
    girls: isRTL ? 'فتيات (0-17)' : 'Girls (0-17)',
    boys: isRTL ? 'أولاد (0-17)' : 'Boys (0-17)',
    pwd: isRTL ? 'ذوو الإعاقة' : 'PWD',
    total: isRTL ? 'المجموع' : 'Total',
    direct: isRTL ? 'مباشر' : 'Direct',
    indirect: isRTL ? 'غير مباشر' : 'Indirect',
    // Specific Objectives
    specificObjectives: isRTL ? 'الأهداف المحددة' : 'Specific Objectives',
    enterObjective: isRTL ? 'أدخل الهدف المحدد' : 'Enter specific objective',
    // Expected Results
    expectedResults: isRTL ? 'النتائج المتوقعة' : 'Expected Results',
    enterResult: isRTL ? 'أدخل النتيجة المتوقعة' : 'Enter expected result',
    // Cross-cutting
    genderMainstreaming: isRTL ? 'تعميم مراعاة النوع الاجتماعي' : 'Gender Mainstreaming',
    genderPlaceholder: isRTL ? 'كيف سيعالج المشروع المساواة بين الجنسين وتمكين المرأة؟' : 'How will the project address gender equality and women\'s empowerment?',
    protectionMainstreaming: isRTL ? 'تعميم الحماية' : 'Protection Mainstreaming',
    protectionPlaceholder: isRTL ? 'كيف سيضمن المشروع مبادئ الحماية (عدم الإضرار، الوصول، السلامة، الكرامة)؟' : 'How will the project ensure protection principles (do no harm, access, safety, dignity)?',
    environmentalConsiderations: isRTL ? 'الاعتبارات البيئية' : 'Environmental Considerations',
    environmentPlaceholder: isRTL ? 'الأثر البيئي واعتبارات الاستدامة' : 'Environmental impact and sustainability considerations',
    // Risks
    riskAnalysis: isRTL ? 'تحليل المخاطر والتخفيف' : 'Risk Analysis & Mitigation',
    riskDescription: isRTL ? 'وصف المخاطرة' : 'Risk Description',
    probability: isRTL ? 'الاحتمالية' : 'Probability',
    impact: isRTL ? 'التأثير' : 'Impact',
    mitigationMeasures: isRTL ? 'إجراءات التخفيف' : 'Mitigation Measures',
    describeRisk: isRTL ? 'صف المخاطرة...' : 'Describe the risk...',
    mitigationStrategy: isRTL ? 'استراتيجية التخفيف...' : 'Mitigation strategy...',
    low: isRTL ? 'منخفض' : 'Low',
    medium: isRTL ? 'متوسط' : 'Medium',
    high: isRTL ? 'عالي' : 'High',
    // MEAL
    mealFramework: isRTL ? 'إطار القياس والتقييم - المؤشرات' : 'MEAL Framework - Indicators',
    indicator: isRTL ? 'المؤشر' : 'Indicator',
    baseline: isRTL ? 'خط الأساس' : 'Baseline',
    target: isRTL ? 'الهدف' : 'Target',
    dataSource: isRTL ? 'مصدر البيانات' : 'Data Source',
    frequency: isRTL ? 'التكرار' : 'Frequency',
    indicatorDescription: isRTL ? 'وصف المؤشر...' : 'Indicator description...',
    monitoringReports: isRTL ? 'تقارير المتابعة' : 'Monitoring reports',
    monthly: isRTL ? 'شهري' : 'Monthly',
    quarterly: isRTL ? 'ربع سنوي' : 'Quarterly',
    semiAnnually: isRTL ? 'نصف سنوي' : 'Semi-Annually',
    annually: isRTL ? 'سنوي' : 'Annually',
    // Placeholders
    enterContent: isRTL ? 'أدخل المحتوى...' : 'Enter content...'
  };
  
  // Mock section data - would be loaded from backend
  const [sectionData, setSectionData] = useState<Record<string, any>>({
    context: {
      content: '',
      wordCount: 0
    },
    needs: {
      content: '',
      wordCount: 0
    },
    target: {
      targetGroups: [
        { type: 'Direct', female: 0, male: 0, girls: 0, boys: 0, pwd: 0 }
      ]
    },
    overall_objective: {
      content: ''
    },
    specific_objectives: {
      objectives: [
        { description: '' }
      ]
    },
    expected_results: {
      results: [
        { description: '', linkedObjective: 0 }
      ]
    },
    activities: {
      activities: [
        { description: '', startMonth: 1, endMonth: 12, result: 0, responsibleParty: '' }
      ]
    },
    implementation_plan: {
      plan: [
        { description: '', startMonth: 1, endMonth: 12, result: 0 }
      ]
    },
    proposed_budget: {
      programStaff: [
        { position: '', unitCost: 0, quantity: 1, months: 12, total: 0 }
      ],
      activityCosts: [
        { activity: '', description: '', unitCost: 0, quantity: 1, total: 0 }
      ],
      administrativeCosts: [
        { description: '', amount: 0 }
      ],
      overheadPercentage: 7,
      subtotal: 0,
      overhead: 0,
      grandTotal: 0
    },
    co_funding: {
      sources: [
        { donorName: '', description: '', amount: 0, currency: 'USD', status: 'Committed' }
      ],
      totalCoFunding: 0
    },
    crosscutting: {
      gender: '',
      protection: '',
      environment: ''
    },
    coordination: {
      content: ''
    },
    risks: {
      risks: [
        { description: '', probability: 'Medium', impact: 'Medium', mitigation: '' }
      ]
    },
    sustainability: {
      content: ''
    },
    meal: {
      indicators: [
        { description: '', baseline: '', target: '', source: '', frequency: 'Monthly' }
      ]
    },
    capacity: {
      content: ''
    }
  });

  const handleSave = () => {
    console.log('Saving proposal data...', sectionData);
    setHasChanges(false);
    alert('Proposal saved successfully!');
  };

  const handleExportPDF = () => {
    alert('Exporting to PDF...\nGenerating PDF with all sections formatted correctly.');
    setShowExportModal(false);
  };

  const handleExportWord = () => {
    alert('Exporting to Word (.docx)...\nGenerating editable Word document with donor template formatting.');
    setShowExportModal(false);
  };

  const updateSectionData = (section: string, data: any) => {
    setSectionData({ ...sectionData, [section]: data });
    setHasChanges(true);
  };

  const wordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const calculateProgress = () => {
    let completedCount = 0;
    const totalSections = PROPOSAL_SECTIONS.length;

    PROPOSAL_SECTIONS.forEach(section => {
      const data = sectionData[section.key];
      if (!data) return;

      let isComplete = false;

      // Check completion based on section type
      switch (section.key) {
        case 'proposal_summary':
        case 'context':
        case 'needs':
        case 'overall_objective':
        case 'coordination':
        case 'sustainability':
        case 'capacity':
          // Text-based sections: check if content exists and has meaningful text
          isComplete = data.content && data.content.trim().length > 20;
          break;

        case 'target':
          // Check if at least one target group has data
          isComplete = data.targetGroups && data.targetGroups.length > 0 && 
            data.targetGroups.some((group: any) => 
              group.female > 0 || group.male > 0 || group.girls > 0 || group.boys > 0
            );
          break;

        case 'specific_objectives':
          // Check if at least one objective is filled
          isComplete = data.objectives && data.objectives.length > 0 &&
            data.objectives.some((obj: any) => obj.description && obj.description.trim().length > 10);
          break;

        case 'expected_results':
          // Check if at least one result is filled
          isComplete = data.results && data.results.length > 0 &&
            data.results.some((result: any) => result.description && result.description.trim().length > 10);
          break;

        case 'activities':
          // Check if at least one activity is filled
          isComplete = data.activities && data.activities.length > 0 &&
            data.activities.some((activity: any) => activity.description && activity.description.trim().length > 10);
          break;

        case 'implementation_plan':
          // Check if at least one plan item is filled
          isComplete = data.plan && data.plan.length > 0 &&
            data.plan.some((item: any) => item.description && item.description.trim().length > 10);
          break;

        case 'proposed_budget':
          // Check if budget has meaningful data
          isComplete = (data.programStaff && data.programStaff.some((staff: any) => staff.position && staff.position.trim().length > 0)) ||
            (data.activityCosts && data.activityCosts.some((cost: any) => cost.activity && cost.activity.trim().length > 0)) ||
            (data.grandTotal && data.grandTotal > 0);
          break;

        case 'co_funding':
          // Optional section - check if any co-funding source exists
          isComplete = !section.required || (data.sources && data.sources.length > 0 &&
            data.sources.some((source: any) => source.donorName && source.donorName.trim().length > 0));
          break;

        case 'crosscutting':
          // Check if at least gender and protection are filled
          isComplete = (data.gender && data.gender.trim().length > 20) &&
            (data.protection && data.protection.trim().length > 20);
          break;

        case 'risks':
          // Check if at least one risk is documented
          isComplete = data.risks && data.risks.length > 0 &&
            data.risks.some((risk: any) => 
              risk.description && risk.description.trim().length > 10 &&
              risk.mitigation && risk.mitigation.trim().length > 10
            );
          break;

        case 'meal':
          // Check if at least one indicator is defined
          isComplete = data.indicators && data.indicators.length > 0 &&
            data.indicators.some((indicator: any) => 
              indicator.description && indicator.description.trim().length > 10 &&
              indicator.target && indicator.target.trim().length > 0
            );
          break;

        default:
          isComplete = false;
      }

      if (isComplete) {
        completedCount++;
      }
    });

    return Math.round((completedCount / totalSections) * 100);
  };

  const progress = calculateProgress();

  // Check if a specific section is complete
  const isSectionComplete = (sectionKey: string): boolean => {
    const data = sectionData[sectionKey];
    if (!data) return false;

    switch (sectionKey) {
      case 'proposal_summary':
      case 'context':
      case 'needs':
      case 'overall_objective':
      case 'coordination':
      case 'sustainability':
      case 'capacity':
        return data.content && data.content.trim().length > 20;

      case 'target':
        return data.targetGroups && data.targetGroups.length > 0 && 
          data.targetGroups.some((group: any) => 
            group.female > 0 || group.male > 0 || group.girls > 0 || group.boys > 0
          );

      case 'specific_objectives':
        return data.objectives && data.objectives.length > 0 &&
          data.objectives.some((obj: any) => obj.description && obj.description.trim().length > 10);

      case 'expected_results':
        return data.results && data.results.length > 0 &&
          data.results.some((result: any) => result.description && result.description.trim().length > 10);

      case 'activities':
        return data.activities && data.activities.length > 0 &&
          data.activities.some((activity: any) => activity.description && activity.description.trim().length > 10);

      case 'implementation_plan':
        return data.plan && data.plan.length > 0 &&
          data.plan.some((item: any) => item.description && item.description.trim().length > 10);

      case 'proposed_budget':
        return (data.programStaff && data.programStaff.some((staff: any) => staff.position && staff.position.trim().length > 0)) ||
          (data.activityCosts && data.activityCosts.some((cost: any) => cost.activity && cost.activity.trim().length > 0)) ||
          (data.grandTotal && data.grandTotal > 0);

      case 'co_funding':
        return true; // Optional section, always consider complete

      case 'crosscutting':
        return (data.gender && data.gender.trim().length > 20) &&
          (data.protection && data.protection.trim().length > 20);

      case 'risks':
        return data.risks && data.risks.length > 0 &&
          data.risks.some((risk: any) => 
            risk.description && risk.description.trim().length > 10 &&
            risk.mitigation && risk.mitigation.trim().length > 10
          );

      case 'meal':
        return data.indicators && data.indicators.length > 0 &&
          data.indicators.some((indicator: any) => 
            indicator.description && indicator.description.trim().length > 10 &&
            indicator.target && indicator.target.trim().length > 0
          );

      default:
        return false;
    }
  };

  // Render section content based on type
  const renderSectionContent = () => {
    const section = PROPOSAL_SECTIONS.find(s => s.key === activeSection);
    if (!section) return null;

    // Get section index for numbering
    const sectionIndex = PROPOSAL_SECTIONS.findIndex(s => s.key === activeSection);
    const sectionNumber = sectionIndex + 1;
    const translatedTitle = t.sections[section.key as keyof typeof t.sections] || section.title;
    const fullTitle = `${sectionNumber}. ${translatedTitle}`;

    switch (activeSection) {
      case 'proposal_summary':
      case 'context':
      case 'needs':
      case 'overall_objective':
      case 'coordination':
      case 'sustainability':
      case 'capacity':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {fullTitle}
              {section.required && <span className="text-red-600 ms-1">*</span>}
              {section.wordLimit && (
                <span className="text-xs text-gray-500 ms-2">
                  ({t.maxWords} {section.wordLimit} {t.words})
                </span>
              )}
            </label>
            <textarea
              rows={12}
              value={sectionData[activeSection]?.content || ''}
              onChange={(e) => {
                const content = e.target.value;
                const count = wordCount(content);
                updateSectionData(activeSection, { content, wordCount: count });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={t.enterContent}
            />
            <div className={`mt-2 flex items-center justify-between text-xs text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>{t.wordCount}: {sectionData[activeSection]?.wordCount || 0}</span>
              {section.wordLimit && (
                <span className={
                  (sectionData[activeSection]?.wordCount || 0) > section.wordLimit
                    ? 'text-red-600 font-medium'
                    : 'text-gray-500'
                }>
                  {section.wordLimit - (sectionData[activeSection]?.wordCount || 0)} {t.wordsRemaining}
                </span>
              )}
            </div>
          </div>
        );

      case 'target':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.targetPopulation}
              <span className="text-red-600 ms-1">*</span>
            </label>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.type}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.female18}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.male18}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.girls}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.boys}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.pwd}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {(sectionData.target?.targetGroups || []).map((group: any, index: number) => {
                    const total = group.female + group.male + group.girls + group.boys;
                    return (
                      <tr key={index}>
                        <td className="px-3 py-2 border border-gray-300">
                          <select
                            value={group.type}
                            onChange={(e) => {
                              const groups = [...sectionData.target.targetGroups];
                              groups[index].type = e.target.value;
                              updateSectionData('target', { targetGroups: groups });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option>{t.direct}</option>
                            <option>{t.indirect}</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 border border-gray-300">
                          <input
                            type="number"
                            min="0"
                            value={group.female}
                            onChange={(e) => {
                              const groups = [...sectionData.target.targetGroups];
                              groups[index].female = parseInt(e.target.value) || 0;
                              updateSectionData('target', { targetGroups: groups });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 border border-gray-300">
                          <input
                            type="number"
                            min="0"
                            value={group.male}
                            onChange={(e) => {
                              const groups = [...sectionData.target.targetGroups];
                              groups[index].male = parseInt(e.target.value) || 0;
                              updateSectionData('target', { targetGroups: groups });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 border border-gray-300">
                          <input
                            type="number"
                            min="0"
                            value={group.girls}
                            onChange={(e) => {
                              const groups = [...sectionData.target.targetGroups];
                              groups[index].girls = parseInt(e.target.value) || 0;
                              updateSectionData('target', { targetGroups: groups });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 border border-gray-300">
                          <input
                            type="number"
                            min="0"
                            value={group.boys}
                            onChange={(e) => {
                              const groups = [...sectionData.target.targetGroups];
                              groups[index].boys = parseInt(e.target.value) || 0;
                              updateSectionData('target', { targetGroups: groups });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 border border-gray-300">
                          <input
                            type="number"
                            min="0"
                            value={group.pwd}
                            onChange={(e) => {
                              const groups = [...sectionData.target.targetGroups];
                              groups[index].pwd = parseInt(e.target.value) || 0;
                              updateSectionData('target', { targetGroups: groups });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 border border-gray-300 bg-gray-50 font-medium text-sm" dir="ltr">
                          {total.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => {
                const groups = [...(sectionData.target?.targetGroups || []), 
                  { type: 'Direct', female: 0, male: 0, girls: 0, boys: 0, pwd: 0 }
                ];
                updateSectionData('target', { targetGroups: groups });
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              + {t.addRow}
            </button>
          </div>
        );

      case 'specific_objectives':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.specificObjectives}
              <span className="text-red-600 ms-1">*</span>
            </label>
            <div className="space-y-3">
              {(sectionData.specific_objectives?.objectives || []).map((obj: any, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-700 mt-2">SO{index + 1}:</span>
                  <textarea
                    rows={2}
                    value={obj.description}
                    onChange={(e) => {
                      const objectives = [...sectionData.specific_objectives.objectives];
                      objectives[index].description = e.target.value;
                      updateSectionData('specific_objectives', { objectives });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={`${t.enterObjective} ${index + 1}...`}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const objectives = [...(sectionData.specific_objectives?.objectives || []), 
                  { description: '' }
                ];
                updateSectionData('specific_objectives', { objectives });
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              + {t.addObjective}
            </button>
          </div>
        );

      case 'expected_results':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.expectedResults}
              <span className="text-red-600 ms-1">*</span>
            </label>
            <div className="space-y-3">
              {(sectionData.expected_results?.results || []).map((result: any, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-700 mt-2">ER{index + 1}:</span>
                  <textarea
                    rows={2}
                    value={result.description}
                    onChange={(e) => {
                      const results = [...sectionData.expected_results.results];
                      results[index].description = e.target.value;
                      updateSectionData('expected_results', { results });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={`${t.enterResult} ${index + 1}...`}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const results = [...(sectionData.expected_results?.results || []), 
                  { description: '', linkedObjective: 0 }
                ];
                updateSectionData('expected_results', { results });
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              + {t.addResult}
            </button>
          </div>
        );

      case 'crosscutting':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.genderMainstreaming}
                <span className="text-red-600 ms-1">*</span>
              </label>
              <textarea
                rows={4}
                value={sectionData.crosscutting?.gender || ''}
                onChange={(e) => updateSectionData('crosscutting', { 
                  ...sectionData.crosscutting, 
                  gender: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t.genderPlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.protectionMainstreaming}
                <span className="text-red-600 ms-1">*</span>
              </label>
              <textarea
                rows={4}
                value={sectionData.crosscutting?.protection || ''}
                onChange={(e) => updateSectionData('crosscutting', { 
                  ...sectionData.crosscutting, 
                  protection: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t.protectionPlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.environmentalConsiderations}
              </label>
              <textarea
                rows={3}
                value={sectionData.crosscutting?.environment || ''}
                onChange={(e) => updateSectionData('crosscutting', { 
                  ...sectionData.crosscutting, 
                  environment: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t.environmentPlaceholder}
              />
            </div>
          </div>
        );

      case 'risks':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.riskAnalysis}
              <span className="text-red-600 ms-1">*</span>
            </label>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.riskDescription}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.probability}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.impact}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.mitigationMeasures}</th>
                  </tr>
                </thead>
                <tbody>
                  {(sectionData.risks?.risks || []).map((risk: any, index: number) => (
                    <tr key={index}>
                      <td className="px-3 py-2 border border-gray-300">
                        <textarea
                          rows={2}
                          value={risk.description}
                          onChange={(e) => {
                            const risks = [...sectionData.risks.risks];
                            risks[index].description = e.target.value;
                            updateSectionData('risks', { risks });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder={t.describeRisk}
                        />
                      </td>
                      <td className="px-3 py-2 border border-gray-300">
                        <select
                          value={risk.probability}
                          onChange={(e) => {
                            const risks = [...sectionData.risks.risks];
                            risks[index].probability = e.target.value;
                            updateSectionData('risks', { risks });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option>{t.low}</option>
                          <option>{t.medium}</option>
                          <option>{t.high}</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 border border-gray-300">
                        <select
                          value={risk.impact}
                          onChange={(e) => {
                            const risks = [...sectionData.risks.risks];
                            risks[index].impact = e.target.value;
                            updateSectionData('risks', { risks });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option>{t.low}</option>
                          <option>{t.medium}</option>
                          <option>{t.high}</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 border border-gray-300">
                        <textarea
                          rows={2}
                          value={risk.mitigation}
                          onChange={(e) => {
                            const risks = [...sectionData.risks.risks];
                            risks[index].mitigation = e.target.value;
                            updateSectionData('risks', { risks });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder={t.mitigationStrategy}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => {
                const risks = [...(sectionData.risks?.risks || []), 
                  { description: '', probability: 'Medium', impact: 'Medium', mitigation: '' }
                ];
                updateSectionData('risks', { risks });
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              + {t.addRisk}
            </button>
          </div>
        );

      case 'meal':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.mealFramework}
              <span className="text-red-600 ms-1">*</span>
            </label>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.indicator}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.baseline}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.target}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.dataSource}</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.frequency}</th>
                  </tr>
                </thead>
                <tbody>
                  {(sectionData.meal?.indicators || []).map((indicator: any, index: number) => (
                    <tr key={index}>
                      <td className="px-3 py-2 border border-gray-300">
                        <textarea
                          rows={2}
                          value={indicator.description}
                          onChange={(e) => {
                            const indicators = [...sectionData.meal.indicators];
                            indicators[index].description = e.target.value;
                            updateSectionData('meal', { indicators });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder={t.indicatorDescription}
                        />
                      </td>
                      <td className="px-3 py-2 border border-gray-300">
                        <input
                          type="text"
                          value={indicator.baseline}
                          onChange={(e) => {
                            const indicators = [...sectionData.meal.indicators];
                            indicators[index].baseline = e.target.value;
                            updateSectionData('meal', { indicators });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2 border border-gray-300">
                        <input
                          type="text"
                          value={indicator.target}
                          onChange={(e) => {
                            const indicators = [...sectionData.meal.indicators];
                            indicators[index].target = e.target.value;
                            updateSectionData('meal', { indicators });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="100"
                        />
                      </td>
                      <td className="px-3 py-2 border border-gray-300">
                        <input
                          type="text"
                          value={indicator.source}
                          onChange={(e) => {
                            const indicators = [...sectionData.meal.indicators];
                            indicators[index].source = e.target.value;
                            updateSectionData('meal', { indicators });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder={t.monitoringReports}
                        />
                      </td>
                      <td className="px-3 py-2 border border-gray-300">
                        <select
                          value={indicator.frequency}
                          onChange={(e) => {
                            const indicators = [...sectionData.meal.indicators];
                            indicators[index].frequency = e.target.value;
                            updateSectionData('meal', { indicators });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option>{t.monthly}</option>
                          <option>{t.quarterly}</option>
                          <option>{t.semiAnnually}</option>
                          <option>{t.annually}</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => {
                const indicators = [...(sectionData.meal?.indicators || []), 
                  { description: '', baseline: '', target: '', source: '', frequency: 'Monthly' }
                ];
                updateSectionData('meal', { indicators });
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              + {t.addIndicator}
            </button>
          </div>
        );

      case 'proposed_budget':
        return (
          <BudgetSection
            budget={sectionData.proposed_budget}
            updateBudget={(data) => updateSectionData('proposed_budget', data)}
          />
        );

      case 'co_funding':
        return (
          <CoFundingSection
            coFunding={sectionData.co_funding}
            updateCoFunding={(data) => updateSectionData('co_funding', data)}
          />
        );

      case 'activities':
        return (
          <ActivitiesSection
            activities={sectionData.activities}
            expectedResults={sectionData.expected_results}
            updateActivities={(data) => updateSectionData('activities', data)}
          />
        );

      case 'implementation_plan':
        return (
          <ImplementationPlanSection
            plan={sectionData.implementation_plan}
            activities={sectionData.activities}
            projectDuration={proposal.projectDuration || 12}
            projectStartDate={proposal.projectStartDate || '2024-01-01'}
            updatePlan={(data) => updateSectionData('implementation_plan', data)}
          />
        );

      default:
        return (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Section content editor coming soon</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-md"
              title={t.backToList}
            >
              <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{proposal.proposalTitle}</h2>
              <p className="text-xs text-gray-600">
                {proposal.donorName} • {proposal.proposalType} • {progress}% complete
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setShowExportModal(true)}
              className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-4 py-2 text-sm rounded-md flex items-center gap-2 ${
                hasChanges
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Overall Completion</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                progress === 100 ? 'bg-green-500' :
                progress >= 70 ? 'bg-blue-500' :
                progress >= 40 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Section Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{t.proposalSections}</h3>
            <nav className="space-y-1">
              {PROPOSAL_SECTIONS.map((section, index) => {
                const translatedTitle = t.sections[section.key as keyof typeof t.sections] || section.title;
                const displayTitle = `${index + 1}. ${translatedTitle}`;
                const isComplete = isSectionComplete(section.key);
                
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
                      activeSection === section.key
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    } ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="flex-1">{displayTitle}</span>
                      {isComplete && (
                        <CheckCircle className={`w-4 h-4 ${activeSection === section.key ? 'text-white' : 'text-green-500'}`} />
                      )}
                      {section.required && !isComplete && (
                        <span className={`text-xs ${activeSection === section.key ? 'text-white' : 'text-red-500'}`}>*</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {renderSectionContent()}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.exportProposal}</h3>
            <p className="text-sm text-gray-600 mb-6">
              {t.chooseExportFormat}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleExportPDF}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                {t.exportAsPDF}
              </button>
              <button
                onClick={handleExportWord}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                {t.exportAsWord}
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}