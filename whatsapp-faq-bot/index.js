/**
 * Peace Hub WhatsApp FAQ Bot
 * ------------------------------------------------------------------
 * Listens for 1-on-1 (direct) WhatsApp messages and auto-replies with
 * a peace-related FAQ answer, matched by keyword. Ignores group chats
 * entirely — see whatsapp-bot/ (the sibling project) for the group
 * broadcast bot instead.
 *
 * Uses Baileys — an UNOFFICIAL library that talks to WhatsApp's own
 * multi-device protocol directly over a WebSocket (no browser involved).
 * This is against WhatsApp's Terms of Service, and the connected number
 * carries a real risk of being rate-limited or banned. Use a
 * secondary/test number where possible.
 *
 * Setup:
 *   1. npm install
 *   2. npm start
 *   3. Scan the QR code that prints in your terminal with WhatsApp:
 *      Settings → Linked Devices → Link a Device.
 *   4. Message that number directly from another phone/account to test —
 *      try "menu", "pledge", "election", or "report".
 *
 * Note: if you also run the sibling broadcast bot (whatsapp-bot/) on the
 * SAME WhatsApp number, that's fine — WhatsApp allows several linked
 * devices at once, and each bot keeps its own separate ./session folder.
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const { findAnswer } = require("./faq");

let sock = null;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp Web protocol v${version.join(".")} (latest: ${isLatest})`);

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\nScan this QR code in WhatsApp → Settings → Linked Devices → Link a Device:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("FAQ bot connected and ready. Message this number directly to test it.");
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

  sock.ev.on("messages.upsert", async ({ messages: msgs, type }) => {
    if (type !== "notify") return;

    for (const msg of msgs) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue; // ignore our own messages

      const jid = msg.key.remoteJid || "";
      const isGroup = jid.endsWith("@g.us");
      if (isGroup) continue; // this bot only responds to direct messages

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";

      if (!text) continue; // ignore non-text messages (images, stickers, etc. with no caption)

      console.log(`[${new Date().toISOString()}] DM from ${jid}: ${text}`);

      const reply = findAnswer(text);
      try {
        await sock.sendMessage(jid, { text: reply });
        console.log(`  -> replied`);
      } catch (err) {
        console.error("  -> failed to send reply:", err);
      }
    }
  });
}

startBot().catch((err) => console.error("Failed to start bot:", err));
