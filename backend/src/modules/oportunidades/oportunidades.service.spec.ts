jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { OportunidadesRepository } from "./oportunidades.repository";
import { OportunidadesService } from "./oportunidades.service";

describe("OportunidadesService", () => {
  const repository = {
    listarServicos: jest.fn(),
    agregarMetricasPorServico: jest.fn(),
    listarRegioesMonitoradas: jest.fn(),
    mediaIntensidadePorRegiao: jest.fn(),
    obterMatrizHorariaPorRegiao: jest.fn(),
  };

  const service = new OportunidadesService(
    repository as unknown as OportunidadesRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("orquestra os dados do repositório e devolve oportunidades ordenadas pelo ganho", async () => {
    const inicio = new Date("2026-11-10T00:00:00.000Z");
    const fim = new Date("2026-11-11T00:00:00.000Z");

    repository.listarServicos.mockResolvedValue([
      {
        id: 1,
        nome: "Media CDN",
        estadoAtual: "DISPONIVEL",
        regiaoCodigo: "jp-east",
      },
      {
        id: 2,
        nome: "Auth Service",
        estadoAtual: "DISPONIVEL",
        regiaoCodigo: "br-sudeste",
      },
    ]);
    repository.agregarMetricasPorServico.mockResolvedValue([
      {
        servicoId: 1,
        energiaKwh: 0.5,
        emissaoGCo2e: 250,
        cpuMediaPercent: 10,
      },
      {
        servicoId: 2,
        energiaKwh: 0.05,
        emissaoGCo2e: 5,
        cpuMediaPercent: 40,
      },
    ]);
    repository.listarRegioesMonitoradas.mockResolvedValue([
      { codigo: "jp-east", pais: "Japão", regiao: "Tóquio", cidade: "Tóquio" },
      {
        codigo: "br-sudeste",
        pais: "Brasil",
        regiao: "Sudeste",
        cidade: "São Paulo",
      },
    ]);
    repository.mediaIntensidadePorRegiao.mockResolvedValue([
      { regiaoCodigo: "jp-east", intensidadeMedia: 500 },
      { regiaoCodigo: "br-sudeste", intensidadeMedia: 100 },
    ]);
    repository.obterMatrizHorariaPorRegiao.mockResolvedValue([
      {
        regiaoCodigo: "jp-east",
        diaSemana: 1,
        hora: 2,
        media: 150,
        quantidadeAmostras: 4,
      },
      {
        regiaoCodigo: "jp-east",
        diaSemana: 1,
        hora: 3,
        media: 150,
        quantidadeAmostras: 4,
      },
      {
        regiaoCodigo: "jp-east",
        diaSemana: 1,
        hora: 4,
        media: 150,
        quantidadeAmostras: 4,
      },
      {
        regiaoCodigo: "jp-east",
        diaSemana: 1,
        hora: 14,
        media: 350,
        quantidadeAmostras: 4,
      },
      {
        regiaoCodigo: "jp-east",
        diaSemana: 1,
        hora: 15,
        media: 350,
        quantidadeAmostras: 4,
      },
      {
        regiaoCodigo: "jp-east",
        diaSemana: 1,
        hora: 16,
        media: 350,
        quantidadeAmostras: 4,
      },
    ]);

    const resposta = await service.listar(inicio, fim);

    expect(resposta.periodo).toEqual({
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
    });
    expect(resposta.resumo.totalOportunidades).toBe(3);
    expect(resposta.oportunidades[0].tipo).toBe("MIGRAR_REGIAO");
    expect(resposta.oportunidades[0].economiaEstimadaGCo2e).toBe(200);
    expect(resposta.resumo.reducaoPotencialGCo2e).toBe(375);
  });

  it("retorna lista vazia quando não há dados no período", async () => {
    repository.listarServicos.mockResolvedValue([]);
    repository.agregarMetricasPorServico.mockResolvedValue([]);
    repository.listarRegioesMonitoradas.mockResolvedValue([]);
    repository.mediaIntensidadePorRegiao.mockResolvedValue([]);
    repository.obterMatrizHorariaPorRegiao.mockResolvedValue([]);

    const resposta = await service.listar(
      new Date("2026-11-10T00:00:00.000Z"),
      new Date("2026-11-11T00:00:00.000Z"),
    );

    expect(resposta.oportunidades).toEqual([]);
    expect(resposta.resumo.totalOportunidades).toBe(0);
    expect(resposta.resumo.reducaoPotencialGCo2e).toBe(0);
  });
});
