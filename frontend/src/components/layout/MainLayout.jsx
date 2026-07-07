import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
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
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="main-wrapper">
        <Navbar />
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
