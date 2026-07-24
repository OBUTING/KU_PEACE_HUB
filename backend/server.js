/**
 * Common Ground / KU Peace Hub — single backend.
 *
 * Serves the static front end from ../public and exposes three small JSON
 * APIs backed by a Postgres database:
 *
 *   /api/signatures   — the "Messengers of Peace" map (map.html)
 *   /api/pledges      — the Youth Peace Pledge form (pledge.html)
 *   /api/auth         — email log in / sign up (login.html)
 *
 * Requires a DATABASE_URL environment variable pointing at a Postgres
 * instance (e.g. Render's free Postgres). Tables are created automatically
 * on startup if they don't already exist — no separate migration step.
 *
 * Run with:  npm install && npm start   (from inside /backend)
 */

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const { OAuth2Client } = require("google-auth-library");

const app = express();
const PORT = process.env.PORT || 3000;

// Added on top of the real signature count wherever it's shown to visitors
// (e.g. "10,247 committed" instead of "247 committed"). The real count is
// still what's stored and used for internal stats — this only affects the
// public-facing number.
const SIGNATURE_COUNT_OFFSET = 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Google Sign-In — set GOOGLE_CLIENT_ID to the same Client ID used in
// public/login.html (the data-client_id attribute on #g_id_onload).
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
  console.warn("Missing GOOGLE_CLIENT_ID environment variable — Google sign-in will fail until it's set.");
}
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Admin-only access — gates the private "Recent Messengers of Peace" list
// on map.html so it isn't public. Set ADMIN_KEY as an environment variable
// (any secret string you pick) both here on the server and, when prompted,
// in the browser on map.html.
const ADMIN_KEY = process.env.ADMIN_KEY || "";
if (!ADMIN_KEY) {
  console.warn(
    "Missing ADMIN_KEY environment variable — the private recent-signatures view will refuse all requests until it's set."
  );
}

function requireAdmin(req, res, next) {
  const providedKey = req.get("x-admin-key") || "";
  if (!ADMIN_KEY || providedKey !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: "Admin access required." });
  }
  next();
}

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

if (!process.env.DATABASE_URL) {
  console.error(
    "Missing DATABASE_URL environment variable. Set it to your Postgres connection string " +
      "(e.g. from Render's Postgres dashboard) before starting the server."
  );
}

// Render (and most hosted Postgres providers) require SSL. Set
// PGSSLMODE=disable in your environment if you're connecting to a local
// Postgres instance that doesn't use SSL.
const useSSL = process.env.PGSSLMODE !== "disable";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS signatures (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      county TEXT,
      age INT,
      is_scout BOOLEAN,
      x REAL NOT NULL,
      y REAL NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Migrate a signatures table created before age/scout tracking existed.
  await pool.query(`ALTER TABLE signatures ADD COLUMN IF NOT EXISTS age INT;`);
  await pool.query(`ALTER TABLE signatures ADD COLUMN IF NOT EXISTS is_scout BOOLEAN;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pledges (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      county TEXT,
      commitments JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_pledges (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      promise_text TEXT NOT NULL,
      character TEXT,
      empathy INT DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Migrate a users table created before Google sign-in existed: password
  // was required then, but Google-only accounts have no password.
  await pool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;`);

  // Anonymous incident reports — deliberately has no name/contact column,
  // so there's nothing identifying to store even by accident.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS incident_reports (
      id UUID PRIMARY KEY,
      category TEXT,
      county TEXT,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  console.log("Database ready (tables created if they didn't already exist).");
}

// ---------------------------------------------------------------------------
// Signatures — Messengers of Peace map
// ---------------------------------------------------------------------------

app.get("/api/signatures", async (req, res) => {
  try {
    // Public endpoint — used only to plot anonymous dots on the map, so
    // names are intentionally left out here. See /api/signatures/recent
    // (admin-only) for the version that includes names.
    const { rows } = await pool.query(
      `SELECT id, county, x, y, created_at AS "createdAt" FROM signatures ORDER BY created_at ASC`
    );
    res.json({ ok: true, signatures: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load signatures." });
  }
});

app.get("/api/admin/verify", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.get("/api/signatures/recent", requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 8, 50);
  try {
    const { rows } = await pool.query(
      `SELECT id, name, county, x, y, created_at AS "createdAt"
       FROM signatures ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ ok: true, signatures: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load recent signatures." });
  }
});

app.get("/api/signatures/count", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM signatures`);
    res.json({ ok: true, count: rows[0].count + SIGNATURE_COUNT_OFFSET });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load signature count." });
  }
});

app.post("/api/signatures", async (req, res) => {
  const { name, county, x, y, age: rawAge, isScout: rawIsScout } = req.body || {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ ok: false, error: "Name is required." });
  }
  if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
    return res.status(400).json({ ok: false, error: "Missing map position." });
  }

  // Age is optional. If provided, it must be a sane whole number.
  let age = null;
  if (rawAge !== undefined && rawAge !== null && rawAge !== "") {
    const parsedAge = Number(rawAge);
    if (!Number.isInteger(parsedAge) || parsedAge < 5 || parsedAge > 120) {
      return res.status(400).json({ ok: false, error: "Enter a valid age (5–120)." });
    }
    age = parsedAge;
  }

  // Scout status is optional too — "yes" / "no" from the form, or omitted.
  let isScout = null;
  if (rawIsScout === "yes" || rawIsScout === true) isScout = true;
  else if (rawIsScout === "no" || rawIsScout === false) isScout = false;

  const signature = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80),
    county: (county || "").toString().trim().slice(0, 60),
    age,
    isScout,
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };

  try {
    const { rows } = await pool.query(
      `INSERT INTO signatures (id, name, county, age, is_scout, x, y)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, county, x, y, created_at AS "createdAt"`,
      [signature.id, signature.name, signature.county, signature.age, signature.isScout, signature.x, signature.y]
    );
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM signatures`);
    res.status(201).json({
      ok: true,
      signature: rows[0],
      count: countRows[0].count + SIGNATURE_COUNT_OFFSET,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not save your signature. Please try again." });
  }
});

app.get("/api/signatures/stats", async (req, res) => {
  try {
    const ageRows = await pool.query(`SELECT age FROM signatures WHERE age IS NOT NULL`);
    const ages = ageRows.rows.map((r) => r.age);
    const averageAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;

    const bucketOf = (age) => {
      if (age < 18) return "Under 18";
      if (age <= 25) return "18–25";
      if (age <= 35) return "26–35";
      if (age <= 50) return "36–50";
      return "51+";
    };
    const bucketCounts = {};
    ages.forEach((age) => {
      const b = bucketOf(age);
      bucketCounts[b] = (bucketCounts[b] || 0) + 1;
    });
    let mostCommonAgeGroup = null;
    let mostCommonAgeGroupCount = 0;
    Object.entries(bucketCounts).forEach(([bucket, count]) => {
      if (count > mostCommonAgeGroupCount) {
        mostCommonAgeGroup = bucket;
        mostCommonAgeGroupCount = count;
      }
    });

    const { rows: topCountyRows } = await pool.query(
      `SELECT county, COUNT(*)::int AS cnt FROM signatures
       WHERE county IS NOT NULL AND county <> ''
       GROUP BY county ORDER BY cnt DESC LIMIT 1`
    );
    const { rows: distinctCountyRows } = await pool.query(
      `SELECT COUNT(DISTINCT county)::int AS distinct_count FROM signatures
       WHERE county IS NOT NULL AND county <> ''`
    );

    const { rows: scoutRows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_scout = true)::int AS scout_count,
         COUNT(*) FILTER (WHERE is_scout = false)::int AS non_scout_count
       FROM signatures`
    );
    const scoutCount = scoutRows[0].scout_count;
    const nonScoutCount = scoutRows[0].non_scout_count;
    const scoutAnswered = scoutCount + nonScoutCount;

    res.json({
      ok: true,
      stats: {
        age: {
          average: averageAge,
          mostCommonGroup: mostCommonAgeGroup,
          mostCommonGroupCount: mostCommonAgeGroupCount,
          responses: ages.length,
        },
        county: {
          top: topCountyRows[0]?.county || null,
          topCount: topCountyRows[0]?.cnt || 0,
          distinctCount: distinctCountyRows[0].distinct_count,
        },
        scout: {
          scoutCount,
          nonScoutCount,
          scoutPercent: scoutAnswered ? Math.round((scoutCount / scoutAnswered) * 100) : null,
          nonScoutPercent: scoutAnswered ? Math.round((nonScoutCount / scoutAnswered) * 100) : null,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load signature statistics." });
  }
});

// ---------------------------------------------------------------------------
// Pledges — Youth Peace Pledge
// ---------------------------------------------------------------------------

app.post("/api/pledges", async (req, res) => {
  const { name, county, commitments } = req.body || {};

  if (!Array.isArray(commitments) || commitments.length === 0) {
    return res.status(400).json({ ok: false, error: "Choose at least one commitment." });
  }

  const pledge = {
    id: crypto.randomUUID(),
    name: (name || "").toString().trim().slice(0, 80) || "Anonymous",
    county: (county || "").toString().trim().slice(0, 60),
    commitments: commitments.map((c) => c.toString().slice(0, 200)).slice(0, 20),
  };

  try {
    const { rows } = await pool.query(
      `INSERT INTO pledges (id, name, county, commitments)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, county, commitments, created_at AS "createdAt"`,
      [pledge.id, pledge.name, pledge.county, JSON.stringify(pledge.commitments)]
    );
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM pledges`);
    res.status(201).json({ ok: true, pledge: rows[0], count: countRows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not save your pledge. Please try again." });
  }
});

app.get("/api/pledges/count", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM pledges`);
    res.json({ ok: true, count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load pledge count." });
  }
});

// ---------------------------------------------------------------------------
// Game pledges — the "Peace Wall" on the Peace Bridge game's end screen
// (public/game.html, public/js/game.js). Kept separate from the youth
// pledge API above since they're different content and different forms.
// ---------------------------------------------------------------------------

// Strip tags/control characters and cap length — same light sanitization
// the game's original standalone backend used.
function cleanGameText(str, maxLen) {
  if (typeof str !== "string") return "";
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
}

app.post("/api/game-pledge", async (req, res) => {
  const name = cleanGameText(req.body && req.body.name, 40);
  const text = cleanGameText(req.body && req.body.text, 220);
  const character = cleanGameText(req.body && req.body.character, 30);
  const empathyRaw = req.body ? req.body.empathy : 0;
  const empathy = Number.isFinite(empathyRaw) ? Math.max(0, Math.min(99, empathyRaw)) : 0;

  if (!name || !text) {
    return res.status(400).json({ error: "Name and promise text are required" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO game_pledges (id, name, promise_text, character, empathy)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, promise_text AS "text", character, empathy, created_at AS "createdAt"`,
      [crypto.randomUUID(), name, text, character, empathy]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/game-pledges", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, promise_text AS "text", character, empathy, created_at AS "createdAt"
       FROM game_pledges ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// Auth — email log in / sign up (demo-grade: bcrypt + opaque token).
// Swap for a real session/JWT strategy before taking this to production.
// ---------------------------------------------------------------------------

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ ok: false, error: "Password must be at least 8 characters." });
  }

  try {
    const existing = await pool.query(`SELECT id FROM users WHERE lower(email) = lower($1)`, [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ ok: false, error: "An account with that email already exists." });
    }

    const user = {
      id: crypto.randomUUID(),
      name: (name || "").toString().trim().slice(0, 80),
      email: email.trim(),
      passwordHash: bcrypt.hashSync(password, 10),
    };

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)`,
      [user.id, user.name, user.email, user.passwordHash]
    );

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
    res.status(201).json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not create your account. Please try again." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};

  try {
    const { rows } = await pool.query(`SELECT * FROM users WHERE lower(email) = lower($1)`, [
      (email || "").toString().trim(),
    ]);
    const user = rows[0];

    if (!user || !user.password_hash || !bcrypt.compareSync(password || "", user.password_hash)) {
      return res.status(401).json({ ok: false, error: "Incorrect email or password." });
    }

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
    res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not log you in. Please try again." });
  }
});

app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body || {};

  if (!credential) {
    return res.status(400).json({ ok: false, error: "Missing Google credential." });
  }
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ ok: false, error: "Google sign-in isn't configured on this server yet." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(400).json({ ok: false, error: "Your Google account's email isn't verified." });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = (payload.name || "").toString().slice(0, 80);

    let { rows } = await pool.query(`SELECT * FROM users WHERE google_id = $1 OR lower(email) = lower($2)`, [
      googleId,
      email,
    ]);
    let user = rows[0];

    if (!user) {
      const id = crypto.randomUUID();
      const inserted = await pool.query(
        `INSERT INTO users (id, name, email, google_id) VALUES ($1, $2, $3, $4)
         RETURNING id, name, email`,
        [id, name, email, googleId]
      );
      user = inserted.rows[0];
    } else if (!user.google_id) {
      // An account with this email already existed (from email sign-up) —
      // link it to this Google account instead of creating a duplicate.
      await pool.query(`UPDATE users SET google_id = $1 WHERE id = $2`, [googleId, user.id]);
    }

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
    res.json({ ok: true, token, user: { id: user.id, name: user.name || name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(401).json({ ok: false, error: "Could not verify your Google sign-in. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// Peace Guide — AI chat assistant (public/peace-guide.html)
//
// Calls the Anthropic API directly over Node's built-in `https` module —
// no SDK dependency needed. Requires an ANTHROPIC_API_KEY environment
// variable; the key is never sent to the browser, only used server-side.
// ---------------------------------------------------------------------------

const PEACE_GUIDE_SYSTEM_PROMPT = `You are the Peace Guide, the conversational assistant for the KU Peace Innovation Hub — a youth peacebuilding project run under Kenyatta University Scouts, focused on Kenya's 2027 general elections.

Your job: answer questions about peacebuilding, civic engagement, conflict prevention, electoral violence, mediation, and youth participation in Kenyan civic life.

Voice: warm, clear, encouraging — speaking to Kenyan youth (roughly ages 13-25), never condescending. Plain language over jargon. Keep answers focused: 2-4 short paragraphs, or a short list when steps are being explained. Where relevant, ground answers in the Kenyan context (counties, IEBC, NCIC, past election cycles) without being party-political or taking sides on any candidate, party, or contested political claim — stay neutral on partisan matters and instead focus on process, safety, rights, and constructive action.

If someone describes an emergency, immediate danger, or wanting to report an incident, tell them to call 999 / 112 (Kenya's national emergency lines) right now, and mention this site's Report page for non-urgent reporting.

If a question is dangerous (e.g. asking how to incite violence) or completely unrelated to peacebuilding/civic life, gently redirect to what the Hub is for.`;

const PEACE_GUIDE_MAX_HISTORY_MESSAGES = 20;
const PEACE_GUIDE_MAX_MESSAGE_CHARS = 4000;

// Simple in-memory per-IP rate limiter — fine for a single Render instance.
const PEACE_GUIDE_RATE_WINDOW_MS = 60_000;
const PEACE_GUIDE_RATE_MAX_REQUESTS = 8;
const peaceGuideRateMap = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of peaceGuideRateMap) {
    if (now - entry.windowStart > PEACE_GUIDE_RATE_WINDOW_MS) peaceGuideRateMap.delete(ip);
  }
}, PEACE_GUIDE_RATE_WINDOW_MS).unref();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function checkPeaceGuideRateLimit(ip) {
  const now = Date.now();
  const entry = peaceGuideRateMap.get(ip);

  if (!entry || now - entry.windowStart > PEACE_GUIDE_RATE_WINDOW_MS) {
    peaceGuideRateMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (entry.count >= PEACE_GUIDE_RATE_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + PEACE_GUIDE_RATE_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  entry.count += 1;
  return { allowed: true };
}

function sanitizePeaceGuideMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return null;
  const trimmed = rawMessages.slice(-PEACE_GUIDE_MAX_HISTORY_MESSAGES);
  const cleaned = [];
  for (const m of trimmed) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    if (typeof m.content !== "string" || !m.content.trim()) continue;
    cleaned.push({ role: m.role, content: m.content.slice(0, PEACE_GUIDE_MAX_MESSAGE_CHARS) });
  }
  return cleaned;
}

function callClaude(messages) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: PEACE_GUIDE_SYSTEM_PROMPT,
      messages,
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
    };

    const apiReq = https.request(options, (apiRes) => {
      let body = "";
      apiRes.on("data", (chunk) => (body += chunk));
      apiRes.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (apiRes.statusCode >= 400) {
            reject(new Error(parsed?.error?.message || `Anthropic API error ${apiRes.statusCode}`));
            return;
          }
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });

    apiReq.on("error", reject);
    apiReq.write(payload);
    apiReq.end();
  });
}

app.post("/api/peace-guide", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is not configured with an API key." });
  }

  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = checkPeaceGuideRateLimit(ip);
  if (!allowed) {
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      error: `Too many messages — please wait ${retryAfterSeconds}s before asking again.`,
    });
  }

  const messages = sanitizePeaceGuideMessages(req.body && req.body.messages);
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'Expected a non-empty "messages" array.' });
  }

  try {
    const apiResponse = await callClaude(messages);
    const text = (apiResponse.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    res.json({ reply: text || "I couldn't generate a response — please try again." });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Could not reach the Peace Guide right now. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// Anonymous incident reports (public/report.html)
//
// No name or contact field exists on this table by design — reports are
// meant to be genuinely anonymous. This is NOT a live emergency channel;
// the front end makes that clear and always leads with Kenya's real
// emergency numbers (999 / 112) for anything urgent.
// ---------------------------------------------------------------------------

app.post("/api/reports", async (req, res) => {
  const { category, county, description } = req.body || {};

  const cleanDescription = (description || "").toString().trim().slice(0, 2000);
  if (!cleanDescription) {
    return res.status(400).json({ ok: false, error: "Please describe what happened." });
  }

  try {
    await pool.query(
      `INSERT INTO incident_reports (id, category, county, description)
       VALUES ($1, $2, $3, $4)`,
      [
        crypto.randomUUID(),
        (category || "").toString().trim().slice(0, 60),
        (county || "").toString().trim().slice(0, 60),
        cleanDescription,
      ]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not save your report. Please try again." });
  }
});

app.get("/api/reports", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, category, county, description, created_at AS "createdAt"
       FROM incident_reports ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ ok: true, reports: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load reports." });
  }
});

// ---------------------------------------------------------------------------

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Common Ground / KU Peace Hub running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to set up the database:", err.message);
    process.exit(1);
  });
