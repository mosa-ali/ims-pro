import * as schema from '../drizzle/schema.ts';

for (const [tableName, table] of Object.entries(schema)) {
  if (table && typeof table === 'object' && '$inferSelect' in table) {
    const cols = Object.entries(table as Record<string, unknown>);
    for (const [colName, col] of cols) {
      if (col && typeof col === 'object' && 'columnType' in col) {
        const colObj = col as { name?: string; columnType?: string };
        if (!colObj.name) {
          console.log(`BROKEN COLUMN: table=${tableName}, col=${colName}, type=${colObj.columnType}`);
        }
      }
    }
  }
}
console.log('Schema scan complete');
