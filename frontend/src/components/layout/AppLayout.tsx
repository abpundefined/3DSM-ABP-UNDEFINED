import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import {
  NavLink,
  Outlet,
  type To,
  useLocation,
  useNavigate,
} from 'react-router';
import Brand from '../common/Brand';
import BackToTopButton from '../common/BackToTopButton';
import Icon from '../common/Icon';
import AppErrorBoundary from '../common/AppErrorBoundary';
import GuidedTour from '../tour/GuidedTour';
import useAuth from '../../hooks/useAuth';
import usePeriod from '../../hooks/usePeriod';
import { getNavItems } from '../../navigation';
import { jaViuTour, marcarTourComoVisto } from '../../utils/tour';
import {
  ehCliqueSimplesNavegacao,
  executarComViewTransition,
  suportaViewTransition,
} from '../../utils/viewTransitions';
import '../common/view-transitions.css';

export default function AppLayout() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const isLoginPage = pathname === '/login';
  const { isAuthenticated, logout } = useAuth();
  const navItems = getNavItems(isAuthenticated);
  const { linkSearch } = usePeriod();
  const navigationParams = new URLSearchParams(
    linkSearch.startsWith('?') ? linkSearch.slice(1) : linkSearch,
  );
  const selectedServices = new URLSearchParams(search).get('servicos');
  if (selectedServices) {
    navigationParams.set('servicos', selectedServices);
  }
  const navigationQuery = navigationParams.toString();
  const navigationSearch = navigationQuery ? `?${navigationQuery}` : '';
  const previousPath = useRef(pathname);
  const mainRef = useRef<HTMLElement>(null);
  const [tourState, setTourState] = useState<{
    aberto: boolean;
    focarAoAbrir: boolean;
    returnFocusEl: HTMLElement | null;
    chave: number;
  }>(() => ({
    aberto: pathname === '/' && !jaViuTour(),
    focarAoAbrir: false,
    returnFocusEl: null,
    chave: 0,
  }));
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
      // Sem armazenamento, o tema escolhido vale apenas enquanto a página estiver aberta.
    }
  }, [theme]);

  function handleNavClick(
    event: MouseEvent<HTMLAnchorElement>,
    target: To,
    targetPathname: string,
    targetSearch = '',
  ) {
    if (
      !ehCliqueSimplesNavegacao(event) ||
      !suportaViewTransition() ||
      (pathname === targetPathname && search === targetSearch)
    ) {
      return;
    }

    event.preventDefault();
    executarComViewTransition(() => {
      flushSync(() => {
        void navigate(target);
      });
    });
  }

  function iniciarTour(event: MouseEvent<HTMLButtonElement>) {
    const trigger = event.currentTarget;
    if (pathname !== '/') {
      void navigate({ pathname: '/', search: navigationSearch });
    }
    setTourState((atual) => ({
      aberto: true,
      focarAoAbrir: true,
      returnFocusEl: trigger,
      chave: atual.chave + 1,
    }));
  }

  const fecharTour = useCallback(() => {
    marcarTourComoVisto();
    setTourState((atual) => ({
      ...atual,
      aberto: false,
      focarAoAbrir: false,
    }));
  }, []);

  const tourVisivel = tourState.aberto && pathname === '/';

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
              {navItems.map((item) => {
                const target = { pathname: item.to, search: navigationSearch };
                return (
                  <NavLink
                    key={item.to}
                    to={target}
                    end={item.to === '/'}
                    className="nav-page"
                    onClick={(event) =>
                      handleNavClick(event, target, item.to, navigationSearch)
                    }
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
            <button
              type="button"
              className="nav-tour"
              aria-label="Fazer tour"
              title="Fazer tour guiado"
              onClick={iniciarTour}
            >
              <Icon name="compass" />
              <span>Fazer tour</span>
            </button>
            {isAuthenticated ? (
              <button type="button" className="nav-login" onClick={logout}>
                <Icon name="lock" />
                <span>Sair</span>
              </button>
            ) : (
              <NavLink
                to="/login"
                className="nav-login"
                onClick={(event) => handleNavClick(event, '/login', '/login')}
              >
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
      <GuidedTour
        key={tourState.chave}
        aberto={tourVisivel}
        focarAoAbrir={tourState.focarAoAbrir}
        returnFocusTo={tourState.returnFocusEl}
        onFechar={fecharTour}
      />
      <BackToTopButton />
      <nav className="bottom-nav" aria-label="Navegação inferior">
        {navItems.map((item) => {
          const target = { pathname: item.to, search: navigationSearch };
          return (
            <NavLink
              key={item.to}
              to={target}
              end={item.to === '/'}
              aria-label={item.shortLabel ? item.label : undefined}
              onClick={(event) =>
                handleNavClick(event, target, item.to, navigationSearch)
              }
            >
              <Icon name={item.icon} />
              <span>{item.shortLabel ?? item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
