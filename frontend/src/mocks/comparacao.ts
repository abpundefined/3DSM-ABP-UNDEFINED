import type {
  RespostaComparacao,
  ServicoComparacao,
  ServicoSelecionavel,
} from '../types/comparacao';
import { mapaDemo } from './mapa';

const localizacaoPorRegiao: Record<
  string,
  { pais: string; regiao: string; cidade: string }
> = {
  'br-sudeste': { pais: 'Brasil', regiao: 'Sudeste', cidade: 'São Paulo' },
  'us-east': {
    pais: 'Estados Unidos',
    regiao: 'Virgínia',
    cidade: 'Ashburn',
  },
  'eu-west': { pais: 'Irlanda', regiao: 'Leinster', cidade: 'Dublin' },
  'ca-central': { pais: 'Canadá', regiao: 'Ontário', cidade: 'Toronto' },
  'jp-east': { pais: 'Japão', regiao: 'Tóquio', cidade: 'Tóquio' },
};

const intensidadePorRegiao: Record<string, number> = {
  'br-sudeste': 98,
  'us-east': 384,
  'eu-west': 296,
  'ca-central': 41,
  'jp-east': 471,
};

const metricasBasePorServico: Record<
  number,
  { cpuMedia: number | null; memoriaMediaMb: number | null }
> = {
  1: { cpuMedia: 24.5, memoriaMediaMb: 1536 },
  2: { cpuMedia: 18.2, memoriaMediaMb: 1024 },
  3: { cpuMedia: 14.0, memoriaMediaMb: 896 },
  4: { cpuMedia: 58.6, memoriaMediaMb: 3072 },
  5: { cpuMedia: 84.3, memoriaMediaMb: 6144 },
  6: { cpuMedia: null, memoriaMediaMb: null },
  7: { cpuMedia: 12.8, memoriaMediaMb: 768 },
  8: { cpuMedia: 67.4, memoriaMediaMb: 4096 },
};

export const servicosComparacaoDemo: ServicoSelecionavel[] =
  mapaDemo.servicos.map((servico) => ({
    id: servico.servicoId,
    nome: servico.nome,
    regiaoCodigo: servico.regiaoCodigo,
    estadoAtual: servico.estado,
    localizacao: localizacaoPorRegiao[servico.regiaoCodigo] ?? null,
  }));

export function comparacaoDemo(
  serviceIds: readonly number[],
): RespostaComparacao {
  const servicos: ServicoComparacao[] = serviceIds
    .map((id) => mapaDemo.servicos.find((item) => item.servicoId === id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)
    .map((servico) => {
      const intensidade = intensidadePorRegiao[servico.regiaoCodigo] ?? 200;
      const metricas = metricasBasePorServico[servico.servicoId] ?? {
        cpuMedia: 30,
        memoriaMediaMb: 1024,
      };
      const coletasValidas = servico.serie.filter(
        (valor) => valor !== null,
      ).length;

      return {
        servicoId: servico.servicoId,
        nome: servico.nome,
        totais: {
          energiaKwh: servico.totais.energiaKwh,
          emissaoGCo2e: servico.totais.emissaoGCo2e,
          cpuMedia: metricas.cpuMedia,
          memoriaMediaMb: metricas.memoriaMediaMb,
          coletasValidas,
        },
        serie: mapaDemo.intervalos.map((inicio, indice) => {
          const emissao = servico.serie[indice];
          return {
            inicio,
            emissaoGCo2e: emissao,
            energiaKwh:
              emissao === null
                ? null
                : Math.round((emissao / intensidade) * 1_000_000) / 1_000_000,
          };
        }),
      };
    });

  return {
    periodo: mapaDemo.periodo,
    granularidade: mapaDemo.granularidade,
    servicos,
  };
}
