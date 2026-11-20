jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));
jest.mock("@nestjs/config", () => ({
  ConfigService: class ConfigService {},
}));

import { BadRequestException } from "@nestjs/common";
import type { CalculosService } from "../calculos/calculos.service";
import type { ConfiguracaoService } from "../configuracao/configuracao.service";
import { IntensidadeHorariosQueryDto } from "./dto/intensidade-horarios-query.dto";
import { PeriodoPredefinido } from "./dto/periodo.dto";
import { SerieTemporalQueryDto } from "./dto/serie-temporal-query.dto";
import { IndicadoresRepository } from "./indicadores.repository";
import { IndicadoresService } from "./indicadores.service";

describe("IndicadoresService", () => {
  const agora = new Date("2026-11-08T12:00:00.000Z");
  const inicioPadrao = new Date("2026-11-07T12:00:00.000Z");
  const repository = {
    somarImpactoNoPeriodo: jest.fn(),
    contarServicosPorEstado: jest.fn(),
    buscarUltimaColetaEm: jest.fn(),
    obterAgregacaoSerieTemporal: jest.fn(),
    obterSerieAgrupadaPorServico: jest.fn(),
    obterDadosMatrizIntensidade: jest.fn(),
    listarServicosParaRanking: jest.fn(),
  };
  const configuracaoService = { obter: jest.fn() };
  const calculosService = { calcularPotencia: jest.fn() };
  const service = new IndicadoresService(
    repository as unknown as IndicadoresRepository,
    configuracaoService as unknown as ConfiguracaoService,
    calculosService as unknown as CalculosService,
  );

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(agora);
    configuracaoService.obter.mockReset().mockResolvedValue({
      intervaloDescobertaSegundos: 120,
      intervaloColetaSegundos: 60,
      metaMensalKgCo2e: null,
      atualizadaEm: agora,
      padrao: false,
    });
    repository.somarImpactoNoPeriodo.mockReset().mockResolvedValue({
      energiaKwh: 0.0012,
      emissaoGCo2e: 0.102,
      coletasCalculadas: 3,
    });
    repository.contarServicosPorEstado.mockReset().mockResolvedValue([
      { estado: "DISPONIVEL", quantidade: 5 },
      { estado: "INDISPONIVEL", quantidade: 1 },
      { estado: "SEM_METRICAS", quantidade: 2 },
      { estado: "REMOVIDO", quantidade: 4 },
    ]);
    repository.buscarUltimaColetaEm
      .mockReset()
      .mockResolvedValue(new Date("2026-11-08T11:59:30.000Z"));
    repository.obterDadosMatrizIntensidade.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("obterMeta", () => {
    const configurarPeriodo = (
      dataAtual: Date,
      emissaoGCo2e: number | null,
    ) => {
      jest.setSystemTime(dataAtual);
      repository.somarImpactoNoPeriodo.mockReset().mockResolvedValue({
        energiaKwh: null,
        emissaoGCo2e,
        coletasCalculadas: 0,
      });
    };

    it("calcula acumulado e projeção quando há meta mensal definida", async () => {
      configurarPeriodo(new Date("2026-11-10T12:00:00.000Z"), 100000);
      configuracaoService.obter.mockResolvedValue({
        intervaloDescobertaSegundos: 120,
        intervaloColetaSegundos: 60,
        metaMensalKgCo2e: 500,
        atualizadaEm: agora,
        padrao: false,
      });

      await expect(service.obterMeta()).resolves.toEqual({
        metaMensal: 500,
        acumuladoMes: 100,
        diasDecorridos: 10,
        diasNoMes: 30,
        projecaoMes: 300,
      });
      expect(repository.somarImpactoNoPeriodo).toHaveBeenCalledWith(
        new Date("2026-11-01T03:00:00.000Z"),
        new Date("2026-11-10T12:00:00.000Z"),
      );
    });

    it("retorna os dados corretamente quando a meta mensal é null", async () => {
      configurarPeriodo(new Date("2026-11-10T12:00:00.000Z"), 100000);

      await expect(service.obterMeta()).resolves.toEqual({
        metaMensal: null,
        acumuladoMes: 100,
        diasDecorridos: 10,
        diasNoMes: 30,
        projecaoMes: 300,
      });
    });

    it.each([0, null])(
      "retorna projeção zero no início do mês quando o acumulado é %s",
      async (emissaoGCo2e) => {
        configurarPeriodo(new Date("2026-11-01T12:00:00.000Z"), emissaoGCo2e);
        configuracaoService.obter.mockResolvedValue({
          intervaloDescobertaSegundos: 120,
          intervaloColetaSegundos: 60,
          metaMensalKgCo2e: 500,
          atualizadaEm: agora,
          padrao: false,
        });

        await expect(service.obterMeta()).resolves.toEqual({
          metaMensal: 500,
          acumuladoMes: 0,
          diasDecorridos: 1,
          diasNoMes: 30,
          projecaoMes: 0,
        });
      },
    );

    it("projeta o acumulado ao longo do mês desde o primeiro dia", async () => {
      configurarPeriodo(new Date("2026-11-01T12:00:00.000Z"), 2000);

      const resultado = await service.obterMeta();

      expect(resultado.diasDecorridos).toBe(1);
      expect(resultado.acumuladoMes).toBe(2);
      expect(resultado.projecaoMes).toBe(
        resultado.acumuladoMes * resultado.diasNoMes,
      );
    });

    it("retorna acumulado e projeção zero quando não há dados no mês", async () => {
      configurarPeriodo(new Date("2026-11-15T12:00:00.000Z"), null);

      const resultado = await service.obterMeta();

      expect(resultado.acumuladoMes).toBe(0);
      expect(resultado.projecaoMes).toBe(0);
    });

    it.each([
      ["2026-02-15", 28],
      ["2026-04-15", 30],
      ["2026-01-15", 31],
    ])(
      "retorna corretamente os dias do mês para %s (%s dias)",
      async (data, diasNoMes) => {
        configurarPeriodo(new Date(`${data}T12:00:00.000Z`), 1000);

        const resultado = await service.obterMeta();

        expect(resultado.diasNoMes).toBe(diasNoMes);
      },
    );
  });

  it("consolida consumo, emissão e estados dos serviços", async () => {
    const indicadores = await service.obter(inicioPadrao, agora);

    expect(indicadores).toMatchObject({
      periodo: {
        inicio: inicioPadrao.toISOString(),
        fim: agora.toISOString(),
      },
      energiaTotalKwh: 0.0012,
      emissaoTotalGCo2e: 0.102,
      coletasCalculadas: 3,
      servicos: {
        monitorados: 8,
        disponiveis: 5,
        indisponiveis: 1,
        semMetricas: 2,
        desconhecidos: 0,
        removidos: 4,
      },
      ultimaColetaEm: new Date("2026-11-08T11:59:30.000Z"),
      geradoEm: agora,
    });
  });

  it("conta serviços disponíveis como ativos independente do resultado das métricas", async () => {
    repository.contarServicosPorEstado.mockResolvedValue([
      { estado: "DISPONIVEL", quantidade: 2 },
      { estado: "SEM_METRICAS", quantidade: 1 },
      { estado: "INDISPONIVEL", quantidade: 3 },
    ]);

    const indicadores = await service.obter(inicioPadrao, agora);

    expect(indicadores.servicos.disponiveis).toBe(2);
    expect(indicadores.servicos.indisponiveis).toBe(3);
    expect(indicadores.servicos.semMetricas).toBe(1);
  });

  it("usa as últimas 24 horas quando o período não é informado", async () => {
    await service.obter(inicioPadrao, agora);

    expect(repository.somarImpactoNoPeriodo).toHaveBeenCalledWith(
      inicioPadrao,
      agora,
    );
  });

  it("respeita o período informado", async () => {
    const dataInicio = new Date("2026-11-01T00:00:00.000Z");
    const dataFim = new Date("2026-11-02T00:00:00.000Z");

    const indicadores = await service.obter(dataInicio, dataFim);

    expect(repository.somarImpactoNoPeriodo).toHaveBeenCalledWith(
      dataInicio,
      dataFim,
    );
    expect(indicadores.periodo).toEqual({
      inicio: dataInicio.toISOString(),
      fim: dataFim.toISOString(),
    });
  });

  it("retorna zero quando não há coletas calculadas no período", async () => {
    repository.somarImpactoNoPeriodo.mockResolvedValue({
      energiaKwh: null,
      emissaoGCo2e: null,
      coletasCalculadas: 0,
    });
    repository.contarServicosPorEstado.mockResolvedValue([]);
    repository.buscarUltimaColetaEm.mockResolvedValue(null);

    const indicadores = await service.obter(inicioPadrao, agora);

    expect(indicadores.energiaTotalKwh).toBe(0);
    expect(indicadores.emissaoTotalGCo2e).toBe(0);
    expect(indicadores.coletasCalculadas).toBe(0);
    expect(indicadores.servicos.monitorados).toBe(0);
    expect(indicadores.ultimaColetaEm).toBeNull();
  });

  it("rejeita período com início posterior ao fim", async () => {
    await expect(
      service.obter(
        new Date("2026-11-03T00:00:00.000Z"),
        new Date("2026-11-02T00:00:00.000Z"),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.somarImpactoNoPeriodo).not.toHaveBeenCalled();
  });

  it("compara meses com a janela anterior de mesma duração, não com outro mês calendário", async () => {
    repository.somarImpactoNoPeriodo
      .mockReset()
      .mockResolvedValueOnce({
        energiaKwh: 30,
        emissaoGCo2e: 0,
        coletasCalculadas: 6,
      })
      .mockResolvedValueOnce({
        energiaKwh: 0,
        emissaoGCo2e: 0,
        coletasCalculadas: 3,
      });

    const inicio = new Date("2026-10-01T03:00:00.000Z");
    const fim = new Date("2026-11-01T02:59:59.999Z");
    const indicadores = await service.obter(
      inicio,
      fim,
      PeriodoPredefinido.MES_ANTERIOR,
    );

    expect(repository.somarImpactoNoPeriodo).toHaveBeenNthCalledWith(
      1,
      inicio,
      fim,
    );
    expect(repository.somarImpactoNoPeriodo).toHaveBeenNthCalledWith(
      2,
      new Date("2026-08-31T03:00:00.000Z"),
      new Date("2026-10-01T02:59:59.999Z"),
    );
    expect(indicadores.variacao).toEqual({
      energiaTotalKwh: { absoluta: 30, percentual: null },
      emissaoTotalGCo2e: { absoluta: 0, percentual: null },
      coletasCalculadas: { absoluta: 3, percentual: 100 },
    });
  });

  it("compara janeiro com o mês de dezembro do ano anterior", async () => {
    repository.somarImpactoNoPeriodo
      .mockReset()
      .mockResolvedValueOnce({
        energiaKwh: 10,
        emissaoGCo2e: 20,
        coletasCalculadas: 2,
      })
      .mockResolvedValueOnce({
        energiaKwh: 5,
        emissaoGCo2e: 10,
        coletasCalculadas: 1,
      });

    const inicio = new Date("2026-01-01T03:00:00.000Z");
    const fim = new Date("2026-02-01T02:59:59.999Z");
    const indicadores = await service.obter(
      inicio,
      fim,
      PeriodoPredefinido.MES_ANTERIOR,
    );

    expect(repository.somarImpactoNoPeriodo).toHaveBeenNthCalledWith(
      2,
      new Date("2025-12-01T03:00:00.000Z"),
      new Date("2026-01-01T02:59:59.999Z"),
    );
    expect(indicadores.variacao?.coletasCalculadas).toEqual({
      absoluta: 1,
      percentual: 100,
    });
  });

  it("propaga a falha do banco sem devolver indicadores incorretos", async () => {
    repository.somarImpactoNoPeriodo.mockRejectedValue(
      new Error("conexão perdida"),
    );

    await expect(service.obter(inicioPadrao, agora)).rejects.toThrow(
      "conexão perdida",
    );
  });

  it("devolve a variação de energia e emissão para qualquer período", async () => {
    repository.somarImpactoNoPeriodo
      .mockResolvedValueOnce({
        energiaKwh: 112,
        emissaoGCo2e: 95,
        coletasCalculadas: 2,
      })
      .mockResolvedValueOnce({
        energiaKwh: 100,
        emissaoGCo2e: 100,
        coletasCalculadas: 2,
      });

    expect(await service.obter(inicioPadrao, agora)).toMatchObject({
      periodoAnterior: {
        inicio: "2026-11-06T11:59:59.999Z",
        fim: "2026-11-07T11:59:59.999Z",
      },
      variacaoPercentual: { energiaKwh: 12, emissaoGCo2e: -5 },
    });
    expect(repository.somarImpactoNoPeriodo).toHaveBeenNthCalledWith(
      2,
      new Date("2026-11-06T11:59:59.999Z"),
      new Date("2026-11-07T11:59:59.999Z"),
    );
  });

  it.each([null, 0])(
    "não inventa base percentual quando o anterior é %s",
    async (anterior) => {
      repository.somarImpactoNoPeriodo
        .mockResolvedValueOnce({
          energiaKwh: 10,
          emissaoGCo2e: 20,
          coletasCalculadas: 2,
        })
        .mockResolvedValueOnce({
          energiaKwh: anterior,
          emissaoGCo2e: anterior,
          coletasCalculadas: anterior === null ? 0 : 1,
        });
      expect(await service.obter(inicioPadrao, agora)).toMatchObject({
        variacaoPercentual: { energiaKwh: null, emissaoGCo2e: null },
      });
    },
  );

  describe("obterSerieTemporal", () => {
    const inicio = "2026-11-01T00:00:00.000Z";
    const servicos = [
      { id: 7, nome: "api", estadoAtual: "DISPONIVEL" },
      { id: 8, nome: "worker", estadoAtual: "DISPONIVEL" },
      { id: 9, nome: "Serviço B", estadoAtual: "DISPONIVEL" },
      { id: 10, nome: "Removido", estadoAtual: "REMOVIDO" },
    ];

    function consulta(
      fim: string,
      opcoes: Partial<SerieTemporalQueryDto> = {},
      inicioConsulta = inicio,
    ) {
      return Object.assign(new SerieTemporalQueryDto(), {
        inicio: inicioConsulta,
        fim,
        ...opcoes,
      });
    }

    function ponto(instante: string, energiaKwh: number, emissaoGCo2e: number) {
      return {
        inicio: new Date(instante),
        energiaKwh,
        emissaoGCo2e,
        cpuMedia: null,
        memoriaMediaMb: null,
        coletas: 1,
        ativo: 1,
        indisponivel: 0,
        semMetricas: 0,
      };
    }

    beforeEach(() => {
      repository.obterAgregacaoSerieTemporal.mockReset().mockResolvedValue([]);
      repository.obterSerieAgrupadaPorServico.mockReset().mockResolvedValue([]);
    });

    it.each([
      ["2026-11-03T00:00:00.000Z", "hora"],
      ["2026-11-03T00:00:00.001Z", "dia"],
    ] as const)(
      "seleciona granularidade automática para período com fim %s",
      async (fim, granularidade) => {
        const query = consulta(fim);

        await service.obterSerieTemporal(query);

        expect(repository.obterAgregacaoSerieTemporal).toHaveBeenCalledWith(
          new Date(inicio),
          new Date(fim),
          granularidade,
        );
      },
    );

    it("repassa ao repository as datas e a granularidade informadas", async () => {
      const fim = "2026-11-01T03:00:00.000Z";
      const query = consulta(fim, { granularidade: "dia" });

      await service.obterSerieTemporal(query);

      expect(repository.obterAgregacaoSerieTemporal).toHaveBeenCalledWith(
        new Date(inicio),
        new Date(fim),
        "dia",
      );
    });

    it("preenche lacunas da série global com métricas nulas", async () => {
      const fim = "2026-11-01T12:00:00.000Z";
      repository.obterAgregacaoSerieTemporal.mockResolvedValue([
        ponto("2026-11-01T10:00:00.000Z", 0.1, 10),
        ponto("2026-11-01T12:00:00.000Z", 0.3, 30),
      ]);

      const resultado = await service.obterSerieTemporal(
        consulta(fim, { granularidade: "hora" }, "2026-11-01T10:00:00.000Z"),
      );

      expect(resultado.global).toEqual([
        {
          inicio: "2026-11-01T10:00:00.000Z",
          energiaKwh: 0.1,
          emissaoGCo2e: 10,
        },
        {
          inicio: "2026-11-01T11:00:00.000Z",
          energiaKwh: null,
          emissaoGCo2e: null,
        },
        {
          inicio: "2026-11-01T12:00:00.000Z",
          energiaKwh: 0.3,
          emissaoGCo2e: 30,
        },
      ]);
    });

    it("inclui séries por serviço com lacunas preenchidas quando solicitado", async () => {
      const fim = "2026-11-01T12:00:00.000Z";
      repository.listarServicosParaRanking.mockResolvedValue(servicos);
      repository.obterSerieAgrupadaPorServico.mockResolvedValue([
        {
          servicoId: 7,
          nome: servicos[0].nome,
          ...ponto("2026-11-01T10:00:00.000Z", 0.1, 10),
        },
        {
          servicoId: 7,
          nome: servicos[0].nome,
          ...ponto("2026-11-01T12:00:00.000Z", 0.3, 30),
        },
        {
          servicoId: 8,
          nome: servicos[1].nome,
          ...ponto("2026-11-01T11:00:00.000Z", 0.2, 20),
        },
      ]);

      const resultado = await service.obterSerieTemporal(
        consulta(
          fim,
          { granularidade: "hora", porServico: true },
          "2026-11-01T10:00:00.000Z",
        ),
      );

      expect(resultado.servicos).toEqual([
        {
          servicoId: 7,
          nome: "api",
          serie: [
            {
              inicio: "2026-11-01T10:00:00.000Z",
              energiaKwh: 0.1,
              emissaoGCo2e: 10,
            },
            {
              inicio: "2026-11-01T11:00:00.000Z",
              energiaKwh: null,
              emissaoGCo2e: null,
            },
            {
              inicio: "2026-11-01T12:00:00.000Z",
              energiaKwh: 0.3,
              emissaoGCo2e: 30,
            },
          ],
        },
        {
          servicoId: 8,
          nome: "worker",
          serie: [
            {
              inicio: "2026-11-01T10:00:00.000Z",
              energiaKwh: null,
              emissaoGCo2e: null,
            },
            {
              inicio: "2026-11-01T11:00:00.000Z",
              energiaKwh: 0.2,
              emissaoGCo2e: 20,
            },
            {
              inicio: "2026-11-01T12:00:00.000Z",
              energiaKwh: null,
              emissaoGCo2e: null,
            },
          ],
        },
        {
          servicoId: 9,
          nome: "Serviço B",
          serie: [
            {
              inicio: "2026-11-01T10:00:00.000Z",
              energiaKwh: null,
              emissaoGCo2e: null,
            },
            {
              inicio: "2026-11-01T11:00:00.000Z",
              energiaKwh: null,
              emissaoGCo2e: null,
            },
            {
              inicio: "2026-11-01T12:00:00.000Z",
              energiaKwh: null,
              emissaoGCo2e: null,
            },
          ],
        },
      ]);
      expect(repository.obterSerieAgrupadaPorServico).toHaveBeenCalledWith(
        new Date("2026-11-01T10:00:00.000Z"),
        new Date(fim),
        "hora",
      );
    });

    it("mantém o serviço removido que tem dados no período, como no ranking e no mapa", async () => {
      const fim = "2026-11-01T11:00:00.000Z";
      repository.listarServicosParaRanking.mockResolvedValue(servicos);
      repository.obterSerieAgrupadaPorServico.mockResolvedValue([
        {
          servicoId: 10,
          nome: "Removido",
          ...ponto("2026-11-01T10:00:00.000Z", 0.5, 40),
        },
      ]);

      const resultado = await service.obterSerieTemporal(
        consulta(
          fim,
          { granularidade: "hora", porServico: true },
          "2026-11-01T10:00:00.000Z",
        ),
      );

      expect(resultado.servicos.map((servico) => servico.servicoId)).toEqual([
        7, 8, 9, 10,
      ]);
      expect(resultado.servicos[3].serie).toEqual([
        {
          inicio: "2026-11-01T10:00:00.000Z",
          energiaKwh: 0.5,
          emissaoGCo2e: 40,
        },
        {
          inicio: "2026-11-01T11:00:00.000Z",
          energiaKwh: null,
          emissaoGCo2e: null,
        },
      ]);
    });

    it("descarta o serviço removido sem dados no período", async () => {
      const fim = "2026-11-01T11:00:00.000Z";
      repository.listarServicosParaRanking.mockResolvedValue(servicos);

      const resultado = await service.obterSerieTemporal(
        consulta(
          fim,
          { granularidade: "hora", porServico: true },
          "2026-11-01T10:00:00.000Z",
        ),
      );

      expect(resultado.servicos.map((servico) => servico.servicoId)).toEqual([
        7, 8, 9,
      ]);
    });
  });

  describe("obterMatrizHorarios", () => {
    it("usa os últimos 30 dias quando nenhum período é informado", async () => {
      await service.obterMatrizHorarios(new IntensidadeHorariosQueryDto());

      expect(repository.obterDadosMatrizIntensidade).toHaveBeenCalledWith(
        new Date("2026-10-09T12:00:00.000Z"),
        agora,
        undefined,
      );
    });

    it("retorna uma matriz vazia de sete dias por 24 horas sem dados", async () => {
      repository.obterDadosMatrizIntensidade.mockResolvedValue([]);

      const resultado = await service.obterMatrizHorarios(
        new IntensidadeHorariosQueryDto(),
      );

      expect(resultado).toEqual({
        fusoHorario: "America/Sao_Paulo",
        matriz: Array.from({ length: 7 }, () =>
          Array.from({ length: 24 }, () => ({
            media: null,
            quantidadeAmostras: null,
          })),
        ),
        melhorJanela: null,
      });
    });

    it("preenche os horários e calcula a melhor janela de três horas", async () => {
      repository.obterDadosMatrizIntensidade.mockResolvedValue([
        {
          diaSemana: 1,
          hora: 2,
          media: 10,
          quantidadeAmostras: 1,
        },
        {
          diaSemana: 1,
          hora: 3,
          media: 20,
          quantidadeAmostras: 1,
        },
        {
          diaSemana: 1,
          hora: 4,
          media: 30,
          quantidadeAmostras: 1,
        },
      ]);

      const resultado = await service.obterMatrizHorarios(
        new IntensidadeHorariosQueryDto(),
      );

      expect(resultado.matriz[1]).toHaveLength(24);
      expect(resultado.matriz[1].slice(2, 5)).toEqual([
        { media: 10, quantidadeAmostras: 1 },
        { media: 20, quantidadeAmostras: 1 },
        { media: 30, quantidadeAmostras: 1 },
      ]);
      expect(resultado.melhorJanela).toEqual({
        diaSemana: 1,
        horaInicio: 2,
        mediaJanela: 20,
      });
    });

    it("calcula a melhor janela de três horas atravessando a virada da semana", async () => {
      repository.obterDadosMatrizIntensidade.mockResolvedValue(
        Array.from({ length: 7 }, (_, diaSemana) =>
          Array.from({ length: 24 }, (_, hora) => ({
            diaSemana,
            hora,
            media:
              (diaSemana === 0 && hora === 23) ||
              (diaSemana === 1 && (hora === 0 || hora === 1))
                ? 35
                : 90,
            quantidadeAmostras: 1,
          })),
        ).flat(),
      );

      const resultado = await service.obterMatrizHorarios(
        new IntensidadeHorariosQueryDto(),
      );

      expect(resultado.melhorJanela).toEqual({
        diaSemana: 0,
        horaInicio: 23,
        mediaJanela: 35,
      });
    });
  });
});
