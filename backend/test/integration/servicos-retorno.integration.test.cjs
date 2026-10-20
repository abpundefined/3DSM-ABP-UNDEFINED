const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { after, before, test } = require('node:test');

const backendRoot = path.resolve(__dirname, '../..');
const metricsOrigin = 'https://metrics.example.test';

// Falha antes de executar migrations ou criar o Prisma se o destino não for o teste.
assert.equal(process.env.GREENER_PROBLEM1_INTEGRATION, '1');
const databaseUrl = new URL(process.env.DATABASE_URL || '');
assert.equal(databaseUrl.protocol, 'postgresql:');
assert.equal(databaseUrl.hostname, 'postgres-problem1');
assert.equal(databaseUrl.port, '5432');
assert.equal(databaseUrl.username, 'greener_problem1_test');
assert.equal(databaseUrl.pathname, '/greener_problem1_test');
assert.equal(databaseUrl.searchParams.get('schema'), 'public');

require('reflect-metadata');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../../dist/src/database/prisma.service');
const {
  ServicosService,
} = require('../../dist/src/modules/servicos/servicos.service');
const {
  MonitoramentoService,
} = require('../../dist/src/modules/monitoramento/monitoramento.service');

let prisma;
let servicos;
let monitoramento;

const externalService = (id) => ({
  id,
  name: `Serviço ${id}`,
  location: {
    region_code: 'br-sudeste',
    country: 'Brazil',
    region: 'Sudeste',
    city: 'Sao Paulo',
    latitude: -23.5505,
    longitude: -46.6333,
  },
  metrics_path: `/metrics/${id}`,
});

before(async () => {
  execFileSync(
    process.execPath,
    [
      path.join(backendRoot, 'node_modules/prisma/build/index.js'),
      'migrate',
      'deploy',
      '--config',
      path.join(backendRoot, 'prisma7.config.ts'),
    ],
    {
      cwd: backendRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl.toString() },
      stdio: 'inherit',
    },
  );

  const config = new ConfigService({
    DATABASE_URL: databaseUrl.toString(),
    METRICS_API_URL: metricsOrigin,
    METRICS_POLL_INTERVAL_MS: '30000',
  });
  prisma = new PrismaService(config);
  await prisma.onModuleInit();
  const [identity] = await prisma.$queryRaw`
    SELECT current_database() AS database, current_user AS username
  `;
  assert.equal(identity.database, 'greener_problem1_test');
  assert.equal(identity.username, 'greener_problem1_test');
  await prisma.verifySchema();
  assert.equal(
    await prisma.servico.count(),
    0,
    'O banco de integração deve começar vazio.',
  );
  assert.equal(await prisma.coleta.count(), 0);

  await prisma.regiao.create({
    data: {
      codigo: 'integration-fixture',
      pais: 'Brazil',
      regiao: 'Sudeste',
      cidade: 'Sao Paulo',
    },
  });

  // Não inicializa AppModule nem o agendador: cada fase é acionada pelo teste.
  servicos = new ServicosService(prisma, config);
  monitoramento = new MonitoramentoService(prisma, config, servicos);
});

after(async () => {
  if (prisma) await prisma.onModuleDestroy();
});

test('ciclo real: DISPONIVEL → REMOVIDO → DESCONHECIDO → DISPONIVEL preserva id e histórico', async (t) => {
  const externalId = 'integration-billing-api';
  let discovered = [];
  const metricRequests = [];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(String(input));
    assert.equal(url.origin, metricsOrigin);
    if (url.pathname === '/services') return Response.json(discovered);
    if (url.pathname === `/metrics/${externalId}`) {
      metricRequests.push(externalId);
      return Response.json({
        collection_interval_seconds: 30,
        metrics: {
          cpu_percent: 47.5,
          memory_gb: 2.75,
          disk_gb: 15,
          network_gb: 0.5,
        },
      });
    }
    throw new Error(`Requisição externa inesperada no teste: ${url.pathname}`);
  });

  const original = await prisma.servico.create({
    data: {
      idExterno: externalId,
      nome: 'Billing API de integração',
      regiaoCodigo: 'integration-fixture',
      caminhoMetricas: `/metrics/${externalId}`,
      estadoAtual: 'DISPONIVEL',
    },
  });
  await prisma.coleta.createMany({
    data: [
      {
        servicoId: original.id,
        regiaoCodigoNaColeta: 'integration-fixture',
        estadoColeta: 'SUCESSO',
        iniciadaEm: new Date('2026-10-01T12:00:00.000Z'),
        cpuPercent: 10,
        memoryGb: 1,
      },
      {
        servicoId: original.id,
        regiaoCodigoNaColeta: 'integration-fixture',
        estadoColeta: 'SUCESSO',
        iniciadaEm: new Date('2026-10-01T12:00:30.000Z'),
        cpuPercent: 20,
        memoryGb: 2,
      },
    ],
  });
  const previousHistory = await prisma.coleta.findMany({
    where: { servicoId: original.id },
    orderBy: { id: 'asc' },
  });
  assert.equal(previousHistory.length, 2);

  // Descoberta válida vazia: grava REMOVIDO e o coletor não consulta o serviço.
  await servicos.syncServices();
  const removed = await prisma.servico.findUniqueOrThrow({
    where: { id: original.id },
  });
  assert.equal(removed.estadoAtual, 'REMOVIDO');
  await monitoramento.collectMetricsForAllServices();
  assert.deepEqual(metricRequests, []);
  assert.equal(
    await prisma.coleta.count({ where: { servicoId: original.id } }),
    2,
  );

  // O retorno é persistido antes da coleta: ainda não comprova disponibilidade.
  discovered = [externalService(externalId)];
  await servicos.syncServices();
  const returned = await prisma.servico.findUniqueOrThrow({
    where: { idExterno: externalId },
  });
  assert.equal(returned.id, original.id);
  assert.equal(returned.estadoAtual, 'DESCONHECIDO');
  assert.equal(
    await prisma.coleta.count({ where: { servicoId: original.id } }),
    2,
  );

  // O método de coleta real seleciona o DESCONHECIDO e grava uma nova medição.
  await monitoramento.collectMetricsForAllServices();
  const collected = await prisma.servico.findUniqueOrThrow({
    where: { idExterno: externalId },
  });
  const history = await prisma.coleta.findMany({
    where: { servicoId: original.id },
    orderBy: { id: 'asc' },
  });
  assert.equal(collected.id, original.id);
  assert.equal(collected.estadoAtual, 'DISPONIVEL');
  assert.deepEqual(metricRequests, [externalId]);
  assert.equal(history.length, 3);
  assert.deepEqual(history.slice(0, 2), previousHistory);
  assert.equal(history[2].estadoColeta, 'SUCESSO');
  assert.equal(history[2].cpuPercent, 47.5);
  assert.equal(history[2].memoryGb, 2.75);
  assert.equal(history[2].diskGb, 15);
  assert.equal(history[2].networkGb, 0.5);
  assert.ok(!previousHistory.some((entry) => entry.id === history[2].id));
  assert.equal(
    await prisma.servico.count({ where: { idExterno: externalId } }),
    1,
  );

  console.log(
    JSON.stringify({
      database: 'greener_problem1_test',
      serviceIdBefore: original.id,
      serviceIdAfter: collected.id,
      states: [
        original.estadoAtual,
        removed.estadoAtual,
        returned.estadoAtual,
        collected.estadoAtual,
      ],
      previousCollectionIds: previousHistory.map((entry) => entry.id),
      collectionIdsAfter: history.map((entry) => entry.id),
      previousHistoryPreserved: true,
    }),
  );
});

test('falhas de descoberta não alteram os estados nem o histórico persistido', async (t) => {
  const statesBefore = await prisma.servico.findMany({
    orderBy: { id: 'asc' },
  });
  const historyBefore = await prisma.coleta.findMany({
    orderBy: { id: 'asc' },
  });

  for (const [name, response] of [
    ['HTTP 503', () => new Response(null, { status: 503 })],
    [
      'erro de rede',
      () => {
        throw new Error('Falha externa simulada');
      },
    ],
    ['payload inválido', () => Response.json({ error: 'service_unavailable' })],
  ]) {
    await t.test(name, async (scenario) => {
      scenario.mock.method(globalThis, 'fetch', async () => response());
      await assert.rejects(servicos.syncServices());
      assert.deepEqual(
        await prisma.servico.findMany({ orderBy: { id: 'asc' } }),
        statesBefore,
      );
      assert.deepEqual(
        await prisma.coleta.findMany({ orderBy: { id: 'asc' } }),
        historyBefore,
      );
    });
  }
});

test('a descoberta preserva INDISPONIVEL e SEM_METRICAS no PostgreSQL', async (t) => {
  const controls = [];
  for (const state of ['INDISPONIVEL', 'SEM_METRICAS']) {
    controls.push(
      await prisma.servico.create({
        data: {
          idExterno: `integration-${state.toLowerCase()}`,
          nome: `Controle ${state}`,
          regiaoCodigo: 'integration-fixture',
          caminhoMetricas: `/metrics/integration-${state.toLowerCase()}`,
          estadoAtual: state,
        },
      }),
    );
  }

  t.mock.method(globalThis, 'fetch', async () =>
    Response.json([
      externalService('integration-billing-api'),
      ...controls.map((entry) => externalService(entry.idExterno)),
    ]),
  );
  await servicos.syncServices();

  for (const control of controls) {
    const persisted = await prisma.servico.findUniqueOrThrow({
      where: { id: control.id },
    });
    assert.equal(persisted.estadoAtual, control.estadoAtual);
  }
});
