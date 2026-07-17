import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastProvider } from './components/toast';
import { Spinner } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import Catalog from './pages/Catalog';
import Home from './pages/Home';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import PublicQuote from './pages/PublicQuote';
import QuoteDetail from './pages/QuoteDetail';
import QuoteWizard from './pages/QuoteWizard';
import Settings from './pages/Settings';

function Protected() {
  const { session, company, companyError, loading, retryCompany } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!session) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (companyError) {
    return (
      <div className="center-page">
        <div className="card">
          <h1>Não foi possível carregar sua oficina</h1>
          <p className="muted">Confira sua conexão e tente novamente.</p>
          <button className="btn" onClick={() => void retryCompany()}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
  if (!company) return <Onboarding />;
  return <Layout />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/o/:token" element={<PublicQuote />} />
            <Route element={<Protected />}>
              <Route path="/" element={<Home />} />
              <Route path="/novo" element={<QuoteWizard />} />
              <Route path="/orcamento/:id" element={<QuoteDetail />} />
              <Route path="/orcamento/:id/editar" element={<QuoteWizard />} />
              <Route path="/catalogo" element={<Catalog />} />
              <Route path="/config" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
