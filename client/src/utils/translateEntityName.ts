/**
 * ============================================================================
 * ENTITY NAME TRANSLATION UTILITY
 * ============================================================================
 * 
 * PURPOSE: Translate common entity names (departments, projects, etc.) from English to Arabic
 * 
 * USAGE:
 * import { translateEntityName } from '@/utils/translateEntityName';
 * const arabicName = translateEntityName('Management', 'ar');
 * 
 * ============================================================================
 */

type Language = 'en' | 'ar';

/**
 * Translation mapping for common entity names
 */
const ENTITY_TRANSLATIONS: Record<string, string> = {
 // Departments
 'Management': 'الإدارة',
 'Finance': 'المالية',
 'Programs': 'البرامج',
 'IT': 'تقنية المعلومات',
 'Procurement': 'المشتريات',
 'HR': 'الموارد البشرية',
 'Human Resources': 'الموارد البشرية',
 'Operations': 'العمليات',
 'Logistics': 'اللوجستيات',
 'MEAL': 'المتابعة والتقييم والمساءلة',
 'Monitoring & Evaluation': 'المتابعة والتقييم',
 'Communications': 'الاتصالات',
 'Marketing': 'التسويق',
 'Legal': 'القانونية',
 'Compliance': 'الامتثال',
 'Security': 'الأمن',
 'Administration': 'الإدارة',
 
 // Projects
 'Project A': 'المشروع أ',
 'Project B': 'المشروع ب',
 'Project C': 'المشروع ج',
 'Project D': 'المشروع د',
 'Project E': 'المشروع هـ',
 'Unassigned': 'غير مخصص',
 'General': 'عام',
 'Default': 'افتراضي',
 
 // Contract Types
 'Full-time': 'دوام كامل',
 'Part-time': 'دوام جزئي',
 'Contract': 'عقد',
 'Consultant': 'استشاري',
 'Volunteer': 'متطوع',
 'Intern': 'متدرب',
 
 // Common Status Values
 'Active': 'نشط',
 'Inactive': 'غير نشط',
 'Pending': 'قيد الانتظار',
 'Approved': 'موافق عليه',
 'Rejected': 'مرفوض',
 'Completed': 'مكتمل',
 'In Progress': 'قيد التنفيذ',
 'Cancelled': 'ملغي',
};

/**
 * Translate an entity name from English to Arabic
 * 
 * @param name - The English name to translate
 * @param language - Target language ('en' or 'ar')
 * @returns Translated name if language is 'ar' and translation exists, otherwise original name
 * 
 * @example
 * translateEntityName('Management', 'ar') // Returns: 'الإدارة'
 * translateEntityName('Management', 'en') // Returns: 'Management'
 * translateEntityName('Unknown Dept', 'ar') // Returns: 'Unknown Dept' (no translation found)
 */
export function translateEntityName(name: string, language: Language): string {
 if (language === 'en') {
 return name;
 }
 
 return ENTITY_TRANSLATIONS[name] || name;
}

/**
 * Translate an array of entity names
 * 
 * @param names - Array of English names to translate
 * @param language - Target language ('en' or 'ar')
 * @returns Array of translated names
 * 
 * @example
 * translateEntityNames(['Management', 'Finance'], 'ar') 
 * // Returns: ['الإدارة', 'المالية']
 */
export function translateEntityNames(names: string[], language: Language): string[] {
 return names.map(name => translateEntityName(name, language));
}
