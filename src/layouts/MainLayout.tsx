import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { AuthProvider } from '../context/AuthContext';
import '../pages/admin/AdminWorkspace.css';

export default function MainLayout() {
  const { pathname } = useLocation();
  const isAdminPage = pathname.startsWith('/admin');
  return (
    <AuthProvider>
      <div className={`min-h-screen ${isAdminPage ? 'bg-[#f6f8fb] text-[#152239]' : 'bg-bg text-muted'}`}>
        {!isAdminPage && <Navbar />}
        <div>
          <main className={`${isAdminPage ? 'w-full' : 'pt-24'}`}>
            <Outlet />
          </main>
        </div>
        {!isAdminPage && <Footer />}
      </div>
    </AuthProvider>
  )
}
