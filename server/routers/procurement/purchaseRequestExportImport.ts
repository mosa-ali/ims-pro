/**
 * Purchase Request Export/Import Router (CORRECTED)
 * 
 * tRPC procedures for:
 * 1. Export template (blank Excel)
 * 2. Export data (with actual PR data)
 * 3. Import from Excel (with transaction support)
 * 
 * FIXES:
 * - Transaction support for data integrity
 * - Proper MySQL insert handling (.insertId)
 * - Correct import paths
 * - Verified schema names
 */

import { z } from 'zod';
import { router, scopedProcedure } from '../../_core/trpc';
import { getDb } from '../../db';
import { eq, and, sql } from 'drizzle-orm';
import {
  purchaseRequests,
  purchaseRequestLineItems,
  financeCurrencies,
} from '../../../drizzle/schema';
import { TRPCError } from '@trpc/server';
import {
  generateExportTemplate,
  parseExcelFile,
  groupImportedRows,
  generatePRNumber,
  calculatePRTotal,
  calculatePRTotalUsd,
  calculateProcurementLadder,
} from '../../services/procurement/purchaseRequestExportImport';
import {
  PURCHASE_REQUEST_COLUMNS,
  getExportableColumns,
} from '../../../shared/importConfigs/purchaseRequestImportConfig';

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

export const purchaseRequestExportImportRouter = router({
  /**
   * Export blank template with instructions
   */
  exportTemplate: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      try {
        const buffer = await generateExportTemplate();
        const base64 = buffer.toString('base64');
        
        return {
          success: true,
          fileName: `PR_Template_${new Date().toISOString().split('T')[0]}.xlsx`,
          fileData: base64,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to generate template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Export actual PR data
   */
  exportData: scopedProcedure
    .input(z.object({
      limit: z.number().optional().default(1000),
      offset: z.number().optional().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      try {
        // Fetch PRs with line items
        const prs = await db
          .select()
          .from(purchaseRequests)
          .where(
            and(
              eq(purchaseRequests.organizationId, organizationId),
              sql`${purchaseRequests.isDeleted} = 0`
            )
          )
          .limit(input.limit)
          .offset(input.offset);

        if (!prs.length) {
          // Return empty file with headers only
          const ExcelJS = require('exceljs');
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Purchase Requests');
          const columns = getExportableColumns().map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 15,
          }));
          worksheet.columns = columns;

          const arrayBuffer = await workbook.xlsx.writeBuffer();
          const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
          const base64 = buffer.toString('base64');

          return {
            success: true,
            fileName: `PR_Export_${new Date().toISOString().split('T')[0]}.xlsx`,
            fileData: base64,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            rowsExported: 0,
          };
        }

        // Fetch line items for all PRs
        const lineItems = await db
          .select()
          .from(purchaseRequestLineItems)
          .where(
            sql`${purchaseRequestLineItems.purchaseRequestId} IN (${sql.raw(
              prs.map(p => p.id).join(',')
            )})`
          );

        // Build export rows
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Purchase Requests');
        const columns = getExportableColumns().map(col => ({
          header: col.header,
          key: col.key,
          width: col.width || 15,
        }));
        worksheet.columns = columns;

        let rowCount = 0;
        for (const pr of prs) {
          const prLineItems = lineItems.filter(li => li.purchaseRequestId === pr.id);

          if (prLineItems.length === 0) {
            // PR with no line items
            worksheet.addRow({
              prNumber: pr.prNumber,
              category: pr.category,
              projectTitle: pr.projectTitle,
              donorName: pr.donorName,
              budgetCode: pr.budgetCode,
              currency: pr.currency,
              exchangeRate: pr.exchangeRate,
              requesterName: pr.requesterName,
              requesterEmail: pr.requesterEmail,
              urgency: pr.urgency,
              procurementLadder: pr.procurementLadder,
              status: pr.status,
            });
            rowCount++;
          } else {
            // PR with line items
            for (const li of prLineItems) {
              worksheet.addRow({
                prNumber: pr.prNumber,
                category: pr.category,
                projectTitle: pr.projectTitle,
                donorName: pr.donorName,
                budgetCode: pr.budgetCode,
                currency: pr.currency,
                exchangeRate: pr.exchangeRate,
                requesterName: pr.requesterName,
                requesterEmail: pr.requesterEmail,
                urgency: pr.urgency,
                procurementLadder: pr.procurementLadder,
                status: pr.status,
                lineNumber: li.lineNumber,
                budgetLine: li.budgetLine,
                description: li.description,
                descriptionAr: li.descriptionAr,
                specifications: li.specifications,
                quantity: li.quantity,
                unit: li.unit,
                unitPrice: li.unitPrice,
                totalPrice: li.totalPrice,
                recurrence: li.recurrence,
              });
              rowCount++;
            }
          }
        }

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
        const base64 = buffer.toString('base64');

        return {
          success: true,
          fileName: `PR_Export_${new Date().toISOString().split('T')[0]}.xlsx`,
          fileData: base64,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          rowsExported: rowCount,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Import from Excel file
   * CRITICAL: Uses transaction to ensure data integrity
   */
  importFromExcel: scopedProcedure
    .input(
      z.object({
        fileData: z.string(), // Base64 encoded Excel file
        sheetName: z.string().optional().default('Purchase Requests'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      try {
        // Decode base64 to buffer
        const buffer = Buffer.from(input.fileData, 'base64');

        // Parse Excel file
        const rows = await parseExcelFile(buffer, input.sheetName);

        if (!rows.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No valid rows found in Excel file',
          });
        }

        // Group rows by importGroupId
        const groupedData = groupImportedRows(rows);

        // Validate currencies exist
        const currencyCodes = Array.from(
          new Set(Array.from(groupedData.values()).map(g => g.prHeader.currency))
        );
        const currencies = await db
          .select({ code: financeCurrencies.code })
          .from(financeCurrencies)
          .where(
            and(
              sql`${financeCurrencies.code} IN (${sql.raw(
                currencyCodes.map(c => `'${c}'`).join(',')
              )})`,
              eq(financeCurrencies.isActive, 1)
            )
          );

        const validCurrencies = new Set(currencies.map(c => c.code));
        for (const code of currencyCodes) {
          if (!validCurrencies.has(code)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Invalid currency: ${code}`,
            });
          }
        }

        // ====================================================================
        // TRANSACTION: Insert all PRs and line items atomically
        // ====================================================================
        const importedPRIds: number[] = [];

        await db.transaction(async tx => {
          for (const group of groupedData.values()) {
            const prHeader = group.prHeader;

            // Generate PR number
            const prNumber = generatePRNumber();

            // Insert PR
            const prResult = await tx.insert(purchaseRequests).values({
              prNumber,
              category: prHeader.category,
              projectTitle: prHeader.projectTitle,
              donorName: prHeader.donorName,
              budgetCode: prHeader.budgetCode,
              budgetTitle: prHeader.budgetTitle,
              subBudgetLine: prHeader.subBudgetLine,
              activityName: prHeader.activityName,
              totalBudgetLine: prHeader.totalBudgetLine,
              currency: prHeader.currency,
              exchangeRate: prHeader.exchangeRate || 1,
              exchangeTo: prHeader.exchangeTo,
              department: prHeader.department,
              requesterName: prHeader.requesterName,
              requesterEmail: prHeader.requesterEmail,
              neededByDate: prHeader.neededByDate,
              urgency: prHeader.urgency || 'normal',
              justification: prHeader.justification,
              procurementLadder: prHeader.procurementLadder,
              status: prHeader.status || 'draft',
              prDate: prHeader.prDate,
              prTotal: group.prTotal,
              prTotalUsd: group.prTotalUsd,
              organizationId,
              operatingUnitId,
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
              createdAt: nowSql,
              updatedAt: nowSql,
            });

            // Get inserted PR ID (MySQL returns insertId)
            const prId = (prResult as any).insertId;
            importedPRIds.push(prId);

            // Insert line items
            if (group.lineItems.length > 0) {
              await tx.insert(purchaseRequestLineItems).values(
                group.lineItems.map(li => ({
                  purchaseRequestId: prId,
                  lineNumber: li.lineNumber,
                  budgetLine: li.budgetLine,
                  description: li.description,
                  specifications: li.specifications,
                  quantity: li.quantity,
                  unit: li.unit,
                  unitPrice: li.unitPrice,
                  totalPrice: li.totalPrice,
                  recurrence: li.recurrence,
                  organizationId,
                  operatingUnitId,
                  createdBy: ctx.user.id,
                  updatedBy: ctx.user.id,
                }))
              );
            }
          }
        });

        return {
          success: true,
          message: `Successfully imported ${importedPRIds.length} purchase requests`,
          importedPRIds,
          rowsProcessed: rows.length,
          groupsCreated: groupedData.size,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});
