import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../db.js';
import { workforceUserMiddleware, isAdminRole } from '../auth.js';
import { workforceEvents } from '../events.js';

const router = Router();
const now = () => new Date().toISOString();
const text = (value, max = 5000) => String(value ?? '').trim().slice(0, max);
const roles = {
  admin: ['admin', 'super_admin', 'super admin'],
  hr: ['admin', 'super_admin', 'super admin', 'hr', 'hr_manager'],
  sales: ['admin', 'super_admin', 'super admin', 'sales_executive'],
  projects: ['admin', 'super_admin', 'super admin', 'project_manager', 'team_leader'],
  finance: ['admin', 'super_admin', 'super admin', 'finance_manager'],
};
const allow = key => (req, res, next) => roles[key].includes(req.user.role) ? next() : res.status(403).json({ error: 'Your role cannot access this module.' });
const allowAny = (...allowed) => (req, res, next) => allowed.some(key => roles[key].includes(req.user.role)) ? next() : res.status(403).json({ error: 'Your role cannot access this module.' });
const money = value => { const n = Number(value); return Number.isFinite(n) && n >= 0 && n <= 1_000_000_000_000 ? n : null; };
const notify = (type, title, body, entityType, entityId, actorUid) => {
  db.prepare('INSERT INTO enterprise_notifications(id,type,title,body,entity_type,entity_id,actor_uid,created_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), type, title, body, entityType, entityId, actorUid, now());
  workforceEvents.emit('change', { entity: 'enterprise_notifications', at: now() });
};
const audit = (userId, action, module, entityId, previousValue = '', updatedValue = '') => db.prepare('INSERT INTO workforce_audit_logs(id,user_id,action,module,entity_id,previous_value,updated_value,created_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), userId, action, module, entityId, JSON.stringify(previousValue), JSON.stringify(updatedValue), now());
const recentNotifications = (role, limit = 100) => {
  if (isAdminRole(role)) return db.prepare('SELECT * FROM enterprise_notifications ORDER BY created_at DESC LIMIT ?').all(limit).map(mapRow);
  const permitted = roles.finance.includes(role) ? ['invoice','payment','expense']
    : roles.sales.includes(role) ? ['client','lead','proposal','contract','ticket']
      : roles.projects.includes(role) ? ['project','task','client','contract','ticket']
        : roles.hr.includes(role) ? ['employee','attendance','leave'] : [];
  if (!permitted.length) return [];
  const placeholders = permitted.map(() => '?').join(',');
  return db.prepare(`SELECT * FROM enterprise_notifications WHERE type IN (${placeholders}) ORDER BY created_at DESC LIMIT ?`).all(...permitted, limit).map(mapRow);
};

function mapRow(row) {
  if (!row) return row;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), value]));
}
const list = (table, order = 'created_at DESC') => db.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all().map(mapRow);

router.use(workforceUserMiddleware);
router.get('/audit-logs', allow('admin'), (_req, res) => {
  res.json(db.prepare('SELECT * FROM workforce_audit_logs ORDER BY created_at DESC LIMIT 500').all().map(row => ({ id: row.id, userId: row.user_id, action: row.action, module: row.module, entityId: row.entity_id, previousValue: row.previous_value, updatedValue: row.updated_value, createdAt: row.created_at })));
});
router.get('/dashboard', (req, res) => {
  const month = new Date().toISOString().slice(0, 7), previous = new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 7);
  const moneyVisible = roles.finance.includes(req.user.role) || isAdminRole(req.user.role);
  const currentRevenue = db.prepare("SELECT COALESCE(SUM(amount),0) amount FROM enterprise_invoices WHERE status='paid' AND substr(paid_at,1,7)=?").get(month).amount;
  const previousRevenue = db.prepare("SELECT COALESCE(SUM(amount),0) amount FROM enterprise_invoices WHERE status='paid' AND substr(paid_at,1,7)=?").get(previous).amount;
  const currentExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) amount FROM enterprise_expenses WHERE substr(spent_at,1,7)=?').get(month).amount;
  const previousExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) amount FROM enterprise_expenses WHERE substr(spent_at,1,7)=?').get(previous).amount;
  const paid = db.prepare("SELECT COALESCE(SUM(amount),0) amount FROM enterprise_invoices WHERE status='paid'").get().amount;
  const pendingPayments = db.prepare("SELECT COUNT(*) count FROM enterprise_invoices WHERE status IN ('pending','overdue')").get().count;
  const projectCounts = db.prepare("SELECT COUNT(*) total, SUM(CASE WHEN status IN ('in_progress','planning','testing','client_review') THEN 1 ELSE 0 END) active, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) completed, SUM(CASE WHEN deadline<>'' AND deadline<date('now') AND status<>'completed' THEN 1 ELSE 0 END) delayed FROM enterprise_projects").get();
  const employees = db.prepare('SELECT COUNT(*) count FROM employee_profiles WHERE active=1').get().count;
  const checkedIn = db.prepare("SELECT COUNT(*) count FROM attendance WHERE date=? AND check_in IS NOT NULL AND check_out IS NULL").get(new Date().toISOString().slice(0, 10)).count;
  const clients = db.prepare("SELECT COUNT(*) count FROM enterprise_clients WHERE status='active'").get().count;
  const growth = (current, prior) => prior ? Math.round((current - prior) / prior * 1000) / 10 : null;
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); const key = d.toISOString().slice(0, 7);
    const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) amount FROM enterprise_invoices WHERE status='paid' AND substr(paid_at,1,7)=?").get(key).amount;
    const expenses = db.prepare('SELECT COALESCE(SUM(amount),0) amount FROM enterprise_expenses WHERE substr(spent_at,1,7)=?').get(key).amount;
    return { month: key, revenue: moneyVisible ? revenue : null, expenses: moneyVisible ? expenses : null };
  });
  const visibleProjects = isAdminRole(req.user.role)
    ? list('enterprise_projects', 'updated_at DESC')
    : db.prepare('SELECT DISTINCT p.* FROM enterprise_projects p LEFT JOIN enterprise_project_members m ON m.project_id=p.id WHERE p.manager_uid=? OR m.employee_uid=? ORDER BY p.updated_at DESC').all(req.user.uid, req.user.uid).map(mapRow);
  res.json({ month, kpis: {
    totalRevenue: moneyVisible ? paid : null, monthlyRevenue: moneyVisible ? currentRevenue : null,
    totalExpenses: moneyVisible ? db.prepare('SELECT COALESCE(SUM(amount),0) amount FROM enterprise_expenses').get().amount : null,
    monthlyExpenses: moneyVisible ? currentExpenses : null, netProfit: moneyVisible ? currentRevenue - currentExpenses : null,
    revenueChange: moneyVisible ? growth(currentRevenue, previousRevenue) : null, expensesChange: moneyVisible ? growth(currentExpenses, previousExpenses) : null,
    activeProjects: projectCounts.active || 0, completedProjects: projectCounts.completed || 0, totalProjects: projectCounts.total || 0,
    delayedProjects: projectCounts.delayed || 0, totalEmployees: employees, activeClients: clients,
    checkedInEmployees: isAdminRole(req.user.role) ? checkedIn : null,
    pendingPayments: moneyVisible ? pendingPayments : null,
    pendingTasks: db.prepare("SELECT COUNT(*) count FROM workforce_tasks WHERE status<>'completed'").get().count,
    pendingApprovals: db.prepare("SELECT (SELECT COUNT(*) FROM leave_requests WHERE status='pending') + (SELECT COUNT(*) FROM checkout_requests WHERE status='pending') count").get().count,
  }, monthly, projects: visibleProjects.slice(0, 5), activity: recentNotifications(req.user.role, 8) });
});

router.get('/departments', allow('hr'), (_req, res) => res.json(list('enterprise_departments', 'name COLLATE NOCASE')));
router.post('/departments', allow('hr'), (req, res) => {
  const name = text(req.body?.name, 100); if (!name) return res.status(400).json({ error: 'Department name is required.' });
  const headUid = text(req.body?.headUid, 128); if (headUid && !db.prepare('SELECT uid FROM employee_profiles WHERE uid=? AND active=1').get(headUid)) return res.status(400).json({ error: 'Department head must be an active employee.' });
  const timestamp = now(), id = randomUUID();
  try { db.prepare('INSERT INTO enterprise_departments(id,name,head_uid,description,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id, name, headUid, text(req.body?.description, 2000), timestamp, timestamp); }
  catch { return res.status(409).json({ error: 'A department with that name already exists.' }); }
  audit(req.user.uid, 'created', 'enterprise_departments', id, '', { name, headUid });
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_departments WHERE id=?').get(id)));
});

router.get('/clients', allowAny('sales','projects','finance'), (req, res) => {
  const q = `%${text(req.query.search, 100)}%`;
  const rows = db.prepare('SELECT * FROM enterprise_clients WHERE company_name LIKE ? OR contact_name LIKE ? OR email LIKE ? ORDER BY updated_at DESC').all(q, q, q);
  res.json(rows.map(row => ({ ...mapRow(row), activeProjects: db.prepare("SELECT COUNT(*) count FROM enterprise_projects WHERE client_id=? AND status NOT IN ('completed','cancelled')").get(row.id).count, businessValue: db.prepare('SELECT COALESCE(SUM(amount),0) amount FROM enterprise_invoices WHERE client_id=?').get(row.id).amount, pendingInvoices: db.prepare("SELECT COUNT(*) count FROM enterprise_invoices WHERE client_id=? AND status IN ('pending','overdue')").get(row.id).count, paymentHistory: db.prepare("SELECT invoice_number,amount,paid_at,status FROM enterprise_invoices WHERE client_id=? ORDER BY issued_at DESC LIMIT 3").all(row.id).map(mapRow) })));
});
router.post('/clients', allow('sales'), (req, res) => {
  const companyName = text(req.body?.companyName, 180), email = text(req.body?.email, 180).toLowerCase();
  if (!companyName || (email && !/^\S+@\S+\.\S+$/.test(email))) return res.status(400).json({ error: 'Enter a company name and a valid email address.' });
  const id = randomUUID(), timestamp = now();
  db.prepare('INSERT INTO enterprise_clients(id,company_name,contact_name,email,phone,industry,status,address,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id, companyName, text(req.body?.contactName, 150), email, text(req.body?.phone, 60), text(req.body?.industry, 100), 'active', text(req.body?.address, 1000), text(req.body?.notes, 3000), timestamp, timestamp);
  audit(req.user.uid, 'created', 'enterprise_clients', id, '', { companyName, email });
  notify('client', 'New client added', companyName, 'client', id, req.user.uid);
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_clients WHERE id=?').get(id)));
});
router.patch('/clients/:id', allow('sales'), (req, res) => {
  const row = db.prepare('SELECT * FROM enterprise_clients WHERE id=?').get(req.params.id); if (!row) return res.status(404).json({ error: 'Client not found.' });
  const fields = { company_name: text(req.body?.companyName ?? row.company_name, 180), contact_name: text(req.body?.contactName ?? row.contact_name, 150), email: text(req.body?.email ?? row.email, 180).toLowerCase(), phone: text(req.body?.phone ?? row.phone, 60), industry: text(req.body?.industry ?? row.industry, 100), status: ['active','inactive','prospect'].includes(req.body?.status) ? req.body.status : row.status, address: text(req.body?.address ?? row.address, 1000), notes: text(req.body?.notes ?? row.notes, 3000) };
  db.prepare('UPDATE enterprise_clients SET company_name=?,contact_name=?,email=?,phone=?,industry=?,status=?,address=?,notes=?,updated_at=? WHERE id=?').run(...Object.values(fields), now(), req.params.id);
  audit(req.user.uid, 'updated', 'enterprise_clients', req.params.id, { companyName: row.company_name, status: row.status }, { companyName: fields.company_name, status: fields.status });
  res.json(mapRow(db.prepare('SELECT * FROM enterprise_clients WHERE id=?').get(req.params.id)));
});

router.get('/leads', allow('sales'), (req, res) => {
  const rows = isAdminRole(req.user.role) ? list('enterprise_leads', 'updated_at DESC') : db.prepare('SELECT * FROM enterprise_leads WHERE owner_uid=? ORDER BY updated_at DESC').all(req.user.uid).map(mapRow);
  res.json(rows);
});
router.post('/leads', allow('sales'), (req, res) => {
  const name = text(req.body?.name, 150); if (!name) return res.status(400).json({ error: 'Lead name is required.' });
  const value = money(req.body?.expectedValue ?? 0); if (value == null) return res.status(400).json({ error: 'Expected value must be a valid non-negative amount.' });
  const id = randomUUID(), timestamp = now();
  db.prepare('INSERT INTO enterprise_leads(id,name,company_name,email,phone,source,status,expected_value,owner_uid,follow_up_date,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, name, text(req.body?.companyName, 180), text(req.body?.email, 180).toLowerCase(), text(req.body?.phone, 60), text(req.body?.source, 100), 'new', value, req.user.uid, text(req.body?.followUpDate, 10), text(req.body?.notes, 3000), timestamp, timestamp);
  audit(req.user.uid, 'created', 'enterprise_leads', id, '', { name, status: 'new', expectedValue: value });
  notify('lead', 'New lead added', `${name}${req.body?.companyName ? ` · ${text(req.body.companyName, 180)}` : ''}`, 'lead', id, req.user.uid);
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_leads WHERE id=?').get(id)));
});
router.patch('/leads/:id', allow('sales'), (req, res) => {
  const lead = db.prepare('SELECT * FROM enterprise_leads WHERE id=?').get(req.params.id); if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  if (!isAdminRole(req.user.role) && lead.owner_uid !== req.user.uid) return res.status(403).json({ error: 'This lead is assigned to another sales executive.' });
  const value = money(req.body?.expectedValue ?? lead.expected_value); if (value == null) return res.status(400).json({ error: 'Expected value must be valid.' });
  const status = ['new','contacted','qualified','proposal_sent','negotiation','won','lost'].includes(req.body?.status) ? req.body.status : lead.status;
  db.prepare('UPDATE enterprise_leads SET status=?,expected_value=?,follow_up_date=?,notes=?,updated_at=? WHERE id=?').run(status, value, text(req.body?.followUpDate ?? lead.follow_up_date, 10), text(req.body?.notes ?? lead.notes, 3000), now(), lead.id);
  audit(req.user.uid, 'updated', 'enterprise_leads', lead.id, { status: lead.status }, { status, expectedValue: value });
  res.json(mapRow(db.prepare('SELECT * FROM enterprise_leads WHERE id=?').get(lead.id)));
});
router.post('/leads/:id/convert', allow('sales'), (req, res) => {
  const lead = db.prepare('SELECT * FROM enterprise_leads WHERE id=?').get(req.params.id); if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  if (!isAdminRole(req.user.role) && lead.owner_uid !== req.user.uid) return res.status(403).json({ error: 'This lead is assigned to another sales executive.' });
  if (lead.client_id) return res.status(409).json({ error: 'This lead has already been converted.' });
  const id = randomUUID(), timestamp = now(); db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO enterprise_clients(id,company_name,contact_name,email,phone,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id, lead.company_name || lead.name, lead.name, lead.email, lead.phone, 'active', timestamp, timestamp);
    db.prepare("UPDATE enterprise_leads SET status='won',client_id=?,updated_at=? WHERE id=?").run(id, timestamp, lead.id);
    audit(req.user.uid, 'converted', 'enterprise_leads', lead.id, { status: lead.status }, { status: 'won', clientId: id });
    audit(req.user.uid, 'created_from_lead', 'enterprise_clients', id, '', { companyName: lead.company_name || lead.name });
    notify('client', 'Lead converted to client', lead.company_name || lead.name, 'client', id, req.user.uid); db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_clients WHERE id=?').get(id)));
});

router.get('/projects', allowAny('projects','sales','finance'), (req, res) => {
  const projects = isAdminRole(req.user.role) || ['sales','finance'].includes(String(req.user.role).toLowerCase())
    ? list('enterprise_projects', 'updated_at DESC')
    : db.prepare('SELECT DISTINCT p.* FROM enterprise_projects p LEFT JOIN enterprise_project_members m ON m.project_id=p.id WHERE p.manager_uid=? OR m.employee_uid=? ORDER BY p.updated_at DESC').all(req.user.uid, req.user.uid).map(mapRow);
  res.json(projects.map(project => ({ ...project, members: db.prepare('SELECT employee_uid AS employeeUid,member_role AS role FROM enterprise_project_members WHERE project_id=?').all(project.id) })));
});
router.get('/employees', allowAny('hr','projects','sales'), (req, res) => {
  const rows = db.prepare('SELECT uid,name,email,department,title,employee_code,role FROM employee_profiles WHERE active=1 ORDER BY name COLLATE NOCASE').all();
  res.json(rows.map(row => ({ uid: row.uid, name: row.name, email: row.email, department: row.department, title: row.title, employeeCode: row.employee_code, role: row.role })));
});
router.post('/projects', allow('projects'), (req, res) => {
  const name = text(req.body?.name, 180), budget = money(req.body?.budget ?? 0), progress = Number(req.body?.progress ?? 0);
  if (!name || budget == null || !Number.isInteger(progress) || progress < 0 || progress > 100) return res.status(400).json({ error: 'Provide a project name, valid budget, and progress from 0 to 100.' });
  const clientId = text(req.body?.clientId, 64); if (clientId && !db.prepare("SELECT id FROM enterprise_clients WHERE id=? AND status='active'").get(clientId)) return res.status(400).json({ error: 'Select an active client for this project.' });
  const id = randomUUID(), timestamp = now(), status = ['not_started','planning','in_progress','testing','client_review','on_hold','completed','cancelled'].includes(req.body?.status) ? req.body.status : 'not_started';
  const managerUid = isAdminRole(req.user.role) ? text(req.body?.managerUid || req.user.uid, 128) : req.user.uid;
  db.prepare('INSERT INTO enterprise_projects(id,name,client_id,description,manager_uid,start_date,deadline,budget,progress,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id, name, clientId, text(req.body?.description, 5000), managerUid, text(req.body?.startDate, 10), text(req.body?.deadline, 10), budget, progress, status, timestamp, timestamp);
  audit(req.user.uid, 'created', 'enterprise_projects', id, '', { name, managerUid, status, budget });
  notify('project', 'Project created', name, 'project', id, req.user.uid);
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_projects WHERE id=?').get(id)));
});
router.patch('/projects/:id', allow('projects'), (req, res) => {
  const project = db.prepare('SELECT * FROM enterprise_projects WHERE id=?').get(req.params.id); if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!isAdminRole(req.user.role) && project.manager_uid !== req.user.uid) return res.status(403).json({ error: 'Only the project manager or an administrator can edit this project.' });
  const budget = money(req.body?.budget ?? project.budget), progress = Number(req.body?.progress ?? project.progress); if (budget == null || !Number.isInteger(progress) || progress < 0 || progress > 100) return res.status(400).json({ error: 'Budget or progress is invalid.' });
  const clientId = text(req.body?.clientId ?? project.client_id, 64); if (clientId && !db.prepare("SELECT id FROM enterprise_clients WHERE id=? AND status='active'").get(clientId)) return res.status(400).json({ error: 'Select an active client for this project.' });
  const status = ['not_started','planning','in_progress','testing','client_review','on_hold','completed','cancelled'].includes(req.body?.status) ? req.body.status : project.status;
  db.prepare('UPDATE enterprise_projects SET name=?,client_id=?,description=?,manager_uid=?,start_date=?,deadline=?,budget=?,progress=?,status=?,updated_at=? WHERE id=?').run(text(req.body?.name ?? project.name, 180), clientId, text(req.body?.description ?? project.description, 5000), text(req.body?.managerUid ?? project.manager_uid, 128), text(req.body?.startDate ?? project.start_date, 10), text(req.body?.deadline ?? project.deadline, 10), budget, progress, status, now(), project.id);
  audit(req.user.uid, 'updated', 'enterprise_projects', project.id, { status: project.status, progress: project.progress }, { status, progress, budget });
  if (status !== project.status) notify('project', 'Project status changed', `${project.name}: ${status.replaceAll('_',' ')}`, 'project', project.id, req.user.uid);
  res.json(mapRow(db.prepare('SELECT * FROM enterprise_projects WHERE id=?').get(project.id)));
});
router.put('/projects/:id/members', allow('projects'), (req, res) => {
  const project = db.prepare('SELECT * FROM enterprise_projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!isAdminRole(req.user.role) && project.manager_uid !== req.user.uid) return res.status(403).json({ error: 'Only the project manager or an administrator can assign this project.' });
  if (!Array.isArray(req.body?.members) || req.body.members.length > 100) return res.status(400).json({ error: 'Members must be a list of employee IDs.' });
  const insert = db.prepare('INSERT OR IGNORE INTO enterprise_project_members(project_id,employee_uid,member_role,created_at) VALUES(?,?,?,?)');
  db.exec('BEGIN IMMEDIATE'); try {
    db.prepare('DELETE FROM enterprise_project_members WHERE project_id=?').run(req.params.id);
    for (const member of req.body.members) {
      const uid = text(typeof member === 'string' ? member : member.uid, 128); if (!uid || !db.prepare('SELECT uid FROM employee_profiles WHERE uid=? AND active=1').get(uid)) throw new Error('Every assigned member must be an active employee.');
      insert.run(req.params.id, uid, text(typeof member === 'string' ? 'developer' : member.role || 'developer', 40), now());
    }
    audit(req.user.uid, 'team_assigned', 'enterprise_projects', req.params.id, '', req.body.members);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); return res.status(400).json({ error: error.message || 'Could not assign project members.' }); }
  res.json({ projectId: req.params.id, members: db.prepare('SELECT employee_uid AS employeeUid,member_role AS role FROM enterprise_project_members WHERE project_id=?').all(req.params.id) });
});

router.get('/finance', allow('finance'), (_req, res) => res.json({ invoices: list('enterprise_invoices', 'issued_at DESC'), expenses: list('enterprise_expenses', 'spent_at DESC'), clients: list('enterprise_clients', 'company_name COLLATE NOCASE').map(({ id, company_name, contact_name }) => ({ id, company_name, contact_name })), projects: list('enterprise_projects', 'name COLLATE NOCASE').map(({ id, name }) => ({ id, name })) }));
router.post('/invoices', allow('finance'), (req, res) => {
  const invoiceNumber = text(req.body?.invoiceNumber, 40), amount = money(req.body?.amount), issuedAt = text(req.body?.issuedAt || now().slice(0, 10), 30);
  if (!invoiceNumber || amount == null || !/^\d{4}-\d{2}-\d{2}$/.test(issuedAt)) return res.status(400).json({ error: 'Invoice number, amount, and issue date are required.' });
  const clientId = text(req.body?.clientId, 64), projectId = text(req.body?.projectId, 64);
  if (clientId && !db.prepare('SELECT id FROM enterprise_clients WHERE id=?').get(clientId)) return res.status(400).json({ error: 'The selected client does not exist.' });
  if (projectId && !db.prepare('SELECT id FROM enterprise_projects WHERE id=?').get(projectId)) return res.status(400).json({ error: 'The selected project does not exist.' });
  const id = randomUUID(), timestamp = now();
  try { db.prepare('INSERT INTO enterprise_invoices(id,invoice_number,client_id,project_id,amount,currency,issued_at,due_date,status,notes,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, invoiceNumber, clientId, projectId, amount, text(req.body?.currency || 'INR', 3).toUpperCase(), issuedAt, text(req.body?.dueDate, 10), 'pending', text(req.body?.notes, 2000), req.user.uid, timestamp, timestamp); }
  catch { return res.status(409).json({ error: 'Invoice number already exists.' }); }
  audit(req.user.uid, 'created', 'enterprise_finance', id, '', { invoiceNumber, amount, status: 'pending' });
  notify('invoice', 'Invoice created', `${invoiceNumber} · ${amount}`, 'invoice', id, req.user.uid);
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_invoices WHERE id=?').get(id)));
});
router.patch('/invoices/:id', allow('finance'), (req, res) => {
  const invoice = db.prepare('SELECT * FROM enterprise_invoices WHERE id=?').get(req.params.id); if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
  const status = ['pending','paid','overdue','cancelled'].includes(req.body?.status) ? req.body.status : invoice.status;
  const paidAt = status === 'paid' ? text(req.body?.paidAt || now().slice(0, 10), 30) : invoice.paid_at;
  db.prepare('UPDATE enterprise_invoices SET status=?,paid_at=?,updated_at=? WHERE id=?').run(status, paidAt, now(), invoice.id);
  audit(req.user.uid, 'invoice_status_updated', 'enterprise_finance', invoice.id, { status: invoice.status }, { status, paidAt });
  if (status === 'paid' && invoice.status !== 'paid') notify('payment', 'Payment received', invoice.invoice_number, 'invoice', invoice.id, req.user.uid);
  res.json(mapRow(db.prepare('SELECT * FROM enterprise_invoices WHERE id=?').get(invoice.id)));
});
router.post('/expenses', allow('finance'), (req, res) => {
  const category = text(req.body?.category, 100), description = text(req.body?.description, 2000), amount = money(req.body?.amount), spentAt = text(req.body?.spentAt || now().slice(0, 10), 30);
  if (!category || amount == null || !/^\d{4}-\d{2}-\d{2}$/.test(spentAt)) return res.status(400).json({ error: 'Expense category, amount, and date are required.' });
  const id = randomUUID(), timestamp = now(); db.prepare('INSERT INTO enterprise_expenses(id,category,description,amount,spent_at,payment_method,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id, category, description, amount, spentAt, text(req.body?.paymentMethod, 80), req.user.uid, timestamp, timestamp);
  audit(req.user.uid, 'expense_created', 'enterprise_finance', id, '', { category, amount, spentAt });
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_expenses WHERE id=?').get(id)));
});
router.get('/payroll', allowAny('hr','finance'), (req, res) => {
  const year = Number(req.query.year || new Date().getFullYear()), month = Number(req.query.month || new Date().getMonth() + 1);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) return res.status(400).json({ error: 'Choose a valid payroll year and month.' });
  res.json(db.prepare(`SELECT p.*,e.name AS employee_name,e.email,e.department,e.title,e.employee_code FROM payroll_records p JOIN employee_profiles e ON e.uid=p.employee_uid WHERE p.period_year=? AND p.period_month=? ORDER BY e.name COLLATE NOCASE`).all(year, month).map(mapRow));
});
router.post('/payroll/generate', allow('hr'), (req, res) => {
  const year = Number(req.body?.year), month = Number(req.body?.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) return res.status(400).json({ error: 'Choose a valid payroll year and month.' });
  const employees = db.prepare('SELECT uid,salary_amount FROM employee_profiles WHERE active=1 AND salary_amount>0').all();
  const timestamp = now(), insert = db.prepare('INSERT OR IGNORE INTO payroll_records(id,employee_uid,period_year,period_month,base_salary,attendance_deduction,net_pay,status,generated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,\'draft\',?,?,?)');
  let generated = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const employee of employees) {
      const monthPrefix = `${year}-${String(month).padStart(2,'0')}`;
      const halfDays = db.prepare("SELECT COUNT(*) count FROM attendance WHERE employee_id=? AND substr(date,1,7)=? AND status='half-day'").get(employee.uid, monthPrefix).count;
      const deduction = Math.round((employee.salary_amount / 26 / 2) * halfDays * 100) / 100;
      const netPay = Math.max(0, Math.round((employee.salary_amount - deduction) * 100) / 100);
      generated += insert.run(randomUUID(), employee.uid, year, month, employee.salary_amount, deduction, netPay, req.user.uid, timestamp, timestamp).changes;
    }
    audit(req.user.uid, 'payroll_drafts_generated', 'enterprise_payroll', `${year}-${String(month).padStart(2,'0')}`, '', { generated, eligibleEmployees: employees.length });
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.status(201).json({ generated, skipped: employees.length - generated, message: 'Payroll drafts are ready for review. Only recorded half-days are deducted.' });
});
router.patch('/payroll/:id', allowAny('hr','finance'), (req, res) => {
  const payroll = db.prepare('SELECT * FROM payroll_records WHERE id=?').get(req.params.id); if (!payroll) return res.status(404).json({ error: 'Payroll record not found.' });
  const isFinanceRole = roles.finance.includes(req.user.role) && !roles.hr.includes(req.user.role);
  const requested = text(req.body?.status, 20);
  if (requested === 'approved') {
    if (isFinanceRole || !['draft','approved'].includes(payroll.status)) return res.status(409).json({ error: 'Only HR or an administrator can approve a draft payroll record.' });
    db.prepare("UPDATE payroll_records SET status='approved',reviewed_by=?,updated_at=? WHERE id=?").run(req.user.uid, now(), payroll.id);
  } else if (requested === 'paid') {
    if (!['approved','paid'].includes(payroll.status)) return res.status(409).json({ error: 'Approve payroll before recording payment.' });
    db.prepare("UPDATE payroll_records SET status='paid',paid_at=?,updated_at=? WHERE id=?").run(text(req.body?.paidAt || now().slice(0,10), 30), now(), payroll.id);
  } else if (!requested) {
    if (payroll.status !== 'draft' || isFinanceRole) return res.status(409).json({ error: 'Only HR or an administrator can adjust a draft payroll record.' });
    const overtime = money(req.body?.overtimeAmount ?? payroll.overtime_amount), deductions = money(req.body?.otherDeductions ?? payroll.other_deductions);
    if (overtime == null || deductions == null) return res.status(400).json({ error: 'Overtime and deductions must be valid non-negative amounts.' });
    const netPay = Math.max(0, Math.round((payroll.base_salary - payroll.attendance_deduction + overtime - deductions) * 100) / 100);
    db.prepare('UPDATE payroll_records SET overtime_amount=?,other_deductions=?,net_pay=?,updated_at=? WHERE id=?').run(overtime, deductions, netPay, now(), payroll.id);
  } else return res.status(400).json({ error: 'Supported payroll actions are draft adjustment, approve, and paid.' });
  audit(req.user.uid, requested || 'payroll_adjusted', 'enterprise_payroll', payroll.id, { status: payroll.status, netPay: payroll.net_pay }, req.body);
  res.json(mapRow(db.prepare('SELECT * FROM payroll_records WHERE id=?').get(payroll.id)));
});
router.get('/proposals', allow('sales'), (_req, res) => res.json(list('enterprise_proposals', 'updated_at DESC')));
router.post('/proposals', allow('sales'), (req, res) => {
  const proposalNumber = text(req.body?.proposalNumber, 50), title = text(req.body?.title, 180), amount = money(req.body?.amount);
  if (!proposalNumber || !title || amount == null) return res.status(400).json({ error: 'Proposal number, title, and amount are required.' });
  const clientId = text(req.body?.clientId, 64); if (clientId && !db.prepare('SELECT id FROM enterprise_clients WHERE id=?').get(clientId)) return res.status(400).json({ error: 'The selected client does not exist.' });
  const id = randomUUID(), timestamp = now();
  try { db.prepare('INSERT INTO enterprise_proposals(id,proposal_number,client_id,title,amount,valid_until,status,details,created_by,created_at,updated_at) VALUES(?,?,?,?,?,? ,\'draft\',?,?,?,?)').run(id, proposalNumber, clientId, title, amount, text(req.body?.validUntil, 10), text(req.body?.details, 5000), req.user.uid, timestamp, timestamp); }
  catch { return res.status(409).json({ error: 'Proposal number already exists.' }); }
  audit(req.user.uid, 'proposal_created', 'enterprise_proposals', id, '', { proposalNumber, clientId, amount });
  notify('proposal', 'Proposal created', proposalNumber, 'proposal', id, req.user.uid);
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_proposals WHERE id=?').get(id)));
});
router.patch('/proposals/:id', allow('sales'), (req, res) => {
  const row = db.prepare('SELECT * FROM enterprise_proposals WHERE id=?').get(req.params.id); if (!row) return res.status(404).json({ error: 'Proposal not found.' });
  if (!isAdminRole(req.user.role) && row.created_by !== req.user.uid) return res.status(403).json({ error: 'This proposal belongs to another sales executive.' });
  const status = ['draft','sent','viewed','accepted','rejected','expired'].includes(req.body?.status) ? req.body.status : row.status;
  db.prepare('UPDATE enterprise_proposals SET status=?,updated_at=? WHERE id=?').run(status, now(), row.id);
  audit(req.user.uid, 'proposal_status_updated', 'enterprise_proposals', row.id, { status: row.status }, { status });
  res.json(mapRow(db.prepare('SELECT * FROM enterprise_proposals WHERE id=?').get(row.id)));
});
router.post('/proposals/:id/convert', allow('sales'), (req, res) => {
  const proposal = db.prepare('SELECT * FROM enterprise_proposals WHERE id=?').get(req.params.id); if (!proposal) return res.status(404).json({ error: 'Proposal not found.' });
  if (!isAdminRole(req.user.role) && proposal.created_by !== req.user.uid) return res.status(403).json({ error: 'This proposal belongs to another sales executive.' });
  if (proposal.status !== 'accepted') return res.status(409).json({ error: 'Only accepted proposals can become projects.' });
  if (proposal.converted_project_id) return res.status(409).json({ error: 'This proposal already has a project.' });
  const projectId = randomUUID(), timestamp = now(); db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO enterprise_projects(id,name,client_id,description,manager_uid,budget,status,created_at,updated_at) VALUES(?,?,?,?,?,?,\'planning\',?,?)').run(projectId, proposal.title, proposal.client_id, proposal.details, req.user.uid, proposal.amount, timestamp, timestamp);
    db.prepare('UPDATE enterprise_proposals SET converted_project_id=?,updated_at=? WHERE id=?').run(projectId, timestamp, proposal.id);
    audit(req.user.uid, 'proposal_converted_to_project', 'enterprise_proposals', proposal.id, { status: proposal.status }, { projectId });
    notify('project', 'Accepted proposal converted', proposal.title, 'project', projectId, req.user.uid);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_projects WHERE id=?').get(projectId)));
});
router.get('/contracts', allowAny('sales','projects','finance'), (_req, res) => res.json(list('enterprise_contracts', 'updated_at DESC')));
router.post('/contracts', allow('sales'), (req, res) => {
  const contractNumber = text(req.body?.contractNumber, 50), title = text(req.body?.title, 180), amount = money(req.body?.amount ?? 0);
  if (!contractNumber || !title || amount == null) return res.status(400).json({ error: 'Contract number, title, and amount are required.' });
  const clientId = text(req.body?.clientId, 64), projectId = text(req.body?.projectId, 64);
  if (clientId && !db.prepare('SELECT id FROM enterprise_clients WHERE id=?').get(clientId)) return res.status(400).json({ error: 'The selected client does not exist.' });
  if (projectId && !db.prepare('SELECT id FROM enterprise_projects WHERE id=?').get(projectId)) return res.status(400).json({ error: 'The selected project does not exist.' });
  const id = randomUUID(), timestamp = now();
  try { db.prepare('INSERT INTO enterprise_contracts(id,contract_number,client_id,project_id,title,amount,start_date,end_date,status,details,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?, ?,\'draft\',?,?,?,?)').run(id, contractNumber, clientId, projectId, title, amount, text(req.body?.startDate, 10), text(req.body?.endDate, 10), text(req.body?.details, 5000), req.user.uid, timestamp, timestamp); }
  catch { return res.status(409).json({ error: 'Contract number already exists.' }); }
  audit(req.user.uid, 'contract_created', 'enterprise_contracts', id, '', { contractNumber, clientId, projectId });
  notify('contract', 'Contract created', contractNumber, 'contract', id, req.user.uid);
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_contracts WHERE id=?').get(id)));
});
router.patch('/contracts/:id', allow('sales'), (req, res) => {
  const row = db.prepare('SELECT * FROM enterprise_contracts WHERE id=?').get(req.params.id); if (!row) return res.status(404).json({ error: 'Contract not found.' });
  if (!isAdminRole(req.user.role) && row.created_by !== req.user.uid) return res.status(403).json({ error: 'This contract belongs to another sales executive.' });
  const status = ['draft','sent','active','expired','terminated'].includes(req.body?.status) ? req.body.status : row.status;
  db.prepare('UPDATE enterprise_contracts SET status=?,updated_at=? WHERE id=?').run(status, now(), row.id);
  audit(req.user.uid, 'contract_status_updated', 'enterprise_contracts', row.id, { status: row.status }, { status });
  res.json(mapRow(db.prepare('SELECT * FROM enterprise_contracts WHERE id=?').get(row.id)));
});
router.get('/support-tickets', allowAny('sales','projects','hr'), (_req, res) => res.json(list('enterprise_support_tickets', 'updated_at DESC')));
router.post('/support-tickets', allowAny('sales','projects','hr'), (req, res) => {
  const title = text(req.body?.title, 180), description = text(req.body?.description, 5000), priority = ['low','medium','high','critical'].includes(req.body?.priority) ? req.body.priority : 'medium';
  if (!title || !description) return res.status(400).json({ error: 'Ticket title and description are required.' });
  const ticketNumber = `SUP-${new Date().getFullYear()}-${randomUUID().slice(0,8).toUpperCase()}`, id = randomUUID(), timestamp = now(), clientId = text(req.body?.clientId, 64);
  if (clientId && !db.prepare('SELECT id FROM enterprise_clients WHERE id=?').get(clientId)) return res.status(400).json({ error: 'The selected client does not exist.' });
  const assignedUid = text(req.body?.assignedUid, 128);
  if (assignedUid && !db.prepare('SELECT uid FROM employee_profiles WHERE uid=? AND active=1').get(assignedUid)) return res.status(400).json({ error: 'Assigned user must be an active employee.' });
  db.prepare('INSERT INTO enterprise_support_tickets(id,ticket_number,client_id,title,description,priority,assigned_uid,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, ticketNumber, clientId, title, description, priority, assignedUid, req.user.uid, timestamp, timestamp);
  audit(req.user.uid, 'support_ticket_created', 'enterprise_support_tickets', id, '', { ticketNumber, priority });
  notify('ticket', 'Support ticket created', `${ticketNumber} · ${title}`, 'ticket', id, req.user.uid);
  res.status(201).json(mapRow(db.prepare('SELECT * FROM enterprise_support_tickets WHERE id=?').get(id)));
});
router.patch('/support-tickets/:id', allowAny('sales','projects','hr'), (req, res) => {
  const ticket = db.prepare('SELECT * FROM enterprise_support_tickets WHERE id=?').get(req.params.id); if (!ticket) return res.status(404).json({ error: 'Support ticket not found.' });
  const status = ['open','assigned','in_progress','waiting_client','resolved','closed'].includes(req.body?.status) ? req.body.status : ticket.status;
  const priority = ['low','medium','high','critical'].includes(req.body?.priority) ? req.body.priority : ticket.priority;
  const assignedUid = text(req.body?.assignedUid ?? ticket.assigned_uid, 128);
  if (assignedUid && !db.prepare('SELECT uid FROM employee_profiles WHERE uid=? AND active=1').get(assignedUid)) return res.status(400).json({ error: 'Assigned user must be an active employee.' });
  const resolvedAt = ['resolved','closed'].includes(status) ? ticket.resolved_at || now() : '';
  db.prepare('UPDATE enterprise_support_tickets SET status=?,priority=?,assigned_uid=?,resolved_at=?,updated_at=? WHERE id=?').run(status, priority, assignedUid, resolvedAt, now(), ticket.id);
  audit(req.user.uid, 'support_ticket_updated', 'enterprise_support_tickets', ticket.id, { status: ticket.status }, { status, priority, assignedUid });
  res.json(mapRow(db.prepare('SELECT * FROM enterprise_support_tickets WHERE id=?').get(ticket.id)));
});
router.get('/support-tickets/:id/comments', allowAny('sales','projects','hr'), (req, res) => {
  if (!db.prepare('SELECT id FROM enterprise_support_tickets WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Support ticket not found.' });
  res.json(db.prepare('SELECT * FROM enterprise_ticket_comments WHERE ticket_id=? ORDER BY created_at').all(req.params.id).map(mapRow));
});
router.post('/support-tickets/:id/comments', allowAny('sales','projects','hr'), (req, res) => {
  const ticket = db.prepare('SELECT id FROM enterprise_support_tickets WHERE id=?').get(req.params.id), body = text(req.body?.body, 3000);
  if (!ticket) return res.status(404).json({ error: 'Support ticket not found.' }); if (!body) return res.status(400).json({ error: 'Comment text is required.' });
  const id = randomUUID(), createdAt = now(); db.prepare('INSERT INTO enterprise_ticket_comments(id,ticket_id,author_uid,body,created_at) VALUES(?,?,?,?,?)').run(id,ticket.id,req.user.uid,body,createdAt);
  audit(req.user.uid, 'support_ticket_commented', 'enterprise_support_tickets', ticket.id, '', { commentId: id });
  res.status(201).json({ id, ticketId: ticket.id, authorUid: req.user.uid, body, createdAt });
});
router.get('/notifications', (req, res) => res.json(recentNotifications(req.user.role)));
router.patch('/notifications/:id/read', (req, res) => { const result = db.prepare("UPDATE enterprise_notifications SET read_at=? WHERE id=? AND read_at=''").run(now(), req.params.id); return result.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Notification not found or already read.' }); });

export default router;
