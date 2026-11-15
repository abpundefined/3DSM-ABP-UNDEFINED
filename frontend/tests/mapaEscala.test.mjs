import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  RAIO_MAXIMO,
  RAIO_MINIMO,
  arredondarParaCima,
  criarEscalaEmissao,
  criarLegendaEmissao,
  formatarEmissao,
  maiorEmissao,
} from '../src/utils/mapaEscala.ts';

test('rounds the scale maximum up to a readable value', () => {
  assert.equal(arredondarParaCima(0.86), 1);
  assert.equal(arredondarParaCima(0.41), 0.5);
  assert.equal(arredondarParaCima(1.7), 2);
  assert.equal(arredondarParaCima(2.2), 2.5);
  assert.equal(arredondarParaCima(7.3), 10);
  assert.equal(arredondarParaCima(0.2), 0.2);
  assert.equal(arredondarParaCima(1234), 2000);
});

test('returns zero for a maximum without valid emission', () => {
  assert.equal(arredondarParaCima(0), 0);
  assert.equal(arredondarParaCima(-3), 0);
  assert.equal(arredondarParaCima(Number.NaN), 0);
});

test('finds the largest emission ignoring empty and invalid values', () => {
  assert.equal(maiorEmissao([0.2, null, 0.9, Number.NaN, 0.4]), 0.9);
  assert.equal(maiorEmissao([null, null]), 0);
  assert.equal(maiorEmissao([]), 0);
});

test('marker area grows in proportion to the emission', () => {
  const escala = criarEscalaEmissao(1);
  const area = (valor) => (escala.raio(valor) - RAIO_MINIMO) ** 2;

  assert.equal(escala.raio(0), RAIO_MINIMO);
  assert.equal(escala.raio(1), RAIO_MAXIMO);
  assert.equal(escala.raio(0.25), (RAIO_MINIMO + RAIO_MAXIMO) / 2);
  assert.ok(Math.abs(area(0.8) / area(0.2) - 4) < 1e-9);
});

test('clamps values outside the domain instead of breaking the layout', () => {
  const escala = criarEscalaEmissao(1);

  assert.equal(escala.raio(5), RAIO_MAXIMO);
  assert.equal(escala.raio(-1), RAIO_MINIMO);
  assert.equal(escala.faixa(5), 5);
  assert.equal(escala.faixa(-1), 1);
});

test('services without data keep the minimum size and no color band', () => {
  const escala = criarEscalaEmissao(1);

  assert.equal(escala.raio(null), RAIO_MINIMO);
  assert.equal(escala.faixa(null), null);
  assert.equal(escala.faixa(Number.NaN), null);
});

test('splits the domain into five equal color bands', () => {
  const escala = criarEscalaEmissao(1);

  assert.equal(escala.faixa(0), 1);
  assert.equal(escala.faixa(0.19), 1);
  assert.equal(escala.faixa(0.2), 2);
  assert.equal(escala.faixa(0.59), 3);
  assert.equal(escala.faixa(0.99), 5);
  assert.equal(escala.faixa(1), 5);
});

test('a period without emission puts every service in the first band', () => {
  const escala = criarEscalaEmissao(0);

  assert.equal(escala.maximo, 0);
  assert.equal(escala.raio(0), RAIO_MINIMO);
  assert.equal(escala.faixa(0), 1);
  assert.deepEqual(criarLegendaEmissao(escala), []);
});

test('accepts custom radius and number of bands', () => {
  const escala = criarEscalaEmissao(10, {
    raioMinimo: 4,
    raioMaximo: 14,
    faixas: 4,
  });

  assert.equal(escala.raio(10), 14);
  assert.equal(escala.faixa(7.5), 4);
  assert.equal(criarLegendaEmissao(escala).length, 4);
});

test('formats emission in pt-BR and switches to kg from 1000 g', () => {
  assert.equal(formatarEmissao(0.85), '0,85 gCO₂e');
  assert.equal(formatarEmissao(12.345), '12,3 gCO₂e');
  assert.equal(formatarEmissao(1234), '1,23 kgCO₂e');
  assert.equal(formatarEmissao(250, 2000), '0,25 kgCO₂e');
});

test('builds legend bands with unit and contiguous limits', () => {
  const legenda = criarLegendaEmissao(criarEscalaEmissao(0.86));

  assert.equal(legenda.length, 5);
  assert.deepEqual(
    legenda.map(({ rotulo }) => rotulo),
    [
      '0 a 0,2 gCO₂e',
      '0,2 a 0,4 gCO₂e',
      '0,4 a 0,6 gCO₂e',
      '0,6 a 0,8 gCO₂e',
      '0,8 a 1 gCO₂e',
    ],
  );
  legenda.slice(1).forEach((faixa, indice) => {
    assert.equal(faixa.de, legenda[indice].ate);
  });
});

test('legend uses kg when the scale maximum reaches 1000 g', () => {
  const legenda = criarLegendaEmissao(criarEscalaEmissao(4300));

  assert.equal(legenda[0].rotulo, '0 a 1 kgCO₂e');
  assert.equal(legenda[4].rotulo, '4 a 5 kgCO₂e');
});
