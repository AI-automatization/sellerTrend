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
          <Route index element={<DashboardPage />} />
          <Route path="analyze" element={<AnalyzePage />} />
          <Route path="products/:id" element={<ProductPage />} />
          <Route path="discovery" element={<DiscoveryPage />} />
          <Route path="sourcing" element={<SourcingPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="calculator" element={<ProfitCalculatorPage />} />
          <Route path="shops" element={<ShopsPage />} />
          <Route path="referral" element={<ReferralPage />} />
          <Route path="api-keys" element={<ApiKeysPage />} />
          {/* v2.0 */}
          <Route path="ai-description" element={<DescriptionGeneratorPage />} />
          <Route path="elasticity" element={<ElasticityPage />} />
          <Route path="consultation" element={<ConsultationPage />} />
          {/* v3.0 Signals */}
          <Route path="signals" element={<SignalsPage />} />
          {/* v4.0 Enterprise */}
          <Route path="enterprise" element={<EnterprisePage />} />
          {/* v5.0 Feedback */}
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
