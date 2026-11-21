export const INTERVALO_MODO_TV_MS = 10_000;
export const MEDIA_MODO_TV_DESKTOP = '(min-width: 761px)';

export type TelaModoTv = {
  rota: '/' | '/mapa' | '/ranking';
  rotulo: string;
};

export const TELAS_MODO_TV: readonly TelaModoTv[] = [
  { rota: '/', rotulo: 'Dashboard' },
  { rota: '/mapa', rotulo: 'Mapa' },
  { rota: '/ranking', rotulo: 'Ranking' },
] as const;

export function estaEmModoTv(search: string): boolean {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  return params.get('tv') === '1';
}

export function resolverTelaModoTv(pathname: string): {
  atual: TelaModoTv;
  proxima: TelaModoTv;
  indiceAtual: number;
  total: number;
} {
  const indiceEncontrado = TELAS_MODO_TV.findIndex(
    (tela) => tela.rota === pathname,
  );
  const indiceAtual = indiceEncontrado >= 0 ? indiceEncontrado : 0;
  const indiceProxima = (indiceAtual + 1) % TELAS_MODO_TV.length;

  return {
    atual: TELAS_MODO_TV[indiceAtual],
    proxima: TELAS_MODO_TV[indiceProxima],
    indiceAtual,
    total: TELAS_MODO_TV.length,
  };
}

export function montarSearchModoTv(search: string): string {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  params.set('tv', '1');
  const query = params.toString();
  return query ? `?${query}` : '?tv=1';
}

export function removerModoTvDoSearch(search: string): string {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  params.delete('tv');
  const query = params.toString();
  return query ? `?${query}` : '';
}
