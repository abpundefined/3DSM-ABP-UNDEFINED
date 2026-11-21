export const URL_DEMO_PADRAO =
  'https://abpundefined.github.io/3DSM-ABP-UNDEFINED/';

function lerEnv(chave: 'VITE_DEMO_MODE' | 'VITE_PUBLIC_DEMO_URL'): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  return env?.[chave] ?? '';
}

export const MODO_DEMO_ESTATICO = lerEnv('VITE_DEMO_MODE') === 'true';

export function ehModoDemo(searchParams: URLSearchParams): boolean {
  return MODO_DEMO_ESTATICO || searchParams.get('demo') === '1';
}

export function resolverUrlDemoPublica(
  urlConfigurada = lerEnv('VITE_PUBLIC_DEMO_URL'),
): string {
  const limpa = urlConfigurada.trim().replace(/([^:]\/)\/+/g, '$1');
  if (/^https?:\/\/\S+$/i.test(limpa)) {
    return limpa;
  }
  return URL_DEMO_PADRAO;
}

export function formatarUrlLegivel(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}
