require("dotenv").config();
/**
 * Peace Hub WhatsApp Bot
 * ------------------------------------------------------------------
 * Connects to WhatsApp using your own number (via a QR code scan, same
 * as linking a new device in WhatsApp Web/Desktop), then sends a peace
 * reminder to one WhatsApp group on a schedule.
 *
 * Uses whatsapp-web.js — an UNOFFICIAL library that automates the
 * WhatsApp Web interface. This is against WhatsApp's Terms of Service
 * and carries a real risk of the connected number being banned or
 * rate-limited. Use a secondary/test number where possible, and keep
 * broadcast volume low (this script is built for one scheduled message
 * to one group, not mass messaging).
 *
 * Setup:
 *   1. npm install
 *   2. Set GROUP_ID (or GROUP_NAME) and BROADCAST_CRON in a .env file
 *      or as real environment variables (see README.md).
 *   3. npm start
 *   4. Scan the QR code that prints in your terminal with WhatsApp:
 *      Settings → Linked Devices → Link a Device.
 *   5. On first successful connect, the console prints every group
 *      this number is part of, along with its ID — copy the one you
 *      want into GROUP_ID.
 *
 * The session is saved to ./session so you don't have to re-scan the
 * QR code every time you restart the bot — keep that folder out of git
 * (already handled in .gitignore) and keep it on a persistent disk.
 */

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const cron = require("node-cron");
const { messages } = require("./messages");

const GROUP_ID = process.env.WHATSAPP_GROUP_ID || "";
const GROUP_NAME = process.env.WHATSAPP_GROUP_NAME || "";
const BROADCAST_CRON = process.env.BROADCAST_CRON || "0 8 * * *"; // default: 8:00 AM daily

if (!GROUP_ID && !GROUP_NAME) {
  console.warn(
    "No WHATSAPP_GROUP_ID or WHATSAPP_GROUP_NAME set yet. The bot will still connect and " +
      "log all your groups + their IDs once ready — copy the right one into your environment " +
      "variables, then restart."
  );
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./session" }),
  puppeteer: {
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
},
  // No webVersionCache pin: with an up-to-date whatsapp-web.js, letting it
  // fetch WhatsApp's current live version (the default) works better than
  // pinning to an old snapshot, which is what caused the getChats() crash.
});

client.on("qr", (qr) => {
  console.log("\nScan this QR code in WhatsApp → Settings → Linked Devices → Link a Device:\n");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("Authenticated. Session saved to ./session for future restarts.");
});

client.on("auth_failure", (msg) => {
  console.error("Authentication failed:", msg);
});

client.on("disconnected", (reason) => {
  console.warn("Disconnected from WhatsApp:", reason);
});
 client.on("disconnected", (reason) => {
  console.warn("Disconnected from WhatsApp:", reason);
});

client.on("ready", async () => {
  console.log("WhatsApp bot connected and ready.");
  try {
    await listGroups();
  } catch (err) {
    console.error(
      "Could not list groups (getChats is currently unreliable in whatsapp-web.js):",
      err.message
    );
  }
  console.log(`Broadcast schedule (cron): "${BROADCAST_CRON}"`);
});

async function listGroups() {
  const chats = await client.getChats();
  const groups = chats.filter((c) => c.isGroup);
  console.log(`\nThis number is part of ${groups.length} group(s):`);
  groups.forEach((g) => console.log(`  "${g.name}"  ->  ${g.id._serialized}`));
  console.log(""); // blank line for readability
}

async function resolveTargetGroupId() {
  if (GROUP_ID) return GROUP_ID;
  if (!GROUP_NAME) return null;
  const chats = await client.getChats();
  const match = chats.find((c) => c.isGroup && c.name === GROUP_NAME);
  return match ? match.id._serialized : null;
}

function pickRandomMessage() {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Sends one broadcast to the configured group. Exported so it can also
 * be triggered manually (e.g. from a REPL, a one-off script, or wired
 * up to an HTTP endpoint later if you want an on-demand "send now" button).
 */
async function sendBroadcast(customText) {
  const targetId = await resolveTargetGroupId();
  if (!targetId) {
    console.error(
      "Could not resolve a target group. Set WHATSAPP_GROUP_ID (preferred) or " +
        "WHATSAPP_GROUP_NAME to match one of the groups logged above, then restart."
    );
    return;
  }
  const text = customText || pickRandomMessage();
  await client.sendMessage(targetId, text);
  console.log(`[${new Date().toISOString()}] Sent to ${targetId}: ${text}`);
}

// Schedule the recurring broadcast. Cron format: minute hour day month weekday
// Examples:
//   "0 8 * * *"      every day at 8:00 AM
//   "0 8 * * 1"      every Monday at 8:00 AM
//   "0 8,18 * * *"   every day at 8:00 AM and 6:00 PM
cron.schedule(BROADCAST_CRON, () => {
  sendBroadcast().catch((err) => console.error("Scheduled broadcast failed:", err));
});

client.initialize();

module.exports = { sendBroadcast };
