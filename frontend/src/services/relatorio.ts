import type { DadosRelatorio, OportunidadeRelatorio } from '../types/relatorio';
import {
  consultaRankingRelatorio,
  normalizarIndicadoresRelatorio,
  normalizarOportunidadesRelatorio,
  normalizarTopEmissores,
  resumirSerieRelatorio,
} from '../utils/relatorio';
import { ApiError, apiRequest } from './api';

async function buscarOportunidadesOpcional(
  apiQuery: string,
  signal?: AbortSignal,
): Promise<OportunidadeRelatorio[] | null> {
  try {
    const resposta = await apiRequest<unknown>(`/oportunidades${apiQuery}`, {
      signal,
    });
    return normalizarOportunidadesRelatorio(resposta);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    if (signal?.aborted) {
      throw error;
    }
    return null;
  }
}

export async function buscarDadosRelatorio(
  apiQuery: string,
  signal?: AbortSignal,
): Promise<DadosRelatorio> {
  const [indicadoresBruto, serieBruta, rankingBruto, oportunidades] =
    await Promise.all([
      apiRequest<unknown>(`/indicadores${apiQuery}`, { signal }),
      apiRequest<unknown>(`/indicadores/serie${apiQuery}`, { signal }),
      apiRequest<unknown>(`/ranking${consultaRankingRelatorio(apiQuery)}`, {
        signal,
      }),
      buscarOportunidadesOpcional(apiQuery, signal),
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
    oportunidades,
  };
}
