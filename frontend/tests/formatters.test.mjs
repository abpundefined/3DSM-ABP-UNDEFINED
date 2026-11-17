import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  escalaDeEmissao,
  escalaDeEnergia,
  formatEmission,
  formatEnergy,
  formatRegionName,
  formatServiceLocation,
  toFiniteNumber,
} from '../src/utils/formatters.ts';

test('formats known carbon API region codes', () => {
  assert.equal(formatRegionName('br-sudeste'), 'Brasil (Sudeste)');
  assert.equal(formatRegionName('us-east'), 'Estados Unidos (Virgínia)');
  assert.equal(formatRegionName('eu-west'), 'Irlanda (Leinster)');
  assert.equal(formatRegionName('ca-central'), 'Canadá (Ontário)');
  assert.equal(formatRegionName('jp-east'), 'Japão (Tóquio)');
});

test('supports cloud region aliases and case-insensitive input', () => {
  assert.equal(formatRegionName('US-EAST-1'), 'Estados Unidos (Virgínia)');
  assert.equal(formatRegionName('eu-west-1'), 'Irlanda (Leinster)');
});

test('provides a readable fallback for unknown and missing region codes', () => {
  assert.equal(formatRegionName('sa-east-1'), 'SA East 1');
  assert.equal(formatRegionName('desconhecida'), 'Localização não informada');
  assert.equal(formatRegionName(undefined), 'Localização não informada');
});

test('normalizes numeric API values without treating empty values as zero', () => {
  assert.equal(toFiniteNumber('1.234567'), 1.234567);
  assert.equal(toFiniteNumber(0), 0);
  assert.equal(toFiniteNumber(''), null);
  assert.equal(toFiniteNumber('not-a-number'), null);
  assert.equal(toFiniteNumber(null), null);
});

test('formats service location with country, region and city', () => {
  assert.deepEqual(
    formatServiceLocation(
      { pais: 'Brasil', regiao: 'Sudeste', cidade: 'São Paulo' },
      'br-sudeste',
    ),
    { area: 'Brasil · Sudeste', city: 'São Paulo' },
  );
});

test('keeps location readable when city or names are missing', () => {
  assert.deepEqual(
    formatServiceLocation(
      { pais: 'Brasil', regiao: 'Sudeste', cidade: null },
      'br-sudeste',
    ),
    { area: 'Brasil · Sudeste', city: null },
  );
  assert.deepEqual(
    formatServiceLocation(
      { pais: 'Irlanda', regiao: 'Desconhecida', cidade: '  ' },
      'eu-west',
    ),
    { area: 'Irlanda', city: null },
  );
  assert.deepEqual(
    formatServiceLocation(
      { pais: 'Desconhecida', regiao: 'Desconhecida', cidade: null },
      'eu-west',
    ),
    { area: 'Irlanda (Leinster)', city: null },
  );
});

test('falls back to the region code when the location is absent', () => {
  assert.deepEqual(formatServiceLocation(undefined, 'br-sudeste'), {
    area: 'Brasil (Sudeste)',
    city: null,
  });
  assert.deepEqual(formatServiceLocation(null, undefined), {
    area: 'Localização não informada',
    city: null,
  });
});

test('formatEnergy trata nulo, zero, valores muito pequenos, Wh e kWh', () => {
  assert.equal(formatEnergy(null), '—');
  assert.equal(formatEnergy(0), '0 Wh');
  assert.equal(formatEnergy(0.000001), '< 0,01 Wh');
  assert.equal(formatEnergy(0.00045), '0,45 Wh');
  assert.equal(formatEnergy(0.5), '500,00 Wh');
  assert.equal(formatEnergy(1), '1,00 kWh');
  assert.equal(formatEnergy(1.234567), '1,23 kWh');
});

test('formatEmission trata nulo, zero, valores muito pequenos, gCO₂e e kgCO₂e', () => {
  assert.equal(formatEmission(null), '—');
  assert.equal(formatEmission(0), '0 gCO₂e');
  assert.equal(formatEmission(0.004), '< 0,01 gCO₂e');
  assert.equal(formatEmission(12.345), '12,35 gCO₂e');
  assert.equal(formatEmission(1000), '1,00 kgCO₂e');
  assert.equal(formatEmission(1234.567), '1,23 kgCO₂e');
});

test('formatEnergy arredonda antes de escolher a unidade', () => {
  assert.equal(formatEnergy(0.9999999), '1,00 kWh');
  assert.equal(formatEnergy(0.999996), '1,00 kWh');
  assert.equal(formatEnergy(0.99499), '994,99 Wh');
});

test('formatEmission arredonda antes de escolher a unidade', () => {
  assert.equal(formatEmission(999.996), '1,00 kgCO₂e');
  assert.equal(formatEmission(999.994), '999,99 gCO₂e');
});

test('escalaDeEnergia usa Wh abaixo de 1 kWh e kWh a partir de 1 kWh arredondado', () => {
  assert.deepEqual(escalaDeEnergia(0.03), { unidade: 'Wh', fator: 1000 });
  assert.deepEqual(escalaDeEnergia(0.99499), { unidade: 'Wh', fator: 1000 });
  assert.deepEqual(escalaDeEnergia(0.9999999), { unidade: 'kWh', fator: 1 });
  assert.deepEqual(escalaDeEnergia(2.5), { unidade: 'kWh', fator: 1 });
});

test('escalaDeEmissao usa gCO₂e abaixo de 1000 g e kgCO₂e a partir de 1000 g arredondados', () => {
  assert.deepEqual(escalaDeEmissao(0.6), { unidade: 'gCO₂e', fator: 1 });
  assert.deepEqual(escalaDeEmissao(999.994), { unidade: 'gCO₂e', fator: 1 });
  assert.deepEqual(escalaDeEmissao(999.996), {
    unidade: 'kgCO₂e',
    fator: 0.001,
  });
  assert.deepEqual(escalaDeEmissao(1500), { unidade: 'kgCO₂e', fator: 0.001 });
});
