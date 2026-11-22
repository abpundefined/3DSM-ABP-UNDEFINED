import { useEffect, useState } from 'react';
import Icon from './Icon';
import './back-to-top.css';

const SCROLL_THRESHOLD_PX = 320;

export default function BackToTopButton() {
  const [visible, setVisible] = useState(
    () =>
      typeof window !== 'undefined' && window.scrollY >= SCROLL_THRESHOLD_PX,
  );

  useEffect(() => {
    const updateVisibility = () => {
      setVisible(window.scrollY >= SCROLL_THRESHOLD_PX);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  if (!visible) {
    return null;
  }

  function handleScrollToTop() {
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }

  return (
    <button
      type="button"
      className="back-to-top"
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      onClick={handleScrollToTop}
    >
      <Icon name="arrowUp" />
    </button>
  );
}
