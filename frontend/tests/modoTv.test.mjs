import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estaEmModoTv,
  INTERVALO_MODO_TV_MS,
  montarSearchModoTv,
  removerModoTvDoSearch,
  resolverTelaModoTv,
  TELAS_MODO_TV,
} from '../src/utils/modoTv.ts';

test('configuração do modo TV usa ciclo de 10 s entre Dashboard, Mapa e Ranking', () => {
  assert.equal(INTERVALO_MODO_TV_MS, 10_000);
  assert.deepEqual(
    TELAS_MODO_TV.map((t) => t.rota),
    ['/', '/mapa', '/ranking'],
  );
});

test('detecta ?tv=1 e alterna corretamente entre Dashboard, Mapa e Ranking', () => {
  assert.equal(estaEmModoTv('?tv=1'), true);
  assert.equal(estaEmModoTv('?periodo=7d&tv=1'), true);
  assert.equal(estaEmModoTv('?periodo=7d'), false);
  assert.equal(estaEmModoTv('?tv=0'), false);

  assert.equal(resolverTelaModoTv('/').proxima.rota, '/mapa');
  assert.equal(resolverTelaModoTv('/mapa').proxima.rota, '/ranking');
  assert.equal(resolverTelaModoTv('/ranking').proxima.rota, '/');
  assert.equal(resolverTelaModoTv('/comparar').proxima.rota, '/mapa');
});

test('preserva período e demais parâmetros da URL ao manter ou sair do modo TV', () => {
  assert.equal(
    montarSearchModoTv('?periodo=7d&demo=1'),
    '?periodo=7d&demo=1&tv=1',
  );
  assert.equal(
    removerModoTvDoSearch('?periodo=7d&tv=1&demo=1'),
    '?periodo=7d&demo=1',
  );
  assert.equal(removerModoTvDoSearch('?tv=1'), '');
});
