jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { MetricaRanking, RankingQueryDto } from "./dto/ranking-query.dto";
import { IndicadoresRepository } from "./indicadores.repository";
import { calcularSeloEficiencia, RankingService } from "./ranking.service";

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

  describe("calcularSeloEficiencia", () => {
    it.each([
      { emissao: 10, selo: "A" },
      { emissao: 10.01, selo: "B" },
      { emissao: 20, selo: "B" },
      { emissao: 20.01, selo: "C" },
      { emissao: 30, selo: "C" },
      { emissao: 30.01, selo: "D" },
      { emissao: 40, selo: "D" },
      { emissao: 40.01, selo: "E" },
      { emissao: 50, selo: "E" },
      { emissao: 50.01, selo: "F" },
    ])("classifica emissão $emissao como selo $selo", ({ emissao, selo }) => {
      expect(calcularSeloEficiencia(emissao)).toBe(selo);
    });

    it.each([null, undefined])(
      "retorna travessão quando a emissão é %s",
      (emissao) => {
        expect(calcularSeloEficiencia(emissao)).toBe("—");
      },
    );
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
          selo: "A",
        },
        {
          posicao: 2,
          servicoId: 3,
          nome: "Zulu",
          energiaKwh: 5,
          emissaoGCo2e: 8,
          coletasValidas: 4,
          selo: "A",
        },
        {
          posicao: 3,
          servicoId: 4,
          nome: "Gamma",
          energiaKwh: 1,
          emissaoGCo2e: 4,
          coletasValidas: 1,
          selo: "A",
        },
      ],
      semDados: [{ servicoId: 5, nome: "Sem coleta", selo: "—" }],
    });

    expect(listarServicosParaRanking).toHaveBeenCalledTimes(1);
    expect(somarImpactoPorServico).toHaveBeenCalledWith(
      new Date(inicio),
      new Date(fim),
    );
  });

  it("calcula o selo pela emissão média por hora do período e marca ausência", async () => {
    listarServicosParaRanking.mockResolvedValue([
      { id: 1, nome: "API", estadoAtual: "DISPONIVEL" },
      { id: 2, nome: "Sem coleta", estadoAtual: "DISPONIVEL" },
    ]);
    somarImpactoPorServico
      .mockResolvedValueOnce([
        {
          servicoId: 1,
          energiaKwh: 1,
          emissaoGCo2e: 40,
          coletasValidas: 1,
        },
      ])
      .mockResolvedValueOnce([]);

    const resultado = await service.obterRanking(
      Object.assign(new RankingQueryDto(), {
        inicio: "2026-11-01T10:00:00.000Z",
        fim: "2026-11-01T11:00:00.000Z",
      }),
    );

    expect(resultado.itens).toMatchObject([{ selo: "D" }]);
    expect(resultado.variacaoPorServico).toMatchObject([{ selo: "D" }]);
    expect(resultado.semDados).toEqual([
      { servicoId: 2, nome: "Sem coleta", selo: "—" },
    ]);
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
          selo: "A",
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
          emissaoAtualGCo2e: null,
          emissaoAnteriorGCo2e: 50,
          diferencaGCo2e: null,
          variacaoPercentual: null,
        },
      ],
    });
    expect(somarImpactoPorServico).toHaveBeenNthCalledWith(
      2,
      new Date("2026-10-24T23:59:59.999Z"),
      new Date("2026-10-31T23:59:59.999Z"),
    );
  });

  it.each([null, 0])(
    "distingue emissão atual ausente (%s) de zero medido na variação por serviço",
    async (emissaoAtual) => {
      somarImpactoPorServico
        .mockResolvedValueOnce([
          {
            servicoId: 1,
            energiaKwh: 10,
            emissaoGCo2e: emissaoAtual,
            coletasValidas: 1,
          },
        ])
        .mockResolvedValueOnce([
          {
            servicoId: 1,
            energiaKwh: 10,
            emissaoGCo2e: 100,
            coletasValidas: 1,
          },
        ]);

      expect(
        await service.obterRanking(
          Object.assign(new RankingQueryDto(), { inicio, fim }),
        ),
      ).toMatchObject({
        variacaoPorServico: [
          {
            servicoId: 1,
            emissaoAtualGCo2e: emissaoAtual,
            emissaoAnteriorGCo2e: 100,
            diferencaGCo2e: emissaoAtual === null ? null : -100,
            variacaoPercentual: emissaoAtual === null ? null : -100,
          },
        ],
      });
    },
  );

  it("não transforma a ausência de agregados atuais em redução global de 100%", async () => {
    somarImpactoPorServico
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { servicoId: 1, energiaKwh: 10, emissaoGCo2e: 100, coletasValidas: 1 },
      ]);
    expect(
      await service.obterRanking(
        Object.assign(new RankingQueryDto(), { inicio, fim }),
      ),
    ).toMatchObject({
      variacaoPercentual: { energiaKwh: null, emissaoGCo2e: null },
      variacaoPorServico: [
        {
          servicoId: 1,
          emissaoAtualGCo2e: null,
          emissaoAnteriorGCo2e: 100,
          diferencaGCo2e: null,
          variacaoPercentual: null,
        },
      ],
    });
  });

  it("calcula redução global de 100% quando o zero foi medido", async () => {
    somarImpactoPorServico
      .mockResolvedValueOnce([
        { servicoId: 1, energiaKwh: 0, emissaoGCo2e: 0, coletasValidas: 1 },
      ])
      .mockResolvedValueOnce([
        { servicoId: 1, energiaKwh: 10, emissaoGCo2e: 100, coletasValidas: 1 },
      ]);
    expect(
      await service.obterRanking(
        Object.assign(new RankingQueryDto(), { inicio, fim }),
      ),
    ).toMatchObject({
      variacaoPercentual: { energiaKwh: -100, emissaoGCo2e: -100 },
    });
  });

  it("não transforma em zero métricas ausentes mesmo quando há impacto atual", async () => {
    somarImpactoPorServico
      .mockResolvedValueOnce([
        {
          servicoId: 1,
          energiaKwh: 10,
          emissaoGCo2e: null,
          coletasValidas: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          servicoId: 1,
          energiaKwh: 10,
          emissaoGCo2e: 100,
          coletasValidas: 1,
        },
      ]);
    expect(
      await service.obterRanking(
        Object.assign(new RankingQueryDto(), { inicio, fim }),
      ),
    ).toMatchObject({
      variacaoPercentual: { energiaKwh: 0, emissaoGCo2e: null },
    });
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
