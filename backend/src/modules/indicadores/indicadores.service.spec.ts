jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException } from "@nestjs/common";
import { PeriodoPredefinido } from "./dto/periodo.dto";
import { IndicadoresRepository } from "./indicadores.repository";
import { IndicadoresService } from "./indicadores.service";

describe("IndicadoresService", () => {
  const agora = new Date("2026-11-08T12:00:00.000Z");
  const inicioPadrao = new Date("2026-11-07T12:00:00.000Z");
  const repository = {
    somarImpactoNoPeriodo: jest.fn(),
    contarServicosPorEstado: jest.fn(),
    buscarUltimaColetaEm: jest.fn(),
  };
  const service = new IndicadoresService(
    repository as unknown as IndicadoresRepository,
  );

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(agora);
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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("consolida consumo, emissão e estados dos serviços", async () => {
    const indicadores = await service.obter(inicioPadrao, agora);

    expect(indicadores).toEqual({
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

  it("calcula a variação do mês anterior contra o mês retrasado", async () => {
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
      new Date("2026-09-01T03:00:00.000Z"),
      new Date("2026-10-01T02:59:59.999Z"),
    );
    expect(indicadores.variacao).toEqual({
      energiaTotalKwh: { absoluta: 30, percentual: null },
      emissaoTotalGCo2e: { absoluta: 0, percentual: 0 },
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
});
