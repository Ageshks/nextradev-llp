import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const toVacancy = row => ({
  id: row.id,
  title: row.title,
  type: row.employment_type,
  location: row.location,
  description: row.description,
  isOpen: Boolean(row.is_open),
});

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM career_vacancies WHERE is_open=1 ORDER BY created_at DESC').all();
  res.json(rows.map(toVacancy));
});

router.get('/admin', authMiddleware, (_req, res) => {
  const rows = db.prepare('SELECT * FROM career_vacancies ORDER BY created_at DESC').all();
  res.json(rows.map(toVacancy));
});

router.post('/', authMiddleware, (req, res) => {
  const title = clean(req.body?.title, 160);
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const vacancy = {
    id: randomUUID(), title,
    type: clean(req.body?.type || 'Full-time', 60),
    location: clean(req.body?.location || 'India (Remote/Hybrid)', 120),
    description: clean(req.body?.description, 1000),
    isOpen: req.body?.isOpen === false ? 0 : 1,
  };
  db.prepare('INSERT INTO career_vacancies (id,title,employment_type,location,description,is_open,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(vacancy.id, vacancy.title, vacancy.type, vacancy.location, vacancy.description, vacancy.isOpen, new Date().toISOString());
  res.status(201).json(vacancy);
});

router.put('/:id', authMiddleware, (req, res) => {
  const title = clean(req.body?.title, 160);
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const vacancy = {
    id: req.params.id, title,
    type: clean(req.body?.type || 'Full-time', 60),
    location: clean(req.body?.location || 'India (Remote/Hybrid)', 120),
    description: clean(req.body?.description, 1000),
    isOpen: req.body?.isOpen === false ? 0 : 1,
  };
  const result = db.prepare('UPDATE career_vacancies SET title=?,employment_type=?,location=?,description=?,is_open=? WHERE id=?')
    .run(vacancy.title, vacancy.type, vacancy.location, vacancy.description, vacancy.isOpen, vacancy.id);
  if (!result.changes) return res.status(404).json({ error: 'Vacancy not found' });
  res.json(vacancy);
});

router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM career_vacancies WHERE id=?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Vacancy not found' });
  res.json({ message: 'Vacancy removed' });
});

export default router;
