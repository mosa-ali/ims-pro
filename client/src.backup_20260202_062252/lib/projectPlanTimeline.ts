/**
 * Project Plan Timeline Generation Utility
 * 
 * Generates dynamic timeline structure from project start/end dates
 * Supports multi-year projects with proper month column generation
 */

export interface TimelineMonth {
  year: number;
  month: number; // 1-12
  monthName: string;
  monthNameShort: string;
  isFirstOfYear: boolean;
  isLastOfYear: boolean;
}

export interface TimelineYear {
  year: number;
  yearLabel: string;
  months: TimelineMonth[];
}

export interface ProjectTimeline {
  startDate: Date;
  endDate: Date;
  totalMonths: number;
  years: TimelineYear[];
  allMonths: TimelineMonth[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Generate timeline structure from project dates
 * 
 * Rules:
 * - Timeline derived from project.startDate and project.endDate
 * - If duration > 12 months: Year 1 = first 12 months, Year 2+ = remaining months
 * - Only real months within project duration (no padding)
 * - Month columns reflect actual project timeline
 */
export function generateProjectTimeline(
  startDate: Date | string,
  endDate: Date | string
): ProjectTimeline {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Calculate total months
  const totalMonths = calculateMonthsBetween(start, end);

  // Generate all months in the project timeline
  const allMonths: TimelineMonth[] = [];
  const yearMap = new Map<number, TimelineMonth[]>();

  let currentDate = new Date(start);
  for (let i = 0; i < totalMonths; i++) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-12

    const timelineMonth: TimelineMonth = {
      year,
      month,
      monthName: MONTH_NAMES[month - 1],
      monthNameShort: MONTH_NAMES_SHORT[month - 1],
      isFirstOfYear: month === 1,
      isLastOfYear: month === 12 || (i === totalMonths - 1),
    };

    allMonths.push(timelineMonth);

    // Group by year
    if (!yearMap.has(year)) {
      yearMap.set(year, []);
    }
    yearMap.get(year)!.push(timelineMonth);

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Build year structure
  const years: TimelineYear[] = [];
  let yearNumber = 1;
  
  Array.from(yearMap.entries()).forEach(([year, months]) => {
    years.push({
      year,
      yearLabel: yearMap.size > 1 ? `Year ${yearNumber}` : String(year),
      months,
    });
    yearNumber++;
  });

  return {
    startDate: start,
    endDate: end,
    totalMonths,
    years,
    allMonths,
  };
}

/**
 * Calculate number of months between two dates (inclusive)
 */
function calculateMonthsBetween(start: Date, end: Date): number {
  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const endYear = end.getFullYear();
  const endMonth = end.getMonth();

  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
}

/**
 * Check if a task overlaps with a specific month
 */
export function isTaskInMonth(
  taskStart: Date | string,
  taskEnd: Date | string,
  year: number,
  month: number
): boolean {
  const start = typeof taskStart === 'string' ? new Date(taskStart) : taskStart;
  const end = typeof taskEnd === 'string' ? new Date(taskEnd) : taskEnd;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // Last day of month

  return start <= monthEnd && end >= monthStart;
}

/**
 * Calculate task coverage percentage for a specific month
 */
export function getTaskCoverageInMonth(
  taskStart: Date | string,
  taskEnd: Date | string,
  year: number,
  month: number
): number {
  const start = typeof taskStart === 'string' ? new Date(taskStart) : taskStart;
  const end = typeof taskEnd === 'string' ? new Date(taskEnd) : taskEnd;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // Task doesn't overlap this month
  if (start > monthEnd || end < monthStart) {
    return 0;
  }

  // Calculate overlap
  const overlapStart = start > monthStart ? start : monthStart;
  const overlapEnd = end < monthEnd ? end : monthEnd;

  const monthDays = monthEnd.getDate();
  const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return Math.min(100, Math.round((overlapDays / monthDays) * 100));
}

/**
 * Format month for display (e.g., "Jan 2025", "Feb 2025")
 */
export function formatMonthDisplay(year: number, month: number, short: boolean = true): string {
  const monthName = short ? MONTH_NAMES_SHORT[month - 1] : MONTH_NAMES[month - 1];
  return `${monthName} ${year}`;
}
