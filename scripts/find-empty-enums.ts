import * as schema from '../drizzle/schema.ts';

for (const [tableName, table] of Object.entries(schema)) {
  if (table && typeof table === 'object' && '$inferSelect' in table) {
    const cols = Object.entries(table as Record<string, unknown>);
    for (const [colName, col] of cols) {
      if (col && typeof col === 'object') {
        const c = col as Record<string, unknown>;
        const enumValues = c.enumValues as string[] | undefined;
        if (c.columnType === 'MySqlEnumColumn' || enumValues) {
          if (!enumValues || enumValues.length === 0) {
            console.log(`EMPTY ENUM: table=${tableName}, col=${colName}`);
          }
        }
      }
    }
  }
}
console.log('Enum scan complete');
