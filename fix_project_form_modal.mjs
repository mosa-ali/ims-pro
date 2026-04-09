import { readFileSync, writeFileSync } from 'fs';

const filePath = 'client/src/i18n/translations.ts';
let content = readFileSync(filePath, 'utf8');

// 1. Add projectFormModal to the Translations interface (before the closing `}` of the interface)
const interfaceEnd = `      planDurationMismatch: string;
      timelineNotBound: string;
      bindTimeline: string;
      uiCore: string;
      security: string;
      projectPlan: string;
    };
  };
}`;

const interfaceEndWithProjectFormModal = `      planDurationMismatch: string;
      timelineNotBound: string;
      bindTimeline: string;
      uiCore: string;
      security: string;
      projectPlan: string;
    };
  };
  projectFormModal: {
    active: string;
    budgetPositive: string;
    cancel: string;
    cancelled: string;
    codeRequired: string;
    completed: string;
    createNewProject: string;
    createProject: string;
    currency: string;
    descriptionPlaceholder: string;
    donor: string;
    donorPlaceholder: string;
    editProject: string;
    endDate: string;
    endDateAfterStart: string;
    endDateRequired: string;
    implementingPartner: string;
    location: string;
    locationPlaceholder: string;
    onHold: string;
    partnerPlaceholder: string;
    planning: string;
    projectCode: string;
    projectCodePlaceholder: string;
    projectFormDescription: string;
    projectTitle: string;
    projectTitlePlaceholder: string;
    required: string;
    saving: string;
    sectors: string;
    sectorsRequired: string;
    startDate: string;
    startDateRequired: string;
    status: string;
    titleRequired: string;
    totalBudget: string;
    updateProject: string;
  };
}`;

if (!content.includes('projectFormModal: {')) {
  content = content.replace(interfaceEnd, interfaceEndWithProjectFormModal);
  console.log('✅ Added projectFormModal to Translations interface');
} else {
  console.log('ℹ️ projectFormModal already in interface - checking if at top level...');
}

// 2. Add projectFormModal as top-level key in EN translations (before the closing `};` of EN)
const enEnd = `      bindTimeline: 'Bind timeline generator to project start/end',
      uiCore: 'UI Core',
      security: 'Security',
      projectPlan: 'Project Plan',
    },
  },
  };`;

const enEndWithProjectFormModal = `      bindTimeline: 'Bind timeline generator to project start/end',
      uiCore: 'UI Core',
      security: 'Security',
      projectPlan: 'Project Plan',
    },
  },
  projectFormModal: {
    active: 'Active',
    budgetPositive: 'Budget must be positive',
    cancel: 'Cancel',
    cancelled: 'Cancelled',
    codeRequired: 'Project code is required',
    completed: 'Completed',
    createNewProject: 'Create New Project',
    createProject: 'Create Project',
    currency: 'Currency',
    descriptionPlaceholder: 'Enter project description',
    donor: 'Donor',
    donorPlaceholder: 'e.g., UEFA Foundation',
    editProject: 'Edit Project',
    endDate: 'End Date',
    endDateAfterStart: 'End date must be after start date',
    endDateRequired: 'End date is required',
    implementingPartner: 'Implementing Partner',
    location: 'Location',
    locationPlaceholder: "e.g., Sana'a",
    onHold: 'On Hold',
    partnerPlaceholder: 'e.g., Local NGO',
    planning: 'Planning',
    projectCode: 'Project Code',
    projectCodePlaceholder: 'e.g., UEFA-FOUND-001',
    projectFormDescription: 'Description',
    projectTitle: 'Project Title',
    projectTitlePlaceholder: 'Enter project title',
    required: '*',
    saving: 'Saving...',
    sectors: 'Sectors',
    sectorsRequired: 'At least one sector is required',
    startDate: 'Start Date',
    startDateRequired: 'Start date is required',
    status: 'Status',
    titleRequired: 'Project title is required',
    totalBudget: 'Total Budget',
    updateProject: 'Update Project',
  },
  };`;

content = content.replace(enEnd, enEndWithProjectFormModal);
console.log('✅ Added projectFormModal to EN translations');

// 3. Find the end of AR translations and add projectFormModal there too
// AR object ends with `};` at the very end of the file
const arEnd = content.lastIndexOf('\n};');
if (arEnd !== -1) {
  const arProjectFormModal = `
  projectFormModal: {
    active: 'نشط',
    budgetPositive: 'يجب أن تكون الميزانية موجبة',
    cancel: 'إلغاء',
    cancelled: 'ملغي',
    codeRequired: 'رمز المشروع مطلوب',
    completed: 'مكتمل',
    createNewProject: 'إنشاء مشروع جديد',
    createProject: 'إنشاء المشروع',
    currency: 'العملة',
    descriptionPlaceholder: 'أدخل وصف المشروع',
    donor: 'المانح',
    donorPlaceholder: 'مثال: مؤسسة يويفا',
    editProject: 'تعديل المشروع',
    endDate: 'تاريخ الانتهاء',
    endDateAfterStart: 'يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء',
    endDateRequired: 'تاريخ الانتهاء مطلوب',
    implementingPartner: 'الشريك المنفذ',
    location: 'الموقع',
    locationPlaceholder: 'مثال: صنعاء، اليمن',
    onHold: 'معلق',
    partnerPlaceholder: 'مثال: منظمة محلية',
    planning: 'تخطيط',
    projectCode: 'رمز المشروع',
    projectCodePlaceholder: 'مثال: UEFA-FOUND-001',
    projectFormDescription: 'الوصف',
    projectTitle: 'عنوان المشروع',
    projectTitlePlaceholder: 'أدخل عنوان المشروع',
    required: '*',
    saving: 'جاري الحفظ...',
    sectors: 'القطاعات',
    sectorsRequired: 'يجب اختيار قطاع واحد على الأقل',
    startDate: 'تاريخ البدء',
    startDateRequired: 'تاريخ البدء مطلوب',
    status: 'الحالة',
    titleRequired: 'عنوان المشروع مطلوب',
    totalBudget: 'إجمالي الميزانية',
    updateProject: 'تحديث المشروع',
  },
};`;
  content = content.substring(0, arEnd) + '\n' + arProjectFormModal;
  console.log('✅ Added projectFormModal to AR translations');
}

writeFileSync(filePath, content, 'utf8');
console.log('✅ Done! translations.ts updated successfully');
