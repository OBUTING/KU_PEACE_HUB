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

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "obutindahoras18@gmail.com,obutindahoras19@gmail.com")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function isConfiguredAdminEmail(email) {
  return typeof email === "string" && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

async function syncAdminRoleForEmail(userId, email) {
  if (!userId || !isConfiguredAdminEmail(email)) return null;
  await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1 AND role <> 'admin'`, [userId]);
  return "admin";
}

const sessionTokens = new Map();

function createAuthToken(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  sessionTokens.set(token, userId);
  return token;
}

async function getUserById(userId) {
  if (!userId) return null;
  const { rows } = await pool.query(
    `SELECT id, name, email, role, status FROM users WHERE id = $1`,
    [userId]
  );
  return rows[0] || null;
}

function getAuthToken(req) {
  const authHeader = req.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return req.get("x-auth-token") || "";
}

async function requireAuth(req, res, next) {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: "Authentication required." });
  }

  const userId = sessionTokens.get(token);
  if (!userId) {
    return res.status(401).json({ ok: false, error: "Authentication required." });
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Authentication required." });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not verify your session." });
  }
}

async function requireAdmin(req, res, next) {
  const providedKey = req.get("x-admin-key") || "";
  if (ADMIN_KEY && providedKey === ADMIN_KEY) {
    req.user = { role: "admin" };
    return next();
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: "Authentication required." });
  }

  const userId = sessionTokens.get(token);
  if (!userId) {
    return res.status(401).json({ ok: false, error: "Authentication required." });
  }

  try {
    const user = await getUserById(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ ok: false, error: "Admin access required." });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not verify your admin session." });
  }
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
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Migrate a users table created before Google sign-in existed: password
  // was required then, but Google-only accounts have no password.
  await pool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;`);
  // Dashboard-only metadata. Authorization still uses ADMIN_KEY so adding a
  // role/status here does not change existing login or signup behaviour.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);

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

  // Dashboard data. These records are deliberately kept separate from the
  // public-facing tables above so the admin workspace can grow without
  // changing the behaviour of the existing site.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS volunteer_applications (
      id UUID PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      county TEXT NOT NULL DEFAULT '',
      interests JSONB NOT NULL DEFAULT '[]'::jsonb,
      availability TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT NOT NULL DEFAULT '',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT volunteer_applications_status_check
        CHECK (status IN ('pending', 'reviewed', 'approved', 'declined'))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_items (
      id UUID PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'news',
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      event_at TIMESTAMPTZ,
      location TEXT NOT NULL DEFAULT '',
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT content_items_type_check CHECK (type IN ('news', 'event')),
      CONSTRAINT content_items_status_check
        CHECK (status IN ('draft', 'scheduled', 'published', 'archived'))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_materials (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      format TEXT NOT NULL DEFAULT 'article',
      category TEXT NOT NULL DEFAULT '',
      link_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT learning_materials_status_check
        CHECK (status IN ('draft', 'published', 'archived'))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS resources (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL DEFAULT '',
      file_name TEXT NOT NULL DEFAULT '',
      file_type TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT resources_status_check
        CHECK (status IN ('draft', 'published', 'archived'))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_games (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      game_url TEXT NOT NULL DEFAULT '',
      instructions TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT admin_games_status_check
        CHECK (status IN ('draft', 'published', 'archived'))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planning',
      progress INTEGER NOT NULL DEFAULT 0,
      owner TEXT NOT NULL DEFAULT '',
      start_date DATE,
      due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT projects_status_check
        CHECK (status IN ('planning', 'active', 'on_hold', 'completed')),
      CONSTRAINT projects_progress_check CHECK (progress BETWEEN 0 AND 100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id UUID PRIMARY KEY,
      event_title TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT event_registrations_status_check
        CHECK (status IN ('pending', 'confirmed', 'attended', 'cancelled'))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      questions JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT quizzes_status_check
        CHECK (status IN ('draft', 'published', 'archived'))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS initiatives (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      county TEXT NOT NULL DEFAULT '',
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT initiatives_status_check
        CHECK (status IN ('draft', 'published', 'archived'))
    );
  `);

  console.log("Database ready (tables created if they didn't already exist).");
}

// ---------------------------------------------------------------------------
// Signatures — Messengers of Peace map
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Admin dashboard data
// ---------------------------------------------------------------------------

function cleanAdminText(value, maxLength) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function cleanAdminDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function cleanAdminDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
}

function cleanAdminList(value) {
  let values = value;
  if (typeof values === "string") {
    try {
      values = JSON.parse(values);
    } catch (err) {
      values = values.split(",");
    }
  }
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => cleanAdminText(item, 80))
    .filter(Boolean)
    .slice(0, 20);
}

function cleanAdminEnum(value, options, fallback) {
  const cleaned = cleanAdminText(value, 40).toLowerCase();
  return options.includes(cleaned) ? cleaned : fallback;
}

function cleanQuizQuestions(value) {
  let list = value;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch (err) {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, 50)
    .map((entry) => {
      const question = cleanAdminText(entry && entry.question, 300);
      const options = Array.isArray(entry && entry.options)
        ? entry.options.map((option) => cleanAdminText(option, 200)).filter(Boolean).slice(0, 8)
        : [];
      const parsedIndex = Number.parseInt(entry && entry.correctIndex, 10);
      const correctIndex = Number.isInteger(parsedIndex) ? Math.max(0, Math.min(parsedIndex, Math.max(0, options.length - 1))) : 0;
      return { question, options, correctIndex };
    })
    .filter((entry) => entry.question && entry.options.length >= 2);
}

function cleanAdminProgress(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function textField(key, column, maxLength, options = {}) {
  return {
    key,
    column,
    required: !!options.required,
    defaultValue: options.defaultValue === undefined ? "" : options.defaultValue,
    normalize: (value) => cleanAdminText(value, maxLength),
  };
}

function dateField(key, column, options = {}) {
  return {
    key,
    column,
    required: !!options.required,
    defaultValue: options.defaultValue === undefined ? null : options.defaultValue,
    normalize: options.dateOnly ? cleanAdminDateOnly : cleanAdminDate,
  };
}

function enumField(key, column, options, defaultValue) {
  return {
    key,
    column,
    defaultValue,
    normalize: (value) => cleanAdminEnum(value, options, defaultValue),
  };
}

const ADMIN_COLLECTIONS = {
  volunteers: {
    table: "volunteer_applications",
    orderBy: "submitted_at DESC",
    select: `id, full_name AS "name", email, county, interests, availability, status, notes,
             submitted_at AS "submittedAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
    fields: [
      textField("name", "full_name", 120, { required: true }),
      textField("email", "email", 160),
      textField("county", "county", 80),
      {
        key: "interests",
        column: "interests",
        defaultValue: [],
        normalize: cleanAdminList,
        toDatabase: (value) => JSON.stringify(value),
      },
      textField("availability", "availability", 300),
      enumField("status", "status", ["pending", "reviewed", "approved", "declined"], "pending"),
      textField("notes", "notes", 4000),
      dateField("submittedAt", "submitted_at", { defaultValue: () => new Date().toISOString() }),
    ],
  },
  content: {
    table: "content_items",
    orderBy: "COALESCE(published_at, created_at) DESC",
    select: `id, type, title, summary, body, image_url AS "imageUrl", status,
             event_at AS "eventAt", location, published_at AS "publishedAt",
             created_at AS "createdAt", updated_at AS "updatedAt"`,
    fields: [
      enumField("type", "type", ["news", "event"], "news"),
      textField("title", "title", 180, { required: true }),
      textField("summary", "summary", 600),
      textField("body", "body", 20000),
      textField("imageUrl", "image_url", 1200),
      enumField("status", "status", ["draft", "scheduled", "published", "archived"], "draft"),
      dateField("eventAt", "event_at"),
      textField("location", "location", 180),
      dateField("publishedAt", "published_at"),
    ],
  },
  materials: {
    table: "learning_materials",
    orderBy: "created_at DESC",
    select: `id, title, description, format, category, link_url AS "linkUrl", status,
             created_at AS "createdAt", updated_at AS "updatedAt"`,
    fields: [
      textField("title", "title", 180, { required: true }),
      textField("description", "description", 4000),
      textField("format", "format", 60, { defaultValue: "article" }),
      textField("category", "category", 100),
      textField("linkUrl", "link_url", 1200),
      enumField("status", "status", ["draft", "published", "archived"], "draft"),
    ],
  },
  resources: {
    table: "resources",
    orderBy: "created_at DESC",
    select: `id, title, description, category, file_url AS "fileUrl", file_name AS "fileName",
             file_type AS "fileType", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
    fields: [
      textField("title", "title", 180, { required: true }),
      textField("description", "description", 4000),
      textField("category", "category", 100),
      textField("fileUrl", "file_url", 1200),
      textField("fileName", "file_name", 255),
      textField("fileType", "file_type", 120),
      enumField("status", "status", ["draft", "published", "archived"], "draft"),
    ],
  },
  games: {
    table: "admin_games",
    orderBy: "created_at DESC",
    select: `id, title, description, game_url AS "gameUrl", instructions, status,
             created_at AS "createdAt", updated_at AS "updatedAt"`,
    fields: [
      textField("title", "title", 180, { required: true }),
      textField("description", "description", 4000),
      textField("gameUrl", "game_url", 1200),
      textField("instructions", "instructions", 10000),
      enumField("status", "status", ["draft", "published", "archived"], "draft"),
    ],
  },
  projects: {
    table: "projects",
    orderBy: "updated_at DESC",
    select: `id, title, description, status, progress, owner, start_date AS "startDate",
             due_date AS "dueDate", created_at AS "createdAt", updated_at AS "updatedAt"`,
    fields: [
      textField("title", "title", 180, { required: true }),
      textField("description", "description", 4000),
      enumField("status", "status", ["planning", "active", "on_hold", "completed"], "planning"),
      { key: "progress", column: "progress", defaultValue: 0, normalize: cleanAdminProgress },
      textField("owner", "owner", 120),
      dateField("startDate", "start_date", { dateOnly: true }),
      dateField("dueDate", "due_date", { dateOnly: true }),
    ],
  },
  registrations: {
    table: "event_registrations",
    orderBy: "submitted_at DESC",
    select: `id, full_name AS "name", email, phone, event_title AS "eventTitle", notes, status,
             submitted_at AS "submittedAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
    fields: [
      textField("name", "full_name", 120, { required: true }),
      textField("email", "email", 160),
      textField("phone", "phone", 40),
      textField("eventTitle", "event_title", 180, { required: true }),
      textField("notes", "notes", 2000),
      enumField("status", "status", ["pending", "confirmed", "attended", "cancelled"], "pending"),
      dateField("submittedAt", "submitted_at", { defaultValue: () => new Date().toISOString() }),
    ],
  },
  quizzes: {
    table: "quizzes",
    orderBy: "created_at DESC",
    select: `id, title, description, category, questions, status,
             created_at AS "createdAt", updated_at AS "updatedAt"`,
    fields: [
      textField("title", "title", 180, { required: true }),
      textField("description", "description", 4000),
      textField("category", "category", 100),
      { key: "questions", column: "questions", defaultValue: [], normalize: cleanQuizQuestions, toDatabase: (value) => JSON.stringify(value) },
      enumField("status", "status", ["draft", "published", "archived"], "draft"),
    ],
  },
  initiatives: {
    table: "initiatives",
    orderBy: "created_at DESC",
    select: `id, title, description, category, county, latitude, longitude, status,
             created_at AS "createdAt", updated_at AS "updatedAt"`,
    fields: [
      textField("title", "title", 180, { required: true }),
      textField("description", "description", 4000),
      textField("category", "category", 100),
      textField("county", "county", 80),
      { key: "latitude", column: "latitude", defaultValue: null, normalize: (value) => (value === "" || value === null || value === undefined ? null : Number(value)) },
      { key: "longitude", column: "longitude", defaultValue: null, normalize: (value) => (value === "" || value === null || value === undefined ? null : Number(value)) },
      enumField("status", "status", ["draft", "published", "archived"], "draft"),
    ],
  },
};

const ADMIN_STARTER_DATA = {
  content: [{
    id: "starter-news",
    type: "news",
    title: "Publish your first update",
    summary: "Share a peacebuilding story, announcement, or upcoming event from the dashboard.",
    status: "draft",
    isStarter: true,
  }],
  materials: [{
    id: "starter-material",
    title: "Add a learning material",
    description: "Link an article, video, guide, or training module for your community.",
    format: "article",
    status: "draft",
    isStarter: true,
  }],
  resources: [{
    id: "starter-resource",
    title: "Add a downloadable resource",
    description: "Store the file URL and publishing details for a resource people can download.",
    status: "draft",
    isStarter: true,
  }],
  games: [{
    id: "starter-game",
    title: "Peace Bridge",
    description: "The existing interactive peace-building game is ready to be added to the catalogue.",
    gameUrl: "game.html",
    status: "draft",
    isStarter: true,
  }],
  projects: [{
    id: "starter-project",
    title: "Portable Peace Dialogue Tree",
    description: "Add a project record to track its goals, owner, timeline, and progress.",
    status: "planning",
    progress: 0,
    isStarter: true,
  }],
  quizzes: [{
    id: "starter-quiz",
    title: "Add a peacebuilding quiz",
    description: "Write a few questions to check understanding after a course or workshop.",
    category: "Learning",
    questions: [],
    status: "draft",
    isStarter: true,
  }],
  initiatives: [{
    id: "starter-initiative",
    title: "Add an initiative to the map",
    description: "Plot a peace club, dialogue circle, or project location on the initiatives map.",
    category: "Peace club",
    status: "draft",
    isStarter: true,
  }],
};

function getAdminCollection(collection) {
  return ADMIN_COLLECTIONS[collection] || null;
}

function getAdminLimit(rawLimit, fallback = 50) {
  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 200));
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function hasRequiredValue(value) {
  return typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined;
}

function getDefaultFieldValue(field) {
  return typeof field.defaultValue === "function" ? field.defaultValue() : field.defaultValue;
}

function normalizeAdminFields(schema, input, partial) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const fields = [];
  for (const field of schema.fields) {
    const provided = hasOwn(body, field.key);
    if (partial && !provided) continue;
    const normalized = field.normalize(provided ? body[field.key] : getDefaultFieldValue(field));
    if (field.required && !hasRequiredValue(normalized)) return { error: `${field.key} is required.` };
    fields.push({ ...field, value: field.toDatabase ? field.toDatabase(normalized) : normalized });
  }
  return { fields };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
}

async function listAdminCollection(schema, limit) {
  const { rows } = await pool.query(
    `SELECT ${schema.select} FROM ${schema.table} ORDER BY ${schema.orderBy} LIMIT $1`,
    [limit]
  );
  return rows;
}

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

// Public — the news & events feed. Only ever exposes published items,
// never drafts or scheduled/archived ones. Optional ?type=news|event filter.
app.get("/api/content", async (req, res) => {
  const type = req.query.type === "event" || req.query.type === "news" ? req.query.type : null;
  try {
    const params = type ? ["published", type] : ["published"];
    const typeClause = type ? "AND type = $2" : "";
    const { rows } = await pool.query(
      `SELECT id, type, title, summary, body, image_url AS "imageUrl",
              event_at AS "eventAt", location, published_at AS "publishedAt"
       FROM content_items
       WHERE status = $1 ${typeClause}
       ORDER BY COALESCE(event_at, published_at) DESC NULLS LAST, published_at DESC
       LIMIT 100`,
      params
    );
    res.json({ ok: true, content: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load news & events." });
  }
});

// Public — the initiatives map (peace clubs, dialogue circles, and other
// projects plotted by admins) only ever exposes published pins with a
// location, never drafts.
app.get("/api/initiatives", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, category, county, latitude, longitude
       FROM initiatives
       WHERE status = 'published' AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY created_at DESC`
    );
    res.json({ ok: true, initiatives: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load initiatives." });
  }
});

// Public — published quizzes only, for the peace guide / learning pages.
app.get("/api/quizzes", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, category, questions
       FROM quizzes
       WHERE status = 'published'
       ORDER BY created_at DESC`
    );
    res.json({ ok: true, quizzes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load quizzes." });
  }
});

// Public — event sign-up form on the news & events pages. Registrations
// land as "pending" and are reviewed from the admin Events & registration
// section, the same way volunteer applications are reviewed.
app.post("/api/events/register", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const eventTitle = cleanAdminText(body.eventTitle, 180);
  const fullName = cleanAdminText(body.fullName || body.name, 120);
  const email = cleanAdminText(body.email, 160);
  const phone = cleanAdminText(body.phone, 40);
  const notes = cleanAdminText(body.notes, 2000);

  if (!eventTitle || !fullName) {
    return res.status(400).json({ ok: false, error: "eventTitle and fullName are required." });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO event_registrations (id, event_title, full_name, email, phone, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, event_title AS "eventTitle", full_name AS "name", email, phone, status,
                 submitted_at AS "submittedAt"`,
      [crypto.randomUUID(), eventTitle, fullName, email, phone, notes]
    );
    res.status(201).json({ ok: true, registration: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not save your registration." });
  }
});

app.get("/api/admin/verify", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

// A compact dashboard summary. Counts come from the database; starter cards
// only appear in `recent` for empty admin-managed collections and are never
// persisted as fake applications or analytics.
app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
  try {
    const [
      userResult,
      volunteerResult,
      contentResult,
      materialResult,
      resourceResult,
      gameResult,
      projectResult,
      signatureResult,
      pledgeResult,
      gamePledgeResult,
      reportResult,
      recentUsers,
      recentVolunteers,
      recentContent,
      recentMaterials,
      recentResources,
      recentGames,
      recentProjects,
      recentRegistrations,
      recentQuizzes,
      recentInitiatives,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM users`),
      pool.query(`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status = 'pending')::int AS pending FROM volunteer_applications`),
      pool.query(`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE type = 'news')::int AS news, COUNT(*) FILTER (WHERE type = 'event')::int AS events FROM content_items`),
      pool.query(`SELECT COUNT(*)::int AS count FROM learning_materials`),
      pool.query(`SELECT COUNT(*)::int AS count FROM resources`),
      pool.query(`SELECT COUNT(*)::int AS count FROM admin_games`),
      pool.query(`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status = 'active')::int AS active, COUNT(*) FILTER (WHERE status = 'completed')::int AS completed FROM projects`),
      pool.query(`SELECT COUNT(*)::int AS count FROM signatures`),
      pool.query(`SELECT COUNT(*)::int AS count FROM pledges`),
      pool.query(`SELECT COUNT(*)::int AS count FROM game_pledges`),
      pool.query(`SELECT COUNT(*)::int AS count FROM incident_reports`),
      pool.query(`SELECT id, name, email, role, status, created_at AS "createdAt", updated_at AS "updatedAt" FROM users ORDER BY created_at DESC LIMIT 5`),
      listAdminCollection(ADMIN_COLLECTIONS.volunteers, 5),
      listAdminCollection(ADMIN_COLLECTIONS.content, 5),
      listAdminCollection(ADMIN_COLLECTIONS.materials, 5),
      listAdminCollection(ADMIN_COLLECTIONS.resources, 5),
      listAdminCollection(ADMIN_COLLECTIONS.games, 5),
      listAdminCollection(ADMIN_COLLECTIONS.projects, 5),
      listAdminCollection(ADMIN_COLLECTIONS.registrations, 5),
      listAdminCollection(ADMIN_COLLECTIONS.quizzes, 5),
      listAdminCollection(ADMIN_COLLECTIONS.initiatives, 5),
    ]);

    const count = (result, key = "count") => Number(result.rows[0][key] || 0);
    const current = {
      content: recentContent,
      materials: recentMaterials,
      resources: recentResources,
      games: recentGames,
      projects: recentProjects,
      quizzes: recentQuizzes,
      initiatives: recentInitiatives,
    };
    const withStarter = (collection) => current[collection].length
      ? current[collection]
      : ADMIN_STARTER_DATA[collection];

    res.json({
      ok: true,
      metrics: {
        users: count(userResult),
        volunteers: count(volunteerResult),
        content: count(contentResult),
        materials: count(materialResult),
        resources: count(resourceResult),
        games: count(gameResult),
        projects: count(projectResult),
        registrations: count(userResult),
        // The public site does not currently record material/course completion events.
        courseCompletions: 0,
        courseCompletionTracking: false,
      },
      breakdowns: {
        volunteers: { pending: count(volunteerResult, "pending") },
        content: { news: count(contentResult, "news"), events: count(contentResult, "events") },
        projects: {
          active: count(projectResult, "active"),
          completed: count(projectResult, "completed"),
        },
      },
      analytics: {
        // Visitor events are not currently captured elsewhere in the app.
        visitors: null,
        visitorTracking: false,
        registrations: count(userResult),
        courseCompletions: 0,
        courseCompletionTracking: false,
        signatures: count(signatureResult),
        pledges: count(pledgeResult),
        gameCompletions: count(gamePledgeResult),
        incidentReports: count(reportResult),
      },
      recent: {
        users: recentUsers.rows,
        volunteers: recentVolunteers,
        content: withStarter("content"),
        materials: withStarter("materials"),
        resources: withStarter("resources"),
        games: withStarter("games"),
        projects: withStarter("projects"),
        registrations: recentRegistrations,
        quizzes: withStarter("quizzes"),
        initiatives: withStarter("initiatives"),
      },
      emptyCollections: Object.keys(current).filter((collection) => current[collection].length === 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load dashboard data." });
  }
});

const ADMIN_USER_ROLES = ["member", "volunteer", "editor", "admin"];
const ADMIN_USER_STATUSES = ["active", "suspended"];
const ADMIN_USER_SELECT = `id, name, email, role, status,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

// User management data. Password hashes and OAuth identifiers are deliberately
// never included in an admin response. Role/status are admin metadata only;
// they do not alter the existing ADMIN_KEY authorization model.
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${ADMIN_USER_SELECT} FROM users
       ORDER BY created_at DESC LIMIT $1`,
      [getAdminLimit(req.query.limit)]
    );
    res.json({ ok: true, users: rows, items: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load users." });
  }
});

app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ ok: false, error: "Invalid user id." });

  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const assignments = [];
  const values = [];

  if (hasOwn(body, "name")) {
    values.push(cleanAdminText(body.name, 80));
    assignments.push(`name = $${values.length}`);
  }
  if (hasOwn(body, "role")) {
    const role = cleanAdminText(body.role, 40).toLowerCase();
    if (!ADMIN_USER_ROLES.includes(role)) {
      return res.status(400).json({ ok: false, error: "role must be member, volunteer, editor, or admin." });
    }
    values.push(role);
    assignments.push(`role = $${values.length}`);
  }
  if (hasOwn(body, "status")) {
    const status = cleanAdminText(body.status, 40).toLowerCase();
    if (!ADMIN_USER_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: "status must be active or suspended." });
    }
    values.push(status);
    assignments.push(`status = $${values.length}`);
  }
  if (!assignments.length) {
    return res.status(400).json({ ok: false, error: "Provide name, role, or status to update." });
  }

  assignments.push("updated_at = now()");
  values.push(req.params.id);

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET ${assignments.join(", ")}
       WHERE id = $${values.length}
       RETURNING ${ADMIN_USER_SELECT}`,
      values
    );
    if (!rows[0]) return res.status(404).json({ ok: false, error: "User not found." });
    res.json({ ok: true, user: rows[0], item: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not update user." });
  }
});

app.get("/api/admin/:collection", requireAdmin, async (req, res) => {
  const schema = getAdminCollection(req.params.collection);
  if (!schema) return res.status(404).json({ ok: false, error: "Unknown admin collection." });

  try {
    const items = await listAdminCollection(schema, getAdminLimit(req.query.limit));
    res.json({ ok: true, collection: req.params.collection, items, count: items.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load admin data." });
  }
});

app.post("/api/admin/:collection", requireAdmin, async (req, res) => {
  const schema = getAdminCollection(req.params.collection);
  if (!schema) return res.status(404).json({ ok: false, error: "Unknown admin collection." });

  const normalized = normalizeAdminFields(schema, req.body, false);
  if (normalized.error) return res.status(400).json({ ok: false, error: normalized.error });

  try {
    const columns = ["id", ...normalized.fields.map((field) => field.column)];
    const values = [crypto.randomUUID(), ...normalized.fields.map((field) => field.value)];
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${schema.table} (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING ${schema.select}`,
      values
    );
    res.status(201).json({ ok: true, collection: req.params.collection, item: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not save admin data." });
  }
});

app.patch("/api/admin/:collection/:id", requireAdmin, async (req, res) => {
  const schema = getAdminCollection(req.params.collection);
  if (!schema) return res.status(404).json({ ok: false, error: "Unknown admin collection." });
  if (!isUuid(req.params.id)) return res.status(400).json({ ok: false, error: "Invalid item id." });

  const normalized = normalizeAdminFields(schema, req.body, true);
  if (normalized.error) return res.status(400).json({ ok: false, error: normalized.error });
  if (normalized.fields.length === 0) {
    return res.status(400).json({ ok: false, error: "Provide at least one editable field." });
  }

  try {
    const assignments = normalized.fields.map((field, index) => `${field.column} = $${index + 1}`);
    assignments.push("updated_at = now()");
    const values = [...normalized.fields.map((field) => field.value), req.params.id];
    const { rows } = await pool.query(
      `UPDATE ${schema.table}
       SET ${assignments.join(", ")}
       WHERE id = $${values.length}
       RETURNING ${schema.select}`,
      values
    );
    if (!rows[0]) return res.status(404).json({ ok: false, error: "Admin item not found." });
    res.json({ ok: true, collection: req.params.collection, item: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not update admin data." });
  }
});

app.delete("/api/admin/:collection/:id", requireAdmin, async (req, res) => {
  const schema = getAdminCollection(req.params.collection);
  if (!schema) return res.status(404).json({ ok: false, error: "Unknown admin collection." });
  if (!isUuid(req.params.id)) return res.status(400).json({ ok: false, error: "Invalid item id." });

  try {
    const { rowCount } = await pool.query(`DELETE FROM ${schema.table} WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ ok: false, error: "Admin item not found." });
    res.json({ ok: true, collection: req.params.collection, id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not delete admin data." });
  }
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
      role: isConfiguredAdminEmail(email.trim()) ? "admin" : "member",
    };

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
      [user.id, user.name, user.email, user.passwordHash, user.role]
    );

    const token = createAuthToken(user.id);
    res.status(201).json({
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
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

    const role = (await syncAdminRoleForEmail(user.id, user.email)) || user.role || "member";
    const token = createAuthToken(user.id);
    res.json({
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role },
    });
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
      const role = isConfiguredAdminEmail(email) ? "admin" : "member";
      const inserted = await pool.query(
        `INSERT INTO users (id, name, email, google_id, role) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role`,
        [id, name, email, googleId, role]
      );
      user = inserted.rows[0];
    } else if (!user.google_id) {
      // An account with this email already existed (from email sign-up) —
      // link it to this Google account instead of creating a duplicate.
      await pool.query(`UPDATE users SET google_id = $1 WHERE id = $2`, [googleId, user.id]);
    }

    const role = (await syncAdminRoleForEmail(user.id, user.email)) || user.role || "member";
    const token = createAuthToken(user.id);
    res.json({
      ok: true,
      token,
      user: { id: user.id, name: user.name || name, email: user.email, role },
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ ok: false, error: "Could not verify your Google sign-in. Please try again." });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || "member",
    },
  });
});

// ---------------------------------------------------------------------------
// Peace Guide — AI chat assistant (public/peace-guide.html)
//
// Calls the Anthropic API directly over Node's built-in `https` module —
// no SDK dependency needed. Requires an ANTHROPIC_API_KEY environment
// variable; the key is never sent to the browser, only used server-side.
// ---------------------------------------------------------------------------

const PEACE_GUIDE_SYSTEM_PROMPT = `You are the AI Peace Mentor, the conversational assistant for the KU Peace Innovation Hub — a youth peacebuilding project run under Kenyatta University Scouts, focused on Kenya's 2027 general elections.

Your job: answer questions about peacebuilding, conflict resolution, civic engagement, conflict prevention, electoral violence, mediation, and youth participation in Kenyan civic life.

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
