import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { signToken, verifyToken, bcrypt } from '../auth.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

router.post('/login', loginLimiter, (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.length > 64 || password.length > 256) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  const user = db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').get(username);
  // Always run compare to reduce timing leaks
  const hash = user?.password_hash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = bcrypt.compareSync(password, hash);
  if (!user || !ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ id: user.id, username: user.username, role: user.role });
  res.json({ token, user: { username: user.username, role: user.role } });
});

router.get('/me', (req, res) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    res.json({ user: { id: payload.id, username: payload.username, role: payload.role } });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
