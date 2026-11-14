import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapaDemo } from '../src/mocks/mapa.ts';
import {
  LATITUDE_MAXIMA,
  agruparPorLocal,
  arrastar,
  centralizar,
  estaVisivel,
  interpolarRotacao,
  normalizarLongitude,
  suavizar,
} from '../src/utils/globo.ts';

const perto = (a, b) => Math.abs(a - b) < 1e-9;

test('normalizes longitudes to the -180..180 range', () => {
  assert.equal(normalizarLongitude(190), -170);
  assert.equal(normalizarLongitude(-190), 170);
  assert.equal(normalizarLongitude(540), -180);
  assert.equal(normalizarLongitude(45), 45);
});

test('groups services that share the same coordinates', () => {
  const locais = agruparPorLocal(mapaDemo.servicos);

  assert.equal(locais.length, 5);
  const saoPaulo = locais.find(({ local }) => local === 'Brasil · São Paulo');
  assert.deepEqual(
    saoPaulo.servicos.map(({ nome }) => nome),
    ['Auth Service', 'Catalog API', 'Billing Service'],
  );
  const soma = saoPaulo.servicos.reduce(
    (total, { totais }) => total + totais.emissaoGCo2e,
    0,
  );
  assert.ok(perto(saoPaulo.totais.emissaoGCo2e, soma));
});

test('keeps totals null for a location without calculated data', () => {
  const dublin = agruparPorLocal(mapaDemo.servicos).find(
    ({ local }) => local === 'Irlanda · Dublin',
  );

  assert.deepEqual(dublin.totais, { energiaKwh: null, emissaoGCo2e: null });
});

test('centers the globe on a location and limits the latitude', () => {
  assert.deepEqual(centralizar(-46.6333, -23.5505), [46.6333, 23.5505, 0]);
  assert.deepEqual(centralizar(139.65, 85), [-139.65, -LATITUDE_MAXIMA, 0]);
});

test('drags horizontally without limit and vertically within the range', () => {
  assert.deepEqual(arrastar([170, 0, 0], 100, 0, 0.25), [-165, 0, 0]);
  assert.deepEqual(arrastar([0, 0, 0], 0, -1000, 0.25), [
    0,
    LATITUDE_MAXIMA,
    0,
  ]);
  assert.deepEqual(arrastar([10, 20, 0], 40, 40, 0.5), [30, 0, 0]);
});

test('interpolates the rotation through the shortest longitude path', () => {
  const meio = interpolarRotacao([170, 0, 0], [-170, 20, 0], 0.5);

  assert.ok(perto(Math.abs(meio[0]), 180));
  assert.ok(perto(meio[1], 10));
  assert.deepEqual(interpolarRotacao([10, 5, 0], [40, -5, 0], 0), [10, 5, 0]);
  assert.deepEqual(interpolarRotacao([10, 5, 0], [40, -5, 0], 1), [40, -5, 0]);
});

test('eases the animation from 0 to 1 symmetrically', () => {
  assert.equal(suavizar(0), 0);
  assert.equal(suavizar(1), 1);
  assert.equal(suavizar(0.5), 0.5);
  assert.ok(suavizar(0.25) < 0.25);
  assert.ok(suavizar(0.75) > 0.75);
  assert.equal(suavizar(-1), 0);
  assert.equal(suavizar(2), 1);
});

test('detects whether a point is on the visible side of the globe', () => {
  const sobreSaoPaulo = centralizar(-46.6333, -23.5505);

  assert.equal(estaVisivel(sobreSaoPaulo, -46.6333, -23.5505), true);
  assert.equal(estaVisivel(sobreSaoPaulo, 139.6503, 35.6762), false);
});
