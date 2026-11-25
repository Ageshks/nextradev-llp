import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { AlertTriangle, Check, Clock3, MapPin, Users } from 'lucide-react';
import { db } from '../../lib/firebase';

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
  const [radius, setRadius] = useState('300');
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
        setRadius(String(settings.radiusMeters ?? 300));
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
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 text-slate-700">
      <header>
        <p className="text-sm font-semibold text-blue-600">PEOPLE CRM</p>
        <h1 className="text-3xl font-bold text-slate-900">Employee operations</h1>
        <p className="mt-1">Staff directory, daily attendance, leave, work calendar, and workplace settings.</p>
      </header>

      {dataError && <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><span>{dataError}</span></div>}
      {message && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Staff accounts', employees.length, Users],
          ['Checked in today', checkedInCount, Clock3],
          ['Pending leave', leaves.length, Check],
          ['Checkout approvals', requests.length, MapPin],
        ].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between text-slate-500"><p className="text-sm">{label}</p><Icon size={17}/></div><p className="mt-1 text-2xl font-bold text-slate-900">{dataLoading ? '—' : value}</p></div>)}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={saveWorkplace} className="space-y-3 rounded-2xl border bg-white p-5">
          <h2 className="font-bold text-slate-900">Workplace location</h2>
          <p className="text-sm">Set the company coordinates and the check-in/out radius.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Latitude<input required type="number" min="-90" max="90" step="any" value={latitude} onChange={event => setLatitude(event.target.value)} className={`${inputClass} mt-1`}/></label>
            <label className="text-sm">Longitude<input required type="number" min="-180" max="180" step="any" value={longitude} onChange={event => setLongitude(event.target.value)} className={`${inputClass} mt-1`}/></label>
          </div>
          <label className="block text-sm">Allowed radius (meters)<input required type="number" min="50" max="10000" value={radius} onChange={event => setRadius(event.target.value)} className={`${inputClass} mt-1`}/></label>
          <button className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white">Save workplace</button>
        </form>

        <form onSubmit={publishCalendarEvent} className="space-y-3 rounded-2xl border bg-white p-5">
          <h2 className="font-bold text-slate-900">Publish calendar entry</h2>
          <input required maxLength={120} className={inputClass} placeholder="Holiday, workday, or event" value={eventTitle} onChange={event => setEventTitle(event.target.value)}/>
          <input required type="date" className={inputClass} value={eventDate} onChange={event => setEventDate(event.target.value)}/>
          <select className={inputClass} value={eventType} onChange={event => setEventType(event.target.value)}><option value="working-day">Working day</option><option value="holiday">Holiday</option><option value="event">Company event</option></select>
          <button className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white">Publish to calendar</button>
          <p className="text-xs">Entries appear in employees’ yearly calendar.</p>
        </form>
      </div>

      <form onSubmit={saveEmployee} className="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-4">
        <div className="md:col-span-4"><h2 className="font-bold text-slate-900">Employee directory</h2><p className="mt-1 text-xs text-slate-500">Create the employee’s Firebase Authentication account first, then save its UID here.</p></div>
        <input required className={inputClass} aria-label="Firebase user ID" placeholder="Firebase user ID" value={employeeId} onChange={event => setEmployeeId(event.target.value)}/>
        <input required maxLength={120} className={inputClass} aria-label="Employee name" placeholder="Employee name" value={employeeName} onChange={event => setEmployeeName(event.target.value)}/>
        <input required type="email" className={inputClass} aria-label="Work email" placeholder="Work email" value={employeeEmail} onChange={event => setEmployeeEmail(event.target.value)}/>
        <button className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Save employee</button>
        <div className="flex flex-wrap gap-2 md:col-span-4">{employees.map(employee => <span key={employee.id} className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm">{employee.name || 'Unnamed'} · {employee.email || employee.id}</span>)}</div>
      </form>

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-bold text-slate-900">Staff attendance</h2><p className="mt-1 text-sm">Recent check-ins and check-outs · up to 500 records</p></div><label className="text-sm">Filter date<input type="date" value={attendanceDate} onChange={event => setAttendanceDate(event.target.value)} className={`${inputClass} mt-1`}/></label></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="py-2">Staff member</th><th>Date</th><th>Check in</th><th>Check out</th><th>Status</th><th>Check-in location</th></tr></thead><tbody>{visibleAttendance.map(record => { const employee = employeeFor(record.employeeId); return <tr key={record.id} className="border-b border-slate-100"><td className="py-3 font-medium text-slate-800">{employee?.name || employee?.email || record.employeeId || 'Unknown'}</td><td>{record.date || '—'}</td><td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '—'}</td><td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : record.checkIn ? 'On shift' : '—'}</td><td className="capitalize">{String(record.status || 'present').replace('-', ' ')}</td><td>{record.checkInLocation ? `${Number(record.checkInLocation.latitude).toFixed(4)}, ${Number(record.checkInLocation.longitude).toFixed(4)}` : '—'}</td></tr>; })}</tbody></table></div>
        {dataLoading && <p className="mt-3 text-sm text-slate-500">Loading attendance…</p>}
        {!dataLoading && !dataError && !visibleAttendance.length && <p className="mt-3 text-sm text-slate-500">No attendance records for this date.</p>}
      </section>

      <section className="rounded-2xl border bg-white p-5"><h2 className="mb-3 font-bold text-slate-900">Pending checkout approvals</h2>{requests.map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3"><div><strong>{request.employeeName || employeeFor(request.employeeId)?.name || request.employeeId}</strong><p className="text-sm">{request.distanceMeters}m from workplace · {request.createdAt ? new Date(request.createdAt).toLocaleString() : ''}</p></div><button disabled={working === request.id} onClick={() => approveCheckout(request)} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{working === request.id ? 'Approving…' : 'Approve checkout'}</button></div>)}{!requests.length && !dataLoading && <p className="text-sm text-slate-500">No pending requests.</p>}</section>

      <section className="rounded-2xl border bg-white p-5"><h2 className="mb-3 font-bold text-slate-900">Pending leave requests</h2>{leaves.map(leave => <div key={leave.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3"><div><strong>{leave.employeeName || employeeFor(leave.employeeId)?.name || leave.employeeId} · {leave.type} leave</strong><p className="text-sm">{leave.date} · {leave.reason}</p></div><div className="flex gap-2"><button disabled={working === leave.id} onClick={() => resolveLeave(leave, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Approve</button><button disabled={working === leave.id} onClick={() => resolveLeave(leave, 'rejected')} className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-60">Decline</button></div></div>)}{!leaves.length && !dataLoading && <p className="text-sm text-slate-500">No pending leave requests.</p>}</section>
    </main>
  );
}
