import type { RespostaOportunidades } from '../types/oportunidades';
import { ehRespostaOportunidades } from '../utils/oportunidades.ts';
import { apiRequest } from './api.ts';

export function normalizarConsultaOportunidades(consulta: string): string {
  const limpa = consulta.trim();
  if (!limpa) {
    return '';
  }
  return limpa.startsWith('?') ? limpa : `?${limpa}`;
}

export async function buscarOportunidades(
  consulta: string,
  signal?: AbortSignal,
): Promise<RespostaOportunidades> {
  const sufixo = normalizarConsultaOportunidades(consulta);
  const resposta = await apiRequest<unknown>(`/oportunidades${sufixo}`, {
    signal,
  });

  if (!ehRespostaOportunidades(resposta)) {
    throw new Error(
      'O servidor retornou as oportunidades em formato inválido.',
    );
  }

  return resposta;
}
