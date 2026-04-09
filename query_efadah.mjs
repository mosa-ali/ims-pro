import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('No DATABASE_URL found'); process.exit(1); }

const conn = await mysql.createConnection(dbUrl);

// Get EFADAH org
const [orgs] = await conn.execute("SELECT id, name FROM organizations WHERE name LIKE '%fadah%'");
console.log('EFADAH Org:', JSON.stringify(orgs, null, 2));

// Get operating_units columns
const [cols] = await conn.execute("DESCRIBE operating_units");
console.log('OU Columns:', cols.map(c => c.Field).join(', '));

// Get OUs for EFADAH
if (orgs.length > 0) {
  const orgId = orgs[0].id;
  const [ous] = await conn.execute("SELECT * FROM operating_units WHERE organizationId = ?", [orgId]);
  console.log('EFADAH OUs:', JSON.stringify(ous, null, 2));
}

// Also check what headers EFADAH sends
const [allOUs] = await conn.execute("SELECT id, name, organizationId FROM operating_units LIMIT 20");
console.log('All OUs:', JSON.stringify(allOUs, null, 2));

// Check accountability records for EFADAH
const [accRecs] = await conn.execute("SELECT id, organizationId, operatingUnitId, recordCode FROM meal_accountability_records");
console.log('EFADAH Accountability Records:', JSON.stringify(accRecs, null, 2));

await conn.end();
