import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { adminLogin, adminLogout } from '../utils/api';

export default function EmployeeLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (identifier.includes('@')) {
        adminLogout();
        const credential = await signInWithEmailAndPassword(auth, identifier.trim(), password);
        const employeeSnapshot = await getDoc(doc(db, 'employees', credential.user.uid));
        if (!employeeSnapshot.exists()) {
          await signOut(auth);
          throw new Error('This account does not have an employee profile. Contact your administrator.');
        }
        const role = String(employeeSnapshot.data().role || 'employee').toLowerCase();
        if (role === 'admin') navigate('/admin/employees', { replace: true });
        else navigate('/employee', { replace: true });
      } else {
        await signOut(auth).catch(() => undefined);
        const account = await adminLogin(identifier.trim(), password);
        const role = account.role.toLowerCase();
        if (role === 'admin' || role === 'hr') navigate('/admin/employees', { replace: true });
        else navigate('/admin/tasks', { replace: true });
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed. Check your credentials and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-blue-600">NEXTRADEV WORKSPACE</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">Employees use their work email. Admins use their admin username.</p>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Work email or admin username
          <input required autoComplete="username" value={identifier} onChange={event => setIdentifier(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-blue-500" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-blue-500" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="block text-center text-sm text-blue-600">Back to Nextradev</Link>
      </form>
    </section>
  );
}
