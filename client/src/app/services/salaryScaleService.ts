/**
 * ============================================================================
 * SALARY SCALE SERVICE
 * ============================================================================
 * 
 * CRITICAL RULES:
 * - Single source of truth for all salary data
 * - Salary versioning: Draft → Active → Superseded
 * - History preserved permanently
 * - Payroll MUST read from Active records only
 * - No deletion of records used in payroll
 * 
 * ============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { staffService } from './hrService';

// ============================================================================
// TYPES
// ============================================================================

export type SalaryStatus = 'draft' | 'active' | 'superseded';
export type AllowanceType = 'value' | 'percentage';

export interface SalaryScaleRecord {
 id: string;
 version: number;
 
 // Staff Identification (READ-ONLY from Staff Dictionary)
 staffId: string;
 staffFullName: string;
 position: string;
 department: string;
 contractType: string;
 
 // Grade & Scale (EDITABLE)
 grade: string;
 step: string;
 
 // Salary Range (REFERENCE ONLY)
 minSalary: number;
 maxSalary: number;
 
 // Approved Salary (CRITICAL)
 approvedGrossSalary: number;
 
 // Allowance Structure
 housingAllowance: number;
 housingAllowanceType: AllowanceType;
 transportAllowance: number;
 transportAllowanceType: AllowanceType;
 representationAllowance: number;
 representationAllowanceType: AllowanceType;
 annualAllowance: number;
 bonus: number;
 otherAllowances: number;
 
 // Validity & Control
 effectiveStartDate: string;
 effectiveEndDate?: string;
 status: SalaryStatus;
 lastApprovedBy?: string;
 lastUpdatedDate: string;
 createdDate: string;
 createdBy: string;
 
 // Control Flags
 isLocked: boolean;
 usedInPayroll: boolean;
 
 // Currency
 currency: string;
}

export interface GradeDefinition {
 id: string;
 grade: string;
 description: string;
 minSalary: number;
 maxSalary: number;
 steps: string[];
 currency: string;
 createdDate: string;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEY = 'hr_salary_scale';
const GRADES_KEY = 'hr_salary_grades';

// ============================================================================
// CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate allowance value based on type
 * @param baseSalary - The approved gross salary (base for percentage calculations)
 * @param amount - The allowance amount (either fixed value or percentage)
 * @param type - 'value' or 'percentage'
 * @returns Calculated allowance value
 */
export function calculateAllowanceValue(
 baseSalary: number,
 amount: number,
 type: AllowanceType
): number {
 if (type === 'percentage') {
 return baseSalary * (amount / 100);
 }
 return amount;
}

/**
 * Calculate total compensation from a salary record
 * Converts all percentage-based allowances to values
 */
export function calculateTotalCompensation(record: SalaryScaleRecord): {
 housing: number;
 transport: number;
 representation: number;
 totalAllowances: number;
 totalCompensation: number;
} {
 const housing = calculateAllowanceValue(
 record.approvedGrossSalary,
 record.housingAllowance,
 record.housingAllowanceType
 );
 
 const transport = calculateAllowanceValue(
 record.approvedGrossSalary,
 record.transportAllowance,
 record.transportAllowanceType
 );
 
 const representation = calculateAllowanceValue(
 record.approvedGrossSalary,
 record.representationAllowance,
 record.representationAllowanceType
 );
 
 const totalAllowances = housing + transport + representation + 
 record.annualAllowance + record.bonus + record.otherAllowances;
 
 const totalCompensation = record.approvedGrossSalary + totalAllowances;
 
 return {
 housing,
 transport,
 representation,
 totalAllowances,
 totalCompensation
 };
}

// ============================================================================
// SALARY SCALE SERVICE
// ============================================================================

class SalaryScaleService {
 
 // --------------------------------------------------------------------------
 // INITIALIZATION
 // --------------------------------------------------------------------------
 
 initialize(): void {
 if (!localStorage.getItem(STORAGE_KEY)) {
 this.createInitialData();
 }
 if (!localStorage.getItem(GRADES_KEY)) {
 this.createDefaultGrades();
 }
 }
 
 /**
 * FORCE CLEAR AND REBUILD FROM STAFF DICTIONARY
 * Call this to remove all old/mock data and rebuild from scratch
 */
 clearAndReinitialize(): void {
 localStorage.removeItem(STORAGE_KEY);
 this.createInitialData();
 }
 
 private createDefaultGrades(): void {
 const grades: GradeDefinition[] = [
 {
 id: uuidv4(),
 grade: 'G1',
 description: 'Entry Level',
 minSalary: 800,
 maxSalary: 1500,
 steps: ['Step 1', 'Step 2', 'Step 3'],
 currency: 'USD',
 createdDate: new Date().toISOString()
 },
 {
 id: uuidv4(),
 grade: 'G2',
 description: 'Junior Level',
 minSalary: 1500,
 maxSalary: 2500,
 steps: ['Step 1', 'Step 2', 'Step 3'],
 currency: 'USD',
 createdDate: new Date().toISOString()
 },
 {
 id: uuidv4(),
 grade: 'G3',
 description: 'Mid Level',
 minSalary: 2500,
 maxSalary: 4000,
 steps: ['Step 1', 'Step 2', 'Step 3'],
 currency: 'USD',
 createdDate: new Date().toISOString()
 },
 {
 id: uuidv4(),
 grade: 'G4',
 description: 'Senior Level',
 minSalary: 4000,
 maxSalary: 6000,
 steps: ['Step 1', 'Step 2', 'Step 3'],
 currency: 'USD',
 createdDate: new Date().toISOString()
 },
 {
 id: uuidv4(),
 grade: 'G5',
 description: 'Executive Level',
 minSalary: 6000,
 maxSalary: 10000,
 steps: ['Step 1', 'Step 2', 'Step 3'],
 currency: 'USD',
 createdDate: new Date().toISOString()
 }
 ];
 
 localStorage.setItem(GRADES_KEY, JSON.stringify(grades));
 }
 
 private createInitialData(): void {
 // ✅ CRITICAL FIX: Load ONLY ACTIVE staff from Staff Dictionary
 // Archived and Exited staff should NOT appear in Salary Scale
 const staff = staffService.getActive(); // ✅ Changed from getAll() to getActive()
 
 // If no active staff in Staff Dictionary, don't create anything
 if (staff.length === 0) {
 localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
 return;
 }
 
 const salaryRecords: SalaryScaleRecord[] = staff.map(person => ({
 id: uuidv4(),
 version: 1,
 
 // From Staff Dictionary (REAL DATA ONLY)
 staffId: person.staffId,
 staffFullName: person.fullName,
 position: person.position,
 department: person.department,
 contractType: person.contractType,
 
 // Grade & Scale (defaults based on position)
 grade: this.assignDefaultGrade(person.position),
 step: 'Step 1',
 
 // Salary Range (from grade definition)
 minSalary: this.getGradeMinSalary(this.assignDefaultGrade(person.position)),
 maxSalary: this.getGradeMaxSalary(this.assignDefaultGrade(person.position)),
 
 // Approved Salary (use basic salary from Staff Dictionary if available, otherwise 0)
 approvedGrossSalary: person.basicSalary || 0,
 
 // Allowances (from Staff Dictionary if available, otherwise 0)
 housingAllowance: person.housingAllowance || 0,
 housingAllowanceType: 'value',
 transportAllowance: person.transportAllowance || 0,
 transportAllowanceType: 'value',
 representationAllowance: person.representationAllowance || 0,
 representationAllowanceType: 'value',
 annualAllowance: 0,
 bonus: 0,
 otherAllowances: person.otherAllowances || 0,
 
 // Validity
 effectiveStartDate: new Date().toISOString().split('T')[0],
 status: 'draft' as SalaryStatus,
 lastUpdatedDate: new Date().toISOString(),
 createdDate: new Date().toISOString(),
 createdBy: 'System',
 
 // Control
 isLocked: false,
 usedInPayroll: false,
 
 currency: 'USD'
 }));
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(salaryRecords));
 }
 
 private assignDefaultGrade(position: string): string {
 const positionLower = position.toLowerCase();
 if (positionLower.includes('director') || positionLower.includes('manager')) return 'G4';
 if (positionLower.includes('senior') || positionLower.includes('coordinator')) return 'G3';
 if (positionLower.includes('officer') || positionLower.includes('specialist')) return 'G2';
 return 'G1';
 }
 
 private getGradeMinSalary(grade: string): number {
 const grades = this.getAllGrades();
 const found = grades.find(g => g.grade === grade);
 return found?.minSalary || 800;
 }
 
 private getGradeMaxSalary(grade: string): number {
 const grades = this.getAllGrades();
 const found = grades.find(g => g.grade === grade);
 return found?.maxSalary || 1500;
 }
 
 // --------------------------------------------------------------------------
 // CRUD OPERATIONS
 // --------------------------------------------------------------------------
 
 getAll(): SalaryScaleRecord[] {
 const data = localStorage.getItem(STORAGE_KEY);
 if (!data) return [];
 return JSON.parse(data);
 }
 
 getById(id: string): SalaryScaleRecord | undefined {
 const records = this.getAll();
 return records.find(r => r.id === id);
 }
 
 getByStaffId(staffId: string): SalaryScaleRecord[] {
 const records = this.getAll();
 return records.filter(r => r.staffId === staffId)
 .sort((a, b) => b.version - a.version); // Latest version first
 }
 
 getActiveByStaffId(staffId: string): SalaryScaleRecord | undefined {
 const records = this.getByStaffId(staffId);
 return records.find(r => r.status === 'active');
 }
 
 getAllActive(): SalaryScaleRecord[] {
 const records = this.getAll();
 return records.filter(r => r.status === 'active');
 }
 
 // --------------------------------------------------------------------------
 // SALARY VERSIONING
 // --------------------------------------------------------------------------
 
 createNewVersion(staffId: string, updates: Partial<SalaryScaleRecord>, approvedBy: string): SalaryScaleRecord {
 const records = this.getAll();
 const existingRecords = this.getByStaffId(staffId);
 
 // Mark current active as superseded
 const currentActive = existingRecords.find(r => r.status === 'active');
 if (currentActive) {
 currentActive.status = 'superseded';
 currentActive.effectiveEndDate = new Date().toISOString().split('T')[0];
 }
 
 // Get max version
 const maxVersion = existingRecords.length > 0 
 ? Math.max(...existingRecords.map(r => r.version))
 : 0;
 
 // Create new version
 const baseRecord = existingRecords[0] || this.getDefaultRecordForStaff(staffId);
 const newRecord: SalaryScaleRecord = {
 ...baseRecord,
 ...updates,
 id: uuidv4(),
 version: maxVersion + 1,
 status: 'active',
 effectiveStartDate: updates.effectiveStartDate || new Date().toISOString().split('T')[0],
 lastApprovedBy: approvedBy,
 lastUpdatedDate: new Date().toISOString(),
 createdDate: new Date().toISOString(),
 createdBy: approvedBy
 };
 
 // Update storage
 const updatedRecords = records.filter(r => r.id !== currentActive?.id);
 if (currentActive) {
 updatedRecords.push(currentActive);
 }
 updatedRecords.push(newRecord);
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
 
 return newRecord;
 }
 
 private getDefaultRecordForStaff(staffId: string): SalaryScaleRecord {
 const staff = staffService.getAll().find(s => s.staffId === staffId);
 if (!staff) throw new Error('Staff not found');
 
 return {
 id: uuidv4(),
 version: 1,
 staffId: staff.staffId,
 staffFullName: staff.fullName,
 position: staff.position,
 department: staff.department,
 contractType: staff.contractType,
 grade: 'G1',
 step: 'Step 1',
 minSalary: 800,
 maxSalary: 1500,
 approvedGrossSalary: 0,
 housingAllowance: 0,
 housingAllowanceType: 'value',
 transportAllowance: 0,
 transportAllowanceType: 'value',
 representationAllowance: 0,
 representationAllowanceType: 'value',
 annualAllowance: 0,
 bonus: 0,
 otherAllowances: 0,
 effectiveStartDate: new Date().toISOString().split('T')[0],
 status: 'draft',
 lastUpdatedDate: new Date().toISOString(),
 createdDate: new Date().toISOString(),
 createdBy: 'System',
 isLocked: false,
 usedInPayroll: false,
 currency: 'USD'
 };
 }
 
 update(id: string, updates: Partial<SalaryScaleRecord>): void {
 const records = this.getAll();
 const index = records.findIndex(r => r.id === id);
 
 if (index === -1) throw new Error('Record not found');
 
 const record = records[index];
 
 // Check if locked
 if (record.isLocked) {
 throw new Error('This salary record is locked and cannot be edited');
 }
 
 // Update record
 records[index] = {
 ...record,
 ...updates,
 lastUpdatedDate: new Date().toISOString()
 };
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
 }
 
 activate(id: string, approvedBy: string): void {
 const records = this.getAll();
 const record = records.find(r => r.id === id);
 
 if (!record) throw new Error('Record not found');
 
 // Deactivate any existing active record for this staff
 const staffRecords = records.filter(r => r.staffId === record.staffId);
 staffRecords.forEach(r => {
 if (r.status === 'active' && r.id !== id) {
 r.status = 'superseded';
 r.effectiveEndDate = new Date().toISOString().split('T')[0];
 }
 });
 
 // Activate this record
 record.status = 'active';
 record.lastApprovedBy = approvedBy;
 record.lastUpdatedDate = new Date().toISOString();
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
 }
 
 lock(id: string): void {
 const records = this.getAll();
 const record = records.find(r => r.id === id);
 if (record) {
 record.isLocked = true;
 localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
 }
 }
 
 unlock(id: string): void {
 const records = this.getAll();
 const record = records.find(r => r.id === id);
 if (record) {
 record.isLocked = false;
 localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
 }
 }
 
 markUsedInPayroll(staffId: string): void {
 const activeRecord = this.getActiveByStaffId(staffId);
 if (activeRecord) {
 this.update(activeRecord.id, { usedInPayroll: true });
 }
 }
 
 delete(id: string): void {
 const record = this.getById(id);
 if (!record) return;
 
 // Prevent deletion if used in payroll
 if (record.usedInPayroll) {
 throw new Error('Cannot delete salary record that has been used in payroll');
 }
 
 const records = this.getAll();
 const filtered = records.filter(r => r.id !== id);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
 }
 
 /**
 * RESTORE - Adds salary scale record back from deleted records
 */
 restore(salaryData: SalaryScaleRecord): boolean {
 const records = this.getAll();
 
 // Check if record already exists
 const exists = records.some(r => r.id === salaryData.id);
 if (exists) return false;
 
 // Mark as restored and set to draft status
 salaryData.lastUpdatedDate = new Date().toISOString();
 salaryData.status = 'draft'; // Restored records start as draft
 salaryData.isLocked = false;
 
 records.push(salaryData);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
 
 return true;
 }
 
 // --------------------------------------------------------------------------
 // GRADE MANAGEMENT
 // --------------------------------------------------------------------------
 
 getAllGrades(): GradeDefinition[] {
 const data = localStorage.getItem(GRADES_KEY);
 if (!data) return [];
 return JSON.parse(data);
 }
 
 addGrade(grade: Omit<GradeDefinition, 'id' | 'createdDate'>): GradeDefinition {
 const grades = this.getAllGrades();
 const newGrade: GradeDefinition = {
 ...grade,
 id: uuidv4(),
 createdDate: new Date().toISOString()
 };
 grades.push(newGrade);
 localStorage.setItem(GRADES_KEY, JSON.stringify(grades));
 return newGrade;
 }
 
 updateGrade(id: string, updates: Partial<GradeDefinition>): void {
 const grades = this.getAllGrades();
 const index = grades.findIndex(g => g.id === id);
 if (index !== -1) {
 grades[index] = { ...grades[index], ...updates };
 localStorage.setItem(GRADES_KEY, JSON.stringify(grades));
 }
 }
 
 deleteGrade(id: string): void {
 const grades = this.getAllGrades();
 const filtered = grades.filter(g => g.id !== id);
 localStorage.setItem(GRADES_KEY, JSON.stringify(filtered));
 }
 
 // --------------------------------------------------------------------------
 // SYNC WITH STAFF DICTIONARY
 // --------------------------------------------------------------------------
 
 syncWithStaffDictionary(): void {
 // ✅ CRITICAL FIX: Sync ONLY ACTIVE staff from Staff Dictionary
 // Archived and Exited staff should NOT appear in Salary Scale
 const staff = staffService.getActive(); // ✅ Changed from getAll() to getActive()
 const salaryRecords = this.getAll();
 
 // Find active staff without salary records
 const newStaff = staff.filter(s => {
 return !salaryRecords.some(r => r.staffId === s.staffId);
 });
 
 // Create draft records for new active staff
 newStaff.forEach(person => {
 const newRecord: SalaryScaleRecord = {
 id: uuidv4(),
 version: 1,
 staffId: person.staffId,
 staffFullName: person.fullName,
 position: person.position,
 department: person.department,
 contractType: person.contractType,
 grade: this.assignDefaultGrade(person.position),
 step: 'Step 1',
 minSalary: this.getGradeMinSalary(this.assignDefaultGrade(person.position)),
 maxSalary: this.getGradeMaxSalary(this.assignDefaultGrade(person.position)),
 approvedGrossSalary: 0,
 housingAllowance: 0,
 housingAllowanceType: 'value',
 transportAllowance: 0,
 transportAllowanceType: 'value',
 representationAllowance: 0,
 representationAllowanceType: 'value',
 annualAllowance: 0,
 bonus: 0,
 otherAllowances: 0,
 effectiveStartDate: new Date().toISOString().split('T')[0],
 status: 'draft',
 lastUpdatedDate: new Date().toISOString(),
 createdDate: new Date().toISOString(),
 createdBy: 'System',
 isLocked: false,
 usedInPayroll: false,
 currency: 'USD'
 };
 
 salaryRecords.push(newRecord);
 });
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(salaryRecords));
 }
 
 /**
 * ✅ DATA CLEANUP: Remove salary records for non-active staff
 * Call this to clean up orphaned salary records for archived/exited staff
 */
 cleanupNonActiveStaff(): number {
 const activeStaff = staffService.getActive();
 const activeStaffIds = new Set(activeStaff.map(s => s.staffId));
 
 const salaryRecords = this.getAll();
 const before = salaryRecords.length;
 
 // Keep only salary records for active staff
 const cleaned = salaryRecords.filter(r => activeStaffIds.has(r.staffId));
 const after = cleaned.length;
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
 
 return before - after; // Return number of records removed
 }
}

// ============================================================================
// EXPORT
// ============================================================================

export const salaryScaleService = new SalaryScaleService();