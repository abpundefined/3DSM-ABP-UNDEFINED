import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_PERIOD,
  readPeriod,
  toLinkSearch,
  validateCustomRange,
  writePeriod,
} from '../src/utils/period.ts';

test('sem parâmetros na URL o período é 24 horas', () => {
  assert.deepEqual(readPeriod(new URLSearchParams()), DEFAULT_PERIOD);
});

test('lê atalho e período personalizado da URL', () => {
  assert.deepEqual(readPeriod(new URLSearchParams('periodo=7d')), {
    kind: 'preset',
    preset: '7d',
  });
  assert.deepEqual(
    readPeriod(new URLSearchParams('inicio=2026-11-01&fim=2026-11-07')),
    { kind: 'custom', inicio: '2026-11-01', fim: '2026-11-07' },
  );
});

test('URL inválida volta para o período padrão', () => {
  for (const search of [
    'periodo=1ano',
    'periodo=toString',
    'periodo=7d&inicio=2026-11-01&fim=2026-11-07',
    'inicio=2026-11-01',
    'inicio=2026-11-10&fim=2026-11-01',
    'inicio=2026-02-31&fim=2026-03-01',
  ]) {
    assert.deepEqual(readPeriod(new URLSearchParams(search)), DEFAULT_PERIOD);
  }
});

test('grava o período na URL sem perder os outros parâmetros', () => {
  const params = new URLSearchParams('demo=1&periodo=30d');
  assert.equal(
    writePeriod(params, { kind: 'preset', preset: 'mes-atual' }).toString(),
    'demo=1&periodo=mes-atual',
  );
  assert.equal(
    writePeriod(params, {
      kind: 'custom',
      inicio: '2026-11-01',
      fim: '2026-11-07',
    }).toString(),
    'demo=1&inicio=2026-11-01&fim=2026-11-07',
  );
  assert.equal(writePeriod(params, DEFAULT_PERIOD).toString(), 'demo=1');
  assert.equal(params.toString(), 'demo=1&periodo=30d');
});

test('monta o trecho de URL usado nos links do menu', () => {
  assert.equal(toLinkSearch(DEFAULT_PERIOD), '');
  assert.equal(toLinkSearch({ kind: 'preset', preset: '7d' }), '?periodo=7d');
});

test('valida o período personalizado', () => {
  assert.equal(validateCustomRange('2026-11-01', '2026-11-07'), null);
  assert.equal(validateCustomRange('2026-11-07', '2026-11-07'), null);
  assert.equal(validateCustomRange('2026-08-10', '2026-11-07'), null);
  assert.match(validateCustomRange('', '2026-11-07'), /Informe a data/);
  assert.match(validateCustomRange('2026-11-10', '2026-11-01'), /posterior/);
  assert.match(validateCustomRange('2026-08-09', '2026-11-07'), /90 dias/);
});
