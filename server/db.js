import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'server', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'nextradev.db');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
// The legacy username/password login was replaced by Firebase Authentication.
db.exec('DROP TABLE IF EXISTS users');

db.exec(`
CREATE TABLE IF NOT EXISTS career_vacancies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'Full-time',
  location TEXT NOT NULL DEFAULT 'India (Remote/Hybrid)',
  description TEXT NOT NULL DEFAULT '',
  is_open INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS career_applications (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Pending', submitted_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  college TEXT NOT NULL,
  education TEXT NOT NULL,
  position TEXT NOT NULL,
  mode TEXT NOT NULL,
  skills TEXT NOT NULL DEFAULT '',
  motivation TEXT NOT NULL,
  resume_name TEXT NOT NULL,
  resume_data_url TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending'
);
CREATE TABLE IF NOT EXISTS openings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  duration TEXT NOT NULL,
  compensation TEXT NOT NULL,
  course_fee TEXT NOT NULL DEFAULT 'To be confirmed',
  mode TEXT NOT NULL,
  skills TEXT NOT NULL DEFAULT '[]',
  deadline TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  image TEXT NOT NULL DEFAULT '/images/projects/placeholder.jpg',
  created_at TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS leadership (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '/images/founders/founder.png',
  linkedin TEXT DEFAULT '',
  twitter TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS employee_profiles (
  uid TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'employee',
  department TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', employee_code TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, date TEXT NOT NULL, check_in TEXT, check_out TEXT,
  check_in_lat REAL, check_in_lng REAL, check_out_lat REAL, check_out_lng REAL,
  status TEXT NOT NULL DEFAULT 'present', updated_at TEXT NOT NULL, UNIQUE(employee_id,date)
);
CREATE TABLE IF NOT EXISTS workforce_tasks (
  id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '', assigned_by TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
  started_at TEXT, completed_at TEXT, report TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
  reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reviewed_by TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, type TEXT NOT NULL,
  created_by TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workplace_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), latitude REAL NOT NULL, longitude REAL NOT NULL,
  radius_meters INTEGER NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS checkout_requests (
  id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, attendance_id TEXT NOT NULL,
  distance_meters INTEGER NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, resolved_at TEXT NOT NULL DEFAULT '', resolved_by TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS workforce_migrations (
  name TEXT PRIMARY KEY, completed_at TEXT NOT NULL
);
`);

// Migration: add course_fee column to existing databases
try {
  db.exec('ALTER TABLE openings ADD COLUMN course_fee TEXT NOT NULL DEFAULT \'To be confirmed\'');
} catch {
  // column already exists
}

// Add manual ordering while preserving each table's current display order.
for (const table of ['projects', 'leadership']) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0`);
    const rows = db.prepare(`SELECT id FROM ${table} ORDER BY created_at DESC, rowid DESC`).all();
    const update = db.prepare(`UPDATE ${table} SET display_order = ? WHERE id = ?`);
    rows.forEach((row, index) => update.run(index, row.id));
  } catch {
    // Column already exists.
  }
}

// Remove legacy sample records created by earlier builds. Real content is entered in the admin CMS.
db.prepare("DELETE FROM openings WHERE id IN ('flutter-intern','react-intern','backend-intern','uiux-intern','marketing-intern','python-intern')").run();
db.prepare("DELETE FROM projects WHERE id IN ('spectra-crm','explorist','bus-buddy','aiscatty','jetskie')").run();
db.prepare("DELETE FROM leadership WHERE id IN ('founder-1','founder-2')").run();
db.prepare("DELETE FROM career_vacancies WHERE id IN ('flutter-dev','react-dev','backend-dev','uiux-designer','digital-marketing-intern')").run();

export default db;
