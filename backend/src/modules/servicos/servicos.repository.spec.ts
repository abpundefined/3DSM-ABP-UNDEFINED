jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from "../../database/prisma.service";
import { ServicosRepository } from "./servicos.repository";

type RegiaoUpsertArgs = {
  where: { codigo: string };
  update: {
    pais: string;
    regiao: string;
    cidade: string | null;
    latitude: number | null;
    longitude: number | null;
    atualizadaEm: Date;
  };
  create: {
    codigo: string;
    pais: string;
    regiao: string;
    cidade: string | null;
    latitude: number | null;
    longitude: number | null;
    atualizadaEm: Date;
  };
};

type ServicoUpsertArgs = {
  where: { idExterno: string };
  update: {
    nome: string;
    regiaoCodigo: string;
    caminhoMetricas: string;
    ultimaVezListadoEm: Date;
    atualizadoEm: Date;
  };
  create: {
    idExterno: string;
    nome: string;
    regiaoCodigo: string;
    caminhoMetricas: string;
    estadoAtual: "DESCONHECIDO";
    descobertoEm: Date;
    ultimaVezListadoEm: Date;
    atualizadoEm: Date;
  };
};

type ServicoUpdateManyArgs = {
  where: {
    idExterno: { in: string[] };
    estadoAtual?: "REMOVIDO";
  };
  data: {
    estadoAtual: "DESCONHECIDO" | "REMOVIDO";
    atualizadoEm: Date;
  };
};

type ServicoUpdateArgs = {
  where: { id: number };
  data: {
    estadoAtual: "DISPONIVEL";
    atualizadoEm: Date;
  };
};

describe("ServicosRepository", () => {
  const regiaoUpsert = jest.fn<Promise<unknown>, [RegiaoUpsertArgs]>(() =>
    Promise.resolve({}),
  );
  const servicoUpsert = jest.fn<Promise<unknown>, [ServicoUpsertArgs]>(() =>
    Promise.resolve({}),
  );
  const servicoUpdateMany = jest.fn<
    Promise<{ count: number }>,
    [ServicoUpdateManyArgs]
  >(() => Promise.resolve({ count: 1 }));
  const servicoFindMany = jest.fn<Promise<{ idExterno: string }[]>, [unknown]>(
    () => Promise.resolve([]),
  );
  const servicoUpdate = jest.fn<Promise<unknown>, [ServicoUpdateArgs]>(() =>
    Promise.resolve({}),
  );
  const servicoFindUnique = jest.fn<Promise<null>, [unknown]>(() =>
    Promise.resolve(null),
  );
  const verifySchema = jest.fn(() => Promise.resolve(undefined));

  const prisma = {
    regiao: { upsert: regiaoUpsert },
    servico: {
      upsert: servicoUpsert,
      updateMany: servicoUpdateMany,
      findMany: servicoFindMany,
      update: servicoUpdate,
      findUnique: servicoFindUnique,
    },
    verifySchema,
  } as unknown as PrismaService;
  const repository = new ServicosRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("persiste localização da região por upsert", async () => {
    await repository.upsertRegiao({
      codigo: "br-sudeste",
      pais: "Brasil",
      regiao: "Sudeste",
      cidade: "São Paulo",
      latitude: -23.55,
      longitude: -46.63,
    });

    const args = regiaoUpsert.mock.calls[0][0];
    expect(args).toMatchObject({
      where: { codigo: "br-sudeste" },
      update: {
        pais: "Brasil",
        regiao: "Sudeste",
        cidade: "São Paulo",
        latitude: -23.55,
        longitude: -46.63,
      },
      create: {
        codigo: "br-sudeste",
        pais: "Brasil",
        regiao: "Sudeste",
        cidade: "São Paulo",
        latitude: -23.55,
        longitude: -46.63,
      },
    });
    expect(args.update.atualizadaEm).toBeInstanceOf(Date);
    expect(args.create.atualizadaEm).toBeInstanceOf(Date);
  });

  it("salva serviço descoberto preservando estado atual", async () => {
    await repository.upsertServicoDescoberto({
      idExterno: "billing-api",
      nome: "Billing API",
      regiaoCodigo: "br-sudeste",
      caminhoMetricas: "/metrics/billing-api",
    });

    const args = servicoUpsert.mock.calls[0][0];
    expect(args).toMatchObject({
      where: { idExterno: "billing-api" },
      update: {
        nome: "Billing API",
        regiaoCodigo: "br-sudeste",
        caminhoMetricas: "/metrics/billing-api",
      },
      create: {
        idExterno: "billing-api",
        nome: "Billing API",
        regiaoCodigo: "br-sudeste",
        caminhoMetricas: "/metrics/billing-api",
        estadoAtual: "DESCONHECIDO",
      },
    });
    expect(args.update.ultimaVezListadoEm).toBeInstanceOf(Date);
    expect(args.update.atualizadoEm).toBeInstanceOf(Date);
    expect(args.create.descobertoEm).toBeInstanceOf(Date);
    expect(args.create.ultimaVezListadoEm).toBeInstanceOf(Date);
    expect(args.create.atualizadoEm).toBeInstanceOf(Date);
  });

  it("não atualiza removidos quando não recebeu ids descobertos", async () => {
    await repository.restaurarServicosRemovidos([]);

    expect(servicoUpdateMany).not.toHaveBeenCalled();
  });

  it("reativa para DESCONHECIDO os serviços removidos que reapareceram", async () => {
    await repository.restaurarServicosRemovidos(["billing-api"]);

    const args = servicoUpdateMany.mock.calls[0][0];
    expect(args.where).toEqual({
      idExterno: { in: ["billing-api"] },
      estadoAtual: "REMOVIDO",
    });
    expect(args.data.estadoAtual).toBe("DESCONHECIDO");
    expect(args.data.atualizadoEm).toBeInstanceOf(Date);
  });

  it("lista apenas os ids externos persistidos", async () => {
    servicoFindMany.mockResolvedValueOnce([
      { idExterno: "billing-api" },
      { idExterno: "worker-api" },
    ]);

    await expect(repository.listarIdsExternos()).resolves.toEqual([
      "billing-api",
      "worker-api",
    ]);
    expect(servicoFindMany).toHaveBeenCalledWith({
      select: { idExterno: true },
    });
  });

  it("não marca removidos quando a lista de ids está vazia", async () => {
    await repository.marcarServicosComoRemovidos([]);

    expect(servicoUpdateMany).not.toHaveBeenCalled();
  });

  it("marca como REMOVIDO os serviços ausentes na descoberta", async () => {
    await repository.marcarServicosComoRemovidos(["billing-api"]);

    const args = servicoUpdateMany.mock.calls[0][0];
    expect(args.where).toEqual({ idExterno: { in: ["billing-api"] } });
    expect(args.data.estadoAtual).toBe("REMOVIDO");
    expect(args.data.atualizadoEm).toBeInstanceOf(Date);
  });

  it("delega verificação de schema ao PrismaService", async () => {
    await repository.verificarSchema();

    expect(verifySchema).toHaveBeenCalledTimes(1);
  });

  it("lista serviços monitoráveis em ordem de atualização", async () => {
    await repository.listarParaMonitoramento();

    expect(servicoFindMany).toHaveBeenCalledWith({
      where: {
        estadoAtual: {
          not: "REMOVIDO",
        },
      },
      orderBy: { atualizadoEm: "desc" },
    });
  });

  it("atualiza o estado monitorado de um serviço", async () => {
    await repository.atualizarEstadoMonitoramento(7, "DISPONIVEL");

    const args = servicoUpdate.mock.calls[0][0];
    expect(args.where).toEqual({ id: 7 });
    expect(args.data.estadoAtual).toBe("DISPONIVEL");
    expect(args.data.atualizadoEm).toBeInstanceOf(Date);
  });

  it("lista serviços com dados da região para resposta da API", async () => {
    await repository.listarComLocalizacao();

    expect(servicoFindMany).toHaveBeenCalledWith({
      orderBy: { atualizadoEm: "desc" },
      include: { regiao: true },
    });
  });

  it("busca serviço por id", async () => {
    await repository.findById(9);

    expect(servicoFindUnique).toHaveBeenCalledWith({
      where: { id: 9 },
    });
  });
});
