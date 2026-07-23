# Peace Hub WhatsApp FAQ Bot

Auto-replies to **direct (1-on-1) WhatsApp messages** with peace-related
FAQ answers, matched by keyword. This is a separate project from
`whatsapp-bot/` (the sibling folder), which instead broadcasts scheduled
reminders to a group — different job, different bot.

## ⚠️ Read this first

Uses Baileys, an *unofficial* library — connecting it to WhatsApp is
against WhatsApp's Terms of Service, and the connected number can be
rate-limited or banned. Use a secondary/test number where possible.

## What it does

- Ignores group messages entirely — only responds to direct messages
- Matches incoming text against a keyword library in `faq.js`
- Replies with the matching answer, or a menu of topics if nothing matches
- Typing "menu", "help", or just saying "hi" also shows the topic menu

## Setup

```bash
cd whatsapp-faq-bot
npm install
npm start
```

Scan the QR code that prints in your terminal: **WhatsApp → Settings →
Linked Devices → Link a Device**.

Once connected, message that WhatsApp number directly from a different
phone/account to test it. Try:
- `menu`
- `pledge`
- `election`
- `report`
- `what is peace`

## Running this alongside the broadcast bot

If you want both bots active on the **same** WhatsApp number at once,
that's fine — WhatsApp supports several linked devices simultaneously, and
each bot keeps its own separate `./session` folder, so they won't
interfere with each other. Just run each from its own folder/terminal.

## Editing the FAQ content

Open `faq.js` and edit the `faqs` array. Each entry looks like:

```js
{
  topic: "Short label",
  keywords: ["phrase one", "phrase two"],
  answer: "What the bot replies with.",
},
```

The bot does a simple substring match — if any keyword appears anywhere in
the incoming message (lowercased), that entry's answer is sent. The first
matching entry wins, so put more specific topics before general ones if
you add overlapping keywords.

## Where to run this long-term

Same guidance as the broadcast bot: needs a machine that stays on
continuously and keeps `./session` on persistent disk. Since Baileys has
no browser dependency, it's lightweight enough for a small VPS, a
Raspberry Pi, your own always-on computer, or a small paid Render
instance with a persistent disk.
