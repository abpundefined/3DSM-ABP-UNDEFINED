import { useEffect, useState } from 'react';
import { demoTotals } from '../mocks/dashboard';
import { ApiError, apiRequest } from '../services/api';
import {
  calcularTaxaEmissaoGPorSegundo,
  calcularTaxaPorTotalEPeriodo,
  type PeriodoIntervalo,
} from '../utils/contadorCo2';
import { toFiniteNumber } from '../utils/formatters';

type ServicoMinimo = {
  id: number;
  emissaoGCo2e?: number | null;
};

type UltimaColetaResposta = {
  dados?: {
    emissaoGCo2e?: number | null;
    intervaloColetaSegundos?: number | null;
  } | null;
};

type ConfiguracaoResposta = {
  intervaloColetaSegundos?: number;
};

type IndicadoresMinimos = {
  emissaoTotalGCo2e?: number;
  periodo?: PeriodoIntervalo;
};

const INTERVALO_ATUALIZACAO_TAXA_MS = 30_000;
const TAXA_DEMO_G_POR_SEGUNDO = calcularTaxaPorTotalEPeriodo(
  demoTotals.carbonKg * 1000,
);

export default function useTaxaEmissaoTv(
  ativo: boolean,
  isDemo: boolean,
  periodQuery: string,
): number {
  const [taxaLive, setTaxaLive] = useState(0);

  useEffect(() => {
    if (!ativo || isDemo) {
      return;
    }

    let cancelado = false;

    async function carregarTaxa(signal: AbortSignal) {
      try {
        const [servicosRes, configRes, indicadoresRes] =
          await Promise.allSettled([
            apiRequest<ServicoMinimo[]>('/servicos', { signal }),
            apiRequest<ConfiguracaoResposta>('/configuracao', { signal }),
            apiRequest<IndicadoresMinimos>(`/indicadores${periodQuery}`, {
              signal,
            }),
          ]);

        if (cancelado || signal.aborted) {
          return;
        }

        const intervaloPadrao =
          configRes.status === 'fulfilled'
            ? toFiniteNumber(configRes.value?.intervaloColetaSegundos)
            : null;

        let taxa = 0;

        if (
          servicosRes.status === 'fulfilled' &&
          Array.isArray(servicosRes.value) &&
          servicosRes.value.length > 0
        ) {
          const leituras = await Promise.all(
            servicosRes.value.map(async (servico) => {
              try {
                const resposta = await apiRequest<UltimaColetaResposta>(
                  `/coletas/servico/${servico.id}/ultima-valida`,
                  { signal },
                );
                return {
                  emissaoGCo2e:
                    toFiniteNumber(resposta?.dados?.emissaoGCo2e) ??
                    toFiniteNumber(servico.emissaoGCo2e),
                  intervaloSegundos: toFiniteNumber(
                    resposta?.dados?.intervaloColetaSegundos,
                  ),
                };
              } catch (erro) {
                if (erro instanceof ApiError && erro.status === 404) {
                  return {
                    emissaoGCo2e: toFiniteNumber(servico.emissaoGCo2e),
                    intervaloSegundos: null,
                  };
                }
                return { emissaoGCo2e: null, intervaloSegundos: null };
              }
            }),
          );

          if (cancelado || signal.aborted) {
            return;
          }

          taxa = calcularTaxaEmissaoGPorSegundo(leituras, intervaloPadrao);
        }

        if (taxa <= 0 && indicadoresRes.status === 'fulfilled') {
          taxa = calcularTaxaPorTotalEPeriodo(
            toFiniteNumber(indicadoresRes.value?.emissaoTotalGCo2e),
            indicadoresRes.value?.periodo,
          );
        }

        if (!cancelado && !signal.aborted) {
          setTaxaLive(taxa);
        }
      } catch {
        // Mantém a última taxa válida em caso de falha transitória de rede.
      }
    }

    const controller = new AbortController();
    void carregarTaxa(controller.signal);
    const timer = window.setInterval(() => {
      void carregarTaxa(controller.signal);
    }, INTERVALO_ATUALIZACAO_TAXA_MS);

    return () => {
      cancelado = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [ativo, isDemo, periodQuery]);

  if (!ativo) {
    return 0;
  }

  return isDemo ? TAXA_DEMO_G_POR_SEGUNDO : taxaLive;
}
