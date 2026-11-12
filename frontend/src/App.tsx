import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router';
import AppLayout from './components/layout/AppLayout';
import FeedbackPanel from './components/common/FeedbackPanel';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Ranking = lazy(() => import('./pages/Ranking'));
const Comparacao = lazy(() => import('./pages/Comparacao'));
const Mapa = lazy(() => import('./pages/Mapa'));
const ServicoDetalhe = lazy(() => import('./pages/ServicoDetalhe'));
const Admin = lazy(() => import('./pages/Admin'));
const Metodologia = lazy(() => import('./pages/Metodologia'));

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          element={
            <Suspense
              fallback={
                <FeedbackPanel
                  kind="loading"
                  title="Abrindo a página"
                  description="Aguarde um momento enquanto preparamos seu conteúdo."
                />
              }
            >
              <Outlet />
            </Suspense>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="comparar" element={<Comparacao />} />
          <Route path="mapa" element={<Mapa />} />
          <Route path="servicos/:id" element={<ServicoDetalhe />} />
          <Route path="admin" element={<Admin />} />
          <Route path="metodologia" element={<Metodologia />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
