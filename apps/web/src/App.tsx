import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Suspense, lazy } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageSkeleton } from './components/skeletons';
import { isTokenValid } from './api/client';

// Lazy-loaded pages (code splitting)
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage').then(m => ({ default: m.AnalyzePage })));
const ProductPage = lazy(() => import('./pages/ProductPage').then(m => ({ default: m.ProductPage })));
const DiscoveryPage = lazy(() => import('./pages/DiscoveryPage').then(m => ({ default: m.DiscoveryPage })));
const SourcingPage = lazy(() => import('./pages/SourcingPage').then(m => ({ default: m.SourcingPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const ProfitCalculatorPage = lazy(() => import('./pages/ProfitCalculatorPage').then(m => ({ default: m.ProfitCalculatorPage })));
const ShopsPage = lazy(() => import('./pages/ShopsPage').then(m => ({ default: m.ShopsPage })));
const ReferralPage = lazy(() => import('./pages/ReferralPage').then(m => ({ default: m.ReferralPage })));
const ApiKeysPage = lazy(() => import('./pages/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const DescriptionGeneratorPage = lazy(() => import('./pages/DescriptionGeneratorPage').then(m => ({ default: m.DescriptionGeneratorPage })));
const ElasticityPage = lazy(() => import('./pages/ElasticityPage').then(m => ({ default: m.ElasticityPage })));
const ConsultationPage = lazy(() => import('./pages/ConsultationPage').then(m => ({ default: m.ConsultationPage })));
const SignalsPage = lazy(() => import('./pages/SignalsPage').then(m => ({ default: m.SignalsPage })));
const EnterprisePage = lazy(() => import('./pages/EnterprisePage').then(m => ({ default: m.EnterprisePage })));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage').then(m => ({ default: m.FeedbackPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const ExtensionPage = lazy(() => import('./pages/ExtensionPage').then(m => ({ default: m.ExtensionPage })));
const SharedWatchlistPage = lazy(() => import('./pages/SharedWatchlistPage').then(m => ({ default: m.SharedWatchlistPage })));
const TelegramMiniAppPage = lazy(() => import('./pages/TelegramMiniAppPage').then(m => ({ default: m.TelegramMiniAppPage })));

function isAuthenticated() {
  return isTokenValid();
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop
        theme="dark" toastClassName="!bg-base-200 !text-base-content !rounded-xl !shadow-xl !border !border-base-300/50" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/watchlists/shared/:token" element={<LazyRoute><SharedWatchlistPage /></LazyRoute>} />
        <Route path="/tg-app" element={<LazyRoute><TelegramMiniAppPage /></LazyRoute>} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<LazyRoute><DashboardPage /></LazyRoute>} />
          <Route path="analyze" element={<LazyRoute><AnalyzePage /></LazyRoute>} />
          <Route path="products/:id" element={<LazyRoute><ProductPage /></LazyRoute>} />
          <Route path="discovery" element={<LazyRoute><DiscoveryPage /></LazyRoute>} />
          <Route path="sourcing" element={<LazyRoute><SourcingPage /></LazyRoute>} />
          <Route path="leaderboard" element={<LazyRoute><LeaderboardPage /></LazyRoute>} />
          <Route path="calculator" element={<LazyRoute><ProfitCalculatorPage /></LazyRoute>} />
          <Route path="shops" element={<LazyRoute><ShopsPage /></LazyRoute>} />
          <Route path="referral" element={<LazyRoute><ReferralPage /></LazyRoute>} />
          <Route path="api-keys" element={<LazyRoute><ApiKeysPage /></LazyRoute>} />
          <Route path="ai-description" element={<LazyRoute><DescriptionGeneratorPage /></LazyRoute>} />
          <Route path="elasticity" element={<LazyRoute><ElasticityPage /></LazyRoute>} />
          <Route path="consultation" element={<LazyRoute><ConsultationPage /></LazyRoute>} />
          <Route path="signals" element={<LazyRoute><SignalsPage /></LazyRoute>} />
          <Route path="enterprise" element={<LazyRoute><EnterprisePage /></LazyRoute>} />
          <Route path="feedback" element={<LazyRoute><FeedbackPage /></LazyRoute>} />
          <Route path="extension" element={<LazyRoute><ExtensionPage /></LazyRoute>} />
          <Route path="admin" element={<LazyRoute><AdminPage /></LazyRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
