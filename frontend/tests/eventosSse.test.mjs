import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ATRASO_RECONEXAO_SSE_MS,
  CAMINHO_EVENTOS_SSE,
  DURACAO_PULSO_CARD_MS,
  aplicarEventoSseEmServicos,
  ehEstadoMonitoramentoSse,
  interpretarEventoColetaRegistrada,
  interpretarEventoEstadoAlterado,
  interpretarEventoTempoReal,
} from '../src/utils/eventosSse.ts';

test('constantes de configuração SSE possuem valores esperados', () => {
  assert.equal(CAMINHO_EVENTOS_SSE, '/api/eventos');
  assert.equal(DURACAO_PULSO_CARD_MS, 1200);
  assert.equal(ATRASO_RECONEXAO_SSE_MS, 5000);
});

test('ehEstadoMonitoramentoSse valida apenas os cinco estados suportados', () => {
  assert.equal(ehEstadoMonitoramentoSse('DISPONIVEL'), true);
  assert.equal(ehEstadoMonitoramentoSse('INDISPONIVEL'), true);
  assert.equal(ehEstadoMonitoramentoSse('SEM_METRICAS'), true);
  assert.equal(ehEstadoMonitoramentoSse('REMOVIDO'), true);
  assert.equal(ehEstadoMonitoramentoSse('DESCONHECIDO'), true);
  assert.equal(ehEstadoMonitoramentoSse('ATIVO'), false);
  assert.equal(ehEstadoMonitoramentoSse(null), false);
});

test('interpretarEventoColetaRegistrada decodifica JSON válido e normaliza campos numéricos', () => {
  const bruto = JSON.stringify({
    tipo: 'coleta-registrada',
    servicoId: 4,
    coleta: {
      id: 19,
      servicoId: 4,
      iniciadaEm: '2026-04-20T14:00:00.000Z',
      intervaloColetaSegundos: 30,
      estadoColeta: 'SUCESSO',
      estadoCalculo: 'CONCLUIDO',
      cpuPercent: 64.2,
      memoryGb: 3.5,
      diskGb: 12,
      networkGb: 0.8,
      intensidadeCarbonoGCo2ePorKwh: 85,
      energiaKwh: '0.0051',
      emissaoGCo2e: 0.4335,
    },
  });

  const evento = interpretarEventoColetaRegistrada(bruto);
  assert.ok(evento);
  assert.equal(evento.tipo, 'coleta-registrada');
  assert.equal(evento.servicoId, 4);
  assert.equal(evento.coleta.id, 19);
  assert.equal(evento.coleta.cpuPercent, 64.2);
  assert.equal(evento.coleta.energiaKwh, 0.0051);
  assert.equal(evento.coleta.emissaoGCo2e, 0.4335);
});

test('interpretarEventoColetaRegistrada rejeita payloads inválidos', () => {
  assert.equal(interpretarEventoColetaRegistrada('nao-e-json'), null);
  assert.equal(interpretarEventoColetaRegistrada('[]'), null);
  assert.equal(
    interpretarEventoColetaRegistrada({
      tipo: 'estado-alterado',
      servicoId: 1,
      coleta: {},
    }),
    null,
  );
  assert.equal(
    interpretarEventoColetaRegistrada({
      tipo: 'coleta-registrada',
      servicoId: 0,
      coleta: {},
    }),
    null,
  );
  assert.equal(
    interpretarEventoColetaRegistrada({
      tipo: 'coleta-registrada',
      servicoId: 1,
      coleta: null,
    }),
    null,
  );
});

test('interpretarEventoEstadoAlterado valida e decodifica evento de mudança de estado', () => {
  const evento = interpretarEventoEstadoAlterado(
    JSON.stringify({
      tipo: 'estado-alterado',
      servicoId: 2,
      estadoAtual: 'INDISPONIVEL',
      atualizadoEm: '2026-04-20T14:05:00.000Z',
    }),
  );

  assert.deepEqual(evento, {
    tipo: 'estado-alterado',
    servicoId: 2,
    estadoAtual: 'INDISPONIVEL',
    atualizadoEm: '2026-04-20T14:05:00.000Z',
  });

  assert.equal(
    interpretarEventoEstadoAlterado({
      tipo: 'estado-alterado',
      servicoId: 2,
      estadoAtual: 'INVALIDO',
    }),
    null,
  );
});

test('interpretarEventoTempoReal reconhece ambos os tipos de evento', () => {
  const coleta = interpretarEventoTempoReal({
    tipo: 'coleta-registrada',
    coleta: {
      servicoId: 1,
      cpuPercent: 30,
    },
  });
  assert.equal(coleta?.tipo, 'coleta-registrada');

  const estado = interpretarEventoTempoReal({
    tipo: 'estado-alterado',
    servicoId: 1,
    estadoAtual: 'SEM_METRICAS',
  });
  assert.equal(estado?.tipo, 'estado-alterado');
});

test('aplicarEventoSseEmServicos atualiza métricas, componentes e estado do serviço correspondente', () => {
  const servicosIniciais = [
    {
      id: 1,
      idExterno: 'auth-api',
      nome: 'API de Autenticação',
      regiaoCodigo: 'br-sudeste',
      estadoAtual: 'DISPONIVEL',
      energiaKwh: 0.001,
      emissaoGCo2e: 0.08,
      componentes: null,
      latestCollection: {
        iniciadaEm: '2026-04-20T13:00:00.000Z',
        intervaloColetaSegundos: 30,
        cpuPercent: 20,
        memoryGb: 1,
        diskGb: 5,
        networkGb: 0.1,
        energiaKwh: 0.001,
        emissaoGCo2e: 0.08,
      },
    },
  ];

  const eventoColeta = interpretarEventoColetaRegistrada({
    tipo: 'coleta-registrada',
    servicoId: 1,
    coleta: {
      id: 99,
      servicoId: 1,
      iniciadaEm: '2026-04-20T13:00:30.000Z',
      intervaloColetaSegundos: 30,
      estadoColeta: 'SUCESSO',
      estadoCalculo: 'CONCLUIDO',
      cpuPercent: 80,
      memoryGb: 4,
      diskGb: 10,
      networkGb: 1,
      energiaKwh: 0.004,
      emissaoGCo2e: 0.34,
    },
  });

  const aposColeta = aplicarEventoSseEmServicos(servicosIniciais, eventoColeta);
  assert.equal(aposColeta.servicoAtualizadoId, 1);
  assert.equal(aposColeta.servicos[0].latestCollection?.cpuPercent, 80);
  assert.equal(aposColeta.servicos[0].energiaKwh, 0.004);
  assert.equal(aposColeta.servicos[0].emissaoGCo2e, 0.34);
  assert.ok(aposColeta.servicos[0].componentes?.totalW > 0);

  const eventoEstado = interpretarEventoEstadoAlterado({
    tipo: 'estado-alterado',
    servicoId: 1,
    estadoAtual: 'INDISPONIVEL',
  });
  const aposEstado = aplicarEventoSseEmServicos(
    aposColeta.servicos,
    eventoEstado,
  );
  assert.equal(aposEstado.servicoAtualizadoId, 1);
  assert.equal(aposEstado.servicos[0].estadoAtual, 'INDISPONIVEL');
  assert.equal(aposEstado.servicos[0].latestCollection?.cpuPercent, 80);

  const naoEncontrado = aplicarEventoSseEmServicos(aposEstado.servicos, {
    tipo: 'estado-alterado',
    servicoId: 999,
    estadoAtual: 'REMOVIDO',
    atualizadoEm: '2026-04-20T13:01:00.000Z',
  });
  assert.equal(naoEncontrado.servicoAtualizadoId, null);
});
