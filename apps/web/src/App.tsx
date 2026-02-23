import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { AdminPage } from './pages/AdminPage';
import { ProductPage } from './pages/ProductPage';
import { SourcingPage } from './pages/SourcingPage';
import { ProfitCalculatorPage } from './pages/ProfitCalculatorPage';
import { PublicLeaderboardPage } from './pages/PublicLeaderboardPage';
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
        <Route path="/leaderboard" element={<PublicLeaderboardPage />} />
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
          <Route path="tools/profit-calculator" element={<ProfitCalculatorPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
