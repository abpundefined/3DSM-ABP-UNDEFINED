import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {};
  }
  const media = window.matchMedia(query);
  media.addEventListener?.('change', onChange);
  return () => media.removeEventListener?.('change', onChange);
}

export default function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false,
    () => false,
  );
}
