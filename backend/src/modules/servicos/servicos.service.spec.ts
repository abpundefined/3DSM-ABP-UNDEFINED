import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../database/prisma.service';
import { MonitoramentoService } from '../monitoramento/monitoramento.service';
import { ServicosService } from './servicos.service';

// Os serviços reais são exercitados com dependências de configuração e banco isoladas.
jest.mock('@nestjs/config', () => ({ ConfigService: jest.fn() }));
jest.mock('../../database/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

type ServiceState =
  'DISPONIVEL' | 'INDISPONIVEL' | 'SEM_METRICAS' | 'REMOVIDO' | 'DESCONHECIDO';

type StoredService = {
  id: number;
  idExterno: string;
  nome: string;
  estadoAtual: ServiceState;
};

type StoredCollection = {
  id: number;
  servicoId: number;
  estadoColeta: 'SUCESSO' | 'FALHA' | 'SEM_METRICAS';
};

type ServiceFilter = {
  idExterno?: { in: string[] };
  estadoAtual?: ServiceState | { not: ServiceState };
};

const externalService = (id: string) => ({
  id,
  name: `Serviço ${id}`,
  location: {
    region_code: 'br-sudeste',
    country: 'Brazil',
    region: 'Sudeste',
    city: 'Sao Paulo',
  },
});

describe('Descoberta e retomada do monitoramento de serviços', () => {
  let services: StoredService[];
  let collections: StoredCollection[];
  let servicosService: ServicosService;
  let monitoramentoService: MonitoramentoService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let prisma: ReturnType<typeof createPrismaMock>;

  function matches(service: StoredService, where: ServiceFilter = {}) {
    if (where.idExterno && !where.idExterno.in.includes(service.idExterno)) {
      return false;
    }

    if (typeof where.estadoAtual === 'string') {
      return service.estadoAtual === where.estadoAtual;
    }

    return !where.estadoAtual || service.estadoAtual !== where.estadoAtual.not;
  }

  function createPrismaMock() {
    return {
      regiao: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      servico: {
        findMany: jest.fn(async (args: { where?: ServiceFilter } = {}) =>
          services.filter((service) => matches(service, args.where)),
        ),
        upsert: jest.fn(
          async ({
            where,
            update,
            create,
          }: {
            where: { idExterno: string };
            update: Partial<StoredService>;
            create: Omit<StoredService, 'id'>;
          }) => {
            const existing = services.find(
              (service) => service.idExterno === where.idExterno,
            );

            if (existing) {
              Object.assign(existing, update);
              return existing;
            }

            const service = {
              id: Math.max(0, ...services.map((entry) => entry.id)) + 1,
              ...create,
            };
            services.push(service);
            return service;
          },
        ),
        updateMany: jest.fn(
          async ({
            where,
            data,
          }: {
            where: ServiceFilter;
            data: Partial<StoredService>;
          }) => {
            const matching = services.filter((service) =>
              matches(service, where),
            );
            matching.forEach((service) => Object.assign(service, data));
            return { count: matching.length };
          },
        ),
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { id: number };
            data: Partial<StoredService>;
          }) => {
            const service = services.find((entry) => entry.id === where.id);
            if (!service) throw new Error('Serviço inexistente no teste.');
            return Object.assign(service, data);
          },
        ),
      },
      coleta: {
        create: jest.fn(
          async ({ data }: { data: Omit<StoredCollection, 'id'> }) => {
            const collection = { id: collections.length + 1, ...data };
            collections.push(collection);
            return collection;
          },
        ),
      },
    };
  }

  function seedService(estadoAtual: ServiceState, idExterno = 'billing-api') {
    const service: StoredService = {
      id: services.length + 1,
      idExterno,
      nome: `Serviço ${idExterno}`,
      estadoAtual,
    };
    services.push(service);
    return service;
  }

  function expectNoWrites() {
    expect(prisma.regiao.upsert).not.toHaveBeenCalled();
    expect(prisma.servico.upsert).not.toHaveBeenCalled();
    expect(prisma.servico.updateMany).not.toHaveBeenCalled();
    expect(prisma.servico.update).not.toHaveBeenCalled();
    expect(prisma.coleta.create).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    services = [];
    collections = [];
    prisma = createPrismaMock();
    const configValues: Record<string, string | number> = {
      METRICS_API_URL: 'https://metrics.example.test',
      METRICS_POLL_INTERVAL_MS: 30000,
    };
    const config = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;
    const prismaService = prisma as unknown as PrismaService;
    servicosService = new ServicosService(prismaService, config);
    monitoramentoService = new MonitoramentoService(
      prismaService,
      config,
      servicosService,
    );
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Requisição inesperada no teste.'));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('cadastra um serviço novo como DESCONHECIDO antes da primeira coleta', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([externalService('novo')]));

    await servicosService.syncServices();

    expect(services).toHaveLength(1);
    expect(services[0].estadoAtual).toBe('DESCONHECIDO');
    expect(collections).toEqual([]);
  });

  it.each<ServiceState>([
    'DISPONIVEL',
    'INDISPONIVEL',
    'SEM_METRICAS',
    'DESCONHECIDO',
  ])('preserva %s enquanto o serviço continua listado', async (state) => {
    const service = seedService(state);
    fetchMock.mockResolvedValueOnce(
      Response.json([externalService('billing-api')]),
    );

    await servicosService.syncServices();

    expect(service.estadoAtual).toBe(state);
  });

  it('marca apenas o serviço ausente como REMOVIDO e preserva o histórico', async () => {
    const missing = seedService('DISPONIVEL', 'ausente');
    const listed = seedService('INDISPONIVEL', 'listado');
    const previous = {
      id: 1,
      servicoId: missing.id,
      estadoColeta: 'SUCESSO' as const,
    };
    collections.push(previous);
    fetchMock.mockResolvedValueOnce(
      Response.json([externalService('listado')]),
    );

    await servicosService.syncServices();

    expect(missing.estadoAtual).toBe('REMOVIDO');
    expect(listed.estadoAtual).toBe('INDISPONIVEL');
    expect(services).toHaveLength(2);
    expect(collections).toEqual([previous]);
  });

  it.each([
    { payload: [] },
    { payload: { services: [] } },
    { payload: { data: [] } },
  ])(
    'marca os serviços anteriores como REMOVIDO em uma descoberta vazia válida: %j',
    async ({ payload }) => {
      seedService('DISPONIVEL');
      seedService('SEM_METRICAS', 'worker');
      fetchMock.mockResolvedValueOnce(Response.json(payload));

      await servicosService.syncServices();

      expect(services.map((service) => service.estadoAtual)).toEqual([
        'REMOVIDO',
        'REMOVIDO',
      ]);
    },
  );

  it('reativa o serviço que reaparece como DESCONHECIDO, mantendo seu id', async () => {
    const service = seedService('REMOVIDO');
    fetchMock.mockResolvedValueOnce(
      Response.json([externalService('billing-api')]),
    );

    await servicosService.syncServices();

    expect(services).toHaveLength(1);
    expect(services[0].id).toBe(service.id);
    expect(service.estadoAtual).toBe('DESCONHECIDO');
  });

  it('retoma a coleta após desaparecimento e retorno, preservando coletas anteriores', async () => {
    const service = seedService('DISPONIVEL');
    const previous = {
      id: 1,
      servicoId: service.id,
      estadoColeta: 'SUCESSO' as const,
    };
    collections.push(previous);
    fetchMock.mockResolvedValueOnce(Response.json([]));

    await monitoramentoService.pollOnce();

    expect(service.estadoAtual).toBe('REMOVIDO');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(collections).toEqual([previous]);

    fetchMock
      .mockResolvedValueOnce(Response.json([externalService('billing-api')]))
      .mockResolvedValueOnce(
        Response.json({ metrics: { cpu_percent: 25, memory_gb: 2 } }),
      );

    await monitoramentoService.pollOnce();

    expect(service.estadoAtual).toBe('DISPONIVEL');
    expect(services).toHaveLength(1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://metrics.example.test/metrics/billing-api',
      expect.any(Object),
    );
    expect(collections).toHaveLength(2);
    expect(collections[0]).toEqual(previous);
    expect(collections[1]).toMatchObject({
      servicoId: service.id,
      estadoColeta: 'SUCESSO',
    });
  });

  it.each([
    ['INDISPONIVEL', 'FALHA', () => new Response(null, { status: 503 })],
    ['SEM_METRICAS', 'SEM_METRICAS', () => Response.json({ metrics: {} })],
  ] as const)(
    'determina %s pela coleta após o retorno do serviço',
    async (expectedState, collectionState, response) => {
      const service = seedService('REMOVIDO');
      fetchMock
        .mockResolvedValueOnce(Response.json([externalService('billing-api')]))
        .mockResolvedValueOnce(response());

      await monitoramentoService.pollOnce();

      expect(service.estadoAtual).toBe(expectedState);
      expect(collections).toEqual([
        expect.objectContaining({
          servicoId: service.id,
          estadoColeta: collectionState,
        }),
      ]);
    },
  );

  it('preserva os estados quando a descoberta falha por erro de rede', async () => {
    const service = seedService('DISPONIVEL');
    fetchMock.mockRejectedValueOnce(new Error('Falha de rede'));

    await expect(servicosService.syncServices()).rejects.toThrow(
      'Falha de rede',
    );

    expect(service.estadoAtual).toBe('DISPONIVEL');
    expectNoWrites();
  });

  it('preserva os estados quando a API de descoberta retorna erro HTTP', async () => {
    const service = seedService('SEM_METRICAS');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(servicosService.syncServices()).rejects.toThrow('503');

    expect(service.estadoAtual).toBe('SEM_METRICAS');
    expectNoWrites();
  });

  it('não altera o banco quando a resposta de descoberta não contém JSON válido', async () => {
    seedService('DISPONIVEL');
    fetchMock.mockResolvedValueOnce(new Response('JSON inválido'));

    await expect(servicosService.syncServices()).rejects.toThrow();

    expectNoWrites();
  });

  it.each([
    { payload: null },
    { payload: {} },
    { payload: { error: 'service_unavailable' } },
    { payload: { errors: [] } },
    { payload: { error: 'service_unavailable', services: [] } },
    { payload: { success: false, data: [] } },
    { payload: [{}] },
    { payload: [externalService('billing-api'), {}] },
  ])(
    'rejeita uma descoberta inválida sem alterar estados: %j',
    async ({ payload }) => {
      const service = seedService('DISPONIVEL');
      fetchMock.mockResolvedValueOnce(Response.json(payload));

      await expect(servicosService.syncServices()).rejects.toThrow();

      expect(service.estadoAtual).toBe('DISPONIVEL');
      expectNoWrites();
    },
  );
});
