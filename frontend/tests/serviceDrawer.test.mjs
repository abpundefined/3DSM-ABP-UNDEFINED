import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildServiceDrawerSummary,
  buildServiceHistoryPath,
  formatCollectionInterval,
  formatServiceStatus,
} from '../src/utils/serviceDetail.ts';

test('formata os estados de monitoramento do serviço em rótulos acessíveis', () => {
  assert.deepEqual(formatServiceStatus('DISPONIVEL'), {
    className: 'active',
    label: 'Ativo',
    icon: 'check',
  });
  assert.deepEqual(formatServiceStatus('INDISPONIVEL'), {
    className: 'unavailable',
    label: 'Indisponível',
    icon: 'alert',
  });
  assert.deepEqual(formatServiceStatus('SEM_METRICAS'), {
    className: 'noMetrics',
    label: 'Sem métricas',
    icon: 'info',
  });
  assert.deepEqual(formatServiceStatus('REMOVIDO'), {
    className: 'unavailable',
    label: 'Removido',
    icon: 'alert',
  });
  assert.deepEqual(formatServiceStatus('DESCONHECIDO'), {
    className: 'unavailable',
    label: 'Desconhecido',
    icon: 'info',
  });
});

test('formata intervalo de coleta priorizando a coleta e usando configuração como fallback', () => {
  assert.equal(formatCollectionInterval(15, 30), '15 s');
  assert.equal(formatCollectionInterval(null, 60), '60 s');
  assert.equal(formatCollectionInterval(undefined, undefined), 'Não informado');
  assert.equal(formatCollectionInterval(0, -1), 'Não informado');
});

test('gera caminho da página de histórico do serviço', () => {
  assert.equal(buildServiceHistoryPath(12), '/servicos/12');
});

test('monta resumo completo de métricas atuais para o painel lateral', () => {
  const summary = buildServiceDrawerSummary(
    {
      id: 12,
      idExterno: 'billing-api',
      nome: 'Billing API',
      regiaoCodigo: 'br-sudeste',
      localizacao: {
        codigo: 'br-sudeste',
        pais: 'Brasil',
        regiao: 'Sudeste',
        cidade: 'São Paulo',
        latitude: -23.55,
        longitude: -46.63,
      },
      estadoAtual: 'DISPONIVEL',
      latestCollection: {
        iniciadaEm: '2026-11-15T14:00:00.000Z',
        intervaloColetaSegundos: 45,
        cpuPercent: 47.5,
        memoryGb: 2.75,
        diskGb: 15,
        networkGb: 0.5,
        intensidadeCarbonoGCo2ePorKwh: 125.4,
        energiaKwh: '1.234567',
        emissaoGCo2e: '1234.567',
      },
    },
    30,
  );

  assert.equal(summary.title, 'Billing API');
  assert.equal(summary.status.label, 'Ativo');
  assert.equal(summary.locationLabel, 'Brasil · Sudeste — São Paulo');
  assert.equal(summary.historyPath, '/servicos/12');
  assert.equal(summary.cpu, '47,5 %');
  assert.equal(summary.memory, '2,75 GB');
  assert.equal(summary.disk, '15,00 GB');
  assert.equal(summary.network, '0,50 GB');
  assert.equal(summary.carbonIntensity, '125,4 gCO₂e/kWh');
  assert.equal(summary.energy, '1,2346 kWh');
  assert.equal(summary.emissionsKg, '1,2346 kgCO₂e');
  assert.equal(summary.emissionsG, '1.234,57 gCO₂e');
  assert.equal(summary.collectionInterval, '45 s');
});

test('mantém dados ausentes explícitos no painel lateral sem inventar valores', () => {
  const summary = buildServiceDrawerSummary(
    {
      id: 13,
      idExterno: 'payment-api',
      nome: 'Payment API',
      regiaoCodigo: 'eu-west',
      localizacao: null,
      estadoAtual: 'INDISPONIVEL',
      latestCollection: null,
    },
    null,
  );

  assert.equal(summary.locationLabel, 'Irlanda (Leinster)');
  assert.equal(summary.cpu, '—');
  assert.equal(summary.memory, '—');
  assert.equal(summary.disk, '—');
  assert.equal(summary.network, '—');
  assert.equal(summary.carbonIntensity, '—');
  assert.equal(summary.energy, '—');
  assert.equal(summary.emissionsKg, '—');
  assert.equal(summary.emissionsG, '—');
  assert.equal(summary.collectionInterval, 'Não informado');
});
