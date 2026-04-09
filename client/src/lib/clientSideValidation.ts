import { validateRow, ImportConfig } from '@shared/importFramework';

export interface PreviewRow {
 rowNumber: number;
 data: Record<string, any>;
 isValid: boolean;
 errors?: Array<{
 row: number;
 field: string;
 value: any;
 errorType: string;
 message: string;
 suggestedFix?: string;
 originalData: Record<string, any>;
 }>;
}

export function validateImportData(
 rows: Record<string, any>[],
 config: ImportConfig,
 referenceData?: Record<string, string[]>
): { validRows: PreviewRow[]; invalidRows: PreviewRow[] } {
 const validRows: PreviewRow[] = [];
 const invalidRows: PreviewRow[] = [];

 rows.forEach((row, index) => {
 const rowNumber = index + 2; // Excel row number (1-indexed + header)
 const validation = validateRow(row, rowNumber, config, referenceData, config.context);

 if (validation.isValid) {
 validRows.push({
 rowNumber,
 data: validation.data,
 isValid: true,
 });
 } else {
 invalidRows.push({
 rowNumber,
 data: row,
 isValid: false,
 errors: validation.errors.map(error => ({
 row: rowNumber,
 field: error.field,
 value: error.value,
 errorType: error.errorType,
 message: error.message,
 suggestedFix: error.suggestedFix,
 originalData: row,
 })),
 });
 }
 });

 return { validRows, invalidRows };
}
