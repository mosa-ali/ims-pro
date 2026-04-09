/**
 * Export utilities for generating PDF and Excel reports from project data
 */

import * as XLSX from 'xlsx';
import { exportToStandardExcel, type ExcelColumn } from './standardExcelExport';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ProjectOverviewData {
 project: {
 id: number;
 projectName: string;
 projectNameAr?: string;
 startDate: string;
 endDate: string;
 status: string;
 totalBudget: string;
 spent: string;
 currency: string;
 location?: string;
 locationAr?: string;
 description?: string;
 descriptionAr?: string;
 };
 kpis: {
 activities: { completed: number; total: number; percentage: number };
 indicators: { achieved: number; total: number; percentage: number };
 beneficiaries: { reached: number; planned: number; percentage: number };
 budget: { approved: number; spent: number; remaining: number; utilization: number; currency: string };
 };
}

/**
 * Export project overview data to Excel format using standardized format
 */
export async function exportToExcel(data: ProjectOverviewData, isRTL: boolean = false) {
 const { project, kpis } = data;
 
 // Prepare project information data
 const projectData = [
 {
 field: isRTL ? 'رقم المشروع' : 'Project ID',
 value: project.id.toString(),
 },
 {
 field: isRTL ? 'اسم المشروع' : 'Project Name',
 value: isRTL && project.projectNameAr ? project.projectNameAr : project.projectName,
 },
 {
 field: isRTL ? 'تاريخ البدء' : 'Start Date',
 value: project.startDate,
 },
 {
 field: isRTL ? 'تاريخ الانتهاء' : 'End Date',
 value: project.endDate,
 },
 {
 field: isRTL ? 'الحالة' : 'Status',
 value: project.status,
 },
 {
 field: isRTL ? 'الموقع' : 'Location',
 value: isRTL && project.locationAr ? project.locationAr : project.location || 'N/A',
 },
 {
 field: isRTL ? 'الوصف' : 'Description',
 value: isRTL && project.descriptionAr ? project.descriptionAr : project.description || 'N/A',
 },
 {
 field: isRTL ? 'الميزانية المعتمدة' : 'Approved Budget',
 value: `${kpis.budget.approved.toLocaleString()} ${kpis.budget.currency}`,
 },
 {
 field: isRTL ? 'المصروف' : 'Spent',
 value: `${kpis.budget.spent.toLocaleString()} ${kpis.budget.currency}`,
 },
 {
 field: isRTL ? 'المتبقي' : 'Remaining',
 value: `${kpis.budget.remaining.toLocaleString()} ${kpis.budget.currency}`,
 },
 {
 field: isRTL ? 'نسبة الاستخدام' : 'Utilization',
 value: `${kpis.budget.utilization.toFixed(2)}%`,
 },
 ];

 const projectColumns: ExcelColumn[] = [
 { name: isRTL ? 'الحقل' : 'Field', key: 'field', width: 30, type: 'text' },
 { name: isRTL ? 'القيمة' : 'Value', key: 'value', width: 50, type: 'text' },
 ];

 // Generate filename with timestamp
 const timestamp = new Date().toISOString().split('T')[0];
 
 await exportToStandardExcel({
 sheetName: isRTL ? 'معلومات المشروع' : 'Project Overview',
 columns: projectColumns,
 data: projectData,
 fileName: `Project_${project.id}_Overview_${timestamp}`,
 includeTotals: false,
 isRTL,
 });
}

/**
 * Export project overview data to PDF format
 * Uses browser's print functionality with custom styling
 */
export function exportToPDF(data: ProjectOverviewData, isRTL: boolean = false) {
 const { project, kpis } = data;
 
 // Create a temporary container for PDF content
 const printWindow = window.open('', '_blank');
 if (!printWindow) {
 alert('Please allow popups to export PDF');
 return;
 }
 
 const htmlContent = `
 <!DOCTYPE html>
 <html dir="${isRTL ? 'rtl' : 'ltr'}">
 <head>
 <meta charset="UTF-8">
 <title>Project Overview - ${project.projectName}</title>
 <style>
 * { margin: 0; padding: 0; box-sizing: border-box; }
 body { 
 font-family: ${isRTL ? 'Arial, sans-serif' : 'system-ui, -apple-system, sans-serif'};
 padding: 40px;
 direction: ${isRTL ? 'rtl' : 'ltr'};
 color: #1e293b;
 }
 h1 { 
 font-size: 28px; 
 margin-bottom: 10px; 
 color: #0f172a;
 border-bottom: 3px solid #3b82f6;
 padding-bottom: 10px;
 }
 h2 { 
 font-size: 20px; 
 margin-top: 30px; 
 margin-bottom: 15px; 
 color: #1e40af;
 }
 .info-grid { 
 display: grid; 
 grid-template-columns: 200px 1fr; 
 gap: 12px; 
 margin-bottom: 20px;
 }
 .info-label { 
 font-weight: 600; 
 color: #475569;
 }
 .info-value { 
 color: #1e293b;
 }
 .kpi-table { 
 width: 100%; 
 border-collapse: collapse; 
 margin-top: 15px;
 }
 .kpi-table th, .kpi-table td { 
 padding: 12px; 
 text-align: ${isRTL ? 'right' : 'left'}; 
 border: 1px solid #e2e8f0;
 }
 .kpi-table th { 
 background-color: #f1f5f9; 
 font-weight: 600;
 color: #0f172a;
 }
 .kpi-table tr:nth-child(even) { 
 background-color: #f8fafc;
 }
 .footer { 
 margin-top: 40px; 
 padding-top: 20px; 
 border-top: 1px solid #e2e8f0; 
 font-size: 12px; 
 color: #64748b;
 text-align: center;
 }
 @media print {
 body { padding: 20px; }
 .no-print { display: none; }
 }
 </style>
 </head>
 <body>
 <h1>${isRTL ? 'نظرة عامة على المشروع' : 'Project Overview'}</h1>
 
 <h2>${isRTL ? 'معلومات المشروع' : 'Project Information'}</h2>
 <div class="info-grid">
 <div class="info-label">${isRTL ? 'رقم المشروع:' : 'Project ID:'}</div>
 <div class="info-value">${project.id}</div>
 
 <div class="info-label">${isRTL ? 'اسم المشروع:' : 'Project Name:'}</div>
 <div class="info-value">${isRTL && project.projectNameAr ? project.projectNameAr : project.projectName}</div>
 
 <div class="info-label">${isRTL ? 'تاريخ البدء:' : 'Start Date:'}</div>
 <div class="info-value">${project.startDate}</div>
 
 <div class="info-label">${isRTL ? 'تاريخ الانتهاء:' : 'End Date:'}</div>
 <div class="info-value">${project.endDate}</div>
 
 <div class="info-label">${isRTL ? 'الحالة:' : 'Status:'}</div>
 <div class="info-value">${project.status}</div>
 
 <div class="info-label">${isRTL ? 'الموقع:' : 'Location:'}</div>
 <div class="info-value">${isRTL && project.locationAr ? project.locationAr : project.location || 'N/A'}</div>
 </div>
 
 <h2>${isRTL ? 'الميزانية' : 'Budget'}</h2>
 <div class="info-grid">
 <div class="info-label">${isRTL ? 'الميزانية المعتمدة:' : 'Approved Budget:'}</div>
 <div class="info-value">${kpis.budget.approved.toLocaleString()} ${kpis.budget.currency}</div>
 
 <div class="info-label">${isRTL ? 'المصروف:' : 'Spent:'}</div>
 <div class="info-value">${kpis.budget.spent.toLocaleString()} ${kpis.budget.currency}</div>
 
 <div class="info-label">${isRTL ? 'المتبقي:' : 'Remaining:'}</div>
 <div class="info-value">${kpis.budget.remaining.toLocaleString()} ${kpis.budget.currency}</div>
 
 <div class="info-label">${isRTL ? 'نسبة الاستخدام:' : 'Utilization:'}</div>
 <div class="info-value">${kpis.budget.utilization.toFixed(2)}%</div>
 </div>
 
 <h2>${isRTL ? 'مؤشرات الأداء الرئيسية' : 'Key Performance Indicators'}</h2>
 <table class="kpi-table">
 <thead>
 <tr>
 <th>${isRTL ? 'المؤشر' : 'KPI'}</th>
 <th>${isRTL ? 'المنجز' : 'Completed'}</th>
 <th>${isRTL ? 'الإجمالي' : 'Total'}</th>
 <th>${isRTL ? 'النسبة' : 'Percentage'}</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td>${isRTL ? 'الأنشطة' : 'Activities'}</td>
 <td>${kpis.activities.completed}</td>
 <td>${kpis.activities.total}</td>
 <td>${kpis.activities.percentage.toFixed(2)}%</td>
 </tr>
 <tr>
 <td>${isRTL ? 'المؤشرات' : 'Indicators'}</td>
 <td>${kpis.indicators.achieved}</td>
 <td>${kpis.indicators.total}</td>
 <td>${kpis.indicators.percentage.toFixed(2)}%</td>
 </tr>
 <tr>
 <td>${isRTL ? 'المستفيدون' : 'Beneficiaries'}</td>
 <td>${kpis.beneficiaries.reached}</td>
 <td>${kpis.beneficiaries.planned || 'N/A'}</td>
 <td>${kpis.beneficiaries.percentage ? kpis.beneficiaries.percentage.toFixed(2) + '%' : 'N/A'}</td>
 </tr>
 </tbody>
 </table>
 
 <div class="footer">
 ${isRTL ? 'تم الإنشاء في:' : 'Generated on:'} ${new Date().toLocaleString()}
 </div>
 
 <script>
 window.onload = function() {
 window.print();
 setTimeout(() => window.close(), 500);
 };
 </script>
 </body>
 </html>
 `;
 
 printWindow.document.write(htmlContent);
 printWindow.document.close();
}
