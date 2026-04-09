/**
 * Excel template generator for import features
 * Generates downloadable Excel templates with proper headers and sample data
 */

import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Generate Activities import template
 */
export function generateActivitiesTemplate(isRTL: boolean = false) {
 const headers = isRTL
 ? ['اسم النشاط*', 'اسم النشاط (عربي)', 'الوصف', 'الوصف (عربي)', 'تاريخ البدء المخطط*', 'تاريخ الانتهاء المخطط*', 'الحالة*', 'نسبة التقدم', 'الميزانية المخصصة', 'المصروف الفعلي', 'العملة', 'الموقع', 'الموقع (عربي)', 'الشخص المسؤول']
 : ['Activity Name*', 'Activity Name (AR)', 'Description', 'Description (AR)', 'Planned Start Date*', 'Planned End Date*', 'Status*', 'Progress %', 'Budget Allocated', 'Actual Spent', 'Currency', 'Location', 'Location (AR)', 'Responsible Person'];
 
 const sampleData = [
 ['Community Awareness Campaign', 'حملة التوعية المجتمعية', 'Conduct awareness sessions', 'إجراء جلسات توعية', '2026-02-01', '2026-04-30', 'NOT_STARTED', '0', '5000', '0', 'USD', 'Sana\'a', 'صنعاء', 'Ahmed Ali'],
 ['Training Workshops', 'ورش العمل التدريبية', 'Organize skill-building workshops', 'تنظيم ورش بناء المهارات', '2026-03-01', '2026-06-30', 'NOT_STARTED', '0', '8000', '0', 'USD', 'Aden', 'عدن', 'Fatima Hassan'],
 ];
 
 const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, isRTL ? 'الأنشطة' : 'Activities');
 
 const filename = isRTL ? 'قالب_الأنشطة.xlsx' : 'Activities_Template.xlsx';
 XLSX.writeFile(wb, filename);
}

/**
 * Generate Indicators import template
 */
export function generateIndicatorsTemplate(isRTL: boolean = false) {
 const headers = isRTL
 ? ['اسم المؤشر*', 'اسم المؤشر (عربي)', 'الوصف', 'الوصف (عربي)', 'النوع*', 'الفئة', 'الوحدة*', 'القيمة الأساسية', 'الهدف*', 'القيمة المحققة', 'تاريخ الهدف', 'مصدر البيانات', 'طريقة التحقق', 'الحالة']
 : ['Indicator Name*', 'Indicator Name (AR)', 'Description', 'Description (AR)', 'Type*', 'Category', 'Unit*', 'Baseline', 'Target*', 'Achieved Value', 'Target Date', 'Data Source', 'Verification Method', 'Status'];
 
 const sampleData = [
 ['Number of beneficiaries reached', 'عدد المستفيدين', 'Total individuals served', 'إجمالي الأفراد المخدومين', 'OUTPUT', 'Beneficiaries', 'Persons', '0', '500', '0', '2026-12-31', 'Project database', 'Registration records', 'ON_TRACK'],
 ['Satisfaction rate', 'معدل الرضا', 'Beneficiary satisfaction percentage', 'نسبة رضا المستفيدين', 'OUTCOME', 'Quality', 'Percentage', '0', '85', '0', '2026-12-31', 'Survey', 'Feedback forms', 'ON_TRACK'],
 ];
 
 const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, isRTL ? 'المؤشرات' : 'Indicators');
 
 const filename = isRTL ? 'قالب_المؤشرات.xlsx' : 'Indicators_Template.xlsx';
 XLSX.writeFile(wb, filename);
}

/**
 * Generate Beneficiaries import template
 */
export function generateBeneficiariesTemplate(isRTL: boolean = false) {
 const headers = isRTL
 ? ['الاسم الكامل*', 'الاسم الكامل (عربي)', 'الرقم الوطني', 'تاريخ الميلاد', 'الجنس*', 'الفئة العمرية', 'الجنسية', 'رقم الهاتف', 'البريد الإلكتروني', 'المحافظة', 'المديرية', 'القرية', 'العنوان', 'العنوان (عربي)', 'حجم الأسرة', 'المعالون', 'فئة الضعف', 'حالة الإعاقة', 'نوع الإعاقة', 'تاريخ التسجيل*', 'نوع الخدمة', 'حالة الخدمة', 'ملاحظات', 'ملاحظات (عربي)']
 : ['Full Name*', 'Full Name (AR)', 'National ID', 'Date of Birth', 'Gender*', 'Age Group', 'Nationality', 'Phone Number', 'Email', 'Governorate', 'District', 'Village', 'Address', 'Address (AR)', 'Household Size', 'Dependents', 'Vulnerability Category', 'Disability Status', 'Disability Type', 'Registration Date*', 'Service Type', 'Service Status', 'Notes', 'Notes (AR)'];
 
 const sampleData = [
 ['Mohammed Ahmed Ali', 'محمد أحمد علي', '01234567890', '1985-03-15', 'MALE', '36-60', 'Yemeni', '+967771234567', '', 'Sana\'a', 'Al-Wahdah', 'Al-Qa\'a', 'Street 40', 'شارع 40', '6', '4', 'IDP', 'FALSE', '', '2026-01-15', 'Cash Assistance', 'ACTIVE', '', ''],
 ['Fatima Hassan', 'فاطمة حسن', '09876543210', '1992-07-22', 'FEMALE', '18-35', 'Yemeni', '+967773456789', '', 'Aden', 'Crater', 'Al-Mualla', 'Street 12', 'شارع 12', '4', '2', 'Widow', 'FALSE', '', '2026-01-20', 'Livelihood Support', 'ACTIVE', '', ''],
 ];
 
 const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, isRTL ? 'المستفيدون' : 'Beneficiaries');
 
 const filename = isRTL ? 'قالب_المستفيدين.xlsx' : 'Beneficiaries_Template.xlsx';
 XLSX.writeFile(wb, filename);
}

/**
 * Generate Tasks import template
 */
export function generateTasksTemplate(isRTL: boolean = false) {
 const headers = isRTL
 ? ['اسم المهمة*', 'اسم المهمة (عربي)', 'الوصف', 'الوصف (عربي)', 'الحالة*', 'الأولوية*', 'تاريخ الاستحقاق', 'تاريخ البدء', 'تاريخ الإنجاز', 'المكلف به (ID)', 'المكلف به (الاسم)', 'نسبة التقدم', 'الوسوم', 'الفئة']
 : ['Task Name*', 'Task Name (AR)', 'Description', 'Description (AR)', 'Status*', 'Priority*', 'Due Date', 'Start Date', 'Completed Date', 'Assigned To (ID)', 'Assigned To (Name)', 'Progress %', 'Tags', 'Category'];
 
 const sampleData = [
 ['Prepare project proposal', 'إعداد مقترح المشروع', 'Draft and finalize proposal document', 'صياغة ووضع اللمسات الأخيرة على وثيقة المقترح', 'TODO', 'HIGH', '2026-02-15', '', '', '', 'Ahmed Ali', '0', 'planning,documentation', 'Planning'],
 ['Conduct needs assessment', 'إجراء تقييم الاحتياجات', 'Survey target communities', 'مسح المجتمعات المستهدفة', 'TODO', 'URGENT', '2026-02-28', '', '', '', 'Fatima Hassan', '0', 'assessment,fieldwork', 'Research'],
 ];
 
 const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, isRTL ? 'المهام' : 'Tasks');
 
 const filename = isRTL ? 'قالب_المهام.xlsx' : 'Tasks_Template.xlsx';
 XLSX.writeFile(wb, filename);
}

/**
 * Generate Procurement Plan import template
 */
export function generateProcurementTemplate(isRTL: boolean = false) {
 const headers = isRTL
 ? ['اسم الصنف*', 'اسم الصنف (عربي)', 'الوصف', 'الوصف (عربي)', 'الفئة*', 'الفئة الفرعية', 'الكمية*', 'الوحدة*', 'التكلفة المقدرة*', 'التكلفة الفعلية', 'العملة', 'تاريخ الشراء المخطط*', 'تاريخ الشراء الفعلي', 'تاريخ التسليم', 'طريقة الشراء', 'الحالة', 'اسم المورد', 'جهة اتصال المورد', 'بند الميزانية', 'ملاحظات', 'ملاحظات (عربي)']
 : ['Item Name*', 'Item Name (AR)', 'Description', 'Description (AR)', 'Category*', 'Subcategory', 'Quantity*', 'Unit*', 'Estimated Cost*', 'Actual Cost', 'Currency', 'Planned Procurement Date*', 'Actual Procurement Date', 'Delivery Date', 'Procurement Method', 'Status', 'Supplier Name', 'Supplier Contact', 'Budget Line', 'Notes', 'Notes (AR)'];
 
 const sampleData = [
 ['Office Furniture', 'أثاث المكتب', 'Desks and chairs for field office', 'مكاتب وكراسي لمكتب ميداني', 'GOODS', 'Furniture', '10', 'Sets', '5000', '0', 'USD', '2026-03-01', '', '', 'COMPETITIVE_BIDDING', 'PLANNED', '', '', 'Office Setup', '', ''],
 ['Training Materials', 'مواد التدريب', 'Printed manuals and stationery', 'كتيبات مطبوعة وقرطاسية', 'GOODS', 'Stationery', '200', 'Sets', '1500', '0', 'USD', '2026-02-15', '', '', 'DIRECT_PURCHASE', 'PLANNED', '', '', 'Training Budget', '', ''],
 ];
 
 const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, isRTL ? 'خطة المشتريات' : 'Procurement Plan');
 
 const filename = isRTL ? 'قالب_خطة_المشتريات.xlsx' : 'Procurement_Plan_Template.xlsx';
 XLSX.writeFile(wb, filename);
}

/**
 * Generate Financial Overview (Budget Items) import template
 * MUST match FINANCIAL_OVERVIEW_CONFIG column structure exactly
 */
export function generateFinancialOverviewTemplate(isRTL: boolean = false) {
 const headers = isRTL
 ? ['رمز الميزانية*', 'خط الميزانية الفرعي*', 'اسم النشاط*', 'بند الميزانية*', 'الكمية*', 'نوع الوحدة*', 'تكلفة الوحدة*', 'التكرار*', 'العملة*', 'ملاحظات']
 : ['Budget Code*', 'Sub Budget Line*', 'Activity Name*', 'Budget Item*', 'Qty*', 'Unit Type*', 'Unit Cost*', 'Recurrence*', 'Currency*', 'Notes'];
 
 const sampleData = [
 ['BC-001', 'SBL-001', 'Staff Recruitment', 'Project Manager Salary', '1', 'Person', '5000', '12', 'USD', 'Full-time position'],
 ['BC-001', 'SBL-002', 'Staff Recruitment', 'Field Officer Salary', '2', 'Person', '3000', '12', 'USD', 'Two field officers'],
 ['BC-002', 'SBL-003', 'Training Activities', 'Capacity Building Workshop', '5', 'Workshop', '1000', '1', 'USD', 'Quarterly training sessions'],
 ];
 
 const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
 
 // Set column widths for better readability
 ws['!cols'] = [
 { wch: 15 }, // Budget Code
 { wch: 20 }, // Sub Budget Line
 { wch: 30 }, // Activity Name
 { wch: 30 }, // Budget Item
 { wch: 10 }, // Qty
 { wch: 15 }, // Unit Type
 { wch: 12 }, // Unit Cost
 { wch: 12 }, // Recurrence
 { wch: 10 }, // Currency
 { wch: 30 }, // Notes
 ];
 
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, isRTL ? 'بنود الميزانية' : 'Budget Items');
 
 const filename = isRTL ? 'قالب_بنود_الميزانية.xlsx' : 'Budget_Items_Template.xlsx';
 XLSX.writeFile(wb, filename);
}

/**
 * Generate Forecast Plan import template
 */
export function generateForecastPlanTemplate(isRTL: boolean = false) {
 const headers = isRTL
 ? ['بند الميزانية*', 'بند الميزانية (عربي)', 'الوصف', 'الوصف (عربي)', 'الفئة*', 'الفئة الفرعية', 'الكمية*', 'الوحدة*', 'سعر الوحدة*', 'المبلغ الإجمالي*', 'العملة', 'السنة 1 (Q1)*', 'السنة 1 (Q2)*', 'السنة 1 (Q3)*', 'السنة 1 (Q4)*', 'السنة 2 (Q1)', 'السنة 2 (Q2)', 'السنة 2 (Q3)', 'السنة 2 (Q4)', 'ملاحظات', 'ملاحظات (عربي)']
 : ['Budget Line Item*', 'Budget Line Item (AR)', 'Description', 'Description (AR)', 'Category*', 'Subcategory', 'Quantity*', 'Unit*', 'Unit Price*', 'Total Amount*', 'Currency', 'Year 1 (Q1)*', 'Year 1 (Q2)*', 'Year 1 (Q3)*', 'Year 1 (Q4)*', 'Year 2 (Q1)', 'Year 2 (Q2)', 'Year 2 (Q3)', 'Year 2 (Q4)', 'Notes', 'Notes (AR)'];
 
 const sampleData = [
 ['Staff Salaries', 'رواتب الموظفين', 'Project team salaries', 'رواتب فريق المشروع', 'Personnel', 'Salaries', '12', 'Months', '5000', '60000', 'USD', '15000', '15000', '15000', '15000', '', '', '', '', '', ''],
 ['Training Costs', 'تكاليف التدريب', 'Capacity building workshops', 'ورش بناء القدرات', 'Training', 'Workshops', '8', 'Sessions', '1000', '8000', 'USD', '2000', '2000', '2000', '2000', '', '', '', '', '', ''],
 ];
 
 const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, isRTL ? 'خطة التوقعات' : 'Forecast Plan');
 
 const filename = isRTL ? 'قالب_خطة_التوقعات.xlsx' : 'Forecast_Plan_Template.xlsx';
 XLSX.writeFile(wb, filename);
}
