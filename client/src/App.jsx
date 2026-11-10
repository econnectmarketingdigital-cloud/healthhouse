import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GestorDashboard from './pages/GestorDashboard';
import Kanban from './pages/Kanban';
import Leads from './pages/Leads';
import NovoLead from './pages/NovoLead';
import LeadDetail from './pages/LeadDetail';
import Empreendimentos from './pages/Empreendimentos';
import EmpreendimentoDetail from './pages/EmpreendimentoDetail';
import Configuracoes from './pages/Configuracoes';
import Perfil from './pages/Perfil';
import Equipe from './pages/Equipe';
import Rodizio from './pages/Rodizio';
import CorretorPerfil from './pages/CorretorPerfil';

import Ranking from './pages/Ranking';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const GestorRoute = ({ children }) => {
  const { isGestor, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!isGestor) return <Navigate to="/" />;
  return children;
};

function App() {
  const { isGestor } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={isGestor ? <GestorDashboard /> : <Dashboard />} />
        <Route path="kanban" element={<Kanban />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/novo" element={<NovoLead />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="empreendimentos" element={<Empreendimentos />} />
        <Route path="empreendimentos/:id" element={<EmpreendimentoDetail />} />
        <Route path="configuracoes" element={<GestorRoute><Configuracoes /></GestorRoute>} />
        <Route path="equipe" element={<GestorRoute><Equipe /></GestorRoute>} />
        <Route path="equipe/:id" element={<GestorRoute><CorretorPerfil /></GestorRoute>} />
        <Route path="rodizio" element={<GestorRoute><Rodizio /></GestorRoute>} />
      </Route>
    </Routes>
  );
}

export default App;

