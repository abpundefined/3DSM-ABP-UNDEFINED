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
});
