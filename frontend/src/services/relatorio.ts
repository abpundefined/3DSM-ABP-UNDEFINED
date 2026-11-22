import type { DadosRelatorio } from '../types/relatorio';
import {
  consultaRankingRelatorio,
  normalizarIndicadoresRelatorio,
  normalizarTopEmissores,
  resumirSerieRelatorio,
} from '../utils/relatorio';
import { apiRequest } from './api';

export async function buscarDadosRelatorio(
  apiQuery: string,
  signal?: AbortSignal,
): Promise<DadosRelatorio> {
  const [indicadoresBruto, serieBruta, rankingBruto] = await Promise.all([
    apiRequest<unknown>(`/indicadores${apiQuery}`, { signal }),
    apiRequest<unknown>(`/indicadores/serie${apiQuery}`, { signal }),
    apiRequest<unknown>(`/ranking${consultaRankingRelatorio(apiQuery)}`, {
      signal,
    }),
  ]);

  const indicadores = normalizarIndicadoresRelatorio(indicadoresBruto);
  if (!indicadores) {
    throw new Error('O servidor devolveu os indicadores em formato inválido.');
  }

  const serie = resumirSerieRelatorio(serieBruta);
  if (!serie) {
    throw new Error(
      'O servidor devolveu a série temporal em formato inválido.',
    );
  }

  const topEmissores = normalizarTopEmissores(rankingBruto);
  if (!topEmissores) {
    throw new Error('O servidor devolveu o ranking em formato inválido.');
  }

  return {
    indicadores,
    serie,
    topEmissores,
  };
}
