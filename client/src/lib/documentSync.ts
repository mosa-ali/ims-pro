/**
 * Document Sync Utility
 * Helper functions for syncing client-generated files to Central Documents
 */

import { trpc } from "@/lib/trpc";

export type Workspace = "projects" | "meal" | "hr" | "finance" | "logistics" | "donor_crm" | "risk_compliance";

export type SyncConfig = {
 workspace: Workspace;
 folderCode: string;
 projectCode?: string;
 fileName: string;
 syncSource: string; // e.g., 'financial_overview', 'monthly_report'
};

/**
 * Sync Excel file to Central Documents
 * @param workbook ExcelJS Workbook instance
 * @param config Sync configuration
 * @returns Promise with sync result
 */
export async function syncExcelToDocuments(
 workbook: any, // ExcelJS.Workbook
 config: SyncConfig
): Promise<{ success: boolean; documentId: string; version: number }> {
 try {
 // Generate Excel file as buffer
 const buffer = await workbook.xlsx.writeBuffer();
 
 // Convert to base64
 const base64Data = Buffer.from(buffer).toString("base64");

 // Upload and sync via tRPC
 const result = await trpc.documents.uploadAndSyncFile.mutate({
 workspace: config.workspace,
 folderCode: config.folderCode,
 projectCode: config.projectCode,
 fileName: config.fileName,
 fileData: base64Data,
 fileType: "xlsx",
 syncSource: config.syncSource,
 });

 console.log(`[documentSync] Synced Excel file ${config.fileName} to ${config.workspace}/${config.folderCode}`);
 
 return result;
 } catch (error) {
 console.error("[documentSync] Failed to sync Excel file:", error);
 throw error;
 }
}

/**
 * Sync PDF file to Central Documents
 * @param pdfBlob PDF Blob or ArrayBuffer
 * @param config Sync configuration
 * @returns Promise with sync result
 */
export async function syncPDFToDocuments(
 pdfBlob: Blob | ArrayBuffer,
 config: SyncConfig
): Promise<{ success: boolean; documentId: string; version: number }> {
 try {
 // Convert to ArrayBuffer if Blob
 const arrayBuffer = pdfBlob instanceof Blob ? await pdfBlob.arrayBuffer() : pdfBlob;
 
 // Convert to base64
 const base64Data = Buffer.from(arrayBuffer).toString("base64");

 // Upload and sync via tRPC
 const result = await trpc.documents.uploadAndSyncFile.mutate({
 workspace: config.workspace,
 folderCode: config.folderCode,
 projectCode: config.projectCode,
 fileName: config.fileName,
 fileData: base64Data,
 fileType: "pdf",
 syncSource: config.syncSource,
 });

 console.log(`[documentSync] Synced PDF file ${config.fileName} to ${config.workspace}/${config.folderCode}`);
 
 return result;
 } catch (error) {
 console.error("[documentSync] Failed to sync PDF file:", error);
 throw error;
 }
}

/**
 * Get folder code for project tab
 * Maps project tab names to folder codes
 */
export function getProjectFolderCode(tabName: string): string {
 const folderMap: Record<string, string> = {
 "financial_overview": "01_Financial_Overview",
 "variance_alerts": "02_Variance_Alerts",
 "activities": "03_Activities",
 "indicators": "04_Indicators",
 "beneficiaries": "05_Beneficiaries",
 "case_management": "06_Case_Management",
 "tasks": "07_Tasks",
 "project_plan": "08_Project_Plan",
 "forecast_plan": "09_Forecast_Plan",
 "procurement_plan": "10_Procurement_Plan",
 "project_report": "11_Project_Report",
 "monthly_report": "12_Monthly_Report",
 };

 return folderMap[tabName] || tabName;
}

/**
 * Get folder code for MEAL module
 */
export function getMEALFolderCode(reportType: string): string {
 const folderMap: Record<string, string> = {
 "dashboard": "MEAL_Dashboard_Reports",
 "indicators": "MEAL_Indicator_Reports",
 "evaluation": "MEAL_Evaluation_Reports",
 "monitoring": "MEAL_Monitoring_Reports",
 "learning": "MEAL_Learning_Documents",
 "data_collection": "MEAL_Data_Collection_Forms",
 };

 return folderMap[reportType] || reportType;
}

/**
 * Get folder code for HR module
 */
export function getHRFolderCode(reportType: string): string {
 const folderMap: Record<string, string> = {
 "employee_records": "HR_Employee_Records",
 "attendance": "HR_Attendance_Reports",
 "payroll": "HR_Payroll_Reports",
 "performance": "HR_Performance_Reviews",
 "training": "HR_Training_Certificates",
 "contracts": "HR_Contracts",
 "leave": "HR_Leave_Records",
 "annual_plans": "HR_Annual_Plans",
 "audit_logs": "HR_Audit_Logs",
 "org_charts": "HR_Organizational_Charts",
 };

 return folderMap[reportType] || reportType;
}

/**
 * Get folder code for Finance module
 */
export function getFinanceFolderCode(reportType: string): string {
 const folderMap: Record<string, string> = {
 "budget": "Finance_Budget_Reports",
 "expenditure": "Finance_Expenditure_Reports",
 "payment": "Finance_Payment_Reports",
 "vendor": "Finance_Vendor_Reports",
 "bank": "Finance_Bank_Statements",
 "journal": "Finance_Journal_Entries",
 "financial_statements": "Finance_Financial_Statements",
 "audit": "Finance_Audit_Reports",
 "tax": "Finance_Tax_Documents",
 "asset": "Finance_Asset_Reports",
 "treasury": "Finance_Treasury_Reports",
 "cost_allocation": "Finance_Cost_Allocation_Reports",
 };

 return folderMap[reportType] || reportType;
}
