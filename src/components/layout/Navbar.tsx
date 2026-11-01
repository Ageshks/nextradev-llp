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
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-[#080D1A]/70 backdrop-blur-xl px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 grid place-items-center font-bold text-white">N</span>
            <span className="font-display font-semibold text-white">Nextradev</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 relative">
            {navLinks.map((l) => (
              <NavLink key={l.path} to={l.path} className="relative px-4 py-2 text-sm text-muted hover:text-white transition-colors">
                {({ isActive }) => (
                  <>
                    <span className={isActive ? 'text-white' : ''}>{l.label}</span>
                    {isActive && (
                      <motion.span layoutId="nav-indicator" className="absolute inset-0 -z-10 rounded-full bg-white/10" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:block">
            <Link to="/contact" className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 text-white text-sm font-medium">Start Project</Link>
          </div>
          <button className="md:hidden text-white" onClick={() => setOpen(!open)} aria-label="menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} className="md:hidden mx-4 mt-2 rounded-2xl border border-white/10 bg-[#080D1A]/95 backdrop-blur-xl p-4">
            {navLinks.map((l) => (
              <Link key={l.path} to={l.path} onClick={() => setOpen(false)} className={`block px-4 py-3 rounded-lg ${location.pathname===l.path ? 'bg-white/10 text-white' : 'text-muted'}`}>{l.label}</Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}