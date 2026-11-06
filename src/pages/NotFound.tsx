import { Link } from 'react-router-dom';
import useSEO from '../hooks/useSEO';

export default function NotFound() {
  useSEO({ title: 'Page Not Found | Nextradev Technologies LLP', noindex: true });
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-5xl font-bold text-white">404</h1>
      <p className="text-muted mt-4">The page you are looking for could not be found.</p>
      <Link to="/" className="mt-8 inline-block"><button className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 text-white">Go Home</button></Link>
    </div>
  );
}