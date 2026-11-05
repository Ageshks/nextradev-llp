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

export interface InternshipOpening {
  id: string;
  title: string;
  department: string;
  duration: string;
  compensation: string;
  course_fee: string;
  mode: string;
  skills: string[];
  deadline: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  image: string;
}

export interface Leader {
  id: string;
  name: string;
  designation: string;
  bio: string;
  image: string;
  linkedin: string;
  twitter: string;
}

// Accept either an origin (https://api.example.com) or an API root
// (https://api.example.com/api); request paths below already include /api.
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/+$/, '').replace(/\/api$/, '');

export function resolveMediaUrl(url: string) {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  return `${API_BASE}${url}`;
}

async function request(path: string, init?: RequestInit) {
  const token = sessionStorage.getItem('nextradev_admin_token');
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const data = await res.json();
      msg = data?.message || data?.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

async function requestUpload(path: string, formData: FormData) {
  const token = sessionStorage.getItem('nextradev_admin_token');
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  // Do NOT set Content-Type; browser sets multipart boundary
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: formData, headers });
  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const data = await res.json();
      msg = data?.message || data?.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

async function requestUploadPut(path: string, formData: FormData) {
  const token = sessionStorage.getItem('nextradev_admin_token');
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { method: 'PUT', body: formData, headers });
  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const data = await res.json();
      msg = data?.message || data?.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export async function adminLogin(username: string, password: string) {
  const data: any = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  sessionStorage.setItem('nextradev_admin_token', data.token);
  return data.user as { username: string; role: string };
}

export function adminLogout() {
  sessionStorage.removeItem('nextradev_admin_token');
}

export function isAdminAuthed() {
  return !!sessionStorage.getItem('nextradev_admin_token');
}

export async function getApplications(position = 'All') {
  const q = position && position !== 'All' ? `?position=${encodeURIComponent(position)}` : '';
  return (await request(`/api/applications${q}`)) as InternshipApplication[];
}

export async function getApplication(id: string) {
  return (await request(`/api/applications/${encodeURIComponent(id)}`)) as InternshipApplication;
}

export async function submitApplication(app: Omit<InternshipApplication, 'submittedAt' | 'status'> & { submittedAt?: string; status?: string }) {
  return request('/api/applications', { method: 'POST', body: JSON.stringify(app) });
}

export async function isDuplicateApplication(email: string, position: string) {
  try {
    const apps = await getApplications(position);
    return apps.some(a => a.email.toLowerCase() === email.toLowerCase() && a.position === position);
  } catch {
    return false;
  }
}

export async function updateApplicationStatus(id: string, status: string) {
  await request(`/api/applications/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteApplication(id: string) {
  await request(`/api/applications/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getOpenings() {
  return (await request('/api/openings')) as InternshipOpening[];
}

export async function addOpening(opening: Partial<InternshipOpening> & { title: string }) {
  return request('/api/openings', { method: 'POST', body: JSON.stringify(opening) });
}

export async function updateOpening(id: string, opening: Partial<InternshipOpening>) {
  return request(`/api/openings/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(opening) });
}

export async function deleteOpening(id: string) {
  await request(`/api/openings/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function resetOpenings() {
  await request('/api/openings/reset', { method: 'POST' });
}

export async function verifyAdminToken() {
  try {
    await request('/api/admin/verify');
    return true;
  } catch {
    return false;
  }
}

// Projects API
export async function getProjects() {
  return (await request('/api/projects')) as Project[];
}

export async function addProject(project: FormData | (Partial<Project> & { title: string })) {
  return project instanceof FormData
    ? requestUpload('/api/projects', project)
    : request('/api/projects', { method: 'POST', body: JSON.stringify(project) });
}

export async function updateProject(id: string, project: FormData | Partial<Project>) {
  return project instanceof FormData
    ? requestUploadPut(`/api/projects/${encodeURIComponent(id)}`, project)
    : request(`/api/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(project) });
}

export async function deleteProject(id: string) {
  await request(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function resetProjects() {
  await request('/api/projects/reset', { method: 'POST' });
}

// Leadership API
export async function getLeadership() {
  return (await request('/api/leadership')) as Leader[];
}

export async function addLeader(formData: FormData) {
  return requestUpload('/api/leadership', formData);
}

export async function updateLeader(id: string, formData: FormData) {
  return requestUploadPut(`/api/leadership/${encodeURIComponent(id)}`, formData);
}

export async function deleteLeader(id: string) {
  await request(`/api/leadership/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function resetLeadership() {
  await request('/api/leadership/reset', { method: 'POST' });
}
