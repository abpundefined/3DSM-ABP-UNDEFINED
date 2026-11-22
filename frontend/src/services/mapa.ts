import type { RespostaMapa } from '../types/mapa';
import { ehRespostaMapa } from '../utils/mapaDados';
import { apiRequest } from './api';

export async function buscarMapa(
  periodQuery: string,
  signal?: AbortSignal,
): Promise<RespostaMapa> {
  const resposta = await apiRequest<unknown>(`/mapa${periodQuery}`, {
    signal,
  });

  if (!ehRespostaMapa(resposta)) {
    throw new Error(
      'O servidor devolveu os dados do mapa em formato inválido.',
    );
  }

  return resposta;
}
