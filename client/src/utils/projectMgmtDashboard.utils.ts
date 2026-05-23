// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export const formatCurrency = (amount: number, currency: string = 'USD', locale: string = 'en', compact: boolean = false): string => {
  if (compact) {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercentage = (value: number, locale: string = 'en'): string => {
  const formatted = (value || 0).toFixed(1);
  const symbol = locale === 'ar' ? '٪' : '%';
  return `${formatted}${symbol}`;
};

export const formatDate = (date: Date | string, locale: string = 'en'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (locale === 'ar') {
    return dateObj.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatNumber = (value: number, locale: string = 'en'): string => {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(value);
};

export const percentChange = (oldValue: number, newValue: number): string => {
  if (oldValue === 0) return '0%';
  const change = ((newValue - oldValue) / oldValue) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

export const truncate = (text: string, length: number): string => {
  return text.length > length ? `${text.substring(0, length)}...` : text;
};

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
};

export const sortBy = <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

export const filterBy = <T>(array: T[], criteria: Partial<T>): T[] => {
  return array.filter((item) => {
    return Object.entries(criteria).every(([key, value]) => item[key as keyof T] === value);
  });
};

export const unique = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

export const isInPast = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
};

export const isInFuture = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
};

export const isWithinDays = (date: Date | string, days: number): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return dateObj <= futureDate && dateObj >= now;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ============================================================================
// COLOR SCHEMES
// ============================================================================

export const colorSchemes = {
  status: {
    'on-track': {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    'at-risk': {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-800',
    },
    delayed: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-800',
    },
    completed: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800',
    },
  },

  risk: {
    high: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-800',
    },
    medium: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-800',
    },
    low: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800',
    },
  },

  card: {
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
    },
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
    },
  },
};

// ============================================================================
// LOADING SKELETON CLASS NAMES
// ============================================================================

export const skeletons = {
  kpiCard: 'animate-pulse space-y-2',
  chart: 'animate-pulse h-80 bg-gray-200 rounded',
  tableRow: 'animate-pulse space-y-2',
  card: 'animate-pulse space-y-2',
};

// ============================================================================
// EMPTY STATES
// ============================================================================

export const emptyStates = {
  noData: (language: string = 'en') => ({
    icon: '📭',
    title: language === 'ar' ? 'لا توجد بيانات' : 'No Data',
    description: language === 'ar' ? 'لا توجد بيانات متاحة حالياً' : 'No data available at the moment',
  }),

  noProjects: (language: string = 'en') => ({
    icon: '📋',
    title: language === 'ar' ? 'لا توجد مشاريع' : 'No Projects',
    description: language === 'ar' ? 'لم يتم العثور على أي مشاريع' : 'No projects found',
  }),

  noDonors: (language: string = 'en') => ({
    icon: '👥',
    title: language === 'ar' ? 'لا يوجد مانحون' : 'No Donors',
    description: language === 'ar' ? 'لم يتم العثور على أي مانحين' : 'No donors found',
  }),

  error: (language: string = 'en') => ({
    icon: '⚠️',
    title: language === 'ar' ? 'خطأ' : 'Error',
    description: language === 'ar' ? 'حدث خطأ أثناء تحميل البيانات' : 'An error occurred while loading data',
  }),
};

// ============================================================================
// CHART UTILITIES
// ============================================================================

export const chartColors = {
  primary: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  status: {
    'on-track': '#10b981',
    'at-risk': '#f59e0b',
    delayed: '#ef4444',
    completed: '#3b82f6',
  },
  risk: {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
  },
};

export const getChartColor = (index: number): string => {
  return chartColors.primary[index % chartColors.primary.length];
};

export const transformChartData = <T extends Record<string, any>>(
  data: T[],
  keyField: keyof T,
  valueField: keyof T,
  colorField?: keyof T
): Array<{ name: string; value: number; fill?: string }> => {
  return data.map((item, index) => ({
    name: String(item[keyField]),
    value: Number(item[valueField]),
    fill: colorField ? String(item[colorField]) : getChartColor(index),
  }));
};

// ============================================================================
// CALCULATION UTILITIES
// ============================================================================

export const calculateBudgetUtilization = (spent: number, budget: number): number => {
  return budget > 0 ? (spent / budget) * 100 : 0;
};

export const calculateBurnRate = (spent: number, budget: number, daysElapsed: number): number => {
  if (daysElapsed === 0) return 0;
  return (spent / daysElapsed) * 30; // Monthly burn rate
};

export const calculateRiskScore = (spent: number, budget: number, progress: number, daysRemaining: number): number => {
  const utilizationRisk = calculateBudgetUtilization(spent, budget) > 80 ? 30 : 0;
  const progressRisk = progress < 50 && daysRemaining < 90 ? 40 : 0;
  const overBudgetRisk = spent > budget ? 30 : 0;

  return Math.min(100, utilizationRisk + progressRisk + overBudgetRisk);
};

export const calculateProjectHealth = (
  spent: number,
  budget: number,
  progress: number,
  status: string
): 'healthy' | 'warning' | 'critical' => {
  const utilizationRate = calculateBudgetUtilization(spent, budget);

  if (status === 'completed') return 'healthy';
  if (status === 'at-risk') return 'critical';
  if (utilizationRate > 90 || progress < 30) return 'critical';
  if (utilizationRate > 75 || progress < 50) return 'warning';

  return 'healthy';
};

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export const dashboardUtils = {
  format: {
    currency: formatCurrency,
    percentage: formatPercentage,
    date: formatDate,
    number: formatNumber,
    percentChange,
    truncate,
  },
  data: {
    groupBy,
    sortBy,
    filterBy,
    unique,
  },
  validate: {
    isInRange,
    isInPast,
    isInFuture,
    isWithinDays,
    isValidEmail,
  },
  colors: colorSchemes,
  skeletons,
  emptyStates,
  chart: {
    colors: chartColors,
    getColor: getChartColor,
    transformData: transformChartData,
  },
  calculate: {
    budgetUtilization: calculateBudgetUtilization,
    burnRate: calculateBurnRate,
    riskScore: calculateRiskScore,
    projectHealth: calculateProjectHealth,
  },
};
