import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
