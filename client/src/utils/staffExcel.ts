/**
 * ============================================================================
 * STAFF EXCEL IMPORT/EXPORT UTILITIES
 * ============================================================================
 */

import * as XLSX from 'xlsx';
import type { StaffMember } from '@/app/services/hrService';

/**
 * Export staff list to Excel
 */
export async function exportStaffToExcel(staff: StaffMember[]): Promise<void> {
 // Prepare data for export
 const exportData = staff.map(s => ({
 'Staff ID': s.staffId,
 'Full Name': s.fullName,
 'Gender': s.gender,
 'Nationality': s.nationality,
 'Position': s.position,
 'Department': s.department,
 'Contract Type': s.contractType,
 'Status': s.status,
 'Hire Date': s.hireDate || '',
 'Contract Start': s.contractStartDate || '',
 'Contract End': s.contractEndDate || '',
 'Projects': Array.isArray(s.projects) ? s.projects.join(', ') : (s.projects || ''),
 'Basic Salary': s.basicSalary,
 'Housing Allowance': s.housingAllowance,
 'Transport Allowance': s.transportAllowance,
 'Representation Allowance': s.representationAllowance,
 'Currency': s.currency,
 'Bank Name': s.bankName || '',
 'Account Number': s.accountNumber || '',
 'IBAN': s.iban || '',
 'Phone': s.phone || '',
 'Email': s.email || ''
 }));

 // Create workbook
 const wb = XLSX.utils.book_new();
 const ws = XLSX.utils.json_to_sheet(exportData);

 // Set column widths
 ws['!cols'] = [
 { wch: 12 }, // Staff ID
 { wch: 25 }, // Full Name
 { wch: 10 }, // Gender
 { wch: 15 }, // Nationality
 { wch: 20 }, // Position
 { wch: 15 }, // Department
 { wch: 15 }, // Contract Type
 { wch: 10 }, // Status
 { wch: 12 }, // Hire Date
 { wch: 12 }, // Contract Start
 { wch: 12 }, // Contract End
 { wch: 30 }, // Projects
 { wch: 12 }, // Basic Salary
 { wch: 15 }, // Housing
 { wch: 15 }, // Transport
 { wch: 15 }, // Representation
 { wch: 10 }, // Currency
 { wch: 20 }, // Bank Name
 { wch: 20 }, // Account Number
 { wch: 25 }, // IBAN
 { wch: 15 }, // Phone
 { wch: 25 } // Email
 ];

 XLSX.utils.book_append_sheet(wb, ws, 'Staff List');

 // Generate filename with timestamp
 const timestamp = new Date().toISOString().split('T')[0];
 const filename = `Staff_List_${timestamp}.xlsx`;

 // Save file
 XLSX.writeFile(wb, filename);
}

/**
 * Import staff from Excel
 */
export async function importStaffFromExcel(file: File): Promise<Partial<StaffMember>[]> {
 return new Promise((resolve, reject) => {
 const reader = new FileReader();

 reader.onload = (e) => {
 try {
 const data = e.target?.result;
 const workbook = XLSX.read(data, { type: 'binary' });
 
 // Get first sheet
 const sheetName = workbook.SheetNames[0];
 const worksheet = workbook.Sheets[sheetName];
 
 // Convert to JSON
 const jsonData = XLSX.utils.sheet_to_json(worksheet);

 // Map to StaffMember format
 const staffData: Partial<StaffMember>[] = jsonData.map((row: any) => {
 // Parse projects
 const projectsStr = row['Projects'] || row['projects'] || '';
 const projects = projectsStr ? projectsStr.split(',').map((p: string) => p.trim()) : ['Unassigned'];

 return {
 fullName: row['Full Name'] || row['fullName'] || '',
 gender: row['Gender'] || row['gender'] || 'Male',
 nationality: row['Nationality'] || row['nationality'] || '',
 position: row['Position'] || row['position'] || '',
 department: row['Department'] || row['department'] || '',
 contractType: row['Contract Type'] || row['contractType'] || 'Fixed-Term',
 status: row['Status'] || row['status'] || 'active',
 hireDate: row['Hire Date'] || row['hireDate'] || '',
 contractStartDate: row['Contract Start'] || row['contractStartDate'] || '',
 contractEndDate: row['Contract End'] || row['contractEndDate'] || '',
 projects: projects,
 basicSalary: parseFloat(row['Basic Salary'] || row['basicSalary'] || 0),
 housingAllowance: parseFloat(row['Housing Allowance'] || row['housingAllowance'] || 0),
 transportAllowance: parseFloat(row['Transport Allowance'] || row['transportAllowance'] || 0),
 representationAllowance: parseFloat(row['Representation Allowance'] || row['representationAllowance'] || 0),
 otherAllowances: 0,
 socialSecurityRate: 7,
 healthInsuranceRate: 5,
 taxRate: 15,
 currency: row['Currency'] || row['currency'] || 'USD',
 bankName: row['Bank Name'] || row['bankName'] || '',
 accountNumber: row['Account Number'] || row['accountNumber'] || '',
 iban: row['IBAN'] || row['iban'] || '',
 phone: row['Phone'] || row['phone'] || '',
 email: row['Email'] || row['email'] || ''
 };
 });

 resolve(staffData);
 } catch (error) {
 reject(error);
 }
 };

 reader.onerror = () => {
 reject(new Error('Failed to read file'));
 };

 reader.readAsBinaryString(file);
 });
}

/**
 * Download Excel template for staff import
 */
export function downloadStaffTemplate(): void {
 const templateData = [
 {
 'Full Name': 'Ahmed Hassan Mohamed',
 'Gender': 'Male',
 'Nationality': 'Yemen',
 'Position': 'Project Manager',
 'Department': 'Programs',
 'Contract Type': 'Fixed-Term',
 'Status': 'active',
 'Hire Date': '2024-01-15',
 'Contract Start': '2024-01-15',
 'Contract End': '2025-01-14',
 'Projects': 'ECHO-YEM-001, UNHCR-SYR-002',
 'Basic Salary': 3000,
 'Housing Allowance': 500,
 'Transport Allowance': 200,
 'Representation Allowance': 100,
 'Currency': 'USD',
 'Bank Name': 'Yemen Bank',
 'Account Number': '1234567890',
 'IBAN': 'YE12345678901234567890',
 'Phone': '+967 xxx xxx xxx',
 'Email': 'ahmed.hassan@example.com'
 }
 ];

 const wb = XLSX.utils.book_new();
 const ws = XLSX.utils.json_to_sheet(templateData);

 // Set column widths
 ws['!cols'] = [
 { wch: 25 }, // Full Name
 { wch: 10 }, // Gender
 { wch: 15 }, // Nationality
 { wch: 20 }, // Position
 { wch: 15 }, // Department
 { wch: 15 }, // Contract Type
 { wch: 10 }, // Status
 { wch: 12 }, // Hire Date
 { wch: 12 }, // Contract Start
 { wch: 12 }, // Contract End
 { wch: 30 }, // Projects
 { wch: 12 }, // Basic Salary
 { wch: 15 }, // Housing
 { wch: 15 }, // Transport
 { wch: 15 }, // Representation
 { wch: 10 }, // Currency
 { wch: 20 }, // Bank Name
 { wch: 20 }, // Account Number
 { wch: 25 }, // IBAN
 { wch: 15 }, // Phone
 { wch: 25 } // Email
 ];

 XLSX.utils.book_append_sheet(wb, ws, 'Staff Template');

 // Save file
 XLSX.writeFile(wb, 'Staff_Import_Template.xlsx');
}