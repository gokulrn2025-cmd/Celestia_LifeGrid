-- ============================================================================
-- LIFEGRID RELATIONAL SQL DATABASE SCHEMA
-- SQLite DDL Definition for LifeGrid Personal Organisation Dashboard
-- ============================================================================

-- 1. User Profile & Preferences Table
CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT 'Gokul',
    role TEXT NOT NULL DEFAULT 'Student',
    avatar_letter TEXT NOT NULL DEFAULT 'G',
    theme TEXT NOT NULL DEFAULT 'neo',
    notifications INTEGER NOT NULL DEFAULT 1,
    smart_reminders INTEGER NOT NULL DEFAULT 1,
    auto_organise INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL DEFAULT 'No date',
    priority TEXT CHECK(priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
    category TEXT NOT NULL DEFAULT 'Academic',
    completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Notes Table
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT NOT NULL DEFAULT 'Ideas',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bills & Recurring Payments Table
CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    due_date TEXT NOT NULL DEFAULT 'No date',
    category TEXT NOT NULL DEFAULT 'Utilities',
    paid INTEGER NOT NULL DEFAULT 0 CHECK(paid IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    billing_cycle TEXT NOT NULL DEFAULT 'Monthly' CHECK(billing_cycle IN ('Monthly', 'Yearly')),
    renewal TEXT NOT NULL DEFAULT 'No date',
    category TEXT NOT NULL DEFAULT 'Entertainment',
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Documents Metadata Table
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Academic',
    size TEXT NOT NULL DEFAULT '120 KB',
    file_type TEXT NOT NULL DEFAULT 'application/pdf',
    data_url TEXT,
    content_snippet TEXT,
    uploaded_at TEXT NOT NULL
);

-- 7. Password Vault Credentials Table
CREATE TABLE IF NOT EXISTS vault (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Development',
    strength TEXT NOT NULL DEFAULT 'Strong',
    updated_at TEXT NOT NULL
);

-- Indices for Query Performance & Lookups
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_paid ON bills(paid);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(active);
