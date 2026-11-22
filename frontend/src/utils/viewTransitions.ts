export type DocumentoComViewTransition = {
  startViewTransition?: (callback: () => void) => unknown;
};

export type JanelaComMedia = {
  matchMedia?: (query: string) => { matches: boolean };
};

export type EventoCliqueNavegacao = {
  button: number;
  defaultPrevented: boolean;
  metaKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotionAtivo(
  win: JanelaComMedia | undefined = typeof window !== 'undefined'
    ? window
    : undefined,
): boolean {
  if (!win || typeof win.matchMedia !== 'function') {
    return false;
  }
  return Boolean(win.matchMedia(REDUCED_MOTION_QUERY)?.matches);
}

export function suportaViewTransition(
  doc: DocumentoComViewTransition | undefined = typeof document !== 'undefined'
    ? (document as DocumentoComViewTransition)
    : undefined,
  win: JanelaComMedia | undefined = typeof window !== 'undefined'
    ? window
    : undefined,
): boolean {
  return (
    typeof doc?.startViewTransition === 'function' &&
    !prefersReducedMotionAtivo(win)
  );
}

export function executarComViewTransition(
  atualizar: () => void,
  doc: DocumentoComViewTransition | undefined = typeof document !== 'undefined'
    ? (document as DocumentoComViewTransition)
    : undefined,
  win: JanelaComMedia | undefined = typeof window !== 'undefined'
    ? window
    : undefined,
): boolean {
  if (!suportaViewTransition(doc, win) || !doc?.startViewTransition) {
    atualizar();
    return false;
  }

  try {
    doc.startViewTransition(atualizar);
    return true;
  } catch {
    atualizar();
    return false;
  }
}

export function ehCliqueSimplesNavegacao(
  evento: EventoCliqueNavegacao,
): boolean {
  return (
    !evento.defaultPrevented &&
    evento.button === 0 &&
    !evento.metaKey &&
    !evento.altKey &&
    !evento.ctrlKey &&
    !evento.shiftKey
  );
}
