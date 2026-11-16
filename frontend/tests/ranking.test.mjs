import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ehRespostaRanking } from '../src/utils/ranking.ts';

const item = {
  posicao: 1,
  servicoId: 5,
  nome: 'Video Processor',
  energiaKwh: 0.034,
  emissaoGCo2e: 13.1,
  coletasValidas: 24,
};

const resposta = {
  periodo: {
    inicio: '2026-11-11T03:00:00.000Z',
    fim: '2026-11-12T02:59:59.999Z',
  },
  metrica: 'energia',
  itens: [item],
  semDados: [{ servicoId: 6, nome: 'Notification Worker' }],
};

test('aceita a resposta no formato do GET /ranking', () => {
  assert.equal(ehRespostaRanking(resposta), true);
  assert.equal(
    ehRespostaRanking({ ...resposta, itens: [], semDados: [] }),
    true,
  );
});

test('recusa resposta fora do contrato', () => {
  for (const invalida of [
    null,
    [],
    { ...resposta, metrica: 'agua' },
    { ...resposta, periodo: { inicio: '2026-11-11' } },
    { ...resposta, itens: [{ ...item, energiaKwh: null }] },
    { ...resposta, itens: [{ ...item, emissaoGCo2e: -1 }] },
    { ...resposta, itens: [{ ...item, coletasValidas: 2.5 }] },
    { ...resposta, semDados: [{ nome: 'Sem id' }] },
    { ...resposta, semDados: undefined },
  ]) {
    assert.equal(ehRespostaRanking(invalida), false);
  }
});
