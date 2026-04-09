/**
 * Document Folder Creation Helpers
 * Automatically creates folder structures in the documents table when entities are created
 */

import { nanoid } from "nanoid";
import { getDb } from "./db";
import { documents } from "../drizzle/schema";

/**
 * Project folder codes (11-12 folders based on sectors)
 */
const PROJECT_FOLDERS = [
  { code: "01_Financial_Overview", name: "Financial Overview", nameAr: "النظرة المالية" },
  { code: "02_Variance_Alerts", name: "Variance Alerts", nameAr: "تنبيهات التباين" },
  { code: "03_Activities", name: "Activities", nameAr: "الأنشطة" },
  { code: "04_Indicators", name: "Indicators", nameAr: "المؤشرات" },
  { code: "05_Beneficiaries", name: "Beneficiaries", nameAr: "المستفيدون" },
  { code: "06_Case_Management", name: "Case Management", nameAr: "إدارة الحالات", conditional: true }, // Only for Education, Protection, Child Protection
  { code: "07_Tasks", name: "Tasks", nameAr: "المهام" },
  { code: "08_Project_Plan", name: "Project Plan", nameAr: "خطة المشروع" },
  { code: "09_Forecast_Plan", name: "Forecast Plan", nameAr: "خطة التوقعات" },
  { code: "10_Procurement_Plan", name: "Procurement Plan", nameAr: "خطة المشتريات" },
  { code: "11_Project_Report", name: "Project Report", nameAr: "تقرير المشروع" },
  { code: "12_Monthly_Report", name: "Monthly Report", nameAr: "التقرير الشهري" },
];

/**
 * MEAL workspace folders
 */
const MEAL_FOLDERS = [
  { code: "MEAL_Dashboard_Reports", name: "Dashboard Reports", nameAr: "تقارير لوحة المعلومات" },
  { code: "MEAL_Indicator_Reports", name: "Indicator Reports", nameAr: "تقارير المؤشرات" },
  { code: "MEAL_Evaluation_Reports", name: "Evaluation Reports", nameAr: "تقارير التقييم" },
  { code: "MEAL_Monitoring_Reports", name: "Monitoring Reports", nameAr: "تقارير المراقبة" },
  { code: "MEAL_Learning_Documents", name: "Learning Documents", nameAr: "وثائق التعلم" },
  { code: "MEAL_Data_Collection_Forms", name: "Data Collection Forms", nameAr: "نماذج جمع البيانات" },
];

/**
 * HR workspace folders
 */
const HR_FOLDERS = [
  { code: "HR_Employee_Records", name: "Employee Records", nameAr: "سجلات الموظفين" },
  { code: "HR_Attendance_Reports", name: "Attendance Reports", nameAr: "تقارير الحضور" },
  { code: "HR_Payroll_Reports", name: "Payroll Reports", nameAr: "تقارير الرواتب" },
  { code: "HR_Performance_Reviews", name: "Performance Reviews", nameAr: "تقييمات الأداء" },
  { code: "HR_Training_Certificates", name: "Training Certificates", nameAr: "شهادات التدريب" },
  { code: "HR_Contracts", name: "Contracts", nameAr: "العقود" },
  { code: "HR_Leave_Records", name: "Leave Records", nameAr: "سجلات الإجازات" },
  { code: "HR_Annual_Plans", name: "Annual Plans", nameAr: "الخطط السنوية" },
  { code: "HR_Audit_Logs", name: "Audit Logs", nameAr: "سجلات التدقيق" },
  { code: "HR_Organizational_Charts", name: "Organizational Charts", nameAr: "الهياكل التنظيمية" },
];

/**
 * Finance workspace folders
 */
const FINANCE_FOLDERS = [
  { code: "Finance_Budget_Reports", name: "Budget Reports", nameAr: "تقارير الميزانية" },
  { code: "Finance_Expenditure_Reports", name: "Expenditure Reports", nameAr: "تقارير النفقات" },
  { code: "Finance_Payment_Reports", name: "Payment Reports", nameAr: "تقارير المدفوعات" },
  { code: "Finance_Vendor_Reports", name: "Vendor Reports", nameAr: "تقارير الموردين" },
  { code: "Finance_Bank_Statements", name: "Bank Statements", nameAr: "كشوف البنك" },
  { code: "Finance_Journal_Entries", name: "Journal Entries", nameAr: "قيود اليومية" },
  { code: "Finance_Financial_Statements", name: "Financial Statements", nameAr: "القوائم المالية" },
  { code: "Finance_Audit_Reports", name: "Audit Reports", nameAr: "تقارير التدقيق" },
  { code: "Finance_Tax_Documents", name: "Tax Documents", nameAr: "وثائق الضرائب" },
  { code: "Finance_Asset_Reports", name: "Asset Reports", nameAr: "تقارير الأصول" },
  { code: "Finance_Treasury_Reports", name: "Treasury Reports", nameAr: "تقارير الخزينة" },
  { code: "Finance_Cost_Allocation_Reports", name: "Cost Allocation Reports", nameAr: "تقارير توزيع التكاليف" },
];

/**
 * Logistics workspace folders
 */
const LOGISTICS_FOLDERS = [
  { code: "Logistics_Purchase_Requests", name: "Purchase Requests", nameAr: "طلبات الشراء" },
  { code: "Logistics_Purchase_Orders", name: "Purchase Orders", nameAr: "أوامر الشراء" },
  { code: "Logistics_RFQ_Documents", name: "RFQ Documents", nameAr: "وثائق طلب العروض" },
  { code: "Logistics_Bid_Analysis", name: "Bid Analysis", nameAr: "تحليل العطاءات" },
  { code: "Logistics_Supplier_Contracts", name: "Supplier Contracts", nameAr: "عقود الموردين" },
  { code: "Logistics_Goods_Receipt_Notes", name: "Goods Receipt Notes", nameAr: "إشعارات استلام البضائع" },
  { code: "Logistics_Inventory_Reports", name: "Inventory Reports", nameAr: "تقارير المخزون" },
  { code: "Logistics_Asset_Records", name: "Asset Records", nameAr: "سجلات الأصول" },
  { code: "Logistics_Fleet_Management", name: "Fleet Management", nameAr: "إدارة الأسطول" },
  { code: "Logistics_Procurement_Tracker", name: "Procurement Tracker", nameAr: "متتبع المشتريات" },
  { code: "Logistics_Supplier_Performance", name: "Supplier Performance", nameAr: "أداء الموردين" },
];

/**
 * Donor CRM workspace folders
 */
const DONOR_CRM_FOLDERS = [
  { code: "Donor_Registry_Reports", name: "Registry Reports", nameAr: "تقارير السجل" },
  { code: "Donor_Grant_Agreements", name: "Grant Agreements", nameAr: "اتفاقيات المنح" },
  { code: "Donor_Proposals", name: "Proposals", nameAr: "المقترحات" },
  { code: "Donor_Reports", name: "Donor Reports", nameAr: "تقارير المانحين" },
  { code: "Donor_Communications", name: "Communications", nameAr: "المراسلات" },
  { code: "Donor_Compliance_Documents", name: "Compliance Documents", nameAr: "وثائق الامتثال" },
  { code: "Donor_Pipeline_Reports", name: "Pipeline Reports", nameAr: "تقارير خط الأنابيب" },
];

/**
 * Risk & Compliance workspace folders
 */
const RISK_COMPLIANCE_FOLDERS = [
  { code: "Risk_Registry_Reports", name: "Registry Reports", nameAr: "تقارير السجل" },
  { code: "Risk_Assessment_Reports", name: "Assessment Reports", nameAr: "تقارير التقييم" },
  { code: "Risk_Mitigation_Plans", name: "Mitigation Plans", nameAr: "خطط التخفيف" },
  { code: "Compliance_Audit_Reports", name: "Audit Reports", nameAr: "تقارير التدقيق" },
  { code: "Compliance_Policy_Documents", name: "Policy Documents", nameAr: "وثائق السياسات" },
  { code: "Compliance_Incident_Reports", name: "Incident Reports", nameAr: "تقارير الحوادث" },
  { code: "Compliance_Training_Records", name: "Training Records", nameAr: "سجلات التدريب" },
  { code: "Risk_Dashboard_Reports", name: "Dashboard Reports", nameAr: "تقارير لوحة المعلومات" },
];

/**
 * Check if project sectors include Education, Protection, or Child Protection
 */
function shouldIncludeCaseManagement(sectors: string[]): boolean {
  const caseManagementSectors = ["Education", "Protection", "Child Protection"];
  return sectors.some(sector => caseManagementSectors.includes(sector));
}

/**
 * Create folder structure for a new project
 * Called automatically when a project is created
 */
export async function createProjectFolders(
  projectCode: string,
  sectors: string[],
  organizationId: number,
  operatingUnitId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const includeCaseManagement = shouldIncludeCaseManagement(sectors);
  
  // Filter folders based on conditional Case Management
  const foldersToCreate = PROJECT_FOLDERS.filter(folder => {
    if (folder.conditional) {
      return includeCaseManagement;
    }
    return true;
  });

  console.log(`[createProjectFolders] Creating ${foldersToCreate.length} folders for project ${projectCode} (Case Management: ${includeCaseManagement})`);

  // Create folder records
  const folderRecords = foldersToCreate.map(folder => ({
    documentId: `folder_${projectCode}_${folder.code}_${nanoid(10)}`,
    workspace: "projects" as const,
    parentFolderId: projectCode, // Project code is the parent folder
    isFolder: true,
    projectId: projectCode,
    folderCode: folder.code,
    fileName: folder.name,
    filePath: "", // Empty for folder records
    fileType: "folder",
    fileSize: 0,
    uploadedBy: userId,
    syncSource: "auto_created",
    syncStatus: "synced" as const,
    version: 1,
    organizationId,
    operatingUnitId,
  }));

  await db.insert(documents).values(folderRecords);
  
  console.log(`[createProjectFolders] Successfully created ${folderRecords.length} folders for project ${projectCode}`);
}

/**
 * Create folder structure for MEAL workspace
 * Called on first access to MEAL module
 */
export async function createMEALFolders(
  organizationId: number,
  operatingUnitId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[createMEALFolders] Creating MEAL workspace folders for org ${organizationId}, OU ${operatingUnitId}`);

  const folderRecords = MEAL_FOLDERS.map(folder => ({
    documentId: `folder_meal_${folder.code}_${nanoid(10)}`,
    workspace: "meal" as const,
    parentFolderId: null,
    isFolder: true,
    projectId: null,
    folderCode: folder.code,
    fileName: folder.name,
    filePath: "",
    fileType: "folder",
    fileSize: 0,
    uploadedBy: userId,
    syncSource: "auto_created",
    syncStatus: "synced" as const,
    version: 1,
    organizationId,
    operatingUnitId,
  }));

  await db.insert(documents).values(folderRecords);
  
  console.log(`[createMEALFolders] Successfully created ${folderRecords.length} MEAL folders`);
}

/**
 * Create folder structure for HR workspace
 */
export async function createHRFolders(
  organizationId: number,
  operatingUnitId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[createHRFolders] Creating HR workspace folders for org ${organizationId}, OU ${operatingUnitId}`);

  const folderRecords = HR_FOLDERS.map(folder => ({
    documentId: `folder_hr_${folder.code}_${nanoid(10)}`,
    workspace: "hr" as const,
    parentFolderId: null,
    isFolder: true,
    projectId: null,
    folderCode: folder.code,
    fileName: folder.name,
    filePath: "",
    fileType: "folder",
    fileSize: 0,
    uploadedBy: userId,
    syncSource: "auto_created",
    syncStatus: "synced" as const,
    version: 1,
    organizationId,
    operatingUnitId,
  }));

  await db.insert(documents).values(folderRecords);
  
  console.log(`[createHRFolders] Successfully created ${folderRecords.length} HR folders`);
}

/**
 * Create folder structure for Finance workspace
 */
export async function createFinanceFolders(
  organizationId: number,
  operatingUnitId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[createFinanceFolders] Creating Finance workspace folders for org ${organizationId}, OU ${operatingUnitId}`);

  const folderRecords = FINANCE_FOLDERS.map(folder => ({
    documentId: `folder_finance_${folder.code}_${nanoid(10)}`,
    workspace: "finance" as const,
    parentFolderId: null,
    isFolder: true,
    projectId: null,
    folderCode: folder.code,
    fileName: folder.name,
    filePath: "",
    fileType: "folder",
    fileSize: 0,
    uploadedBy: userId,
    syncSource: "auto_created",
    syncStatus: "synced" as const,
    version: 1,
    organizationId,
    operatingUnitId,
  }));

  await db.insert(documents).values(folderRecords);
  
  console.log(`[createFinanceFolders] Successfully created ${folderRecords.length} Finance folders`);
}

/**
 * Create folder structure for Logistics workspace
 */
export async function createLogisticsFolders(
  organizationId: number,
  operatingUnitId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[createLogisticsFolders] Creating Logistics workspace folders for org ${organizationId}, OU ${operatingUnitId}`);

  const folderRecords = LOGISTICS_FOLDERS.map(folder => ({
    documentId: `folder_logistics_${folder.code}_${nanoid(10)}`,
    workspace: "logistics" as const,
    parentFolderId: null,
    isFolder: true,
    projectId: null,
    folderCode: folder.code,
    fileName: folder.name,
    filePath: "",
    fileType: "folder",
    fileSize: 0,
    uploadedBy: userId,
    syncSource: "auto_created",
    syncStatus: "synced" as const,
    version: 1,
    organizationId,
    operatingUnitId,
  }));

  await db.insert(documents).values(folderRecords);
  
  console.log(`[createLogisticsFolders] Successfully created ${folderRecords.length} Logistics folders`);
}

/**
 * Create folder structure for Donor CRM workspace
 */
export async function createDonorCRMFolders(
  organizationId: number,
  operatingUnitId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[createDonorCRMFolders] Creating Donor CRM workspace folders for org ${organizationId}, OU ${operatingUnitId}`);

  const folderRecords = DONOR_CRM_FOLDERS.map(folder => ({
    documentId: `folder_donor_crm_${folder.code}_${nanoid(10)}`,
    workspace: "donor_crm" as const,
    parentFolderId: null,
    isFolder: true,
    projectId: null,
    folderCode: folder.code,
    fileName: folder.name,
    filePath: "",
    fileType: "folder",
    fileSize: 0,
    uploadedBy: userId,
    syncSource: "auto_created",
    syncStatus: "synced" as const,
    version: 1,
    organizationId,
    operatingUnitId,
  }));

  await db.insert(documents).values(folderRecords);
  
  console.log(`[createDonorCRMFolders] Successfully created ${folderRecords.length} Donor CRM folders`);
}

/**
 * Create folder structure for Risk & Compliance workspace
 */
export async function createRiskComplianceFolders(
  organizationId: number,
  operatingUnitId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[createRiskComplianceFolders] Creating Risk & Compliance workspace folders for org ${organizationId}, OU ${operatingUnitId}`);

  const folderRecords = RISK_COMPLIANCE_FOLDERS.map(folder => ({
    documentId: `folder_risk_compliance_${folder.code}_${nanoid(10)}`,
    workspace: "risk_compliance" as const,
    parentFolderId: null,
    isFolder: true,
    projectId: null,
    folderCode: folder.code,
    fileName: folder.name,
    filePath: "",
    fileType: "folder",
    fileSize: 0,
    uploadedBy: userId,
    syncSource: "auto_created",
    syncStatus: "synced" as const,
    version: 1,
    organizationId,
    operatingUnitId,
  }));

  await db.insert(documents).values(folderRecords);
  
  console.log(`[createRiskComplianceFolders] Successfully created ${folderRecords.length} Risk & Compliance folders`);
}

/**
 * Check if workspace folders exist for an organization
 */
export async function workspaceFoldersExist(
  workspace: string,
  organizationId: number,
  operatingUnitId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const { eq, and } = await import("drizzle-orm");
  
  const existingFolders = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.workspace, workspace as any),
        eq(documents.isFolder, true),
        eq(documents.organizationId, organizationId),
        eq(documents.operatingUnitId, operatingUnitId)
      )
    )
    .limit(1);

  return existingFolders.length > 0;
}
