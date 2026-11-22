import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ehCliqueSimplesNavegacao,
  executarComViewTransition,
  suportaViewTransition,
} from '../src/utils/viewTransitions.ts';

test('usa View Transitions API quando suportada e movimento reduzido está desligado', () => {
  let transicoes = 0;
  let atualizacoes = 0;
  const doc = {
    startViewTransition(callback) {
      transicoes += 1;
      callback();
    },
  };
  const win = {
    matchMedia: () => ({ matches: false }),
  };

  assert.equal(suportaViewTransition(doc, win), true);
  assert.equal(
    executarComViewTransition(
      () => {
        atualizacoes += 1;
      },
      doc,
      win,
    ),
    true,
  );
  assert.equal(transicoes, 1);
  assert.equal(atualizacoes, 1);
});

test('faz fallback imediato sem transição quando a API não existe ou prefers-reduced-motion está ativo', () => {
  let atualizacoes = 0;
  assert.equal(
    suportaViewTransition({}, { matchMedia: () => ({ matches: false }) }),
    false,
  );
  assert.equal(
    executarComViewTransition(
      () => {
        atualizacoes += 1;
      },
      {},
      { matchMedia: () => ({ matches: false }) },
    ),
    false,
  );
  assert.equal(atualizacoes, 1);

  let startCalled = false;
  const docComApi = {
    startViewTransition(cb) {
      startCalled = true;
      cb();
    },
  };
  const winReduzido = { matchMedia: () => ({ matches: true }) };
  assert.equal(suportaViewTransition(docComApi, winReduzido), false);
  assert.equal(
    executarComViewTransition(
      () => {
        atualizacoes += 1;
      },
      docComApi,
      winReduzido,
    ),
    false,
  );
  assert.equal(startCalled, false);
  assert.equal(atualizacoes, 2);
});

test('ignora cliques modificados ou não principais na interceptação de navegação', () => {
  assert.equal(
    ehCliqueSimplesNavegacao({
      button: 0,
      defaultPrevented: false,
      metaKey: false,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
    }),
    true,
  );
  assert.equal(
    ehCliqueSimplesNavegacao({
      button: 0,
      defaultPrevented: false,
      metaKey: false,
      altKey: false,
      ctrlKey: true,
      shiftKey: false,
    }),
    false,
  );
  assert.equal(
    ehCliqueSimplesNavegacao({
      button: 1,
      defaultPrevented: false,
      metaKey: false,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
    }),
    false,
  );
});
