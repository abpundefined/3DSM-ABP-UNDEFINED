import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildComparisonApiQuery,
  buildComparisonLinkSearch,
  compareCarbonIntensity,
  parseComparisonSelection,
} from '../src/utils/comparacao.ts';

test('parseia IDs válidos e informa IDs inválidos ou repetidos', () => {
  assert.deepEqual(parseComparisonSelection(null), {
    serviceIds: [],
    invalid: false,
  });
  assert.deepEqual(parseComparisonSelection('3,8'), {
    serviceIds: [3, 8],
    invalid: false,
  });
  assert.deepEqual(parseComparisonSelection('3,3,abc,0'), {
    serviceIds: [3],
    invalid: true,
  });
});

test('adiciona a seleção à URL sem descartar o período', () => {
  const search = buildComparisonLinkSearch([3, 8], '?periodo=7d');
  const params = new URLSearchParams(search);
  assert.equal(params.get('periodo'), '7d');
  assert.equal(params.get('servicos'), '3,8');

  const query = buildComparisonApiQuery(
    [3, 8],
    '?inicio=2026-11-10&fim=2026-11-11',
  );
  const apiParams = new URLSearchParams(query);
  assert.equal(apiParams.get('inicio'), '2026-11-10');
  assert.equal(apiParams.get('fim'), '2026-11-11');
  assert.equal(apiParams.get('servicos'), '3,8');
});

test('calcula intensidade ponderada e não divide por energia ausente ou zero', () => {
  assert.equal(compareCarbonIntensity(2, 500), 250);
  assert.equal(compareCarbonIntensity(0, 500), null);
  assert.equal(compareCarbonIntensity(null, 500), null);
  assert.equal(compareCarbonIntensity(2, null), null);
});
