import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionHeading from '../components/ui/SectionHeading';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getApplications, updateStatus, deleteApplication, getOpenings, addOpening, updateOpening, deleteOpening, resetOpenings, getLeadership, addLeader, updateLeader, deleteLeader, getProjects, addProject, updateProject, deleteProject } from '../utils/applicationStorage';
import { resolveMediaUrl } from '../utils/api';
import { internships, internshipStatuses } from '../data/internships';
import useSEO from '../hooks/useSEO';

export default function AdminInternships() {
  useSEO({ title: 'Admin | Internships', noindex: true });
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [openings, setOpenings] = useState<any[]>([]);
  const [tab, setTab] = useState<'apps' | 'openings' | 'projects' | 'leaders'>('apps');
  const [leaders, setLeaders] = useState<any[]>([]);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [editingOpening, setEditingOpening] = useState<any | null>(null);
  const [leaderForm, setLeaderForm] = useState<any | null>(null);
  const [projectForm, setProjectForm] = useState<any | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [projectImage, setProjectImage] = useState<File | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!sessionStorage.getItem('nextradev_admin_token')) {
      navigate('/admin/login'); return;
    }
    setAuthed(true);
    void refresh();
  }, []);

  const refresh = async () => {
    try {
      const [a, o, l, p] = await Promise.all([getApplications(), getOpenings(), getLeadership(), getProjects()]);
      setApps(Array.isArray(a) ? a : []);
      setOpenings(Array.isArray(o) ? o : internships);
      setLeaders(Array.isArray(l) ? l : []);
      setProjectList(Array.isArray(p) ? p : []);
    } catch {
      // ignore
    }
  };

  const logout = () => { sessionStorage.removeItem('nextradev_admin_token'); navigate('/'); };

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

  const blankOpening = () => ({ title: '', department: '', duration: '3-6 months', compensation: '', mode: 'Remote / Hybrid', skills: [], deadline: 'Rolling' });
  const saveOpeningForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const payload = { ...data, skills: String(data.skills || '').split(',').map(s => s.trim()).filter(Boolean) };
    try {
      if (editingOpening.id) await updateOpening(editingOpening.id, payload);
      else await addOpening(payload as any);
      setEditingOpening(null); await refresh(); setNotice('Opening saved.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save opening.'); }
  };
  const saveLeaderForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (photo) form.set('founderImage', photo);
    try {
      if (leaderForm.id) await updateLeader(leaderForm.id, form);
      else await addLeader(form);
      setLeaderForm(null); setPhoto(null); await refresh(); setNotice('Founder profile saved.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save founder.'); }
  };
  const saveProjectForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (projectImage) form.set('projectImage', projectImage);
    try {
      if (projectForm.id) await updateProject(projectForm.id, form);
      else await addProject(form);
      setProjectForm(null); setProjectImage(null); await refresh(); setNotice('Project saved.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save project.'); }
  };
  const inputClass = 'w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <SectionHeading title="Internship Applications (Admin)" />
        <div className="flex gap-2">
          <Button onClick={exportCsv}>Export CSV</Button>
          <Button variant="ghost" onClick={logout}>Logout</Button>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {([['apps','Applications'],['openings','Openings'],['projects','Projects'],['leaders','Founders']] as const).map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm ${tab===key?'bg-blue-600 text-white':'bg-white/10 text-muted'}`}>{label}</button>)}
      </div>
      {notice && <p role="status" className="mb-4 text-sm text-cyan-300">{notice}</p>}
      {tab === 'apps' && <><div className="mb-4 flex flex-wrap gap-2">
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
      </div></>}

      {tab === 'openings' && <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">Manage Openings</h3>
          <div className="flex gap-2">
            <Button onClick={() => setEditingOpening(blankOpening())}>Add Opening</Button>
            <Button variant="ghost" onClick={async () => { await resetOpenings(); await refresh(); }}>Reset to Defaults</Button>
          </div>
        </div>
        {editingOpening && <form onSubmit={saveOpeningForm} className="mb-5 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2">
          <h4 className="text-white font-semibold sm:col-span-2">{editingOpening.id ? 'Edit opening' : 'Add opening'}</h4>
          {(['title','department','duration','compensation','mode','deadline'] as const).map(key => <label key={key} className="text-sm text-muted capitalize">{key}<input required={key==='title'} name={key} defaultValue={editingOpening[key] || ''} className={inputClass} /></label>)}
          <label className="text-sm text-muted sm:col-span-2">Skills (comma separated)<input name="skills" defaultValue={(editingOpening.skills || []).join(', ')} className={inputClass} /></label>
          <div className="flex gap-2 sm:col-span-2"><Button type="submit">Save opening</Button><Button type="button" variant="ghost" onClick={() => setEditingOpening(null)}>Cancel</Button></div>
        </form>}
        <div className="grid gap-3">
          {openings.map(o => (
            <Card key={o.id} className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{o.title}</p>
                <p className="text-muted text-sm">{o.department} • {o.duration} • {o.compensation} • {o.mode} • Deadline: {o.deadline}</p>
              </div>
              <div className="flex gap-4"><button onClick={() => setEditingOpening(o)} className="text-cyan-400 hover:underline text-sm">Edit</button><button onClick={async () => { await deleteOpening(o.id); await refresh(); }} className="text-red-400 hover:underline text-sm">Remove</button></div>
            </Card>
          ))}
        </div>
      </div>}

      {tab === 'leaders' && <section>
        <div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-semibold text-white">Founder profiles</h3><p className="text-sm text-muted">Upload a photo and manage the details shown on the About and Home pages.</p></div><Button onClick={() => { setPhoto(null); setLeaderForm({ name:'', designation:'', bio:'', linkedin:'', twitter:'' }); }}>Add Founder</Button></div>
        {leaderForm && <form onSubmit={saveLeaderForm} className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2">
          <h4 className="text-white font-semibold sm:col-span-2">{leaderForm.id ? 'Edit founder' : 'Add founder'}</h4>
          <label className="text-sm text-muted">Full name<input required name="name" defaultValue={leaderForm.name} className={inputClass} /></label><label className="text-sm text-muted">Role / designation<input name="designation" defaultValue={leaderForm.designation} className={inputClass} /></label>
          <label className="text-sm text-muted sm:col-span-2">Biography<textarea name="bio" rows={3} defaultValue={leaderForm.bio} className={inputClass} /></label>
          <label className="text-sm text-muted">LinkedIn URL<input name="linkedin" type="url" defaultValue={leaderForm.linkedin} className={inputClass} /></label><label className="text-sm text-muted">Twitter / X URL<input name="twitter" type="url" defaultValue={leaderForm.twitter} className={inputClass} /></label>
          <label className="text-sm text-muted sm:col-span-2">Founder photo {leaderForm.id && '(leave empty to keep current photo)'}<input required={!leaderForm.id} type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-muted" /></label>
          <div className="flex gap-2 sm:col-span-2"><Button type="submit">Save profile</Button><Button type="button" variant="ghost" onClick={() => setLeaderForm(null)}>Cancel</Button></div>
        </form>}
        <div className="grid gap-3 sm:grid-cols-2">{leaders.map(l => <Card key={l.id} className="flex gap-4 items-center"><img src={l.image} alt="" className="h-20 w-20 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="font-medium text-white">{l.name}</p><p className="text-sm text-cyan-400">{l.designation}</p></div><button className="text-cyan-400 text-sm" onClick={() => { setPhoto(null); setLeaderForm(l); }}>Edit</button><button className="text-red-400 text-sm" onClick={async () => { await deleteLeader(l.id); await refresh(); }}>Remove</button></Card>)}</div>
      </section>}

      {tab === 'projects' && <section>
        <div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-semibold text-white">Manage projects</h3><p className="text-sm text-muted">Upload a project image and edit the details displayed in your portfolio.</p></div><Button onClick={() => { setProjectImage(null); setProjectForm({ title:'', description:'', category:'Web Development', tags:'' }); }}>Add Project</Button></div>
        {projectForm && <form onSubmit={saveProjectForm} className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2">
          <h4 className="text-white font-semibold sm:col-span-2">{projectForm.id ? 'Edit project' : 'Add project'}</h4>
          <label className="text-sm text-muted">Project name<input required name="title" defaultValue={projectForm.title} className={inputClass} /></label>
          <label className="text-sm text-muted">Category<select name="category" defaultValue={projectForm.category} className={inputClass}>{['Web Development','Mobile Applications','Business Software','Creative Projects'].map(c => <option key={c}>{c}</option>)}</select></label>
          <label className="text-sm text-muted sm:col-span-2">Description<textarea name="description" rows={3} defaultValue={projectForm.description} className={inputClass} /></label>
          <label className="text-sm text-muted sm:col-span-2">Technologies / tags (comma separated)<input name="tags" defaultValue={Array.isArray(projectForm.tags) ? projectForm.tags.join(', ') : projectForm.tags} className={inputClass} /></label>
          <label className="text-sm text-muted sm:col-span-2">Project image {projectForm.id && '(leave empty to keep current image)'}<input required={!projectForm.id} type="file" name="projectImage" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => setProjectImage(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-muted" /></label>
          <div className="flex gap-2 sm:col-span-2"><Button type="submit">Save project</Button><Button type="button" variant="ghost" onClick={() => { setProjectForm(null); setProjectImage(null); }}>Cancel</Button></div>
        </form>}
        <div className="grid gap-3 sm:grid-cols-2">{projectList.map(project => <Card key={project.id} className="flex items-center gap-4"><img src={resolveMediaUrl(project.image)} alt={project.title} className="h-20 w-24 rounded-lg bg-slate-900 object-cover" /><div className="min-w-0 flex-1"><p className="font-medium text-white">{project.title}</p><p className="text-sm text-muted">{project.category}</p></div><button className="text-cyan-400 text-sm" onClick={() => { setProjectImage(null); setProjectForm(project); }}>Edit</button><button className="text-red-400 text-sm" onClick={async () => { try { await deleteProject(project.id); await refresh(); setNotice('Project removed.'); } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not remove project.'); } }}>Remove</button></Card>)}</div>
        {projectList.length === 0 && <p className="mt-4 text-sm text-muted">No projects yet. Add a project to publish it on the portfolio.</p>}
      </section>}
    </div>
  );
}
