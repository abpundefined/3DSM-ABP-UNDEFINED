import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatRegionName,
  formatServiceLocation,
  toFiniteNumber,
} from '../src/utils/formatters.ts';

test('formats known carbon API region codes', () => {
  assert.equal(formatRegionName('br-sudeste'), 'Brasil (Sudeste)');
  assert.equal(formatRegionName('us-east'), 'Estados Unidos (Virgínia)');
  assert.equal(formatRegionName('eu-west'), 'Irlanda (Leinster)');
  assert.equal(formatRegionName('ca-central'), 'Canadá (Ontário)');
  assert.equal(formatRegionName('jp-east'), 'Japão (Tóquio)');
});

test('supports cloud region aliases and case-insensitive input', () => {
  assert.equal(formatRegionName('US-EAST-1'), 'Estados Unidos (Virgínia)');
  assert.equal(formatRegionName('eu-west-1'), 'Irlanda (Leinster)');
});

test('provides a readable fallback for unknown and missing region codes', () => {
  assert.equal(formatRegionName('sa-east-1'), 'SA East 1');
  assert.equal(formatRegionName('desconhecida'), 'Localização não informada');
  assert.equal(formatRegionName(undefined), 'Localização não informada');
});

test('normalizes numeric API values without treating empty values as zero', () => {
  assert.equal(toFiniteNumber('1.234567'), 1.234567);
  assert.equal(toFiniteNumber(0), 0);
  assert.equal(toFiniteNumber(''), null);
  assert.equal(toFiniteNumber('not-a-number'), null);
  assert.equal(toFiniteNumber(null), null);
});

test('formats service location with country, region and city', () => {
  assert.deepEqual(
    formatServiceLocation(
      { pais: 'Brasil', regiao: 'Sudeste', cidade: 'São Paulo' },
      'br-sudeste',
    ),
    { area: 'Brasil · Sudeste', city: 'São Paulo' },
  );
});

test('keeps location readable when city or names are missing', () => {
  assert.deepEqual(
    formatServiceLocation(
      { pais: 'Brasil', regiao: 'Sudeste', cidade: null },
      'br-sudeste',
    ),
    { area: 'Brasil · Sudeste', city: null },
  );
  assert.deepEqual(
    formatServiceLocation(
      { pais: 'Irlanda', regiao: 'Desconhecida', cidade: '  ' },
      'eu-west',
    ),
    { area: 'Irlanda', city: null },
  );
  assert.deepEqual(
    formatServiceLocation(
      { pais: 'Desconhecida', regiao: 'Desconhecida', cidade: null },
      'eu-west',
    ),
    { area: 'Irlanda (Leinster)', city: null },
  );
});

test('falls back to the region code when the location is absent', () => {
  assert.deepEqual(formatServiceLocation(undefined, 'br-sudeste'), {
    area: 'Brasil (Sudeste)',
    city: null,
  });
  assert.deepEqual(formatServiceLocation(null, undefined), {
    area: 'Localização não informada',
    city: null,
  });
});
