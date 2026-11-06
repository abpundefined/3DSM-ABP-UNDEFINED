import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatRegionName } from '../src/utils/formatters.ts';

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
