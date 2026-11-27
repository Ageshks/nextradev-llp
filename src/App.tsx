import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import MainLayout from './layouts/MainLayout';
import AdminShell from './layouts/AdminShell';
import { useAuthListener } from './context/AuthContext';
import { getEmployeeProfile, migrateLegacyWorkforceOnce } from './utils/workforceApi';

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
const EnterpriseDashboard = lazy(() => import('./pages/admin/EnterpriseDashboard'));
const EnterpriseModules = lazy(() => import('./pages/admin/EnterpriseModules'));
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
    getEmployeeProfile().then(profile => {
      const role = String(profile.role || '').toLowerCase();
      setAuthorized(profile.active !== false && ['employee','developer','project_manager','sales_executive','finance_manager'].includes(role));
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
    if (!user) { setAuthorized(false); return; }
    getEmployeeProfile().then(async profile => {
      if (!active) return;
      const role = String(profile.role || '').toLowerCase();
      const isWorkspaceUser = profile.active !== false && ['admin','super_admin','super admin','hr','hr_manager','project_manager','team_leader','sales_executive','finance_manager'].includes(role);
      if (['admin','super_admin','super admin','hr','hr_manager'].includes(role)) await migrateLegacyWorkforceOnce().catch(() => undefined);
      if (active) setAuthorized(isWorkspaceUser);
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
            <Route path="/admin" element={<AdminGuard><AdminShell /></AdminGuard>}>
              <Route index element={<Suspense fallback={<Fallback/>}><EnterpriseDashboard /></Suspense>} />
              <Route path="employees" element={<Suspense fallback={<Fallback/>}><AdminEmployees /></Suspense>} />
              <Route path="tasks" element={<Suspense fallback={<Fallback/>}><AdminTasks /></Suspense>} />
              <Route path="internships" element={<Suspense fallback={<Fallback/>}><AdminInternships /></Suspense>} />
              <Route path="projects" element={<Suspense fallback={<Fallback/>}><EnterpriseModules module="projects" /></Suspense>} />
              <Route path="clients" element={<Suspense fallback={<Fallback/>}><EnterpriseModules module="clients" /></Suspense>} />
              <Route path="leads" element={<Suspense fallback={<Fallback/>}><EnterpriseModules module="leads" /></Suspense>} />
              <Route path="finance" element={<Suspense fallback={<Fallback/>}><EnterpriseModules module="finance" /></Suspense>} />
              <Route path="departments" element={<Suspense fallback={<Fallback/>}><EnterpriseModules module="departments" /></Suspense>} />
              <Route path="activity" element={<Suspense fallback={<Fallback/>}><EnterpriseModules module="audit" /></Suspense>} />
              <Route path="payroll" element={<Suspense fallback={<Fallback/>}><EnterpriseModules module="payroll" /></Suspense>} />
              <Route path="proposals" element={<Suspense fallback={<Fallback/>}><EnterpriseModules module="proposals" /></Suspense>} />
              <Route path="contracts" element={<Suspense fallback={<Fallback/>}><EnterpriseModules module="contracts" /></Suspense>} />
              <Route path="support" element={<Suspense fallback={<Fallback/>}><EnterpriseModules module="support" /></Suspense>} />
            </Route>
          </Route>
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
