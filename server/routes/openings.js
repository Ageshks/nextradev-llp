import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db, { resetOpeningsToDefaults } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

function parseSkills(skills) {
  if (Array.isArray(skills)) return skills.map(String).slice(0, 20);
  try { const arr = JSON.parse(skills); return Array.isArray(arr) ? arr.map(String).slice(0,20) : []; }
  catch { return String(skills || '').split(',').map(s=>s.trim()).filter(Boolean).slice(0,20); }
}

// Public: list openings
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM openings ORDER BY title').all();
  res.json(rows.map(r => ({
    id: r.id,
    title: r.title,
    department: r.department,
    duration: r.duration,
    compensation: r.compensation,
    course_fee: r.course_fee,
    mode: r.mode,
    skills: JSON.parse(r.skills || '[]'),
    deadline: r.deadline,
  })));
});

// Admin: add opening
router.post('/', authMiddleware, (req, res) => {
  const title = String(req.body?.title || '').trim().slice(0, 160);
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = req.body?.id ? String(req.body.id).slice(0,64) : randomUUID();
  const department = String(req.body?.department || 'General').trim().slice(0,120);
  const duration = String(req.body?.duration || '3-6 months').trim().slice(0,60);
  const compensation = String(req.body?.compensation || 'To be confirmed').trim().slice(0,120);
  const course_fee = String(req.body?.course_fee || 'To be confirmed').trim().slice(0,120);
  const mode = String(req.body?.mode || 'Remote / Hybrid').trim().slice(0,60);
  const skills = parseSkills(req.body?.skills);
  const deadline = String(req.body?.deadline || 'Rolling').trim().slice(0,60);
  db.prepare('INSERT INTO openings (id,title,department,duration,compensation,course_fee,mode,skills,deadline) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, title, department, duration, compensation, course_fee, mode, JSON.stringify(skills), deadline);
  res.status(201).json({ id, message: 'Created' });
});

// Admin: update opening
router.put('/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT id FROM openings WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const title = String(req.body?.title || '').trim().slice(0, 160);
  const department = String(req.body?.department || 'General').trim().slice(0,120);
  const duration = String(req.body?.duration || '3-6 months').trim().slice(0,60);
  const compensation = String(req.body?.compensation || 'To be confirmed').trim().slice(0,120);
  const course_fee = String(req.body?.course_fee || 'To be confirmed').trim().slice(0,120);
  const mode = String(req.body?.mode || 'Remote / Hybrid').trim().slice(0,60);
  const skills = parseSkills(req.body?.skills);
  const deadline = String(req.body?.deadline || 'Rolling').trim().slice(0,60);
  db.prepare('UPDATE openings SET title=?, department=?, duration=?, compensation=?, course_fee=?, mode=?, skills=?, deadline=? WHERE id=?')
    .run(title, department, duration, compensation, course_fee, mode, JSON.stringify(skills), deadline, id);
  res.json({ id, message: 'Updated' });
});

// Admin: remove opening
router.delete('/:id', authMiddleware, (req, res) => {
  const info = db.prepare('DELETE FROM openings WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Removed' });
});

// Admin: reset to defaults
router.post('/reset', authMiddleware, (_req, res) => {
  resetOpeningsToDefaults();
  res.json({ message: 'Reset' });
});

export default router;
