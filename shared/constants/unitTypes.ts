/**
 * Global Unit Types Constant
 * 
 * Pattern: Similar to GLOBAL_CURRENCIES in BudgetInformationSection.tsx
 * 
 * These are standardized unit types used across all IMS modules:
 * - Logistics (goods, measurements)
 * - HR (personnel, time-based)
 * - Procurement (quantities, services)
 * - Finance (units for budgeting)
 * - Projects (deliverables, resources)
 * - NGO Operations (beneficiaries, activities)
 * 
 * Usage:
 * ```typescript
 * import { GLOBAL_UNIT_TYPES } from '@/shared/constants/unitTypes';
 * import { buildLocalizedOptions } from '@/lib/masterDataHelpers';
 * 
 * const options = buildLocalizedOptions(GLOBAL_UNIT_TYPES, isRTL, language);
 * ```
 */

import { MasterDataValue } from '@/lib/masterDataHelpers';

export const GLOBAL_UNIT_TYPES: MasterDataValue[] = [
  // ============================================================================
  // GOODS CATEGORY (Physical Items - 11 units)
  // ============================================================================
  {
    id: 1,
    value: 'piece',
    label: 'Piece',
    labelAr: 'قطعة',
    category: 'goods',
    description: 'Individual item or unit',
    descriptionAr: 'عنصر فردي أو وحدة',
    active: true,
    sortOrder: 1,
  },
  {
    id: 2,
    value: 'box',
    label: 'Box',
    labelAr: 'صندوق',
    category: 'goods',
    description: 'Boxed container',
    descriptionAr: 'حاوية معبأة',
    active: true,
    sortOrder: 2,
  },
  {
    id: 3,
    value: 'carton',
    label: 'Carton',
    labelAr: 'كرتون',
    category: 'goods',
    description: 'Cardboard container',
    descriptionAr: 'حاوية من الورق المقوى',
    active: true,
    sortOrder: 3,
  },
  {
    id: 4,
    value: 'pack',
    label: 'Pack',
    labelAr: 'عبوة',
    category: 'goods',
    description: 'Packaged set of items',
    descriptionAr: 'مجموعة معبأة من العناصر',
    active: true,
    sortOrder: 4,
  },
  {
    id: 5,
    value: 'set',
    label: 'Set',
    labelAr: 'مجموعة',
    category: 'goods',
    description: 'Collection of related items',
    descriptionAr: 'مجموعة من العناصر ذات الصلة',
    active: true,
    sortOrder: 5,
  },
  {
    id: 6,
    value: 'kg',
    label: 'Kg',
    labelAr: 'كيلوغرام',
    category: 'goods',
    description: 'Kilogram weight',
    descriptionAr: 'وزن بالكيلوغرام',
    active: true,
    sortOrder: 6,
  },
  {
    id: 7,
    value: 'ton',
    label: 'Ton',
    labelAr: 'طن',
    category: 'goods',
    description: 'Metric ton',
    descriptionAr: 'طن متري',
    active: true,
    sortOrder: 7,
  },
  {
    id: 8,
    value: 'liter',
    label: 'Liter',
    labelAr: 'لتر',
    category: 'goods',
    description: 'Liter volume',
    descriptionAr: 'حجم باللتر',
    active: true,
    sortOrder: 8,
  },
  {
    id: 9,
    value: 'meter',
    label: 'Meter',
    labelAr: 'متر',
    category: 'goods',
    description: 'Meter length',
    descriptionAr: 'طول بالمتر',
    active: true,
    sortOrder: 9,
  },
  {
    id: 10,
    value: 'square_meter',
    label: 'Square Meter',
    labelAr: 'متر مربع',
    category: 'goods',
    description: 'Square meter area',
    descriptionAr: 'مساحة بالمتر المربع',
    active: true,
    sortOrder: 10,
  },
  {
    id: 11,
    value: 'cubic_meter',
    label: 'Cubic Meter',
    labelAr: 'متر مكعب',
    category: 'goods',
    description: 'Cubic meter volume',
    descriptionAr: 'حجم بالمتر المكعب',
    active: true,
    sortOrder: 11,
  },

  // ============================================================================
  // TIME-BASED CATEGORY (Duration/Time Units - 4 units)
  // ============================================================================
  {
    id: 12,
    value: 'day',
    label: 'Day',
    labelAr: 'يوم',
    category: 'time_based',
    description: 'Single day',
    descriptionAr: 'يوم واحد',
    active: true,
    sortOrder: 1,
  },
  {
    id: 13,
    value: 'month',
    label: 'Month',
    labelAr: 'شهر',
    category: 'time_based',
    description: 'Calendar month',
    descriptionAr: 'شهر تقويمي',
    active: true,
    sortOrder: 2,
  },
  {
    id: 14,
    value: 'hour',
    label: 'Hour',
    labelAr: 'ساعة',
    category: 'time_based',
    description: 'Single hour',
    descriptionAr: 'ساعة واحدة',
    active: true,
    sortOrder: 3,
  },
  {
    id: 15,
    value: 'year',
    label: 'Year',
    labelAr: 'سنة',
    category: 'time_based',
    description: 'Calendar year',
    descriptionAr: 'سنة تقويمية',
    active: true,
    sortOrder: 4,
  },

  // ============================================================================
  // PROGRAMMATIC CATEGORY (Services/Activities - 17 units)
  // ============================================================================
  {
    id: 16,
    value: 'person',
    label: 'Person',
    labelAr: 'شخص',
    category: 'programmatic',
    description: 'Individual person',
    descriptionAr: 'شخص واحد',
    active: true,
    sortOrder: 1,
  },
  {
    id: 17,
    value: 'beneficiary',
    label: 'Beneficiary',
    labelAr: 'مستفيد',
    category: 'programmatic',
    description: 'Program beneficiary',
    descriptionAr: 'مستفيد من البرنامج',
    active: true,
    sortOrder: 2,
  },
  {
    id: 18,
    value: 'participant',
    label: 'Participant',
    labelAr: 'مشارك',
    category: 'programmatic',
    description: 'Training or event participant',
    descriptionAr: 'مشارك في التدريب أو الحدث',
    active: true,
    sortOrder: 3,
  },
  {
    id: 19,
    value: 'session',
    label: 'Session',
    labelAr: 'جلسة',
    category: 'programmatic',
    description: 'Single session or meeting',
    descriptionAr: 'جلسة أو اجتماع واحد',
    active: true,
    sortOrder: 4,
  },
  {
    id: 20,
    value: 'training',
    label: 'Training',
    labelAr: 'تدريب',
    category: 'programmatic',
    description: 'Training course or program',
    descriptionAr: 'دورة تدريبية أو برنامج',
    active: true,
    sortOrder: 5,
  },
  {
    id: 21,
    value: 'workshop',
    label: 'Workshop',
    labelAr: 'ورشة عمل',
    category: 'programmatic',
    description: 'Workshop event',
    descriptionAr: 'حدث ورشة عمل',
    active: true,
    sortOrder: 6,
  },
  {
    id: 22,
    value: 'facilitator',
    label: 'Facilitator',
    labelAr: 'ميسر',
    category: 'programmatic',
    description: 'Training facilitator',
    descriptionAr: 'ميسر التدريب',
    active: true,
    sortOrder: 7,
  },
  {
    id: 23,
    value: 'consultant',
    label: 'Consultant',
    labelAr: 'استشاري',
    category: 'programmatic',
    description: 'Consulting professional',
    descriptionAr: 'متخصص استشاري',
    active: true,
    sortOrder: 8,
  },
  {
    id: 24,
    value: 'visit',
    label: 'Visit',
    labelAr: 'زيارة',
    category: 'programmatic',
    description: 'Single visit or field trip',
    descriptionAr: 'زيارة واحدة أو رحلة ميدانية',
    active: true,
    sortOrder: 9,
  },
  {
    id: 25,
    value: 'trip',
    label: 'Trip',
    labelAr: 'رحلة',
    category: 'programmatic',
    description: 'Travel or transportation trip',
    descriptionAr: 'رحلة سفر أو نقل',
    active: true,
    sortOrder: 10,
  },
  {
    id: 26,
    value: 'event',
    label: 'Event',
    labelAr: 'حدث',
    category: 'programmatic',
    description: 'Program or community event',
    descriptionAr: 'حدث برنامجي أو مجتمعي',
    active: true,
    sortOrder: 11,
  },
  {
    id: 27,
    value: 'tank',
    label: 'Tank',
    labelAr: 'خزان',
    category: 'programmatic',
    description: 'Water or fuel tank',
    descriptionAr: 'خزان مياه أو وقود',
    active: true,
    sortOrder: 12,
  },
  {
    id: 28,
    value: 'water_source',
    label: 'Water source',
    labelAr: 'مصدر مياه',
    category: 'programmatic',
    description: 'Water point or source',
    descriptionAr: 'نقطة أو مصدر مياه',
    active: true,
    sortOrder: 13,
  },
  {
    id: 29,
    value: 'survey',
    label: 'Survey',
    labelAr: 'مسح',
    category: 'programmatic',
    description: 'Survey or assessment',
    descriptionAr: 'مسح أو تقييم',
    active: true,
    sortOrder: 14,
  },
  {
    id: 30,
    value: 'household',
    label: 'Household',
    labelAr: 'أسرة',
    category: 'programmatic',
    description: 'Single household',
    descriptionAr: 'أسرة واحدة',
    active: true,
    sortOrder: 15,
  },
  {
    id: 31,
    value: 'community',
    label: 'Community',
    labelAr: 'مجتمع',
    category: 'programmatic',
    description: 'Community group',
    descriptionAr: 'مجموعة مجتمعية',
    active: true,
    sortOrder: 16,
  },
  {
    id: 32,
    value: 'school',
    label: 'School',
    labelAr: 'مدرسة',
    category: 'programmatic',
    description: 'Educational institution',
    descriptionAr: 'مؤسسة تعليمية',
    active: true,
    sortOrder: 17,
  },
];

/**
 * Get unit types by category
 * 
 * @param category - 'goods', 'time_based', 'programmatic', or 'all'
 * @returns Array of unit types for the category
 */
export function getUnitTypesByCategory(
  category: 'goods' | 'time_based' | 'programmatic' | 'all' = 'all'
): MasterDataValue[] {
  if (category === 'all') {
    return GLOBAL_UNIT_TYPES;
  }
  return GLOBAL_UNIT_TYPES.filter((unit) => unit.category === category);
}

/**
 * Get unit type by value
 * 
 * @param value - The unit value key (e.g., 'piece', 'kg', 'day')
 * @returns Unit type object or undefined
 */
export function getUnitTypeByValue(value: string): MasterDataValue | undefined {
  return GLOBAL_UNIT_TYPES.find((unit) => unit.value === value);
}

/**
 * Get unit type label in specific language
 * 
 * @param value - The unit value key
 * @param language - 'en' or 'ar'
 * @returns Localized label or the value itself if not found
 */
export function getUnitTypeLabel(value: string, language: 'en' | 'ar' = 'en'): string {
  const unit = getUnitTypeByValue(value);
  if (!unit) return value;
  return language === 'ar' ? (unit.labelAr || unit.label) : unit.label;
}

/**
 * Get category label
 * 
 * @param category - Category key
 * @param language - 'en' or 'ar'
 * @returns Localized category label
 */
export function getCategoryLabel(
  category: string,
  language: 'en' | 'ar' = 'en'
): string {
  const labels: Record<string, Record<string, string>> = {
    goods: {
      en: 'Physical Goods',
      ar: 'السلع الفيزيائية',
    },
    time_based: {
      en: 'Time-Based',
      ar: 'المقاييس الزمنية',
    },
    programmatic: {
      en: 'Programmatic Services',
      ar: 'الخدمات البرنامجية',
    },
  };

  return labels[category]?.[language] || category;
}

/**
 * Get all categories
 * 
 * @returns Array of unique categories
 */
export function getAllCategories(): string[] {
  return ['goods', 'time_based', 'programmatic'];
}

/**
 * Count units by category
 * 
 * @returns Object with category counts
 */
export function countUnitsByCategory(): Record<string, number> {
  return {
    goods: getUnitTypesByCategory('goods').length,
    time_based: getUnitTypesByCategory('time_based').length,
    programmatic: getUnitTypesByCategory('programmatic').length,
  };
}

/**
 * Export unit types as CSV
 * Useful for data migration and backup
 * 
 * @returns CSV string
 */
export function exportUnitTypesToCSV(): string {
  const headers = ['id', 'value', 'label', 'labelAr', 'category', 'description', 'descriptionAr'];
  const rows = GLOBAL_UNIT_TYPES.map((unit) => [
    unit.id,
    unit.value,
    unit.label,
    unit.labelAr || '',
    unit.category,
    unit.description || '',
    unit.descriptionAr || '',
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  return csv;
}
