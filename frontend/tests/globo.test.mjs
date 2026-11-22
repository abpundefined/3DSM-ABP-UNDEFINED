import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapaDemo } from '../src/mocks/mapa.ts';
import {
  LATITUDE_MAXIMA,
  ZOOM_DE_TRANSICAO,
  ZOOM_MINIMO_DO_GLOBO,
  agruparPorLocal,
  amortecer,
  aproximarZoom,
  arrastar,
  centralizar,
  centroDaRotacao,
  estaVisivel,
  girarComVelocidade,
  interpolarRotacao,
  limitarVelocidade,
  limitarZoomDoGlobo,
  normalizarLongitude,
  suavizar,
  tempoComAtrito,
  zoomEquivalenteNoMapa,
  zoomPelaRoda,
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

test('rotates by a velocity and keeps the latitude within the range', () => {
  assert.deepEqual(girarComVelocidade([170, 0, 0], [0.5, 0], 40), [-170, 0, 0]);
  assert.deepEqual(girarComVelocidade([0, 60, 0], [0, 1, 0], 100), [
    0,
    LATITUDE_MAXIMA,
    0,
  ]);
});

test('slows the inertia down and stops it below the minimum speed', () => {
  const metade = amortecer([1, -0.5], Math.LN2 * 100, 100, 0.01);

  assert.ok(perto(metade[0], 0.5));
  assert.ok(perto(metade[1], -0.25));
  assert.deepEqual(amortecer([0.012, 0], 100, 100, 0.01), [0, 0]);
});

test('caps the drag speed keeping its direction', () => {
  assert.deepEqual(limitarVelocidade([0.3, 0.4], 1), [0.3, 0.4]);
  const limitada = limitarVelocidade([3, 4], 1);
  assert.ok(perto(limitada[0], 0.6));
  assert.ok(perto(limitada[1], 0.8));
});

test('eases the zoom toward the target and snaps when close', () => {
  const proximo = aproximarZoom(1, 2, 100, 100);

  assert.ok(perto(proximo, 2 - Math.exp(-1)));
  assert.equal(aproximarZoom(1.9995, 2, 16, 100), 2);
  assert.equal(aproximarZoom(1, 2, 0, 100), 1);
});

test('zooms with the wheel within the globe limits', () => {
  assert.ok(zoomPelaRoda(1, -100) > 1);
  assert.equal(zoomPelaRoda(1, 500), ZOOM_MINIMO_DO_GLOBO);
  assert.equal(zoomPelaRoda(2.5, -2000), ZOOM_DE_TRANSICAO);
  assert.equal(limitarZoomDoGlobo(0.4), ZOOM_MINIMO_DO_GLOBO);
});

test('finds the globe center and the equivalent map zoom', () => {
  assert.deepEqual(centroDaRotacao([46.6333, 23.5505, 0]), {
    longitude: -46.6333,
    latitude: -23.5505,
  });
  assert.equal(zoomEquivalenteNoMapa(236 * 3), 4);
  assert.equal(zoomEquivalenteNoMapa(10), 2);
  assert.equal(zoomEquivalenteNoMapa(100000), 8);
});

test('glides the same distance whatever the frame rate', () => {
  const percorrer = (intervalo) => {
    let total = 0;
    for (let tempo = 0; tempo < 4000; tempo += intervalo) {
      total += tempoComAtrito(intervalo, 400) * Math.exp(-tempo / 400);
    }
    return total * 0.03;
  };

  assert.ok(Math.abs(percorrer(16) - 12) < 0.01);
  assert.ok(Math.abs(percorrer(200) - 12) < 0.01);
  assert.equal(tempoComAtrito(0, 400), 0);
});
