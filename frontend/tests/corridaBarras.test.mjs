import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatarRotuloQuadroCorrida,
  montarQuadrosCorrida,
  proximoQuadroCorrida,
} from '../src/utils/corridaBarras.ts';

const serieExemplo = {
  periodo: {
    inicio: '2026-11-11T03:00:00.000Z',
    fim: '2026-11-11T06:00:00.000Z',
  },
  granularidade: 'hora',
  intervalos: [
    '2026-11-11T03:00:00.000Z',
    '2026-11-11T04:00:00.000Z',
    '2026-11-11T05:00:00.000Z',
  ],
  global: [
    { inicio: '2026-11-11T03:00:00.000Z', energiaKwh: 1, emissaoGCo2e: 15 },
    { inicio: '2026-11-11T04:00:00.000Z', energiaKwh: 2, emissaoGCo2e: 25 },
    { inicio: '2026-11-11T05:00:00.000Z', energiaKwh: 3, emissaoGCo2e: 35 },
  ],
  servicos: [
    {
      servicoId: 1,
      nome: 'API Alpha',
      serie: [
        {
          inicio: '2026-11-11T03:00:00.000Z',
          energiaKwh: 0.5,
          emissaoGCo2e: 10,
        },
        {
          inicio: '2026-11-11T04:00:00.000Z',
          energiaKwh: null,
          emissaoGCo2e: null,
        },
        {
          inicio: '2026-11-11T05:00:00.000Z',
          energiaKwh: 0.2,
          emissaoGCo2e: 5,
        },
      ],
    },
    {
      servicoId: 2,
      nome: 'Worker Beta',
      serie: [
        {
          inicio: '2026-11-11T03:00:00.000Z',
          energiaKwh: 0.2,
          emissaoGCo2e: 5,
        },
        {
          inicio: '2026-11-11T04:00:00.000Z',
          energiaKwh: 1.0,
          emissaoGCo2e: 20,
        },
        {
          inicio: '2026-11-11T05:00:00.000Z',
          energiaKwh: 1.5,
          emissaoGCo2e: 30,
        },
      ],
    },
    {
      servicoId: 3,
      nome: 'Sem Emissão',
      serie: [
        {
          inicio: '2026-11-11T03:00:00.000Z',
          energiaKwh: null,
          emissaoGCo2e: null,
        },
        { inicio: '2026-11-11T04:00:00.000Z', energiaKwh: 0, emissaoGCo2e: 0 },
        {
          inicio: '2026-11-11T05:00:00.000Z',
          energiaKwh: null,
          emissaoGCo2e: null,
        },
      ],
    },
  ],
};

test('monta quadros acumulados e reordena serviços quando há ultrapassagem', () => {
  const quadros = montarQuadrosCorrida(serieExemplo);
  assert.equal(quadros.length, 3);

  // Quadro 0: Alpha (10) > Beta (5)
  assert.deepEqual(
    quadros[0].itens.map((i) => [i.nome, i.acumuladoGCo2e, i.posicao]),
    [
      ['API Alpha', 10, 1],
      ['Worker Beta', 5, 2],
    ],
  );
  assert.equal(quadros[0].itens[0].percentualLargura, 100);
  assert.equal(quadros[0].itens[1].percentualLargura, 50);

  // Quadro 1: Beta acumula 25 e ultrapassa Alpha (mantém 10 apesar de null no intervalo)
  assert.deepEqual(
    quadros[1].itens.map((i) => [i.nome, i.acumuladoGCo2e, i.posicao]),
    [
      ['Worker Beta', 25, 1],
      ['API Alpha', 10, 2],
    ],
  );
  assert.equal(quadros[1].totalAcumuladoGCo2e, 35);

  // Quadro 2: Beta chega a 55 e Alpha a 15
  assert.deepEqual(
    quadros[2].itens.map((i) => [i.nome, i.acumuladoGCo2e, i.posicao]),
    [
      ['Worker Beta', 55, 1],
      ['API Alpha', 15, 2],
    ],
  );
});

test('respeita limite de barras, retorna vazio sem emissões e formata datas em Brasília', () => {
  const limitado = montarQuadrosCorrida(serieExemplo, 1);
  assert.equal(limitado[0].itens.length, 1);
  assert.equal(limitado[0].itens[0].nome, 'API Alpha');

  const semEmissoes = montarQuadrosCorrida({
    ...serieExemplo,
    servicos: [serieExemplo.servicos[2]],
  });
  assert.deepEqual(semEmissoes, []);

  assert.equal(
    formatarRotuloQuadroCorrida('2026-11-11T03:00:00.000Z', 'hora'),
    '11/11/2026, 00:00',
  );
  assert.equal(
    formatarRotuloQuadroCorrida('2026-11-11T03:00:00.000Z', 'dia'),
    '11/11/2026',
  );
  assert.equal(proximoQuadroCorrida(0, 3), 1);
  assert.equal(proximoQuadroCorrida(2, 3), null);
});
