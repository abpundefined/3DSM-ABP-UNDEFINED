import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_PERIOD,
  defaultCustomRange,
  describePeriod,
  readPeriod,
  toApiQuery,
  toLinkSearch,
  validateCustomRange,
  writePeriod,
} from '../src/utils/period.ts';

const now = new Date('2026-11-13T12:11:00Z');

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

test('converte o período para os parâmetros da API', () => {
  assert.equal(toApiQuery(DEFAULT_PERIOD), '');
  assert.equal(
    toApiQuery({ kind: 'preset', preset: 'mes-anterior' }),
    '?periodo=mes-anterior',
  );

  const query = new URLSearchParams(
    toApiQuery({ kind: 'custom', inicio: '2026-11-01', fim: '2026-11-07' }),
  );
  assert.equal(query.get('inicio'), '2026-11-01T00:00:00.000-03:00');
  assert.equal(query.get('fim'), '2026-11-07T23:59:59.999-03:00');
});

test('valida o período personalizado', () => {
  assert.equal(validateCustomRange('2026-11-01', '2026-11-07'), null);
  assert.equal(validateCustomRange('2026-11-07', '2026-11-07'), null);
  assert.equal(validateCustomRange('2026-08-10', '2026-11-07'), null);
  assert.match(validateCustomRange('', '2026-11-07'), /Informe a data/);
  assert.match(validateCustomRange('2026-11-10', '2026-11-01'), /posterior/);
  assert.match(validateCustomRange('2026-08-09', '2026-11-07'), /90 dias/);
});
test('descreve cada atalho por extenso no fuso de São Paulo', () => {
  const describe = (preset) => describePeriod({ kind: 'preset', preset }, now);
  assert.equal(describe('24h'), '12/11/2026, 09:11 a 13/11/2026, 09:11');
  assert.equal(describe('7d'), '06/11 a 13/11/2026');
  assert.equal(describe('30d'), '14/10 a 13/11/2026');
  assert.equal(describe('mes-atual'), '01/11 a 13/11/2026');
  assert.equal(describe('mes-anterior'), '01/10 a 31/10/2026');
});

test('descreve virada de ano e de dia no fuso de São Paulo', () => {
  const january = new Date('2026-01-03T15:00:00Z');
  assert.equal(
    describePeriod({ kind: 'preset', preset: '7d' }, january),
    '27/12/2025 a 03/01/2026',
  );
  assert.equal(
    describePeriod({ kind: 'preset', preset: 'mes-anterior' }, january),
    '01/12 a 31/12/2025',
  );
  const lateNight = new Date('2026-11-13T02:00:00Z');
  assert.equal(
    describePeriod({ kind: 'preset', preset: 'mes-atual' }, lateNight),
    '01/11 a 12/11/2026',
  );
});

test('descreve o período personalizado e sugere os últimos 7 dias', () => {
  assert.equal(
    describePeriod(
      { kind: 'custom', inicio: '2026-11-01', fim: '2026-11-07' },
      now,
    ),
    '01/11 a 07/11/2026',
  );
  assert.deepEqual(defaultCustomRange(now), {
    inicio: '2026-11-07',
    fim: '2026-11-13',
  });
});
