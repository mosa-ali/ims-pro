import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('No DATABASE_URL found'); process.exit(1); }

const conn = await mysql.createConnection(dbUrl);

// Get survey table columns
const [cols] = await conn.execute("DESCRIBE meal_surveys");
console.log('Survey Columns:', cols.map(c => `${c.Field} (${c.Type}${c.Null === 'YES' ? ', nullable' : ''})`).join('\n'));

console.log('\n---\n');

// Check existing surveys
const [existing] = await conn.execute("SELECT id, organizationId, operatingUnitId, title, status FROM meal_surveys");
console.log('Existing surveys:', JSON.stringify(existing, null, 2));

// Check survey submissions table
const [subCols] = await conn.execute("DESCRIBE meal_survey_submissions");
console.log('\nSubmission Columns:', subCols.map(c => `${c.Field} (${c.Type}${c.Null === 'YES' ? ', nullable' : ''})`).join('\n'));

// Check data entries table
try {
  const [deCols] = await conn.execute("DESCRIBE meal_data_entries");
  console.log('\nData Entry Columns:', deCols.map(c => `${c.Field} (${c.Type}${c.Null === 'YES' ? ', nullable' : ''})`).join('\n'));
} catch (e) {
  console.log('\nNo meal_data_entries table');
}

await conn.end();
