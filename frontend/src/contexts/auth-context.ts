import { createContext } from 'react';

export interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  sessionMessage: string | null;
  login: (token: string) => void;
  logout: () => void;
  expireSession: (message: string) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
