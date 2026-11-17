import type { RespostaSaude } from '../types/saude';
import { ehRespostaSaude } from '../utils/saude.ts';
import { apiRequest } from './api';

export async function buscarSaude(
  token: string,
  signal?: AbortSignal,
): Promise<RespostaSaude> {
  const resposta = await apiRequest<unknown>('/saude', {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!ehRespostaSaude(resposta)) {
    throw new Error(
      'O servidor devolveu a saúde das integrações em formato inválido.',
    );
  }

  return resposta;
}
