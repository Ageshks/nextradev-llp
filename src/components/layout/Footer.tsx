import { Link } from 'react-router-dom';
import { Globe, Mail, MessageCircle, Link2, Share2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="Nextradev" className="h-8 w-auto logo-highlight" />
          </div>
          <p className="text-sm text-muted">Technology That Moves Businesses Forward.</p>
          <ul className="space-y-2 text-sm text-muted mt-4">
            <li><Link to="/admin/login" className="hover:text-cyan-400">Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            <li><Link to="/services" className="hover:text-white">Services</Link></li>
            <li><Link to="/projects" className="hover:text-white">Projects</Link></li>
            <li><Link to="/careers" className="hover:text-white">Careers</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><a href="mailto:hello@nextradev.com" className="hover:text-white">hello@nextradev.com</a></li>
            <li><a href="https://wa.me/0000000000" target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp</a></li>
            <li><Link to="/contact" className="hover:text-white">Contact form</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Follow</h4>
          <div className="flex gap-3 text-muted">
            <a href="#" aria-label="LinkedIn" className="hover:text-white"><Link2 size={18}/></a>
            <a href="#" aria-label="Twitter" className="hover:text-white"><Share2 size={18}/></a>
            <a href="#" aria-label="GitHub" className="hover:text-white"><Globe size={18}/></a>
            <a href="mailto:hello@nextradev.com" aria-label="Email" className="hover:text-white"><Mail size={18}/></a>
            <a href="https://wa.me/0000000000" aria-label="WhatsApp" className="hover:text-white"><MessageCircle size={18}/></a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} Nextradev Technologies LLP. All rights reserved.
      </div>
    </footer>
  );
}