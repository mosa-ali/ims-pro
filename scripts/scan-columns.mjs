import * as schema from '../drizzle/schema.ts';
import { getTableName, getTableColumns } from 'drizzle-orm';

// Check each table for columns with undefined config
for (const [exportName, val] of Object.entries(schema)) {
  if (val && typeof val === 'object' && 'getSQL' in val) {
    try {
      const cols = getTableColumns(val);
      for (const [colName, col] of Object.entries(cols)) {
        if (col === undefined || col === null || col.name === undefined) {
          console.log('BROKEN COLUMN:', exportName, colName, JSON.stringify(col));
        }
      }
    } catch (e) {
      console.log('ERROR on table:', exportName, e.message);
    }
  }
}
console.log('Scan complete');
