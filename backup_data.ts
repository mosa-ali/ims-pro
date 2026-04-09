import { db } from './server/db';
import { organizations, operatingUnits } from './drizzle/schema';
import fs from 'fs';

async function backup() {
  const orgs = await db.select().from(organizations);
  const ous = await db.select().from(operatingUnits);
  
  fs.writeFileSync('/home/ubuntu/backup_organizations.json', JSON.stringify(orgs, null, 2));
  fs.writeFileSync('/home/ubuntu/backup_operating_units.json', JSON.stringify(ous, null, 2));
  
  console.log(`Backed up ${orgs.length} organizations and ${ous.length} operating units`);
  process.exit(0);
}

backup();
