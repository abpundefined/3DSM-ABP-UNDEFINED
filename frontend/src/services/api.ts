const API_BASE_PATH = '/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super('A requisição ao servidor falhou (HTTP ' + status + ').');
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Requests JSON from the project's backend through the same-origin /api path.
 * T describes the expected payload; it does not validate JSON at runtime.
 * Empty responses (HTTP 204/205) return undefined.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T | undefined> {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new TypeError('Informe um caminho da API, como /services.');
  }

  const headers = new Headers(options.headers);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(API_BASE_PATH + path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  return (await response.json()) as T;
}
