jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from "../../database/prisma.service";
import { MapaRepository } from "./mapa.repository";

describe("MapaRepository", () => {
  const inicio = new Date("2026-11-10T12:00:00.000Z");
  const fim = new Date("2026-11-11T12:00:00.000Z");

  it("lista serviços com a região, ordenados por nome", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new MapaRepository({
      servico: { findMany },
    } as unknown as PrismaService);

    await repository.listarServicosComRegiao();

    expect(findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        nome: true,
        estadoAtual: true,
        regiaoCodigo: true,
        regiao: {
          select: {
            pais: true,
            regiao: true,
            cidade: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    });
  });

  it.each([
    ["hora", "hour", "UTC"],
    ["dia", "day", "America/Sao_Paulo"],
  ] as const)(
    "agrega coletas calculadas por %s com os parâmetros vinculados",
    async (granularidade, unidade, fuso) => {
      const linhas = [
        {
          servicoId: 1,
          inicioIntervalo: new Date("2026-11-10T12:00:00.000Z"),
          energiaKwh: 0.002,
          emissaoGCo2e: 0.2,
        },
      ];
      const queryRaw = jest.fn().mockResolvedValue(linhas);
      const repository = new MapaRepository({
        $queryRaw: queryRaw,
      } as unknown as PrismaService);

      await expect(
        repository.somarImpactoPorIntervalo(inicio, fim, granularidade),
      ).resolves.toBe(linhas);

      const [partes, ...valores] = queryRaw.mock.calls[0] as [
        TemplateStringsArray,
        ...unknown[],
      ];
      const sql = partes.join("?");

      expect(valores).toEqual([unidade, fuso, fuso, inicio, fim]);
      expect(sql).toContain(`c."estadoCalculo" = 'CONCLUIDO'`);
      expect(sql).toContain(`c."iniciadaEm" >= ?`);
      expect(sql).toContain(`c."iniciadaEm" <= ?`);
      expect(sql).toContain("GROUP BY 1, 2");
    },
  );
});
