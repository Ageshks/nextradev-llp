import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

const foundersDir = path.join(process.cwd(), 'public', 'uploads', 'founders');
fs.mkdirSync(foundersDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, foundersDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});

// Public: list leadership
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM leadership ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    designation: r.designation,
    bio: r.bio,
    image: r.image,
    linkedin: r.linkedin,
    twitter: r.twitter,
  })));
});

function fields(body) {
  const name = String(body?.name || '').trim().slice(0, 120);
  if (!name) return null;
  return {
    name,
    designation: String(body?.designation || '').trim().slice(0, 120),
    bio: String(body?.bio || '').trim().slice(0, 2000),
    linkedin: String(body?.linkedin || '').trim().slice(0, 500),
    twitter: String(body?.twitter || '').trim().slice(0, 500),
  };
}

router.post('/', authMiddleware, upload.single('founderImage'), (req, res) => {
  const data = fields(req.body);
  if (!data) return res.status(400).json({ error: 'Name required' });
  if (!req.file) return res.status(400).json({ error: 'Founder photo required' });
  const id = randomUUID();
  const image = `/uploads/founders/${req.file.filename}`;
  db.prepare('INSERT INTO leadership (id,name,designation,bio,image,linkedin,twitter,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, data.name, data.designation, data.bio, image, data.linkedin, data.twitter, new Date().toISOString());
  res.status(201).json({ id, ...data, image });
});

router.put('/:id', authMiddleware, upload.single('founderImage'), (req, res) => {
  const data = fields(req.body);
  if (!data) return res.status(400).json({ error: 'Name required' });
  const existing = db.prepare('SELECT image FROM leadership WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const image = req.file ? `/uploads/founders/${req.file.filename}` : existing.image;
  db.prepare('UPDATE leadership SET name=?,designation=?,bio=?,image=?,linkedin=?,twitter=? WHERE id=?')
    .run(data.name, data.designation, data.bio, image, data.linkedin, data.twitter, req.params.id);
  res.json({ id: req.params.id, ...data, image });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM leadership WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Removed' });
});

export default router;
