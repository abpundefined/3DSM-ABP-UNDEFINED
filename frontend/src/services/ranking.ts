import type { RespostaRanking } from '../types/ranking';
import { ehRespostaRanking } from '../utils/ranking';
import { apiRequest } from './api';

export async function buscarRanking(
  consulta: string,
  signal?: AbortSignal,
): Promise<RespostaRanking> {
  const resposta = await apiRequest<unknown>(`/ranking${consulta}`, {
    signal,
  });

  if (!ehRespostaRanking(resposta)) {
    throw new Error('O servidor devolveu o ranking em formato inválido.');
  }

  return resposta;
}
