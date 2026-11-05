import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const dataDir = path.join(process.cwd(), 'server', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'nextradev.db');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  college TEXT NOT NULL,
  education TEXT NOT NULL,
  position TEXT NOT NULL,
  mode TEXT NOT NULL,
  skills TEXT NOT NULL DEFAULT '',
  motivation TEXT NOT NULL,
  resume_name TEXT NOT NULL,
  resume_data_url TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending'
);
CREATE TABLE IF NOT EXISTS openings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  duration TEXT NOT NULL,
  compensation TEXT NOT NULL,
  course_fee TEXT NOT NULL DEFAULT 'To be confirmed',
  mode TEXT NOT NULL,
  skills TEXT NOT NULL DEFAULT '[]',
  deadline TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  image TEXT NOT NULL DEFAULT '/images/projects/placeholder.jpg',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS leadership (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '/images/founders/founder.png',
  linkedin TEXT DEFAULT '',
  twitter TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
`);

// Migration: add course_fee column to existing databases
try {
  db.exec('ALTER TABLE openings ADD COLUMN course_fee TEXT NOT NULL DEFAULT \'To be confirmed\'');
} catch {
  // column already exists
}

export const defaultOpenings = [
  { id: 'flutter-intern', title: 'Flutter Development Intern', department: 'Mobile Engineering', duration: '3-6 months', compensation: 'To be confirmed', course_fee: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['Dart','Flutter','Git'], deadline: 'Rolling' },
  { id: 'react-intern', title: 'React.js Development Intern', department: 'Web Engineering', duration: '3-6 months', compensation: 'To be confirmed', course_fee: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['React','TypeScript','Tailwind CSS'], deadline: 'Rolling' },
  { id: 'backend-intern', title: 'Backend Development Intern', department: 'Backend Engineering', duration: '3-6 months', compensation: 'To be confirmed', course_fee: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['Node.js','Databases','REST APIs'], deadline: 'Rolling' },
  { id: 'uiux-intern', title: 'UI/UX Design Intern', department: 'Design', duration: '3-6 months', compensation: 'To be confirmed', course_fee: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['Figma','Prototyping','User Research'], deadline: 'Rolling' },
  { id: 'marketing-intern', title: 'Digital Marketing Intern', department: 'Marketing', duration: '3-6 months', compensation: 'To be confirmed', course_fee: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['SEO','Social Media','Content'], deadline: 'Rolling' },
  { id: 'python-intern', title: 'Python Development Intern', department: 'Software Engineering', duration: '3-6 months', compensation: 'To be confirmed', course_fee: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['Python','APIs','Automation'], deadline: 'Rolling' },
];

export const defaultProjects = [
  { id: 'spectra-crm', title: 'Spectra CRM', description: 'Business and service management platform.', category: 'Business Software', tags: ['React','Node.js','PostgreSQL'], image: '/images/projects/spectra.jpg' },
  { id: 'explorist', title: 'Explorist', description: 'Travel and exploration application.', category: 'Mobile Applications', tags: ['Flutter','Firebase'], image: '/images/projects/explorist.jpg' },
  { id: 'bus-buddy', title: 'Bus Buddy', description: 'Bus management and tracking application.', category: 'Mobile Applications', tags: ['React Native','Maps API'], image: '/images/projects/bus-buddy.jpg' },
  { id: 'aiscatty', title: 'AisCatty', description: 'Pet adoption application.', category: 'Mobile Applications', tags: ['Flutter','Cloud'], image: '/images/projects/aiscatty.jpg' },
  { id: 'jetskie', title: 'Jetskie', description: 'Interactive Flutter game.', category: 'Creative Projects', tags: ['Flutter','Game'], image: '/images/projects/jetskie.jpg' },
];

export const defaultLeadership = [
  { id: 'founder-1', name: 'Founder Name', designation: 'Founder & CEO', bio: 'Short professional introduction.', image: '/images/founders/founder.png', linkedin: 'https://linkedin.com/in/profile', twitter: '' },
  { id: 'founder-2', name: 'Founder Name', designation: 'Co-Founder', bio: 'Short professional introduction.', image: '/images/founders/founder.png', linkedin: 'https://linkedin.com/in/profile', twitter: '' },
];

export function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'nextradev-admin';
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)')
      .run(username, hash, 'admin', new Date().toISOString());
    // eslint-disable-next-line no-console
    console.log(`Seeded admin user "${username}"`);
  }
}

export function seedOpenings() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM openings').get();
  if (c === 0) {
    const stmt = db.prepare('INSERT INTO openings (id, title, department, duration, compensation, course_fee, mode, skills, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const o of defaultOpenings) {
      stmt.run(o.id, o.title, o.department, o.duration, o.compensation, o.course_fee, o.mode, JSON.stringify(o.skills), o.deadline);
    }
  }
}

export function seedProjects() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM projects').get();
  if (c === 0) {
    const stmt = db.prepare('INSERT INTO projects (id, title, description, category, tags, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    for (const p of defaultProjects) {
      stmt.run(p.id, p.title, p.description, p.category, JSON.stringify(p.tags), p.image, now);
    }
  }
}

export function seedLeadership() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM leadership').get();
  if (c === 0) {
    const stmt = db.prepare('INSERT INTO leadership (id, name, designation, bio, image, linkedin, twitter, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    for (const l of defaultLeadership) {
      stmt.run(l.id, l.name, l.designation, l.bio, l.image, l.linkedin, l.twitter, now);
    }
  }
}

export function resetOpeningsToDefaults() {
  db.exec('DELETE FROM openings');
  const stmt = db.prepare('INSERT INTO openings (id, title, department, duration, compensation, course_fee, mode, skills, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const o of defaultOpenings) {
    stmt.run(o.id, o.title, o.department, o.duration, o.compensation, o.course_fee, o.mode, JSON.stringify(o.skills), o.deadline);
  }
}

export function resetProjectsToDefaults() {
  db.exec('DELETE FROM projects');
  const stmt = db.prepare('INSERT INTO projects (id, title, description, category, tags, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const now = new Date().toISOString();
  for (const p of defaultProjects) {
    stmt.run(p.id, p.title, p.description, p.category, JSON.stringify(p.tags), p.image, now);
  }
}

export function resetLeadershipToDefaults() {
  db.exec('DELETE FROM leadership');
  const stmt = db.prepare('INSERT INTO leadership (id, name, designation, bio, image, linkedin, twitter, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const now = new Date().toISOString();
  for (const l of defaultLeadership) {
    stmt.run(l.id, l.name, l.designation, l.bio, l.image, l.linkedin, l.twitter, now);
  }
}

seedAdmin();
seedOpenings();
seedProjects();
seedLeadership();

export default db;
