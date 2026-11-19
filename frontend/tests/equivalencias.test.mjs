import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FONTE_EQUIVALENCIAS } from '../src/constants/equivalencias.ts';
import {
  converterEquivalenciasCo2e,
  formatarEquivalenciasCo2e,
} from '../src/utils/equivalencias.ts';

test('constantes de equivalência citam fonte oficial da EPA com fatores atualizados', () => {
  assert.match(FONTE_EQUIVALENCIAS.nome, /EPA/i);
  assert.ok(FONTE_EQUIVALENCIAS.url.startsWith('https://www.epa.gov/'));
  assert.ok(FONTE_EQUIVALENCIAS.consultadoEm.length >= 8);
  assert.equal(FONTE_EQUIVALENCIAS.carroGCo2ePorMilha, 393);
  assert.equal(FONTE_EQUIVALENCIAS.celularGCo2ePorCarga, 12.4);
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

test('formatarEquivalenciasCo2e formata aproximação com símbolo ≈ para zero, pequenos, fronteira e grandes volumes', () => {
  assert.equal(formatarEquivalenciasCo2e(null), null);

  assert.deepEqual(formatarEquivalenciasCo2e(0), {
    carro: '≈ 0 km rodados de carro',
    celular: '≈ 0 cargas de celular',
  });

  const pequeno = formatarEquivalenciasCo2e(1);
  assert.deepEqual(pequeno, {
    carro: '≈ menos de 0,01 km rodados de carro',
    celular: '≈ menos de 1 carga de celular',
  });

  const fronteira = formatarEquivalenciasCo2e(2441);
  assert.ok(fronteira !== null);
  assert.equal(fronteira.carro, '≈ 10,0 km rodados de carro');

  const medio = formatarEquivalenciasCo2e(24420);
  assert.deepEqual(medio, {
    carro: '≈ 100,0 km rodados de carro',
    celular: '≈ 1.969 cargas de celular',
  });
});
