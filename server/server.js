import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import {
  createUser,
  getUserByEmail,
  createSession,
  getSession,
  deleteSession,
  deleteExpiredSessions,
  sqlGetStats,
  sqlGetTasks,
  sqlCreateTask,
  sqlUpdateTask,
  sqlDeleteTask,
  sqlGetNotes,
  sqlCreateNote,
  sqlUpdateNote,
  sqlDeleteNote,
  sqlGetBills,
  sqlCreateBill,
  sqlUpdateBill,
  sqlDeleteBill,
  sqlGetSubscriptions,
  sqlCreateSubscription,
  sqlUpdateSubscription,
  sqlDeleteSubscription,
  sqlGetDocuments,
  sqlCreateDocument,
  sqlUpdateDocument,
  sqlDeleteDocument,
  sqlGetVault,
  sqlCreateVault,
  sqlUpdateVault,
  sqlDeleteVault,
  sqlGetProfile,
  sqlUpdateProfile,
} from "./database.js";
import { generateSmartInsights, parseNaturalLanguage } from "./aiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;
const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "lifegrid_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "25mb" }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`[LifeGrid API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health & System Info
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "LifeGrid API",
    database: "connected",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

function setSessionCookie(res, token, maxAgeSeconds = SESSION_MAX_AGE / 1000) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`);
}

function sessionToken(req) {
  const cookies = Object.fromEntries((req.headers.cookie || "").split(";").map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? ["", ""] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
  return cookies[SESSION_COOKIE] || "";
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${Buffer.from(hash).toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, saltHex, hashHex] = String(stored || "").split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, "hex"), expected.length));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

app.post("/api/auth/signup", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 12 || password.length > 128) return res.status(400).json({ error: "Use a password between 12 and 128 characters." });

  try {
    const user = createUser(email, await hashPassword(password));
    deleteExpiredSessions();
    const token = randomBytes(32).toString("hex");
    createSession(tokenHash(token), user.id, Date.now() + SESSION_MAX_AGE);
    setSessionCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (String(err.code || "").includes("CONSTRAINT_UNIQUE")) return res.status(409).json({ error: "An account with this email already exists." });
    console.error("Signup failed:", err.message);
    res.status(500).json({ error: "Unable to create your account right now." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  try {
    const user = getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    const token = randomBytes(32).toString("hex");
    createSession(tokenHash(token), user.id, Date.now() + SESSION_MAX_AGE);
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Login failed:", err.message);
    res.status(500).json({ error: "Unable to sign in right now." });
  }
});

app.get("/api/auth/me", (req, res) => {
  const token = sessionToken(req);
  if (!token) return res.status(401).json({ error: "Sign in to continue." });
  const session = getSession(tokenHash(token));
  if (!session) return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  res.json({ user: publicUser(session) });
});

app.post("/api/auth/logout", (req, res) => {
  const token = sessionToken(req);
  if (token) deleteSession(tokenHash(token));
  setSessionCookie(res, "", 0);
  res.json({ success: true });
});

app.use("/api", (req, res, next) => {
  const token = sessionToken(req);
  const session = token ? getSession(tokenHash(token)) : null;
  if (!session) return res.status(401).json({ error: "Please sign in to access your LifeGrid data." });
  req.user = session;
  next();
});

// ==========================================
// 1. STATS & SUMMARY (SQL AGGREGATES)
// ==========================================
app.get("/api/stats", (req, res) => {
  try {
    const stats = sqlGetStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error("SQL stats error:", err);
    res.status(500).json({ error: "Database query error" });
  }
});

// ==========================================
// 2. AI INSIGHTS & NATURAL LANGUAGE CAPTURE
// ==========================================
app.get("/api/ai/insights", (req, res) => {
  try {
    const dbSnapshot = {
      bills: sqlGetBills(req.user.id),
      tasks: sqlGetTasks(req.user.id),
      subscriptions: sqlGetSubscriptions(req.user.id),
    };
    const insights = generateSmartInsights(dbSnapshot);
    res.json(insights);
  } catch (err) {
    console.error("AI insights query error:", err);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

app.post("/api/ai/parse", (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "A natural language prompt is required" });
  }

  try {
    const parsed = parseNaturalLanguage(prompt);
    let createdItem = null;

    if (parsed.module === "tasks") {
      createdItem = sqlCreateTask(parsed.item, req.user.id);
    } else if (parsed.module === "bills") {
      createdItem = sqlCreateBill(parsed.item, req.user.id);
    } else if (parsed.module === "subscriptions") {
      createdItem = sqlCreateSubscription(parsed.item, req.user.id);
    } else if (parsed.module === "notes") {
      createdItem = sqlCreateNote(parsed.item, req.user.id);
    }

    res.status(201).json({
      success: true,
      module: parsed.module,
      item: createdItem,
      message: parsed.message,
    });
  } catch (err) {
    console.error("AI parse SQL insert error:", err);
    res.status(500).json({ error: "Failed to parse and store prompt" });
  }
});

// ==========================================
// 3. TASKS CRUD (SQL)
// ==========================================
app.get("/api/tasks", (req, res) => {
  try {
    res.json(sqlGetTasks(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks", (req, res) => {
  const { title, dueDate, priority, category } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Task title is required" });
  }

  try {
    const item = sqlCreateTask({
      title: title.trim(),
      dueDate,
      priority,
      category,
    }, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = sqlUpdateTask(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Task not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = sqlDeleteTask(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Task not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. NOTES CRUD (SQL)
// ==========================================
app.get("/api/notes", (req, res) => {
  try {
    res.json(sqlGetNotes(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notes", (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Note title is required" });
  }

  try {
    const item = sqlCreateNote({ title: title.trim(), content, category }, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notes/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = sqlUpdateNote(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Note not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notes/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = sqlDeleteNote(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Note not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. BILLS CRUD (SQL)
// ==========================================
app.get("/api/bills", (req, res) => {
  try {
    res.json(sqlGetBills(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bills", (req, res) => {
  const { name, amount, dueDate, category } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Bill name is required" });
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: "A valid positive bill amount is required" });
  }

  try {
    const item = sqlCreateBill({ name: name.trim(), amount: Number(amount), dueDate, category }, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/bills/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = sqlUpdateBill(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Bill not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/bills/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = sqlDeleteBill(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Bill not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. SUBSCRIPTIONS CRUD (SQL)
// ==========================================
app.get("/api/subscriptions", (req, res) => {
  try {
    res.json(sqlGetSubscriptions(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/subscriptions", (req, res) => {
  const { name, amount, billingCycle, renewal, category } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Subscription name is required" });
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Valid monthly subscription amount is required" });
  }

  try {
    const item = sqlCreateSubscription({
      name: name.trim(),
      amount: Number(amount),
      billingCycle,
      renewal,
      category,
    }, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/subscriptions/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = sqlUpdateSubscription(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Subscription not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/subscriptions/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = sqlDeleteSubscription(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Subscription not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. DOCUMENTS CRUD (SQL)
// ==========================================
app.get("/api/documents", (req, res) => {
  try {
    res.json(sqlGetDocuments(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/documents", (req, res) => {
  const { name, category, size, fileType, dataUrl, contentSnippet } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Document title or file is required" });
  }
  if (dataUrl !== undefined && dataUrl !== null && (typeof dataUrl !== "string" || dataUrl.length > 7 * 1024 * 1024)) {
    return res.status(413).json({ error: "Document files must be 5 MB or smaller." });
  }

  try {
    const item = sqlCreateDocument({
      name: name.trim(),
      category,
      size,
      fileType,
      dataUrl,
      contentSnippet,
    }, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/documents/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, dataUrl } = req.body;
  if (name !== undefined && (typeof name !== "string" || !name.trim())) return res.status(400).json({ error: "Document name is required." });
  if (dataUrl !== undefined && dataUrl !== null && (typeof dataUrl !== "string" || dataUrl.length > 7 * 1024 * 1024)) {
    return res.status(413).json({ error: "Document files must be 5 MB or smaller." });
  }
  try {
    const updated = sqlUpdateDocument(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Document not found." });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Could not update this document." });
  }
});

app.delete("/api/documents/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = sqlDeleteDocument(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Document not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. PASSWORD VAULT CRUD (SQL)
// ==========================================
app.get("/api/vault", (req, res) => {
  try {
    res.json(sqlGetVault(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/vault", (req, res) => {
  const { service, username, password, category } = req.body;
  if (!service || !service.trim() || !username || !username.trim() || !password || !password.trim()) {
    return res.status(400).json({ error: "Service, username/email, and password are all required" });
  }

  try {
    const item = sqlCreateVault({
      service: service.trim(),
      username: username.trim(),
      password: password.trim(),
      category,
    }, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/vault/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = sqlUpdateVault(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Credential not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/vault/:id", (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = sqlDeleteVault(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Credential not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. SETTINGS & PROFILE (SQL)
// ==========================================
app.get("/api/settings", (req, res) => {
  try {
    res.json({
      profile: sqlGetProfile(req.user.id),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", (req, res) => {
  const { profile } = req.body;
  try {
    const updated = profile ? sqlUpdateProfile(profile, req.user.id) : sqlGetProfile(req.user.id);
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Production Static Serving
const clientDist = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Catch-all
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`[LifeGrid] Database ready`);
  console.log(`[LifeGrid] Running at http://localhost:${PORT}`);
});
