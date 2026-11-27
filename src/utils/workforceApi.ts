import { auth } from '../lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/+$/, '').replace(/\/api$/, '');
export type WorkforceRow = { id: string; [key: string]: any };
export const getEmployeeProfile = () => request<WorkforceRow>('/me');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in with your company Firebase account to continue.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE}/api/workforce${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'The workforce service could not complete this request.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
export const listEmployees = () => request<WorkforceRow[]>('/employees');
export const saveEmployee = (employee: Record<string, unknown>) => request<WorkforceRow>('/employees', json('POST', employee));
export const deactivateEmployee = (uid: string) => request<void>(`/employees/${encodeURIComponent(uid)}`, json('DELETE'));
export const getWorkplace = () => request<any>('/workplace');
export const saveWorkplace = (workplace: Record<string, unknown>) => request('/workplace', json('PUT', workplace));
export const listAttendance = (date?: string, employeeId?: string) => {
  const params = new URLSearchParams(); if (date) params.set('date', date); if (employeeId) params.set('employeeId', employeeId);
  return request<WorkforceRow[]>(`/attendance${params.size ? `?${params}` : ''}`);
};
export const checkIn = (date: string, location: { latitude: number; longitude: number }, accuracyMeters: number) => request('/attendance/check-in', json('POST', { date, location, accuracyMeters }));
export const checkOut = (date: string, location: { latitude: number; longitude: number }, accuracyMeters: number, reason: string) => request<any>('/attendance/check-out', json('POST', { date, location, accuracyMeters, reason }));
export const reviewCheckout = (id: string, status: 'approved' | 'rejected', remarks = '') => request(`/checkout-requests/${encodeURIComponent(id)}/review`, json('POST', { status, remarks }));
export const submitAttendanceRegularisation = (requestData: Record<string, unknown>) => request('/regularisation', json('POST', requestData));
export const listCheckoutRequests = () => request<WorkforceRow[]>('/checkout-requests');
export const approveCheckout = (id: string) => request(`/checkout-requests/${encodeURIComponent(id)}/approve`, json('POST'));
export const listTasks = () => request<WorkforceRow[]>('/tasks');
export const assignTask = (task: Record<string, unknown>) => request('/tasks', json('POST', task));
export const updateTask = (id: string, status: string, report?: string) => request(`/tasks/${encodeURIComponent(id)}`, json('PATCH', { status, report }));
export const listTaskComments = (id: string) => request<WorkforceRow[]>(`/tasks/${encodeURIComponent(id)}/comments`);
export const addTaskComment = (id: string, body: string) => request<WorkforceRow>(`/tasks/${encodeURIComponent(id)}/comments`, json('POST', { body }));
export const listLeaves = () => request<WorkforceRow[]>('/leaves');
export const createLeave = (leave: Record<string, unknown>) => request('/leaves', json('POST', leave));
export const reviewLeave = (id: string, status: 'approved' | 'rejected') => request(`/leaves/${encodeURIComponent(id)}/review`, json('PATCH', { status }));
export const listCalendar = (year: number) => request<WorkforceRow[]>(`/calendar?year=${year}`);
export const publishCalendarEvent = (event: Record<string, unknown>) => request('/calendar', json('POST', event));

export async function migrateLegacyWorkforceOnce(): Promise<void> {
  const status = await request<{ imported: boolean }>('/migration/status');
  if (status.imported) return;
  const [employees, attendance, tasks, leaves, calendar, logoutRequests, workplace] = await Promise.all([
    getDocs(collection(db, 'employees')), getDocs(collection(db, 'attendance')),
    getDocs(collection(db, 'tasks')), getDocs(collection(db, 'leaves')),
    getDocs(collection(db, 'calendar')), getDocs(collection(db, 'logoutRequests')),
    getDoc(doc(db, 'settings', 'workplace')),
  ]);
  const records = (snapshot: typeof employees) => snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  await request('/migration/import', json('POST', {
    employees: records(employees), attendance: records(attendance), tasks: records(tasks),
    leaves: records(leaves), calendar: records(calendar), logoutRequests: records(logoutRequests),
    workplace: workplace.exists() ? workplace.data() : null,
  }));
}

export function subscribeWorkforce(onChange: () => void): () => void {
  const controller = new AbortController();
  let stopped = false;
  const connect = async () => {
    while (!stopped) {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const response = await fetch(`${API_BASE}/api/workforce/events`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, signal: controller.signal });
        if (!response.ok || !response.body) throw new Error('Realtime connection unavailable');
        const reader = response.body.getReader(), decoder = new TextDecoder();
        let buffer = '';
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n'); buffer = events.pop() || '';
          for (const event of events) if (event.startsWith('data: ') && !event.includes('connected')) onChange();
        }
      } catch (error) {
        if (stopped || (error instanceof DOMException && error.name === 'AbortError')) return;
      }
      if (!stopped) await new Promise(resolve => setTimeout(resolve, 1500));
    }
  };
  void connect();
  return () => { stopped = true; controller.abort(); };
}
