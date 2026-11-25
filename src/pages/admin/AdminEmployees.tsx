import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { AlertTriangle, Check, Clock3, MapPin, Users } from 'lucide-react';
import { db } from '../../lib/firebase';
import './AdminWorkspace.css';

type Item = { id: string; [key: string]: any };
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800';
const localDate = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Item[]>([]);
  const [attendance, setAttendance] = useState<Item[]>([]);
  const [requests, setRequests] = useState<Item[]>([]);
  const [leaves, setLeaves] = useState<Item[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(localDate());
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(localDate());
  const [eventType, setEventType] = useState('working-day');

  useEffect(() => {
    let active = true;
    const onReadError = () => {
      if (!active) return;
      setDataLoading(false);
      setDataError('Employee data could not be read. Check Firestore access rules for this admin account.');
    };
    const unsubs = [
      onSnapshot(collection(db, 'employees'), snapshot => {
        setEmployees(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
        setDataLoading(false);
      }, onReadError),
      onSnapshot(collection(db, 'attendance'), snapshot => {
        setAttendance(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Item))
          .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
          .slice(0, 500));
        setDataLoading(false);
      }, onReadError),
      onSnapshot(collection(db, 'logoutRequests'), snapshot => {
        setRequests(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Item)).filter(item => item.status === 'pending'));
        setDataLoading(false);
      }, onReadError),
      onSnapshot(collection(db, 'leaves'), snapshot => {
        setLeaves(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Item)).filter(item => item.status === 'pending'));
        setDataLoading(false);
      }, onReadError),
      onSnapshot(doc(db, 'settings', 'workplace'), snapshot => {
        if (!snapshot.exists()) return;
        const settings = snapshot.data();
        setLatitude(String(settings.latitude ?? ''));
        setLongitude(String(settings.longitude ?? ''));
        setRadius(settings.radiusMeters == null ? '' : String(settings.radiusMeters));
        setDataLoading(false);
      }, onReadError),
    ];
    return () => { active = false; unsubs.forEach(unsubscribe => unsubscribe()); };
  }, []);

  const todayAttendance = useMemo(() => attendance.filter(record => record.date === localDate()), [attendance]);
  const visibleAttendance = useMemo(() => attendanceDate ? attendance.filter(record => record.date === attendanceDate) : attendance, [attendance, attendanceDate]);

  const saveWorkplace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'workplace'), {
        latitude: Number(latitude), longitude: Number(longitude), radiusMeters: Number(radius),
      });
      setMessage('Workplace location saved.');
    } catch {
      setMessage('Could not save workplace settings. Check Firestore write access.');
    }
  };

  const publishCalendarEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    try {
      await addDoc(collection(db, 'calendar'), {
        title: eventTitle.trim(), date: eventDate, type: eventType,
        year: Number(eventDate.slice(0, 4)), isWorkingDay: eventType !== 'holiday',
        createdAt: new Date().toISOString(),
      });
      setEventTitle('');
      setMessage('Calendar entry published.');
    } catch {
      setMessage('Could not publish the calendar entry. Check Firestore write access.');
    }
  };

  const saveEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    const uid = employeeId.trim();
    try {
      await setDoc(doc(db, 'employees', uid), {
        uid, name: employeeName.trim(), email: employeeEmail.trim(), role: 'employee',
        createdAt: new Date().toISOString(),
      }, { merge: true });
      setEmployeeId(''); setEmployeeName(''); setEmployeeEmail('');
      setMessage('Employee profile saved.');
    } catch {
      setMessage('Could not save employee. Check the Firebase UID and Firestore write access.');
    }
  };

  const approveCheckout = async (request: Item) => {
    setWorking(request.id); setMessage('');
    try {
      const attendanceRef = doc(db, 'attendance', request.attendanceId);
      const checkoutTime = new Date().toISOString();
      let alreadyCheckedOut = false;
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(attendanceRef);
        if (!snapshot.exists()) throw new Error('Attendance record not found.');
        const record = snapshot.data();
        if (record.checkOut) { alreadyCheckedOut = true; return; }
        const hours = record.checkIn ? (Date.now() - new Date(record.checkIn).getTime()) / 3_600_000 : 0;
        transaction.update(attendanceRef, {
          checkOut: checkoutTime, checkOutLocation: request.location,
          status: hours < 4 ? 'half-day' : 'present', checkoutApprovedBy: 'admin',
        });
      });
      if (alreadyCheckedOut) {
        await setDoc(doc(db, 'logoutRequests', request.id), { status: 'resolved', resolvedAt: new Date().toISOString() }, { merge: true });
        setMessage('This shift was already checked out. The request was closed.');
        return;
      }
      await setDoc(doc(db, 'logoutRequests', request.id), { status: 'approved', resolvedAt: checkoutTime }, { merge: true });
      setMessage('Checkout approved and attendance updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not approve checkout. Check Firestore write access.');
    } finally {
      setWorking('');
    }
  };

  const resolveLeave = async (leave: Item, status: 'approved' | 'rejected') => {
    setWorking(leave.id); setMessage('');
    try {
      await setDoc(doc(db, 'leaves', leave.id), { status, reviewedAt: new Date().toISOString() }, { merge: true });
      setMessage(`Leave request ${status}.`);
    } catch {
      setMessage('Could not update leave request. Check Firestore write access.');
    } finally {
      setWorking('');
    }
  };

  const employeeFor = (uid: string) => employees.find(employee => employee.id === uid || employee.uid === uid);
  const checkedInCount = todayAttendance.filter(record => record.checkIn && !record.checkOut).length;

  return (
    <div className="workspace-content employee-operations">
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-mark"/> PEOPLE & OPERATIONS</div><h1>Employees & attendance</h1><p>Live staff records, daily attendance, leave requests, and workplace settings.</p></div></div>

      {dataError && <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><span>{dataError}</span></div>}
      {message && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}

      <div className="kpi-grid employee-kpi-grid">
        {[
          ['Staff accounts', employees.length, Users],
          ['Checked in today', checkedInCount, Clock3],
          ['Pending leave', leaves.length, Check],
          ['Checkout approvals', requests.length, MapPin],
        ].map(([label, value, Icon]: any) => <article key={label} className="kpi-card employee-kpi"><div className="kpi-top"><span>{label}</span><span className="kpi-icon icon-blue"><Icon size={17}/></span></div><p className="kpi-value">{dataLoading ? '—' : value}</p></article>)}
      </div>

      <div className="dashboard-grid employee-forms-grid">
        <form onSubmit={saveWorkplace} className="panel space-y-3">
          <div className="panel-heading"><div><h2>Workplace location</h2><p>Configure the check-in boundary for staff.</p></div><MapPin size={18}/></div>
          <p className="text-sm">Set the company coordinates and the check-in/out radius.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Latitude<input required type="number" min="-90" max="90" step="any" value={latitude} onChange={event => setLatitude(event.target.value)} className={`${inputClass} mt-1`}/></label>
            <label className="text-sm">Longitude<input required type="number" min="-180" max="180" step="any" value={longitude} onChange={event => setLongitude(event.target.value)} className={`${inputClass} mt-1`}/></label>
          </div>
          <label className="block text-sm">Allowed radius (meters)<input required type="number" min="50" max="10000" value={radius} onChange={event => setRadius(event.target.value)} className={`${inputClass} mt-1`}/></label>
          <button className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white">Save workplace</button>
        </form>

        <form onSubmit={publishCalendarEvent} className="panel space-y-3">
          <div className="panel-heading"><div><h2>Work calendar</h2><p>Publish an event to the employee calendar.</p></div></div>
          <input required maxLength={120} className={inputClass} placeholder="Holiday, workday, or event" value={eventTitle} onChange={event => setEventTitle(event.target.value)}/>
          <input required type="date" className={inputClass} value={eventDate} onChange={event => setEventDate(event.target.value)}/>
          <select className={inputClass} value={eventType} onChange={event => setEventType(event.target.value)}><option value="working-day">Working day</option><option value="holiday">Holiday</option><option value="event">Company event</option></select>
          <button className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white">Publish to calendar</button>
          <p className="text-xs">Entries appear in employees’ yearly calendar.</p>
        </form>
      </div>

      <form onSubmit={saveEmployee} className="panel grid gap-3 md:grid-cols-4">
        <div className="md:col-span-4 panel-heading"><div><h2>Employee directory</h2><p>Create the Firebase account first, then connect its UID to the live employee record.</p></div></div>
        <input required className={inputClass} aria-label="Firebase user ID" placeholder="Firebase user ID" value={employeeId} onChange={event => setEmployeeId(event.target.value)}/>
        <input required maxLength={120} className={inputClass} aria-label="Employee name" placeholder="Employee name" value={employeeName} onChange={event => setEmployeeName(event.target.value)}/>
        <input required type="email" className={inputClass} aria-label="Work email" placeholder="Work email" value={employeeEmail} onChange={event => setEmployeeEmail(event.target.value)}/>
        <button className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Save employee</button>
        <div className="flex flex-wrap gap-2 md:col-span-4">{employees.map(employee => <span key={employee.id} className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm">{employee.name || 'Unnamed'} · {employee.email || employee.id}</span>)}</div>
      </form>

      <section className="panel">
        <div className="panel-heading"><div><h2>Daily attendance</h2><p>Live check-in and check-out records.</p></div><label className="employee-filter">Date<input type="date" value={attendanceDate} onChange={event => setAttendanceDate(event.target.value)} className={inputClass}/></label></div>
        <div className="table-scroll"><table className="data-table employee-attendance-table"><thead><tr><th>Staff member</th><th>Date</th><th>Check in</th><th>Check out</th><th>Status</th><th>Check-in location</th></tr></thead><tbody>{visibleAttendance.map(record => { const employee = employeeFor(record.employeeId); return <tr key={record.id}><td><b>{employee?.name || employee?.email || record.employeeId || 'Unknown'}</b></td><td>{record.date || '—'}</td><td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '—'}</td><td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : record.checkIn ? 'On shift' : '—'}</td><td><span className="status-pill status-blue capitalize">{String(record.status || 'present').replace('-', ' ')}</span></td><td>{record.checkInLocation ? `${Number(record.checkInLocation.latitude).toFixed(4)}, ${Number(record.checkInLocation.longitude).toFixed(4)}` : '—'}</td></tr>; })}</tbody></table></div>
        {dataLoading && <p className="mt-3 text-sm text-slate-500">Loading attendance…</p>}
        {!dataLoading && !dataError && !visibleAttendance.length && <p className="mt-3 text-sm text-slate-500">No attendance records for this date.</p>}
      </section>

      <section className="panel"><div className="panel-heading"><div><h2>Checkout approvals</h2><p>Pending location exception requests.</p></div></div>{requests.map(request => <div key={request.id} className="employee-request-row"><div><strong>{request.employeeName || employeeFor(request.employeeId)?.name || request.employeeId}</strong><p>{request.distanceMeters}m from workplace · {request.createdAt ? new Date(request.createdAt).toLocaleString() : ''}</p></div><button disabled={working === request.id} className="primary-action" onClick={() => approveCheckout(request)}>{working === request.id ? 'Approving…' : 'Approve checkout'}</button></div>)}{!requests.length && !dataLoading && <p className="employee-empty">No pending checkout approvals.</p>}</section>

      <section className="panel"><div className="panel-heading"><div><h2>Leave requests</h2><p>Review requests submitted by employees.</p></div></div>{leaves.map(leave => <div key={leave.id} className="employee-request-row"><div><strong>{leave.employeeName || employeeFor(leave.employeeId)?.name || leave.employeeId} · {leave.type} leave</strong><p>{leave.date} · {leave.reason}</p></div><div className="employee-request-actions"><button disabled={working === leave.id} className="primary-action" onClick={() => resolveLeave(leave, 'approved')}>Approve</button><button disabled={working === leave.id} className="range-select" onClick={() => resolveLeave(leave, 'rejected')}>Decline</button></div></div>)}{!leaves.length && !dataLoading && <p className="employee-empty">No pending leave requests.</p>}</section>
    </div>
  );
}
