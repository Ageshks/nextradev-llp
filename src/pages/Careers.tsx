import { useState } from 'react';
import SectionHeading from '../components/ui/SectionHeading';
import useSEO from '../hooks/useSEO';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { jobs } from '../data/careers';
const API_URL = import.meta.env.VITE_CAREERS_API_URL as string | undefined;

export default function Careers() {
  useSEO({ title: 'Careers | Nextradev Technologies LLP', description: 'Join Nextradev Technologies LLP. Explore open positions and apply to build your career in technology.', path: '/careers', keywords: ['careers', 'software jobs', 'technology jobs'] });
  const [form, setForm] = useState({ name:'', email:'', phone:'', position:'', message:'' });
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.position) e.position = 'Select a position';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (!API_URL) { setStatus('error'); setMessage('Application endpoint not configured. Set VITE_CAREERS_API_URL.'); return; }
    setStatus('loading');
    try {
      const res = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Request failed');
      setStatus('success'); setMessage('Application submitted successfully.');
      setForm({ name:'', email:'', phone:'', position:'', message:'' });
    } catch { setStatus('error'); setMessage('Submission failed. Please try again.'); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <SectionHeading eyebrow="Careers" title="Join Our Team" subtitle="Build your career with a team that values innovation and growth." />
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <Card><h3 className="text-white font-semibold mb-2">Company Culture</h3><p className="text-muted">Collaborative, innovative, and growth-focused environment.</p></Card>
        <Card><h3 className="text-white font-semibold mb-2">Internship Opportunities</h3><p className="text-muted">Hands-on experience for students and early professionals.</p></Card>
      </div>
      <SectionHeading title="Open Positions" />
      <p className="text-muted text-center mb-6 text-sm">Sample vacancies for demonstration; managed via structured data source.</p>
      <div className="grid gap-4 mb-12">
        {jobs.map(j => (
          <Card key={j.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-white font-semibold">{j.title}</h4>
                <p className="text-sm text-muted">{j.type} • {j.location}</p>
                <p className="text-sm text-muted mt-1">{j.description}</p>
              </div>
              <button onClick={() => setForm(f => ({...f, position: j.title}))} className="px-4 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/20">Apply</button>
            </div>
          </Card>
        ))}
      </div>

      <SectionHeading title="Application Form" />
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>
          <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
          <div>
            <select value={form.position} onChange={e=>setForm({...form,position:e.target.value})} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-400">
              <option value="">Select position</option>
              {jobs.map(j => <option key={j.id} value={j.title}>{j.title}</option>)}
            </select>
            {errors.position && <p className="text-red-400 text-xs mt-1">{errors.position}</p>}
          </div>
          <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Message / Cover letter" rows={4} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
          <Button type="submit" className={status==='loading'?'opacity-60 pointer-events-none':''}>Submit Application</Button>
          {status === 'success' && <p className="text-green-400 text-sm">{message}</p>}
          {status === 'error' && <p className="text-red-400 text-sm">{message}</p>}
          {status === 'success' && <p className="text-green-400 text-sm">Application submitted successfully.</p>}
        </form>
      </Card>
    </div>
  );
}