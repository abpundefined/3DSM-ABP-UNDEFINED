import type { ServicoNoMapa } from '../types/mapa';
import type {
  ItemRanking,
  MetricaRanking,
  RespostaRanking,
  ServicoSemDados,
} from '../types/ranking';
import { LIMITE_DO_RANKING, valorDaMetrica } from '../utils/ranking.ts';
import { mapaDemo } from './mapa.ts';

// Mesmos serviços e totais do mapa de demonstração. Não representam coletas reais.
const itens: Omit<ItemRanking, 'posicao'>[] = [];
const semDados: ServicoSemDados[] = [];

function adicionar(
  {
    servicoId,
    nome,
    totais,
  }: Pick<ServicoNoMapa, 'servicoId' | 'nome' | 'totais'>,
  coletasValidas: number,
) {
  const { energiaKwh, emissaoGCo2e } = totais;

  if (energiaKwh === null || emissaoGCo2e === null) {
    semDados.push({ servicoId, nome });
  } else {
    itens.push({ servicoId, nome, energiaKwh, emissaoGCo2e, coletasValidas });
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
