import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { ColetasService } from "../coletas/coletas.service";
import {
  CreateColetaDto,
  EstadoColetaEnum,
} from "../coletas/dto/create-coleta.dto";
import { MonitoramentoService } from "../monitoramento/monitoramento.service";
import type { ConfiguracaoService } from "../configuracao/configuracao.service";
import type { ServicosRepository } from "./servicos.repository";
import { ServicosService } from "./servicos.service";

// Os serviços reais são exercitados com dependências de configuração e banco isoladas.
jest.mock("@nestjs/config", () => ({ ConfigService: jest.fn() }));
jest.mock("./servicos.repository", () => ({
  ServicosRepository: jest.fn(),
}));

type ServiceState =
  "DISPONIVEL" | "INDISPONIVEL" | "SEM_METRICAS" | "REMOVIDO" | "DESCONHECIDO";

type StoredService = {
  id: number;
  idExterno: string;
  nome: string;
  estadoAtual: ServiceState;
  regiaoCodigo?: string;
};

type StoredCollection = {
  id: number;
  servicoId: number;
  estadoColeta: "SUCESSO" | "FALHA" | "SEM_METRICAS";
};

const externalService = (id: string) => ({
  id,
  name: `Serviço ${id}`,
  location: {
    region_code: "br-sudeste",
    country: "Brazil",
    region: "Sudeste",
    city: "Sao Paulo",
  },
});

describe("Descoberta e retomada do monitoramento de serviços", () => {
  let services: StoredService[];
  let collections: StoredCollection[];
  let servicosService: ServicosService;
  let monitoramentoService: MonitoramentoService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let registrarColeta: jest.Mock;
  let repository: ReturnType<typeof createRepositoryMock>;

  function createRepositoryMock() {
    return {
      upsertRegiao: jest.fn().mockResolvedValue({}),
      listarParaMonitoramento: jest.fn(() =>
        services.filter((service) => service.estadoAtual !== "REMOVIDO"),
      ),
      upsertServicoDescoberto: jest.fn(
        ({
          idExterno,
          nome,
          regiaoCodigo,
        }: {
          idExterno: string;
          nome: string;
          regiaoCodigo: string;
          caminhoMetricas: string;
        }) => {
          const existing = services.find(
            (service) => service.idExterno === idExterno,
          );

          if (existing) {
            Object.assign(existing, { nome, regiaoCodigo });
            return existing;
          }

          const service = {
            id: Math.max(0, ...services.map((entry) => entry.id)) + 1,
            idExterno,
            nome,
            regiaoCodigo,
            estadoAtual: "DESCONHECIDO" as const,
          };
          services.push(service);
          return service;
        },
      ),
      restaurarServicosRemovidos: jest.fn((idsExternos: string[]) => {
        const matching = services.filter(
          (service) =>
            idsExternos.includes(service.idExterno) &&
            service.estadoAtual === "REMOVIDO",
        );
        matching.forEach((service) => {
          service.estadoAtual = "DESCONHECIDO";
        });
        return { count: matching.length };
      }),
      listarIdsExternos: jest.fn(() =>
        services.map((service) => service.idExterno),
      ),
      marcarServicosComoRemovidos: jest.fn((idsExternos: string[]) => {
        const matching = services.filter((service) =>
          idsExternos.includes(service.idExterno),
        );
        matching.forEach((service) => {
          service.estadoAtual = "REMOVIDO";
        });
        return { count: matching.length };
      }),
      atualizarEstadoMonitoramento: jest.fn(
        (id: number, estadoAtual: ServiceState) => {
          const service = services.find((entry) => entry.id === id);
          if (!service) throw new Error("Serviço inexistente no teste.");
          return Object.assign(service, { estadoAtual });
        },
      ),
      listarComLocalizacao: jest.fn(() => services),
      findById: jest.fn(
        (id: number) => services.find((service) => service.id === id) ?? null,
      ),
      verificarSchema: jest.fn().mockResolvedValue(undefined),
    };
  }

  function seedService(estadoAtual: ServiceState, idExterno = "billing-api") {
    const service: StoredService = {
      id: services.length + 1,
      idExterno,
      nome: `Serviço ${idExterno}`,
      estadoAtual,
      regiaoCodigo: "br-sudeste",
    };
    services.push(service);
    return service;
  }

  function expectNoWrites() {
    expect(repository.upsertRegiao).not.toHaveBeenCalled();
    expect(repository.upsertServicoDescoberto).not.toHaveBeenCalled();
    expect(repository.restaurarServicosRemovidos).not.toHaveBeenCalled();
    expect(repository.marcarServicosComoRemovidos).not.toHaveBeenCalled();
    expect(repository.atualizarEstadoMonitoramento).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    services = [];
    collections = [];
    repository = createRepositoryMock();
    const configValues: Record<string, string | number> = {
      METRICS_API_URL: "https://metrics.example.test",
      METRICS_POLL_INTERVAL_MS: 30000,
    };
    const config = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;
    servicosService = new ServicosService(
      repository as unknown as ServicosRepository,
      config,
    );
    registrarColeta = jest.fn((data: CreateColetaDto) => {
      const estadoColeta =
        data.estadoColeta === EstadoColetaEnum.SUCESSO
          ? "SUCESSO"
          : data.estadoColeta === EstadoColetaEnum.SEM_METRICAS
            ? "SEM_METRICAS"
            : "FALHA";
      collections.push({
        id: collections.length + 1,
        servicoId: data.servicoId,
        estadoColeta,
      });
      return Promise.resolve(data);
    });
    const coletasService = {
      registrarColeta,
    } as unknown as ColetasService;
    monitoramentoService = new MonitoramentoService(
      config,
      servicosService,
      coletasService,
      {
        obter: jest.fn().mockResolvedValue({
          intervaloColetaSegundos: 30,
          intervaloDescobertaSegundos: 30,
        }),
      } as unknown as ConfiguracaoService,
    );
    fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Requisição inesperada no teste."));
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("cadastra um serviço novo como DESCONHECIDO antes da primeira coleta", async () => {
    fetchMock.mockResolvedValueOnce(Response.json([externalService("novo")]));

    await servicosService.syncServices();

    expect(services).toHaveLength(1);
    expect(services[0].estadoAtual).toBe("DESCONHECIDO");
    expect(collections).toEqual([]);
  });

  it.each<ServiceState>([
    "DISPONIVEL",
    "INDISPONIVEL",
    "SEM_METRICAS",
    "DESCONHECIDO",
  ])("preserva %s enquanto o serviço continua listado", async (state) => {
    const service = seedService(state);
    fetchMock.mockResolvedValueOnce(
      Response.json([externalService("billing-api")]),
    );

    await servicosService.syncServices();

    expect(service.estadoAtual).toBe(state);
  });

  it("marca apenas o serviço ausente como REMOVIDO e preserva o histórico", async () => {
    const missing = seedService("DISPONIVEL", "ausente");
    const listed = seedService("INDISPONIVEL", "listado");
    const previous = {
      id: 1,
      servicoId: missing.id,
      estadoColeta: "SUCESSO" as const,
    };
    collections.push(previous);
    fetchMock.mockResolvedValueOnce(
      Response.json([externalService("listado")]),
    );

    await servicosService.syncServices();

    expect(missing.estadoAtual).toBe("REMOVIDO");
    expect(listed.estadoAtual).toBe("INDISPONIVEL");
    expect(services).toHaveLength(2);
    expect(collections).toEqual([previous]);
  });

  it.each([
    { payload: [] },
    { payload: { services: [] } },
    { payload: { data: [] } },
  ])(
    "marca os serviços anteriores como REMOVIDO em uma descoberta vazia válida: %j",
    async ({ payload }) => {
      seedService("DISPONIVEL");
      seedService("SEM_METRICAS", "worker");
      fetchMock.mockResolvedValueOnce(Response.json(payload));

      await servicosService.syncServices();

      expect(services.map((service) => service.estadoAtual)).toEqual([
        "REMOVIDO",
        "REMOVIDO",
      ]);
    },
  );

  it("interrompe a descoberta após o tempo limite sem marcar serviços como REMOVIDO", async () => {
    jest.useFakeTimers();
    const service = seedService("DISPONIVEL");
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );

    const descoberta = servicosService.syncServices();
    const verificacao = expect(descoberta).rejects.toThrow(
      "Tempo limite de 8000ms excedido ao consultar a lista de serviços externos.",
    );

    await jest.advanceTimersByTimeAsync(8000);
    await verificacao;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(service.estadoAtual).toBe("DISPONIVEL");
  });

  it("reativa o serviço que reaparece como DESCONHECIDO, mantendo seu id", async () => {
    const service = seedService("REMOVIDO");
    fetchMock.mockResolvedValueOnce(
      Response.json([externalService("billing-api")]),
    );

    await servicosService.syncServices();

    expect(services).toHaveLength(1);
    expect(services[0].id).toBe(service.id);
    expect(service.estadoAtual).toBe("DESCONHECIDO");
  });

  it("gera o código de região quando a API externa não informa region_code", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json([
        {
          id: "novo",
          name: "Serviço novo",
          location: {
            country: "Brasil",
            region: "Sudeste",
            city: "São Paulo",
          },
        },
      ]),
    );

    await servicosService.syncServices();

    expect(repository.upsertRegiao).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: "brasil-sudeste-s-o-paulo-s-o-paulo",
      }),
    );
  });

  it("retoma a coleta após desaparecimento e retorno, preservando coletas anteriores", async () => {
    jest.useFakeTimers();
    const service = seedService("DISPONIVEL");
    const previous = {
      id: 1,
      servicoId: service.id,
      estadoColeta: "SUCESSO" as const,
    };
    collections.push(previous);
    fetchMock.mockResolvedValueOnce(Response.json([]));

    await monitoramentoService.pollOnce();

    expect(service.estadoAtual).toBe("REMOVIDO");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(collections).toEqual([previous]);

    jest.advanceTimersByTime(30000);
    fetchMock
      .mockResolvedValueOnce(Response.json([externalService("billing-api")]))
      .mockResolvedValueOnce(
        Response.json({
          collection_interval_seconds: 27,
          metrics: {
            cpu_percent: 25,
            memory_gb: 2,
            disk_gb: 3,
            network_gb: 4,
          },
        }),
      );

    await monitoramentoService.pollOnce();

    expect(service.estadoAtual).toBe("DISPONIVEL");
    expect(services).toHaveLength(1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://metrics.example.test/metrics/billing-api",
      expect.any(Object),
    );
    expect(collections).toHaveLength(2);
    expect(collections[0]).toEqual(previous);
    expect(collections[1]).toMatchObject({
      servicoId: service.id,
      estadoColeta: "SUCESSO",
    });
    expect(registrarColeta).toHaveBeenCalledWith(
      expect.objectContaining({
        servicoId: service.id,
        estadoColeta: EstadoColetaEnum.SUCESSO,
        cpuPercent: 25,
        memoryGb: 2,
        diskGb: 3,
        networkGb: 4,
        intervaloColetaSegundos: 27,
      }),
    );
  });

  it("classifica métricas todas zeradas como SEM_METRICAS no serviço e na coleta", async () => {
    const service = seedService("DESCONHECIDO");
    fetchMock
      .mockResolvedValueOnce(Response.json([externalService("billing-api")]))
      .mockResolvedValueOnce(
        Response.json({
          collection_interval_seconds: 30,
          metrics: {
            cpu_percent: 0,
            memory_gb: 0,
            disk_gb: 0,
            network_gb: 0,
          },
        }),
      );

    await monitoramentoService.pollOnce();

    expect(service.estadoAtual).toBe("SEM_METRICAS");
    expect(registrarColeta).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoColeta: EstadoColetaEnum.SEM_METRICAS,
        regiaoCodigoNaColeta: "br-sudeste",
      }),
    );
  });

  it("classifica HTTP 404 nas métricas como SEM_METRICAS e registra a região", async () => {
    const service = seedService("DISPONIVEL");
    fetchMock
      .mockResolvedValueOnce(Response.json([externalService("billing-api")]))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    await monitoramentoService.pollOnce();

    expect(service.estadoAtual).toBe("SEM_METRICAS");
    expect(registrarColeta).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoColeta: EstadoColetaEnum.SEM_METRICAS,
        codigoErro: "404",
        regiaoCodigoNaColeta: "br-sudeste",
      }),
    );
  });

  it("classifica HTTP 500 nas métricas como INDISPONIVEL", async () => {
    const service = seedService("DISPONIVEL");
    fetchMock
      .mockResolvedValueOnce(Response.json([externalService("billing-api")]))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await monitoramentoService.pollOnce();

    expect(service.estadoAtual).toBe("INDISPONIVEL");
    expect(registrarColeta).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoColeta: EstadoColetaEnum.FALHA,
        codigoErro: "500",
        regiaoCodigoNaColeta: "br-sudeste",
      }),
    );
  });

  it("não usa a frequência do scheduler como duração da medição", async () => {
    seedService("DESCONHECIDO");
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    fetchMock
      .mockResolvedValueOnce(Response.json([externalService("billing-api")]))
      .mockResolvedValueOnce(
        Response.json({
          metrics: { cpu_percent: 25 },
        }),
      );

    await monitoramentoService.pollOnce();

    expect(registrarColeta).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoColeta: EstadoColetaEnum.SUCESSO,
        cpuPercent: 25,
        intervaloColetaSegundos: undefined,
      }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "A API de métricas não retornou um collection_interval_seconds válido para billing-api; o cálculo ficará pendente.",
    );
  });

  it("ignora um ciclo iniciado enquanto outro ainda está em execução", async () => {
    let finishCycle: () => void = () => undefined;
    const pendingCycle = new Promise<
      Awaited<ReturnType<ServicosService["syncServices"]>>
    >((resolve) => {
      finishCycle = () => resolve([]);
    });
    const syncServices = jest
      .spyOn(servicosService, "syncServices")
      .mockReturnValueOnce(pendingCycle)
      .mockResolvedValue([]);
    const collectMetrics = jest
      .spyOn(monitoramentoService, "collectMetricsForAllServices")
      .mockResolvedValue();

    const firstCycle = monitoramentoService.pollOnce();
    await monitoramentoService.pollOnce();
    await Promise.resolve();

    expect(syncServices).toHaveBeenCalledTimes(1);
    expect(collectMetrics).not.toHaveBeenCalled();

    finishCycle();
    await firstCycle;

    expect(collectMetrics).toHaveBeenCalledTimes(1);

    await monitoramentoService.pollOnce();

    expect(syncServices).toHaveBeenCalledTimes(1);
    expect(collectMetrics).toHaveBeenCalledTimes(2);
  });

  it("libera a trava após erro para permitir o próximo ciclo", async () => {
    const syncServices = jest
      .spyOn(servicosService, "syncServices")
      .mockRejectedValueOnce(new Error("Falha de rede"))
      .mockResolvedValue([]);
    const collectMetrics = jest
      .spyOn(monitoramentoService, "collectMetricsForAllServices")
      .mockResolvedValue();

    await monitoramentoService.pollOnce();
    await monitoramentoService.pollOnce();

    expect(syncServices).toHaveBeenCalledTimes(2);
    expect(collectMetrics).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["INDISPONIVEL", "FALHA", () => new Response(null, { status: 503 })],
    ["SEM_METRICAS", "SEM_METRICAS", () => Response.json({ metrics: {} })],
  ] as const)(
    "determina %s pela coleta após o retorno do serviço",
    async (expectedState, collectionState, response) => {
      const service = seedService("REMOVIDO");
      fetchMock
        .mockResolvedValueOnce(Response.json([externalService("billing-api")]))
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

  it("aborta uma coleta após timeout e continua com os demais serviços", async () => {
    jest.useFakeTimers();
    const timedOutService = seedService("DESCONHECIDO", "slow-api");
    const nextService = seedService("DESCONHECIDO", "healthy-api");
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    fetchMock.mockImplementation((input, init) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (requestUrl.includes("slow-api")) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        });
      }

      return Promise.resolve(
        Response.json({ metrics: { cpu_percent: 25, memory_gb: 2 } }),
      );
    });

    const collectionCycle = monitoramentoService.collectMetricsForAllServices();
    await jest.advanceTimersByTimeAsync(8000);
    await collectionCycle;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(timedOutService.estadoAtual).toBe("INDISPONIVEL");
    expect(nextService.estadoAtual).toBe("DISPONIVEL");
    expect(collections).toEqual([
      expect.objectContaining({
        servicoId: timedOutService.id,
        estadoColeta: "FALHA",
      }),
      expect.objectContaining({
        servicoId: nextService.id,
        estadoColeta: "SUCESSO",
      }),
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      "Tempo limite de 8000ms excedido ao consultar métricas do serviço slow-api.",
    );
    expect(jest.getTimerCount()).toBe(0);
  });

  it("preserva os estados quando a descoberta falha por erro de rede", async () => {
    const service = seedService("DISPONIVEL");
    fetchMock.mockRejectedValueOnce(new Error("Falha de rede"));

    await expect(servicosService.syncServices()).rejects.toThrow(
      "Falha de rede",
    );

    expect(service.estadoAtual).toBe("DISPONIVEL");
    expectNoWrites();
  });

  it("preserva os estados quando a API de descoberta retorna erro HTTP", async () => {
    const service = seedService("SEM_METRICAS");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(servicosService.syncServices()).rejects.toThrow("503");

    expect(service.estadoAtual).toBe("SEM_METRICAS");
    expectNoWrites();
  });

  it("não altera o banco quando a resposta de descoberta não contém JSON válido", async () => {
    seedService("DISPONIVEL");
    fetchMock.mockResolvedValueOnce(new Response("JSON inválido"));

    await expect(servicosService.syncServices()).rejects.toThrow();

    expectNoWrites();
  });

  it.each([
    { payload: null },
    { payload: {} },
    { payload: { error: "service_unavailable" } },
    { payload: { errors: [] } },
    { payload: { error: "service_unavailable", services: [] } },
    { payload: { success: false, data: [] } },
    { payload: [{}] },
    { payload: [externalService("billing-api"), {}] },
  ])(
    "rejeita uma descoberta inválida sem alterar estados: %j",
    async ({ payload }) => {
      const service = seedService("DISPONIVEL");
      fetchMock.mockResolvedValueOnce(Response.json(payload));

      await expect(servicosService.syncServices()).rejects.toThrow();

      expect(service.estadoAtual).toBe("DISPONIVEL");
      expectNoWrites();
    },
  );

  it("delega a verificação do schema para o repository", async () => {
    await servicosService.verificarSchema();

    expect(repository.verificarSchema).toHaveBeenCalledTimes(1);
  });

  it("busca serviço por id via repository", async () => {
    seedService("DISPONIVEL");

    await expect(servicosService.findById(1)).resolves.toEqual(
      expect.objectContaining({
        id: 1,
        idExterno: "billing-api",
      }),
    );
    expect(repository.findById).toHaveBeenCalledWith(1);
  });

  it("falha quando METRICS_API_URL não está configurada", async () => {
    const semUrl = new ServicosService(
      repository as unknown as ServicosRepository,
      {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService,
    );

    await expect(semUrl.discoverServices()).rejects.toThrow(
      "METRICS_API_URL não configurada.",
    );
  });

  it("usa valores padrão de localização quando o payload externo não informa região", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json([
        {
          id: "sem-regiao",
          name: "Sem Região",
        },
      ]),
    );

    await servicosService.syncServices();

    expect(repository.upsertRegiao).toHaveBeenCalledWith(
      expect.objectContaining({
        pais: "Desconhecida",
        regiao: "Desconhecida",
        cidade: null,
      }),
    );
  });

  it("aplica fallback para código de região sem localização útil", () => {
    const codigo = (
      servicosService as unknown as {
        buildRegiaoCodigo: (service: { localizacao: string }) => string;
      }
    ).buildRegiaoCodigo({
      localizacao: "",
    });

    expect(codigo).toBe("regiao-desconhecida");
  });
});
