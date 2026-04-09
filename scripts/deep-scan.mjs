import * as schema from '../drizzle/schema.ts';

// drizzle-kit's getColumnCasing reads column.config (or column[Symbol]) to get the name
// Let's find any table export that has columns with undefined config

for (const [exportName, val] of Object.entries(schema)) {
  if (val === null || val === undefined) continue;
  if (typeof val !== 'object') continue;
  
  // Check if it's a mysqlTable - they have a Symbol for columns
  const symbols = Object.getOwnPropertySymbols(val);
  for (const sym of symbols) {
    const symStr = sym.toString();
    if (symStr.includes('Columns') || symStr.includes('drizzle')) {
      const colsObj = val[sym];
      if (colsObj && typeof colsObj === 'object') {
        for (const [colName, col] of Object.entries(colsObj)) {
          if (col === undefined || col === null) {
            console.log(`BROKEN: ${exportName}.${colName} is ${col}`);
            continue;
          }
          // Check if the column has a config with name
          if (typeof col === 'object') {
            if (col.config === undefined && col.name === undefined) {
              console.log(`SUSPICIOUS: ${exportName}.${colName} - no config or name`);
            }
            // Check for the internal columnType
            if (col.columnType === undefined) {
              console.log(`NO_TYPE: ${exportName}.${colName} - columnType is undefined`);
            }
          }
        }
      }
    }
  }
}

// Also check for non-table exports that might be accidentally included
for (const [exportName, val] of Object.entries(schema)) {
  if (val === undefined) {
    console.log(`UNDEFINED EXPORT: ${exportName}`);
  }
}

console.log('Deep scan complete');
