import type { RespostaSerie } from '../types/serie';
import { consultaDaSerie, ehRespostaSerie } from '../utils/serie';
import { apiRequest } from './api';

export async function buscarSerie(
  apiQuery: string,
  signal?: AbortSignal,
): Promise<RespostaSerie> {
  const resposta = await apiRequest<unknown>(
    `/indicadores/serie${consultaDaSerie(apiQuery)}`,
    { signal },
  );

  if (!ehRespostaSerie(resposta)) {
    throw new Error('O servidor devolveu a série em formato inválido.');
  }

  return resposta;
}
