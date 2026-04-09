/**
 * ============================================================================
 * EXCEL EXPORT UTILITY - TRUE EXCEL FORMAT (.xlsx)
 * ============================================================================
 * 
 * Uses ExcelJS to generate REAL Excel files with:
 * - Proper Excel Table format ("My table has headers")
 * - Blue header row with filters
 * - Alternating row colors
 * - Auto-sized columns
 * - Professional styling
 * 
 * ============================================================================
 */

import ExcelJS from 'exceljs';
import { PayrollSheet } from '@/app/services/hrService';

/**
 * Export payroll sheet to TRUE Excel format (.xlsx)
 * 
 * CRITICAL REQUIREMENTS:
 * 1. DATA ONLY - No metadata, notes, or explanations
 * 2. ALL columns from payroll table (including Housing Allowance)
 * 3. ACTUAL calculated values (Tax Rate %, etc.)
 * 4. Proper Excel Table with "My table has headers" enabled
 * 5. Exact column order matching payroll table and PDF
 */
export async function exportPayrollToExcel(payroll: PayrollSheet): Promise<void> {
  // Create new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payroll');

  // EXACT COLUMN ORDER - Matches payroll table and PDF
  const columns = [
    { header: 'Staff ID', key: 'staffId', width: 12 },
    { header: 'Staff Name', key: 'staffName', width: 25 },
    { header: 'Position', key: 'position', width: 20 },
    { header: 'Project', key: 'project', width: 15 },
    { header: 'Basic Salary', key: 'basicSalary', width: 14 },
    { header: 'Housing Allowance', key: 'housingAllowance', width: 16 },
    { header: 'Transport Allowance', key: 'transportAllowance', width: 18 },
    { header: 'Representation Allowance', key: 'representationAllowance', width: 22 },
    { header: 'Other Allowances', key: 'otherAllowances', width: 15 },
    { header: 'Gross Salary', key: 'grossSalary', width: 14 },
    { header: 'Taxable Income Base', key: 'taxableIncomeBase', width: 18 },
    { header: 'Tax Rate (%)', key: 'taxRate', width: 12 },
    { header: 'Tax Amount', key: 'taxAmount', width: 12 },
    { header: 'Social Security', key: 'socialSecurity', width: 15 },
    { header: 'Health Insurance', key: 'healthInsurance', width: 16 },
    { header: 'Other Deductions', key: 'otherDeductions', width: 16 },
    { header: 'Total Deductions', key: 'totalDeductions', width: 16 },
    { header: 'Net Salary', key: 'netSalary', width: 14 },
    { header: 'Currency', key: 'currency', width: 10 }
  ];

  worksheet.columns = columns;

  // Add data rows
  payroll.records.forEach(record => {
    worksheet.addRow({
      staffId: record.staffId,
      staffName: record.staffName,
      position: record.position,
      project: record.project,
      basicSalary: parseFloat((record.basicSalary || 0).toFixed(2)),
      housingAllowance: parseFloat((record.housingAllowance || 0).toFixed(2)),
      transportAllowance: parseFloat((record.transportAllowance || 0).toFixed(2)),
      representationAllowance: parseFloat((record.representationAllowance || 0).toFixed(2)),
      otherAllowances: parseFloat((record.otherAllowances || 0).toFixed(2)),
      grossSalary: parseFloat((record.grossSalary || 0).toFixed(2)),
      taxableIncomeBase: parseFloat((record.taxableIncomeBase || 0).toFixed(2)),
      taxRate: parseFloat((record.taxRate || 0).toFixed(2)),
      taxAmount: parseFloat((record.taxAmount || 0).toFixed(2)),
      socialSecurity: parseFloat((record.socialSecurityAmount || 0).toFixed(2)),
      healthInsurance: parseFloat((record.healthInsuranceAmount || 0).toFixed(2)),
      otherDeductions: parseFloat((record.otherDeductions || 0).toFixed(2)),
      totalDeductions: parseFloat((record.totalDeductions || 0).toFixed(2)),
      netSalary: parseFloat((record.netSalary || 0).toFixed(2)),
      currency: record.currency || 'USD'
    });
  });

  // Calculate totals
  const totalHousing = payroll.records.reduce((sum, r) => sum + (r.housingAllowance || 0), 0);
  const totalTransport = payroll.records.reduce((sum, r) => sum + (r.transportAllowance || 0), 0);
  const totalRepresentation = payroll.records.reduce((sum, r) => sum + (r.representationAllowance || 0), 0);
  const totalOther = payroll.records.reduce((sum, r) => sum + (r.otherAllowances || 0), 0);
  const totalTax = payroll.records.reduce((sum, r) => sum + (r.taxAmount || 0), 0);
  const totalSocial = payroll.records.reduce((sum, r) => sum + (r.socialSecurityAmount || 0), 0);
  const totalHealth = payroll.records.reduce((sum, r) => sum + (r.healthInsuranceAmount || 0), 0);
  const totalOtherDed = payroll.records.reduce((sum, r) => sum + (r.otherDeductions || 0), 0);

  // Add TOTAL row
  const totalRow = worksheet.addRow({
    staffId: '',
    staffName: '',
    position: '',
    project: 'TOTAL',
    basicSalary: parseFloat((payroll.totalBasicSalary || 0).toFixed(2)),
    housingAllowance: parseFloat(totalHousing.toFixed(2)),
    transportAllowance: parseFloat(totalTransport.toFixed(2)),
    representationAllowance: parseFloat(totalRepresentation.toFixed(2)),
    otherAllowances: parseFloat(totalOther.toFixed(2)),
    grossSalary: parseFloat((payroll.totalGrossSalary || 0).toFixed(2)),
    taxableIncomeBase: '',
    taxRate: '',
    taxAmount: parseFloat(totalTax.toFixed(2)),
    socialSecurity: parseFloat(totalSocial.toFixed(2)),
    healthInsurance: parseFloat(totalHealth.toFixed(2)),
    otherDeductions: parseFloat(totalOtherDed.toFixed(2)),
    totalDeductions: parseFloat((payroll.totalDeductions || 0).toFixed(2)),
    netSalary: parseFloat((payroll.totalNetSalary || 0).toFixed(2)),
    currency: 'USD'
  });

  // Style TOTAL row
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Create Excel Table (THIS IS THE KEY - "My table has headers")
  worksheet.addTable({
    name: 'PayrollTable',
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
      showColumnStripes: false
    },
    columns: columns.map(col => ({ name: col.header, filterButton: true })),
    rows: []  // Rows already added above
  });

  // Format header row (blue background, white text, bold)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }  // Blue color like in screenshot
  };
  headerRow.height = 20;

  // Format number columns
  const numberColumns = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]; // All numeric columns
  numberColumns.forEach(colNum => {
    worksheet.getColumn(colNum).numFmt = '#,##0.00';
  });

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  // Download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Payroll_${payroll.monthName}_${payroll.year}.xlsx`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export generic table data to Excel
 */
export function exportTableToExcel(
  data: any[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(header => item[header] ?? ''));

  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}