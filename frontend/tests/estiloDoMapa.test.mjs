import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ESTILO_DO_MAPA,
  ROTULO_EM_PORTUGUES,
  traduzirRotulos,
  usaNomeDoLugar,
} from '../src/utils/estiloDoMapa.ts';

const estilo = {
  version: 8,
  sources: {},
  layers: [
    { id: 'fundo', type: 'background' },
    {
      id: 'cidade',
      type: 'symbol',
      layout: {
        'text-field': [
          'concat',
          ['get', 'name:latin'],
          '\n',
          ['get', 'name:nonlatin'],
        ],
        'text-size': 12,
      },
    },
    {
      id: 'agua',
      type: 'symbol',
      layout: {
        'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
      },
    },
    {
      id: 'escudo',
      type: 'symbol',
      layout: { 'text-field': ['to-string', ['get', 'ref']] },
    },
    { id: 'icone', type: 'symbol', layout: { 'icon-image': 'airport' } },
  ],
};

test('points to the light map style', () => {
  assert.equal(ESTILO_DO_MAPA, 'https://tiles.openfreemap.org/styles/positron');
});

test('detects labels that use a place name', () => {
  assert.equal(usaNomeDoLugar(['get', 'name:latin']), true);
  assert.equal(usaNomeDoLugar('{name_en}'), true);
  assert.equal(usaNomeDoLugar(['to-string', ['get', 'ref']]), false);
  assert.equal(usaNomeDoLugar(undefined), false);
});

test('shows place names in Portuguese and keeps the other labels', () => {
  const traduzido = traduzirRotulos(estilo);
  const porId = Object.fromEntries(
    traduzido.layers.map((camada) => [camada.id, camada]),
  );

  assert.deepEqual(porId.cidade.layout['text-field'], ROTULO_EM_PORTUGUES);
  assert.equal(porId.cidade.layout['text-size'], 12);
  assert.deepEqual(porId.agua.layout['text-field'], ROTULO_EM_PORTUGUES);
  assert.deepEqual(porId.escudo.layout['text-field'], [
    'to-string',
    ['get', 'ref'],
  ]);
  assert.equal(porId.icone, estilo.layers[4]);
  assert.equal(porId.fundo, estilo.layers[0]);
  assert.notEqual(traduzido, estilo);
  assert.equal(
    estilo.layers[1].layout['text-field'][0],
    'concat',
    'does not change the original style',
  );
});

test('falls back from Portuguese to the Latin and local names', () => {
  assert.deepEqual(ROTULO_EM_PORTUGUES, [
    'coalesce',
    ['get', 'name:pt'],
    ['get', 'name:latin'],
    ['get', 'name'],
  ]);
});
