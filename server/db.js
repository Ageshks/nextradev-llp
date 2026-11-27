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
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  joining_date TEXT NOT NULL DEFAULT '', employment_type TEXT NOT NULL DEFAULT 'full_time', salary_amount REAL NOT NULL DEFAULT 0, manager_uid TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, date TEXT NOT NULL, check_in TEXT, check_out TEXT,
  check_in_lat REAL, check_in_lng REAL, check_out_lat REAL, check_out_lng REAL,
  status TEXT NOT NULL DEFAULT 'present', updated_at TEXT NOT NULL, UNIQUE(employee_id,date)
);
CREATE TABLE IF NOT EXISTS workforce_tasks (
  id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '', assigned_by TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
  started_at TEXT, completed_at TEXT, report TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium', project_id TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS workforce_task_comments (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL, author_uid TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES workforce_tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON workforce_task_comments(task_id, created_at);
CREATE TABLE IF NOT EXISTS payroll_records (
  id TEXT PRIMARY KEY, employee_uid TEXT NOT NULL, period_year INTEGER NOT NULL, period_month INTEGER NOT NULL,
  base_salary REAL NOT NULL, attendance_deduction REAL NOT NULL DEFAULT 0, overtime_amount REAL NOT NULL DEFAULT 0,
  other_deductions REAL NOT NULL DEFAULT 0, net_pay REAL NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
  generated_by TEXT NOT NULL, reviewed_by TEXT NOT NULL DEFAULT '', paid_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(employee_uid,period_year,period_month)
);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_records(period_year,period_month,status);
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
  status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, resolved_at TEXT NOT NULL DEFAULT '', resolved_by TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '', attempt_at TEXT NOT NULL DEFAULT '', accuracy_meters REAL, admin_remarks TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS workforce_audit_logs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL, module TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '', previous_value TEXT NOT NULL DEFAULT '', updated_value TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enterprise_departments (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, head_uid TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enterprise_clients (
  id TEXT PRIMARY KEY, company_name TEXT NOT NULL, contact_name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', industry TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active',
  address TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enterprise_leads (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, company_name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new',
  expected_value REAL NOT NULL DEFAULT 0, owner_uid TEXT NOT NULL DEFAULT '', follow_up_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '', client_id TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enterprise_projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, client_id TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
  manager_uid TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '', deadline TEXT NOT NULL DEFAULT '',
  budget REAL NOT NULL DEFAULT 0, progress INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'not_started',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enterprise_project_members (
  project_id TEXT NOT NULL, employee_uid TEXT NOT NULL, member_role TEXT NOT NULL DEFAULT 'developer', created_at TEXT NOT NULL,
  PRIMARY KEY(project_id, employee_uid), FOREIGN KEY(project_id) REFERENCES enterprise_projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS enterprise_invoices (
  id TEXT PRIMARY KEY, invoice_number TEXT NOT NULL UNIQUE, client_id TEXT NOT NULL DEFAULT '', project_id TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'INR', issued_at TEXT NOT NULL, due_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', paid_at TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enterprise_expenses (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', amount REAL NOT NULL,
  spent_at TEXT NOT NULL, payment_method TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enterprise_notifications (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT '', entity_id TEXT NOT NULL DEFAULT '', actor_uid TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, read_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS enterprise_proposals (
  id TEXT PRIMARY KEY, proposal_number TEXT NOT NULL UNIQUE, client_id TEXT NOT NULL DEFAULT '', title TEXT NOT NULL,
  amount REAL NOT NULL, valid_until TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', details TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '', converted_project_id TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enterprise_contracts (
  id TEXT PRIMARY KEY, contract_number TEXT NOT NULL UNIQUE, client_id TEXT NOT NULL DEFAULT '', project_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0, start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft', details TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enterprise_support_tickets (
  id TEXT PRIMARY KEY, ticket_number TEXT NOT NULL UNIQUE, client_id TEXT NOT NULL DEFAULT '', title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open',
  assigned_uid TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL DEFAULT '', resolved_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enterprise_ticket_comments (
  id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, author_uid TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL,
  FOREIGN KEY(ticket_id) REFERENCES enterprise_support_tickets(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_enterprise_projects_status ON enterprise_projects(status, deadline);
CREATE INDEX IF NOT EXISTS idx_enterprise_projects_client ON enterprise_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_project_members_employee ON enterprise_project_members(employee_uid);
CREATE INDEX IF NOT EXISTS idx_enterprise_invoices_status ON enterprise_invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_enterprise_invoices_client ON enterprise_invoices(client_id, status);
CREATE INDEX IF NOT EXISTS idx_enterprise_invoices_project ON enterprise_invoices(project_id, status);
CREATE INDEX IF NOT EXISTS idx_enterprise_expenses_spent_at ON enterprise_expenses(spent_at);
CREATE INDEX IF NOT EXISTS idx_enterprise_leads_status ON enterprise_leads(status, follow_up_date);
CREATE INDEX IF NOT EXISTS idx_enterprise_leads_owner ON enterprise_leads(owner_uid, status);
CREATE INDEX IF NOT EXISTS idx_enterprise_proposals_client ON enterprise_proposals(client_id,status);
CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_client ON enterprise_contracts(client_id,status);
CREATE INDEX IF NOT EXISTS idx_enterprise_support_status ON enterprise_support_tickets(status,priority,updated_at);
CREATE TABLE IF NOT EXISTS workforce_migrations (
  name TEXT PRIMARY KEY, completed_at TEXT NOT NULL
);
`);

for (const [table, column] of [
  ['checkout_requests', "reason TEXT NOT NULL DEFAULT ''"],
  ['checkout_requests', "attempt_at TEXT NOT NULL DEFAULT ''"],
  ['checkout_requests', 'accuracy_meters REAL'],
  ['checkout_requests', "admin_remarks TEXT NOT NULL DEFAULT ''"],
  ['workforce_tasks', "priority TEXT NOT NULL DEFAULT 'medium'"],
  ['workforce_tasks', "project_id TEXT NOT NULL DEFAULT ''"],
  ['employee_profiles', "joining_date TEXT NOT NULL DEFAULT ''"],
  ['employee_profiles', "employment_type TEXT NOT NULL DEFAULT 'full_time'"],
  ['employee_profiles', 'salary_amount REAL NOT NULL DEFAULT 0'],
  ['employee_profiles', "manager_uid TEXT NOT NULL DEFAULT ''"],
]) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column}`); } catch { /* already present */ }
}

const departmentSeed = db.prepare('INSERT OR IGNORE INTO enterprise_departments(id,name,created_at,updated_at) VALUES(?,?,?,?)');
const seedTimestamp = new Date().toISOString();
for (const [id, name] of [
  ['department-software', 'Software Development'], ['department-mobile', 'Mobile App Development'],
  ['department-web', 'Web Development'], ['department-design', 'UI/UX Design'],
  ['department-marketing', 'Digital Marketing'], ['department-sales', 'Sales'],
  ['department-hr', 'Human Resources'], ['department-finance', 'Finance'], ['department-admin', 'Administration'],
]) departmentSeed.run(id, name, seedTimestamp, seedTimestamp);

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
