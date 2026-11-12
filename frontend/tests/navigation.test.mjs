import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getNavItems } from '../src/navigation.ts';

test('getNavItems(false) retorna apenas os caminhos públicos', () => {
  assert.deepEqual(
    getNavItems(false).map((item) => item.to),
    ['/', '/ranking', '/comparar', '/mapa', '/metodologia'],
  );
});

test('getNavItems(true) inclui Admin como último item', () => {
  const items = getNavItems(true);

  assert.equal(items.length, 6);
  assert.equal(items.at(-1)?.to, '/admin');
});
