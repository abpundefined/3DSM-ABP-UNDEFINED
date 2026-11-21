import type { ServicoNoMapa } from '../types/mapa';
import type {
  ItemRanking,
  MetricaRanking,
  RespostaRanking,
  ServicoSemDados,
} from '../types/ranking';
import type { RespostaSerie } from '../types/serie';
import { LIMITE_DO_RANKING, valorDaMetrica } from '../utils/ranking.ts';
import { mapaDemo } from './mapa.ts';

// Mesmos serviços e totais do mapa de demonstração. Não representam coletas reais.
const itens: Omit<ItemRanking, 'posicao'>[] = [];
const semDados: ServicoSemDados[] = [];

function adicionar(
  {
    servicoId,
    nome,
    regiaoCodigo,
    local,
    totais,
  }: Pick<ServicoNoMapa, 'servicoId' | 'nome' | 'regiaoCodigo' | 'totais'> & {
    local?: string;
  },
  coletasValidas: number,
) {
  const { energiaKwh, emissaoGCo2e } = totais;

  if (energiaKwh === null || emissaoGCo2e === null) {
    semDados.push({ servicoId, nome });
  } else {
    const regiao = local ?? 'Localização não informada';
    const [paisExtraido] = local ? local.split(' · ') : [];
    const pais = paisExtraido ?? 'Localização não informada';
    itens.push({
      servicoId,
      nome,
      energiaKwh,
      emissaoGCo2e,
      coletasValidas,
      regiaoCodigo,
      regiao,
      pais,
    });
  }
}

for (const servico of mapaDemo.servicos) {
  adicionar(servico, servico.serie.filter((valor) => valor !== null).length);
}
for (const servico of mapaDemo.semCoordenadas) {
  adicionar(servico, mapaDemo.intervalos.length);
}

const porNome = (a: ServicoSemDados, b: ServicoSemDados) =>
  a.nome.localeCompare(b.nome, 'pt-BR') || a.servicoId - b.servicoId;

export function rankingDemo(metrica: MetricaRanking): RespostaRanking {
  return {
    periodo: mapaDemo.periodo,
    variacaoPercentual: { energiaKwh: null, emissaoGCo2e: null },
    variacaoPorServico: itens.toSorted(porNome).map((item) => ({
      servicoId: item.servicoId,
      nome: item.nome,
      emissaoAtualGCo2e: item.emissaoGCo2e,
      emissaoAnteriorGCo2e: null,
      diferencaGCo2e: null,
      variacaoPercentual: null,
    })),
    metrica,
    itens: itens
      .toSorted(
        (a, b) =>
          valorDaMetrica(b, metrica) - valorDaMetrica(a, metrica) ||
          porNome(a, b),
      )
      .slice(0, LIMITE_DO_RANKING)
      .map((item, indice) => ({ ...item, posicao: indice + 1 })),
    semDados: semDados.toSorted(porNome),
  };
}

export function serieDemoRanking(): RespostaSerie {
  const { periodo, granularidade, intervalos, servicos } = mapaDemo;
  const seriesServicos = servicos.map((servico) => {
    const fatorEnergia =
      servico.totais.energiaKwh !== null &&
      servico.totais.emissaoGCo2e !== null &&
      servico.totais.emissaoGCo2e > 0
        ? servico.totais.energiaKwh / servico.totais.emissaoGCo2e
        : 0;
    return {
      servicoId: servico.servicoId,
      nome: servico.nome,
      serie: intervalos.map((inicio, indice) => {
        const emissaoGCo2e = servico.serie[indice] ?? null;
        return {
          inicio,
          energiaKwh:
            emissaoGCo2e === null || fatorEnergia <= 0
              ? null
              : emissaoGCo2e * fatorEnergia,
          emissaoGCo2e,
        };
      }),
    };
  });

  const global = intervalos.map((inicio, indice) => {
    let somaEmissao = 0;
    let somaEnergia = 0;
    let temDado = false;
    for (const servico of seriesServicos) {
      const ponto = servico.serie[indice];
      if (ponto.emissaoGCo2e !== null) {
        somaEmissao += ponto.emissaoGCo2e;
        temDado = true;
      }
      if (ponto.energiaKwh !== null) {
        somaEnergia += ponto.energiaKwh;
      }
    }
    return {
      inicio,
      energiaKwh: temDado ? somaEnergia : null,
      emissaoGCo2e: temDado ? somaEmissao : null,
    };
  });

  return {
    periodo,
    granularidade,
    intervalos,
    global,
    servicos: seriesServicos,
  };
}
