import test from 'node:test';
import assert from 'node:assert/strict';
import {
  anteriorIndiceTour,
  filtrarPassosDisponiveis,
  jaViuTour,
  marcarTourComoVisto,
  PASSOS_TOUR,
  proximoIndiceTour,
  TOUR_STORAGE_KEY,
} from '../src/utils/tour.ts';

test('tour possui 5 a 6 passos cobrindo período, cards/selo, oportunidades, mapa e metodologia', () => {
  assert.ok(PASSOS_TOUR.length >= 5 && PASSOS_TOUR.length <= 6);
  const ids = PASSOS_TOUR.map((passo) => passo.id);
  assert.ok(ids.includes('periodo'));
  assert.ok(ids.includes('cards-selo'));
  assert.ok(ids.includes('oportunidades'));
  assert.ok(ids.includes('mapa'));
  assert.ok(ids.includes('metodologia'));
});

test('pula passos cujos elementos estão ausentes ou com seletor inválido sem lançar erro', () => {
  const disponiveis = filtrarPassosDisponiveis(
    PASSOS_TOUR,
    (seletor) => !seletor.includes('oportunidades'),
  );
  assert.equal(disponiveis.length, PASSOS_TOUR.length - 1);
  assert.equal(
    disponiveis.some((passo) => passo.id === 'oportunidades'),
    false,
  );

  const comErro = filtrarPassosDisponiveis(PASSOS_TOUR, () => {
    throw new Error('Seletor indisponível');
  });
  assert.deepEqual(comErro, []);
});

test('lê e salva preferência no localStorage com proteção try/catch', () => {
  const memoria = new Map();
  const storage = {
    getItem: (key) => memoria.get(key) ?? null,
    setItem: (key, value) => memoria.set(key, value),
  };

  assert.equal(jaViuTour(storage), false);
  assert.equal(marcarTourComoVisto(storage), true);
  assert.equal(memoria.get(TOUR_STORAGE_KEY), '1');
  assert.equal(jaViuTour(storage), true);

  const storageComFalha = {
    getItem: () => {
      throw new Error('Blocked');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.equal(jaViuTour(storageComFalha), false);
  assert.equal(marcarTourComoVisto(storageComFalha), false);
});

test('navegação entre índices avança até o fim e recua sem ficar negativa', () => {
  assert.equal(proximoIndiceTour(0, 3), 1);
  assert.equal(proximoIndiceTour(2, 3), null);
  assert.equal(anteriorIndiceTour(0), 0);
  assert.equal(anteriorIndiceTour(2), 1);
});
