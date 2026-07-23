# Peace Hub WhatsApp Bot

Sends a scheduled peace reminder broadcast to one WhatsApp group, using your
own WhatsApp number.

**This version uses [Baileys](https://github.com/WhiskeySockets/Baileys)**,
after we hit repeated low-level compatibility bugs with an earlier
`whatsapp-web.js` (Puppeteer/Chromium-based) version of this bot. Baileys
talks to WhatsApp's own multi-device protocol directly over a WebSocket —
no browser involved — which is both lighter and avoids that whole class of
problems.

## ⚠️ Read this first

Baileys is still an *unofficial* library, and connecting it to WhatsApp is
**against WhatsApp's Terms of Service**. The connected number can be
rate-limited or banned. To reduce that risk:

- Use a **secondary/test number** if you can, not your main personal number.
- Keep volume low. This bot is built for **one scheduled message to one
  group** — not mass messaging.
- If your number does get flagged, that's WhatsApp enforcing its own
  policy, not a bug in this code.

If you'd rather avoid this risk entirely, the alternative is the official
**Meta WhatsApp Cloud API** — free, but requires a Meta Business/developer
setup. Ask if you want to switch to that route later.

## What it does

1. Connects to WhatsApp by showing a QR code in your terminal — scan it
   with **WhatsApp → Settings → Linked Devices → Link a Device**, same as
   linking WhatsApp Web or Desktop.
2. Once connected, it logs every group your number is part of, along with
   each group's ID.
3. On a schedule you set (daily, weekly, whatever cron expression you like),
   it sends one message — picked at random from `messages.js` — to the
   group you configure.

## Setup

**1. Install dependencies:**
```bash
cd whatsapp-bot
npm install
```

**2. Run it once to find your group ID:**
```bash
npm start
```
Scan the QR code that prints in your terminal. Once connected, the console
prints something like:
```
This number is part of 3 group(s):
  "Peace Hub Reminders"  ->  120363012345678901@g.us
  "Family"  ->  120363019876543210@g.us
  ...
```
Copy the ID next to the group you want to broadcast to.

**3. Set your configuration** as environment variables before starting the
bot:

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `WHATSAPP_GROUP_ID` | Yes | `120363012345678901@g.us` | The exact group to broadcast to |
| `BROADCAST_CRON` | No (defaults to daily 8 AM) | `0 8 * * *` | When to send, in cron syntax |

Example (Windows PowerShell):
```powershell
$env:WHATSAPP_GROUP_ID="120363012345678901@g.us"
$env:BROADCAST_CRON="0 8 * * *"
npm start
```

Example (macOS/Linux):
```bash
export WHATSAPP_GROUP_ID="120363012345678901@g.us"
export BROADCAST_CRON="0 8 * * *"
npm start
```

**4. Leave it running.** As long as the process stays alive, it'll send
the broadcast on schedule. Stopping the process (Ctrl+C) stops the bot —
this isn't a one-off script, it needs to keep running in the background.

## Editing the messages

Open `messages.js` and add, remove, or reword any line in the `messages`
array — plain strings, one per reminder. The bot picks one at random each
time it broadcasts.

## Where to run this long-term

This needs a machine that:
- Stays on continuously
- Keeps the `./session` folder on disk between restarts (so you don't have
  to re-scan the QR code every time)

Unlike the earlier Puppeteer-based version, Baileys is lightweight (no
headless browser), so it's a much better fit for small/free hosting tiers.

**Good fits:** your own always-on computer, a Raspberry Pi, a small VPS, or
even Render — as long as the plan gives you a **persistent disk** for the
`./session` folder (Render's plain free web service tier wipes its disk on
redeploy/restart, which would force a QR re-scan each time; a small paid
instance with a persistent disk avoids that). Let me know if you'd like
help setting that up.

## Troubleshooting

- **"Connection closed" then it reconnects on its own** — normal; Baileys
  reconnects automatically unless you were logged out.
- **"Logged out from WhatsApp"** — delete the `./session` folder and run
  `npm start` again to re-link with a fresh QR code.
- **QR code never appears** — double check `npm install` finished cleanly
  with no errors, and that you're on a network that can reach WhatsApp's
  servers (try loading `web.whatsapp.com` in a normal browser as a sanity
  check).

## Cron schedule cheatsheet

```
0 8 * * *      every day at 8:00 AM
0 8 * * 1      every Monday at 8:00 AM
0 8,18 * * *   every day at 8:00 AM and 6:00 PM
*/30 * * * *   every 30 minutes (not recommended — keep volume low)
```
