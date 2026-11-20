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

    await expect(service.obterRanking(query)).resolves.toMatchObject({
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

  it("usa energia por padrão, desempata por id e omite removidos sem dados", async () => {
    listarServicosParaRanking.mockResolvedValue([
      { id: 2, nome: "Alpha", estadoAtual: "DISPONIVEL" },
      { id: 1, nome: "Alpha", estadoAtual: "DISPONIVEL" },
      { id: 3, nome: "Zeta", estadoAtual: "DISPONIVEL" },
      { id: 4, nome: "Sem dados", estadoAtual: "DISPONIVEL" },
      { id: 5, nome: "Sem dados", estadoAtual: "DISPONIVEL" },
      { id: 6, nome: "Removido", estadoAtual: "REMOVIDO" },
    ]);
    somarImpactoPorServico.mockResolvedValue([
      {
        servicoId: 1,
        energiaKwh: 5,
        emissaoGCo2e: null,
        coletasValidas: 1,
      },
      {
        servicoId: 2,
        energiaKwh: 5,
        emissaoGCo2e: 1,
        coletasValidas: 2,
      },
      {
        servicoId: 3,
        energiaKwh: null,
        emissaoGCo2e: 8,
        coletasValidas: 3,
      },
    ]);
    const query = Object.assign(new RankingQueryDto(), {
      inicio,
      fim,
      limite: undefined,
    });

    await expect(service.obterRanking(query)).resolves.toMatchObject({
      periodo: { inicio, fim },
      metrica: MetricaRanking.ENERGIA,
      itens: [
        {
          posicao: 1,
          servicoId: 1,
          nome: "Alpha",
          energiaKwh: 5,
          emissaoGCo2e: 0,
          coletasValidas: 1,
        },
        {
          posicao: 2,
          servicoId: 2,
          nome: "Alpha",
          energiaKwh: 5,
          emissaoGCo2e: 1,
          coletasValidas: 2,
        },
      ],
      semDados: [
        { servicoId: 4, nome: "Sem dados" },
        { servicoId: 5, nome: "Sem dados" },
        { servicoId: 3, nome: "Zeta" },
      ],
    });
  });

  it("compara todos os serviços, inclusive fora do limite e somente na janela anterior", async () => {
    listarServicosParaRanking.mockResolvedValue([
      { id: 1, nome: "API", estadoAtual: "DISPONIVEL" },
      { id: 2, nome: "Worker", estadoAtual: "REMOVIDO" },
      { id: 3, nome: "Novo", estadoAtual: "DISPONIVEL" },
      { id: 4, nome: "Sem coleta", estadoAtual: "DISPONIVEL" },
    ]);
    somarImpactoPorServico
      .mockResolvedValueOnce([
        {
          servicoId: 1,
          energiaKwh: 112,
          emissaoGCo2e: 95,
          coletasValidas: 2,
        },
        { servicoId: 3, energiaKwh: 10, emissaoGCo2e: 20, coletasValidas: 1 },
      ])
      .mockResolvedValueOnce([
        {
          servicoId: 1,
          energiaKwh: 100,
          emissaoGCo2e: 100,
          coletasValidas: 2,
        },
        { servicoId: 2, energiaKwh: 10, emissaoGCo2e: 50, coletasValidas: 1 },
      ]);

    const resultado = await service.obterRanking(
      Object.assign(new RankingQueryDto(), { inicio, fim, limite: 1 }),
    );
    expect(resultado.itens).toHaveLength(1);
    expect(resultado).toMatchObject({
      periodoAnterior: {
        inicio: "2026-10-24T23:59:59.999Z",
        fim: "2026-10-31T23:59:59.999Z",
      },
      variacaoPercentual: {
        energiaKwh: (12 / 110) * 100,
        emissaoGCo2e: (-35 / 150) * 100,
      },
      variacaoPorServico: [
        {
          servicoId: 1,
          nome: "API",
          emissaoAtualGCo2e: 95,
          emissaoAnteriorGCo2e: 100,
          diferencaGCo2e: -5,
          variacaoPercentual: -5,
        },
        {
          servicoId: 3,
          nome: "Novo",
          emissaoAtualGCo2e: 20,
          emissaoAnteriorGCo2e: null,
          diferencaGCo2e: null,
          variacaoPercentual: null,
        },
        {
          servicoId: 2,
          nome: "Worker",
          emissaoAtualGCo2e: 0,
          emissaoAnteriorGCo2e: 50,
          diferencaGCo2e: -50,
          variacaoPercentual: -100,
        },
      ],
    });
    expect(somarImpactoPorServico).toHaveBeenNthCalledWith(
      2,
      new Date("2026-10-24T23:59:59.999Z"),
      new Date("2026-10-31T23:59:59.999Z"),
    );
  });

  it.each([
    { anteriores: [] },
    {
      anteriores: [
        { servicoId: 1, energiaKwh: 0, emissaoGCo2e: 0, coletasValidas: 1 },
      ],
    },
  ])(
    "retorna percentual null sem dados anteriores ou com base zero",
    async ({ anteriores }) => {
      somarImpactoPorServico
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(anteriores);
      expect(
        await service.obterRanking(
          Object.assign(new RankingQueryDto(), { inicio, fim }),
        ),
      ).toMatchObject({
        variacaoPercentual: { energiaKwh: null, emissaoGCo2e: null },
      });
    },
  );
});
