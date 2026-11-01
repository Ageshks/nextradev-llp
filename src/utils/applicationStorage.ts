export interface InternshipApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  education: string;
  position: string;
  mode: string;
  skills: string;
  motivation: string;
  resumeName: string;
  resumeDataUrl: string;
  submittedAt: string;
  status: string;
}

const KEY = 'nextradev_internship_applications';

export function getApplications(): InternshipApplication[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveApplications(apps: InternshipApplication[]) {
  localStorage.setItem(KEY, JSON.stringify(apps));
}

export function addApplication(app: InternshipApplication) {
  const apps = getApplications();
  apps.unshift(app);
  saveApplications(apps);
}

export function isDuplicate(email: string, position: string) {
  return getApplications().some(a => a.email.toLowerCase() === email.toLowerCase() && a.position === position);
}

export function updateStatus(id: string, status: string) {
  const apps = getApplications().map(a => a.id === id ? { ...a, status } : a);
  saveApplications(apps);
}

export function deleteApplication(id: string) {
  saveApplications(getApplications().filter(a => a.id !== id));
}

// Internship openings management
const IKEY = 'nextradev_internship_openings';
export function getOpenings() {
  try {
    const raw = localStorage.getItem(IKEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
export function saveOpenings(list: any[]) {
  localStorage.setItem(IKEY, JSON.stringify(list));
}
export function resetOpenings() {
  localStorage.removeItem(IKEY);
}