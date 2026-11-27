import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../db.js';
import { adminMiddleware, workforceUserMiddleware, isAdminRole } from '../auth.js';
import { workforceEvents } from '../events.js';

const router = Router();
const stamp = () => new Date().toISOString();
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const distanceMeters = (a, b) => {
  const r = n => n * Math.PI / 180;
  const dLat = r(b.latitude - a.latitude), dLon = r(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
};
const requireLocation = value => {
  const latitude = Number(value?.latitude), longitude = Number(value?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};
const mapEmployee = row => ({ id: row.uid, uid: row.uid, email: row.email, name: row.name, role: row.role, department: row.department, title: row.title, employeeCode: row.employee_code, joiningDate: row.joining_date || '', employmentType: row.employment_type || 'full_time', salaryAmount: Number(row.salary_amount || 0), managerUid: row.manager_uid || '', active: Boolean(row.active), createdAt: row.created_at });
const mapAttendance = row => ({ id: row.id, employeeId: row.employee_id, date: row.date, checkIn: row.check_in, checkOut: row.check_out, checkInLocation: row.check_in_lat == null ? null : { latitude: row.check_in_lat, longitude: row.check_in_lng }, checkOutLocation: row.check_out_lat == null ? null : { latitude: row.check_out_lat, longitude: row.check_out_lng }, status: row.status, updatedAt: row.updated_at });
const changed = entity => workforceEvents.emit('change', { entity, at: stamp() });
const audit = (userId, action, entityId, previousValue = '', updatedValue = '') => db.prepare('INSERT INTO workforce_audit_logs(id,user_id,action,module,entity_id,previous_value,updated_value,created_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), userId, action, 'attendance_regularisation', entityId, JSON.stringify(previousValue), JSON.stringify(updatedValue), stamp());
const getEmployee = uid => db.prepare('SELECT * FROM employee_profiles WHERE uid=?').get(uid);
const isAdmin = user => isAdminRole(user?.role);
const canManageTask = (user, task) => {
  if (isAdmin(user)) return true;
  if (task.employee_id === user.uid) return false;
  if (!['project_manager','team_leader'].includes(user.role) || !task.project_id) return false;
  const project = db.prepare('SELECT manager_uid FROM enterprise_projects WHERE id=?').get(task.project_id);
  return project?.manager_uid === user.uid || Boolean(db.prepare('SELECT 1 FROM enterprise_project_members WHERE project_id=? AND employee_uid=?').get(task.project_id, user.uid));
};
const canViewTask = (user, task) => task.employee_id === user.uid || canManageTask(user, task);

router.get('/migration/status', adminMiddleware, (_req, res) => {
  res.json({ imported: Boolean(db.prepare("SELECT name FROM workforce_migrations WHERE name='firestore-workforce-v1'").get()) });
});
router.post('/migration/import', adminMiddleware, (req, res) => {
  const marker = 'firestore-workforce-v1';
  if (db.prepare('SELECT name FROM workforce_migrations WHERE name=?').get(marker)) return res.json({ imported: true, skipped: true });
  const source = req.body || {};
  for (const key of ['employees','attendance','tasks','leaves','calendar','logoutRequests']) {
    if (!Array.isArray(source[key]) || source[key].length > 10000) return res.status(400).json({ error: `Invalid ${key} migration data.` });
  }
  const now = stamp();
  db.exec('BEGIN IMMEDIATE');
  try {
    const employeeStmt = db.prepare('INSERT OR IGNORE INTO employee_profiles(uid,email,name,role,department,title,employee_code,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)');
    for (const row of source.employees) {
      const uid = clean(row.uid || row.id, 128), email = clean(row.email, 160).toLowerCase(), name = clean(row.name || row.displayName || email, 120);
      if (!uid || !email) continue;
      employeeStmt.run(uid,email,name,clean(row.role || 'employee',40).toLowerCase(),clean(row.department,100),clean(row.title || row.position,100),clean(row.employeeCode,50),row.active===false?0:1,clean(row.createdAt,40)||now,now);
    }
    const attendanceStmt = db.prepare('INSERT OR IGNORE INTO attendance(id,employee_id,date,check_in,check_out,check_in_lat,check_in_lng,check_out_lat,check_out_lng,status,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
    for (const row of source.attendance) {
      const employeeId=clean(row.employeeId,128), date=clean(row.date,10), id=clean(row.id,180)||`${employeeId}_${date}`;
      if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      attendanceStmt.run(id,employeeId,date,row.checkIn||null,row.checkOut||null,row.checkInLocation?.latitude??null,row.checkInLocation?.longitude??null,row.checkOutLocation?.latitude??null,row.checkOutLocation?.longitude??null,clean(row.status||'present',20),now);
    }
    const taskStmt = db.prepare('INSERT OR IGNORE INTO workforce_tasks(id,employee_id,title,description,due_date,assigned_by,status,started_at,completed_at,report,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
    for (const row of source.tasks) {
      const id=clean(row.id,180), employeeId=clean(row.employeeId,128), title=clean(row.title,180); if(!id||!employeeId||!title)continue;
      taskStmt.run(id,employeeId,title,clean(row.description,5000),clean(row.dueDate,10),clean(row.assignedBy,120),clean(row.status||'pending',20),row.startedAt||null,row.completedAt||null,clean(row.report,5000),row.createdAt||now,now);
    }
    const leaveStmt = db.prepare('INSERT OR IGNORE INTO leave_requests(id,employee_id,type,start_date,end_date,reason,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)');
    for (const row of source.leaves) {
      const id=clean(row.id,180), employeeId=clean(row.employeeId,128), date=clean(row.startDate||row.date,10); if(!id||!employeeId||!date)continue;
      leaveStmt.run(id,employeeId,clean(row.type||'regular',20),date,clean(row.endDate||row.date||date,10),clean(row.reason,2000),clean(row.status||'pending',20),row.createdAt||now,now);
    }
    const calendarStmt = db.prepare('INSERT OR IGNORE INTO calendar_events(id,title,date,type,created_by,created_at) VALUES(?,?,?,?,?,?)');
    for (const row of source.calendar) {
      const id=clean(row.id,180), title=clean(row.title,120), date=clean(row.date,10); if(!id||!title||!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
      calendarStmt.run(id,title,date,clean(row.type||'event',20),req.user.uid,row.createdAt||now);
    }
    const workplace=source.workplace;
    if(workplace&&Number.isFinite(Number(workplace.latitude))&&Number.isFinite(Number(workplace.longitude))&&Number.isFinite(Number(workplace.radiusMeters))) {
      db.prepare('INSERT OR IGNORE INTO workplace_settings(id,latitude,longitude,radius_meters,updated_by,updated_at) VALUES(1,?,?,?,?,?)').run(Number(workplace.latitude),Number(workplace.longitude),Number(workplace.radiusMeters),req.user.uid,now);
    }
    const logoutStmt=db.prepare('INSERT OR IGNORE INTO checkout_requests(id,employee_id,attendance_id,distance_meters,latitude,longitude,status,created_at,resolved_at,resolved_by) VALUES(?,?,?,?,?,?,?,?,?,?)');
    for(const row of source.logoutRequests){const location=row.location||{};const id=clean(row.id,180),employeeId=clean(row.employeeId,128),attendanceId=clean(row.attendanceId,180);if(!id||!employeeId||!attendanceId)continue;logoutStmt.run(id,employeeId,attendanceId,Number(row.distanceMeters)||0,Number(location.latitude)||0,Number(location.longitude)||0,clean(row.status||'pending',20),row.createdAt||now,row.resolvedAt||'',clean(row.resolvedBy||row.resolution,128));}
    db.prepare('INSERT INTO workforce_migrations(name,completed_at) VALUES(?,?)').run(marker,now);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  changed('employees'); changed('attendance'); changed('tasks'); changed('leaves'); changed('calendar'); changed('checkout_requests');
  res.json({ imported: true });
});

router.get('/me', workforceUserMiddleware, (req, res) => {
  const saved = getEmployee(req.user.uid);
  const profile = req.user.profile || {};
  res.json({
    uid: req.user.uid,
    email: profile.email || saved?.email || req.user.email,
    name: profile.name || saved?.name || req.user.name,
    role: req.user.role,
    department: profile.department || saved?.department || '',
    title: profile.title || saved?.title || '',
    employeeCode: profile.employeeCode || saved?.employee_code || '',
    joiningDate: profile.joiningDate || saved?.joining_date || '',
    employmentType: profile.employmentType || saved?.employment_type || 'full_time',
    salaryAmount: profile.salaryAmount ?? saved?.salary_amount ?? null,
    managerUid: profile.managerUid || saved?.manager_uid || '',
    active: req.user.active,
  });
});

router.get('/events', workforceUserMiddleware, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
  res.write(`data: ${JSON.stringify({ entity: 'connected' })}\n\n`);
  const listener = event => res.write(`data: ${JSON.stringify(event)}\n\n`);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
  workforceEvents.on('change', listener);
  req.on('close', () => { clearInterval(heartbeat); workforceEvents.off('change', listener); });
});

router.get('/employees', adminMiddleware, (_req, res) => {
  res.json(db.prepare('SELECT * FROM employee_profiles ORDER BY name COLLATE NOCASE').all().map(mapEmployee));
});
router.post('/employees', adminMiddleware, (req, res) => {
  const uid = clean(req.body?.uid, 128), email = clean(req.body?.email, 160).toLowerCase(), name = clean(req.body?.name, 120);
  if (!uid || !email || !name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'A Firebase UID, employee name, and valid email are required.' });
  const role = ['employee', 'developer', 'project_manager', 'sales_executive', 'finance_manager', 'hr'].includes(clean(req.body?.role, 40).toLowerCase()) ? clean(req.body.role, 40).toLowerCase() : 'employee';
  const now = stamp();
  const salary = Number(req.body?.salaryAmount ?? getEmployee(uid)?.salary_amount ?? 0);
  if (!Number.isFinite(salary) || salary < 0 || salary > 1_000_000_000) return res.status(400).json({ error: 'Salary amount must be a valid non-negative number.' });
  db.prepare(`INSERT INTO employee_profiles(uid,email,name,role,department,title,employee_code,joining_date,employment_type,salary_amount,manager_uid,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,1,?,?)
    ON CONFLICT(uid) DO UPDATE SET email=excluded.email,name=excluded.name,role=excluded.role,department=excluded.department,title=excluded.title,employee_code=excluded.employee_code,joining_date=excluded.joining_date,employment_type=excluded.employment_type,salary_amount=excluded.salary_amount,manager_uid=excluded.manager_uid,active=1,updated_at=excluded.updated_at`)
    .run(uid, email, name, role, clean(req.body?.department, 100), clean(req.body?.title, 100), clean(req.body?.employeeCode, 50), clean(req.body?.joiningDate, 10), clean(req.body?.employmentType || 'full_time', 30), salary, clean(req.body?.managerUid, 128), now, now);
  changed('employees'); res.status(201).json(mapEmployee(getEmployee(uid)));
});
router.delete('/employees/:uid', adminMiddleware, (req, res) => {
  const result = db.prepare('UPDATE employee_profiles SET active=0,updated_at=? WHERE uid=?').run(stamp(), req.params.uid);
  if (!result.changes) return res.status(404).json({ error: 'Employee not found' });
  changed('employees'); res.status(204).end();
});

router.get('/workplace', workforceUserMiddleware, (_req, res) => {
  const row = db.prepare('SELECT latitude,longitude,radius_meters AS radiusMeters,updated_at AS updatedAt FROM workplace_settings WHERE id=1').get();
  res.json(row || null);
});
router.put('/workplace', adminMiddleware, (req, res) => {
  const latitude = Number(req.body?.latitude), longitude = Number(req.body?.longitude), radius = Number(req.body?.radiusMeters);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isInteger(radius) || radius < 50 || radius > 10000) return res.status(400).json({ error: 'Valid coordinates and a radius from 50 to 10,000 meters are required.' });
  db.prepare(`INSERT INTO workplace_settings(id,latitude,longitude,radius_meters,updated_by,updated_at) VALUES(1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,radius_meters=excluded.radius_meters,updated_by=excluded.updated_by,updated_at=excluded.updated_at`).run(latitude, longitude, radius, req.user.uid, stamp());
  changed('workplace'); res.json({ latitude, longitude, radiusMeters: radius });
});

router.get('/attendance', workforceUserMiddleware, (req, res) => {
  const employeeId = isAdmin(req.user) ? clean(req.query.employeeId, 128) : req.user.uid;
  const date = clean(req.query.date, 10);
  let rows;
  if (employeeId && date) rows = db.prepare('SELECT * FROM attendance WHERE employee_id=? AND date=? ORDER BY date DESC').all(employeeId, date);
  else if (employeeId) rows = db.prepare('SELECT * FROM attendance WHERE employee_id=? ORDER BY date DESC LIMIT 1000').all(employeeId);
  else if (date) rows = db.prepare('SELECT * FROM attendance WHERE date=? ORDER BY employee_id').all(date);
  else rows = db.prepare('SELECT * FROM attendance ORDER BY date DESC LIMIT 1000').all();
  res.json(rows.map(mapAttendance));
});
router.post('/attendance/check-in', workforceUserMiddleware, (req, res) => {
  const location = requireLocation(req.body?.location), date = clean(req.body?.date, 10);
  if (!location || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'A valid date and current location are required.' });
  const accuracy = Number(req.body?.accuracyMeters);
  if (!Number.isFinite(accuracy) || accuracy < 0) return res.status(400).json({ error: 'GPS accuracy is required to verify attendance.' });
  if (accuracy > 100) return res.status(422).json({ error: `GPS accuracy is too low (${Math.round(accuracy)}m). Move to an open area and try again, or request attendance regularisation.` });
  const workplace = db.prepare('SELECT * FROM workplace_settings WHERE id=1').get();
  if (!workplace) return res.status(409).json({ error: 'The workplace location has not been configured.' });
  const distance = distanceMeters(location, workplace);
  if (distance > workplace.radius_meters) return res.status(403).json({ error: `You are ${distance}m from the workplace. Check-in is limited to ${workplace.radius_meters}m.` });
  const now = stamp(), id = `${req.user.uid}_${date}`;
  try { db.prepare('INSERT INTO attendance(id,employee_id,date,check_in,check_in_lat,check_in_lng,status,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id, req.user.uid, date, now, location.latitude, location.longitude, 'present', now); }
  catch { return res.status(409).json({ error: 'Attendance has already been checked in for this date.' }); }
  changed('attendance'); res.status(201).json(mapAttendance(db.prepare('SELECT * FROM attendance WHERE id=?').get(id)));
});
router.post('/attendance/check-out', workforceUserMiddleware, (req, res) => {
  const location = requireLocation(req.body?.location), date = clean(req.body?.date, 10), id = `${req.user.uid}_${date}`;
  if (!location || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'A valid date and current location are required.' });
  const accuracy = Number(req.body?.accuracyMeters);
  if (!Number.isFinite(accuracy) || accuracy < 0) return res.status(400).json({ error: 'GPS accuracy is required to verify attendance.' });
  const record = db.prepare('SELECT * FROM attendance WHERE id=? AND employee_id=?').get(id, req.user.uid);
  if (!record?.check_in) return res.status(404).json({ error: 'Check in before checking out.' });
  if (record.check_out) return res.status(409).json({ error: 'You have already checked out for this date.' });
  const workplace = db.prepare('SELECT * FROM workplace_settings WHERE id=1').get();
  if (!workplace) return res.status(409).json({ error: 'The workplace location has not been configured.' });
  const distance = distanceMeters(location, workplace), now = stamp();
  if (distance > workplace.radius_meters || accuracy > 100) {
    const pending = db.prepare("SELECT id FROM checkout_requests WHERE attendance_id=? AND status='pending'").get(id);
    if (pending) return res.status(200).json({ requestPending: true, message: 'Your checkout request is awaiting administrator review.' });
    const requestId = randomUUID();
    const reason = clean(req.body?.reason, 1000);
    if (!reason) return res.status(422).json({ error: accuracy > 100 ? 'GPS accuracy is too low. Enter a reason to submit an attendance regularisation request.' : 'You are outside the office geofence. Enter a reason to submit an attendance regularisation request.' });
    db.prepare('INSERT INTO checkout_requests(id,employee_id,attendance_id,distance_meters,latitude,longitude,created_at,reason,attempt_at,accuracy_meters) VALUES(?,?,?,?,?,?,?,?,?,?)').run(requestId, req.user.uid, id, distance, location.latitude, location.longitude, now, reason, now, accuracy);
    audit(req.user.uid, 'request_submitted', requestId, '', { attendanceId: id, reason, distanceMeters: distance, accuracyMeters: accuracy });
    changed('checkout_requests'); return res.status(202).json({ requestPending: true, message: `You are ${distance}m from the workplace. A checkout request was sent to an administrator.` });
  }
  const hours = (Date.now() - new Date(record.check_in).getTime()) / 3600000;
  db.prepare('UPDATE attendance SET check_out=?,check_out_lat=?,check_out_lng=?,status=?,updated_at=? WHERE id=? AND check_out IS NULL').run(now, location.latitude, location.longitude, hours < 4 ? 'half-day' : 'present', now, id);
  changed('attendance'); res.json(mapAttendance(db.prepare('SELECT * FROM attendance WHERE id=?').get(id)));
});

router.post('/regularisation', workforceUserMiddleware, (req, res) => {
  const date = clean(req.body?.date, 10), reason = clean(req.body?.reason, 1000), category = clean(req.body?.category || 'forgotten-checkout', 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || reason.length < 3) return res.status(400).json({ error: 'Select a valid attendance date and provide a reason.' });
  const attendanceId = `${req.user.uid}_${date}`;
  const attendance = db.prepare('SELECT * FROM attendance WHERE id=? AND employee_id=?').get(attendanceId, req.user.uid);
  if (!attendance?.check_in) return res.status(404).json({ error: 'A checked-in attendance record is required for regularisation.' });
  if (attendance.check_out) return res.status(409).json({ error: 'This attendance record is already complete.' });
  const existing = db.prepare("SELECT id FROM checkout_requests WHERE attendance_id=? AND status='pending'").get(attendanceId);
  if (existing) return res.status(409).json({ error: 'A regularisation request is already pending for this date.' });
  const id = randomUUID(), now = stamp(), location = requireLocation(req.body?.location);
  db.prepare('INSERT INTO checkout_requests(id,employee_id,attendance_id,distance_meters,latitude,longitude,status,created_at,reason,attempt_at,accuracy_meters) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id, req.user.uid, attendanceId, Number(req.body?.distanceMeters) || 0, location?.latitude ?? 0, location?.longitude ?? 0, 'pending', now, `${category}: ${reason}`, clean(req.body?.attemptAt, 40) || now, Number.isFinite(Number(req.body?.accuracyMeters)) ? Number(req.body.accuracyMeters) : null);
  audit(req.user.uid, 'request_submitted', id, '', { attendanceId, reason, category });
  changed('checkout_requests');
  res.status(201).json({ id, status: 'pending' });
});
router.get('/checkout-requests', workforceUserMiddleware, (req, res) => {
  const rows = isAdmin(req.user)
    ? db.prepare("SELECT * FROM checkout_requests WHERE status='pending' ORDER BY created_at").all()
    : db.prepare('SELECT * FROM checkout_requests WHERE employee_id=? ORDER BY created_at DESC').all(req.user.uid);
  res.json(rows.map(row => ({ id: row.id, employeeId: row.employee_id, attendanceId: row.attendance_id, date: row.attendance_id.slice(-10), checkIn: db.prepare('SELECT check_in FROM attendance WHERE id=?').get(row.attendance_id)?.check_in || null, distanceMeters: row.distance_meters, location: row.accuracy_meters == null ? null : { latitude: row.latitude, longitude: row.longitude }, accuracyMeters: row.accuracy_meters, reason: row.reason, attemptAt: row.attempt_at || row.created_at, adminRemarks: row.admin_remarks, status: row.status, createdAt: row.created_at })));
});
router.get('/audit-logs', adminMiddleware, (req, res) => {
  const rows = db.prepare("SELECT * FROM workforce_audit_logs WHERE module='attendance_regularisation' ORDER BY created_at DESC LIMIT 500").all();
  res.json(rows.map(row => ({ id: row.id, userId: row.user_id, action: row.action, module: row.module, entityId: row.entity_id, previousValue: row.previous_value, updatedValue: row.updated_value, createdAt: row.created_at })));
});
const reviewCheckoutRequest = (req, res) => {
  const request = db.prepare("SELECT * FROM checkout_requests WHERE id=? AND status='pending'").get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Pending checkout request not found.' });
  const decision = clean(req.body?.status, 20), remarks = clean(req.body?.remarks, 1000);
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Choose approve or reject.' });
  if (decision === 'rejected' && !remarks) return res.status(400).json({ error: 'Add a remark when rejecting a request.' });
  const attendance = db.prepare('SELECT * FROM attendance WHERE id=?').get(request.attendance_id);
  if (!attendance || attendance.check_out) return res.status(409).json({ error: 'Attendance is missing or already checked out.' });
  const now = stamp(), checkoutTime = request.attempt_at || now, hours = (new Date(checkoutTime).getTime() - new Date(attendance.check_in).getTime()) / 3600000;
  db.exec('BEGIN IMMEDIATE');
  try {
    if (decision === 'approved') db.prepare('UPDATE attendance SET check_out=?,check_out_lat=?,check_out_lng=?,status=?,updated_at=? WHERE id=?').run(checkoutTime, request.latitude, request.longitude, hours < 4 ? 'half-day' : 'present', now, attendance.id);
    db.prepare('UPDATE checkout_requests SET status=?,resolved_at=?,resolved_by=?,admin_remarks=? WHERE id=?').run(decision, now, req.user.uid, remarks, request.id);
    audit(req.user.uid, `request_${decision}`, request.id, { status: 'pending' }, { status: decision, remarks, attendanceId: attendance.id });
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  changed('attendance'); changed('checkout_requests'); res.json({ ok: true });
};
router.post('/checkout-requests/:id/review', adminMiddleware, reviewCheckoutRequest);
router.post('/checkout-requests/:id/approve', adminMiddleware, (req, res) => { req.body = { ...req.body, status: 'approved' }; return reviewCheckoutRequest(req, res); });

router.get('/tasks', workforceUserMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM workforce_tasks ORDER BY created_at DESC').all().filter(row => canViewTask(req.user, row));
  res.json(rows.map(row => ({ id: row.id, employeeId: row.employee_id, title: row.title, description: row.description, dueDate: row.due_date, assignedBy: row.assigned_by, status: row.status, priority: row.priority || 'medium', projectId: row.project_id || '', commentCount: db.prepare('SELECT COUNT(*) count FROM workforce_task_comments WHERE task_id=?').get(row.id).count, startedAt: row.started_at, completedAt: row.completed_at, report: row.report, createdAt: row.created_at, updatedAt: row.updated_at })));
});
router.post('/tasks', workforceUserMiddleware, (req, res) => {
  if (!isAdmin(req.user) && !['project_manager','team_leader'].includes(req.user.role)) return res.status(403).json({ error: 'Project manager access required to assign tasks.' });
  const employeeId = clean(req.body?.employeeId, 128), title = clean(req.body?.title, 180), description = clean(req.body?.description, 5000), dueDate = clean(req.body?.dueDate, 10);
  if (!getEmployee(employeeId)?.active || !title || !description) return res.status(400).json({ error: 'Select an active employee and provide a task title and description.' });
  const projectId = clean(req.body?.projectId, 64), priority = ['low','medium','high','critical'].includes(clean(req.body?.priority, 20)) ? clean(req.body.priority, 20) : 'medium';
  if (projectId) {
    const project = db.prepare('SELECT * FROM enterprise_projects WHERE id=?').get(projectId);
    if (!project) return res.status(400).json({ error: 'The selected project does not exist.' });
    if (!isAdmin(req.user) && project.manager_uid !== req.user.uid && !db.prepare('SELECT 1 FROM enterprise_project_members WHERE project_id=? AND employee_uid=?').get(projectId, req.user.uid)) return res.status(403).json({ error: 'Assign tasks only within projects you manage or belong to.' });
  }
  const id = randomUUID(), now = stamp();
  db.prepare('INSERT INTO workforce_tasks(id,employee_id,title,description,due_date,assigned_by,created_at,updated_at,priority,project_id) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, employeeId, title, description, dueDate, req.user.name || req.user.email, now, now, priority, projectId);
  db.prepare('INSERT INTO enterprise_notifications(id,type,title,body,entity_type,entity_id,actor_uid,created_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), 'task', 'New task assigned', title, 'task', id, req.user.uid, now);
  db.prepare('INSERT INTO workforce_audit_logs(id,user_id,action,module,entity_id,previous_value,updated_value,created_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), req.user.uid, 'task_assigned', 'enterprise_tasks', id, '', JSON.stringify({ employeeId, projectId, priority }), now);
  changed('tasks'); res.status(201).json({ id });
});
router.get('/tasks/:id/comments', workforceUserMiddleware, (req, res) => {
  const task = db.prepare('SELECT * FROM workforce_tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  if (!canViewTask(req.user, task)) return res.status(403).json({ error: 'This task is not assigned to you.' });
  res.json(db.prepare('SELECT * FROM workforce_task_comments WHERE task_id=? ORDER BY created_at ASC').all(task.id).map(row => ({ id: row.id, taskId: row.task_id, authorUid: row.author_uid, authorName: getEmployee(row.author_uid)?.name || row.author_uid, body: row.body, createdAt: row.created_at })));
});
router.post('/tasks/:id/comments', workforceUserMiddleware, (req, res) => {
  const task = db.prepare('SELECT * FROM workforce_tasks WHERE id=?').get(req.params.id), body = clean(req.body?.body, 3000);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  if (!canViewTask(req.user, task)) return res.status(403).json({ error: 'This task is not assigned to you.' });
  if (!body) return res.status(400).json({ error: 'Comment text is required.' });
  const id = randomUUID(), createdAt = stamp(); db.prepare('INSERT INTO workforce_task_comments(id,task_id,author_uid,body,created_at) VALUES(?,?,?,?,?)').run(id, task.id, req.user.uid, body, createdAt);
  changed('tasks'); res.status(201).json({ id, taskId: task.id, authorUid: req.user.uid, authorName: req.user.name || req.user.email, body, createdAt });
});
router.patch('/tasks/:id', workforceUserMiddleware, (req, res) => {
  const task = db.prepare('SELECT * FROM workforce_tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  if (!canViewTask(req.user, task)) return res.status(403).json({ error: 'This task is assigned to another employee.' });
  const status = clean(req.body?.status, 20), now = stamp();
  if (status === 'in-progress' && task.status === 'pending') db.prepare("UPDATE workforce_tasks SET status='in-progress',started_at=?,updated_at=? WHERE id=?").run(now, now, task.id);
  else if (status === 'completed' && clean(req.body?.report, 5000)) db.prepare("UPDATE workforce_tasks SET status='completed',report=?,completed_at=?,updated_at=? WHERE id=?").run(clean(req.body.report, 5000), now, now, task.id);
  else return res.status(400).json({ error: 'Start the task or provide a completion report.' });
  db.prepare('INSERT INTO workforce_audit_logs(id,user_id,action,module,entity_id,previous_value,updated_value,created_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), req.user.uid, 'task_status_updated', 'enterprise_tasks', task.id, JSON.stringify({ status: task.status }), JSON.stringify({ status }), now);
  changed('tasks'); res.json({ ok: true });
});

router.get('/leaves', workforceUserMiddleware, (req, res) => {
  const rows = isAdmin(req.user) ? db.prepare('SELECT * FROM leave_requests ORDER BY created_at DESC').all() : db.prepare('SELECT * FROM leave_requests WHERE employee_id=? ORDER BY created_at DESC').all(req.user.uid);
  res.json(rows.map(row => ({ id: row.id, employeeId: row.employee_id, type: row.type, date: row.start_date, startDate: row.start_date, endDate: row.end_date, reason: row.reason, status: row.status, createdAt: row.created_at, reviewedAt: row.reviewed_at })));
});
router.post('/leaves', workforceUserMiddleware, (req, res) => {
  const type = ['regular','emergency'].includes(clean(req.body?.type, 20)) ? clean(req.body.type, 20) : '';
  const startDate = clean(req.body?.startDate || req.body?.date, 10), endDate = clean(req.body?.endDate || req.body?.date, 10), reason = clean(req.body?.reason, 2000);
  if (!type || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate || !reason) return res.status(400).json({ error: 'Choose a leave type, valid dates, and a reason.' });
  const id = randomUUID(), now = stamp();
  db.prepare('INSERT INTO leave_requests(id,employee_id,type,start_date,end_date,reason,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id, req.user.uid, type, startDate, endDate, reason, now, now);
  changed('leaves'); res.status(201).json({ id });
});
router.patch('/leaves/:id/review', adminMiddleware, (req, res) => {
  const status = ['approved','rejected'].includes(clean(req.body?.status, 20)) ? clean(req.body.status, 20) : '';
  if (!status) return res.status(400).json({ error: 'Review status must be approved or rejected.' });
  const now = stamp(), result = db.prepare('UPDATE leave_requests SET status=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=? AND status=\'pending\'').run(status, req.user.uid, now, now, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Pending leave request not found.' });
  db.prepare('INSERT INTO workforce_audit_logs(id,user_id,action,module,entity_id,previous_value,updated_value,created_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), req.user.uid, `leave_${status}`, 'hr', req.params.id, JSON.stringify({ status: 'pending' }), JSON.stringify({ status }), now);
  changed('leaves'); res.json({ ok: true });
});

router.get('/calendar', workforceUserMiddleware, (req, res) => {
  const year = Number(req.query.year || new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ error: 'Invalid calendar year.' });
  res.json(db.prepare('SELECT id,title,date,type,created_at AS createdAt FROM calendar_events WHERE date>=? AND date<? ORDER BY date').all(`${year}-01-01`, `${year + 1}-01-01`));
});
router.post('/calendar', adminMiddleware, (req, res) => {
  const title = clean(req.body?.title, 120), date = clean(req.body?.date, 10), type = ['working-day','holiday','event'].includes(clean(req.body?.type, 20)) ? clean(req.body.type, 20) : '';
  if (!title || !type || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Provide a title, valid date, and calendar entry type.' });
  const id = randomUUID(), now = stamp(); db.prepare('INSERT INTO calendar_events(id,title,date,type,created_by,created_at) VALUES(?,?,?,?,?,?)').run(id,title,date,type,req.user.uid,now);
  changed('calendar'); res.status(201).json({ id });
});

export default router;
