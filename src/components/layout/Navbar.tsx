import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { navLinks } from '../../data/navigation';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 shadow-lg shadow-slate-900/5 backdrop-blur-xl px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Nextradev" className="h-9 w-auto logo-highlight" />
          </Link>
          <nav className="hidden md:flex items-center gap-1 relative">
            {navLinks.map((l) => (
              <NavLink key={l.path} to={l.path} className="relative px-4 py-2 text-sm font-bold !text-blue-700 hover:!text-blue-800 transition-colors">
                {({ isActive }) => (
                  <>
                    <span className="!text-blue-700">{l.label}</span>
                    {isActive && (
                      <motion.span layoutId="nav-indicator" className="absolute inset-0 -z-10 rounded-full bg-blue-50" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/contact" className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 !text-white text-sm font-bold">Start Project</Link>
          </div>
          <button className="md:hidden text-white" onClick={() => setOpen(!open)} aria-label="menu">
            {open ? <X className="text-slate-800" /> : <Menu className="text-slate-800" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} className="md:hidden mx-4 mt-2 rounded-2xl border border-slate-200 bg-white/95 shadow-lg shadow-slate-900/5 backdrop-blur-xl p-4 space-y-1">
            {navLinks.map((l) => (
              <Link key={l.path} to={l.path} onClick={() => setOpen(false)} className={`block px-4 py-3 rounded-lg font-bold !text-blue-700 hover:!text-blue-800 ${location.pathname===l.path ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>{l.label}</Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
