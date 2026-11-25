import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import MainLayout from './layouts/MainLayout';

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
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminInternships = lazy(() => import('./pages/AdminInternships'));
const AdminTasks = lazy(() => import('./pages/admin/AdminTasks'));
const AdminEmployees = lazy(() => import('./pages/admin/AdminEmployees'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Fallback() { return <div className="min-h-[60vh] grid place-items-center text-muted">Loading…</div>; }

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
            <Route path="/employee" element={<Suspense fallback={<Fallback/>}><EmployeeDashboard /></Suspense>} />
            <Route path="/login" element={<Suspense fallback={<Fallback/>}><EmployeeLogin /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<Fallback/>}><NotFound /></Suspense>} />
            <Route path="/admin/login" element={<Suspense fallback={<Fallback/>}><AdminLogin /></Suspense>} />
            <Route path="/admin/internships" element={<Suspense fallback={<Fallback/>}><AdminInternships /></Suspense>} />
            <Route path="/admin/tasks" element={<Suspense fallback={<Fallback/>}><AdminTasks /></Suspense>} />
            <Route path="/admin/employees" element={<Suspense fallback={<Fallback/>}><AdminEmployees /></Suspense>} />
          </Route>
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
