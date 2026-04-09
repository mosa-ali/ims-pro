/**
 * Case Management Import Configuration
 * Defines validation rules for importing case management data
 */

export interface ImportColumn {
 key: string;
 label: string;
 labelAr: string;
 required: boolean;
 type: 'string' | 'number' | 'date' | 'enum';
 enumValues?: string[];
 maxLength?: number;
 minValue?: number;
 maxValue?: number;
}

export interface ImportConfig {
 moduleName: string;
 moduleNameAr: string;
 columns: ImportColumn[];
}

// Cases List Import Configuration
export const casesImportConfig: ImportConfig = {
 moduleName: 'Cases',
 moduleNameAr: 'الحالات',
 columns: [
 { key: 'beneficiaryCode', label: 'Beneficiary Code', labelAr: 'رمز المستفيد', required: true, type: 'string', maxLength: 50 },
 { key: 'firstName', label: 'First Name', labelAr: 'الاسم الأول', required: false, type: 'string', maxLength: 100 },
 { key: 'lastName', label: 'Last Name', labelAr: 'اسم العائلة', required: false, type: 'string', maxLength: 100 },
 { key: 'dateOfBirth', label: 'Date of Birth', labelAr: 'تاريخ الميلاد', required: false, type: 'date' },
 { key: 'gender', label: 'Gender', labelAr: 'الجنس', required: false, type: 'enum', enumValues: ['male', 'female'] },
 { key: 'nationality', label: 'Nationality', labelAr: 'الجنسية', required: false, type: 'string', maxLength: 100 },
 { key: 'idNumber', label: 'ID Number', labelAr: 'رقم الهوية', required: false, type: 'string', maxLength: 50 },
 { key: 'phoneNumber', label: 'Phone Number', labelAr: 'رقم الهاتف', required: false, type: 'string', maxLength: 20 },
 { key: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', required: false, type: 'string', maxLength: 100 },
 { key: 'address', label: 'Address', labelAr: 'العنوان', required: false, type: 'string', maxLength: 500 },
 { key: 'caseType', label: 'Case Type', labelAr: 'نوع الحالة', required: true, type: 'enum', enumValues: ['pss', 'cp', 'gbv', 'protection'] },
 { key: 'riskLevel', label: 'Risk Level', labelAr: 'مستوى الخطر', required: true, type: 'enum', enumValues: ['high', 'medium', 'low'] },
 { key: 'status', label: 'Status', labelAr: 'الحالة', required: false, type: 'enum', enumValues: ['open', 'ongoing', 'closed'] },
 { key: 'referralSource', label: 'Referral Source', labelAr: 'مصدر الإحالة', required: false, type: 'string', maxLength: 200 },
 { key: 'intakeDate', label: 'Intake Date', labelAr: 'تاريخ الاستقبال', required: false, type: 'date' },
 { key: 'assignedTo', label: 'Assigned To', labelAr: 'المسؤول', required: false, type: 'string', maxLength: 100 },
 { key: 'notes', label: 'Notes', labelAr: 'ملاحظات', required: false, type: 'string', maxLength: 2000 },
 ]
};

// PSS Sessions Import Configuration
export const pssSessionsImportConfig: ImportConfig = {
 moduleName: 'PSS Sessions',
 moduleNameAr: 'جلسات الدعم النفسي',
 columns: [
 { key: 'caseCode', label: 'Case Code', labelAr: 'رمز الحالة', required: true, type: 'string', maxLength: 50 },
 { key: 'sessionDate', label: 'Session Date', labelAr: 'تاريخ الجلسة', required: true, type: 'date' },
 { key: 'sessionType', label: 'Session Type', labelAr: 'نوع الجلسة', required: true, type: 'enum', enumValues: ['individual', 'group', 'family'] },
 { key: 'pssApproach', label: 'PSS Approach', labelAr: 'نهج الدعم النفسي', required: false, type: 'string', maxLength: 200 },
 { key: 'duration', label: 'Duration (minutes)', labelAr: 'المدة (دقائق)', required: false, type: 'number', minValue: 1, maxValue: 480 },
 { key: 'facilitatorName', label: 'Facilitator Name', labelAr: 'اسم الميسر', required: false, type: 'string', maxLength: 100 },
 { key: 'notes', label: 'Notes', labelAr: 'ملاحظات', required: false, type: 'string', maxLength: 2000 },
 ]
};

// Activities Import Configuration
export const activitiesImportConfig: ImportConfig = {
 moduleName: 'Activities',
 moduleNameAr: 'الأنشطة',
 columns: [
 { key: 'caseCode', label: 'Case Code', labelAr: 'رمز الحالة', required: true, type: 'string', maxLength: 50 },
 { key: 'activityType', label: 'Activity Type', labelAr: 'نوع النشاط', required: true, type: 'string', maxLength: 100 },
 { key: 'activityDate', label: 'Activity Date', labelAr: 'تاريخ النشاط', required: true, type: 'date' },
 { key: 'provider', label: 'Provider', labelAr: 'مقدم الخدمة', required: false, type: 'string', maxLength: 200 },
 { key: 'notes', label: 'Notes', labelAr: 'ملاحظات', required: false, type: 'string', maxLength: 2000 },
 ]
};

// Child Safe Spaces Import Configuration
export const safeSpacesImportConfig: ImportConfig = {
 moduleName: 'Child Safe Spaces',
 moduleNameAr: 'المساحات الآمنة للأطفال',
 columns: [
 { key: 'cssName', label: 'CSS Name', labelAr: 'اسم المساحة الآمنة', required: true, type: 'string', maxLength: 200 },
 { key: 'location', label: 'Location', labelAr: 'الموقع', required: true, type: 'string', maxLength: 500 },
 { key: 'capacity', label: 'Capacity', labelAr: 'السعة', required: false, type: 'number', minValue: 1, maxValue: 1000 },
 { key: 'ageGroupsServed', label: 'Age Groups Served', labelAr: 'الفئات العمرية', required: false, type: 'string', maxLength: 100 },
 { key: 'operatingHours', label: 'Operating Hours', labelAr: 'ساعات العمل', required: false, type: 'string', maxLength: 100 },
 { key: 'contactPerson', label: 'Contact Person', labelAr: 'شخص الاتصال', required: false, type: 'string', maxLength: 100 },
 { key: 'contactPhone', label: 'Contact Phone', labelAr: 'هاتف الاتصال', required: false, type: 'string', maxLength: 20 },
 { key: 'notes', label: 'Notes', labelAr: 'ملاحظات', required: false, type: 'string', maxLength: 2000 },
 ]
};

// Referrals Import Configuration
export const referralsImportConfig: ImportConfig = {
 moduleName: 'Referrals',
 moduleNameAr: 'الإحالات',
 columns: [
 { key: 'caseCode', label: 'Case Code', labelAr: 'رمز الحالة', required: true, type: 'string', maxLength: 50 },
 { key: 'referralDate', label: 'Referral Date', labelAr: 'تاريخ الإحالة', required: true, type: 'date' },
 { key: 'referralType', label: 'Referral Type', labelAr: 'نوع الإحالة', required: true, type: 'enum', enumValues: ['internal', 'external'] },
 { key: 'serviceType', label: 'Service Type', labelAr: 'نوع الخدمة', required: true, type: 'string', maxLength: 200 },
 { key: 'referredToOrganization', label: 'Referred To Organization', labelAr: 'المنظمة المحال إليها', required: false, type: 'string', maxLength: 200 },
 { key: 'referredToContact', label: 'Referred To Contact', labelAr: 'جهة الاتصال', required: false, type: 'string', maxLength: 100 },
 { key: 'status', label: 'Status', labelAr: 'الحالة', required: false, type: 'enum', enumValues: ['pending', 'in_progress', 'completed', 'cancelled'] },
 { key: 'notes', label: 'Notes', labelAr: 'ملاحظات', required: false, type: 'string', maxLength: 2000 },
 ]
};

// Validation function
export function validateImportRow(
 row: Record<string, any>,
 rowNumber: number,
 config: ImportConfig,
 isRTL: boolean
): { isValid: boolean; errors: Array<{ row: number; field: string; value: any; errorType: string; message: string; suggestedFix?: string; originalData: Record<string, any> }> } {
 const errors: Array<{ row: number; field: string; value: any; errorType: string; message: string; suggestedFix?: string; originalData: Record<string, any> }> = [];

 for (const col of config.columns) {
 const value = row[col.key];
 const fieldLabel = isRTL ? col.labelAr : col.label;

 // Required field check
 if (col.required && (value === undefined || value === null || value === '')) {
 errors.push({
 row: rowNumber,
 field: fieldLabel,
 value: value,
 errorType: 'required',
 message: isRTL ? `الحقل "${fieldLabel}" مطلوب` : `Field "${fieldLabel}" is required`,
 suggestedFix: isRTL ? `أدخل قيمة صالحة للحقل "${fieldLabel}"` : `Enter a valid value for "${fieldLabel}"`,
 originalData: row
 });
 continue;
 }

 // Skip validation for empty optional fields
 if (value === undefined || value === null || value === '') continue;

 // Type validation
 switch (col.type) {
 case 'number':
 const numValue = Number(value);
 if (isNaN(numValue)) {
 errors.push({
 row: rowNumber,
 field: fieldLabel,
 value: value,
 errorType: 'type',
 message: isRTL ? `الحقل "${fieldLabel}" يجب أن يكون رقماً` : `Field "${fieldLabel}" must be a number`,
 suggestedFix: isRTL ? 'أدخل قيمة رقمية صالحة' : 'Enter a valid numeric value',
 originalData: row
 });
 } else {
 if (col.minValue !== undefined && numValue < col.minValue) {
 errors.push({
 row: rowNumber,
 field: fieldLabel,
 value: value,
 errorType: 'range',
 message: isRTL ? `الحقل "${fieldLabel}" يجب أن يكون أكبر من أو يساوي ${col.minValue}` : `Field "${fieldLabel}" must be >= ${col.minValue}`,
 suggestedFix: isRTL ? `أدخل قيمة أكبر من أو تساوي ${col.minValue}` : `Enter a value >= ${col.minValue}`,
 originalData: row
 });
 }
 if (col.maxValue !== undefined && numValue > col.maxValue) {
 errors.push({
 row: rowNumber,
 field: fieldLabel,
 value: value,
 errorType: 'range',
 message: isRTL ? `الحقل "${fieldLabel}" يجب أن يكون أقل من أو يساوي ${col.maxValue}` : `Field "${fieldLabel}" must be <= ${col.maxValue}`,
 suggestedFix: isRTL ? `أدخل قيمة أقل من أو تساوي ${col.maxValue}` : `Enter a value <= ${col.maxValue}`,
 originalData: row
 });
 }
 }
 break;

 case 'date':
 const dateValue = new Date(value);
 if (isNaN(dateValue.getTime())) {
 errors.push({
 row: rowNumber,
 field: fieldLabel,
 value: value,
 errorType: 'type',
 message: isRTL ? `الحقل "${fieldLabel}" يجب أن يكون تاريخاً صالحاً` : `Field "${fieldLabel}" must be a valid date`,
 suggestedFix: isRTL ? 'أدخل تاريخاً بصيغة YYYY-MM-DD' : 'Enter a date in YYYY-MM-DD format',
 originalData: row
 });
 }
 break;

 case 'enum':
 if (col.enumValues && !col.enumValues.includes(value.toString().toLowerCase())) {
 errors.push({
 row: rowNumber,
 field: fieldLabel,
 value: value,
 errorType: 'enum',
 message: isRTL 
 ? `الحقل "${fieldLabel}" يجب أن يكون أحد القيم: ${col.enumValues.join(', ')}` 
 : `Field "${fieldLabel}" must be one of: ${col.enumValues.join(', ')}`,
 suggestedFix: isRTL 
 ? `اختر قيمة من: ${col.enumValues.join(', ')}` 
 : `Choose from: ${col.enumValues.join(', ')}`,
 originalData: row
 });
 }
 break;

 case 'string':
 if (col.maxLength && value.toString().length > col.maxLength) {
 errors.push({
 row: rowNumber,
 field: fieldLabel,
 value: value,
 errorType: 'length',
 message: isRTL 
 ? `الحقل "${fieldLabel}" يجب ألا يتجاوز ${col.maxLength} حرفاً` 
 : `Field "${fieldLabel}" must not exceed ${col.maxLength} characters`,
 suggestedFix: isRTL 
 ? `قصّر النص إلى ${col.maxLength} حرفاً أو أقل` 
 : `Shorten the text to ${col.maxLength} characters or less`,
 originalData: row
 });
 }
 break;
 }
 }

 return { isValid: errors.length === 0, errors };
}

// Parse Excel data to rows
export function parseExcelToRows(
 data: any[][],
 config: ImportConfig
): Record<string, any>[] {
 if (data.length < 2) return []; // Need at least header + 1 data row

 const headers = data[0].map(h => h?.toString().trim().toLowerCase());
 const rows: Record<string, any>[] = [];

 // Map headers to column keys
 const headerToKey: Record<string, string> = {};
 for (const col of config.columns) {
 const headerIndex = headers.findIndex(h => 
 h === col.key.toLowerCase() || 
 h === col.label.toLowerCase() ||
 h === col.labelAr
 );
 if (headerIndex !== -1) {
 headerToKey[headerIndex] = col.key;
 }
 }

 // Parse data rows
 for (let i = 1; i < data.length; i++) {
 const rowData = data[i];
 const row: Record<string, any> = {};
 
 for (const [index, key] of Object.entries(headerToKey)) {
 row[key] = rowData[parseInt(index)];
 }
 
 // Skip completely empty rows
 if (Object.values(row).every(v => v === undefined || v === null || v === '')) {
 continue;
 }
 
 rows.push(row);
 }

 return rows;
}
