import type { MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  ehCliqueSimplesNavegacao,
  executarComViewTransition,
  suportaViewTransition,
} from '../../utils/viewTransitions';
import Icon from './Icon';

export default function Brand() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !ehCliqueSimplesNavegacao(event) ||
      !suportaViewTransition() ||
      (pathname === '/' && search === '')
    ) {
      return;
    }

    event.preventDefault();
    executarComViewTransition(() => {
      flushSync(() => {
        void navigate('/');
      });
    });
  }

  return (
    <Link
      to="/"
      className="brand"
      aria-label="GreenER — dashboard"
      onClick={handleClick}
    >
      <span className="brand-mark">
        <Icon name="leaf" />
      </span>
      <span>
        Green<span className="brand-ending">ER</span>
      </span>
    </Link>
  );
}
