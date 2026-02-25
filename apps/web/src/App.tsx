import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { AdminPage } from './pages/AdminPage';
import { ProductPage } from './pages/ProductPage';
import { SourcingPage } from './pages/SourcingPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfitCalculatorPage } from './pages/ProfitCalculatorPage';
import { ShopsPage } from './pages/ShopsPage';
import { ReferralPage } from './pages/ReferralPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
// v2.0 pages
import { DescriptionGeneratorPage } from './pages/DescriptionGeneratorPage';
import { ElasticityPage } from './pages/ElasticityPage';
import { ConsultationPage } from './pages/ConsultationPage';
// v3.0 pages
import { SignalsPage } from './pages/SignalsPage';
// v4.0 pages
import { EnterprisePage } from './pages/EnterprisePage';
// v5.0 pages
import { FeedbackPage } from './pages/FeedbackPage';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop
        theme="dark" toastClassName="!bg-base-200 !text-base-content !rounded-xl !shadow-xl !border !border-base-300/50" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path="analyze" element={<ErrorBoundary><AnalyzePage /></ErrorBoundary>} />
          <Route path="products/:id" element={<ErrorBoundary><ProductPage /></ErrorBoundary>} />
          <Route path="discovery" element={<ErrorBoundary><DiscoveryPage /></ErrorBoundary>} />
          <Route path="sourcing" element={<ErrorBoundary><SourcingPage /></ErrorBoundary>} />
          <Route path="leaderboard" element={<ErrorBoundary><LeaderboardPage /></ErrorBoundary>} />
          <Route path="calculator" element={<ErrorBoundary><ProfitCalculatorPage /></ErrorBoundary>} />
          <Route path="shops" element={<ErrorBoundary><ShopsPage /></ErrorBoundary>} />
          <Route path="referral" element={<ErrorBoundary><ReferralPage /></ErrorBoundary>} />
          <Route path="api-keys" element={<ErrorBoundary><ApiKeysPage /></ErrorBoundary>} />
          {/* v2.0 */}
          <Route path="ai-description" element={<ErrorBoundary><DescriptionGeneratorPage /></ErrorBoundary>} />
          <Route path="elasticity" element={<ErrorBoundary><ElasticityPage /></ErrorBoundary>} />
          <Route path="consultation" element={<ErrorBoundary><ConsultationPage /></ErrorBoundary>} />
          {/* v3.0 Signals */}
          <Route path="signals" element={<ErrorBoundary><SignalsPage /></ErrorBoundary>} />
          {/* v4.0 Enterprise */}
          <Route path="enterprise" element={<ErrorBoundary><EnterprisePage /></ErrorBoundary>} />
          {/* v5.0 Feedback */}
          <Route path="feedback" element={<ErrorBoundary><FeedbackPage /></ErrorBoundary>} />
          <Route path="admin" element={<ErrorBoundary><AdminPage /></ErrorBoundary>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
