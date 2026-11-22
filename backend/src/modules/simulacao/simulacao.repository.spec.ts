jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from "../../database/prisma.service";
import { SimulacaoRepository } from "./simulacao.repository";

describe("SimulacaoRepository", () => {
  const inicio = new Date("2026-11-10T12:00:00.000Z");
  const fim = new Date("2026-11-11T12:00:00.000Z");

  it("busca o serviço com a região atual", async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const repository = new SimulacaoRepository({
      servico: { findUnique },
    } as unknown as PrismaService);

    await repository.buscarServico(7);

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { id: true, nome: true, regiaoCodigo: true },
    });
  });

  it("soma a energia das coletas calculadas do serviço no período", async () => {
    const aggregate = jest.fn().mockResolvedValue({
      _sum: { energiaKwh: 0.25 },
      _count: { _all: 12 },
    });
    const repository = new SimulacaoRepository({
      coleta: { aggregate },
    } as unknown as PrismaService);

    await expect(repository.somarEnergia(7, inicio, fim)).resolves.toEqual({
      energiaKwh: 0.25,
      coletas: 12,
    });
    expect(aggregate).toHaveBeenCalledWith({
      where: {
        servicoId: 7,
        estadoCalculo: "CONCLUIDO",
        iniciadaEm: { gte: inicio, lte: fim },
      },
      _sum: { energiaKwh: true },
      _count: { _all: true },
    });
  });

  it("lista as regiões que têm serviço, em ordem de código", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new SimulacaoRepository({
      regiao: { findMany },
    } as unknown as PrismaService);

    await repository.listarRegioes();

    expect(findMany).toHaveBeenCalledWith({
      where: { servicos: { some: {} } },
      select: { codigo: true, pais: true, regiao: true, cidade: true },
      orderBy: { codigo: "asc" },
    });
  });

  it("calcula a intensidade média por região no período", async () => {
    const groupBy = jest.fn().mockResolvedValue([
      {
        regiaoCodigoNaColeta: "br-sudeste",
        _avg: { intensidadeCarbonoGCo2ePorKwh: 90.5 },
        _count: { intensidadeCarbonoGCo2ePorKwh: 4 },
      },
      {
        regiaoCodigoNaColeta: null,
        _avg: { intensidadeCarbonoGCo2ePorKwh: 10 },
        _count: { intensidadeCarbonoGCo2ePorKwh: 1 },
      },
    ]);
    const repository = new SimulacaoRepository({
      coleta: { groupBy },
    } as unknown as PrismaService);

    await expect(
      repository.mediaIntensidadePorRegiao(inicio, fim),
    ).resolves.toEqual([
      { regiaoCodigo: "br-sudeste", intensidadeMedia: 90.5, amostras: 4 },
    ]);
    expect(groupBy).toHaveBeenCalledWith({
      by: ["regiaoCodigoNaColeta"],
      where: {
        iniciadaEm: { gte: inicio, lte: fim },
        regiaoCodigoNaColeta: { not: null },
        intensidadeCarbonoGCo2ePorKwh: { not: null },
      },
      _avg: { intensidadeCarbonoGCo2ePorKwh: true },
      _count: { intensidadeCarbonoGCo2ePorKwh: true },
    });
  });
});
