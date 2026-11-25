import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import MainLayout from './layouts/MainLayout';
import { useAuthListener } from './context/AuthContext';
import { db } from './lib/firebase';
import { verifyAdminToken } from './utils/api';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const Projects = lazy(() => import('./pages/Projects'));
const Careers = lazy(() => import('./pages/Careers'));
const Contact = lazy(() => import('./pages/Contact'));
const Internships = lazy(() => import('./pages/Internships'));
const InternshipApply = lazy(() => import('./pages/InternshipApply'));
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const EmployeeLogin = lazy(() => import('./pages/EmployeeLogin'));
const AdminInternships = lazy(() => import('./pages/AdminInternships'));
const AdminTasks = lazy(() => import('./pages/admin/AdminTasks'));
const AdminEmployees = lazy(() => import('./pages/admin/AdminEmployees'));
const AdminWorkspace = lazy(() => import('./pages/admin/AdminWorkspace'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Fallback() { return <div className="min-h-[60vh] grid place-items-center text-muted">Loading…</div>; }

function EmployeeGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthListener();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  useEffect(() => {
    if (loading) return;
    if (!user) { setAuthorized(false); return; }
    getDoc(doc(db, 'employees', user.uid)).then(snapshot => {
      const role = String(snapshot.data()?.role || 'employee').toLowerCase();
      setAuthorized(snapshot.exists() && ['employee','developer','project_manager','sales_executive','finance_manager'].includes(role));
    }).catch(() => setAuthorized(false));
  }, [loading, user]);
  if (loading || authorized === null) return <Fallback />;
  return authorized ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthListener();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    if (loading) return;
    verifyAdminToken().then(async validToken => {
      if (!active) return;
      if (validToken) { setAuthorized(true); return; }
      if (!user) { setAuthorized(false); return; }
      try {
        const profile = await getDoc(doc(db, 'employees', user.uid));
        const role = String(profile.data()?.role || '').toLowerCase();
        setAuthorized(profile.exists() && ['admin','super_admin','super admin','hr','hr_manager'].includes(role));
      } catch {
        setAuthorized(false);
      }
    }).catch(() => { if (active) setAuthorized(false); });
    return () => { active = false; };
  }, [loading, user]);
  if (loading || authorized === null) return <Fallback />;
  return authorized ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Suspense fallback={<Fallback/>}><Home /></Suspense>} />
            <Route path="/about" element={<Suspense fallback={<Fallback/>}><About /></Suspense>} />
            <Route path="/services" element={<Suspense fallback={<Fallback/>}><Services /></Suspense>} />
            <Route path="/projects" element={<Suspense fallback={<Fallback/>}><Projects /></Suspense>} />
            <Route path="/careers" element={<Suspense fallback={<Fallback/>}><Careers /></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={<Fallback/>}><Contact /></Suspense>} />
            <Route path="/internships" element={<Suspense fallback={<Fallback/>}><Internships /></Suspense>} />
            <Route path="/internships/apply" element={<Suspense fallback={<Fallback/>}><InternshipApply /></Suspense>} />
            <Route path="/employee" element={<EmployeeGuard><Suspense fallback={<Fallback/>}><EmployeeDashboard /></Suspense></EmployeeGuard>} />
            <Route path="/login" element={<Suspense fallback={<Fallback/>}><EmployeeLogin /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<Fallback/>}><NotFound /></Suspense>} />
            <Route path="/admin/login" element={<Suspense fallback={<Fallback/>}><EmployeeLogin /></Suspense>} />
            <Route path="/admin" element={<AdminGuard><Suspense fallback={<Fallback/>}><AdminWorkspace /></Suspense></AdminGuard>} />
            <Route path="/admin/internships" element={<AdminGuard><Suspense fallback={<Fallback/>}><AdminInternships /></Suspense></AdminGuard>} />
            <Route path="/admin/tasks" element={<AdminGuard><Suspense fallback={<Fallback/>}><AdminTasks /></Suspense></AdminGuard>} />
            <Route path="/admin/employees" element={<AdminGuard><Suspense fallback={<Fallback/>}><AdminEmployees /></Suspense></AdminGuard>} />
          </Route>
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
