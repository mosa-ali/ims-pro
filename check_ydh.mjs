import { db } from './server/db.ts';
import { organizations } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const orgs = await db.select().from(organizations);
console.log('All organizations:', JSON.stringify(orgs, null, 2));

const ydh = orgs.find(o => o.code === 'YDH' || o.name.includes('Yamany'));
if (ydh) {
  console.log('\nYDH Organization ID:', ydh.id);
}
