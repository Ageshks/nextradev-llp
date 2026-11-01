import { useState } from 'react';
import { Mail, MessageCircle, MapPin, Building2 } from 'lucide-react';
import SectionHeading from '../components/ui/SectionHeading';
import usePageMeta from '../hooks/usePageMeta';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const API_URL = import.meta.env.VITE_CONTACT_API_URL as string | undefined;

export default function Contact() {
  usePageMeta('Contact Us | Nextradev Technologies LLP');
  const [form, setForm] = useState({ name:'', email:'', phone:'', company:'', service:'', description:'' });
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.description.trim()) e.description = 'Project description required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (!API_URL) { setStatus('error'); setMessage('Contact endpoint is not configured. Set VITE_CONTACT_API_URL.'); return; }
    setStatus('loading');
    try {
      const res = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Request failed');
      setStatus('success'); setMessage('Thank you! We will get back to you shortly.');
      setForm({ name:'', email:'', phone:'', company:'', service:'', description:'' });
    } catch { setStatus('error'); setMessage('Submission failed. Please try again or email us directly.'); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <SectionHeading eyebrow="Contact" title="Get In Touch" subtitle="Let's discuss your next project." />
      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name *" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email *" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone number" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
            <input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Company name" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
            <select value={form.service} onChange={e=>setForm({...form,service:e.target.value})} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-400">
              <option value="">Service required</option>
              <option>Web Development</option>
              <option>Mobile App Development</option>
              <option>Custom Software Development</option>
              <option>UI/UX Design</option>
              <option>Digital Marketing</option>
              <option>Cloud & IT Solutions</option>
            </select>
            <div>
              <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Project description *" rows={5} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
              {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>
            <Button type="submit" className={status==='loading'?'opacity-60 pointer-events-none':''}>Send Message</Button>
            {status === 'success' && <p className="text-green-400 text-sm">{message}</p>}
            {status === 'error' && <p className="text-red-400 text-sm">{message}</p>}
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="text-white font-semibold mb-3">Company Information</h3>
            <ul className="space-y-2 text-muted text-sm">
              <li className="flex items-center gap-2"><Building2 size={16} className="text-cyan-400"/> Nextradev Technologies LLP</li>
              <li>Website: https://nextradev.com</li>
            </ul>
          </Card>
          <div className="flex gap-3">
            <a href="https://wa.me/0000000000" target="_blank" rel="noreferrer" className="flex-1"><Button className="w-full"><MessageCircle size={18}/> WhatsApp</Button></a>
            <a href="mailto:hello@nextradev.com" className="flex-1"><Button variant="ghost" className="w-full"><Mail size={18}/> Email</Button></a>
          </div>
          <Card>
            <h3 className="text-white font-semibold mb-3">Location</h3>
            <div className="aspect-video rounded-lg bg-white/5 grid place-items-center text-muted text-sm">
              <MapPin size={24} className="text-cyan-400" /> Google Maps (configure address)
            </div>
          </Card>
          <div className="flex gap-3 text-muted text-sm">
            <a href="#" className="hover:text-white">LinkedIn</a>
            <a href="#" className="hover:text-white">Twitter</a>
            <a href="#" className="hover:text-white">Instagram</a>
          </div>
        </div>
      </div>
    </div>
  );
}
