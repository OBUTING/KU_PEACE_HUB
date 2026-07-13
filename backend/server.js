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
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

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
      x REAL NOT NULL,
      y REAL NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

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
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
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
    const { rows } = await pool.query(
      `SELECT id, name, county, x, y, created_at AS "createdAt" FROM signatures ORDER BY created_at ASC`
    );
    res.json({ ok: true, signatures: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load signatures." });
  }
});

app.get("/api/signatures/recent", async (req, res) => {
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
    res.json({ ok: true, count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not load signature count." });
  }
});

app.post("/api/signatures", async (req, res) => {
  const { name, county, x, y } = req.body || {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ ok: false, error: "Name is required." });
  }
  if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
    return res.status(400).json({ ok: false, error: "Missing map position." });
  }

  const signature = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80),
    county: (county || "").toString().trim().slice(0, 60),
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };

  try {
    const { rows } = await pool.query(
      `INSERT INTO signatures (id, name, county, x, y)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, county, x, y, created_at AS "createdAt"`,
      [signature.id, signature.name, signature.county, signature.x, signature.y]
    );
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM signatures`);
    res.status(201).json({ ok: true, signature: rows[0], count: countRows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not save your signature. Please try again." });
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

    if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
      return res.status(401).json({ ok: false, error: "Incorrect email or password." });
    }

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
    res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not log you in. Please try again." });
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
