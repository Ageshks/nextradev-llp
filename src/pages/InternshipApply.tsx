import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import SectionHeading from '../components/ui/SectionHeading';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { internships } from '../data/internships';
import { addApplication, isDuplicate } from '../utils/applicationStorage';
import usePageMeta from '../hooks/usePageMeta';

const MAX_FILE = 5 * 1024 * 1024;

export default function InternshipApply() {
  usePageMeta('Apply for Internship | Nextradev Technologies LLP');
  const [params] = useSearchParams();
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', college:'', education:'', position: params.get('position') || '', mode:'', skills:'', motivation:'' });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name required';
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.phone.trim()) e.phone = 'Phone required';
    if (!form.college.trim()) e.college = 'College required';
    if (!form.education.trim()) e.education = 'Education required';
    if (!form.position) e.position = 'Select position';
    if (!form.mode) e.mode = 'Select mode';
    if (!form.motivation.trim()) e.motivation = 'Required';
    if (!file) e.resume = 'Resume required';
    else if (file.type !== 'application/pdf') e.resume = 'PDF only';
    else if (file.size > MAX_FILE) e.resume = 'Max 5MB';
    if (!consent) e.consent = 'You must consent';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(f);
  });

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (await isDuplicate(form.email, form.position)) { setStatus('error'); setMessage('You have already applied for this position.'); return; }
    setStatus('loading');
    try {
      const dataUrl = await toDataUrl(file!);
      await addApplication({
        id: crypto.randomUUID(),
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        college: form.college,
        education: form.education,
        position: form.position,
        mode: form.mode,
        skills: form.skills,
        motivation: form.motivation,
        resumeName: file!.name,
        resumeDataUrl: dataUrl,
        submittedAt: new Date().toISOString(),
        status: 'Pending',
      });
      setStatus('success'); setMessage('Application submitted successfully.');
    } catch { setStatus('error'); setMessage('Submission failed. Please try again.'); }
  };

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <SectionHeading title="Application Submitted" subtitle={message} />
        <p className="text-muted mb-6">We will review your application and get back to you.</p>
        <Link to="/internships"><Button>Back to Internships</Button></Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <SectionHeading eyebrow="Apply" title="Internship Application" subtitle="Fill out the form below to apply." />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Full Name *" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
              {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email Address *" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone Number *" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <input value={form.college} onChange={e=>setForm({...form,college:e.target.value})} placeholder="College / University *" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
              {errors.college && <p className="text-red-400 text-xs mt-1">{errors.college}</p>}
            </div>
          </div>
          <div>
            <input value={form.education} onChange={e=>setForm({...form,education:e.target.value})} placeholder="Current Education *" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
            {errors.education && <p className="text-red-400 text-xs mt-1">{errors.education}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <select value={form.position} onChange={e=>setForm({...form,position:e.target.value})} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-400">
                <option value="">Internship Position *</option>
                {internships.map(i => <option key={i.id} value={i.title}>{i.title}</option>)}
              </select>
              {errors.position && <p className="text-red-400 text-xs mt-1">{errors.position}</p>}
            </div>
            <div>
              <select value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-400">
                <option value="">Preferred Mode *</option>
                <option>Remote</option>
                <option>On-site</option>
                <option>Hybrid</option>
              </select>
              {errors.mode && <p className="text-red-400 text-xs mt-1">{errors.mode}</p>}
            </div>
          </div>
          <input value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})} placeholder="Skills (comma separated)" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
          <div>
            <textarea value={form.motivation} onChange={e=>setForm({...form,motivation:e.target.value})} placeholder="Why do you want to join Nextradev? *" rows={4} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
            {errors.motivation && <p className="text-red-400 text-xs mt-1">{errors.motivation}</p>}
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Upload Resume (PDF) *</label>
            <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0] || null)} className="w-full text-sm text-muted" />
            {errors.resume && <p className="text-red-400 text-xs mt-1">{errors.resume}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />
            I consent to the processing of my personal data for recruitment purposes.
          </label>
          {errors.consent && <p className="text-red-400 text-xs">{errors.consent}</p>}
          <Button type="submit" className={status==='loading'?'opacity-60 pointer-events-none':''}>Submit Application</Button>
          {status === 'error' && <p className="text-red-400 text-sm">{message}</p>}
        </form>
      </Card>
    </div>
  );
}
