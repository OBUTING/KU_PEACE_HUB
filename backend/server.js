/**
 * Common Ground / KU Peace Hub — single backend.
 *
 * Serves the static front end from ../public and exposes three small JSON
 * APIs backed by flat JSON files in ./data (no external database needed):
 *
 *   /api/signatures   — the "Messengers of Peace" map (map.html)
 *   /api/pledges      — the Youth Peace Pledge form (pledge.html)
 *   /api/auth         — email log in / sign up (login.html)
 *
 * Run with:  npm install && npm start   (from inside /backend)
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// ---------------------------------------------------------------------------
// Tiny JSON-file storage helpers
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, "data");
const SIGNATURES_FILE = path.join(DATA_DIR, "signatures.json");
const PLEDGES_FILE = path.join(DATA_DIR, "pledges.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  [SIGNATURES_FILE, PLEDGES_FILE, USERS_FILE].forEach((file) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
  });
}

function readJSON(file) {
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`Failed to read ${file}:`, err.message);
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

ensureDataFiles();

// ---------------------------------------------------------------------------
// Signatures — Messengers of Peace map
// ---------------------------------------------------------------------------

app.get("/api/signatures", (req, res) => {
  res.json({ ok: true, signatures: readJSON(SIGNATURES_FILE) });
});

app.get("/api/signatures/recent", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 8, 50);
  const signatures = readJSON(SIGNATURES_FILE)
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
  res.json({ ok: true, signatures });
});

app.get("/api/signatures/count", (req, res) => {
  res.json({ ok: true, count: readJSON(SIGNATURES_FILE).length });
});

app.post("/api/signatures", (req, res) => {
  const { name, county, x, y } = req.body || {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ ok: false, error: "Name is required." });
  }
  if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
    return res.status(400).json({ ok: false, error: "Missing map position." });
  }

  const signatures = readJSON(SIGNATURES_FILE);
  const signature = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80),
    county: (county || "").toString().trim().slice(0, 60),
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    createdAt: new Date().toISOString(),
  };
  signatures.push(signature);
  writeJSON(SIGNATURES_FILE, signatures);
  res.status(201).json({ ok: true, signature, count: signatures.length });
});

// ---------------------------------------------------------------------------
// Pledges — Youth Peace Pledge
// ---------------------------------------------------------------------------

app.post("/api/pledges", (req, res) => {
  const { name, county, commitments } = req.body || {};

  if (!Array.isArray(commitments) || commitments.length === 0) {
    return res.status(400).json({ ok: false, error: "Choose at least one commitment." });
  }

  const pledges = readJSON(PLEDGES_FILE);
  const pledge = {
    id: crypto.randomUUID(),
    name: (name || "").toString().trim().slice(0, 80) || "Anonymous",
    county: (county || "").toString().trim().slice(0, 60),
    commitments: commitments.map((c) => c.toString().slice(0, 200)).slice(0, 20),
    createdAt: new Date().toISOString(),
  };
  pledges.push(pledge);
  writeJSON(PLEDGES_FILE, pledges);
  res.status(201).json({ ok: true, pledge, count: pledges.length });
});

app.get("/api/pledges/count", (req, res) => {
  res.json({ ok: true, count: readJSON(PLEDGES_FILE).length });
});

// ---------------------------------------------------------------------------
// Auth — email log in / sign up (demo-grade: JSON file + bcrypt + opaque
// token). Swap for a real session/JWT strategy and a real database before
// taking this to production.
// ---------------------------------------------------------------------------

app.post("/api/auth/signup", (req, res) => {
  const { name, email, password } = req.body || {};

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ ok: false, error: "Password must be at least 8 characters." });
  }

  const users = readJSON(USERS_FILE);
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ ok: false, error: "An account with that email already exists." });
  }

  const user = {
    id: crypto.randomUUID(),
    name: (name || "").toString().trim().slice(0, 80),
    email: email.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeJSON(USERS_FILE, users);

  const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
  res.status(201).json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const users = readJSON(USERS_FILE);
  const user = users.find((u) => u.email.toLowerCase() === (email || "").toString().toLowerCase());

  if (!user || !bcrypt.compareSync(password || "", user.passwordHash)) {
    return res.status(401).json({ ok: false, error: "Incorrect email or password." });
  }

  const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
  res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email } });
});

// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Common Ground / KU Peace Hub running at http://localhost:${PORT}`);
});
