import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  consultaDoRanking,
  ehRespostaRanking,
  escreverMetrica,
  formatarPeriodoConsiderado,
  fraseDeIntensidade,
  lerMetrica,
  resumoDoRanking,
} from '../src/utils/ranking.ts';

const item = {
  posicao: 1,
  servicoId: 5,
  nome: 'Video Processor',
  energiaKwh: 0.034,
  emissaoGCo2e: 13.1,
  coletasValidas: 24,
};

const resposta = {
  periodo: {
    inicio: '2026-11-11T03:00:00.000Z',
    fim: '2026-11-12T02:59:59.999Z',
  },
  metrica: 'energia',
  itens: [item],
  semDados: [{ servicoId: 6, nome: 'Notification Worker' }],
};

test('aceita a resposta no formato do GET /ranking', () => {
  assert.equal(ehRespostaRanking(resposta), true);
  assert.equal(
    ehRespostaRanking({ ...resposta, itens: [], semDados: [] }),
    true,
  );
});

test('recusa resposta fora do contrato', () => {
  for (const invalida of [
    null,
    [],
    { ...resposta, metrica: 'agua' },
    { ...resposta, periodo: { inicio: '2026-11-11' } },
    { ...resposta, itens: [{ ...item, energiaKwh: null }] },
    { ...resposta, itens: [{ ...item, emissaoGCo2e: -1 }] },
    { ...resposta, itens: [{ ...item, coletasValidas: 2.5 }] },
    { ...resposta, semDados: [{ nome: 'Sem id' }] },
    { ...resposta, semDados: undefined },
  ]) {
    assert.equal(ehRespostaRanking(invalida), false);
  }
});

test('lê a métrica da URL e usa energia quando ela falta ou é inválida', () => {
  assert.equal(lerMetrica(new URLSearchParams('metrica=emissao')), 'emissao');
  assert.equal(lerMetrica(new URLSearchParams('metrica=energia')), 'energia');
  assert.equal(lerMetrica(new URLSearchParams()), 'energia');
  assert.equal(lerMetrica(new URLSearchParams('metrica=toString')), 'energia');
});

test('grava a métrica na URL sem perder o período', () => {
  const params = new URLSearchParams('periodo=7d');

  assert.equal(
    escreverMetrica(params, 'emissao').toString(),
    'periodo=7d&metrica=emissao',
  );
  assert.equal(
    escreverMetrica(
      new URLSearchParams('periodo=7d&metrica=emissao'),
      'energia',
    ).toString(),
    'periodo=7d',
  );
  assert.equal(params.toString(), 'periodo=7d');
});

test('monta a consulta do GET /ranking com o período, a métrica e o limite', () => {
  assert.equal(consultaDoRanking('', 'energia'), '?metrica=energia&limite=10');
  assert.equal(
    consultaDoRanking('?periodo=7d', 'emissao'),
    '?periodo=7d&metrica=emissao&limite=10',
  );
  const personalizado = new URLSearchParams(
    consultaDoRanking(
      '?inicio=2026-11-01T00%3A00%3A00.000-03%3A00&fim=2026-11-07T23%3A59%3A59.999-03%3A00',
      'energia',
    ),
  );
  assert.equal(personalizado.get('inicio'), '2026-11-01T00:00:00.000-03:00');
  assert.equal(personalizado.get('fim'), '2026-11-07T23:59:59.999-03:00');
  assert.equal(personalizado.get('metrica'), 'energia');
});

const servico = (nome, energiaKwh, emissaoGCo2e) => ({
  ...item,
  nome,
  energiaKwh,
  emissaoGCo2e,
});

test('resume quem lidera o ranking e a parte dele no total', () => {
  const itens = [
    servico('Video Processor', 0.03, 12),
    servico('Media CDN', 0.02, 9),
    servico('Search API', 0.01, 3),
  ];

  assert.equal(
    resumoDoRanking(itens, 'energia'),
    'Video Processor lidera em energia: 30,00 Wh, 50% do total dos 3 serviços do ranking.',
  );
  assert.equal(
    resumoDoRanking(itens, 'emissao'),
    'Video Processor lidera em emissão: 12,00 gCO₂e, 50% do total dos 3 serviços do ranking.',
  );
  assert.equal(
    resumoDoRanking([itens[0]], 'energia'),
    'Video Processor é o único serviço com coletas no período: 30,00 Wh de energia.',
  );
  assert.equal(resumoDoRanking([], 'energia'), null);
});

test('não calcula porcentagem quando o total é zero', () => {
  assert.equal(
    resumoDoRanking([servico('A', 0, 0), servico('B', 0, 0)], 'emissao'),
    'Os serviços do ranking não registraram emissão no período.',
  );
});

test('compara a emissão por kWh quando a diferença é relevante', () => {
  assert.equal(
    fraseDeIntensidade([
      servico('Media CDN', 0.01, 4.71),
      servico('Search API', 0.02, 7.68),
      servico('Reports Engine', 0.01, 0.41),
    ]),
    'Por kWh consumido, Media CDN emite 11,5 vezes mais CO₂e que Reports Engine. A emissão depende da intensidade de carbono da energia na região onde cada serviço roda.',
  );
});

test('não compara intensidade sem diferença relevante ou sem dois serviços', () => {
  assert.equal(
    fraseDeIntensidade([servico('A', 0.01, 3), servico('B', 0.02, 5)]),
    null,
  );
  assert.equal(fraseDeIntensidade([servico('A', 0.01, 3)]), null);
  assert.equal(
    fraseDeIntensidade([servico('A', 0, 3), servico('B', 0.02, 0)]),
    null,
  );
});

test('mostra o período considerado no horário de São Paulo', () => {
  assert.equal(
    formatarPeriodoConsiderado(resposta.periodo),
    '11/11/2026, 00:00 a 11/11/2026, 23:59',
  );
});
