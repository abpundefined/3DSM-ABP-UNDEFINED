import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  emissaoNoMomento,
  ordenarPorEmissaoNoMomento,
  proximoIndice,
  rotuloDoIntervalo,
  somarNoMomento,
  somasDosIntervalos,
} from '../src/utils/linhaDoTempo.ts';

function servico(emissaoGCo2e, serie) {
  return {
    servicoId: 1,
    nome: 'Serviço',
    estado: 'DISPONIVEL',
    regiaoCodigo: 'br-sudeste',
    latitude: -23.55,
    longitude: -46.63,
    local: 'Brasil · São Paulo',
    totais: { energiaKwh: null, emissaoGCo2e },
    serie,
  };
}

test('formats interval labels in the São Paulo time zone', () => {
  assert.equal(
    rotuloDoIntervalo('2026-11-11T17:00:00.000Z', 'hora'),
    '11/11, 14:00',
  );
  assert.equal(rotuloDoIntervalo('2026-11-12T02:00:00.000Z', 'dia'), '11/11');
});

test('uses the period total without an interval and the series value with one', () => {
  const comSerie = servico(0.6, [0.1, null, 0.5]);

  assert.equal(emissaoNoMomento(comSerie, null), 0.6);
  assert.equal(emissaoNoMomento(comSerie, 0), 0.1);
  assert.equal(emissaoNoMomento(comSerie, 1), null);
  assert.equal(emissaoNoMomento(comSerie, 9), null);
});

test('sums an interval ignoring missing values and keeps null when all are missing', () => {
  const servicos = [servico(0.3, [0.1, null]), servico(0.2, [0.2, null])];

  assert.ok(Math.abs(somarNoMomento(servicos, 0) - 0.3) < 1e-12);
  assert.equal(somarNoMomento(servicos, 1), null);
  assert.ok(Math.abs(somarNoMomento(servicos, null) - 0.5) < 1e-12);
  assert.equal(somarNoMomento([], 0), null);
});

test('lists the sum of every interval for each group', () => {
  const saoPaulo = [servico(null, [0.1, 0.4]), servico(null, [0.3, 0.2])];
  const dublin = [servico(null, [0.5, null])];
  const somas = somasDosIntervalos([saoPaulo, dublin], 2);

  assert.equal(somas.length, 4);
  assert.ok(Math.abs(somas[0] - 0.4) < 1e-12);
  assert.ok(Math.abs(somas[1] - 0.6) < 1e-12);
  assert.deepEqual(somas.slice(2), [0.5, null]);
  assert.deepEqual(somasDosIntervalos([], 2), []);
});

test('advances the interval and restarts after the last one', () => {
  assert.equal(proximoIndice(null, 3), 0);
  assert.equal(proximoIndice(0, 3), 1);
  assert.equal(proximoIndice(2, 3), 0);
  assert.equal(proximoIndice(null, 0), null);
});

test('orders locations by emission at the moment, leaving missing data last', () => {
  const grupos = [
    { local: 'Irlanda · Dublin', servicos: [servico(null, [null, null])] },
    { local: 'Japão · Tóquio', servicos: [servico(0.4, [0.1, 0.3])] },
    { local: 'Canadá · Toronto', servicos: [servico(0.4, [0.2, 0.2])] },
    { local: 'Brasil · São Paulo', servicos: [servico(0.9, [0.5, 0.4])] },
  ];
  const nomes = (lista) => lista.map(({ local }) => local);

  assert.deepEqual(nomes(ordenarPorEmissaoNoMomento(grupos, null)), [
    'Brasil · São Paulo',
    'Canadá · Toronto',
    'Japão · Tóquio',
    'Irlanda · Dublin',
  ]);
  assert.deepEqual(nomes(ordenarPorEmissaoNoMomento(grupos, 1)), [
    'Brasil · São Paulo',
    'Japão · Tóquio',
    'Canadá · Toronto',
    'Irlanda · Dublin',
  ]);
  assert.equal(grupos[0].local, 'Irlanda · Dublin');
});
