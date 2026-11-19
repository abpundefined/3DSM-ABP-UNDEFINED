import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LIMITE_TOP_EMISSORES_RELATORIO,
  consultaRankingRelatorio,
  formatarContagemComConcordancia,
  formatarDataGeracaoRelatorio,
  normalizarIndicadoresRelatorio,
  normalizarTopEmissores,
  resumirSerieRelatorio,
} from '../src/utils/relatorio.ts';

test('define limite explícito dos maiores emissores no relatório', () => {
  assert.equal(LIMITE_TOP_EMISSORES_RELATORIO, 5);
});

test('consultaRankingRelatorio preserva o período e fixa metrica=emissao e limite=5', () => {
  assert.equal(consultaRankingRelatorio(''), '?metrica=emissao&limite=5');
  assert.equal(
    consultaRankingRelatorio('?periodo=7d'),
    '?periodo=7d&metrica=emissao&limite=5',
  );
  assert.equal(
    consultaRankingRelatorio(
      '?inicio=2026-11-01T00:00:00.000-03:00&fim=2026-11-07T23:59:59.999-03:00',
    ),
    '?inicio=2026-11-01T00%3A00%3A00.000-03%3A00&fim=2026-11-07T23%3A59%3A59.999-03%3A00&metrica=emissao&limite=5',
  );
});

test('normalizarIndicadoresRelatorio valida payload de GET /indicadores e rejeita formatos inválidos', () => {
  const valido = normalizarIndicadoresRelatorio({
    periodo: {
      inicio: '2026-11-11T03:00:00.000Z',
      fim: '2026-11-18T03:00:00.000Z',
    },
    energiaTotalKwh: 12.5,
    emissaoTotalGCo2e: 3450,
    coletasCalculadas: 48,
    servicos: {
      monitorados: 8,
      disponiveis: 6,
      indisponiveis: 1,
      semMetricas: 1,
      desconhecidos: 0,
      removidos: 0,
    },
    geradoEm: '2026-11-18T15:30:00.000Z',
  });

  assert.deepEqual(valido, {
    periodo: {
      inicio: '2026-11-11T03:00:00.000Z',
      fim: '2026-11-18T03:00:00.000Z',
    },
    energiaTotalKwh: 12.5,
    emissaoTotalGCo2e: 3450,
    coletasCalculadas: 48,
    servicos: {
      monitorados: 8,
      disponiveis: 6,
      indisponiveis: 1,
      semMetricas: 1,
      desconhecidos: 0,
      removidos: 0,
    },
    geradoEm: '2026-11-18T15:30:00.000Z',
  });

  for (const invalido of [
    null,
    {},
    { energiaTotalKwh: -1, emissaoTotalGCo2e: 10, servicos: {} },
    { energiaTotalKwh: 1, emissaoTotalGCo2e: 10, servicos: null },
  ]) {
    assert.equal(normalizarIndicadoresRelatorio(invalido), null);
  }
});

test('resumirSerieRelatorio aplica escalas independentes de energia e emissão mantendo lacunas nulas', () => {
  const resumo = resumirSerieRelatorio({
    periodo: {
      inicio: '2026-11-17T03:00:00.000Z',
      fim: '2026-11-18T03:00:00.000Z',
    },
    granularidade: 'hora',
    intervalos: ['2026-11-17T12:00:00.000Z', '2026-11-17T13:00:00.000Z'],
    global: [
      {
        inicio: '2026-11-17T12:00:00.000Z',
        energiaKwh: 0.25,
        emissaoGCo2e: 1500,
      },
      {
        inicio: '2026-11-17T13:00:00.000Z',
        energiaKwh: null,
        emissaoGCo2e: null,
      },
    ],
    servicos: [],
  });

  assert.ok(resumo !== null);
  assert.equal(resumo.granularidade, 'hora');
  assert.equal(resumo.possuiDados, true);
  assert.equal(resumo.escalaEnergia.unidade, 'Wh');
  assert.equal(resumo.escalaEmissao.unidade, 'kgCO₂e');
  assert.equal(resumo.pontos[0].energia, 250);
  assert.equal(resumo.pontos[0].emissao, 1.5);
  assert.equal(resumo.pontos[1].energia, null);
  assert.equal(resumo.pontos[1].emissao, null);
});

test('normalizarTopEmissores limita a 5 itens e rejeita formato inválido', () => {
  const itens = Array.from({ length: 7 }, (_, indice) => ({
    posicao: indice + 1,
    servicoId: indice + 1,
    nome: `Serviço ${indice + 1}`,
    energiaKwh: 2 - indice * 0.1,
    emissaoGCo2e: 800 - indice * 50,
    coletasValidas: 12,
  }));

  const top5 = normalizarTopEmissores({
    periodo: {
      inicio: '2026-11-11T03:00:00.000Z',
      fim: '2026-11-18T03:00:00.000Z',
    },
    metrica: 'emissao',
    itens,
    semDados: [],
  });

  assert.ok(top5 !== null);
  assert.equal(top5.length, 5);
  assert.equal(top5[0].nome, 'Serviço 1');
  assert.equal(top5[4].nome, 'Serviço 5');
  assert.equal(normalizarTopEmissores({ invalid: true }), null);
});

test('formatarDataGeracaoRelatorio formata em America/Sao_Paulo e usa fallback seguro', () => {
  const agora = new Date('2026-11-19T14:05:00.000Z');
  assert.equal(
    formatarDataGeracaoRelatorio('2026-11-19T14:05:00.000Z', agora),
    '19/11/2026, 11:05',
  );
  assert.equal(formatarDataGeracaoRelatorio(null, agora), '19/11/2026, 11:05');
});

test('formatarContagemComConcordancia usa singular apenas para 1', () => {
  assert.equal(
    formatarContagemComConcordancia(1, 'indisponível', 'indisponíveis'),
    '1 indisponível',
  );
  assert.equal(
    formatarContagemComConcordancia(0, 'indisponível', 'indisponíveis'),
    '0 indisponíveis',
  );
  assert.equal(
    formatarContagemComConcordancia(2, 'indisponível', 'indisponíveis'),
    '2 indisponíveis',
  );
  assert.equal(
    formatarContagemComConcordancia(1, 'ativo', 'ativos'),
    '1 ativo',
  );
  assert.equal(
    formatarContagemComConcordancia(5, 'ativo', 'ativos'),
    '5 ativos',
  );
});
