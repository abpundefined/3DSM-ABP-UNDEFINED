import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularAcumuladoCo2,
  calcularDuracaoPeriodoSegundos,
  calcularTaxaEmissaoGPorSegundo,
  calcularTaxaPorTotalEPeriodo,
  formatarGramasContador,
  formatarTaxaGPorSegundo,
  INTERVALO_ANUNCIO_LEITOR_TELA_MS,
  INTERVALO_ATUALIZACAO_CONTADOR_MS,
  INTERVALO_CONTADOR_MOVIMENTO_REDUZIDO_MS,
  montarFraseContadorCo2,
} from '../src/utils/contadorCo2.ts';

test('constantes seguem cadência de 1 s normal, 5 s movimento reduzido e 30 s leitor de tela', () => {
  assert.equal(INTERVALO_ATUALIZACAO_CONTADOR_MS, 1_000);
  assert.equal(INTERVALO_CONTADOR_MOVIMENTO_REDUZIDO_MS, 5_000);
  assert.equal(INTERVALO_ANUNCIO_LEITOR_TELA_MS, 30_000);
});

test('soma a taxa de emissão em g/s a partir da última coleta de cada serviço', () => {
  const taxa = calcularTaxaEmissaoGPorSegundo(
    [
      { emissaoGCo2e: 60, intervaloSegundos: 60 }, // 1,0 g/s
      { emissaoGCo2e: 15, intervaloSegundos: 30 }, // 0,5 g/s
      { emissaoGCo2e: 120, intervaloSegundos: null }, // usa padrão 60s -> 2,0 g/s
      { emissaoGCo2e: null, intervaloSegundos: 60 }, // ignorado
      { emissaoGCo2e: -5, intervaloSegundos: 60 }, // ignorado
      { emissaoGCo2e: Number.NaN, intervaloSegundos: 60 }, // ignorado
    ],
    60,
  );

  assert.equal(taxa, 3.5);
});

test('retorna 0 quando nenhum serviço tem intervalo válido nem fallback', () => {
  assert.equal(
    calcularTaxaEmissaoGPorSegundo([
      { emissaoGCo2e: 10, intervaloSegundos: null },
      { emissaoGCo2e: 20, intervaloSegundos: 0 },
    ]),
    0,
  );
});

test('calcula taxa por total e período e trata datas inválidas com fallback de 24 h', () => {
  assert.equal(
    calcularDuracaoPeriodoSegundos({
      inicio: '2026-11-19T10:00:00Z',
      fim: '2026-11-19T11:00:00Z',
    }),
    3_600,
  );
  assert.equal(
    calcularTaxaPorTotalEPeriodo(360, {
      inicio: '2026-11-19T10:00:00Z',
      fim: '2026-11-19T11:00:00Z',
    }),
    0.1,
  );
  assert.equal(calcularTaxaPorTotalEPeriodo(86_400, null), 1);
  assert.equal(calcularTaxaPorTotalEPeriodo(0, null), 0);
  assert.equal(calcularTaxaPorTotalEPeriodo(null, null), 0);
});

test('calcula acumulado e formata valores em português mantendo a frase esperada', () => {
  assert.equal(calcularAcumuladoCo2(0.5, 10), 5);
  assert.equal(calcularAcumuladoCo2(-1, 10), 0);
  assert.equal(calcularAcumuladoCo2(0.5, -2), 0);

  assert.equal(formatarGramasContador(0), '0,00');
  assert.equal(formatarGramasContador(0.0025), '0,0025');
  assert.equal(formatarGramasContador(0.25), '0,250');
  assert.equal(formatarGramasContador(12.345), '12,35');
  assert.equal(formatarGramasContador(125.44), '125,4');
  assert.equal(formatarGramasContador(1250), '1.250');
  assert.equal(formatarTaxaGPorSegundo(0.5), '0,500 g/s');
  assert.equal(
    montarFraseContadorCo2(2.5),
    'Desde que você chegou, os serviços emitiram 2,50 g de CO₂e',
  );
});
