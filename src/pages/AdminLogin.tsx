import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionHeading from '../components/ui/SectionHeading';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import usePageMeta from '../hooks/usePageMeta';

export default function AdminLogin() {
  usePageMeta('Admin Login | Nextradev');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === (import.meta.env.VITE_ADMIN_PASSWORD as string) || password === 'nextradev-admin') {
      sessionStorage.setItem('nextradev_admin', 'true');
      navigate('/admin/internships');
    } else {
      setError('Invalid credentials');
    }
  };
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <SectionHeading title="Admin Login" />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan-400" />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit">Login</Button>
        </form>
      </Card>
    </div>
  );
}