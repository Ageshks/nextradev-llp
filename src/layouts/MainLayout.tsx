import { NavLink, Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { BriefcaseBusiness, ClipboardList, LayoutDashboard, Users } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { AuthProvider } from '../context/AuthContext';
import '../pages/admin/AdminWorkspace.css';

export default function MainLayout() {
  const { pathname } = useLocation();
  const isAdminWorkspace = pathname === '/admin';
  const isAdminPage = pathname.startsWith('/admin');
  const showAdminNav = isAdminPage && !isAdminWorkspace && pathname !== '/admin/login';
  return (
    <AuthProvider>
      <div className={`min-h-screen ${isAdminPage ? 'bg-[#f6f8fb] text-[#152239]' : 'bg-bg text-muted'}`}>
        {!isAdminPage && <Navbar />}
        <div className={showAdminNav ? 'min-h-screen lg:flex' : ''}>
          {showAdminNav && <aside className="border-b border-slate-800 bg-slate-950 px-4 py-4 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
            <NavLink to="/admin" className="mb-6 flex items-center gap-3 px-2 py-2 text-lg font-bold tracking-wide"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600">N</span><span>NEXTRADEV<small className="block text-xs font-normal text-slate-400">Company workspace</small></span></NavLink>
            <nav aria-label="Admin menu" className="grid gap-1">
              {[
                ['/admin', 'Dashboard', LayoutDashboard],
                ['/admin/employees', 'Employees & attendance', Users],
                ['/admin/tasks', 'Task management', ClipboardList],
                ['/admin/internships', 'Website content', BriefcaseBusiness],
              ].map(([href, label, Icon]) => <NavLink key={String(href)} to={String(href)} end={href === '/admin'} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon size={18}/>{String(label)}</NavLink>)}
            </nav>
          </aside>}
          <main className={`${isAdminWorkspace ? '' : isAdminPage ? 'w-full lg:ml-64' : 'pt-24'}`}>
            <Outlet />
          </main>
        </div>
        {!isAdminPage && <Footer />}
      </div>
    </AuthProvider>
  )
}
