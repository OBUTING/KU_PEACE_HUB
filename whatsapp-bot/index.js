/**
 * Peace Hub WhatsApp Bot (Baileys edition)
 * ------------------------------------------------------------------
 * Connects to WhatsApp using your own number (via a QR code scan, same
 * as linking a new device in WhatsApp Web/Desktop), then sends a peace
 * reminder to one WhatsApp group on a schedule.
 *
 * Uses Baileys — an UNOFFICIAL library that talks to WhatsApp's own
 * multi-device protocol directly over a WebSocket. Unlike whatsapp-web.js,
 * it does NOT launch a real browser (no Puppeteer/Chromium), which avoids
 * an entire class of browser-compatibility bugs. It is still against
 * WhatsApp's Terms of Service, and the connected number carries a real
 * risk of being rate-limited or banned. Use a secondary/test number where
 * possible, and keep broadcast volume low (this script is built for one
 * scheduled message to one group, not mass messaging).
 *
 * Setup:
 *   1. npm install
 *   2. Set WHATSAPP_GROUP_ID and BROADCAST_CRON as environment variables
 *      (see README.md).
 *   3. npm start
 *   4. Scan the QR code that prints in your terminal with WhatsApp:
 *      Settings → Linked Devices → Link a Device.
 *   5. On first successful connect, the console prints every group
 *      this number is part of, along with its ID — copy the one you
 *      want into WHATSAPP_GROUP_ID.
 *
 * The session is saved to ./session so you don't have to re-scan the
 * QR code every time you restart the bot — keep that folder out of git
 * (already handled in .gitignore) and keep it on a persistent disk.
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const cron = require("node-cron");
const pino = require("pino");
const { messages } = require("./messages");

const GROUP_ID = process.env.WHATSAPP_GROUP_ID || "";
const BROADCAST_CRON = process.env.BROADCAST_CRON || "0 8 * * *"; // default: 8:00 AM daily

if (!GROUP_ID) {
  console.warn(
    "No WHATSAPP_GROUP_ID set yet. The bot will still connect and log all your groups + their " +
      "IDs once ready — copy the right one into your environment variables, then restart."
  );
}

let sock = null;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");

  // Baileys needs to speak the WhatsApp Web protocol version WhatsApp's
  // servers currently expect. Without fetching this explicitly, some
  // setups fall back to a stale built-in version and get rejected
  // immediately with "Connection Failure" before ever showing a QR code.
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp Web protocol v${version.join(".")} (latest: ${isLatest})`);

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\nScan this QR code in WhatsApp → Settings → Linked Devices → Link a Device:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("WhatsApp bot connected and ready.");
      await listGroups();
      console.log(`Broadcast schedule (cron): "${BROADCAST_CRON}"`);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.warn("Connection closed.", lastDisconnect?.error?.message || "");
      if (loggedOut) {
        console.error("Logged out from WhatsApp — delete the ./session folder and restart to re-link.");
      } else {
        console.log("Reconnecting in 3 seconds...");
        setTimeout(() => startBot(), 3000);
      }
    }
  });
}

async function listGroups() {
  const groups = await sock.groupFetchAllParticipating();
  const entries = Object.values(groups);
  console.log(`\nThis number is part of ${entries.length} group(s):`);
  entries.forEach((g) => console.log(`  "${g.subject}"  ->  ${g.id}`));
  console.log(""); // blank line for readability
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
  if (!sock) {
    console.error("Bot isn't connected yet — try again once startup finishes.");
    return;
  }
  if (!GROUP_ID) {
    console.error(
      "Could not resolve a target group. Set WHATSAPP_GROUP_ID to match one of the groups " +
        "logged above, then restart."
    );
    return;
  }
  const text = customText || pickRandomMessage();
  await sock.sendMessage(GROUP_ID, { text });
  console.log(`[${new Date().toISOString()}] Sent to ${GROUP_ID}: ${text}`);
}

// Schedule the recurring broadcast. Cron format: minute hour day month weekday
// Examples:
//   "0 8 * * *"      every day at 8:00 AM
//   "0 8 * * 1"      every Monday at 8:00 AM
//   "0 8,18 * * *"   every day at 8:00 AM and 6:00 PM
cron.schedule(BROADCAST_CRON, () => {
  sendBroadcast().catch((err) => console.error("Scheduled broadcast failed:", err));
});

startBot().catch((err) => console.error("Failed to start bot:", err));

module.exports = { sendBroadcast };
