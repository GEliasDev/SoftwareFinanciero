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
import { CreditCardLayout } from './pages/credit-card/CreditCardLayout';
import { CardOverview } from './pages/credit-card/CardOverview';
import { CardStatementPage } from './pages/credit-card/CardStatementPage';
import { CardPurchases } from './pages/credit-card/CardPurchases';
import { CardAnalysis } from './pages/credit-card/CardAnalysis';
import { CreditCardEdit } from './pages/CreditCardEdit';
import { CreditCardPurchaseDetail } from './pages/CreditCardPurchaseDetail';
import { CreditCardPurchaseNew } from './pages/CreditCardPurchaseNew';
import { CreditCardAdvanceNew } from './pages/CreditCardAdvanceNew';

// Créditos bancarios
import { BankCredits } from './pages/BankCredits';
import { BankCreditNew } from './pages/BankCreditNew';
import { BankCreditLayout } from './pages/bank-credit/BankCreditLayout';
import { BankCreditOverview } from './pages/bank-credit/BankCreditOverview';
import { BankCreditSchedule } from './pages/bank-credit/BankCreditSchedule';
import { BankCreditEdit } from './pages/BankCreditEdit';

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
          <Route path="credit-cards/:id" element={<CreditCardLayout />}>
            <Route index element={<CardOverview />} />
            <Route path="statement" element={<CardStatementPage />} />
            <Route path="purchases" element={<CardPurchases />} />
            <Route path="analysis" element={<CardAnalysis />} />
          </Route>
          <Route path="credit-cards/:id/edit" element={<CreditCardEdit />} />
          <Route path="credit-cards/:id/purchases/new" element={<CreditCardPurchaseNew />} />
          <Route path="credit-cards/:id/advances/new" element={<CreditCardAdvanceNew />} />
          <Route path="credit-cards/:id/purchases/:purchaseId" element={<CreditCardPurchaseDetail />} />

          {/* Créditos bancarios */}
          <Route path="bank-credits" element={<BankCredits />} />
          <Route path="bank-credits/new" element={<BankCreditNew />} />
          <Route path="bank-credits/:id" element={<BankCreditLayout />}>
            <Route index element={<BankCreditOverview />} />
            <Route path="schedule" element={<BankCreditSchedule />} />
          </Route>
          <Route path="bank-credits/:id/edit" element={<BankCreditEdit />} />

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
