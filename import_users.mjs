import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createConnection } from 'mysql2/promise';

// Read users CSV
const csvContent = readFileSync('/home/ubuntu/upload/users.csv', 'utf-8');
const users = parse(csvContent, { columns: true, skip_empty_lines: true });

console.log(`Found ${users.length} users to import\n`);

// Connect to database
const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
const [, user, password, host, port, database] = match;

const conn = await createConnection({ 
  host, port, user, password, database,
  ssl: { rejectUnauthorized: true }
});

let imported = 0;
let skipped = 0;

for (const userData of users) {
  try {
    // Insert user
    await conn.execute(`
      INSERT INTO users (
        id, openId, name, email, loginMethod, authenticationProvider,
        externalIdentityId, role, createdAt, updatedAt, lastSignedIn,
        organizationId, currentOrganizationId, languagePreference,
        isDeleted, deletedAt, deletedBy, deletionReason,
        passwordResetToken, passwordResetExpiry
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userData.id || null,
      userData.openId || null,
      userData.name || null,
      userData.email || null,
      userData.loginMethod || null,
      userData.authenticationProvider || 'email',
      userData.externalIdentityId || null,
      userData.role || 'user',
      userData.createdAt || new Date(),
      userData.updatedAt || new Date(),
      userData.lastSignedIn || new Date(),
      userData.organizationId || null,
      userData.currentOrganizationId || null,
      userData.languagePreference || null,
      userData.isDeleted === 'true' || userData.isDeleted === '1' ? 1 : 0,
      userData.deletedAt || null,
      userData.deletedBy || null,
      userData.deletionReason || null,
      userData.passwordResetToken || null,
      userData.passwordResetExpiry || null
    ]);
    
    imported++;
    if (imported % 10 === 0) {
      console.log(`Imported ${imported} users...`);
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      skipped++;
    } else {
      console.log(`Error importing user ${userData.email}: ${err.message}`);
    }
  }
}

console.log(`\n✅ Import complete`);
console.log(`  Imported: ${imported}`);
console.log(`  Skipped (duplicates): ${skipped}`);

// Verify
const [rows] = await conn.execute('SELECT COUNT(*) as count FROM users');
console.log(`  Total users in database: ${rows[0].count}`);

await conn.end();
