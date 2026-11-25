import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { AuthProvider } from '../context/AuthContext';

export default function MainLayout() {
  const { pathname } = useLocation();
  const isAdminWorkspace = pathname === '/admin';
  return (
    <AuthProvider>
      <div className="min-h-screen bg-bg text-muted">
        {!isAdminWorkspace && <Navbar />}
        <main className={isAdminWorkspace ? '' : 'pt-24'}>
          <Outlet />
        </main>
        {!isAdminWorkspace && <Footer />}
      </div>
    </AuthProvider>
  )
}
