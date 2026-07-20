# Peace Hub WhatsApp Bot

Sends a scheduled peace reminder broadcast to one WhatsApp group, using your
own WhatsApp number.

## ⚠️ Read this first

This uses **whatsapp-web.js**, an *unofficial* library that automates the
WhatsApp Web interface (the same interface you'd use to link a device).
It is **against WhatsApp's Terms of Service**, and the connected number
can be rate-limited or banned. To reduce that risk:

- Use a **secondary/test number** if you can, not your main personal number.
- Keep volume low. This bot is built for **one scheduled message to one
  group** — not mass messaging many chats or contacts.
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
bot (or in a local `.env` file loaded however you prefer — this project
doesn't include a dotenv loader by default, so either export them in your
shell or add one with `npm install dotenv` and `require('dotenv').config()`
at the top of `index.js`):

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `WHATSAPP_GROUP_ID` | Yes (or use the name below) | `120363012345678901@g.us` | The exact group to broadcast to — most reliable |
| `WHATSAPP_GROUP_NAME` | Only if no ID set | `Peace Hub Reminders` | Matches by group name instead — breaks if you rename the group |
| `BROADCAST_CRON` | No (defaults to daily 8 AM) | `0 8 * * *` | When to send, in cron syntax |

Example (macOS/Linux):
```bash
export WHATSAPP_GROUP_ID="120363012345678901@g.us"
export BROADCAST_CRON="0 8 * * *"
npm start
```

Example (Windows PowerShell):
```powershell
$env:WHATSAPP_GROUP_ID="120363012345678901@g.us"
$env:BROADCAST_CRON="0 8 * * *"
npm start
```

**4. Leave it running.** As long as the process stays alive, it'll send
the broadcast on schedule. Stopping the process (Ctrl+C) stops the bot —
this isn't a one-off script, it needs to keep running in the background.

## Editing the messages

Open `messages.js` and add, remove, or reword any line in the `messages`
array — plain strings, one per reminder. The bot picks one at random each
time it broadcasts.

## Where to actually run this long-term

This needs a machine that:
- Stays on continuously
- Keeps the `./session` folder on disk between restarts (so you don't have
  to re-scan the QR code every time)
- Has enough resources to run a headless Chromium browser (whatsapp-web.js
  runs one under the hood via Puppeteer)

**Good fits:** your own always-on computer, a Raspberry Pi, or a small VPS
(e.g. a $5/mo DigitalOcean droplet, or similar).

**Not a good fit:** Render's free web service tier — its disk is ephemeral
(wipes `./session` on every redeploy/restart, meaning you'd have to
re-scan the QR code constantly), and Puppeteer's memory needs are tight
against the free tier's limits. If you want to explore hosting this on
Render anyway (e.g. a paid instance with a persistent disk), let me know
and we can set that up — just flagging that the free tier your website
runs on isn't the right fit for this piece.

## Cron schedule cheatsheet

```
0 8 * * *      every day at 8:00 AM
0 8 * * 1      every Monday at 8:00 AM
0 8,18 * * *   every day at 8:00 AM and 6:00 PM
*/30 * * * *   every 30 minutes (not recommended — keep volume low)
```
