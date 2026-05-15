import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Subscriptions } from './pages/Subscriptions';
import { Reminders } from './pages/Reminders';
import { CreditCards } from './pages/CreditCards';
import { BankCredits } from './pages/BankCredits';
import { AuthService } from './services/authService';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = AuthService.getCurrentUser();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="credit-cards" element={<CreditCards />} />
          <Route path="bank-credits" element={<BankCredits />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
