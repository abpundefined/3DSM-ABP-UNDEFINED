import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  consultaDoRanking,
  ehRespostaRanking,
  lerMetrica,
  escreverMetrica,
} from '../src/utils/ranking.ts';

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

test('lê a métrica da URL e usa energia quando ela falta ou é inválida', () => {
  assert.equal(lerMetrica(new URLSearchParams('metrica=emissao')), 'emissao');
  assert.equal(lerMetrica(new URLSearchParams('metrica=energia')), 'energia');
  assert.equal(lerMetrica(new URLSearchParams()), 'energia');
  assert.equal(lerMetrica(new URLSearchParams('metrica=toString')), 'energia');
});

test('grava a métrica na URL sem perder o período', () => {
  const params = new URLSearchParams('periodo=7d');

  assert.equal(
    escreverMetrica(params, 'emissao').toString(),
    'periodo=7d&metrica=emissao',
  );
  assert.equal(
    escreverMetrica(
      new URLSearchParams('periodo=7d&metrica=emissao'),
      'energia',
    ).toString(),
    'periodo=7d',
  );
  assert.equal(params.toString(), 'periodo=7d');
});

test('monta a consulta do GET /ranking com o período, a métrica e o limite', () => {
  assert.equal(consultaDoRanking('', 'energia'), '?metrica=energia&limite=10');
  assert.equal(
    consultaDoRanking('?periodo=7d', 'emissao'),
    '?periodo=7d&metrica=emissao&limite=10',
  );
  const personalizado = new URLSearchParams(
    consultaDoRanking(
      '?inicio=2026-11-01T00%3A00%3A00.000-03%3A00&fim=2026-11-07T23%3A59%3A59.999-03%3A00',
      'energia',
    ),
  );
  assert.equal(personalizado.get('inicio'), '2026-11-01T00:00:00.000-03:00');
  assert.equal(personalizado.get('fim'), '2026-11-07T23:59:59.999-03:00');
  assert.equal(personalizado.get('metrica'), 'energia');
});
