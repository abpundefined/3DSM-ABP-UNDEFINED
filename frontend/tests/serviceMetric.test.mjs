import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatEnergy,
  formatEmission,
  toFiniteNumber,
} from '../src/utils/formatters.ts';
import { buildServiceDrawerSummary } from '../src/utils/serviceDetail.ts';

test('indicadores, cards e painel usam a política atual compartilhada de energia e emissão', () => {
  const service = {
    id: 12,
    idExterno: 'billing-api',
    nome: 'Billing API',
    regiaoCodigo: 'br-sudeste',
    estadoAtual: 'DISPONIVEL',
    latestCollection: { energiaKwh: '0.00025', emissaoGCo2e: '0.021' },
  };
  const original = structuredClone(service);
  const summary = buildServiceDrawerSummary(service, 30);
  assert.equal(
    summary.energy,
    formatEnergy(toFiniteNumber(service.latestCollection.energiaKwh)),
  );
  assert.equal(
    summary.emissions,
    formatEmission(toFiniteNumber(service.latestCollection.emissaoGCo2e)),
  );
  assert.equal(summary.energy, '0,25 Wh');
  assert.equal(summary.emissions, '0,02 gCO₂e');
  assert.equal('emissionsKg' in summary, false);
  assert.equal('emissionsG' in summary, false);
  assert.deepEqual(service, original);
});

test('valores positivos mínimos são diferentes de zero sem alterar a regra da equipe', () => {
  for (const value of [Number.MIN_VALUE, 1e-10, 0.000001]) {
    assert.equal(formatEnergy(value), '< 0,01 Wh');
    assert.equal(formatEmission(value), '< 0,01 gCO₂e');
  }
  assert.equal(formatEnergy(0), '0 Wh');
  assert.equal(formatEmission(0), '0 gCO₂e');
  assert.equal(formatEnergy(1), '1,00 kWh');
  assert.equal(formatEmission(1000), '1,00 kgCO₂e');
});

test('normalização existente preserva ausências e inválidos em vez de inventar zeros', () => {
  for (const value of [null, undefined, '', 'inválido', NaN, Infinity]) {
    assert.equal(formatEnergy(toFiniteNumber(value)), '—');
    assert.equal(formatEmission(toFiniteNumber(value)), '—');
  }
  assert.equal(formatEnergy(toFiniteNumber('1.234567')), '1,23 kWh');
  assert.equal(formatEmission(toFiniteNumber('1234.567')), '1,23 kgCO₂e');
});
