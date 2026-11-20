import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CONSTANTES_CALCULO,
  EXEMPLO_CALCULO_REAL,
  calcularEstimativaExemplo,
} from '../src/utils/metodologia.ts';

test('CONSTANTES_CALCULO espelha exatamente os fatores do CalculosService do backend', () => {
  assert.deepEqual(CONSTANTES_CALCULO, {
    cpuMaxWatts: 0.5,
    memoriaWattsPorGb: 0.375,
    discoWattsPorGb: 0.01,
    redeWattsPorGb: 0.02,
  });
});

test('calcularEstimativaExemplo reproduz exatamente o cálculo de potência, energia e CO₂e do backend', () => {
  const resultado = calcularEstimativaExemplo({
    cpuPercent: 50,
    memoryGb: 4,
    diskGb: 20,
    networkGb: 5,
    intervaloSegundos: 60,
    intensidadeCarbonoGCo2ePorKwh: 100,
  });

  // 0,25 + 1,50 + 0,20 + 0,10 = 2,05 W
  assert.ok(Math.abs(resultado.consumoCpuW - 0.25) < 1e-12);
  assert.ok(Math.abs(resultado.consumoMemoriaW - 1.5) < 1e-12);
  assert.ok(Math.abs(resultado.consumoDiscoW - 0.2) < 1e-12);
  assert.ok(Math.abs(resultado.consumoRedeW - 0.1) < 1e-12);
  assert.ok(Math.abs(resultado.potenciaTotalW - 2.05) < 1e-12);

  const esperadoKwh = (2.05 * (60 / 3600)) / 1000;
  assert.ok(Math.abs(resultado.energiaKwh - esperadoKwh) < 1e-15);
  assert.ok(Math.abs(resultado.energiaWh - esperadoKwh * 1000) < 1e-12);
  assert.ok(Math.abs(resultado.emissaoGCo2e - esperadoKwh * 100) < 1e-12);
});

test('EXEMPLO_CALCULO_REAL gera valores consistentes para exibição na página', () => {
  assert.ok(EXEMPLO_CALCULO_REAL.entrada.cpuPercent > 0);
  assert.ok(EXEMPLO_CALCULO_REAL.entrada.intervaloSegundos > 0);
  assert.ok(EXEMPLO_CALCULO_REAL.resultado.potenciaTotalW > 0);
  assert.ok(EXEMPLO_CALCULO_REAL.resultado.energiaWh > 0);
  assert.ok(EXEMPLO_CALCULO_REAL.resultado.emissaoGCo2e > 0);
});

test('calcularEstimativaExemplo rejeita medições ou intervalo inválidos', () => {
  assert.throws(() =>
    calcularEstimativaExemplo({
      cpuPercent: 120,
      memoryGb: 1,
      diskGb: 1,
      networkGb: 1,
      intervaloSegundos: 60,
      intensidadeCarbonoGCo2ePorKwh: 100,
    }),
  );
  assert.throws(() =>
    calcularEstimativaExemplo({
      cpuPercent: 10,
      memoryGb: 1,
      diskGb: 1,
      networkGb: 1,
      intervaloSegundos: 0,
      intensidadeCarbonoGCo2ePorKwh: 100,
    }),
  );
});
