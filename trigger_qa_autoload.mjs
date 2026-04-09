import { getDb } from "./server/db.js";

// Get QA ID
const db = await getDb();
const [qa] = await db.execute("SELECT id FROM quotation_analyses WHERE qaNumber = 'QA-HQ-2026-001' LIMIT 1");
console.log("QA ID:", qa[0]?.id);

// Manually call the auto-load logic (simulating what the frontend should do)
// This will help us debug if the issue is frontend or backend
