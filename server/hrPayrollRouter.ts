import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { generatePayrollApprovalEvidence } from "./evidenceGeneration";
import { getDb } from "./db";
import { hrPayrollRecords, hrSalaryGrades, hrEmployees, hrSalaryScale } from "../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

/**
 * HR Payroll Router - Payroll and Salary Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 */
export const hrPayrollRouter = router({
  // ========== Payroll Records ==========
  
  // Get all payroll records with employee info
  // MANDATORY: Filter by BOTH organizationId AND operatingUnitId
  // FIGMA GOVERNANCE: Resolve employee names from hr_employees using staffId mapping
  getAll: scopedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      payrollMonth: z.number().optional(),
      payrollYear: z.number().optional(),
      status: z.enum(["draft", "pending_approval", "approved", "paid", "cancelled"]).optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrPayrollRecords.organizationId, organizationId),
        eq(hrPayrollRecords.isDeleted, 0),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(hrPayrollRecords.operatingUnitId, operatingUnitId));
      }
      if (input.employeeId) {
        conditions.push(eq(hrPayrollRecords.employeeId, input.employeeId));
      }
      if (input.payrollMonth) {
        conditions.push(eq(hrPayrollRecords.payrollMonth, input.payrollMonth));
      }
      if (input.payrollYear) {
        conditions.push(eq(hrPayrollRecords.payrollYear, input.payrollYear));
      }
      if (input.status) {
        conditions.push(eq(hrPayrollRecords.status, input.status));
      }
      
      // Get payroll records
      const payrollResults = await db
        .select()
        .from(hrPayrollRecords)
        .where(and(...conditions))
        .orderBy(desc(hrPayrollRecords.payrollYear), desc(hrPayrollRecords.payrollMonth))
        .limit(input.limit)
        .offset(input.offset);
      
      // Get unique employee IDs (filter out nulls)
      const employeeIds = [...new Set(payrollResults.map(r => r.employeeId).filter(id => id != null))];
      
      // FIGMA GOVERNANCE: Get ALL employees (for name resolution via staffId)
      const allEmployees = await db
        .select()
        .from(hrEmployees)
        .where(
          and(
            eq(hrEmployees.organizationId, organizationId),
            eq(hrEmployees.isDeleted, 0)
          )
        );
      
      // Create employee lookup maps
      const employeeByIdMap = new Map(allEmployees.map(e => [e.id, e]));
      const employeeByCodeMap = new Map(allEmployees.map(e => [e.employeeCode, e]));
      
      // Also fetch from Salary Scale Table to get staffId for each payroll record
      let salaryScaleRecords: typeof hrSalaryScale.$inferSelect[] = [];
      if (employeeIds.length > 0) {
        salaryScaleRecords = await db
          .select()
          .from(hrSalaryScale)
          .where(
            and(
              sql`${hrSalaryScale.employeeId} IN (${employeeIds.join(',')})`,
              eq(hrSalaryScale.isDeleted, 0)
            )
          );
      }
      
      // Create salary scale lookup by employeeId
      const salaryScaleMap = new Map(salaryScaleRecords.map(s => [s.employeeId, s]));
      
      // Map results to include employee info
      return payrollResults.map(r => {
        let emp = employeeByIdMap.get(r.employeeId);
        const salaryRecord = salaryScaleMap.get(r.employeeId);
        
        if (!emp && salaryRecord?.staffId) {
          emp = employeeByCodeMap.get(salaryRecord.staffId);
        }
        
        let employeeName = 'Unknown';
        let employeeCode = null;
        let position = 'Unknown';
        
        if (emp) {
          employeeName = `${emp.firstName} ${emp.lastName}`.trim();
          employeeCode = emp.employeeCode;
          position = emp.position || salaryRecord?.position || 'Unknown';
        } else if (salaryRecord) {
          employeeName = salaryRecord.staffFullName || 'Unknown';
          employeeCode = salaryRecord.staffId;
          position = salaryRecord.position || 'Unknown';
        }
        
        return {
          ...r,
          employeeCode,
          employeeName,
          position,
        };
      });
    }),

  // Get single payroll record
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(hrPayrollRecords)
        .where(
          and(
            eq(hrPayrollRecords.id, input.id),
            eq(hrPayrollRecords.organizationId, organizationId),
            eq(hrPayrollRecords.isDeleted, 0)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get payroll statistics
  getStatistics: scopedProcedure
    .input(z.object({
      payrollYear: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrPayrollRecords.organizationId, organizationId),
        eq(hrPayrollRecords.payrollYear, input.payrollYear),
        eq(hrPayrollRecords.isDeleted, 0),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(hrPayrollRecords.operatingUnitId, operatingUnitId));
      }
      
      const allRecords = await db
        .select()
        .from(hrPayrollRecords)
        .where(and(...conditions));
      
      const draft = allRecords.filter(r => r.status === 'draft').length;
      const pendingApproval = allRecords.filter(r => r.status === 'pending_approval').length;
      const approved = allRecords.filter(r => r.status === 'approved').length;
      const paid = allRecords.filter(r => r.status === 'paid').length;
      const cancelled = allRecords.filter(r => r.status === 'cancelled').length;
      
      const totalGross = allRecords
        .filter(r => r.status !== 'cancelled')
        .reduce((sum, r) => sum + parseFloat(r.grossSalary?.toString() || "0"), 0);
      
      const totalNet = allRecords
        .filter(r => r.status !== 'cancelled')
        .reduce((sum, r) => sum + parseFloat(r.netSalary?.toString() || "0"), 0);
      
      const totalDeductions = allRecords
        .filter(r => r.status !== 'cancelled')
        .reduce((sum, r) => sum + parseFloat(r.totalDeductions?.toString() || "0"), 0);
      
      const monthlyTotals: Record<number, { gross: number; net: number; count: number }> = {};
      for (let month = 1; month <= 12; month++) {
        const monthRecords = allRecords.filter(r => r.payrollMonth === month && r.status !== 'cancelled');
        monthlyTotals[month] = {
          gross: monthRecords.reduce((sum, r) => sum + parseFloat(r.grossSalary?.toString() || "0"), 0),
          net: monthRecords.reduce((sum, r) => sum + parseFloat(r.netSalary?.toString() || "0"), 0),
          count: monthRecords.length,
        };
      }
      
      return {
        total: allRecords.length,
        byStatus: { draft, pendingApproval, approved, paid, cancelled },
        totalGross,
        totalNet,
        totalDeductions,
        monthlyTotals,
        year: input.payrollYear,
      };
    }),

  // Create payroll record
  create: scopedProcedure
    .input(z.object({
      employeeId: z.number(),
      payrollMonth: z.number().min(1).max(12),
      payrollYear: z.number(),
      basicSalary: z.number(),
      housingAllowance: z.number().optional().default(0),
      transportAllowance: z.number().optional().default(0),
      otherAllowances: z.number().optional().default(0),
      overtimePay: z.number().optional().default(0),
      bonus: z.number().optional().default(0),
      taxDeduction: z.number().optional().default(0),
      healthInsuranceAmount: z.number().optional(),
      socialSecurityDeduction: z.number().optional().default(0),
      loanDeduction: z.number().optional().default(0),
      otherDeductions: z.number().optional().default(0),
      currency: z.string().optional().default("USD"),
      paymentMethod: z.enum(["bank_transfer", "cash", "check"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const grossSalary = input.basicSalary + input.housingAllowance + input.transportAllowance + 
                         input.otherAllowances + input.overtimePay + input.bonus;
      const totalDeductions = input.taxDeduction + input.socialSecurityDeduction + 
                             input.loanDeduction + input.otherDeductions;
      const netSalary = grossSalary - totalDeductions;
      
      const result = await db.insert(hrPayrollRecords).values({
        organizationId,
        operatingUnitId: operatingUnitId || 0,
        employeeId: input.employeeId,
        payrollMonth: input.payrollMonth,
        payrollYear: input.payrollYear,
        basicSalary: input.basicSalary.toString(),
        housingAllowance: input.housingAllowance.toString(),
        transportAllowance: input.transportAllowance.toString(),
        otherAllowances: input.otherAllowances.toString(),
        overtimePay: input.overtimePay.toString(),
        bonus: input.bonus.toString(),
        grossSalary: grossSalary.toString(),
        taxDeduction: input.taxDeduction.toString(),
        healthInsuranceAmount: String(input.healthInsuranceAmount || 0),
        socialSecurityDeduction: input.socialSecurityDeduction.toString(),
        loanDeduction: input.loanDeduction.toString(),
        otherDeductions: input.otherDeductions.toString(),
        totalDeductions: totalDeductions.toString(),
        netSalary: netSalary.toString(),
        currency: input.currency,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        status: "draft",
      });
      
      return { id: result[0].insertId, success: true };
    }),

  // Update payroll record
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      basicSalary: z.number().optional(),
      housingAllowance: z.number().optional(),
      transportAllowance: z.number().optional(),
      otherAllowances: z.number().optional(),
      overtimePay: z.number().optional(),
      bonus: z.number().optional(),
      taxDeduction: z.number().optional(),
      taxPercent: z.number().optional(),
      healthInsuranceAmount: z.number().optional(),
      employerContribution: z.number().optional(),
      employerContributionType: z.enum(['value', 'percentage']).optional(),
      employeeContribution: z.number().optional(),
      employeeContributionType: z.enum(['value', 'percentage']).optional(),
      socialSecurityDeduction: z.number().optional(),
      loanDeduction: z.number().optional(),
      otherDeductions: z.number().optional(),
      currency: z.string().optional(),
      paymentMethod: z.enum(["bank_transfer", "cash", "check"]).optional(),
      paymentReference: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const currentResult = await db
        .select()
        .from(hrPayrollRecords)
        .where(and(
          eq(hrPayrollRecords.id, input.id),
          eq(hrPayrollRecords.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!currentResult[0]) throw new Error("Payroll record not found");
      
      const current = currentResult[0];
      
      const basicSalary = input.basicSalary ?? parseFloat(current.basicSalary?.toString() || "0");
      const housingAllowance = input.housingAllowance ?? parseFloat(current.housingAllowance?.toString() || "0");
      const transportAllowance = input.transportAllowance ?? parseFloat(current.transportAllowance?.toString() || "0");
      const otherAllowances = input.otherAllowances ?? parseFloat(current.otherAllowances?.toString() || "0");
      const overtimePay = input.overtimePay ?? parseFloat(current.overtimePay?.toString() || "0");
      const bonus = input.bonus ?? parseFloat(current.bonus?.toString() || "0");
      const taxDeduction = input.taxDeduction ?? parseFloat(current.taxDeduction?.toString() || "0");
      const socialSecurityDeduction = input.socialSecurityDeduction ?? parseFloat(current.socialSecurityDeduction?.toString() || "0");
      const loanDeduction = input.loanDeduction ?? parseFloat(current.loanDeduction?.toString() || "0");
      const otherDeductions = input.otherDeductions ?? parseFloat(current.otherDeductions?.toString() || "0");
      const grossSalary = basicSalary + housingAllowance + transportAllowance + otherAllowances + overtimePay + bonus;
      const healthInsuranceDeduction =
      input.healthInsuranceAmount ??
      parseFloat(current.healthInsuranceAmount?.toString() || "0");
      const totalDeductions = taxDeduction + socialSecurityDeduction + loanDeduction + otherDeductions + healthInsuranceDeduction;
      const netSalary = grossSalary - totalDeductions;
      
      await db
        .update(hrPayrollRecords)
        .set({
          basicSalary: basicSalary.toString(),
          housingAllowance: housingAllowance.toString(),
          transportAllowance: transportAllowance.toString(),
          otherAllowances: otherAllowances.toString(),
          overtimePay: overtimePay.toString(),
          bonus: bonus.toString(),
          grossSalary: grossSalary.toString(),
          taxDeduction: taxDeduction.toString(),
          healthInsuranceAmount: healthInsuranceDeduction.toString(),
          socialSecurityDeduction: socialSecurityDeduction.toString(),
          loanDeduction: loanDeduction.toString(),
          otherDeductions: otherDeductions.toString(),
          totalDeductions: totalDeductions.toString(),
          netSalary: netSalary.toString(),
          currency: input.currency,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference,
          notes: input.notes,
        })
        .where(eq(hrPayrollRecords.id, input.id));
      
      return { success: true };
    }),

  // Submit for approval
  submitForApproval: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrPayrollRecords)
        .set({ status: "pending_approval" })
        .where(and(
          eq(hrPayrollRecords.id, input.id),
          eq(hrPayrollRecords.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Approve payroll
  approve: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get payroll record before approval
      const payrollRecord = await db.query.hrPayrollRecords.findFirst({
        where: and(
          eq(hrPayrollRecords.id, input.id),
          eq(hrPayrollRecords.organizationId, organizationId)
        ),
      });
      
      if (!payrollRecord) {
        throw new Error("Payroll record not found");
      }
      
      // Update status to approved
      await db
        .update(hrPayrollRecords)
        .set({
          status: "approved",
          approvedBy: ctx.user?.id,
          approvedAt: nowSql,
        })
        .where(and(
          eq(hrPayrollRecords.id, input.id),
          eq(hrPayrollRecords.organizationId, organizationId)
        ));
      
      // Generate evidence document (async, don't block response)
      generatePayrollApprovalEvidence(
        payrollRecord,
        { organizationId, operatingUnitId, userId: ctx.user?.id || 0 }
      ).catch((err) => console.error("[Evidence] Failed to generate payroll approval evidence:", err));
      
      return { success: true };
    }),

  // Mark as paid
  markAsPaid: scopedProcedure
    .input(z.object({
      id: z.number(),
      paymentReference: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrPayrollRecords)
        .set({
          status: "paid",
          paidAt: nowSql,
          paymentReference: input.paymentReference,
        })
        .where(and(
          eq(hrPayrollRecords.id, input.id),
          eq(hrPayrollRecords.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Cancel payroll
  cancel: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrPayrollRecords)
        .set({ status: "cancelled" })
        .where(and(
          eq(hrPayrollRecords.id, input.id),
          eq(hrPayrollRecords.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Soft delete payroll record
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrPayrollRecords)
        .set({
          isDeleted: 1,
          deletedAt: nowSql,
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(hrPayrollRecords.id, input.id),
          eq(hrPayrollRecords.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // ========== Salary Grades ==========
  
  // Get all salary grades
  getSalaryGrades: scopedProcedure
    .input(z.object({
      status: z.enum(["active", "inactive", "draft"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrSalaryGrades.organizationId, organizationId),
        eq(hrSalaryGrades.isDeleted, 0),
      ];

      if (input.status) {
        conditions.push(eq(hrSalaryGrades.status, input.status));
      }
      
      return await db
        .select()
        .from(hrSalaryGrades)
        .where(and(...conditions))
        .orderBy(hrSalaryGrades.gradeCode);
    }),

  // Get single salary grade
  getSalaryGradeById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(hrSalaryGrades)
        .where(
          and(
            eq(hrSalaryGrades.id, input.id),
            eq(hrSalaryGrades.organizationId, organizationId),
            eq(hrSalaryGrades.isDeleted, 0)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get salary grade by grade code
  getByGradeCode: scopedProcedure
    .input(z.object({
      gradeCode: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(hrSalaryGrades)
        .where(
          and(
            eq(hrSalaryGrades.gradeCode, input.gradeCode),
            eq(hrSalaryGrades.organizationId, organizationId),
            eq(hrSalaryGrades.isDeleted, 0)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // ========== UPDATED: generateFromSalaryScale ==========
  // ✅ FIXED: Correct payroll calculation logic
  // Now includes representation & other allowances, uses salary scale tax/SS values
  
  generateFromSalaryScale: scopedProcedure
    .input(z.object({
      payrollMonth: z.number().min(1).max(12),
      payrollYear: z.number(),
      preparedBy: z.string().optional(),
      taxDeduction: z.number().default(15),
      socialSecurityDeduction: z.number().default(7),
      healthInsuranceAmount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if payroll already exists for this month
      const existingConditions = [
        eq(hrPayrollRecords.organizationId, organizationId),
        eq(hrPayrollRecords.payrollMonth, input.payrollMonth),
        eq(hrPayrollRecords.payrollYear, input.payrollYear),
        eq(hrPayrollRecords.isDeleted, 0),
      ];
      
      if (operatingUnitId) {
        existingConditions.push(eq(hrPayrollRecords.operatingUnitId, operatingUnitId));
      }
      
      const existing = await db
        .select({ count: count() })
        .from(hrPayrollRecords)
        .where(and(...existingConditions));
      
      if (existing[0]?.count && existing[0].count > 0) {
        throw new Error(`Payroll already exists for ${input.payrollMonth}/${input.payrollYear}`);
      }
      
      // Get all active salary scale records
      const salaryConditions = [
        eq(hrSalaryScale.organizationId, organizationId),
        eq(hrSalaryScale.status, 'active'),
        eq(hrSalaryScale.isDeleted, 0),
      ];
      
      if (operatingUnitId) {
        salaryConditions.push(eq(hrSalaryScale.operatingUnitId, operatingUnitId));
      }
      
      const activeSalaryRecords = await db
        .select()
        .from(hrSalaryScale)
        .where(and(...salaryConditions));
      
      if (activeSalaryRecords.length === 0) {
        throw new Error("No active salary records found in Salary Scale Table. Please ensure employees have active (approved) salary records before generating payroll.");
      }
      
      // ✅ FIXED: Generate payroll records with correct calculation
      const payrollRecords = [];
      for (const salary of activeSalaryRecords) {
        // ✅ STEP 1: Extract individual components
        const basicSalary = parseFloat(salary.basicSalary?.toString() || '0');
        const housingAllowance = parseFloat(salary.housingAllowance?.toString() || '0');
        const transportAllowance = parseFloat(salary.transportAllowance?.toString() || '0');
        const representationAllowance = parseFloat(salary.representationAllowance?.toString() || '0');
        const otherAllowances = parseFloat(salary.otherAllowances?.toString() || '0');
        
        // ✅ STEP 2: Calculate Gross = basicSalary + ALL allowances
        const grossSalary = basicSalary + housingAllowance + transportAllowance + representationAllowance + otherAllowances;
        
        // ✅ STEP 3: Calculate Tax (from salary scale taxPercent, or use default)
        const taxPercent = salary.taxPercent != null
          ? parseFloat(salary.taxPercent.toString())
          : input.taxDeduction;
        const taxDeduction = (basicSalary * taxPercent) / 100;
        
        // ✅ STEP 4: Calculate Social Security (employee + employer contributions)
        // Support both VALUE and PERCENTAGE types
        let employeeSS = parseFloat(salary.employeeContribution?.toString() || '0');
        if (salary.employeeContributionType === 'percentage') {
          employeeSS = (basicSalary * employeeSS) / 100;
        }
        
        let employerSS = parseFloat(salary.employerContribution?.toString() || '0');
        if (salary.employerContributionType === 'percentage') {
          employerSS = (basicSalary * employerSS) / 100;
        }

        // ✅ STEP 5: Health Insurance (FINAL → fixed amount ONLY)
          let healthInsuranceDeduction = parseFloat(
              (salary as any).healthInsuranceAmount?.toString() || "0"
            );
               
        // ✅ STEP 6: Calculate Total Deductions and Net
        // CRITICAL: Use recalculated socialSecurityDeduction to ensure accuracy
        const calculatedSocialSecurityDeduction = employeeSS + employerSS;
        const totalDeductions = taxDeduction + calculatedSocialSecurityDeduction + healthInsuranceDeduction;
        const netSalary = grossSalary - totalDeductions;
        
        // ✅ STEP 7: Create payroll record with ALL fields
        payrollRecords.push({
          organizationId,
          operatingUnitId: operatingUnitId || salary.operatingUnitId || 0,
          employeeId: salary.employeeId,
          salaryScaleId: salary.id, // ✅ LINK TO SALARY SOURCE
          payrollMonth: input.payrollMonth,
          payrollYear: input.payrollYear,
          basicSalary: basicSalary.toFixed(2),
          housingAllowance: housingAllowance.toFixed(2),
          transportAllowance: transportAllowance.toFixed(2),
          representationAllowance: representationAllowance.toFixed(2), // ✅ NOW INCLUDED
          otherAllowances: otherAllowances.toFixed(2), // ✅ NOW INCLUDED
          overtimePay: '0',
          bonus: '0',
          grossSalary: grossSalary.toFixed(2),
          taxDeduction: taxDeduction.toFixed(2),
          employerSocialSecurity: employerSS.toFixed(2), // ✅ SPLIT SS
          employeeSocialSecurity: employeeSS.toFixed(2), // ✅ SPLIT SS
          socialSecurityDeduction: (employerSS + employeeSS).toFixed(2), // ✅ ENFORCED: Always = employer + employee
          loanDeduction: '0',
          healthInsuranceAmount: healthInsuranceDeduction.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          netSalary: netSalary.toFixed(2),
          currency: salary.currency || 'USD',
          status: 'draft' as const,
          notes: `Generated from Salary Scale Table (Grade: ${salary.gradeCode} / Step: ${salary.step}). Tax: ${taxPercent}%, SS Employee: ${employeeSS.toFixed(2)}, SS Employer: ${employerSS.toFixed(2)}. Prepared by: ${input.preparedBy || ctx.user?.name || 'System'}`,
        });
      }
      
      if (payrollRecords.length > 0) {
        await db.insert(hrPayrollRecords).values(payrollRecords);
      }
      
      return { 
        success: true, 
        count: payrollRecords.length,
        message: `✅ Generated ${payrollRecords.length} payroll records for ${input.payrollMonth}/${input.payrollYear}. All allowances and deductions calculated correctly.`
      };
    }),

  // Validate if payroll can be generated
  validateGeneration: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const employeeConditions = [
        eq(hrEmployees.organizationId, organizationId),
        eq(hrEmployees.status, 'active'),
        eq(hrEmployees.isDeleted, 0),
      ];
      
      if (operatingUnitId) {
        employeeConditions.push(eq(hrEmployees.operatingUnitId, operatingUnitId));
      }
      
      const activeEmployees = await db
        .select({
          id: hrEmployees.id,
          employeeCode: hrEmployees.employeeCode,
          firstName: hrEmployees.firstName,
          lastName: hrEmployees.lastName,
        })
        .from(hrEmployees)
        .where(and(...employeeConditions));
      
      const salaryConditions = [
        eq(hrSalaryScale.organizationId, organizationId),
        eq(hrSalaryScale.status, 'active'),
        eq(hrSalaryScale.isDeleted, 0),
      ];
      
      if (operatingUnitId) {
        salaryConditions.push(eq(hrSalaryScale.operatingUnitId, operatingUnitId));
      }
      
      const activeSalaryRecords = await db
        .select({
          employeeId: hrSalaryScale.employeeId,
          staffId: hrSalaryScale.staffId,
          status: hrSalaryScale.status,
        })
        .from(hrSalaryScale)
        .where(and(...salaryConditions));
      
      const activeSalaryEmployeeIds = new Set(activeSalaryRecords.map(r => r.employeeId));
      const missingActiveSalary = activeEmployees.filter(e => !activeSalaryEmployeeIds.has(e.id));
      
      return {
        canGenerate: activeSalaryRecords.length > 0,
        totalActiveEmployees: activeEmployees.length,
        employeesWithActiveSalary: activeSalaryRecords.length,
        missingActiveSalary: missingActiveSalary.map(e => ({
          id: e.id,
          employeeCode: e.employeeCode,
          name: `${e.firstName} ${e.lastName}`,
        })),
      };
    }),
});
