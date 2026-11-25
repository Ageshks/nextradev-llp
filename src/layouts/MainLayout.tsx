import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { AuthProvider } from '../context/AuthContext';

export default function MainLayout() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-bg text-muted">
        <Navbar />
        <main className="pt-24">
          <Outlet />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  )
}