import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionHeading from '../components/ui/SectionHeading';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getApplications, updateStatus, deleteApplication, getOpenings, saveOpenings, resetOpenings } from '../utils/applicationStorage';
import { internships, internshipStatuses } from '../data/internships';
import usePageMeta from '../hooks/usePageMeta';

export default function AdminInternships() {
  usePageMeta('Admin | Internships');
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [openings, setOpenings] = useState<any[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem('nextradev_admin') !== 'true') {
      navigate('/admin/login'); return;
    }
    setAuthed(true);
    refresh();
  }, []);

  const refresh = () => {
    setApps(getApplications());
    const o = getOpenings();
    setOpenings(o || internships);
  };

  const logout = () => { sessionStorage.removeItem('nextradev_admin'); navigate('/'); };

  if (!authed) return null;

  const filtered = filter === 'All' ? apps : apps.filter(a => a.position === filter);
  const positions = Array.from(new Set(apps.map(a => a.position)));

  const exportCsv = () => {
    const rows = [['Name','Email','Phone','College','Education','Position','Mode','Skills','Submitted','Status']];
    filtered.forEach(a => rows.push([a.fullName,a.email,a.phone,a.college,a.education,a.position,a.mode,a.skills,a.submittedAt,a.status]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'applications.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const removeOpening = (id: string) => {
    const next = openings.filter(o => o.id !== id);
    setOpenings(next); saveOpenings(next);
  };

  const addOpening = () => {
    const title = prompt('Internship title?');
    if (!title) return;
    const next = [...openings, { id: crypto.randomUUID(), title, department: 'General', duration: '3-6 months', compensation: 'To be confirmed', mode: 'Remote / Hybrid', skills: [], deadline: 'Rolling' }];
    setOpenings(next); saveOpenings(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <SectionHeading title="Internship Applications (Admin)" />
        <div className="flex gap-2">
          <Button onClick={exportCsv}>Export CSV</Button>
          <Button variant="ghost" onClick={logout}>Logout</Button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter('All')} className={`px-3 py-1 rounded-full text-sm ${filter==='All'?'bg-blue-600 text-white':'bg-white/10 text-muted'}`}>All</button>
        {positions.map(p => (
          <button key={p} onClick={() => setFilter(p)} className={`px-3 py-1 rounded-full text-sm ${filter===p?'bg-blue-600 text-white':'bg-white/10 text-muted'}`}>{p}</button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-muted border-b border-white/10">
            <tr>
              <th className="py-2">Name</th><th>Email</th><th>Position</th><th>Submitted</th><th>Status</th><th>Resume</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-white/5">
                <td className="py-2 text-white">{a.fullName}</td>
                <td className="text-muted">{a.email}</td>
                <td className="text-muted">{a.position}</td>
                <td className="text-muted">{new Date(a.submittedAt).toLocaleDateString()}</td>
                <td>
                  <select value={a.status} onChange={e => { updateStatus(a.id, e.target.value); refresh(); }} className="bg-white/5 border border-white/10 text-white rounded px-2 py-1">
                    {internshipStatuses.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <a href={a.resumeDataUrl} download={a.resumeName} className="text-cyan-400 hover:underline">Download</a>
                </td>
                <td>
                  <button onClick={() => { deleteApplication(a.id); refresh(); }} className="text-red-400 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-muted mt-4">No applications.</p>}
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">Manage Openings</h3>
          <div className="flex gap-2">
            <Button onClick={addOpening}>Add Opening</Button>
            <Button variant="ghost" onClick={() => { resetOpenings(); refresh(); }}>Reset to Defaults</Button>
          </div>
        </div>
        <div className="grid gap-3">
          {openings.map(o => (
            <Card key={o.id} className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{o.title}</p>
                <p className="text-muted text-sm">{o.department} • {o.duration} • {o.compensation} • {o.mode} • Deadline: {o.deadline}</p>
              </div>
              <button onClick={() => removeOpening(o.id)} className="text-red-400 hover:underline text-sm">Remove</button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
