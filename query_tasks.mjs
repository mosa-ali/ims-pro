import { drizzle } from "drizzle-orm/mysql2";
import { projectTasks, projectActivities } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

console.log("=== QUERYING PROJECT TASKS ===");
const tasks = await db.select().from(projectTasks).where(eq(projectTasks.isDeleted, false));
console.log("Total tasks found:", tasks.length);
console.log(JSON.stringify(tasks, null, 2));

console.log("\n=== QUERYING PROJECT ACTIVITIES ===");
const activities = await db.select().from(projectActivities).where(eq(projectActivities.isDeleted, false));
console.log("Total activities found:", activities.length);
console.log(JSON.stringify(activities, null, 2));

process.exit(0);
