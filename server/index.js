import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import db from './db.js';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import openingRoutes from './routes/openings.js';
import projectRoutes from './routes/projects.js';
import leadershipRoutes from './routes/leadership.js';
import { authMiddleware } from './auth.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_URL = process.env.CLIENT_URL || '*';
const allowedOrigins = CLIENT_URL.split(',').map(s => s.trim());

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const projectsDir = path.join(uploadsDir, 'projects');
const foundersDir = path.join(uploadsDir, 'founders');
fs.mkdirSync(projectsDir, { recursive: true });
fs.mkdirSync(foundersDir, { recursive: true });

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  // No cookies are used; admin routes authenticate with an explicit bearer token.
  // Reflect browser origins by default so deployed frontend/API hosts can communicate.
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded images statically
app.use('/uploads/projects', express.static(projectsDir));
app.use('/uploads/founders', express.static(foundersDir));

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const dir = file.fieldname === 'founderImage' ? foundersDir : projectsDir;
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'nextradev-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/openings', openingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/leadership', leadershipRoutes);

// Admin-only helper: list users (not needed). Keep /api/admin/verify
app.get('/api/admin/verify', authMiddleware, (req, res) => res.json({ ok: true, user: req.user }));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Nextradev API listening on http://localhost:${PORT}`);
  db.prepare('SELECT 1').get();
});

export { upload };
