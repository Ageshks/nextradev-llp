import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
const STATUSES = ['Pending', 'Under Review', 'Shortlisted', 'Rejected', 'Accepted'];
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function clean(v, max = 500) {
  return String(v ?? '').trim().slice(0, max);
}

function validateApplication(body) {
  const errors = {};
  const fullName = clean(body.fullName, 120);
  const email = clean(body.email, 160);
  const phone = clean(body.phone, 60);
  const college = clean(body.college, 160);
  const education = clean(body.education, 160);
  const position = clean(body.position, 160);
  const mode = clean(body.mode, 40);
  const skills = clean(body.skills, 500);
  const motivation = clean(body.motivation, 4000);
  const resumeName = clean(body.resumeName, 255);
  const resumeDataUrl = String(body.resumeDataUrl || '');

  if (!fullName) errors.fullName = 'Full name required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email required';
  if (!phone) errors.phone = 'Phone required';
  if (!college) errors.college = 'College required';
  if (!education) errors.education = 'Education required';
  if (!position) errors.position = 'Select position';
  if (!['Remote', 'On-site', 'Hybrid'].includes(mode)) errors.mode = 'Select mode';
  if (!motivation) errors.motivation = 'Required';
  if (!resumeName) errors.resume = 'Resume required';
  if (!resumeDataUrl.startsWith('data:application/pdf;base64,')) errors.resume = 'Resume must be a PDF';
  else {
    const b64 = resumeDataUrl.split(',')[1] || '';
    const bytes = Math.ceil((b64.length * 3) / 4);
    if (bytes > MAX_RESUME_BYTES) errors.resume = 'Max 5MB';
  }
  if (!body.consent) errors.consent = 'You must consent';

  return { errors, value: { fullName, email, phone, college, education, position, mode, skills, motivation, resumeName, resumeDataUrl } };
}

// Public: submit application
router.post('/', (req, res) => {
  const { errors, value } = validateApplication(req.body || {});
  if (Object.keys(errors).length) {
    return res.status(400).json({ errors, message: 'Validation failed' });
  }
  const duplicate = db.prepare(
    "SELECT id FROM applications WHERE lower(email) = lower(?) AND position = ?"
  ).get(value.email, value.position);
  if (duplicate) {
    return res.status(409).json({ message: 'You have already applied for this position.' });
  }

  const id = randomUUID();
  const submittedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO applications (id, full_name, email, phone, college, education, position, mode, skills, motivation, resume_name, resume_data_url, submitted_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
  `).run(
    id, value.fullName, value.email, value.phone, value.college, value.education, value.position,
    value.mode, value.skills, value.motivation, value.resumeName, value.resumeDataUrl, submittedAt
  );

  res.status(201).json({ id, message: 'Application submitted successfully.' });
});

// Admin: list applications
router.get('/', authMiddleware, (req, res) => {
  const position = String(req.query.position || 'All');
  let rows;
  if (position && position !== 'All') {
    rows = db.prepare('SELECT id, full_name, email, phone, college, education, position, mode, skills, motivation, resume_name, submitted_at, status FROM applications WHERE position = ? ORDER BY submitted_at DESC').all(position);
  } else {
    rows = db.prepare('SELECT id, full_name, email, phone, college, education, position, mode, skills, motivation, resume_name, submitted_at, status FROM applications ORDER BY submitted_at DESC').all();
  }
  const apps = rows.map(r => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    college: r.college,
    education: r.education,
    position: r.position,
    mode: r.mode,
    skills: r.skills,
    motivation: r.motivation,
    resumeName: r.resume_name,
    submittedAt: r.submitted_at,
    status: r.status,
  }));
  res.json(apps);
});

// Admin: get one application with resume
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    college: row.college,
    education: row.education,
    position: row.position,
    mode: row.mode,
    skills: row.skills,
    motivation: row.motivation,
    resumeName: row.resume_name,
    resumeDataUrl: row.resume_data_url,
    submittedAt: row.submitted_at,
    status: row.status,
  });
});

// Admin: update status
router.patch('/:id/status', authMiddleware, (req, res) => {
  const status = String(req.body?.status || '');
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const info = db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Updated' });
});

// Admin: delete
router.delete('/:id', authMiddleware, (req, res) => {
  const info = db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
