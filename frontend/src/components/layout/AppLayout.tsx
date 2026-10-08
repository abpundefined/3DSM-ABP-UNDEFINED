import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import Brand from '../common/Brand';
import Icon from '../common/Icon';
import AppErrorBoundary from '../common/AppErrorBoundary';

export default function AppLayout() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      mainRef.current?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
      previousPath.current = pathname;
    }
  }, [pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="Navegação principal">
            <NavLink to="/" end className="nav-dashboard">
              <Icon name="grid" />
              Dashboard
            </NavLink>
            <NavLink to="/login" className="nav-login">
              <Icon name="lock" />
              <span>Entrar</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="conteudo" ref={mainRef} tabIndex={-1} className="main-content">
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
    </div>
  );
}
