jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from "../../database/prisma.service";
import { ComparacaoRepository } from "./comparacao.repository";

describe("ComparacaoRepository", () => {
  const inicio = new Date("2026-11-10T12:15:00.000Z");
  const fim = new Date("2026-11-11T12:15:00.000Z");

  it("agrega somente cálculos concluídos dos serviços e período solicitados", async () => {
    const groupBy = jest.fn().mockResolvedValue([
      {
        servicoId: 1,
        _sum: { energiaKwh: 0.01, emissaoGCo2e: 0.85 },
        _avg: { cpuPercent: 12.5, memoryGb: 0.25 },
        _count: { _all: 40 },
      },
    ]);
    const repository = new ComparacaoRepository({
      coleta: { groupBy },
    } as unknown as PrismaService);
    await expect(repository.obterTotais([1, 2], inicio, fim)).resolves.toEqual([
      {
        servicoId: 1,
        energiaKwh: 0.01,
        emissaoGCo2e: 0.85,
        cpuMedia: 12.5,
        memoriaMediaMb: 256,
        coletasValidas: 40,
      },
    ]);
    expect(groupBy).toHaveBeenCalledWith({
      by: ["servicoId"],
      where: {
        servicoId: { in: [1, 2] },
        estadoCalculo: "CONCLUIDO",
        iniciadaEm: { gte: inicio, lte: fim },
      },
      _sum: { energiaKwh: true, emissaoGCo2e: true },
      _avg: { cpuPercent: true, memoryGb: true },
      _count: { _all: true },
    });
  });

  it("preserva totais e médias nulos quando não há medições", async () => {
    const groupBy = jest.fn().mockResolvedValue([
      {
        servicoId: 3,
        _sum: { energiaKwh: null, emissaoGCo2e: null },
        _avg: { cpuPercent: null, memoryGb: null },
        _count: { _all: 0 },
      },
    ]);
    const repository = new ComparacaoRepository({
      coleta: { groupBy },
    } as unknown as PrismaService);

    await expect(repository.obterTotais([3], inicio, fim)).resolves.toEqual([
      {
        servicoId: 3,
        energiaKwh: null,
        emissaoGCo2e: null,
        cpuMedia: null,
        memoriaMediaMb: null,
        coletasValidas: 0,
      },
    ]);
  });

  it.each([
    ["hora", "hour", "UTC"],
    ["dia", "day", "America/Sao_Paulo"],
  ] as const)(
    "agrega série por %s com limites inclusivos",
    async (granularidade, unidade, fuso) => {
      const queryRaw = jest.fn().mockResolvedValue([]);
      const repository = new ComparacaoRepository({
        $queryRaw: queryRaw,
      } as unknown as PrismaService);
      await repository.obterSerie([1, 2], inicio, fim, granularidade);
      const [partes, ...valores] = queryRaw.mock.calls[0] as [
        TemplateStringsArray,
        ...unknown[],
      ];
      const sql = partes.join("?");
      expect(valores).toEqual([unidade, fuso, fuso, [1, 2], inicio, fim]);
      expect(sql).toContain(`c."estadoCalculo" = 'CONCLUIDO'`);
      expect(sql).toContain(`c."servicoId" = ANY(?`);
      expect(sql).toContain(`c."iniciadaEm" >= ?`);
      expect(sql).toContain(`c."iniciadaEm" <= ?`);
      expect(sql).toContain("GROUP BY 1, 2");
    },
  );
});
