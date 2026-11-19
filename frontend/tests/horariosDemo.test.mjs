import assert from 'node:assert/strict';
import { test } from 'node:test';
import { horariosDemo } from '../src/mocks/horarios.ts';
import { mapaDemo } from '../src/mocks/mapa.ts';
import { simulacaoDemo } from '../src/mocks/simulacao.ts';
import { ehRespostaHorarios, temAmostras } from '../src/utils/horarios.ts';

const codigos = [
  ...new Set(mapaDemo.servicos.map(({ regiaoCodigo }) => regiaoCodigo)),
];

function melhorMediaPorForcaBruta(matriz) {
  const celulas = matriz.flat();
  let melhor = null;

  for (let inicio = 0; inicio < celulas.length; inicio += 1) {
    const janela = [0, 1, 2].map(
      (passo) => celulas[(inicio + passo) % celulas.length],
    );
    if (!janela.every(temAmostras)) {
      continue;
    }
    const amostras = janela.reduce((s, c) => s + c.quantidadeAmostras, 0);
    const media =
      janela.reduce((s, c) => s + c.media * c.quantidadeAmostras, 0) / amostras;
    melhor = melhor === null ? media : Math.min(melhor, media);
  }

  return melhor;
}

test('demo hours follow the API contract for every region and for all of them', () => {
  for (const regiao of [null, ...codigos]) {
    assert.equal(ehRespostaHorarios(horariosDemo(regiao)), true, `${regiao}`);
  }
});

test('demo best window is the lowest 3-hour mean of the matrix', () => {
  for (const regiao of [null, ...codigos]) {
    const { matriz, melhorJanela } = horariosDemo(regiao);
    const esperado = melhorMediaPorForcaBruta(matriz);

    if (esperado === null) {
      assert.equal(melhorJanela, null, `${regiao}`);
    } else {
      assert.ok(
        Math.abs(melhorJanela.mediaJanela - esperado) < 1e-9,
        `${regiao}`,
      );
    }
  }
});

test('demo region without intensity has no samples and no best window', () => {
  const semDados = simulacaoDemo(1).regioes.find(
    (regiao) => regiao.intensidadeGCo2ePorKwh === null,
  );
  const demo = horariosDemo(semDados.codigo);

  assert.equal(demo.matriz.flat().filter(temAmostras).length, 0);
  assert.equal(demo.melhorJanela, null);
});

test('demo shows a region with a gap, so the pattern for missing hours appears', () => {
  const celulas = horariosDemo('jp-east').matriz.flat();
  const semAmostras = celulas.filter((celula) => !temAmostras(celula));

  assert.ok(semAmostras.length > 0);
  assert.ok(semAmostras.length < celulas.length);
  assert.notEqual(horariosDemo('jp-east').melhorJanela, null);
});

test('demo intensity stays near the region intensity used by the map', () => {
  const { regioes } = simulacaoDemo(1);

  for (const { codigo, intensidadeGCo2ePorKwh } of regioes) {
    if (intensidadeGCo2ePorKwh === null) {
      continue;
    }
    const medias = horariosDemo(codigo)
      .matriz.flat()
      .filter(temAmostras)
      .map(({ media }) => media);
    const media = medias.reduce((s, v) => s + v, 0) / medias.length;

    assert.ok(
      Math.abs(media - intensidadeGCo2ePorKwh) / intensidadeGCo2ePorKwh < 0.1,
      codigo,
    );
  }
});

test('demo for all regions mixes them and an unknown region has no data', () => {
  const todas = horariosDemo(null).matriz.flat().filter(temAmostras);
  const desconhecida = horariosDemo('xx-nowhere');

  assert.equal(todas.length, 7 * 24);
  assert.equal(desconhecida.matriz.flat().filter(temAmostras).length, 0);
  assert.equal(desconhecida.melhorJanela, null);
});
