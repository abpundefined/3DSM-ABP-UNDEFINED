import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapaDemo } from '../src/mocks/mapa.ts';
import { rankingDemo } from '../src/mocks/ranking.ts';
import { ehRespostaRanking } from '../src/utils/ranking.ts';

test('o ranking de demonstração segue o contrato do GET /ranking', () => {
  for (const metrica of ['energia', 'emissao']) {
    const ranking = rankingDemo(metrica);
    assert.equal(ehRespostaRanking(ranking), true);
    assert.equal(ranking.metrica, metrica);
    assert.deepEqual(ranking.periodo, mapaDemo.periodo);
  }
});

test('ordena do maior para o menor e numera as posições', () => {
  for (const [metrica, campo] of [
    ['energia', 'energiaKwh'],
    ['emissao', 'emissaoGCo2e'],
  ]) {
    const { itens } = rankingDemo(metrica);
    itens.forEach((item, indice) => {
      assert.equal(item.posicao, indice + 1);
      if (indice > 0) {
        assert.ok(itens[indice - 1][campo] >= item[campo], item.nome);
      }
    });
  }
});

test('usa os mesmos serviços do mapa e separa os que não têm dados', () => {
  const { itens, semDados } = rankingDemo('energia');
  const total = mapaDemo.servicos.length + mapaDemo.semCoordenadas.length;

  assert.equal(itens.length + semDados.length, total);
  assert.deepEqual(
    semDados.map(({ nome }) => nome),
    ['Legacy Batch', 'Notification Worker'],
  );
});

test('a ordem muda com a métrica, porque cada região tem outra intensidade', () => {
  const porEnergia = rankingDemo('energia').itens.map(({ nome }) => nome);
  const porEmissao = rankingDemo('emissao').itens.map(({ nome }) => nome);

  assert.notDeepEqual(porEnergia, porEmissao);
});
