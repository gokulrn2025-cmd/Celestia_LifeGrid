import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const defaultDataDir = path.join(__dirname, "data");
const dbPath = path.resolve(process.env.LIFEGRID_DB_PATH || path.join(defaultDataDir, "lifegrid.sqlite"));
const dataDir = path.dirname(dbPath);
const schemaPath = path.join(__dirname, "schema.sql");

function vaultKey() {
  const key = process.env.VAULT_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error("Password Vault is unavailable until VAULT_ENCRYPTION_KEY is configured as 64 hexadecimal characters.");
  return Buffer.from(key, "hex");
}

function encryptVaultPassword(password) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return `enc:v1:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ciphertext.toString("hex")}`;
}

function decryptVaultPassword(value) {
  const [marker, version, ivHex, tagHex, ciphertextHex] = String(value).split(":");
  if (marker !== "enc" || version !== "v1" || !ivHex || !tagHex || !ciphertextHex) {
    throw new Error("This vault entry uses an older unencrypted format and is not available. Create a new entry after setting a vault key.");
  }
  const decipher = createDecipheriv("aes-256-gcm", vaultKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]).toString("utf8");
}

function encryptLegacyVaultPasswords(database) {
  const hasVault = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'vault'").get();
  if (!hasVault) return;
  const rows = database.prepare("SELECT id, password FROM vault WHERE password NOT LIKE 'enc:v1:%'").all();
  if (!rows.length) return;
  const migrate = database.transaction((entries) => {
    const update = database.prepare("UPDATE vault SET password = ? WHERE id = ?");
    for (const entry of entries) update.run(encryptVaultPassword(entry.password), entry.id);
  });
  migrate(rows);
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable WAL mode & foreign keys for SQLite performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize Schema
export function initDatabase() {
  vaultKey();
  const hasAuthSchema = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  const hasLegacySchema = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tasks'").get();
  if (!hasAuthSchema && hasLegacySchema && fs.existsSync(dbPath)) {
    db.pragma("wal_checkpoint(FULL)");
    const backupDir = path.join(dataDir, "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `${path.basename(dbPath, ".sqlite")}-before-auth.sqlite`);
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(dbPath, backupPath);
      const backupDb = new Database(backupPath);
      try { encryptLegacyVaultPasswords(backupDb); } finally { backupDb.close(); }
    }
  }
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schemaSql);

  // Add account ownership without changing or deleting legacy records. Existing rows
  // keep NULL ownership and are intentionally not visible to newly created accounts.
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Personal',
      avatar_letter TEXT NOT NULL,
      theme TEXT NOT NULL DEFAULT 'neo',
      notifications INTEGER NOT NULL DEFAULT 1,
      smart_reminders INTEGER NOT NULL DEFAULT 1,
      auto_organise INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const table of ["tasks", "notes", "bills", "subscriptions", "documents", "vault"]) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some((column) => column.name === "user_id")) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER REFERENCES users(id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_user_id ON ${table}(user_id)`);
    }
  }

  // Check if profile exists; seed if empty
  const profileCount = db.prepare("SELECT COUNT(*) AS count FROM profile").get().count;
  if (profileCount === 0) {
    seedDatabase();
  }
  encryptLegacyVaultPasswords(db);
}

export function createUser(email, passwordHash) {
  const create = db.transaction(() => {
    const info = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(email, passwordHash);
    const userId = Number(info.lastInsertRowid);
    const name = email.split("@")[0].slice(0, 48) || "LifeGrid user";
    db.prepare("INSERT INTO user_profiles (user_id, name, role, avatar_letter) VALUES (?, ?, 'Personal', ?)")
      .run(userId, name, name.charAt(0).toUpperCase());
    return { id: userId, email, name, role: "Personal" };
  });
  return create();
}

export function getUserByEmail(email) {
  return db.prepare(`SELECT u.id, u.email, u.password_hash, p.name, p.role
    FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.email = ? COLLATE NOCASE`).get(email);
}

export function getUserById(id) {
  return db.prepare(`SELECT u.id, u.email, p.name, p.role
    FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ?`).get(id);
}

export function createSession(tokenHash, userId, expiresAt) {
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(tokenHash, userId, expiresAt);
}

export function getSession(tokenHash) {
  return db.prepare(`SELECT u.id, u.email, p.name, p.role, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    JOIN user_profiles p ON p.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > ?`).get(tokenHash, Date.now());
}

export function deleteSession(tokenHash) {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function deleteExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
}

export function seedDatabase() {
  // Clear existing
  db.exec(`
    DELETE FROM profile;
    DELETE FROM tasks;
    DELETE FROM notes;
    DELETE FROM bills;
    DELETE FROM subscriptions;
    DELETE FROM documents;
    DELETE FROM vault;
  `);

  // 1. Profile
  db.prepare(`
    INSERT INTO profile (id, name, role, avatar_letter, theme, notifications, smart_reminders, auto_organise)
    VALUES (1, 'Gokul', 'Student', 'G', 'neo', 1, 1, 0)
  `).run();

  // 2. Tasks
  const insertTask = db.prepare(`
    INSERT INTO tasks (title, due_date, priority, category, completed, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertTask.run("Complete project review", "2026-10-26", "High", "Academic", 0, "2026-10-25T10:00:00.000Z");
  insertTask.run("Finish DBMS assignment", "2026-10-26", "Medium", "Academic", 0, "2026-10-25T11:00:00.000Z");
  insertTask.run("Organise project files", "2026-10-27", "Low", "Personal", 1, "2026-10-24T09:00:00.000Z");

  // 3. Notes
  const insertNote = db.prepare(`
    INSERT INTO notes (title, content, category, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  insertNote.run("Project Ideas", "Add AI-powered organisation and dynamic smart insights to the dashboard.", "Ideas", "2026-10-25T14:30:00.000Z");
  insertNote.run("DBMS Topics", "Table creation, functions, group functions, indexing, and nested subqueries.", "Academic", "2026-10-25T12:15:00.000Z");

  // 4. Bills
  const insertBill = db.prepare(`
    INSERT INTO bills (name, amount, due_date, category, paid, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertBill.run("Electricity Bill", 1450, "2026-10-28", "Utilities", 0, "2026-10-20T08:00:00.000Z");
  insertBill.run("Internet Bill", 899, "2026-10-31", "Internet", 0, "2026-10-21T08:00:00.000Z");
  insertBill.run("Water Bill", 320, "2026-10-15", "Utilities", 1, "2026-10-10T08:00:00.000Z");

  // 5. Subscriptions
  const insertSub = db.prepare(`
    INSERT INTO subscriptions (name, amount, billing_cycle, renewal, category, active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertSub.run("Spotify", 119, "Monthly", "2026-11-05", "Entertainment", 1);
  insertSub.run("Cloud Storage", 130, "Monthly", "2026-11-12", "Tools", 1);
  insertSub.run("Gym Membership", 1200, "Monthly", "2026-11-01", "Health", 0);

  // 6. Documents
  const insertDoc = db.prepare(`
    INSERT INTO documents (name, category, size, file_type, content_snippet, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertDoc.run("Project Proposal.pdf", "Academic", "245 KB", "application/pdf", "LifeGrid System Design Document and Architecture Overview.", "2026-10-20");
  insertDoc.run("DBMS Notes.pdf", "Academic", "1.2 MB", "application/pdf", "Relational Algebra, SQL triggers, and Normalisation notes.", "2026-10-22");

}

// ==========================================
// SQL REPOSITORY METHODS
// ==========================================

// Dynamic SQL Aggregations for Dashboard
export function sqlGetStats(userId) {
  const today = new Date().toISOString().split("T")[0];

  const pendingTasks = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE completed = 0 AND user_id = ?").get(userId).count;
  const tasksDueToday = db.prepare(
    "SELECT COUNT(*) AS count FROM tasks WHERE completed = 0 AND user_id = ? AND (due_date = 'Today' OR due_date = ?)"
  ).get(userId, today).count;

  const activeNotes = db.prepare("SELECT COUNT(*) AS count FROM notes WHERE user_id = ?").get(userId).count;

  const unpaidBills = db.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM bills WHERE paid = 0 AND user_id = ?").get(userId);

  const activeSubs = db.prepare("SELECT * FROM subscriptions WHERE active = 1 AND user_id = ?").all(userId);
  const monthlyCost = activeSubs.reduce((acc, s) => {
    return acc + (s.billing_cycle === "Yearly" ? Math.round(s.amount / 12) : s.amount);
  }, 0);

  const docsCount = db.prepare("SELECT COUNT(*) AS count FROM documents WHERE user_id = ?").get(userId).count;
  const vaultCount = db.prepare("SELECT COUNT(*) AS count FROM vault WHERE user_id = ?").get(userId).count;

  return {
    pendingTasksCount: pendingTasks,
    tasksDueTodayCount: tasksDueToday,
    activeNotesCount: activeNotes,
    upcomingBillsAmount: unpaidBills.total,
    unpaidBillsCount: unpaidBills.count,
    activeSubscriptionsCount: activeSubs.length,
    monthlySubscriptionCost: monthlyCost,
    documentsCount: docsCount,
    passwordsCount: vaultCount,
  };
}

// Tasks SQL Operations
export function sqlGetTasks(userId) {
  const rows = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC").all(userId);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    dueDate: r.due_date,
    priority: r.priority,
    category: r.category,
    completed: Boolean(r.completed),
    createdAt: r.created_at,
  }));
}

export function sqlCreateTask({ title, dueDate, priority, category }, userId) {
  const stmt = db.prepare(`
    INSERT INTO tasks (title, due_date, priority, category, completed, created_at, user_id)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `);
  const now = new Date().toISOString();
  const info = stmt.run(title, dueDate || "No date", priority || "Medium", category || "Academic", now, userId);
  return {
    id: Number(info.lastInsertRowid),
    title,
    dueDate: dueDate || "No date",
    priority: priority || "Medium",
    category: category || "Academic",
    completed: false,
    createdAt: now,
  };
}

export function sqlUpdateTask(id, fields, userId) {
  const current = db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;

  const title = fields.title !== undefined ? fields.title : current.title;
  const dueDate = fields.dueDate !== undefined ? fields.dueDate : current.due_date;
  const priority = fields.priority !== undefined ? fields.priority : current.priority;
  const category = fields.category !== undefined ? fields.category : current.category;
  const completed = fields.completed !== undefined ? (fields.completed ? 1 : 0) : current.completed;

  db.prepare(`
    UPDATE tasks
    SET title = ?, due_date = ?, priority = ?, category = ?, completed = ?
    WHERE id = ? AND user_id = ?
  `).run(title, dueDate, priority, category, completed, id, userId);

  return {
    id,
    title,
    dueDate,
    priority,
    category,
    completed: Boolean(completed),
    createdAt: current.created_at,
  };
}

export function sqlDeleteTask(id, userId) {
  const info = db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(id, userId);
  return info.changes > 0;
}

// Notes SQL Operations
export function sqlGetNotes(userId) {
  const rows = db.prepare("SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC").all(userId);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    category: r.category,
    updatedAt: r.updated_at,
  }));
}

export function sqlCreateNote({ title, content, category }, userId) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO notes (title, content, category, updated_at, user_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(title, content || "", category || "Ideas", now, userId);
  return {
    id: Number(info.lastInsertRowid),
    title,
    content: content || "",
    category: category || "Ideas",
    updatedAt: now,
  };
}

export function sqlUpdateNote(id, fields, userId) {
  const current = db.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;

  const title = fields.title !== undefined ? fields.title : current.title;
  const content = fields.content !== undefined ? fields.content : current.content;
  const category = fields.category !== undefined ? fields.category : current.category;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE notes
    SET title = ?, content = ?, category = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(title, content, category, now, id, userId);

  return { id, title, content, category, updatedAt: now };
}

export function sqlDeleteNote(id, userId) {
  const info = db.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?").run(id, userId);
  return info.changes > 0;
}

// Bills SQL Operations
export function sqlGetBills(userId) {
  const rows = db.prepare("SELECT * FROM bills WHERE user_id = ? ORDER BY id DESC").all(userId);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    dueDate: r.due_date,
    category: r.category,
    paid: Boolean(r.paid),
    createdAt: r.created_at,
  }));
}

export function sqlCreateBill({ name, amount, dueDate, category }, userId) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO bills (name, amount, due_date, category, paid, created_at, user_id)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `);
  const info = stmt.run(name, Number(amount), dueDate || "No date", category || "Utilities", now, userId);
  return {
    id: Number(info.lastInsertRowid),
    name,
    amount: Number(amount),
    dueDate: dueDate || "No date",
    category: category || "Utilities",
    paid: false,
    createdAt: now,
  };
}

export function sqlUpdateBill(id, fields, userId) {
  const current = db.prepare("SELECT * FROM bills WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;

  const name = fields.name !== undefined ? fields.name : current.name;
  const amount = fields.amount !== undefined ? Number(fields.amount) : current.amount;
  const dueDate = fields.dueDate !== undefined ? fields.dueDate : current.due_date;
  const category = fields.category !== undefined ? fields.category : current.category;
  const paid = fields.paid !== undefined ? (fields.paid ? 1 : 0) : current.paid;

  db.prepare(`
    UPDATE bills
    SET name = ?, amount = ?, due_date = ?, category = ?, paid = ?
    WHERE id = ? AND user_id = ?
  `).run(name, amount, dueDate, category, paid, id, userId);

  return {
    id,
    name,
    amount,
    dueDate,
    category,
    paid: Boolean(paid),
    createdAt: current.created_at,
  };
}

export function sqlDeleteBill(id, userId) {
  const info = db.prepare("DELETE FROM bills WHERE id = ? AND user_id = ?").run(id, userId);
  return info.changes > 0;
}

// Subscriptions SQL Operations
export function sqlGetSubscriptions(userId) {
  const rows = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC").all(userId);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    billingCycle: r.billing_cycle,
    renewal: r.renewal,
    category: r.category,
    active: Boolean(r.active),
  }));
}

export function sqlCreateSubscription({ name, amount, billingCycle, renewal, category }, userId) {
  const stmt = db.prepare(`
    INSERT INTO subscriptions (name, amount, billing_cycle, renewal, category, active, user_id)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);
  const info = stmt.run(
    name,
    Number(amount),
    billingCycle || "Monthly",
    renewal || "No date",
    category || "Entertainment",
    userId
  );
  return {
    id: Number(info.lastInsertRowid),
    name,
    amount: Number(amount),
    billingCycle: billingCycle || "Monthly",
    renewal: renewal || "No date",
    category: category || "Entertainment",
    active: true,
  };
}

export function sqlUpdateSubscription(id, fields, userId) {
  const current = db.prepare("SELECT * FROM subscriptions WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;

  const name = fields.name !== undefined ? fields.name : current.name;
  const amount = fields.amount !== undefined ? Number(fields.amount) : current.amount;
  const billingCycle = fields.billingCycle !== undefined ? fields.billingCycle : current.billing_cycle;
  const renewal = fields.renewal !== undefined ? fields.renewal : current.renewal;
  const category = fields.category !== undefined ? fields.category : current.category;
  const active = fields.active !== undefined ? (fields.active ? 1 : 0) : current.active;

  db.prepare(`
    UPDATE subscriptions
    SET name = ?, amount = ?, billing_cycle = ?, renewal = ?, category = ?, active = ?
    WHERE id = ? AND user_id = ?
  `).run(name, amount, billingCycle, renewal, category, active, id, userId);

  return {
    id,
    name,
    amount,
    billingCycle,
    renewal,
    category,
    active: Boolean(active),
  };
}

export function sqlDeleteSubscription(id, userId) {
  const info = db.prepare("DELETE FROM subscriptions WHERE id = ? AND user_id = ?").run(id, userId);
  return info.changes > 0;
}

// Documents SQL Operations
export function sqlGetDocuments(userId) {
  const rows = db.prepare("SELECT * FROM documents WHERE user_id = ? ORDER BY id DESC").all(userId);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    size: r.size,
    fileType: r.file_type,
    dataUrl: r.data_url,
    contentSnippet: r.content_snippet,
    uploadedAt: r.uploaded_at,
  }));
}

export function sqlCreateDocument({ name, category, size, fileType, dataUrl, contentSnippet }, userId) {
  const now = new Date().toISOString().split("T")[0];
  const stmt = db.prepare(`
    INSERT INTO documents (name, category, size, file_type, data_url, content_snippet, uploaded_at, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    name,
    category || "Academic",
    size || "120 KB",
    fileType || "application/pdf",
    dataUrl || null,
    contentSnippet || (dataUrl ? "File attached to this document record." : "Document record added to LifeGrid."),
    now,
    userId
  );
  return {
    id: Number(info.lastInsertRowid),
    name,
    category: category || "Academic",
    size: size || "120 KB",
    fileType: fileType || "application/pdf",
    dataUrl: dataUrl || null,
    contentSnippet: contentSnippet || (dataUrl ? "File attached to this document record." : "Document record added to LifeGrid."),
    uploadedAt: now,
  };
}

export function sqlUpdateDocument(id, fields, userId) {
  const current = db.prepare("SELECT * FROM documents WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;
  const name = fields.name !== undefined ? fields.name : current.name;
  const category = fields.category !== undefined ? fields.category : current.category;
  const size = fields.size !== undefined ? fields.size : current.size;
  const fileType = fields.fileType !== undefined ? fields.fileType : current.file_type;
  const dataUrl = fields.dataUrl !== undefined ? fields.dataUrl : current.data_url;
  const contentSnippet = fields.contentSnippet !== undefined ? fields.contentSnippet : current.content_snippet;
  db.prepare(`UPDATE documents SET name = ?, category = ?, size = ?, file_type = ?, data_url = ?, content_snippet = ?
    WHERE id = ? AND user_id = ?`).run(name, category, size, fileType, dataUrl, contentSnippet, id, userId);
  return { id, name, category, size, fileType, dataUrl, contentSnippet, uploadedAt: current.uploaded_at };
}

export function sqlDeleteDocument(id, userId) {
  const info = db.prepare("DELETE FROM documents WHERE id = ? AND user_id = ?").run(id, userId);
  return info.changes > 0;
}

// Vault SQL Operations
export function sqlGetVault(userId) {
  const rows = db.prepare("SELECT * FROM vault WHERE user_id = ? ORDER BY id DESC").all(userId);
  return rows.map((r) => ({
    id: r.id,
    service: r.service,
    username: r.username,
    password: decryptVaultPassword(r.password),
    category: r.category,
    strength: r.strength,
    updatedAt: r.updated_at,
  }));
}

export function sqlCreateVault({ service, username, password, category }, userId) {
  const now = new Date().toISOString().split("T")[0];
  const strength = password.length >= 12 ? "Strong" : password.length >= 8 ? "Good" : "Weak";
  const stmt = db.prepare(`
    INSERT INTO vault (service, username, password, category, strength, updated_at, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(service, username, encryptVaultPassword(password), category || "General", strength, now, userId);
  return {
    id: Number(info.lastInsertRowid),
    service,
    username,
    password,
    category: category || "General",
    strength,
    updatedAt: now,
  };
}

export function sqlUpdateVault(id, fields, userId) {
  const current = db.prepare("SELECT * FROM vault WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;

  const service = fields.service !== undefined ? fields.service : current.service;
  const username = fields.username !== undefined ? fields.username : current.username;
  const password = fields.password !== undefined ? fields.password : decryptVaultPassword(current.password);
  const category = fields.category !== undefined ? fields.category : current.category;
  const strength = password.length >= 12 ? "Strong" : password.length >= 8 ? "Good" : "Weak";
  const now = new Date().toISOString().split("T")[0];

  db.prepare(`
    UPDATE vault
    SET service = ?, username = ?, password = ?, category = ?, strength = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(service, username, encryptVaultPassword(password), category, strength, now, id, userId);

  return { id, service, username, password, category, strength, updatedAt: now };
}

export function sqlDeleteVault(id, userId) {
  const info = db.prepare("DELETE FROM vault WHERE id = ? AND user_id = ?").run(id, userId);
  return info.changes > 0;
}

// Profile & Settings
export function sqlGetProfile(userId) {
  const row = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId);
  if (!row) return { name: "LifeGrid user", role: "Personal", avatarLetter: "L", theme: "neo", notifications: true, smartReminders: true, autoOrganise: false };
  return {
    name: row.name,
    role: row.role,
    avatarLetter: row.avatar_letter,
    theme: row.theme,
    notifications: Boolean(row.notifications),
    smartReminders: Boolean(row.smart_reminders),
    autoOrganise: Boolean(row.auto_organise),
  };
}

export function sqlUpdateProfile(fields, userId) {
  const current = sqlGetProfile(userId);
  const name = fields.name !== undefined ? fields.name : current.name;
  const role = fields.role !== undefined ? fields.role : current.role;
  const avatarLetter = (name || "G").charAt(0).toUpperCase();

  db.prepare(`
    UPDATE user_profiles
    SET name = ?, role = ?, avatar_letter = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(name, role, avatarLetter, userId);

  return sqlGetProfile(userId);
}

// Initialize on load
initDatabase();
