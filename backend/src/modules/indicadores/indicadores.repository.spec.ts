jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { IndicadoresRepository } from "./indicadores.repository";
import { PrismaService } from "../../database/prisma.service";

describe("IndicadoresRepository", () => {
  it("busca serviço por ID selecionando apenas o identificador", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 7 });
    const repository = new IndicadoresRepository({
      servico: { findUnique },
    } as unknown as PrismaService);

    await expect(repository.buscarServicoPorId("7")).resolves.toEqual({
      id: 7,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { id: true },
    });
  });

  it("não consulta o banco para um ID inválido", async () => {
    const findUnique = jest.fn();
    const repository = new IndicadoresRepository({
      servico: { findUnique },
    } as unknown as PrismaService);

    await expect(repository.buscarServicoPorId("7abc")).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["hora", "hour", "UTC"],
    ["dia", "day", "America/Sao_Paulo"],
  ] as const)(
    "agrupa série temporal por %s e converte as contagens bigint",
    async (granularidade, unidade, fuso) => {
      const inicio = new Date("2026-11-07T12:00:00.000Z");
      const fim = new Date("2026-11-08T12:00:00.000Z");
      const queryRaw = jest.fn().mockResolvedValue([
        {
          inicio,
          energia: 1.25,
          emissao: 12.5,
          mediaCpu: 24,
          mediaMemoria: 512,
          coletas: 3n,
          ativo: 1n,
          indisponivel: 1n,
          semMetricas: 1n,
        },
      ]);
      const repository = new IndicadoresRepository({
        $queryRaw: queryRaw,
      } as unknown as PrismaService);

      await expect(
        repository.obterSerieTemporal("7", inicio, fim, granularidade),
      ).resolves.toEqual([
        {
          inicio,
          energia: 1.25,
          emissao: 12.5,
          mediaCpu: 24,
          mediaMemoria: 512,
          coletas: 3,
          ativo: 1,
          indisponivel: 1,
          semMetricas: 1,
        },
      ]);

      const [partes, ...valores] = queryRaw.mock.calls[0] as [
        TemplateStringsArray,
        ...unknown[],
      ];
      const sql = partes.join("?");
      expect(valores).toEqual([unidade, fuso, fuso, 7, inicio, fim]);
      expect(sql).toContain('SUM(c."energiaKwh") AS "energia"');
      expect(sql).toContain('SUM(c."emissaoGCo2e") AS "emissao"');
      expect(sql).toContain('AVG(c."cpuPercent") AS "mediaCpu"');
      expect(sql).toContain('AVG(c."memoryGb") * 1024 AS "mediaMemoria"');
      expect(sql).toContain('COUNT(*) AS "coletas"');
      expect(sql).toContain(`c."estadoColeta" = 'SUCESSO'`);
      expect(sql).toContain(`c."estadoColeta" = 'FALHA'`);
      expect(sql).toContain(`c."estadoColeta" = 'SEM_METRICAS'`);
      expect(sql).toContain('c."servicoId" = ?');
      expect(sql).toContain('c."iniciadaEm" >= ?');
      expect(sql).toContain('c."iniciadaEm" <= ?');
      expect(sql).toContain("GROUP BY 1");
      expect(sql).toContain("ORDER BY 1");
    },
  );

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
