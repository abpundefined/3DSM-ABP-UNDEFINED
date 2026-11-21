import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CIRCUNFERENCIA_ANEL_CPU,
  calcularAnelCpu,
  classificarFaixaCpu,
} from '../src/utils/anelCpu.ts';

test('classifica faixas de CPU com rótulo textual claro além da cor', () => {
  assert.deepEqual(classificarFaixaCpu(null), {
    faixa: 'sem-dados',
    rotuloFaixa: 'Sem dados',
  });
  assert.deepEqual(classificarFaixaCpu(0), {
    faixa: 'baixo',
    rotuloFaixa: 'Baixo',
  });
  assert.deepEqual(classificarFaixaCpu(49.9), {
    faixa: 'baixo',
    rotuloFaixa: 'Baixo',
  });
  assert.deepEqual(classificarFaixaCpu(50), {
    faixa: 'moderado',
    rotuloFaixa: 'Moderado',
  });
  assert.deepEqual(classificarFaixaCpu(79.9), {
    faixa: 'moderado',
    rotuloFaixa: 'Moderado',
  });
  assert.deepEqual(classificarFaixaCpu(80), {
    faixa: 'alto',
    rotuloFaixa: 'Alto',
  });
});

test('calcula preenchimento circular, texto central e descrição acessível', () => {
  const baixo = calcularAnelCpu(25);
  assert.equal(baixo.faixa, 'baixo');
  assert.equal(baixo.textoCentro, '25,0 %');
  assert.equal(baixo.textoAcessivel, '25,0 % (baixo)');
  assert.equal(baixo.percentualLimitado, 25);
  assert.ok(Math.abs(baixo.dashOffset - CIRCUNFERENCIA_ANEL_CPU * 0.75) < 1e-6);

  const cheio = calcularAnelCpu(100);
  assert.equal(cheio.faixa, 'alto');
  assert.equal(cheio.dashOffset, 0);

  const acimaDeCem = calcularAnelCpu(125.4);
  assert.equal(acimaDeCem.percentualLimitado, 100);
  assert.equal(acimaDeCem.textoCentro, '125,4 %');
  assert.equal(acimaDeCem.dashOffset, 0);
});

test('trata valores ausentes, inválidos ou negativos como sem dados', () => {
  for (const entrada of [null, undefined, '', 'abc', Number.NaN, -5]) {
    const resultado = calcularAnelCpu(entrada);
    assert.equal(resultado.faixa, 'sem-dados');
    assert.equal(resultado.percentual, null);
    assert.equal(resultado.percentualLimitado, 0);
    assert.equal(resultado.textoCentro, '—');
    assert.equal(resultado.dashOffset, CIRCUNFERENCIA_ANEL_CPU);
  }
});
