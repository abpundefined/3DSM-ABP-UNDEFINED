import type { DadosRelatorio } from '../types/relatorio';
import {
  LIMITE_TOP_EMISSORES_RELATORIO,
  VERSAO_CALCULO,
  resumirSerieRelatorio,
} from '../utils/relatorio';
import { mapaDemo } from './mapa';
import { rankingDemo } from './ranking';

export function relatorioDemo(): DadosRelatorio {
  const ranking = rankingDemo('emissao');
  const todosServicos = [...mapaDemo.servicos, ...mapaDemo.semCoordenadas];

  const disponiveis = todosServicos.filter(
    (servico) => servico.estado === 'DISPONIVEL',
  ).length;
  const indisponiveis = todosServicos.filter(
    (servico) => servico.estado === 'INDISPONIVEL',
  ).length;
  const semMetricas = todosServicos.filter(
    (servico) => servico.estado === 'SEM_METRICAS',
  ).length;
  const desconhecidos = todosServicos.filter(
    (servico) => servico.estado === 'DESCONHECIDO',
  ).length;

  const energiaTotalKwh = todosServicos.reduce(
    (soma, servico) => soma + (servico.totais.energiaKwh ?? 0),
    0,
  );
  const emissaoTotalGCo2e = todosServicos.reduce(
    (soma, servico) => soma + (servico.totais.emissaoGCo2e ?? 0),
    0,
  );

  const fatoresEnergiaPorServico = mapaDemo.servicos.map((servico) => {
    const { energiaKwh, emissaoGCo2e } = servico.totais;
    return energiaKwh !== null && emissaoGCo2e !== null && emissaoGCo2e > 0
      ? energiaKwh / emissaoGCo2e
      : 0;
  });

  const global = mapaDemo.intervalos.map((inicio, indice) => {
    let energiaSoma = 0;
    let emissaoSoma = 0;
    let possuiValor = false;

    mapaDemo.servicos.forEach((servico, servicoIndex) => {
      const emissaoPonto = servico.serie[indice];
      if (emissaoPonto === null) {
        return;
      }
      possuiValor = true;
      emissaoSoma += emissaoPonto;
      energiaSoma += emissaoPonto * fatoresEnergiaPorServico[servicoIndex];
    });

    return possuiValor
      ? { inicio, energiaKwh: energiaSoma, emissaoGCo2e: emissaoSoma }
      : { inicio, energiaKwh: null, emissaoGCo2e: null };
  });

  const serie = resumirSerieRelatorio({
    periodo: mapaDemo.periodo,
    granularidade: mapaDemo.granularidade,
    intervalos: mapaDemo.intervalos,
    global,
    servicos: [],
  });

  if (!serie) {
    throw new Error('Falha ao montar a série ilustrativa do relatório.');
  }

  return {
    indicadores: {
      periodo: mapaDemo.periodo,
      energiaTotalKwh,
      emissaoTotalGCo2e,
      coletasCalculadas: ranking.itens.reduce(
        (soma, item) => soma + item.coletasValidas,
        0,
      ),
      servicos: {
        monitorados: todosServicos.length,
        disponiveis,
        indisponiveis,
        semMetricas,
        desconhecidos,
        removidos: 0,
      },
      geradoEm: mapaDemo.periodo.fim,
      versaoCalculo: VERSAO_CALCULO,
    },
    serie,
    topEmissores: ranking.itens
      .slice(0, LIMITE_TOP_EMISSORES_RELATORIO)
      .map((item) => ({ ...item, selo: null })),
    oportunidades: [],
  };
}
