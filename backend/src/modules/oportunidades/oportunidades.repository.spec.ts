jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from "../../database/prisma.service";
import { OportunidadesRepository } from "./oportunidades.repository";

describe("OportunidadesRepository", () => {
  const prisma = {
    servico: { findMany: jest.fn() },
    coleta: { groupBy: jest.fn() },
    regiao: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };

  const repository = new OportunidadesRepository(
    prisma as unknown as PrismaService,
  );
  const inicio = new Date("2026-11-10T00:00:00.000Z");
  const fim = new Date("2026-11-11T00:00:00.000Z");

  beforeEach(() => jest.clearAllMocks());

  it("consulta serviços, métricas agregadas, regiões, intensidades e matriz horária", async () => {
    prisma.servico.findMany.mockResolvedValue([
      {
        id: 1,
        nome: "API",
        estadoAtual: "DISPONIVEL",
        regiaoCodigo: "us-east",
      },
    ]);
    prisma.coleta.groupBy.mockResolvedValueOnce([
      {
        servicoId: 1,
        _sum: { energiaKwh: 0.4, emissaoGCo2e: 120 },
        _avg: { cpuPercent: 12 },
      },
    ]);
    prisma.regiao.findMany.mockResolvedValue([
      { codigo: "us-east", pais: "EUA", regiao: "Virgínia", cidade: "Ashburn" },
    ]);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          regiaoCodigo: "us-east",
          intensidadeMedia: 300,
        },
      ])
      .mockResolvedValueOnce([
        {
          regiaoCodigo: "us-east",
          diaSemana: 2,
          hora: 3,
          media: 210.5,
          quantidadeAmostras: BigInt(6),
        },
      ]);

    const servicos = await repository.listarServicos();
    const metricas = await repository.agregarMetricasPorServico(inicio, fim);
    const regioes = await repository.listarRegioesMonitoradas();
    const intensidades = await repository.mediaIntensidadePorRegiao(
      inicio,
      fim,
    );
    const matriz = await repository.obterMatrizHorariaPorRegiao(inicio, fim);

    expect(servicos).toHaveLength(1);
    expect(metricas).toEqual([
      {
        servicoId: 1,
        energiaKwh: 0.4,
        emissaoGCo2e: 120,
        cpuMediaPercent: 12,
      },
    ]);
    expect(regioes).toHaveLength(1);
    expect(intensidades).toEqual([
      { regiaoCodigo: "us-east", intensidadeMedia: 300 },
    ]);
    expect(matriz).toEqual([
      {
        regiaoCodigo: "us-east",
        diaSemana: 2,
        hora: 3,
        media: 210.5,
        quantidadeAmostras: 6,
      },
    ]);
  });
});
