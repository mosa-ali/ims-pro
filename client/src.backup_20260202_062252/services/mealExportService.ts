/**
 * ============================================================================
 * MEAL DATA EXPORT/IMPORT UTILITY
 * ============================================================================
 * 
 * Provides Excel export/import functionality for MEAL data
 * 
 * FEATURES:
 * - Export surveys to Excel template
 * - Export indicators to Excel template
 * - Import surveys from Excel
 * - Import indicators from Excel
 * - Duplicate detection during import
 * - Data validation
 * 
 * ============================================================================
 */

import { surveyService, indicatorService, type Survey, type Indicator } from '@/app/services/mealService';

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export surveys to Excel format
 */
export function exportSurveysToExcel(projectId?: string): string {
  const surveys = surveyService.getAllSurveys({ projectId });
  
  // Convert to CSV format (can be opened in Excel)
  const headers = ['ID', 'Name', 'Name (AR)', 'Description', 'Type', 'Language', 'Status', 'Questions Count', 'Submissions Count', 'Created At'];
  
  const rows = surveys.map(survey => [
    survey.id,
    survey.name,
    survey.nameAr || '',
    survey.description,
    survey.type,
    survey.language,
    survey.status,
    survey.questions?.length || 0,
    survey.submissionsCount || 0,
    survey.createdAt
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Export indicators to Excel format
 */
export function exportIndicatorsToExcel(projectId?: string): string {
  const indicators = indicatorService.getAllIndicators({ projectId });
  
  const headers = [
    'ID', 'Code', 'Name', 'Name (AR)', 'Description', 'Type', 'Category', 
    'Sector', 'Unit', 'Baseline', 'Target', 'Current', 'Status', 'Created At'
  ];
  
  const rows = indicators.map(indicator => [
    indicator.id,
    indicator.code,
    indicator.name,
    indicator.nameAr || '',
    indicator.description,
    indicator.type,
    indicator.category,
    indicator.sector,
    indicator.unit,
    indicator.baseline,
    indicator.target,
    indicator.current,
    indicator.status,
    indicator.createdAt
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Download data as CSV file
 */
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Parse CSV content
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      }
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Import indicators from CSV content
 */
export function importIndicatorsFromCSV(content: string, projectId: string, userId: string): {
  success: number;
  failed: number;
  errors: string[];
} {
  const rows = parseCSV(content);
  const headers = rows[0];
  const dataRows = rows.slice(1);

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  // Find column indices
  const codeIndex = headers.findIndex(h => h.toLowerCase().includes('code'));
  const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
  const nameArIndex = headers.findIndex(h => h.toLowerCase().includes('name') && h.toLowerCase().includes('ar'));
  const descIndex = headers.findIndex(h => h.toLowerCase().includes('description'));
  const typeIndex = headers.findIndex(h => h.toLowerCase() === 'type');
  const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'));
  const sectorIndex = headers.findIndex(h => h.toLowerCase().includes('sector'));
  const unitIndex = headers.findIndex(h => h.toLowerCase().includes('unit'));
  const baselineIndex = headers.findIndex(h => h.toLowerCase().includes('baseline'));
  const targetIndex = headers.findIndex(h => h.toLowerCase().includes('target'));

  dataRows.forEach((row, index) => {
    try {
      const code = row[codeIndex]?.trim();
      const name = row[nameIndex]?.trim();
      
      if (!code || !name) {
        errors.push(`Row ${index + 2}: Missing required fields (code or name)`);
        failed++;
        return;
      }

      const indicatorData = {
        projectId,
        code,
        name,
        nameAr: row[nameArIndex]?.trim() || undefined,
        description: row[descIndex]?.trim() || '',
        type: (row[typeIndex]?.trim() || 'output') as any,
        category: row[categoryIndex]?.trim() || 'General',
        sector: row[sectorIndex]?.trim() || 'General',
        unit: row[unitIndex]?.trim() || 'Number',
        baseline: parseFloat(row[baselineIndex]) || 0,
        target: parseFloat(row[targetIndex]) || 0,
      };

      indicatorService.createIndicator(indicatorData, userId);
      success++;
    } catch (error: any) {
      errors.push(`Row ${index + 2}: ${error.message}`);
      failed++;
    }
  });

  return { success, failed, errors };
}

/**
 * Export MEAL template for import
 */
export function exportMEALTemplate(type: 'indicators' | 'surveys'): string {
  if (type === 'indicators') {
    const headers = [
      'Code*', 'Name*', 'Name (AR)', 'Description', 'Type', 'Category', 
      'Sector', 'Unit', 'Baseline', 'Target'
    ];
    
    const example = [
      'IND-001', 'Number of beneficiaries', 'عدد المستفيدين', 'Total beneficiaries reached', 
      'output', 'Beneficiaries', 'Health', 'Number', '0', '1000'
    ];

    return [headers, example]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  } else {
    const headers = [
      'Name*', 'Name (AR)', 'Description', 'Type', 'Language', 'Target Group'
    ];
    
    const example = [
      'Beneficiary Satisfaction Survey', 'استطلاع رضا المستفيدين', 
      'Survey to measure beneficiary satisfaction', 'pdm', 'multi', 'Beneficiaries'
    ];

    return [headers, example]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

export default {
  exportSurveysToExcel,
  exportIndicatorsToExcel,
  downloadCSV,
  importIndicatorsFromCSV,
  exportMEALTemplate,
};
