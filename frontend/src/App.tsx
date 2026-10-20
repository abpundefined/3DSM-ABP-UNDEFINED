import { lazy, Suspense } from 'react';
import { Outlet, Route, Routes } from 'react-router';
import AppLayout from './components/layout/AppLayout';
import FeedbackPanel from './components/common/FeedbackPanel';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
          <Route path="login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
