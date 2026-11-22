import type { RespostaSimulacao } from '../types/simulacao';
import { ehRespostaSimulacao } from '../utils/simulacao';
import { apiRequest } from './api';

export async function buscarSimulacao(
  servicoId: number,
  periodQuery: string,
  signal?: AbortSignal,
): Promise<RespostaSimulacao> {
  const resposta = await apiRequest<unknown>(
    `/servicos/${servicoId}/simulacao-regiao${periodQuery}`,
    { signal },
  );

  if (!ehRespostaSimulacao(resposta)) {
    throw new Error(
      'O servidor devolveu a simulação de regiões em formato inválido.',
    );
  }

  return resposta;
}
