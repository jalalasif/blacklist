// Run with: node scripts/cron.mjs
// Hits the reminders endpoint every minute.
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const cron = require("node-cron");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SECRET = process.env.CRON_SECRET ?? "";

cron.schedule("* * * * *", async () => {
  try {
    const res = await fetch(`${APP_URL}/api/cron/reminders?secret=${SECRET}`);
    const data = await res.json();
    if (data.notified > 0) {
      console.log(`[cron] Sent ${data.notified} reminder(s)`);
    }
  } catch (err) {
    console.error("[cron] Error:", err.message);
  }
});

console.log("[cron] Reminder job running — checking every minute");
