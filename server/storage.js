import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "data");
const dbFile = path.join(dataDir, "db.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const initialData = {
  profile: {
    name: "Gokul",
    role: "Student",
    avatarLetter: "G",
    theme: "neo",
    notifications: true,
    smartReminders: true,
    autoOrganise: false,
  },
  tasks: [
    {
      id: 1,
      title: "Complete project review",
      dueDate: "2026-10-26",
      priority: "High",
      category: "Academic",
      completed: false,
      createdAt: "2026-10-25T10:00:00.000Z",
    },
    {
      id: 2,
      title: "Finish DBMS assignment",
      dueDate: "2026-10-26",
      priority: "Medium",
      category: "Academic",
      completed: false,
      createdAt: "2026-10-25T11:00:00.000Z",
    },
    {
      id: 3,
      title: "Organise project files",
      dueDate: "2026-10-27",
      priority: "Low",
      category: "Personal",
      completed: true,
      createdAt: "2026-10-24T09:00:00.000Z",
    },
  ],
  notes: [
    {
      id: 1,
      title: "Project Ideas",
      content: "Add AI-powered organisation and dynamic smart insights to the dashboard.",
      category: "Ideas",
      updatedAt: "2026-10-25T14:30:00.000Z",
    },
    {
      id: 2,
      title: "DBMS Topics",
      content: "Table creation, functions, group functions, indexing, and nested subqueries.",
      category: "Academic",
      updatedAt: "2026-10-25T12:15:00.000Z",
    },
  ],
  bills: [
    {
      id: 1,
      name: "Electricity Bill",
      amount: 1450,
      dueDate: "2026-10-28",
      category: "Utilities",
      paid: false,
      createdAt: "2026-10-20T08:00:00.000Z",
    },
    {
      id: 2,
      name: "Internet Bill",
      amount: 899,
      dueDate: "2026-10-31",
      category: "Internet",
      paid: false,
      createdAt: "2026-10-21T08:00:00.000Z",
    },
    {
      id: 3,
      name: "Water Bill",
      amount: 320,
      dueDate: "2026-10-15",
      category: "Utilities",
      paid: true,
      createdAt: "2026-10-10T08:00:00.000Z",
    },
  ],
  subscriptions: [
    {
      id: 1,
      name: "Spotify",
      amount: 119,
      billingCycle: "Monthly",
      renewal: "2026-11-05",
      category: "Entertainment",
      active: true,
    },
    {
      id: 2,
      name: "Cloud Storage",
      amount: 130,
      billingCycle: "Monthly",
      renewal: "2026-11-12",
      category: "Tools",
      active: true,
    },
    {
      id: 3,
      name: "Gym Membership",
      amount: 1200,
      billingCycle: "Monthly",
      renewal: "2026-11-01",
      category: "Health",
      active: false,
    },
  ],
  documents: [
    {
      id: 1,
      name: "Project Proposal.pdf",
      category: "Academic",
      size: "245 KB",
      fileType: "application/pdf",
      uploadedAt: "2026-10-20",
      contentSnippet: "LifeGrid System Design Document and Architecture Overview.",
    },
    {
      id: 2,
      name: "DBMS Notes.pdf",
      category: "Academic",
      size: "1.2 MB",
      fileType: "application/pdf",
      uploadedAt: "2026-10-22",
      contentSnippet: "Relational Algebra, SQL triggers, and Normalisation notes.",
    },
  ],
  passwords: [],
};

export function getDb() {
  try {
    if (!fs.existsSync(dbFile)) {
      saveDb(initialData);
      return JSON.parse(JSON.stringify(initialData));
    }
    const raw = fs.readFileSync(dbFile, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database file, fallback to initial:", err);
    return JSON.parse(JSON.stringify(initialData));
  }
}

export function saveDb(data) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving database file:", err);
    return false;
  }
}

export function resetDb() {
  saveDb(initialData);
  return getDb();
}
