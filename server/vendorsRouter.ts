import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { vendors, vendorQualificationScores, users, procurementPayables, checklistSectionTemplates } from "../drizzle/schema";
import { eq, and, isNull, like, or, sql, desc, asc } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

export const vendorsRouter = router({
  list: scopedProcedure
    .input(z.object({
      vendorType: z.enum(['supplier', 'contractor', 'service_provider', 'consultant', 'other']).optional(),
      isActive: z.boolean().optional(),
      isPreferred: z.boolean().optional(),
      isBlacklisted: z.boolean().optional(),
      search: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(vendors.organizationId, organizationId),
        isNull(vendors.deletedAt),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(vendors.operatingUnitId, operatingUnitId));
      }
      if (input.vendorType) {
        conditions.push(eq(vendors.vendorType, input.vendorType));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(vendors.isActive, input.isActive));
      }
      if (input.isPreferred !== undefined) {
        conditions.push(eq(vendors.isPreferred, input.isPreferred));
      }
      if (input.isBlacklisted !== undefined) {
        conditions.push(eq(vendors.isBlacklisted, input.isBlacklisted));
      }
      if (input.search) {
        conditions.push(or(
          like(vendors.vendorCode, `%${input.search}%`),
          like(vendors.name, `%${input.search}%`),
          like(vendors.nameAr, `%${input.search}%`),
          like(vendors.email, `%${input.search}%`),
          like(vendors.phone, `%${input.search}%`)
        )!);
      }
      
      const [vendorList, countResult] = await Promise.all([
        db.select().from(vendors)
          .where(and(...conditions))
          .orderBy(asc(vendors.name))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: sql<number>`count(*)` }).from(vendors)
          .where(and(...conditions)),
      ]);
      
      return {
        vendors: vendorList,
        total: countResult[0]?.count || 0,
      };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const result = await db.select().from(vendors)
        .where(and(
          eq(vendors.id, input.id),
          eq(vendors.organizationId, organizationId),
          isNull(vendors.deletedAt)
        ))
        .limit(1);
      return result[0] || null;
    }),

  create: scopedProcedure
    .input(z.object({
      vendorCode: z.string().min(1).max(50),
      name: z.string().min(1).max(255),
      nameAr: z.string().max(255).optional(),
      vendorType: z.enum(['supplier', 'contractor', 'service_provider', 'consultant', 'other']).default('supplier'),
      taxId: z.string().max(50).optional(),
      registrationNumber: z.string().max(100).optional(),
      contactPerson: z.string().max(255).optional(),
      email: z.string().email().max(255).optional(),
      phone: z.string().max(50).optional(),
      mobile: z.string().max(50).optional(),
      fax: z.string().max(50).optional(),
      website: z.string().max(255).optional(),
      addressLine1: z.string().max(255).optional(),
      addressLine2: z.string().max(255).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
      bankName: z.string().max(255).optional(),
      bankBranch: z.string().max(255).optional(),
      bankAccountNumber: z.string().max(100).optional(),
      bankAccountName: z.string().max(255).optional(),
      iban: z.string().max(50).optional(),
      swiftCode: z.string().max(20).optional(),
      currencyId: z.number().optional(),
      paymentTerms: z.string().max(100).optional(),
      creditLimit: z.string().optional(),
      glAccountId: z.number().optional(),
      isActive: z.boolean().default(true),
      isPreferred: z.boolean().default(false),
      isBlacklisted: z.boolean().default(false),
      blacklistReason: z.string().optional(),
      notes: z.string().optional(),
      attachments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const result = await db.insert(vendors).values({
        ...input,
        organizationId,
        operatingUnitId: operatingUnitId || null,
        currentBalance: '0.00',
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      return { id: Number(result.insertId), success: true };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      vendorCode: z.string().min(1).max(50).optional(),
      name: z.string().min(1).max(255).optional(),
      nameAr: z.string().max(255).optional().nullable(),
      vendorType: z.enum(['supplier', 'contractor', 'service_provider', 'consultant', 'other']).optional(),
      taxId: z.string().max(50).optional().nullable(),
      registrationNumber: z.string().max(100).optional().nullable(),
      contactPerson: z.string().max(255).optional().nullable(),
      email: z.string().email().max(255).optional().nullable(),
      phone: z.string().max(50).optional().nullable(),
      mobile: z.string().max(50).optional().nullable(),
      fax: z.string().max(50).optional().nullable(),
      website: z.string().max(255).optional().nullable(),
      addressLine1: z.string().max(255).optional().nullable(),
      addressLine2: z.string().max(255).optional().nullable(),
      city: z.string().max(100).optional().nullable(),
      state: z.string().max(100).optional().nullable(),
      country: z.string().max(100).optional().nullable(),
      postalCode: z.string().max(20).optional().nullable(),
      bankName: z.string().max(255).optional().nullable(),
      bankBranch: z.string().max(255).optional().nullable(),
      bankAccountNumber: z.string().max(100).optional().nullable(),
      bankAccountName: z.string().max(255).optional().nullable(),
      iban: z.string().max(50).optional().nullable(),
      swiftCode: z.string().max(20).optional().nullable(),
      currencyId: z.number().optional().nullable(),
      paymentTerms: z.string().max(100).optional().nullable(),
      creditLimit: z.string().optional().nullable(),
      glAccountId: z.number().optional().nullable(),
      isActive: z.boolean().optional(),
      isPreferred: z.boolean().optional(),
      isBlacklisted: z.boolean().optional(),
      blacklistReason: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      attachments: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const { id, ...updateData } = input;
      await db.update(vendors)
        .set({ ...updateData, updatedBy: ctx.user?.id })
        .where(and(
          eq(vendors.id, id),
          eq(vendors.organizationId, organizationId)
        ));
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      // Soft delete
      await db.update(vendors)
        .set({ 
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(vendors.id, input.id),
          eq(vendors.organizationId, organizationId)
        ));
      return { success: true };
    }),

  // Toggle blacklist status
  toggleBlacklist: scopedProcedure
    .input(z.object({
      id: z.number(),
      isBlacklisted: z.boolean(),
      blacklistReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      await db.update(vendors)
        .set({ 
          isBlacklisted: input.isBlacklisted,
          blacklistReason: input.isBlacklisted ? input.blacklistReason : null,
          updatedBy: ctx.user?.id,
        })
        .where(and(
          eq(vendors.id, input.id),
          eq(vendors.organizationId, organizationId)
        ));
      return { success: true };
    }),

  // Toggle preferred status
  togglePreferred: scopedProcedure
    .input(z.object({
      id: z.number(),
      isPreferred: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      await db.update(vendors)
        .set({ 
          isPreferred: input.isPreferred,
          updatedBy: ctx.user?.id,
        })
        .where(and(
          eq(vendors.id, input.id),
          eq(vendors.organizationId, organizationId)
        ));
      return { success: true };
    }),

  // Get vendors for dropdown
  getForDropdown: scopedProcedure
    .input(z.object({
      vendorType: z.enum(['supplier', 'contractor', 'service_provider', 'consultant', 'other']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(vendors.organizationId, organizationId),
        eq(vendors.isActive, true),
        eq(vendors.isBlacklisted, false),
        isNull(vendors.deletedAt),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(vendors.operatingUnitId, operatingUnitId));
      }
      if (input.vendorType) {
        conditions.push(eq(vendors.vendorType, input.vendorType));
      }
      
      return db.select({
        id: vendors.id,
        vendorCode: vendors.vendorCode,
        name: vendors.name,
        nameAr: vendors.nameAr,
        vendorType: vendors.vendorType,
      }).from(vendors)
        .where(and(...conditions))
        .orderBy(asc(vendors.name));
    }),

  // Generate next vendor code
  generateCode: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const result = await db.select({ 
        maxCode: sql<string>`MAX(vendorCode)` 
      }).from(vendors)
        .where(eq(vendors.organizationId, organizationId));
      
      const maxCode = result[0]?.maxCode;
      if (!maxCode) {
        return 'VND-0001';
      }
      
      // Extract number from code like VND-0001
      const match = maxCode.match(/VND-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        return `VND-${nextNum.toString().padStart(4, '0')}`;
      }
      
      return 'VND-0001';
    }),

  // Bulk import vendors
  bulkImport: scopedProcedure
    .input(z.object({
      vendors: z.array(z.object({
        vendorCode: z.string().min(1).max(50),
        name: z.string().min(1).max(255),
        nameAr: z.string().max(255).optional(),
        vendorType: z.enum(['supplier', 'contractor', 'service_provider', 'consultant', 'other']).default('supplier'),
        taxId: z.string().max(50).optional(),
        registrationNumber: z.string().max(100).optional(),
        contactPerson: z.string().max(255).optional(),
        email: z.string().max(255).optional(),
        phone: z.string().max(50).optional(),
        mobile: z.string().max(50).optional(),
        addressLine1: z.string().max(255).optional(),
        city: z.string().max(100).optional(),
        country: z.string().max(100).optional(),
        bankName: z.string().max(255).optional(),
        bankAccountNumber: z.string().max(100).optional(),
        iban: z.string().max(50).optional(),
        swiftCode: z.string().max(20).optional(),
        paymentTerms: z.string().max(100).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const results = {
        success: 0,
        failed: 0,
        errors: [] as { row: number; vendorCode: string; error: string }[],
      };
      
      for (let i = 0; i < input.vendors.length; i++) {
        const vendor = input.vendors[i];
        try {
          // Check for duplicate vendor code
          const existing = await db.select().from(vendors)
            .where(and(
              eq(vendors.organizationId, organizationId),
              eq(vendors.vendorCode, vendor.vendorCode),
              isNull(vendors.deletedAt)
            ))
            .limit(1);
          
          if (existing.length > 0) {
            results.failed++;
            results.errors.push({
              row: i + 1,
              vendorCode: vendor.vendorCode,
              error: 'Vendor code already exists',
            });
            continue;
          }
          
          await db.insert(vendors).values({
            organizationId,
            operatingUnitId: operatingUnitId || null,
            ...vendor,
            currentBalance: '0.00',
            isActive: true,
            isPreferred: false,
            isBlacklisted: false,
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            vendorCode: vendor.vendorCode,
            error: error.message || 'Unknown error',
          });
        }
      }
      
      return results;
    }),

  // Export vendors to CSV format
  exportData: scopedProcedure
    .input(z.object({
      vendorType: z.enum(['supplier', 'contractor', 'service_provider', 'consultant', 'other']).optional(),
      isActive: z.boolean().optional(),
      format: z.enum(['csv', 'template']).default('csv'),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      
      // If template format, return empty template structure
      if (input.format === 'template') {
        return {
          headers: [
            'vendorCode', 'name', 'nameAr', 'vendorType', 'taxId', 'registrationNumber',
            'contactPerson', 'email', 'phone', 'mobile', 'addressLine1', 'city', 'country',
            'bankName', 'bankAccountNumber', 'iban', 'swiftCode', 'paymentTerms'
          ],
          rows: [],
          templateNotes: [
            'vendorCode: Required, unique identifier (e.g., VND-0001)',
            'name: Required, vendor name in English',
            'nameAr: Optional, vendor name in Arabic',
            'vendorType: supplier, contractor, service_provider, consultant, or other',
            'taxId: Tax identification number',
            'registrationNumber: Business registration number',
            'contactPerson: Primary contact name',
            'email: Contact email address',
            'phone: Office phone number',
            'mobile: Mobile phone number',
            'addressLine1: Street address',
            'city: City name',
            'country: Country name',
            'bankName: Bank name for payments',
            'bankAccountNumber: Bank account number',
            'iban: International Bank Account Number',
            'swiftCode: SWIFT/BIC code',
            'paymentTerms: Payment terms (e.g., Net 30)',
          ],
        };
      }
      
      // Export actual data
      const conditions = [
        eq(vendors.organizationId, organizationId),
        isNull(vendors.deletedAt),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(vendors.operatingUnitId, operatingUnitId));
      }
      if (input.vendorType) {
        conditions.push(eq(vendors.vendorType, input.vendorType));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(vendors.isActive, input.isActive));
      }
      
      const vendorList = await db.select().from(vendors)
        .where(and(...conditions))
        .orderBy(asc(vendors.vendorCode));
      
      const headers = [
        'vendorCode', 'name', 'nameAr', 'vendorType', 'taxId', 'registrationNumber',
        'contactPerson', 'email', 'phone', 'mobile', 'addressLine1', 'addressLine2',
        'city', 'state', 'country', 'postalCode', 'bankName', 'bankBranch',
        'bankAccountNumber', 'bankAccountName', 'iban', 'swiftCode', 'paymentTerms',
        'creditLimit', 'isActive', 'isPreferred', 'isBlacklisted', 'notes'
      ];
      
      const rows = vendorList.map(v => ({
        vendorCode: v.vendorCode,
        name: v.name,
        nameAr: v.nameAr || '',
        vendorType: v.vendorType,
        taxId: v.taxId || '',
        registrationNumber: v.registrationNumber || '',
        contactPerson: v.contactPerson || '',
        email: v.email || '',
        phone: v.phone || '',
        mobile: v.mobile || '',
        addressLine1: v.addressLine1 || '',
        addressLine2: v.addressLine2 || '',
        city: v.city || '',
        state: v.state || '',
        country: v.country || '',
        postalCode: v.postalCode || '',
        bankName: v.bankName || '',
        bankBranch: v.bankBranch || '',
        bankAccountNumber: v.bankAccountNumber || '',
        bankAccountName: v.bankAccountName || '',
        iban: v.iban || '',
        swiftCode: v.swiftCode || '',
        paymentTerms: v.paymentTerms || '',
        creditLimit: v.creditLimit || '',
        isActive: v.isActive ? 'Yes' : 'No',
        isPreferred: v.isPreferred ? 'Yes' : 'No',
        isBlacklisted: v.isBlacklisted ? 'Yes' : 'No',
        notes: v.notes || '',
      }));
      
      return { headers, rows };
    }),

  getStatistics: scopedProcedure
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(vendors.organizationId, organizationId),
        isNull(vendors.deletedAt),
      ];
      if (operatingUnitId) {
        conditions.push(eq(vendors.operatingUnitId, operatingUnitId));
      }

      const allVendors = await db
        .select()
        .from(vendors)
        .where(and(...conditions));

      const totalVendors = allVendors.length;
      const activeVendors = allVendors.filter(v => v.isActive).length;
      const blacklistedVendors = allVendors.filter(v => v.isBlacklisted).length;
      const pendingApproval = allVendors.filter(v => !v.isActive && !v.isBlacklisted).length;
      const financiallyActiveVendors = activeVendors; // placeholder

      // Category breakdowns
      const suppliers = allVendors.filter(v => v.vendorType === 'supplier');
      const contractors = allVendors.filter(v => v.vendorType === 'contractor');
      const serviceProviders = allVendors.filter(v => v.vendorType === 'service_provider');

      // Fetch payables data from procurement_payables table
      const payablesConditions = [
        eq(procurementPayables.organizationId, organizationId),
        isNull(procurementPayables.deletedAt),
      ];
      if (operatingUnitId) {
        payablesConditions.push(eq(procurementPayables.operatingUnitId, operatingUnitId));
      }
      const payablesData = await db
        .select({
          totalPayables: sql<string>`COALESCE(SUM(${procurementPayables.totalAmount}), 0)`,
          pendingPayments: sql<number>`COUNT(CASE WHEN ${procurementPayables.status} IN ('pending_invoice','pending_approval','pending_payment','pending_grn') THEN 1 END)`,
        })
        .from(procurementPayables)
        .where(and(...payablesConditions));

      const totalPayables = parseFloat(payablesData[0]?.totalPayables || '0');
      const pendingPayments = payablesData[0]?.pendingPayments || 0;

      return {
        totalVendors,
        activeVendors,
        financiallyActiveVendors,
        pendingApproval,
        blacklistedVendors,
        totalPayables,
        pendingPayments,
        suppliers: {
          total: suppliers.length,
          active: suppliers.filter(v => v.isActive).length,
        },
        contractors: {
          total: contractors.length,
          active: contractors.filter(v => v.isActive).length,
        },
        serviceProviders: {
          total: serviceProviders.length,
          active: serviceProviders.filter(v => v.isActive).length,
        },
      };
    }),

  // ── Vendor Qualification (Layer 1) ──

  /** Get qualification scores for a vendor */
  getQualification: scopedProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const [qualification] = await db.select()
        .from(vendorQualificationScores)
        .where(and(
          eq(vendorQualificationScores.vendorId, input.vendorId),
          eq(vendorQualificationScores.organizationId, organizationId),
          eq(vendorQualificationScores.isDeleted, 0)
        ))
        .orderBy(desc(vendorQualificationScores.version))
        .limit(1);
      return qualification || null;
    }),

  /** Save or update vendor qualification scores */
  saveQualification: scopedProcedure
    .input(z.object({
      vendorId: z.number(),
      evaluationDate: z.string(),
      // Section 1: Legal & Administrative (max 12)
      s1_companyRegistration: z.number().min(0).max(2).default(0),
      s1_taxCard: z.number().min(0).max(2).default(0),
      s1_insuranceCard: z.number().min(0).max(2).default(0),
      s1_signedDeclarations: z.number().min(0).max(3).default(0),
      s1_sanctionsScreening: z.number().min(0).max(3).default(0),
      // Section 2: Experience & Technical Capacity (max 10)
      s2_companyProfile: z.number().min(0).max(3).default(0),
      s2_yearsExperience: z.number().min(0).max(4).default(0),
      s2_ingoExperience: z.number().min(0).max(3).default(0),
      // Section 3: Operational Presence (max 2)
      s3_targetGeography: z.number().min(0).max(1).default(0),
      s3_bankAccountDetails: z.number().min(0).max(1).default(0),
      // Section 4: References (max 6)
      s4_references: z.number().min(0).max(6).default(0),
      notes: z.string().optional(),
      validityMonths: z.number().min(1).max(60).default(12),
      customSections: z.array(z.object({
        label: z.string(),
        labelAr: z.string().optional(),
        maxTotal: z.number(),
        items: z.array(z.object({
          label: z.string(),
          labelAr: z.string().optional(),
          maxScore: z.number(),
          score: z.number(),
          mandatory: z.boolean().default(false),
          details: z.string().optional(),
          detailsAr: z.string().optional(),
        })),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Calculate section totals
      const section1Total = input.s1_companyRegistration + input.s1_taxCard + input.s1_insuranceCard + input.s1_signedDeclarations + input.s1_sanctionsScreening;
      const section2Total = input.s2_companyProfile + input.s2_yearsExperience + input.s2_ingoExperience;
      const section3Total = input.s3_targetGeography + input.s3_bankAccountDetails;
      const section4Total = input.s4_references;
      const totalScore = section1Total + section2Total + section3Total + section4Total;

      // Determine qualification status (>= 20/30 = qualified, >= 15 = conditional, < 15 = not_qualified)
      let qualificationStatus: 'qualified' | 'not_qualified' | 'conditional' | 'pending' = 'pending';
      if (totalScore >= 20) qualificationStatus = 'qualified';
      else if (totalScore >= 15) qualificationStatus = 'conditional';
      else qualificationStatus = 'not_qualified';

      // Check if existing qualification exists
      const [existing] = await db.select()
        .from(vendorQualificationScores)
        .where(and(
          eq(vendorQualificationScores.vendorId, input.vendorId),
          eq(vendorQualificationScores.organizationId, organizationId),
          eq(vendorQualificationScores.isDeleted, 0)
        ))
        .orderBy(desc(vendorQualificationScores.version))
        .limit(1);

      const data = {
        vendorId: input.vendorId,
        organizationId,
        operatingUnitId: operatingUnitId || null,
        evaluatorId: ctx.user.id,
        evaluationDate: new Date(input.evaluationDate),
        s1_companyRegistration: input.s1_companyRegistration.toString(),
        s1_taxCard: input.s1_taxCard.toString(),
        s1_insuranceCard: input.s1_insuranceCard.toString(),
        s1_signedDeclarations: input.s1_signedDeclarations.toString(),
        s1_sanctionsScreening: input.s1_sanctionsScreening.toString(),
        section1Total: section1Total.toString(),
        s2_companyProfile: input.s2_companyProfile.toString(),
        s2_yearsExperience: input.s2_yearsExperience.toString(),
        s2_ingoExperience: input.s2_ingoExperience.toString(),
        section2Total: section2Total.toString(),
        s3_targetGeography: input.s3_targetGeography.toString(),
        s3_bankAccountDetails: input.s3_bankAccountDetails.toString(),
        section3Total: section3Total.toString(),
        s4_references: input.s4_references.toString(),
        section4Total: section4Total.toString(),
        totalScore: totalScore.toString(),
        qualificationStatus,
        notes: input.notes || null,
        customSections: input.customSections ? JSON.stringify(input.customSections) : null,
        validityMonths: input.validityMonths,
        expiryDate: new Date(new Date(input.evaluationDate).getTime() + input.validityMonths * 30 * 24 * 60 * 60 * 1000),
        approvalStatus: 'draft',
        currentApprovalStage: 'draft',
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      };

      if (existing) {
        // Update existing record
        await db.update(vendorQualificationScores)
          .set({
            ...data,
            version: existing.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(vendorQualificationScores.id, existing.id));
        return { id: existing.id, totalScore, qualificationStatus, updated: true };
      } else {
        // Insert new record
        const [result] = await db.insert(vendorQualificationScores).values(data);
        return { id: Number(result.insertId), totalScore, qualificationStatus, updated: false };
      }
    }),

  /** Submit qualification for approval workflow (simplified: Draft → Logistics → Manager → Approved) */
  submitForApproval: scopedProcedure
    .input(z.object({
      qualificationId: z.number(),
      signatureDataUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const [qual] = await db.select().from(vendorQualificationScores)
        .where(and(
          eq(vendorQualificationScores.id, input.qualificationId),
          eq(vendorQualificationScores.organizationId, organizationId)
        ));
      if (!qual) throw new Error('Qualification not found');
      if (qual.approvalStatus !== 'draft' && qual.approvalStatus !== 'rejected') {
        throw new Error('Only draft or rejected qualifications can be submitted');
      }
      // Get vendor name for notification
      const [vendor] = await db.select({ name: vendors.name, vendorCode: vendors.vendorCode })
        .from(vendors).where(eq(vendors.id, qual.vendorId));
      const vendorLabel = vendor ? `${vendor.name} (${vendor.vendorCode})` : `Vendor #${qual.vendorId}`;

      // Handle submitter signature upload
      let signatureUrl: string | undefined;
      let signatureHash: string | undefined;
      if (input.signatureDataUrl) {
        const base64Data = input.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const crypto = await import('crypto');
        signatureHash = crypto.createHash('sha256').update(buffer).digest('hex');
        const fileKey = `qual-signatures/submit-${input.qualificationId}-${Date.now()}.png`;
        const { storagePut } = await import('./storage');
        const { url } = await storagePut(fileKey, buffer, 'image/png');
        signatureUrl = url;
      }

      const updateData: any = {
        approvalStatus: 'pending_logistics',
        currentApprovalStage: 'logistics',
        updatedBy: ctx.user.id,
      };

      await db.update(vendorQualificationScores)
        .set(updateData)
        .where(eq(vendorQualificationScores.id, input.qualificationId));

      // Send notification to Logistics
      try {
        await notifyOwner({
          title: `🔔 Vendor Qualification Submitted: ${vendorLabel}`,
          content: `A vendor qualification for ${vendorLabel} (Score: ${qual.totalScore}/30) has been submitted for Logistics review by ${ctx.user.name || ctx.user.email}.\n\nPlease review and approve/reject in the Approval Workflow page.`,
        });
      } catch (e) { console.warn('[Notification] submitForApproval notification failed:', e); }

      return { success: true, stage: 'pending_logistics', signatureUrl };
    }),

  /** Approve a qualification at the current stage (simplified 2-stage: Logistics → Manager) */
  approveQualificationStage: scopedProcedure
    .input(z.object({
      qualificationId: z.number(),
      notes: z.string().optional(),
      signatureDataUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const [qual] = await db.select().from(vendorQualificationScores)
        .where(and(
          eq(vendorQualificationScores.id, input.qualificationId),
          eq(vendorQualificationScores.organizationId, organizationId)
        ));
      if (!qual) throw new Error('Qualification not found');

      // Simplified 2-stage flow
      const stageFlow: Record<string, { approvedByCol: string, approvedAtCol: string, notesCol: string, sigUrlCol: string, sigHashCol: string, nextStatus: string, nextStage: string }> = {
        'pending_logistics': { approvedByCol: 'logisticsApprovedBy', approvedAtCol: 'logisticsApprovedAt', notesCol: 'logisticsNotes', sigUrlCol: 'logisticsSignatureUrl', sigHashCol: 'logisticsSignatureHash', nextStatus: 'pending_manager', nextStage: 'manager' },
        'pending_manager': { approvedByCol: 'managerApprovedBy', approvedAtCol: 'managerApprovedAt', notesCol: 'managerNotes', sigUrlCol: 'managerSignatureUrl', sigHashCol: 'managerSignatureHash', nextStatus: 'approved', nextStage: 'completed' },
      };

      const currentStage = stageFlow[qual.approvalStatus];
      if (!currentStage) throw new Error(`Cannot approve at status: ${qual.approvalStatus}`);

      // Handle signature upload
      let signatureUrl: string | undefined;
      let signatureHash: string | undefined;
      if (input.signatureDataUrl) {
        const base64Data = input.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const crypto = await import('crypto');
        signatureHash = crypto.createHash('sha256').update(buffer).digest('hex');
        const stage = qual.approvalStatus === 'pending_logistics' ? 'logistics' : 'manager';
        const fileKey = `qual-signatures/${stage}-${input.qualificationId}-${Date.now()}.png`;
        const { storagePut } = await import('./storage');
        const { url } = await storagePut(fileKey, buffer, 'image/png');
        signatureUrl = url;
      }

      const updateData: any = {
        approvalStatus: currentStage.nextStatus,
        currentApprovalStage: currentStage.nextStage,
        [currentStage.approvedByCol]: ctx.user.id,
        [currentStage.approvedAtCol]: new Date(),
        updatedBy: ctx.user.id,
      };
      if (input.notes) {
        updateData[currentStage.notesCol] = input.notes;
      }
      if (signatureUrl) {
        updateData[currentStage.sigUrlCol] = signatureUrl;
      }
      if (signatureHash) {
        updateData[currentStage.sigHashCol] = signatureHash;
      }

      await db.update(vendorQualificationScores)
        .set(updateData)
        .where(eq(vendorQualificationScores.id, input.qualificationId));

      // Get vendor name for notification
      const [vendor] = await db.select({ name: vendors.name, vendorCode: vendors.vendorCode })
        .from(vendors).where(eq(vendors.id, qual.vendorId));
      const vendorLabel = vendor ? `${vendor.name} (${vendor.vendorCode})` : `Vendor #${qual.vendorId}`;

      // Send notification for the next stage
      const stageLabels: Record<string, { en: string; emoji: string }> = {
        'pending_manager': { en: 'Manager Approval', emoji: '👔' },
        'approved': { en: 'Fully Approved', emoji: '✅' },
      };
      const nextLabel = stageLabels[currentStage.nextStatus] || { en: currentStage.nextStage, emoji: '📋' };

      try {
        if (currentStage.nextStatus === 'approved') {
          await notifyOwner({
            title: `${nextLabel.emoji} Vendor Qualification Approved: ${vendorLabel}`,
            content: `The vendor qualification for ${vendorLabel} (Score: ${qual.totalScore}/30) has completed all approval stages and is now FULLY APPROVED.\n\nApproved by: ${ctx.user.name || ctx.user.email}\nWorkflow: Logistics ✓ → Manager ✓`,
          });
        } else {
          await notifyOwner({
            title: `${nextLabel.emoji} Vendor Qualification → ${nextLabel.en}: ${vendorLabel}`,
            content: `The vendor qualification for ${vendorLabel} (Score: ${qual.totalScore}/30) has been approved at Logistics and moved to ${nextLabel.en}.\n\nApproved by: ${ctx.user.name || ctx.user.email}${input.notes ? `\nNotes: ${input.notes}` : ''}\n\nPlease review in the Approval Workflow page.`,
          });
        }
      } catch (e) { console.warn('[Notification] approveStage notification failed:', e); }

      return { success: true, nextStatus: currentStage.nextStatus, nextStage: currentStage.nextStage };
    }),

  /** Reject a qualification at any stage */
  rejectQualificationStage: scopedProcedure
    .input(z.object({
      qualificationId: z.number(),
      notes: z.string().min(1, 'Rejection reason is required'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const [qual] = await db.select().from(vendorQualificationScores)
        .where(and(
          eq(vendorQualificationScores.id, input.qualificationId),
          eq(vendorQualificationScores.organizationId, organizationId)
        ));
      if (!qual) throw new Error('Qualification not found');

      // Store rejection notes in the current stage's notes column
      const stageNotesMap: Record<string, string> = {
        'pending_logistics': 'logisticsNotes',
        'pending_manager': 'managerNotes',
        // Legacy support
        'pending_procurement': 'procurementNotes',
        'pending_compliance': 'complianceNotes',
        'pending_finance': 'financeNotes',
        'pending_final': 'finalNotes',
      };
      const notesCol = stageNotesMap[qual.approvalStatus];
      const updateData: any = {
        approvalStatus: 'rejected',
        currentApprovalStage: qual.currentApprovalStage,
        updatedBy: ctx.user.id,
      };
      if (notesCol) {
        updateData[notesCol] = `REJECTED: ${input.notes}`;
      }

      await db.update(vendorQualificationScores)
        .set(updateData)
        .where(eq(vendorQualificationScores.id, input.qualificationId));

      // Get vendor name for notification
      const [vendor] = await db.select({ name: vendors.name, vendorCode: vendors.vendorCode })
        .from(vendors).where(eq(vendors.id, qual.vendorId));
      const vendorLabel = vendor ? `${vendor.name} (${vendor.vendorCode})` : `Vendor #${qual.vendorId}`;

      // Send rejection notification
      try {
        await notifyOwner({
          title: `❌ Vendor Qualification Rejected: ${vendorLabel}`,
          content: `The vendor qualification for ${vendorLabel} (Score: ${qual.totalScore}/30) has been REJECTED at the ${qual.currentApprovalStage || 'current'} stage.\n\nRejected by: ${ctx.user.name || ctx.user.email}\nReason: ${input.notes}\n\nThe qualification can be resubmitted after corrections.`,
        });
      } catch (e) { console.warn('[Notification] rejectStage notification failed:', e); }

      return { success: true };
    }),

  /** List all qualifications with approval status for the workflow page */
  listQualificationsForApproval: scopedProcedure
    .input(z.object({
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(vendorQualificationScores.organizationId, organizationId),
        eq(vendorQualificationScores.isDeleted, 0),
      ];
      const results = await db.select({
        id: vendorQualificationScores.id,
        vendorId: vendorQualificationScores.vendorId,
        evaluationDate: vendorQualificationScores.evaluationDate,
        totalScore: vendorQualificationScores.totalScore,
        qualificationStatus: vendorQualificationScores.qualificationStatus,
        approvalStatus: vendorQualificationScores.approvalStatus,
        currentApprovalStage: vendorQualificationScores.currentApprovalStage,
        expiryDate: vendorQualificationScores.expiryDate,
        validityMonths: vendorQualificationScores.validityMonths,
        // Legacy columns
        procurementApprovedBy: vendorQualificationScores.procurementApprovedBy,
        procurementApprovedAt: vendorQualificationScores.procurementApprovedAt,
        procurementNotes: vendorQualificationScores.procurementNotes,
        complianceApprovedBy: vendorQualificationScores.complianceApprovedBy,
        complianceApprovedAt: vendorQualificationScores.complianceApprovedAt,
        complianceNotes: vendorQualificationScores.complianceNotes,
        financeApprovedBy: vendorQualificationScores.financeApprovedBy,
        financeApprovedAt: vendorQualificationScores.financeApprovedAt,
        financeNotes: vendorQualificationScores.financeNotes,
        finalApprovedBy: vendorQualificationScores.finalApprovedBy,
        finalApprovedAt: vendorQualificationScores.finalApprovedAt,
        finalNotes: vendorQualificationScores.finalNotes,
        // Simplified workflow columns
        logisticsApprovedBy: vendorQualificationScores.logisticsApprovedBy,
        logisticsApprovedAt: vendorQualificationScores.logisticsApprovedAt,
        logisticsNotes: vendorQualificationScores.logisticsNotes,
        logisticsSignatureUrl: vendorQualificationScores.logisticsSignatureUrl,
        logisticsSignatureHash: vendorQualificationScores.logisticsSignatureHash,
        managerApprovedBy: vendorQualificationScores.managerApprovedBy,
        managerApprovedAt: vendorQualificationScores.managerApprovedAt,
        managerNotes: vendorQualificationScores.managerNotes,
        managerSignatureUrl: vendorQualificationScores.managerSignatureUrl,
        managerSignatureHash: vendorQualificationScores.managerSignatureHash,
        version: vendorQualificationScores.version,
        createdAt: vendorQualificationScores.createdAt,
        vendorName: vendors.name,
        vendorCode: vendors.vendorCode,
      })
        .from(vendorQualificationScores)
        .innerJoin(vendors, eq(vendors.id, vendorQualificationScores.vendorId))
        .where(and(...conditions))
        .orderBy(desc(vendorQualificationScores.updatedAt));
      return results;
    }),

  /** Get expiring qualifications (within 30, 60, 90 days) */
  getExpiringQualifications: scopedProcedure
    .input(z.object({ daysAhead: z.number().default(90) }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + input.daysAhead);
      const now = new Date();

      const results = await db.select({
        id: vendorQualificationScores.id,
        vendorId: vendorQualificationScores.vendorId,
        expiryDate: vendorQualificationScores.expiryDate,
        totalScore: vendorQualificationScores.totalScore,
        qualificationStatus: vendorQualificationScores.qualificationStatus,
        approvalStatus: vendorQualificationScores.approvalStatus,
        validityMonths: vendorQualificationScores.validityMonths,
        vendorName: vendors.name,
        vendorCode: vendors.vendorCode,
      })
        .from(vendorQualificationScores)
        .innerJoin(vendors, eq(vendors.id, vendorQualificationScores.vendorId))
        .where(and(
          eq(vendorQualificationScores.organizationId, organizationId),
          eq(vendorQualificationScores.isDeleted, 0),
          sql`${vendorQualificationScores.expiryDate} IS NOT NULL`,
          sql`${vendorQualificationScores.expiryDate} <= ${futureDate}`,
        ))
        .orderBy(asc(vendorQualificationScores.expiryDate));

      // Categorize: expired, expiring_soon (30 days), expiring_warning (60 days), expiring_notice (90 days)
      return results.map(r => {
        const expiry = r.expiryDate ? new Date(r.expiryDate) : null;
        let urgency = 'notice';
        if (expiry) {
          const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 0) urgency = 'expired';
          else if (daysLeft <= 30) urgency = 'critical';
          else if (daysLeft <= 60) urgency = 'warning';
          else urgency = 'notice';
        }
        return { ...r, urgency, daysLeft: expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null };
      });
    }),

  /** Get qualification scores for multiple vendors (for bid evaluation auto-sync) */
  getQualificationBatch: scopedProcedure
    .input(z.object({ vendorIds: z.array(z.number()) }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();

      if (input.vendorIds.length === 0) return {};

      const results = await db.select()
        .from(vendorQualificationScores)
        .where(and(
          eq(vendorQualificationScores.organizationId, organizationId),
          eq(vendorQualificationScores.isDeleted, 0),
          sql`${vendorQualificationScores.vendorId} IN (${sql.join(input.vendorIds.map(id => sql`${id}`), sql`, `)})`
        ));

      // Build map: vendorId -> latest qualification
      const qualMap: Record<number, typeof results[0]> = {};
      for (const r of results) {
        if (!qualMap[r.vendorId] || r.version > qualMap[r.vendorId].version) {
          qualMap[r.vendorId] = r;
        }
      }
      return qualMap;
    }),

  /** Get performance tracking data for the hub cards */
  getPerformanceTracking: scopedProcedure
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Build vendor conditions
      const vendorConditions = [
        eq(vendors.organizationId, organizationId),
        isNull(vendors.deletedAt),
      ];
      if (operatingUnitId) {
        vendorConditions.push(eq(vendors.operatingUnitId, operatingUnitId));
      }

      // Get all active vendors
      const allVendors = await db.select({
        id: vendors.id,
        name: vendors.name,
        vendorCode: vendors.vendorCode,
        vendorType: vendors.vendorType,
        isBlacklisted: vendors.isBlacklisted,
        blacklistReason: vendors.blacklistReason,
        performanceRating: vendors.performanceRating,
      }).from(vendors).where(and(...vendorConditions));

      // Get all qualification scores
      const qualConditions = [
        eq(vendorQualificationScores.organizationId, organizationId),
        eq(vendorQualificationScores.isDeleted, 0),
      ];
      const allQualScores = await db.select({
        vendorId: vendorQualificationScores.vendorId,
        totalScore: vendorQualificationScores.totalScore,
        qualificationStatus: vendorQualificationScores.qualificationStatus,
        version: vendorQualificationScores.version,
        evaluationDate: vendorQualificationScores.evaluationDate,
      }).from(vendorQualificationScores).where(and(...qualConditions));

      // Build latest qualification map
      const qualMap: Record<number, { totalScore: string | null; qualificationStatus: string | null; evaluationDate: string | null }> = {};
      for (const q of allQualScores) {
        if (!qualMap[q.vendorId] || (q.version > (qualMap[q.vendorId] as any).version || 0)) {
          qualMap[q.vendorId] = q;
        }
      }

      // Get all performance evaluations
      const { vendorPerformanceEvaluations } = await import('../drizzle/schema');
      const perfConditions = [
        eq(vendorPerformanceEvaluations.organizationId, organizationId),
      ];
      const allPerfEvals = await db.select({
        vendorId: vendorPerformanceEvaluations.vendorId,
        overallScore: vendorPerformanceEvaluations.overallScore,
        evaluationDate: vendorPerformanceEvaluations.evaluationDate,
      }).from(vendorPerformanceEvaluations).where(and(...perfConditions));

      // Build latest performance map
      const perfMap: Record<number, { overallScore: string | null; evaluationDate: string | null }> = {};
      for (const p of allPerfEvals) {
        if (!perfMap[p.vendorId] || (p.evaluationDate && (!perfMap[p.vendorId].evaluationDate || p.evaluationDate > perfMap[p.vendorId].evaluationDate!))) {
          perfMap[p.vendorId] = p;
        }
      }

      // Categorize vendors
      const topPerformers: Array<{ id: number; name: string; vendorCode: string; qualScore: number | null; perfScore: number | null; reason: string }> = [];
      const pendingEvaluation: Array<{ id: number; name: string; vendorCode: string; vendorType: string | null }> = [];
      const blacklisted: Array<{ id: number; name: string; vendorCode: string; reason: string | null }> = [];

      for (const v of allVendors) {
        // Blacklisted
        if (v.isBlacklisted) {
          blacklisted.push({ id: v.id, name: v.name, vendorCode: v.vendorCode, reason: v.blacklistReason });
          continue;
        }

        const qual = qualMap[v.id];
        const perf = perfMap[v.id];
        const qualScore = qual?.totalScore ? Number(qual.totalScore) : null;
        const perfScore = perf?.overallScore ? Number(perf.overallScore) : null;

        // Top Performers: qualification ≥ 85% (25.5/30) OR performance ≥ 8.5/10
        const isTopByQual = qualScore !== null && qualScore >= 25.5;
        const isTopByPerf = perfScore !== null && perfScore >= 8.5;
        if (isTopByQual || isTopByPerf) {
          const reasons: string[] = [];
          if (isTopByQual) reasons.push(`Qualification: ${qualScore}/30`);
          if (isTopByPerf) reasons.push(`Performance: ${perfScore}/10`);
          topPerformers.push({
            id: v.id,
            name: v.name,
            vendorCode: v.vendorCode,
            qualScore,
            perfScore,
            reason: reasons.join(' | '),
          });
          continue;
        }

        // Pending: no qualification AND no performance evaluation
        if (qualScore === null && perfScore === null) {
          pendingEvaluation.push({
            id: v.id,
            name: v.name,
            vendorCode: v.vendorCode,
            vendorType: v.vendorType,
          });
        }
      }

      return {
        topPerformers,
        pendingEvaluation,
        blacklisted,
        totalVendors: allVendors.length,
      };
    }),

  /** List all vendors with their latest qualification data (for Qualification List page) */
  listVendorsWithQualification: scopedProcedure
    .input(z.object({
      vendorType: z.enum(['supplier', 'contractor', 'service_provider', 'consultant', 'other']).optional(),
      qualificationStatus: z.enum(['not_evaluated', 'draft', 'qualified', 'conditional', 'not_qualified', 'rejected']).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Build vendor conditions
      const vendorConditions = [
        eq(vendors.organizationId, organizationId),
        isNull(vendors.deletedAt),
      ];
      if (operatingUnitId) {
        vendorConditions.push(eq(vendors.operatingUnitId, operatingUnitId));
      }
      if (input.vendorType) {
        vendorConditions.push(eq(vendors.vendorType, input.vendorType));
      }
      if (input.search) {
        vendorConditions.push(or(
          like(vendors.vendorCode, `%${input.search}%`),
          like(vendors.name, `%${input.search}%`),
          like(vendors.nameAr, `%${input.search}%`)
        )!);
      }

      // Fetch all vendors
      const allVendors = await db.select({
        id: vendors.id,
        vendorCode: vendors.vendorCode,
        name: vendors.name,
        nameAr: vendors.nameAr,
        vendorType: vendors.vendorType,
        isActive: vendors.isActive,
        isBlacklisted: vendors.isBlacklisted,
        createdAt: vendors.createdAt,
      }).from(vendors).where(and(...vendorConditions)).orderBy(asc(vendors.name));

      // Fetch latest qualification for each vendor
      const qualConditions = [
        eq(vendorQualificationScores.organizationId, organizationId),
        eq(vendorQualificationScores.isDeleted, 0),
      ];
      const allQuals = await db.select({
        vendorId: vendorQualificationScores.vendorId,
        totalScore: vendorQualificationScores.totalScore,
        qualificationStatus: vendorQualificationScores.qualificationStatus,
        evaluationDate: vendorQualificationScores.evaluationDate,
        expiryDate: vendorQualificationScores.expiryDate,
        approvalStatus: vendorQualificationScores.approvalStatus,
        version: vendorQualificationScores.version,
      }).from(vendorQualificationScores).where(and(...qualConditions));

      // Build latest qualification map (latest version per vendor)
      const qualMap: Record<number, typeof allQuals[0]> = {};
      for (const q of allQuals) {
        if (!qualMap[q.vendorId] || q.version > qualMap[q.vendorId].version) {
          qualMap[q.vendorId] = q;
        }
      }

      // Merge vendors with qualification data
      const result = allVendors.map(v => {
        const qual = qualMap[v.id];
        let effectiveStatus = 'not_evaluated';
        if (qual) {
          if (qual.approvalStatus === 'rejected') {
            effectiveStatus = 'rejected';
          } else if (qual.approvalStatus === 'draft') {
            effectiveStatus = 'draft';
          } else {
            effectiveStatus = qual.qualificationStatus || 'not_evaluated';
          }
        }
        return {
          id: v.id,
          vendorCode: v.vendorCode,
          name: v.name,
          nameAr: v.nameAr,
          vendorType: v.vendorType,
          isActive: v.isActive,
          isBlacklisted: v.isBlacklisted,
          createdAt: v.createdAt,
          qualificationStatus: effectiveStatus,
          totalScore: qual ? Number(qual.totalScore) : null,
          evaluationDate: qual?.evaluationDate || null,
          expiryDate: qual?.expiryDate || null,
          approvalStatus: qual?.approvalStatus || null,
        };
      });

      // Apply qualification status filter
      if (input.qualificationStatus) {
        return result.filter(v => v.qualificationStatus === input.qualificationStatus);
      }

      return result;
    }),

  // ── Score Dashboard Data ──────────────────────────────────────────
  qualificationScoreDashboard: scopedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const organizationId = ctx.scope.organizationId;

      // Get all qualification scores with vendor info
      const scores = await db
        .select({
          id: vendorQualificationScores.id,
          vendorId: vendorQualificationScores.vendorId,
          vendorName: vendors.name,
          vendorCode: vendors.vendorCode,
          vendorType: vendors.vendorType,
          totalScore: vendorQualificationScores.totalScore,
          qualificationStatus: vendorQualificationScores.qualificationStatus,
          approvalStatus: vendorQualificationScores.approvalStatus,
          evaluationDate: vendorQualificationScores.evaluationDate,
          expiryDate: vendorQualificationScores.expiryDate,
          section1Total: vendorQualificationScores.section1Total,
          section2Total: vendorQualificationScores.section2Total,
          section3Total: vendorQualificationScores.section3Total,
          section4Total: vendorQualificationScores.section4Total,
          version: vendorQualificationScores.version,
          evaluatorId: vendorQualificationScores.evaluatorId,
          evaluatorName: users.name,
          createdAt: vendorQualificationScores.createdAt,
          notes: vendorQualificationScores.notes,
        })
        .from(vendorQualificationScores)
        .leftJoin(vendors, eq(vendors.id, vendorQualificationScores.vendorId))
        .leftJoin(users, eq(users.id, vendorQualificationScores.evaluatorId))
        .where(
          and(
            eq(vendorQualificationScores.organizationId, organizationId),
            eq(vendorQualificationScores.isDeleted, 0)
          )
        )
        .orderBy(desc(vendorQualificationScores.createdAt));

      // Get latest evaluation per vendor for the dashboard
      const latestByVendor: Record<number, typeof scores[0]> = {};
      for (const s of scores) {
        if (!latestByVendor[s.vendorId]) {
          latestByVendor[s.vendorId] = s;
        }
      }
      const latestScores = Object.values(latestByVendor);

      // Calculate classification counts based on totalScore (max 30)
      let preferred = 0, approved = 0, conditional = 0, rejected = 0;
      for (const s of latestScores) {
        const pct = (Number(s.totalScore) / 30) * 100;
        if (pct >= 85) preferred++;
        else if (pct >= 70) approved++;
        else if (pct >= 50) conditional++;
        else rejected++;
      }

      return {
        stats: { total: latestScores.length, preferred, approved, conditional, rejected },
        vendors: latestScores.map(s => ({
          ...s,
          totalScore: Number(s.totalScore),
          section1Total: Number(s.section1Total || 0),
          section2Total: Number(s.section2Total || 0),
          section3Total: Number(s.section3Total || 0),
          section4Total: Number(s.section4Total || 0),
          scorePercentage: Math.round((Number(s.totalScore) / 30) * 100 * 10) / 10,
        })),
      };
    }),

  // ── Evaluation History Data ────────────────────────────────────────
  qualificationHistory: scopedProcedure
    .input(z.object({
      qualificationStatus: z.enum(['qualified', 'not_qualified', 'conditional', 'pending']).optional(),
      approvalStatus: z.enum(['draft', 'pending_procurement', 'pending_compliance', 'pending_finance', 'pending_final', 'pending_logistics', 'pending_manager', 'approved', 'rejected']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const organizationId = ctx.scope.organizationId;

      const conditions: any[] = [
        eq(vendorQualificationScores.organizationId, organizationId),
        eq(vendorQualificationScores.isDeleted, 0),
      ];
      if (input?.qualificationStatus) {
        conditions.push(eq(vendorQualificationScores.qualificationStatus, input.qualificationStatus));
      }
      if (input?.approvalStatus) {
        conditions.push(eq(vendorQualificationScores.approvalStatus, input.approvalStatus));
      }

      const records = await db
        .select({
          id: vendorQualificationScores.id,
          vendorId: vendorQualificationScores.vendorId,
          vendorName: vendors.name,
          vendorCode: vendors.vendorCode,
          vendorType: vendors.vendorType,
          totalScore: vendorQualificationScores.totalScore,
          qualificationStatus: vendorQualificationScores.qualificationStatus,
          approvalStatus: vendorQualificationScores.approvalStatus,
          evaluationDate: vendorQualificationScores.evaluationDate,
          expiryDate: vendorQualificationScores.expiryDate,
          section1Total: vendorQualificationScores.section1Total,
          section2Total: vendorQualificationScores.section2Total,
          section3Total: vendorQualificationScores.section3Total,
          section4Total: vendorQualificationScores.section4Total,
          version: vendorQualificationScores.version,
          evaluatorId: vendorQualificationScores.evaluatorId,
          evaluatorName: users.name,
          createdAt: vendorQualificationScores.createdAt,
          updatedAt: vendorQualificationScores.updatedAt,
          notes: vendorQualificationScores.notes,
        })
        .from(vendorQualificationScores)
        .leftJoin(vendors, eq(vendors.id, vendorQualificationScores.vendorId))
        .leftJoin(users, eq(users.id, vendorQualificationScores.evaluatorId))
        .where(and(...conditions))
        .orderBy(desc(vendorQualificationScores.evaluationDate));

      return records.map(r => ({
        ...r,
        totalScore: Number(r.totalScore),
        section1Total: Number(r.section1Total || 0),
        section2Total: Number(r.section2Total || 0),
        section3Total: Number(r.section3Total || 0),
        section4Total: Number(r.section4Total || 0),
        scorePercentage: Math.round((Number(r.totalScore) / 30) * 100 * 10) / 10,
      }));
    }),

  // ── Checklist Section Templates ──

  listTemplates: scopedProcedure
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(checklistSectionTemplates.organizationId, organizationId),
        isNull(checklistSectionTemplates.deletedAt),
      ];
      if (operatingUnitId) {
        conditions.push(eq(checklistSectionTemplates.operatingUnitId, operatingUnitId));
      }
      return db.select().from(checklistSectionTemplates).where(and(...conditions)).orderBy(desc(checklistSectionTemplates.createdAt));
    }),

  createTemplate: scopedProcedure
    .input(z.object({
      templateName: z.string().min(1),
      templateNameAr: z.string().optional(),
      description: z.string().optional(),
      sections: z.array(z.object({
        name: z.string(),
        nameAr: z.string().optional(),
        maxScore: z.number(),
        criteria: z.array(z.object({
          name: z.string(),
          nameAr: z.string().optional(),
          maxScore: z.number(),
        })),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const [result] = await db.insert(checklistSectionTemplates).values({
        organizationId,
        operatingUnitId: operatingUnitId || undefined,
        templateName: input.templateName,
        templateNameAr: input.templateNameAr || null,
        description: input.description || null,
        sections: input.sections,
        createdBy: ctx.user.id,
      });
      return { id: result.insertId };
    }),

  deleteTemplate: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db.update(checklistSectionTemplates)
        .set({ deletedAt: new Date().toISOString(), deletedBy: ctx.user.id })
        .where(eq(checklistSectionTemplates.id, input.id));
      return { success: true };
    }),

  // ── Export Procedures ──

  exportQualificationRegister: scopedProcedure
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(vendors.organizationId, organizationId),
        isNull(vendors.deletedAt),
      ];
      if (operatingUnitId) {
        conditions.push(eq(vendors.operatingUnitId, operatingUnitId));
      }
      const allVendors = await db.select().from(vendors).where(and(...conditions));
      const qualifications = await db.select().from(vendorQualificationScores).where(
        and(
          eq(vendorQualificationScores.organizationId, organizationId),
          eq(vendorQualificationScores.isDeleted, 0)
        )
      );

      // Build latest qualification per vendor
      const latestQual = new Map<number, typeof qualifications[0]>();
      for (const q of qualifications) {
        const existing = latestQual.get(q.vendorId);
        if (!existing || (q.version || 0) > (existing.version || 0)) {
          latestQual.set(q.vendorId, q);
        }
      }

      return allVendors.map(v => {
        const q = latestQual.get(v.id);
        return {
          vendorCode: v.vendorCode,
          name: v.name,
          nameAr: v.nameAr,
          vendorType: v.vendorType,
          status: q?.status || 'not_evaluated',
          totalScore: q ? Number(q.totalScore) : null,
          classification: q?.classification || null,
          evaluationDate: q?.evaluationDate || null,
          expiryDate: q?.expiryDate || null,
          evaluatorName: q?.evaluatorName || null,
          section1Total: q ? Number(q.section1Total) : null,
          section2Total: q ? Number(q.section2Total) : null,
          section3Total: q ? Number(q.section3Total) : null,
          section4Total: q ? Number(q.section4Total) : null,
          customSections: q?.customSections || null,
        };
      });
    }),

  exportChecklist: scopedProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const [vendor] = await db.select().from(vendors).where(
        and(eq(vendors.id, input.vendorId), eq(vendors.organizationId, organizationId))
      );
      const [qualification] = await db.select().from(vendorQualificationScores).where(
        and(
          eq(vendorQualificationScores.vendorId, input.vendorId),
          eq(vendorQualificationScores.organizationId, organizationId),
          eq(vendorQualificationScores.isDeleted, 0)
        )
      ).orderBy(desc(vendorQualificationScores.version)).limit(1);

      return {
        vendor: vendor ? {
          vendorCode: vendor.vendorCode,
          name: vendor.name,
          nameAr: vendor.nameAr,
          vendorType: vendor.vendorType,
        } : null,
        qualification: qualification ? {
          totalScore: Number(qualification.totalScore),
          classification: qualification.classification,
          status: qualification.status,
          evaluationDate: qualification.evaluationDate,
          expiryDate: qualification.expiryDate,
          evaluatorName: qualification.evaluatorName,
          section1Total: Number(qualification.section1Total),
          section2Total: Number(qualification.section2Total),
          section3Total: Number(qualification.section3Total),
          section4Total: Number(qualification.section4Total),
          customSections: qualification.customSections,
          comments: qualification.comments,
        } : null,
      };
    }),
});
