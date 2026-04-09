/**
 * ============================================================================
 * SALARY SCALE EXCEL EXPORT/IMPORT
 * ============================================================================
 */

import ExcelJS from 'exceljs';
import { SalaryScaleRecord, salaryScaleService } from '@/app/services/salaryScaleService';

/**
 * Export salary scale to Excel (.xlsx) with proper table format
 */
export async function exportSalaryScaleToExcel(records: SalaryScaleRecord[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Salary Scale');

  // Define columns (all 19 columns as specified)
  worksheet.columns = [
    { header: 'Staff ID', key: 'staffId', width: 12 },
    { header: 'Staff Name', key: 'staffName', width: 25 },
    { header: 'Position', key: 'position', width: 20 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Grade', key: 'grade', width: 10 },
    { header: 'Step', key: 'step', width: 10 },
    { header: 'Min Salary', key: 'minSalary', width: 12 },
    { header: 'Max Salary', key: 'maxSalary', width: 12 },
    { header: 'Approved Gross Salary', key: 'approvedSalary', width: 18 },
    { header: 'Housing Allowance', key: 'housingAllowance', width: 16 },
    { header: 'Transport Allowance', key: 'transportAllowance', width: 18 },
    { header: 'Representation Allowance', key: 'representationAllowance', width: 22 },
    { header: 'Annual Allowance', key: 'annualAllowance', width: 16 },
    { header: 'Bonus', key: 'bonus', width: 12 },
    { header: 'Other Allowances', key: 'otherAllowances', width: 16 },
    { header: 'Effective Start Date', key: 'effectiveStartDate', width: 16 },
    { header: 'Effective End Date', key: 'effectiveEndDate', width: 16 },
    { header: 'Status', key: 'status', width: 12 }
  ];

  // Add data rows
  records.forEach(record => {
    worksheet.addRow({
      staffId: record.staffId,
      staffName: record.staffFullName,
      position: record.position,
      department: record.department,
      grade: record.grade,
      step: record.step,
      minSalary: record.minSalary,
      maxSalary: record.maxSalary,
      approvedSalary: record.approvedGrossSalary,
      housingAllowance: record.housingAllowance,
      transportAllowance: record.transportAllowance,
      representationAllowance: record.representationAllowance,
      annualAllowance: record.annualAllowance,
      bonus: record.bonus,
      otherAllowances: record.otherAllowances,
      effectiveStartDate: record.effectiveStartDate,
      effectiveEndDate: record.effectiveEndDate || '',
      status: record.status.toUpperCase()
    });
  });

  // Format header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.height = 20;

  // Format number columns
  [7, 8, 9, 10, 11, 12, 13, 14, 15].forEach(colNum => {
    worksheet.getColumn(colNum).numFmt = '#,##0.00';
  });

  // Create Excel Table
  worksheet.addTable({
    name: 'SalaryScaleTable',
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true
    },
    columns: worksheet.columns.map(col => ({ name: col.header as string, filterButton: true })),
    rows: []
  });

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Salary_Scale_${new Date().toISOString().split('T')[0]}.xlsx`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse imported Excel file and validate
 */
export async function importSalaryScaleFromExcel(file: File): Promise<SalaryScaleRecord[]> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('No worksheet found');

  const records: Partial<SalaryScaleRecord>[] = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const staffId = row.getCell(1).value?.toString() || '';
    if (!staffId) return; // Skip empty rows

    records.push({
      staffId,
      grade: row.getCell(5).value?.toString() || '',
      step: row.getCell(6).value?.toString() || '',
      approvedGrossSalary: parseFloat(row.getCell(9).value?.toString() || '0'),
      housingAllowance: parseFloat(row.getCell(10).value?.toString() || '0'),
      transportAllowance: parseFloat(row.getCell(11).value?.toString() || '0'),
      representationAllowance: parseFloat(row.getCell(12).value?.toString() || '0'),
      annualAllowance: parseFloat(row.getCell(13).value?.toString() || '0'),
      bonus: parseFloat(row.getCell(14).value?.toString() || '0'),
      otherAllowances: parseFloat(row.getCell(15).value?.toString() || '0'),
      effectiveStartDate: row.getCell(16).value?.toString() || new Date().toISOString().split('T')[0]
    });
  });

  return records as SalaryScaleRecord[];
}
