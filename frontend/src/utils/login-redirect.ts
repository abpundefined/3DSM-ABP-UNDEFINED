export interface LoginRedirect {
  from: string;
  message: string;
}

export function readLoginRedirect(state: unknown): LoginRedirect {
  const { from, message } = (
    typeof state === 'object' && state !== null ? state : {}
  ) as Record<string, unknown>;

  const isInternalPath =
    typeof from === 'string' && from.startsWith('/') && !from.startsWith('//');

  return {
    from: isInternalPath ? from : '/',
    message: typeof message === 'string' ? message : '',
  };
}
