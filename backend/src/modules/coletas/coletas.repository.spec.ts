jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from "../../database/prisma.service";
import { ColetasRepository } from "./coletas.repository";
import { FilterColetasDto } from "./dto/filter-coleta.dto";
import {
  CreateColetaDto,
  EstadoCalculoEnum,
  EstadoColetaEnum,
} from "./dto/create-coleta.dto";

type CreateColetaArgs = {
  data: CreateColetaDto & {
    iniciadaEm: Date;
    estadoCalculo: EstadoCalculoEnum;
  };
};

describe("ColetasRepository", () => {
  const create = jest.fn<Promise<unknown>, [CreateColetaArgs]>();
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const findFirst = jest.fn();
  const count = jest.fn();
  const transaction = jest.fn((consultas: Promise<unknown>[]) =>
    Promise.all(consultas),
  );
  const repository = new ColetasRepository({
    coleta: { create, findMany, findUnique, findFirst, count },
    $transaction: transaction,
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
  });

  it("mapeia os dados recebidos ao criar uma coleta", async () => {
    const iniciadaEm = new Date("2026-11-18T00:00:00Z");
    const finalizadaEm = new Date("2026-11-18T00:01:00Z");
    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.SUCESSO,
      regiaoCodigoNaColeta: "br-sudeste",
      iniciadaEm,
      finalizadaEm,
      intervaloColetaSegundos: 60,
      codigoErro: "E-1",
      mensagemErro: "Erro de teste",
      cpuPercent: 10,
      memoryGb: 2,
      diskGb: 3,
      networkGb: 4,
      intensidadeCarbonoGCo2ePorKwh: 85,
      estadoCalculo: EstadoCalculoEnum.CONCLUIDO,
      energiaKwh: 0.01,
      emissaoGCo2e: 0.85,
    };
    const coleta = { id: 1 };
    create.mockResolvedValue(coleta);

    await expect(repository.create(dto)).resolves.toBe(coleta);
    expect(create).toHaveBeenCalledWith({
      data: {
        servicoId: 7,
        estadoColeta: EstadoColetaEnum.SUCESSO,
        regiaoCodigoNaColeta: "br-sudeste",
        iniciadaEm,
        finalizadaEm,
        intervaloColetaSegundos: 60,
        codigoErro: "E-1",
        mensagemErro: "Erro de teste",
        cpuPercent: 10,
        memoryGb: 2,
        diskGb: 3,
        networkGb: 4,
        intensidadeCarbonoGCo2ePorKwh: 85,
        estadoCalculo: EstadoCalculoEnum.CONCLUIDO,
        energiaKwh: 0.01,
        emissaoGCo2e: 0.85,
      },
    });
  });

  it("preenche data de início e estado de cálculo padrão quando ausentes", async () => {
    await repository.create({
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.FALHA,
    });

    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.FALHA,
      estadoCalculo: EstadoCalculoEnum.PENDENTE,
    });
    expect(data.iniciadaEm).toBeInstanceOf(Date);
  });

  it("lista coletas com serviço e os dois limites do período", async () => {
    const dataInicio = new Date("2026-11-01T00:00:00Z");
    const dataFim = new Date("2026-11-02T00:00:00Z");

    await repository.findMany({ servicoId: 7, dataInicio, dataFim });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        servicoId: 7,
        iniciadaEm: { gte: dataInicio, lte: dataFim },
      },
      orderBy: [{ iniciadaEm: "desc" }, { id: "desc" }],
      skip: 0,
      take: 20,
      include: { servico: { select: { idExterno: true, nome: true } } },
    });
    expect(count).toHaveBeenCalledWith({
      where: {
        servicoId: 7,
        iniciadaEm: { gte: dataInicio, lte: dataFim },
      },
    });
  });

  it("lista coletas sem filtros", async () => {
    await expect(repository.findMany({})).resolves.toEqual({
      itens: [],
      pagina: 1,
      tamanho: 20,
      total: 0,
      totalPaginas: 0,
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ iniciadaEm: "desc" }, { id: "desc" }],
      skip: 0,
      take: 20,
      include: { servico: { select: { idExterno: true, nome: true } } },
    });
  });

  it("consulta apenas a página pedida e arredonda o total de páginas para cima", async () => {
    const itens = [{ id: 21, servico: { nome: "API", idExterno: "api" } }];
    findMany.mockResolvedValue(itens);
    count.mockResolvedValue(41);

    await expect(
      repository.findMany(
        Object.assign(new FilterColetasDto(), { pagina: 2, tamanho: 20 }),
      ),
    ).resolves.toEqual({
      itens,
      pagina: 2,
      tamanho: 20,
      total: 41,
      totalPaginas: 3,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
    expect(count).toHaveBeenCalledWith({ where: {} });
    expect(transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: "RepeatableRead",
    });
  });

  it("retorna página vazia além da última sem perder os metadados", async () => {
    count.mockResolvedValue(40);

    await expect(
      repository.findMany(
        Object.assign(new FilterColetasDto(), { pagina: 5, tamanho: 10 }),
      ),
    ).resolves.toEqual({
      itens: [],
      pagina: 5,
      tamanho: 10,
      total: 40,
      totalPaginas: 4,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 10 }),
    );
  });

  it("aplica somente o limite inicial quando não há data final", async () => {
    const dataInicio = new Date("2026-11-01T00:00:00Z");

    await repository.findMany({ dataInicio });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { iniciadaEm: { gte: dataInicio } },
      }),
    );
  });

  it("aplica somente o limite final quando não há data inicial", async () => {
    const dataFim = new Date("2026-11-02T00:00:00Z");

    await repository.findMany({ dataFim });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { iniciadaEm: { lte: dataFim } },
      }),
    );
  });

  it("busca uma coleta pelo id incluindo serviço e região", async () => {
    const coleta = { id: 7 };
    findUnique.mockResolvedValue(coleta);

    await expect(repository.findById(7)).resolves.toBe(coleta);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      include: { servico: true, regiao: true },
    });
  });

  it("busca a coleta bem-sucedida mais recente do serviço", async () => {
    const coleta = { id: 7 };
    findFirst.mockResolvedValue(coleta);

    await expect(repository.findLatestSuccessful(9)).resolves.toBe(coleta);
    expect(findFirst).toHaveBeenCalledWith({
      where: { servicoId: 9, estadoColeta: "SUCESSO" },
      orderBy: { iniciadaEm: "desc" },
    });
  });
});
