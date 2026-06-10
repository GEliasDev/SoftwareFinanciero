import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { AuthService } from '../../services/authService';

export const MainLayout = () => {
  const user  = AuthService.getCurrentUser();
  const token = localStorage.getItem('token');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="main-wrapper">
        <Navbar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
};
