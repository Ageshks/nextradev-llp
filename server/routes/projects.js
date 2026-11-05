import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import db, { resetProjectsToDefaults } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
const projectsDir = path.join(process.cwd(), 'public', 'uploads', 'projects');
fs.mkdirSync(projectsDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, projectsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});

function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).slice(0, 20);
  try { const arr = JSON.parse(tags); return Array.isArray(arr) ? arr.map(String).slice(0, 20) : []; }
  catch { return String(tags || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 20); }
}

// Public: list projects
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    tags: JSON.parse(r.tags || '[]'),
    image: r.image,
  })));
});

// Admin: add project
router.post('/', authMiddleware, upload.single('projectImage'), (req, res) => {
  const title = String(req.body?.title || '').trim().slice(0, 160);
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = req.body?.id ? String(req.body.id).slice(0, 64) : randomUUID();
  const description = String(req.body?.description || '').trim().slice(0, 1000);
  const category = String(req.body?.category || 'Other').trim().slice(0, 80);
  const tags = parseTags(req.body?.tags);
  const image = req.file ? `/uploads/projects/${req.file.filename}` : String(req.body?.image || '/images/projects/placeholder.jpg').trim().slice(0, 255);
  db.prepare('INSERT INTO projects (id, title, description, category, tags, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, title, description, category, JSON.stringify(tags), image, new Date().toISOString());
  res.status(201).json({ id, message: 'Created' });
});

// Admin: update project
router.put('/:id', authMiddleware, upload.single('projectImage'), (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT id, image FROM projects WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const title = String(req.body?.title || '').trim().slice(0, 160);
  const description = String(req.body?.description || '').trim().slice(0, 1000);
  const category = String(req.body?.category || 'Other').trim().slice(0, 80);
  const tags = parseTags(req.body?.tags);
  const image = req.file ? `/uploads/projects/${req.file.filename}` : String(req.body?.image || existing.image).trim().slice(0, 255);
  db.prepare('UPDATE projects SET title=?, description=?, category=?, tags=?, image=? WHERE id=?')
    .run(title, description, category, JSON.stringify(tags), image, id);
  res.json({ id, message: 'Updated' });
});

// Admin: delete project
router.delete('/:id', authMiddleware, (req, res) => {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

// Admin: reset to defaults
router.post('/reset', authMiddleware, (_req, res) => {
  resetProjectsToDefaults();
  res.json({ message: 'Reset' });
});

export default router;
