import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from '../contexts/auth-context';

const TOKEN_STORAGE_KEY = '@greener-abp:token';

function readStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken);

  const login = useCallback((newToken: string) => {
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    } catch {
      // Sem armazenamento, a sessão vale apenas enquanto a página estiver aberta.
    }
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // O token em memória é descartado mesmo sem acesso ao armazenamento.
    }
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ token, isAuthenticated: token !== null, login, logout }),
    [token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}