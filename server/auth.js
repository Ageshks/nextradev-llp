import jwt from 'jsonwebtoken';
import { X509Certificate } from 'node:crypto';
import db from './db.js';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'nextradev-652ae';
let signingKeys = new Map();
let signingKeysExpiry = 0;
const adminRoles = new Set(['admin', 'super_admin', 'super admin', 'hr', 'hr_manager']);

async function firebaseKeys() {
  if (Date.now() < signingKeysExpiry && signingKeys.size) return signingKeys;
  const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if (!response.ok) throw new Error('Firebase signing keys unavailable');
  const raw = await response.json();
  signingKeys = new Map(Object.entries(raw).map(([kid, certificate]) => [kid, new X509Certificate(certificate).publicKey]));
  const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 300);
  signingKeysExpiry = Date.now() + Math.min(maxAge, 3600) * 1000;
  return signingKeys;
}

async function verifyFirebaseToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded?.header?.kid;
  if (decoded?.header?.alg !== 'RS256' || !kid) throw new Error('Invalid Firebase token');
  const key = (await firebaseKeys()).get(kid);
  if (!key) { signingKeysExpiry = 0; throw new Error('Unknown Firebase signing key'); }
  const claims = jwt.verify(token, key, {
    algorithms: ['RS256'], audience: FIREBASE_PROJECT_ID,
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
  });
  if (typeof claims === 'string' || !claims.sub || claims.sub.length > 128 || !claims.auth_time || claims.auth_time > Date.now() / 1000) {
    throw new Error('Invalid Firebase user claims');
  }
  return claims;
}

async function firebaseEmployeeRole(uid, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/employees/${encodeURIComponent(uid)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  const document = await response.json();
  const fields = document.fields || {};
  const value = field => field?.stringValue ?? field?.integerValue ?? field?.booleanValue ?? '';
  return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, value(field)]));
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    const claims = await verifyFirebaseToken(token);
    const firestoreProfile = await firebaseEmployeeRole(claims.sub, token);
    const stored = db.prepare('SELECT * FROM employee_profiles WHERE uid=?').get(claims.sub);
    const profile = firestoreProfile?.role ? firestoreProfile : (stored ? { role: stored.role, name: stored.name, email: stored.email, department: stored.department, title: stored.title, employeeCode: stored.employee_code } : firestoreProfile);
    const active = stored ? Boolean(stored.active) : profile?.active !== false && profile?.active !== 'false' && profile?.active !== 0 && profile?.active !== '0';
    req.user = { uid: claims.sub, email: claims.email || '', role: String(profile?.role || '').toLowerCase(), name: String(profile?.name || claims.name || ''), active, profile: profile || {} };
    next();
  } catch {
    return res.status(401).json({ error: 'Firebase authentication failed' });
  }
}

export async function workforceUserMiddleware(req, res, next) {
  await authMiddleware(req, res, () => {
    const allowed = new Set(['employee','developer','project_manager','sales_executive','finance_manager','hr','hr_manager','admin','super_admin','super admin']);
    if (!req.user.active || !allowed.has(req.user.role)) return res.status(403).json({ error: 'An active company employee profile is required.' });
    next();
  });
}

export async function adminMiddleware(req, res, next) {
  await authMiddleware(req, res, () => {
    if (!req.user?.active || !adminRoles.has(req.user?.role)) return res.status(403).json({ error: 'Administrator access required' });
    next();
  });
}

export function isAdminRole(role) { return adminRoles.has(String(role || '').toLowerCase()); }
