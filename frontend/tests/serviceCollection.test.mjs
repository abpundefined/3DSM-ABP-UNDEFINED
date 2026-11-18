import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeServiceCollection } from '../src/utils/serviceCollection.ts';
import {
  countServices,
  formatServiceCounter,
} from '../src/utils/serviceCounter.ts';

const coleta = { iniciadaEm: '2026-11-15T14:00:00.000Z' };

test('serviço sem nenhuma coleta válida recebe o aviso "never", em qualquer estado', () => {
  for (const estadoAtual of ['DISPONIVEL', 'SEM_METRICAS', 'INDISPONIVEL']) {
    assert.deepEqual(
      describeServiceCollection({ estadoAtual, latestCollection: null }),
      { kind: 'never' },
    );
  }
});

test('serviço ativo com coleta válida não recebe aviso', () => {
  assert.equal(
    describeServiceCollection({
      estadoAtual: 'DISPONIVEL',
      latestCollection: coleta,
    }),
    null,
  );
});

test('serviço fora do ar com coleta antiga mostra a data real no horário de Brasília', () => {
  for (const estadoAtual of ['INDISPONIVEL', 'SEM_METRICAS', 'REMOVIDO']) {
    const aviso = describeServiceCollection({
      estadoAtual,
      latestCollection: coleta,
    });
    assert.equal(aviso.kind, 'previous');
    assert.equal(aviso.dateTime, '2026-11-15T14:00:00.000Z');
    assert.match(aviso.label, /^15\/11\/2026.*11:00$/);
  }
});

test('data inválida ou ausente não é inventada', () => {
  for (const iniciadaEm of ['', 'não é data', undefined]) {
    assert.deepEqual(
      describeServiceCollection({
        estadoAtual: 'INDISPONIVEL',
        latestCollection: { iniciadaEm },
      }),
      { kind: 'previous', dateTime: null, label: null },
    );
  }
});

test('o contador ignora os removidos e conta só os ativos', () => {
  const servicos = [
    { estadoAtual: 'DISPONIVEL' },
    { estadoAtual: 'DISPONIVEL' },
    { estadoAtual: 'INDISPONIVEL' },
    { estadoAtual: 'SEM_METRICAS' },
    { estadoAtual: 'DESCONHECIDO' },
    { estadoAtual: 'REMOVIDO' },
  ];
  assert.deepEqual(countServices(servicos), { active: 2, monitored: 5 });
  assert.deepEqual(countServices([]), { active: 0, monitored: 0 });
  assert.deepEqual(countServices([{ estadoAtual: 'REMOVIDO' }]), {
    active: 0,
    monitored: 0,
  });
});

test('o texto do contador concorda em número e usa separador de milhar', () => {
  assert.equal(
    formatServiceCounter({ active: 9, monitored: 12 }),
    '9 ativos de 12 monitorados',
  );
  assert.equal(
    formatServiceCounter({ active: 1, monitored: 1 }),
    '1 ativo de 1 monitorado',
  );
  assert.equal(
    formatServiceCounter({ active: 0, monitored: 3 }),
    '0 ativos de 3 monitorados',
  );
  assert.equal(
    formatServiceCounter({ active: 1200, monitored: 1500 }),
    '1.200 ativos de 1.500 monitorados',
  );
});
