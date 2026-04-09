/**
 * Bank Statement Parser Service
 * 
 * Parses CSV and Excel files containing bank transactions
 * Supports intelligent column detection and validation
 */

import * as XLSX from 'xlsx';

export interface BankTransaction {
  date: Date | null;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number | null;
  rawRow: Record<string, any>;
}

export interface ParseResult {
  success: boolean;
  transactions: BankTransaction[];
  headers: string[];
  errors: string[];
  detectedColumns: {
    date?: string;
    description?: string;
    reference?: string;
    debit?: string;
    credit?: string;
    balance?: string;
  };
}

export interface ColumnMapping {
  date: string;
  description: string;
  reference?: string;
  debit: string;
  credit: string;
  balance?: string;
}

/**
 * Parse CSV content to array of objects
 * Handles quoted fields with commas
 */
function parseCSV(content: string): Record<string, any>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse CSV line respecting quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse Excel file buffer to array of objects
 */
function parseExcel(buffer: Buffer): Record<string, any>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data as Record<string, any>[];
}

/**
 * Intelligent column detection based on common patterns
 */
function detectColumns(headers: string[]): ParseResult['detectedColumns'] {
  const detected: ParseResult['detectedColumns'] = {};

  const datePatterns = /date|تاريخ|datum|fecha|data/i;
  const descriptionPatterns = /description|details|narrative|وصف|تفاصيل|beschreibung|descripción/i;
  const referencePatterns = /reference|ref|transaction.*id|رقم.*المرجع|referenz|referencia/i;
  const debitPatterns = /debit|withdrawal|outgoing|مدين|سحب|abbuchung|débito/i;
  const creditPatterns = /credit|deposit|incoming|دائن|إيداع|gutschrift|crédito/i;
  const balancePatterns = /balance|remaining|saldo|رصيد|guthaben/i;

  for (const header of headers) {
    if (!detected.date && datePatterns.test(header)) {
      detected.date = header;
    }
    if (!detected.description && descriptionPatterns.test(header)) {
      detected.description = header;
    }
    if (!detected.reference && referencePatterns.test(header)) {
      detected.reference = header;
    }
    if (!detected.debit && debitPatterns.test(header)) {
      detected.debit = header;
    }
    if (!detected.credit && creditPatterns.test(header)) {
      detected.credit = header;
    }
    if (!detected.balance && balancePatterns.test(header)) {
      detected.balance = header;
    }
  }

  return detected;
}

/**
 * Parse date from various formats
 */
function parseDate(value: any): Date | null {
  if (!value) return null;
  
  // Already a Date object
  if (value instanceof Date) return value;
  
  // Excel serial date number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }
  
  // String date
  const str = String(value).trim();
  if (!str) return null;
  
  // Try ISO format first
  const isoDate = new Date(str);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  // Try common formats: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, etc.
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // DD/MM/YYYY or MM/DD/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,    // DD-MM-YYYY or MM-DD-YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,    // YYYY-MM-DD
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,  // YYYY/MM/DD
  ];
  
  for (const format of formats) {
    const match = str.match(format);
    if (match) {
      const [, p1, p2, p3] = match;
      // Try both DD/MM/YYYY and MM/DD/YYYY interpretations
      const date1 = new Date(parseInt(p3), parseInt(p2) - 1, parseInt(p1));
      const date2 = new Date(parseInt(p3), parseInt(p1) - 1, parseInt(p2));
      
      if (!isNaN(date1.getTime())) return date1;
      if (!isNaN(date2.getTime())) return date2;
    }
  }
  
  return null;
}

/**
 * Parse number from string (handles currency symbols, commas, etc.)
 */
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = String(value).trim();
  // Remove currency symbols, commas, spaces
  const cleaned = str.replace(/[$€£¥₹,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Main parser function
 */
export async function parseBankStatement(
  fileBuffer: Buffer,
  fileName: string,
  customMapping?: ColumnMapping
): Promise<ParseResult> {
  const errors: string[] = [];
  let rows: Record<string, any>[] = [];
  
  try {
    // Determine file type and parse
    const ext = fileName.toLowerCase().split('.').pop();
    
    if (ext === 'csv') {
      const content = fileBuffer.toString('utf-8');
      rows = parseCSV(content);
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = parseExcel(fileBuffer);
    } else {
      return {
        success: false,
        transactions: [],
        headers: [],
        errors: [`Unsupported file format: ${ext}. Please use CSV or Excel files.`],
        detectedColumns: {},
      };
    }
    
    if (rows.length === 0) {
      return {
        success: false,
        transactions: [],
        headers: [],
        errors: ['File is empty or has no data rows.'],
        detectedColumns: {},
      };
    }
    
    // Extract headers
    const headers = Object.keys(rows[0]);
    
    // Detect columns if no custom mapping provided
    const detectedColumns = customMapping ? {} : detectColumns(headers);
    const mapping: ColumnMapping = customMapping || {
      date: detectedColumns.date || headers[0],
      description: detectedColumns.description || headers[1],
      reference: detectedColumns.reference,
      debit: detectedColumns.debit || headers[2],
      credit: detectedColumns.credit || headers[3],
      balance: detectedColumns.balance,
    };
    
    // Validate required columns
    if (!mapping.date || !headers.includes(mapping.date)) {
      errors.push('Date column is required and must exist in the file.');
    }
    if (!mapping.description || !headers.includes(mapping.description)) {
      errors.push('Description column is required and must exist in the file.');
    }
    if (!mapping.debit || !headers.includes(mapping.debit)) {
      errors.push('Debit column is required and must exist in the file.');
    }
    if (!mapping.credit || !headers.includes(mapping.credit)) {
      errors.push('Credit column is required and must exist in the file.');
    }
    
    if (errors.length > 0) {
      return {
        success: false,
        transactions: [],
        headers,
        errors,
        detectedColumns,
      };
    }
    
    // Parse transactions
    const transactions: BankTransaction[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is headers and we're 0-indexed
      
      try {
        const date = parseDate(row[mapping.date]);
        if (!date) {
          errors.push(`Row ${rowNum}: Invalid date format in column "${mapping.date}"`);
          continue;
        }
        
        const description = String(row[mapping.description] || '').trim();
        if (!description) {
          errors.push(`Row ${rowNum}: Description is empty`);
          continue;
        }
        
        const reference = mapping.reference ? String(row[mapping.reference] || '').trim() : '';
        const debit = parseNumber(row[mapping.debit]);
        const credit = parseNumber(row[mapping.credit]);
        const balance = mapping.balance ? parseNumber(row[mapping.balance]) : null;
        
        transactions.push({
          date,
          description,
          reference,
          debit,
          credit,
          balance,
          rawRow: row,
        });
      } catch (err) {
        errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    return {
      success: transactions.length > 0,
      transactions,
      headers,
      errors,
      detectedColumns,
    };
    
  } catch (err) {
    return {
      success: false,
      transactions: [],
      headers: [],
      errors: [`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`],
      detectedColumns: {},
    };
  }
}

/**
 * Preview first N rows without full parsing
 */
export async function previewBankStatement(
  fileBuffer: Buffer,
  fileName: string,
  rowCount: number = 10
): Promise<{
  success: boolean;
  headers: string[];
  rows: Record<string, any>[];
  detectedColumns: ParseResult['detectedColumns'];
  errors: string[];
}> {
  try {
    const ext = fileName.toLowerCase().split('.').pop();
    let rows: Record<string, any>[] = [];
    
    if (ext === 'csv') {
      const content = fileBuffer.toString('utf-8');
      rows = parseCSV(content);
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = parseExcel(fileBuffer);
    } else {
      return {
        success: false,
        headers: [],
        rows: [],
        detectedColumns: {},
        errors: [`Unsupported file format: ${ext}`],
      };
    }
    
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const detectedColumns = detectColumns(headers);
    const previewRows = rows.slice(0, rowCount);
    
    return {
      success: true,
      headers,
      rows: previewRows,
      detectedColumns,
      errors: [],
    };
  } catch (err) {
    return {
      success: false,
      headers: [],
      rows: [],
      detectedColumns: {},
      errors: [`Failed to preview file: ${err instanceof Error ? err.message : 'Unknown error'}`],
    };
  }
}
