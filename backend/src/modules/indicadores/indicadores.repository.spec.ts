jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { IndicadoresRepository } from "./indicadores.repository";
import { PrismaService } from "../../database/prisma.service";

describe("IndicadoresRepository", () => {
  it("soma apenas coletas calculadas dentro do período solicitado", async () => {
    const inicio = new Date("2026-11-07T12:00:00.000Z");
    const fim = new Date("2026-11-08T12:00:00.000Z");
    const aggregate = jest.fn().mockResolvedValue({
      _sum: { energiaKwh: 2.5, emissaoGCo2e: 100 },
      _count: { _all: 2 },
    });
    const repository = new IndicadoresRepository({
      coleta: { aggregate },
    } as unknown as PrismaService);

    await expect(
      repository.somarImpactoNoPeriodo(inicio, fim),
    ).resolves.toEqual({
      energiaKwh: 2.5,
      emissaoGCo2e: 100,
      coletasCalculadas: 2,
    });
    expect(aggregate).toHaveBeenCalledWith({
      where: {
        estadoCalculo: "CONCLUIDO",
        iniciadaEm: { gte: inicio, lte: fim },
      },
      _sum: { energiaKwh: true, emissaoGCo2e: true },
      _count: { _all: true },
    });
  });

  it("agrega energia, emissão e coletas válidas por serviço no período", async () => {
    const inicio = new Date("2026-11-07T12:00:00.000Z");
    const fim = new Date("2026-11-08T12:00:00.000Z");
    const groupBy = jest.fn().mockResolvedValue([
      {
        servicoId: 7,
        _sum: { energiaKwh: 0.0123, emissaoGCo2e: 1.04 },
        _count: { id: 42 },
      },
    ]);
    const repository = new IndicadoresRepository({
      coleta: { groupBy },
    } as unknown as PrismaService);

    await expect(
      repository.somarImpactoPorServico(inicio, fim),
    ).resolves.toEqual([
      {
        servicoId: 7,
        energiaKwh: 0.0123,
        emissaoGCo2e: 1.04,
        coletasValidas: 42,
      },
    ]);
    expect(groupBy).toHaveBeenCalledWith({
      by: ["servicoId"],
      where: {
        estadoCalculo: "CONCLUIDO",
        iniciadaEm: { gte: inicio, lte: fim },
      },
      _sum: { energiaKwh: true, emissaoGCo2e: true },
      _count: { id: true },
    });
  });

  it("lista serviços com identificador, nome e estado para o ranking", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new IndicadoresRepository({
      servico: { findMany },
    } as unknown as PrismaService);

    await repository.listarServicosParaRanking();

    expect(findMany).toHaveBeenCalledWith({
      select: { id: true, nome: true, estadoAtual: true },
    });
  });
});
