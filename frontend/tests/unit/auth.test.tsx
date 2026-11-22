import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import useAuth from '../../src/hooks/useAuth';
import AuthProvider from '../../src/providers/AuthProvider';

const key = '@greener-abp:token';
const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthProvider e useAuth', () => {
  it('restaura uma sessão armazenada e remove o token no logout', () => {
    window.localStorage.setItem(key, 'token-existente');
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('token-existente');
    act(() => result.current.logout());
    expect(result.current.isAuthenticated).toBe(false);
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it('persiste login e informa expiração da sessão', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);

    act(() => result.current.login('novo-token'));
    expect(result.current.token).toBe('novo-token');
    expect(window.localStorage.getItem(key)).toBe('novo-token');

    act(() => result.current.expireSession('Sessão expirada'));
    expect(result.current.token).toBeNull();
    expect(result.current.sessionMessage).toBe('Sessão expirada');
    expect(window.localStorage.getItem(key)).toBeNull();

    act(() => result.current.login('outro-token'));
    expect(result.current.sessionMessage).toBeNull();
  });

  it('mantém a sessão em memória se o armazenamento estiver indisponível', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Armazenamento indisponível');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Armazenamento indisponível');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Armazenamento indisponível');
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => result.current.login('temporario'));
    expect(result.current.isAuthenticated).toBe(true);
    act(() => result.current.logout());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('rejeita uso fora do provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth deve ser usado dentro de AuthProvider.',
    );
  });
});
