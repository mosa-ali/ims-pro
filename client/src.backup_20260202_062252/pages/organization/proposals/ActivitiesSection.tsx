import { Download, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActivitiesSectionProps {
  activities: any;
  expectedResults: any;
  updateActivities: (data: any) => void;
}

export function ActivitiesSection({ activities, expectedResults, updateActivities }: ActivitiesSectionProps) {
  const { isRTL } = useLanguage();

  const handleExportExcel = () => {
    alert('Exporting Expected Results and Activities to Excel...');
  };

  const handleImportExcel = () => {
    alert('Import Expected Results and Activities from Excel... (File picker would open here)');
  };

  const t = {
    title: isRTL ? 'النتائج المتوقعة والأنشطة' : 'Expected Results and Activities',
    expectedResults: isRTL ? 'النتائج المتوقعة' : 'Expected Results',
    activities: isRTL ? 'الأنشطة' : 'Activities',
    resultNumber: isRTL ? 'رقم النتيجة' : 'Result #',
    resultDescription: isRTL ? 'وصف النتيجة' : 'Result Description',
    linkedObjective: isRTL ? 'الهدف المرتبط' : 'Linked Objective',
    addResult: isRTL ? 'إضافة نتيجة' : 'Add Result',
    activityNumber: isRTL ? 'رقم النشاط' : 'Activity #',
    activityDescription: isRTL ? 'وصف النشاط' : 'Activity Description',
    linkedResult: isRTL ? 'النتيجة المرتبطة' : 'Linked Result',
    startMonth: isRTL ? 'شهر البداية' : 'Start Month',
    endMonth: isRTL ? 'شهر النهاية' : 'End Month',
    responsibleParty: isRTL ? 'الجهة المسؤولة' : 'Responsible Party',
    addActivity: isRTL ? 'إضافة نشاط' : 'Add Activity',
    import: isRTL ? 'استيراد من Excel' : 'Import from Excel',
    export: isRTL ? 'تصدير إلى Excel' : 'Export to Excel'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {t.title}
          <span className="text-red-600 ms-1">*</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleImportExcel}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            {t.import}
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            {t.export}
          </button>
        </div>
      </div>

      {/* Expected Results */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.expectedResults}</h4>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-24">{t.resultNumber}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.resultDescription}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-40">{t.linkedObjective}</th>
              </tr>
            </thead>
            <tbody>
              {(expectedResults?.results || []).map((result: any, index: number) => (
                <tr key={index}>
                  <td className="px-3 py-2 border border-gray-300 text-center font-medium bg-gray-50">
                    R{index + 1}
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <textarea
                      rows={3}
                      value={result.description}
                      onChange={(e) => {
                        const results = [...expectedResults.results];
                        results[index].description = e.target.value;
                        updateActivities({ ...activities, expectedResults: { results } });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Describe the expected result..."
                    />
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <select
                      value={result.linkedObjective}
                      onChange={(e) => {
                        const results = [...expectedResults.results];
                        results[index].linkedObjective = parseInt(e.target.value);
                        updateActivities({ ...activities, expectedResults: { results } });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={0}>Select Objective</option>
                      <option value={1}>SO1</option>
                      <option value={2}>SO2</option>
                      <option value={3}>SO3</option>
                      <option value={4}>SO4</option>
                      <option value={5}>SO5</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => {
            const results = [...(expectedResults?.results || []), 
              { description: '', linkedObjective: 0 }
            ];
            updateActivities({ ...activities, expectedResults: { results } });
          }}
          className="mt-2 text-sm text-primary hover:underline"
        >
          + {t.addResult}
        </button>
      </div>

      {/* Activities */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.activities}</h4>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-24">{t.activityNumber}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.activityDescription}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-32">{t.linkedResult}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-28">{t.startMonth}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-28">{t.endMonth}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-40">{t.responsibleParty}</th>
              </tr>
            </thead>
            <tbody>
              {(activities?.activities || []).map((activity: any, index: number) => (
                <tr key={index}>
                  <td className="px-3 py-2 border border-gray-300 text-center font-medium bg-gray-50">
                    A{index + 1}
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <textarea
                      rows={2}
                      value={activity.description}
                      onChange={(e) => {
                        const activities_list = [...activities.activities];
                        activities_list[index].description = e.target.value;
                        updateActivities({ ...activities, activities: activities_list });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Describe the activity..."
                    />
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <select
                      value={activity.result}
                      onChange={(e) => {
                        const activities_list = [...activities.activities];
                        activities_list[index].result = parseInt(e.target.value);
                        updateActivities({ ...activities, activities: activities_list });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={0}>Select</option>
                      {(expectedResults?.results || []).map((_: any, idx: number) => (
                        <option key={idx} value={idx + 1}>R{idx + 1}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={activity.startMonth}
                      onChange={(e) => {
                        const activities_list = [...activities.activities];
                        activities_list[index].startMonth = parseInt(e.target.value) || 1;
                        updateActivities({ ...activities, activities: activities_list });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={activity.endMonth}
                      onChange={(e) => {
                        const activities_list = [...activities.activities];
                        activities_list[index].endMonth = parseInt(e.target.value) || 12;
                        updateActivities({ ...activities, activities: activities_list });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <input
                      type="text"
                      value={activity.responsibleParty || ''}
                      onChange={(e) => {
                        const activities_list = [...activities.activities];
                        activities_list[index].responsibleParty = e.target.value;
                        updateActivities({ ...activities, activities: activities_list });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Team/Person"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => {
            const activities_list = [...(activities?.activities || []), 
              { description: '', startMonth: 1, endMonth: 12, result: 0, responsibleParty: '' }
            ];
            updateActivities({ ...activities, activities: activities_list });
          }}
          className="mt-2 text-sm text-primary hover:underline"
        >
          + {t.addActivity}
        </button>
      </div>
    </div>
  );
}

interface ImplementationPlanProps {
  plan: any;
  activities: any;
  projectDuration: number;
  projectStartDate: string;
  updatePlan: (data: any) => void;
}

export function ImplementationPlanSection({ plan, activities, projectDuration, projectStartDate, updatePlan }: ImplementationPlanProps) {
  const { isRTL } = useLanguage();

  const handleExportExcel = () => {
    alert('Exporting Implementation Plan to Excel...');
  };

  const handleImportExcel = () => {
    alert('Import Implementation Plan from Excel... (File picker would open here)');
  };

  const handleAutoGeneratePlan = () => {
    if (!activities?.activities || activities.activities.length === 0) {
      alert('Please add activities first in the "Expected Results and Activities" section.');
      return;
    }

    // Auto-generate plan from activities
    const generatedPlan = activities.activities.map((activity: any, index: number) => ({
      activityLabel: `A${index + 1}`,
      activityName: activity.description,
      linkedResult: activity.result,
      startMonth: activity.startMonth,
      endMonth: activity.endMonth,
      responsibleParty: activity.responsibleParty || '',
      status: 'Not Started'
    }));

    updatePlan({ ...plan, planItems: generatedPlan });
    alert(`Implementation plan auto-generated from ${activities.activities.length} activities!`);
  };

  const t = {
    title: isRTL ? 'خطة التنفيذ' : 'Implementation Plan',
    subtitle: isRTL 
      ? 'يتم إنشاء خطة التنفيذ تلقائياً من الأنشطة وتعكس جدول المشروع الزمني'
      : 'Implementation plan auto-syncs with activities and reflects project timeline',
    autoGenerate: isRTL ? 'إنشاء تلقائي من الأنشطة' : 'Auto-Generate from Activities',
    projectDuration: isRTL ? 'مدة المشروع' : 'Project Duration',
    months: isRTL ? 'أشهر' : 'months',
    startDate: isRTL ? 'تاريخ البدء' : 'Start Date',
    activity: isRTL ? 'النشاط' : 'Activity',
    activityName: isRTL ? 'اسم النشاط' : 'Activity Name',
    linkedResult: isRTL ? 'النتيجة المرتبطة' : 'Linked Result',
    timeline: isRTL ? 'الجدول الزمني' : 'Timeline',
    startMonth: isRTL ? 'شهر البداي��' : 'Start Month',
    endMonth: isRTL ? 'شهر النهاية' : 'End Month',
    responsibleParty: isRTL ? 'الجهة المسؤولة' : 'Responsible Party',
    status: isRTL ? 'الحالة' : 'Status',
    addPlanItem: isRTL ? 'إضافة عنصر' : 'Add Plan Item',
    import: isRTL ? 'استيراد من Excel' : 'Import from Excel',
    export: isRTL ? 'تصدير إلى Excel' : 'Export to Excel'
  };

  // Generate month headers based on project duration
  const monthHeaders = Array.from({ length: projectDuration }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.title}
            <span className="text-red-600 ms-1">*</span>
          </label>
          <p className="text-xs text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoGeneratePlan}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1"
          >
            {t.autoGenerate}
          </button>
          <button
            onClick={handleImportExcel}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            {t.import}
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            {t.export}
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">{t.projectDuration}:</span>
          <span className="ms-2 text-gray-900 font-semibold">{projectDuration} {t.months}</span>
        </div>
        <div className="border-l border-blue-300 pl-4">
          <span className="font-medium text-gray-700">{t.startDate}:</span>
          <span className="ms-2 text-gray-900">{projectStartDate || 'Not Set'}</span>
        </div>
      </div>

      {/* Implementation Plan Table */}
      <div>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-20">{t.activity}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.activityName}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-24">{t.linkedResult}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-24">{t.startMonth}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-24">{t.endMonth}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-32">{t.responsibleParty}</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 w-28">{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {(plan?.planItems || []).map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-3 py-2 border border-gray-300 text-center font-medium bg-gray-50">
                    {item.activityLabel || `P${index + 1}`}
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <textarea
                      rows={2}
                      value={item.activityName}
                      onChange={(e) => {
                        const planItems = [...plan.planItems];
                        planItems[index].activityName = e.target.value;
                        updatePlan({ ...plan, planItems });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Activity/Milestone name..."
                    />
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <select
                      value={item.linkedResult}
                      onChange={(e) => {
                        const planItems = [...plan.planItems];
                        planItems[index].linkedResult = parseInt(e.target.value);
                        updatePlan({ ...plan, planItems });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={0}>-</option>
                      <option value={1}>R1</option>
                      <option value={2}>R2</option>
                      <option value={3}>R3</option>
                      <option value={4}>R4</option>
                      <option value={5}>R5</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <input
                      type="number"
                      min="1"
                      max={projectDuration}
                      value={item.startMonth}
                      onChange={(e) => {
                        const planItems = [...plan.planItems];
                        planItems[index].startMonth = parseInt(e.target.value) || 1;
                        updatePlan({ ...plan, planItems });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <input
                      type="number"
                      min="1"
                      max={projectDuration}
                      value={item.endMonth}
                      onChange={(e) => {
                        const planItems = [...plan.planItems];
                        planItems[index].endMonth = parseInt(e.target.value) || projectDuration;
                        updatePlan({ ...plan, planItems });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <input
                      type="text"
                      value={item.responsibleParty}
                      onChange={(e) => {
                        const planItems = [...plan.planItems];
                        planItems[index].responsibleParty = e.target.value;
                        updatePlan({ ...plan, planItems });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Team/Person"
                    />
                  </td>
                  <td className="px-3 py-2 border border-gray-300">
                    <select
                      value={item.status}
                      onChange={(e) => {
                        const planItems = [...plan.planItems];
                        planItems[index].status = e.target.value;
                        updatePlan({ ...plan, planItems });
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option>Not Started</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                      <option>Delayed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => {
            const planItems = [...(plan?.planItems || []), 
              { activityLabel: `P${(plan?.planItems?.length || 0) + 1}`, activityName: '', linkedResult: 0, startMonth: 1, endMonth: projectDuration, responsibleParty: '', status: 'Not Started' }
            ];
            updatePlan({ ...plan, planItems });
          }}
          className="mt-2 text-sm text-primary hover:underline"
        >
          + {t.addPlanItem}
        </button>
      </div>

      {/* Gantt-style Timeline Visualization */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.timeline}</h4>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-xs font-semibold text-gray-700 border border-gray-300 sticky left-0 bg-gray-50 z-10">{t.activity}</th>
                {monthHeaders.map((month) => (
                  <th key={month} className="px-2 py-1 text-xs font-semibold text-gray-700 border border-gray-300">
                    M{month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(plan?.planItems || []).map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-2 py-1 border border-gray-300 font-medium text-xs sticky left-0 bg-white z-10">
                    {item.activityLabel || `P${index + 1}`}
                  </td>
                  {monthHeaders.map((month) => {
                    const isActive = month >= item.startMonth && month <= item.endMonth;
                    return (
                      <td 
                        key={month} 
                        className={`border border-gray-300 ${isActive ? 'bg-blue-500' : 'bg-white'}`}
                      >
                        <div className="h-4"></div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}