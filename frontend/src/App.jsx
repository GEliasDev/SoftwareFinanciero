import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';

// Suscripciones
import { Subscriptions } from './pages/Subscriptions';
import { SubscriptionNew } from './pages/SubscriptionNew';
import { SubscriptionDetail } from './pages/SubscriptionDetail';

// Tarjetas de crédito
import { CreditCards } from './pages/CreditCards';
import { CreditCardNew } from './pages/CreditCardNew';
import { CreditCardDetail } from './pages/CreditCardDetail';
import { CreditCardEdit } from './pages/CreditCardEdit';
import { CreditCardPurchaseDetail } from './pages/CreditCardPurchaseDetail';
import { CreditCardPurchaseNew } from './pages/CreditCardPurchaseNew';

// Créditos bancarios
import { BankCredits } from './pages/BankCredits';
import { BankCreditNew } from './pages/BankCreditNew';
import { BankCreditDetail } from './pages/BankCreditDetail';

// Recordatorios
import { Reminders } from './pages/Reminders';
import { ReminderNew } from './pages/ReminderNew';

// Herramientas
import { Reports } from './pages/Reports';
import { Profile } from './pages/Profile';

import { AuthService } from './services/authService';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = AuthService.getCurrentUser();
  if (!token || !user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protegidas — bajo MainLayout */}
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />

          {/* Suscripciones */}
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="subscriptions/new" element={<SubscriptionNew />} />
          <Route path="subscriptions/:id" element={<SubscriptionDetail />} />

          {/* Tarjetas de crédito */}
          <Route path="credit-cards" element={<CreditCards />} />
          <Route path="credit-cards/new" element={<CreditCardNew />} />
          <Route path="credit-cards/:id" element={<CreditCardDetail />} />
          <Route path="credit-cards/:id/edit" element={<CreditCardEdit />} />
          <Route path="credit-cards/:id/purchases/new" element={<CreditCardPurchaseNew />} />
          <Route path="credit-cards/:id/purchases/:purchaseId" element={<CreditCardPurchaseDetail />} />

          {/* Créditos bancarios */}
          <Route path="bank-credits" element={<BankCredits />} />
          <Route path="bank-credits/new" element={<BankCreditNew />} />
          <Route path="bank-credits/:id" element={<BankCreditDetail />} />

          {/* Recordatorios */}
          <Route path="reminders" element={<Reminders />} />
          <Route path="reminders/new" element={<ReminderNew />} />

          {/* Herramientas */}
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
