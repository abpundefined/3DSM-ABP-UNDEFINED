import type { RespostaHorarios } from '../types/horarios';
import { ehRespostaHorarios } from '../utils/horarios';
import { apiRequest } from './api';

export function consultaDosHorarios(
  periodQuery: string,
  regiao: string | null,
): string {
  const params = new URLSearchParams(periodQuery);
  if (regiao !== null) {
    params.set('regiao', regiao);
  }

  const consulta = params.toString();
  return consulta === '' ? '' : `?${consulta}`;
}

export async function buscarHorarios(
  consulta: string,
  signal?: AbortSignal,
): Promise<RespostaHorarios> {
  const resposta = await apiRequest<unknown>(
    `/intensidade/horarios${consulta}`,
    { signal },
  );

  if (!ehRespostaHorarios(resposta)) {
    throw new Error(
      'O servidor devolveu os horários de intensidade em formato inválido.',
    );
  }

  return resposta;
}
