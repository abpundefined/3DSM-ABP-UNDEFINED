import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapaDemo } from '../src/mocks/mapa.ts';

const soma = (valores) =>
  valores
    .filter((valor) => valor !== null)
    .reduce((total, valor) => total + valor, 0);

test('demo map has hourly intervals covering the period', () => {
  const { periodo, intervalos, granularidade } = mapaDemo;

  assert.equal(granularidade, 'hora');
  assert.equal(intervalos.length, 24);
  assert.equal(intervalos[0], periodo.inicio);
  assert.ok(Date.parse(intervalos.at(-1)) < Date.parse(periodo.fim));
  intervalos.slice(1).forEach((intervalo, indice) => {
    assert.equal(
      Date.parse(intervalo) - Date.parse(intervalos[indice]),
      3_600_000,
    );
  });
});

test('every service series is aligned with the intervals', () => {
  for (const servico of mapaDemo.servicos) {
    assert.equal(
      servico.serie.length,
      mapaDemo.intervalos.length,
      servico.nome,
    );
  }
});

test('service totals match the sum of its series', () => {
  for (const { nome, serie, totais } of mapaDemo.servicos) {
    if (serie.every((valor) => valor === null)) {
      assert.deepEqual(totais, { energiaKwh: null, emissaoGCo2e: null }, nome);
      continue;
    }

    assert.ok(Math.abs(totais.emissaoGCo2e - soma(serie)) < 1e-4, nome);
    assert.ok(totais.energiaKwh > 0, nome);
  }
});

test('coordinates are valid and ids are unique across both lists', () => {
  for (const { nome, latitude, longitude } of mapaDemo.servicos) {
    assert.ok(latitude >= -90 && latitude <= 90, nome);
    assert.ok(longitude >= -180 && longitude <= 180, nome);
  }

  const ids = [...mapaDemo.servicos, ...mapaDemo.semCoordenadas].map(
    ({ servicoId }) => servicoId,
  );
  assert.equal(new Set(ids).size, ids.length);
});

test('demo covers the states the map must render', () => {
  const estados = new Set(
    [...mapaDemo.servicos, ...mapaDemo.semCoordenadas].map(
      ({ estado }) => estado,
    ),
  );

  for (const estado of [
    'DISPONIVEL',
    'INDISPONIVEL',
    'SEM_METRICAS',
    'DESCONHECIDO',
  ]) {
    assert.ok(estados.has(estado), estado);
  }
  assert.ok(
    mapaDemo.servicos.some(({ serie }) =>
      serie.some((valor) => valor === null),
    ),
  );
});
