jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { MetricaRanking, RankingQueryDto } from "./dto/ranking-query.dto";
import { IndicadoresRepository } from "./indicadores.repository";
import { RankingService } from "./ranking.service";

describe("RankingService", () => {
  const inicio = "2026-11-01T00:00:00.000Z";
  const fim = "2026-11-08T00:00:00.000Z";
  const listarServicosParaRanking = jest.fn();
  const somarImpactoPorServico = jest.fn();
  const repository = {
    listarServicosParaRanking,
    somarImpactoPorServico,
  };
  const service = new RankingService(
    repository as unknown as IndicadoresRepository,
  );

  beforeEach(() => {
    listarServicosParaRanking.mockReset().mockResolvedValue([
      { id: 1, nome: "Beta", estadoAtual: "DISPONIVEL" },
      { id: 2, nome: "Alpha", estadoAtual: "DISPONIVEL" },
      { id: 3, nome: "Zulu", estadoAtual: "DISPONIVEL" },
      { id: 4, nome: "Gamma", estadoAtual: "DISPONIVEL" },
      { id: 5, nome: "Sem coleta", estadoAtual: "DISPONIVEL" },
      { id: 6, nome: "Removido", estadoAtual: "REMOVIDO" },
    ]);
    somarImpactoPorServico.mockReset().mockResolvedValue([
      {
        servicoId: 1,
        energiaKwh: 10,
        emissaoGCo2e: 2,
        coletasValidas: 3,
      },
      {
        servicoId: 2,
        energiaKwh: 4,
        emissaoGCo2e: 8,
        coletasValidas: 2,
      },
      {
        servicoId: 3,
        energiaKwh: 5,
        emissaoGCo2e: 8,
        coletasValidas: 4,
      },
      {
        servicoId: 4,
        energiaKwh: 1,
        emissaoGCo2e: 4,
        coletasValidas: 1,
      },
    ]);
  });

  it("retorna período, ambas as métricas, posição, desempate, limite e semDados", async () => {
    const query = Object.assign(new RankingQueryDto(), {
      inicio,
      fim,
      metrica: MetricaRanking.EMISSAO,
      limite: 3,
    });

    await expect(service.obterRanking(query)).resolves.toEqual({
      periodo: { inicio, fim },
      metrica: MetricaRanking.EMISSAO,
      itens: [
        {
          posicao: 1,
          servicoId: 2,
          nome: "Alpha",
          energiaKwh: 4,
          emissaoGCo2e: 8,
          coletasValidas: 2,
        },
        {
          posicao: 2,
          servicoId: 3,
          nome: "Zulu",
          energiaKwh: 5,
          emissaoGCo2e: 8,
          coletasValidas: 4,
        },
        {
          posicao: 3,
          servicoId: 4,
          nome: "Gamma",
          energiaKwh: 1,
          emissaoGCo2e: 4,
          coletasValidas: 1,
        },
      ],
      semDados: [{ servicoId: 5, nome: "Sem coleta" }],
    });

    expect(listarServicosParaRanking).toHaveBeenCalledTimes(1);
    expect(somarImpactoPorServico).toHaveBeenCalledWith(
      new Date(inicio),
      new Date(fim),
    );
  });
});
