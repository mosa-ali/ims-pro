import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

/**
 * Bank Statement Import Router
 * 
 * Features:
 * - Parse CSV/Excel bank statements
 * - Auto-detect column mappings
 * - Match transactions to existing payments/expenditures
 * - Detect duplicates
 * - Bulk import with preview
 */

// Column mapping schema
const columnMappingSchema = z.object({
  dateColumn: z.string(),
  amountColumn: z.string(),
  descriptionColumn: z.string(),
  referenceColumn: z.string().optional(),
  balanceColumn: z.string().optional(),
});

// Transaction schema
const transactionSchema = z.object({
  date: z.string(),
  amount: z.string(),
  description: z.string(),
  reference: z.string().optional(),
  balance: z.string().optional(),
});

// Import preview item schema
const importPreviewSchema = z.object({
  transaction: transactionSchema,
  matchedPayment: z.any().optional(),
  matchedExpenditure: z.any().optional(),
  isDuplicate: z.boolean(),
  confidence: z.number(), // 0-100
});

export const bankStatementRouter = router({
  // Parse CSV/Excel file and detect columns
  parseFile: scopedProcedure
    .input(z.object({
      fileContent: z.string(), // Base64 encoded or raw CSV
      fileType: z.enum(['csv', 'excel']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { fileContent, fileType } = input;

      try {
        let rows: any[] = [];
        let headers: string[] = [];

        if (fileType === 'csv') {
          // Parse CSV
          const lines = fileContent.split('\n').filter(line => line.trim());
          if (lines.length === 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Empty file" });
          }

          // Extract headers
          headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          // Parse rows
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            rows.push(row);
          }
        } else {
          // For Excel, we expect pre-parsed JSON from frontend
          const data = JSON.parse(fileContent);
          headers = data.headers || [];
          rows = data.rows || [];
        }

        // Auto-detect column mappings
        const detectedMapping = detectColumnMapping(headers);

        return {
          headers,
          rows: rows.slice(0, 10), // Preview first 10 rows
          totalRows: rows.length,
          detectedMapping,
        };
      } catch (error: any) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Failed to parse file: ${error.message}` 
        });
      }
    }),

  // Preview import with matching
  previewImport: scopedProcedure
    .input(z.object({
      fileContent: z.string(),
      fileType: z.enum(['csv', 'excel']),
      columnMapping: columnMappingSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const { fileContent, fileType, columnMapping } = input;
      const db = getDb();

      try {
        // Parse file
        let rows: any[] = [];
        if (fileType === 'csv') {
          const lines = fileContent.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            rows.push(row);
          }
        } else {
          const data = JSON.parse(fileContent);
          rows = data.rows || [];
        }

        // Get existing payments and expenditures for matching
        const paymentsResult = await db.execute(
          sql`SELECT * FROM payments WHERE organizationId = ${organizationId} AND isLatestVersion = TRUE AND isDeleted = FALSE`
        );
        const payments = paymentsResult.rows;

        const expendituresResult = await db.execute(
          sql`SELECT * FROM expenditures WHERE organizationId = ${organizationId} AND isLatestVersion = TRUE AND isDeleted = FALSE`
        );
        const expenditures = expendituresResult.rows;

        // Process each transaction
        const preview: any[] = [];
        for (const row of rows) {
          const transaction = {
            date: row[columnMapping.dateColumn],
            amount: row[columnMapping.amountColumn],
            description: row[columnMapping.descriptionColumn],
            reference: columnMapping.referenceColumn ? row[columnMapping.referenceColumn] : undefined,
            balance: columnMapping.balanceColumn ? row[columnMapping.balanceColumn] : undefined,
          };

          // Skip empty rows
          if (!transaction.date || !transaction.amount) {
            continue;
          }

          // Match transaction to existing records
          const match = matchTransaction(transaction, payments, expenditures);

          preview.push({
            transaction,
            matchedPayment: match.payment,
            matchedExpenditure: match.expenditure,
            isDuplicate: match.isDuplicate,
            confidence: match.confidence,
          });
        }

        return {
          preview,
          totalTransactions: preview.length,
          matchedCount: preview.filter(p => p.matchedPayment || p.matchedExpenditure).length,
          duplicateCount: preview.filter(p => p.isDuplicate).length,
        };
      } catch (error: any) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Failed to preview import: ${error.message}` 
        });
      }
    }),

  // Execute bulk import
  executeImport: scopedProcedure
    .input(z.object({
      transactions: z.array(z.object({
        transaction: transactionSchema,
        createAsPayment: z.boolean(),
        createAsExpenditure: z.boolean(),
        linkToPaymentId: z.number().optional(),
        linkToExpenditureId: z.number().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const { transactions } = input;
      const db = getDb();

      let createdPayments = 0;
      let createdExpenditures = 0;
      let linkedRecords = 0;

      for (const item of transactions) {
        const { transaction, createAsPayment, createAsExpenditure, linkToPaymentId, linkToExpenditureId } = item;

        try {
          if (createAsPayment) {
            // Create new payment from transaction
            await db.execute(
              sql`INSERT INTO payments (
                organizationId, operatingUnitId, paymentNumber, paymentDate,
                totalAmount, description, reference, status, version, isLatestVersion, createdBy
              ) VALUES (
                ${organizationId}, ${operatingUnitId}, 
                ${`PAY-IMPORT-${Date.now()}`}, ${transaction.date},
                ${transaction.amount}, ${transaction.description}, ${transaction.reference || null},
                'DRAFT', 1, TRUE, ${ctx.user?.id || 1}
              )`
            );
            createdPayments++;
          }

          if (createAsExpenditure) {
            // Create new expenditure from transaction
            await db.execute(
              sql`INSERT INTO expenditures (
                organizationId, operatingUnitId, expenditureNumber, expenditureDate,
                vendorName, expenditureType, description, amount, status, version, isLatestVersion, createdBy
              ) VALUES (
                ${organizationId}, ${operatingUnitId},
                ${`EXP-IMPORT-${Date.now()}`}, ${transaction.date},
                'Imported Vendor', 'OPERATIONAL', ${transaction.description}, ${transaction.amount},
                'DRAFT', 1, TRUE, ${ctx.user?.id || 1}
              )`
            );
            createdExpenditures++;
          }

          if (linkToPaymentId) {
            // Update payment with bank reference
            await db.execute(
              sql`UPDATE payments SET 
                reference = ${transaction.reference || transaction.description},
                status = 'COMPLETED',
                updatedAt = NOW()
              WHERE id = ${linkToPaymentId}`
            );
            linkedRecords++;
          }

          if (linkToExpenditureId) {
            // Update expenditure with bank reference
            await db.execute(
              sql`UPDATE expenditures SET 
                status = 'PAID',
                updatedAt = NOW()
              WHERE id = ${linkToExpenditureId}`
            );
            linkedRecords++;
          }
        } catch (error: any) {
          console.error(`Failed to import transaction: ${error.message}`);
          // Continue with next transaction
        }
      }

      return {
        success: true,
        createdPayments,
        createdExpenditures,
        linkedRecords,
        totalProcessed: transactions.length,
      };
    }),

  // Get import history
  getImportHistory: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      
      // This would query an import_history table if we had one
      // For now, return empty array
      return [];
    }),
});

// Helper function to auto-detect column mappings
function detectColumnMapping(headers: string[]): any {
  const mapping: any = {};

  const lowerHeaders = headers.map(h => h.toLowerCase());

  // Detect date column
  const datePatterns = ['date', 'transaction date', 'posting date', 'value date'];
  for (const pattern of datePatterns) {
    const index = lowerHeaders.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      mapping.dateColumn = headers[index];
      break;
    }
  }

  // Detect amount column
  const amountPatterns = ['amount', 'debit', 'credit', 'value', 'transaction amount'];
  for (const pattern of amountPatterns) {
    const index = lowerHeaders.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      mapping.amountColumn = headers[index];
      break;
    }
  }

  // Detect description column
  const descPatterns = ['description', 'narration', 'details', 'particulars', 'memo'];
  for (const pattern of descPatterns) {
    const index = lowerHeaders.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      mapping.descriptionColumn = headers[index];
      break;
    }
  }

  // Detect reference column
  const refPatterns = ['reference', 'ref', 'check', 'cheque', 'transaction id'];
  for (const pattern of refPatterns) {
    const index = lowerHeaders.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      mapping.referenceColumn = headers[index];
      break;
    }
  }

  // Detect balance column
  const balPatterns = ['balance', 'running balance', 'closing balance'];
  for (const pattern of balPatterns) {
    const index = lowerHeaders.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      mapping.balanceColumn = headers[index];
      break;
    }
  }

  return mapping;
}

// Helper function to match transaction to existing records
function matchTransaction(
  transaction: any, 
  payments: any[], 
  expenditures: any[]
): { payment: any; expenditure: any; isDuplicate: boolean; confidence: number } {
  let matchedPayment = null;
  let matchedExpenditure = null;
  let isDuplicate = false;
  let maxConfidence = 0;

  const txAmount = parseFloat(transaction.amount.replace(/[^0-9.-]/g, ''));
  const txDate = new Date(transaction.date);

  // Match against payments
  for (const payment of payments) {
    const payAmount = parseFloat(payment.totalAmount || '0');
    const payDate = new Date(payment.paymentDate);
    
    // Check amount match
    const amountMatch = Math.abs(txAmount - payAmount) < 0.01;
    
    // Check date proximity (within 3 days)
    const dateDiff = Math.abs(txDate.getTime() - payDate.getTime()) / (1000 * 60 * 60 * 24);
    const dateMatch = dateDiff <= 3;
    
    // Check reference match
    const refMatch = transaction.reference && 
      payment.reference && 
      transaction.reference.toLowerCase().includes(payment.reference.toLowerCase());
    
    // Calculate confidence
    let confidence = 0;
    if (amountMatch) confidence += 40;
    if (dateMatch) confidence += 30;
    if (refMatch) confidence += 30;
    
    if (confidence > maxConfidence) {
      maxConfidence = confidence;
      matchedPayment = payment;
    }
    
    // Check for exact duplicate
    if (amountMatch && dateDiff < 1 && refMatch) {
      isDuplicate = true;
    }
  }

  // Match against expenditures
  for (const exp of expenditures) {
    const expAmount = parseFloat(exp.amount || '0');
    const expDate = new Date(exp.expenditureDate);
    
    const amountMatch = Math.abs(txAmount - expAmount) < 0.01;
    const dateDiff = Math.abs(txDate.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24);
    const dateMatch = dateDiff <= 3;
    
    let confidence = 0;
    if (amountMatch) confidence += 40;
    if (dateMatch) confidence += 30;
    
    if (confidence > maxConfidence) {
      maxConfidence = confidence;
      matchedExpenditure = exp;
      matchedPayment = null; // Prefer expenditure match
    }
  }

  return {
    payment: matchedPayment,
    expenditure: matchedExpenditure,
    isDuplicate,
    confidence: maxConfidence,
  };
}
