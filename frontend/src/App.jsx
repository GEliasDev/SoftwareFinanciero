import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

import { AuthService } from './services/authService';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { NotFound } from './pages/NotFound';
import { Toaster } from 'sonner';
import { ConfirmHost } from './components/ui/ConfirmHost';

// Todo lo que vive detrás del login se carga bajo demanda: antes las ~40
// páginas (incluyendo recharts y xlsx de varias de ellas) se
// empaquetaban en un solo chunk de 1.4 MB que se descargaba incluso para
// entrar al login. `lazyNamed` adapta el export nombrado (`export const X`)
// de cada página al `default` que exige React.lazy, sin tocar los archivos.
const lazyNamed = (loader, name) => lazy(() => loader().then(m => ({ default: m[name] })));

const Dashboard = lazyNamed(() => import('./pages/Dashboard'), 'Dashboard');

// Suscripciones
const Subscriptions = lazyNamed(() => import('./pages/Subscriptions'), 'Subscriptions');
const SubscriptionNew = lazyNamed(() => import('./pages/SubscriptionNew'), 'SubscriptionNew');
const SubscriptionEdit = lazyNamed(() => import('./pages/SubscriptionEdit'), 'SubscriptionEdit');
const SubscriptionDetail = lazyNamed(() => import('./pages/SubscriptionDetail'), 'SubscriptionDetail');

// Tarjetas de crédito
const CreditCards = lazyNamed(() => import('./pages/CreditCards'), 'CreditCards');
const CreditCardNew = lazyNamed(() => import('./pages/CreditCardNew'), 'CreditCardNew');
const CreditCardLayout = lazyNamed(() => import('./pages/credit-card/CreditCardLayout'), 'CreditCardLayout');
const CardOverview = lazyNamed(() => import('./pages/credit-card/CardOverview'), 'CardOverview');
const CardStatementPage = lazyNamed(() => import('./pages/credit-card/CardStatementPage'), 'CardStatementPage');
const CardPurchases = lazyNamed(() => import('./pages/credit-card/CardPurchases'), 'CardPurchases');
const CardPending = lazyNamed(() => import('./pages/credit-card/CardPending'), 'CardPending');
const CreditCardEdit = lazyNamed(() => import('./pages/CreditCardEdit'), 'CreditCardEdit');
const CreditCardPurchaseDetail = lazyNamed(() => import('./pages/CreditCardPurchaseDetail'), 'CreditCardPurchaseDetail');
const CreditCardPurchaseForm = lazyNamed(() => import('./pages/CreditCardPurchaseForm'), 'CreditCardPurchaseForm');
const CreditCardAdvanceNew = lazyNamed(() => import('./pages/CreditCardAdvanceNew'), 'CreditCardAdvanceNew');
const CreditCardImport = lazyNamed(() => import('./pages/CreditCardImport'), 'CreditCardImport');

// Créditos bancarios
const BankCredits = lazyNamed(() => import('./pages/BankCredits'), 'BankCredits');
const BankCreditNew = lazyNamed(() => import('./pages/BankCreditNew'), 'BankCreditNew');
const BankCreditLayout = lazyNamed(() => import('./pages/bank-credit/BankCreditLayout'), 'BankCreditLayout');
const BankCreditOverview = lazyNamed(() => import('./pages/bank-credit/BankCreditOverview'), 'BankCreditOverview');
const BankCreditSchedule = lazyNamed(() => import('./pages/bank-credit/BankCreditSchedule'), 'BankCreditSchedule');
const BankCreditAnalysis = lazyNamed(() => import('./pages/bank-credit/BankCreditAnalysis'), 'BankCreditAnalysis');
const BankCreditEdit = lazyNamed(() => import('./pages/BankCreditEdit'), 'BankCreditEdit');

// Ingresos
const Income = lazyNamed(() => import('./pages/Income'), 'Income');
const IncomeForm = lazyNamed(() => import('./pages/IncomeForm'), 'IncomeForm');

// Herramientas
const Reports = lazyNamed(() => import('./pages/Reports'), 'Reports');
const Profile = lazyNamed(() => import('./pages/Profile'), 'Profile');
const More = lazyNamed(() => import('./pages/More'), 'More');
const Onboarding = lazyNamed(() => import('./pages/Onboarding'), 'Onboarding');
const PrivacyPolicy = lazyNamed(() => import('./pages/PrivacyPolicy'), 'PrivacyPolicy');

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = AuthService.getCurrentUser();
  if (!token || !user) return <Navigate to="/login" replace />;
  return children;
};

// Fallback simple mientras carga el chunk de la ruta — mismo patrón visual
// (.skeleton) que ya usan las páginas para sus propios estados de carga.
const RouteFallback = () => (
  <div style={{ padding: 24 }}>
    <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: 16, borderRadius: 'var(--radius-md)' }} />
    <div className="skeleton" style={{ height: 120, marginBottom: 12, borderRadius: 'var(--radius-md)' }} />
    <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-md)' }} />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

        {/* Protegidas — bajo MainLayout */}
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />

          {/* Suscripciones */}
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="subscriptions/new" element={<SubscriptionNew />} />
          <Route path="subscriptions/:id/edit" element={<SubscriptionEdit />} />
          <Route path="subscriptions/:id" element={<SubscriptionDetail />} />

          {/* Tarjetas de crédito */}
          <Route path="credit-cards" element={<CreditCards />} />
          <Route path="credit-cards/new" element={<CreditCardNew />} />
          <Route path="credit-cards/:id" element={<CreditCardLayout />}>
            <Route index element={<CardOverview />} />
            <Route path="statement" element={<CardStatementPage />} />
            <Route path="purchases" element={<CardPurchases />} />
            <Route path="pending" element={<CardPending />} />
          </Route>
          <Route path="credit-cards/:id/edit" element={<CreditCardEdit />} />
          <Route path="credit-cards/:id/purchases/new" element={<CreditCardPurchaseForm />} />
          <Route path="credit-cards/:id/purchases/import" element={<CreditCardImport />} />
          <Route path="credit-cards/:id/advances/new" element={<CreditCardAdvanceNew />} />
          <Route path="credit-cards/:id/purchases/:purchaseId" element={<CreditCardPurchaseDetail />} />
          <Route path="credit-cards/:id/purchases/:purchaseId/edit" element={<CreditCardPurchaseForm />} />

          {/* Créditos bancarios */}
          <Route path="bank-credits" element={<BankCredits />} />
          <Route path="bank-credits/new" element={<BankCreditNew />} />
          <Route path="bank-credits/:id" element={<BankCreditLayout />}>
            <Route index element={<BankCreditOverview />} />
            <Route path="schedule" element={<BankCreditSchedule />} />
            <Route path="analysis" element={<BankCreditAnalysis />} />
          </Route>
          <Route path="bank-credits/:id/edit" element={<BankCreditEdit />} />

          {/* Ingresos */}
          <Route path="income" element={<Income />} />
          <Route path="income/new" element={<IncomeForm />} />
          <Route path="income/:id/edit" element={<IncomeForm />} />

          {/* Herramientas */}
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="more" element={<More />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    <Toaster position="top-center" toastOptions={{ className: 'debti-toast' }} />
    <ConfirmHost />
    </ErrorBoundary>
  );
}

export default App;
