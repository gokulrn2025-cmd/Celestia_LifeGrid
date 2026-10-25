import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import {
  initDatabase,
  checkDatabase,
  closeDatabase,
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
import { chatWithGemini, parseCaptureWithGemini } from "./geminiService.js";

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
app.get("/api/health", async (req, res) => {
  try {
    await checkDatabase();
    res.json({ status: "ok", app: "LifeGrid API", database: "connected", version: "1.0.0", timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Database health check failed:", err.message);
    res.status(503).json({ status: "error", app: "LifeGrid API", database: "disconnected" });
  }
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
    const user = await createUser(email, await hashPassword(password));
    await deleteExpiredSessions();
    const token = randomBytes(32).toString("hex");
    await createSession(tokenHash(token), user.id, Date.now() + SESSION_MAX_AGE);
    setSessionCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
    console.error("Signup failed:", err.message);
    res.status(500).json({ error: "Unable to create your account right now." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  try {
    const user = await getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    const token = randomBytes(32).toString("hex");
    await createSession(tokenHash(token), user.id, Date.now() + SESSION_MAX_AGE);
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Login failed:", err.message);
    res.status(500).json({ error: "Unable to sign in right now." });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const token = sessionToken(req);
    if (!token) return res.status(401).json({ error: "Sign in to continue." });
    const session = await getSession(tokenHash(token));
    if (!session) return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    res.json({ user: publicUser(session) });
  } catch (err) {
    console.error("Session check failed:", err.message);
    res.status(503).json({ error: "The database is temporarily unavailable." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const token = sessionToken(req);
  if (token) await deleteSession(tokenHash(token));
  setSessionCookie(res, "", 0);
  res.json({ success: true });
});

app.use("/api", async (req, res, next) => {
  const token = sessionToken(req);
  let session;
  try { session = token ? await getSession(tokenHash(token)) : null; }
  catch (err) { console.error("Session lookup failed:", err.message); return res.status(503).json({ error: "The database is temporarily unavailable." }); }
  if (!session) return res.status(401).json({ error: "Please sign in to access your LifeGrid data." });
  req.user = session;
  next();
});

// ==========================================
// 1. STATS & SUMMARY (SQL AGGREGATES)
// ==========================================
app.get("/api/stats", async (req, res) => {
  try {
    const stats = await sqlGetStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error("SQL stats error:", err);
    res.status(500).json({ error: "Database query error" });
  }
});

// ==========================================
// 2. AI INSIGHTS & NATURAL LANGUAGE CAPTURE
// ==========================================
app.get("/api/ai/insights", async (req, res) => {
  try {
    const dbSnapshot = {
      bills: await sqlGetBills(req.user.id),
      tasks: await sqlGetTasks(req.user.id),
      subscriptions: await sqlGetSubscriptions(req.user.id),
    };
    const insights = generateSmartInsights(dbSnapshot);
    res.json(insights);
  } catch (err) {
    console.error("AI insights query error:", err);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

async function createAiItem(module, item, userId) {
  if (module === "tasks") return await sqlCreateTask(item, userId);
  if (module === "bills") return await sqlCreateBill(item, userId);
  if (module === "subscriptions") return await sqlCreateSubscription(item, userId);
  if (module === "notes") return await sqlCreateNote(item, userId);
  return null;
}

function aiErrorResponse(res, err) {
  console.error("AI request failed:", err.message);
  const status = err.name === "TimeoutError" ? 504 : (err.status === 429 ? 429 : 502);
  let message = "Gemini could not complete that request. Please try again.";
  if (status === 429) message = "Gemini's current usage limit was reached. Check AI Studio usage or try again later.";
  else if (status === 504) message = "Gemini took too long to respond. Please try again.";
  else if (err.status === 400) message = `Gemini rejected the request${err.providerMessage ? `: ${err.providerMessage}` : ". Please try again."}`;
  else if (err.status === 401 || err.status === 403) message = "Gemini rejected the API key. Check that it is valid and enabled for the Gemini API.";
  else if (err.status === 404) message = "The configured Gemini model was not found. Check GEMINI_MODEL in the server settings.";
  else if (err.status >= 500 && err.providerMessage) message = `Gemini is temporarily unavailable: ${err.providerMessage}`;
  else if (!err.status) message = "LifeGrid could not reach Gemini. Check the server connection and try again.";
  res.status(status).json({ error: message });
}

app.post("/api/ai/parse", async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt || prompt.length > 1000) {
    return res.status(400).json({ error: "Enter a prompt between 1 and 1,000 characters." });
  }

  try {
    const usingGemini = Boolean(process.env.GEMINI_API_KEY);
    const parsed = usingGemini
      ? await parseCaptureWithGemini(prompt)
      : parseNaturalLanguage(prompt);

    if (!parsed.module || !parsed.item) {
      return res.json({
        success: true,
        module: null,
        item: null,
        message: parsed.message,
        provider: usingGemini ? "gemini" : "local",
      });
    }

    const createdItem = await createAiItem(parsed.module, parsed.item, req.user.id);

    res.status(201).json({
      success: true,
      module: parsed.module,
      item: createdItem,
      message: parsed.message,
      provider: usingGemini ? "gemini" : "local",
    });
  } catch (err) {
    aiErrorResponse(res, err);
  }
});

app.post("/api/ai/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 2000) {
    return res.status(400).json({ error: "Enter a message between 1 and 2,000 characters." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: "Gemini is not configured. Add GEMINI_API_KEY to the server's private environment settings." });
  }

  try {
    const result = await chatWithGemini(message, req.body?.history);
    const created = result.capture
      ? await createAiItem(result.capture.module, result.capture.item, req.user.id)
      : null;
    res.json({
      reply: result.reply,
      created: created ? { module: result.capture.module, item: created } : null,
      provider: "gemini",
    });
  } catch (err) {
    aiErrorResponse(res, err);
  }
});

// ==========================================
// 3. TASKS CRUD (SQL)
// ==========================================
app.get("/api/tasks", async (req, res) => {
  try {
    res.json(await sqlGetTasks(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  const { title, dueDate, priority, category } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Task title is required" });
  }

  try {
    const item = await sqlCreateTask({
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

app.put("/api/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = await sqlUpdateTask(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Task not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = await sqlDeleteTask(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Task not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. NOTES CRUD (SQL)
// ==========================================
app.get("/api/notes", async (req, res) => {
  try {
    res.json(await sqlGetNotes(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notes", async (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Note title is required" });
  }

  try {
    const item = await sqlCreateNote({ title: title.trim(), content, category }, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notes/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = await sqlUpdateNote(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Note not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = await sqlDeleteNote(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Note not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. BILLS CRUD (SQL)
// ==========================================
app.get("/api/bills", async (req, res) => {
  try {
    res.json(await sqlGetBills(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bills", async (req, res) => {
  const { name, amount, dueDate, category } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Bill name is required" });
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: "A valid positive bill amount is required" });
  }

  try {
    const item = await sqlCreateBill({ name: name.trim(), amount: Number(amount), dueDate, category }, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/bills/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = await sqlUpdateBill(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Bill not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/bills/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = await sqlDeleteBill(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Bill not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. SUBSCRIPTIONS CRUD (SQL)
// ==========================================
app.get("/api/subscriptions", async (req, res) => {
  try {
    res.json(await sqlGetSubscriptions(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/subscriptions", async (req, res) => {
  const { name, amount, billingCycle, renewal, category } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Subscription name is required" });
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Valid monthly subscription amount is required" });
  }

  try {
    const item = await sqlCreateSubscription({
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

app.put("/api/subscriptions/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = await sqlUpdateSubscription(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Subscription not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/subscriptions/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = await sqlDeleteSubscription(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Subscription not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. DOCUMENTS CRUD (SQL)
// ==========================================
app.get("/api/documents", async (req, res) => {
  try {
    res.json(await sqlGetDocuments(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/documents", async (req, res) => {
  const { name, category, size, fileType, dataUrl, contentSnippet } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Document title or file is required" });
  }
  if (dataUrl !== undefined && dataUrl !== null && (typeof dataUrl !== "string" || dataUrl.length > 7 * 1024 * 1024)) {
    return res.status(413).json({ error: "Document files must be 5 MB or smaller." });
  }

  try {
    const item = await sqlCreateDocument({
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

app.put("/api/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, dataUrl } = req.body;
  if (name !== undefined && (typeof name !== "string" || !name.trim())) return res.status(400).json({ error: "Document name is required." });
  if (dataUrl !== undefined && dataUrl !== null && (typeof dataUrl !== "string" || dataUrl.length > 7 * 1024 * 1024)) {
    return res.status(413).json({ error: "Document files must be 5 MB or smaller." });
  }
  try {
    const updated = await sqlUpdateDocument(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Document not found." });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Could not update this document." });
  }
});

app.delete("/api/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = await sqlDeleteDocument(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Document not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. PASSWORD VAULT CRUD (SQL)
// ==========================================
app.get("/api/vault", async (req, res) => {
  try {
    res.json(await sqlGetVault(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/vault", async (req, res) => {
  const { service, username, password, category } = req.body;
  if (!service || !service.trim() || !username || !username.trim() || !password || !password.trim()) {
    return res.status(400).json({ error: "Service, username/email, and password are all required" });
  }

  try {
    const item = await sqlCreateVault({
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

app.put("/api/vault/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = await sqlUpdateVault(id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ error: "Credential not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/vault/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const success = await sqlDeleteVault(id, req.user.id);
    if (!success) return res.status(404).json({ error: "Credential not found." });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. SETTINGS & PROFILE (SQL)
// ==========================================
app.get("/api/settings", async (req, res) => {
  try {
    res.json({
      profile: await sqlGetProfile(req.user.id),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", async (req, res) => {
  const { profile } = req.body;
  if (profile !== undefined && (!profile || typeof profile !== "object" || Array.isArray(profile))) {
    return res.status(400).json({ error: "Profile details must be an object." });
  }
  if (profile?.name !== undefined && (typeof profile.name !== "string" || !profile.name.trim() || profile.name.trim().length > 60)) {
    return res.status(400).json({ error: "Name must be between 1 and 60 characters." });
  }
  if (profile?.role !== undefined && (typeof profile.role !== "string" || !profile.role.trim() || profile.role.trim().length > 60)) {
    return res.status(400).json({ error: "Role must be between 1 and 60 characters." });
  }
  if (profile?.bio !== undefined && (typeof profile.bio !== "string" || profile.bio.length > 280)) {
    return res.status(400).json({ error: "About text must be 280 characters or fewer." });
  }
  if (profile?.theme !== undefined && !["light", "dark"].includes(profile.theme)) {
    return res.status(400).json({ error: "Choose either the light or dark theme." });
  }
  try {
    const updated = profile ? await sqlUpdateProfile(profile, req.user.id) : await sqlGetProfile(req.user.id);
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

await initDatabase();
const server = app.listen(PORT, () => {
  console.log(`[LifeGrid] Database ready (Neon Postgres)`);
  console.log(`[LifeGrid] Running at http://localhost:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => closeDatabase().finally(() => process.exit(0))));
}
