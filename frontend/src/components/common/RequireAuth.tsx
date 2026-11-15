import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import useAuth from '../../hooks/useAuth';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, sessionMessage } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname + location.search,
          message: sessionMessage ?? 'Entre para acessar a administração.',
        }}
      />
    );
  }

  return children;
}
