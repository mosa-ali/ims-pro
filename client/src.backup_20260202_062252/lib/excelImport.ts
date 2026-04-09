import * as XLSX from 'xlsx';

export interface ImportResult<T> {
  successfulRows: T[];
  failedRows: {
    rowNumber: number;
    rowData: any;
    errorMessage: string;
    errorField?: string;
  }[];
  totalRows: number;
}

export async function parseExcelFile<T>(
  file: File,
  columnMapping: Record<string, string>, // Maps Excel column names to object keys
  validator: (row: any, rowNumber: number) => { valid: boolean; error?: string; errorField?: string }
): Promise<ImportResult<T>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        const successfulRows: T[] = [];
        const failedRows: ImportResult<T>['failedRows'] = [];

        rows.forEach((row: any, index) => {
          const rowNumber = index + 2; // Excel row number (1-indexed + header)
          
          // Map Excel columns to object keys
          const mappedRow: any = {};
          for (const [excelCol, objKey] of Object.entries(columnMapping)) {
            mappedRow[objKey] = row[excelCol];
          }

          // Validate row
          const validation = validator(mappedRow, rowNumber);
          
          if (validation.valid) {
            successfulRows.push(mappedRow as T);
          } else {
            failedRows.push({
              rowNumber,
              rowData: mappedRow,
              errorMessage: validation.error || 'Validation failed',
              errorField: validation.errorField,
            });
          }
        });

        resolve({
          successfulRows,
          failedRows,
          totalRows: rows.length,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

export function downloadExcelTemplate(
  columns: { name: string; example?: string }[],
  filename: string
) {
  const worksheet = XLSX.utils.aoa_to_sheet([
    columns.map(col => col.name),
    columns.map(col => col.example || ''),
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  XLSX.writeFile(workbook, filename);
}
