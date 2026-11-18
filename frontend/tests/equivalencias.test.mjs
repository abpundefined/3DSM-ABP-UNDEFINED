import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FONTE_EQUIVALENCIAS } from '../src/constants/equivalencias.ts';
import {
  converterEquivalenciasCo2e,
  formatarEquivalenciasCo2e,
} from '../src/utils/equivalencias.ts';

test('constantes de equivalência citam fonte oficial da EPA e valores positivos', () => {
  assert.match(FONTE_EQUIVALENCIAS.nome, /EPA/i);
  assert.ok(FONTE_EQUIVALENCIAS.url.startsWith('https://www.epa.gov/'));
  assert.ok(FONTE_EQUIVALENCIAS.consultadoEm.length >= 8);
  assert.ok(FONTE_EQUIVALENCIAS.carroGCo2ePorKm > 200);
  assert.ok(FONTE_EQUIVALENCIAS.celularGCo2ePorCarga > 5);
});

test('converterEquivalenciasCo2e retorna null para entrada nula, inválida ou negativa', () => {
  assert.equal(converterEquivalenciasCo2e(null), null);
  assert.equal(converterEquivalenciasCo2e(undefined), null);
  assert.equal(converterEquivalenciasCo2e(Number.NaN), null);
  assert.equal(converterEquivalenciasCo2e(Number.POSITIVE_INFINITY), null);
  assert.equal(converterEquivalenciasCo2e(-10), null);
});

test('converterEquivalenciasCo2e converte gramas de CO₂e em km de carro e cargas de celular', () => {
  const zero = converterEquivalenciasCo2e(0);
  assert.deepEqual(zero, { kmCarro: 0, cargasCelular: 0 });

  const porKm = FONTE_EQUIVALENCIAS.carroGCo2ePorKm;
  const umKm = converterEquivalenciasCo2e(porKm);
  assert.ok(umKm !== null);
  assert.ok(Math.abs(umKm.kmCarro - 1) < 1e-9);
  assert.ok(
    Math.abs(
      umKm.cargasCelular - porKm / FONTE_EQUIVALENCIAS.celularGCo2ePorCarga,
    ) < 1e-9,
  );
});

test('formatarEquivalenciasCo2e formata aproximação com símbolo ≈ para zero, pequenos e grandes volumes', () => {
  assert.equal(formatarEquivalenciasCo2e(null), null);

  assert.deepEqual(formatarEquivalenciasCo2e(0), {
    carro: '≈ 0 km rodados de carro',
    celular: '≈ 0 cargas de celular',
  });

  const pequeno = formatarEquivalenciasCo2e(1);
  assert.ok(pequeno !== null);
  assert.equal(pequeno.carro, '≈ < 0,01 km rodados de carro');
  assert.equal(pequeno.celular, '≈ < 1 carga de celular');

  const medio = formatarEquivalenciasCo2e(2442);
  assert.ok(medio !== null);
  assert.ok(medio.carro.startsWith('≈ '));
  assert.ok(medio.carro.endsWith(' km rodados de carro'));
  assert.ok(medio.celular.startsWith('≈ '));
  assert.ok(medio.celular.endsWith(' cargas de celular'));
});
