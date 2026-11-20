import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  consultaDaSerie,
  direcaoDaTendencia,
  ehRespostaSerie,
  escalaDaEmissao,
  escalaDaEnergia,
  maiorValor,
  montarCamadas,
  resumoDaMetrica,
  resumoDasCamadas,
  rotuloCompletoDoIntervalo,
  rotuloDaMiniTendencia,
  rotuloDoIntervalo,
  segmentosDaMiniatura,
} from '../src/utils/serie.ts';

const intervalos = ['2026-11-17T12:00:00.000Z', '2026-11-17T13:00:00.000Z'];
const ponto = (inicio, energiaKwh, emissaoGCo2e) => ({
  inicio,
  energiaKwh,
  emissaoGCo2e,
});

const resposta = {
  periodo: {
    inicio: '2026-11-17T12:00:00.000Z',
    fim: '2026-11-17T13:59:59.999Z',
  },
  granularidade: 'hora',
  intervalos,
  global: [ponto(intervalos[0], 0.02, 7.6), ponto(intervalos[1], null, null)],
  servicos: [
    {
      servicoId: 5,
      nome: 'Video Processor',
      serie: [
        ponto(intervalos[0], 0.02, 7.6),
        ponto(intervalos[1], null, null),
      ],
    },
  ],
};

test('aceita a resposta no formato do GET /indicadores/serie', () => {
  assert.equal(ehRespostaSerie(resposta), true);
  assert.equal(ehRespostaSerie({ ...resposta, servicos: [] }), true);
});

test('recusa resposta fora do contrato ou desalinhada', () => {
  for (const invalida of [
    null,
    { ...resposta, granularidade: 'semana' },
    { ...resposta, intervalos: [1, 2] },
    { ...resposta, global: [resposta.global[0]] },
    {
      ...resposta,
      global: [resposta.global[1], resposta.global[0]],
    },
    { ...resposta, global: [ponto(intervalos[0], -1, 2), resposta.global[1]] },
    {
      ...resposta,
      servicos: [{ ...resposta.servicos[0], serie: [] }],
    },
    { ...resposta, servicos: [{ nome: 'Sem id', serie: resposta.global }] },
  ]) {
    assert.equal(ehRespostaSerie(invalida), false);
  }
});

test('pede a série por serviço com o período selecionado', () => {
  assert.equal(consultaDaSerie(''), '?porServico=true');
  assert.equal(consultaDaSerie('?periodo=7d'), '?periodo=7d&porServico=true');
});

test('escolhe a unidade pela maior leitura, como o formatEnergy', () => {
  assert.deepEqual(escalaDaEnergia(0.4), { fator: 1000, unidade: 'Wh' });
  assert.deepEqual(escalaDaEnergia(1), { fator: 1, unidade: 'kWh' });
  assert.deepEqual(escalaDaEmissao(999), { fator: 1, unidade: 'gCO₂e' });
  assert.deepEqual(escalaDaEmissao(1000), { fator: 0.001, unidade: 'kgCO₂e' });
  assert.equal(maiorValor([null, 2, 7.5, null]), 7.5);
  assert.equal(maiorValor([null, null]), 0);
});

test('rótulos dos intervalos no horário de São Paulo', () => {
  assert.equal(rotuloDoIntervalo('2026-11-17T17:00:00.000Z', 'hora'), '14:00');
  assert.equal(rotuloDoIntervalo('2026-11-17T03:00:00.000Z', 'dia'), '17/11');
  assert.equal(
    rotuloCompletoDoIntervalo('2026-11-17T17:00:00.000Z', 'hora'),
    '17/11, 14:00',
  );
  assert.equal(
    rotuloCompletoDoIntervalo('2026-11-17T03:00:00.000Z', 'dia'),
    '17/11/2026',
  );
});

test('rótulo acessível do mini gráfico menciona o período', () => {
  const ultimas24h = { kind: 'preset', preset: '24h' };
  assert.equal(
    rotuloDaMiniTendencia([1, 1, 3, 3], ultimas24h),
    'Emissão subindo nas últimas 24 horas',
  );
  assert.equal(
    rotuloDaMiniTendencia([3, 3, 3, 3], { kind: 'preset', preset: '7d' }),
    'Emissão estável nos últimos 7 dias',
  );
  assert.equal(
    rotuloDaMiniTendencia([1, null], {
      kind: 'custom',
      inicio: '2026-11-01',
      fim: '2026-11-07',
    }),
    'Sem coletas suficientes para a tendência no período escolhido',
  );
});

test('direção da tendência compara a primeira e a segunda metade', () => {
  assert.equal(direcaoDaTendencia([1, 1, 2, 2]), 'subindo');
  assert.equal(direcaoDaTendencia([4, 4, null, 2, 2]), 'caindo');
  assert.equal(direcaoDaTendencia([10, 10, 10.5, 10.5]), 'estavel');
  assert.equal(direcaoDaTendencia([0, 0, 3, 3]), 'subindo');
  assert.equal(direcaoDaTendencia([0, 0, 0, 0]), 'estavel');
  assert.equal(direcaoDaTendencia([1, 2, null, null, 3]), null);
});

const horas = Array.from(
  { length: 4 },
  (_, indice) =>
    `2026-11-17T${String(12 + indice).padStart(2, '0')}:00:00.000Z`,
);

test('resume total, pico e tendência de cada métrica', () => {
  const global = [
    ponto(horas[0], 0.001, 0.5),
    ponto(horas[1], 0.001, 0.5),
    ponto(horas[2], null, null),
    ponto(horas[3], 0.003, 2),
  ];

  assert.equal(
    resumoDaMetrica({ global, granularidade: 'hora' }, 'emissao'),
    'Total de 3,00 gCO₂e no período, com pico de 2,00 gCO₂e em 17/11, 12:00.',
  );
  assert.equal(
    resumoDaMetrica(
      { global: [...global, ponto(horas[3], 0.004, 3)], granularidade: 'hora' },
      'energia',
    ),
    'Total de 9,00 Wh no período, com pico de 4,00 Wh em 17/11, 12:00. Tendência: subindo.',
  );
  assert.equal(
    resumoDaMetrica(
      { global: [ponto(horas[0], null, null)], granularidade: 'hora' },
      'energia',
    ),
    null,
  );
});

const servico = (servicoId, nome, emissoes) => ({
  servicoId,
  nome,
  serie: emissoes.map((emissao, indice) =>
    ponto(horas[indice], emissao === null ? null : 0.001, emissao),
  ),
});

test('empilha os 5 que mais emitem e soma o resto em Outros', () => {
  const global = horas.map((inicio, indice) =>
    ponto(inicio, 0.01, indice === 2 ? null : 10),
  );
  const servicos = [
    servico(1, 'A', [6, 6, null, 6]),
    servico(2, 'B', [5, 5, null, 5]),
    servico(3, 'C', [4, 4, null, 4]),
    servico(4, 'D', [3, 3, null, 3]),
    servico(5, 'E', [2, 2, null, 2]),
    servico(6, 'F', [1, null, null, 1]),
    servico(7, 'G', [1, 1, null, 1]),
    servico(8, 'Parado', [0, 0, null, 0]),
  ];

  const { camadas, pontos } = montarCamadas({
    intervalos: horas,
    global,
    servicos,
  });

  assert.deepEqual(
    camadas.map(({ chave, nome, totalGCo2e }) => [chave, nome, totalGCo2e]),
    [
      ['servico-1', 'A', 18],
      ['servico-2', 'B', 15],
      ['servico-3', 'C', 12],
      ['servico-4', 'D', 9],
      ['servico-5', 'E', 6],
      ['outros', 'Outros (2)', 5],
    ],
  );
  assert.deepEqual(pontos[1], {
    inicio: horas[1],
    'servico-1': 6,
    'servico-2': 5,
    'servico-3': 4,
    'servico-4': 3,
    'servico-5': 2,
    outros: 1,
  });
  assert.equal(pontos[2]['servico-1'], null);
  assert.equal(pontos[2].outros, null);
  assert.equal(
    resumoDasCamadas(camadas),
    'Os 5 serviços que mais emitem somam 92,3% da emissão do período; o maior é A.',
  );
});

test('sem Outros quando há até 5 serviços emitindo', () => {
  const global = horas.map((inicio) => ponto(inicio, 0.01, 4));
  const { camadas, pontos } = montarCamadas({
    intervalos: horas,
    global,
    servicos: [servico(1, 'A', [3, 3, 3, 3]), servico(2, 'B', [1, 1, 1, 1])],
  });

  assert.deepEqual(
    camadas.map(({ chave }) => chave),
    ['servico-1', 'servico-2'],
  );
  assert.equal('outros' in pontos[0], false);
  assert.equal(
    resumoDasCamadas(camadas),
    'A é o serviço que mais emite: 75% da emissão do período.',
  );
  assert.equal(resumoDasCamadas([]), null);
});

test('desenha o mini gráfico com quebra nas horas sem coleta', () => {
  assert.deepEqual(segmentosDaMiniatura([0, 5, 10], 100, 24), [
    '0,22 50,12 100,2',
  ]);
  assert.deepEqual(segmentosDaMiniatura([10, null, 5, 10], 90, 24), [
    '0,2',
    '60,12 90,2',
  ]);
  assert.deepEqual(segmentosDaMiniatura([0, 0], 90, 24), ['0,22 90,22']);
  assert.deepEqual(segmentosDaMiniatura([null, null], 90, 24), []);
});
