import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import Brand from '../common/Brand';
import Icon from '../common/Icon';
import AppErrorBoundary from '../common/AppErrorBoundary';
import useAuth from '../../hooks/useAuth';
import { getNavItems } from '../../navigation';

export default function AppLayout() {
  const { pathname } = useLocation();
  const isLoginPage = pathname === '/login';
  const { isAuthenticated, logout } = useAuth();
  const navItems = getNavItems(isAuthenticated);
  const previousPath = useRef(pathname);
  const mainRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return window.localStorage.getItem('greener-theme') === 'dark'
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    if (previousPath.current !== pathname) {
      mainRef.current?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
      previousPath.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem('greener-theme', theme);
    } catch {
      // The selected theme remains active for the current page session.
    }
  }, [theme]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="Navegação principal">
            <div className="nav-pages">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className="nav-page"
                >
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              ))}
            </div>
            {isAuthenticated ? (
              <button type="button" className="nav-login" onClick={logout}>
                <Icon name="lock" />
                <span>Sair</span>
              </button>
            ) : (
              <NavLink to="/login" className="nav-login">
                <Icon name="lock" />
                <span>Entrar</span>
              </NavLink>
            )}
            <div
              className="theme-toggle"
              role="group"
              aria-label="Tema da interface"
            >
              <button
                type="button"
                aria-label="Modo escuro"
                aria-pressed={theme === 'dark'}
                title="Modo escuro"
                onClick={() => setTheme('dark')}
              >
                <Icon name="moon" />
              </button>
              <button
                type="button"
                aria-label="Modo claro"
                aria-pressed={theme === 'light'}
                title="Modo claro"
                onClick={() => setTheme('light')}
              >
                <Icon name="sun" />
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main
        id="conteudo"
        ref={mainRef}
        tabIndex={-1}
        className={`main-content${isLoginPage ? ' main-content--login' : ''}`}
      >
        <AppErrorBoundary key={pathname}>
          <Outlet />
        </AppErrorBoundary>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <span>
            <Icon name="leaf" />
            Tecnologia com uma perspectiva mais verde.
          </span>
          <span>
            GreenER <span aria-hidden="true">·</span> Equipe Undefined
          </span>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Navegação inferior">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
