jest.mock('../../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException } from '@nestjs/common';
import { IndicadoresRepository } from './indicadores.repository';
import { IndicadoresService } from './indicadores.service';

describe('IndicadoresService', () => {
  const agora = new Date('2026-11-08T12:00:00.000Z');
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
      { estado: 'DISPONIVEL', quantidade: 5 },
      { estado: 'INDISPONIVEL', quantidade: 1 },
      { estado: 'SEM_METRICAS', quantidade: 2 },
      { estado: 'REMOVIDO', quantidade: 4 },
    ]);
    repository.buscarUltimaColetaEm
      .mockReset()
      .mockResolvedValue(new Date('2026-11-08T11:59:30.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('consolida consumo, emissão e estados dos serviços', async () => {
    const indicadores = await service.obter({});

    expect(indicadores).toEqual({
      periodo: {
        inicio: new Date('2026-11-07T12:00:00.000Z'),
        fim: agora,
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
      ultimaColetaEm: new Date('2026-11-08T11:59:30.000Z'),
      geradoEm: agora,
    });
  });

  it('usa as últimas 24 horas quando o período não é informado', async () => {
    await service.obter({});

    expect(repository.somarImpactoNoPeriodo).toHaveBeenCalledWith(
      new Date('2026-11-07T12:00:00.000Z'),
      agora,
    );
  });

  it('respeita o período informado', async () => {
    const dataInicio = new Date('2026-11-01T00:00:00.000Z');
    const dataFim = new Date('2026-11-02T00:00:00.000Z');

    const indicadores = await service.obter({ dataInicio, dataFim });

    expect(repository.somarImpactoNoPeriodo).toHaveBeenCalledWith(
      dataInicio,
      dataFim,
    );
    expect(indicadores.periodo).toEqual({ inicio: dataInicio, fim: dataFim });
  });

  it('calcula o início a partir do fim quando só dataFim é informada', async () => {
    const dataFim = new Date('2026-11-05T06:00:00.000Z');

    await service.obter({ dataFim });

    expect(repository.somarImpactoNoPeriodo).toHaveBeenCalledWith(
      new Date('2026-11-04T06:00:00.000Z'),
      dataFim,
    );
  });

  it('retorna zero quando não há coletas calculadas no período', async () => {
    repository.somarImpactoNoPeriodo.mockResolvedValue({
      energiaKwh: null,
      emissaoGCo2e: null,
      coletasCalculadas: 0,
    });
    repository.contarServicosPorEstado.mockResolvedValue([]);
    repository.buscarUltimaColetaEm.mockResolvedValue(null);

    const indicadores = await service.obter({});

    expect(indicadores.energiaTotalKwh).toBe(0);
    expect(indicadores.emissaoTotalGCo2e).toBe(0);
    expect(indicadores.coletasCalculadas).toBe(0);
    expect(indicadores.servicos.monitorados).toBe(0);
    expect(indicadores.ultimaColetaEm).toBeNull();
  });

  it('rejeita período com início posterior ao fim', async () => {
    await expect(
      service.obter({
        dataInicio: new Date('2026-11-03T00:00:00.000Z'),
        dataFim: new Date('2026-11-02T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.somarImpactoNoPeriodo).not.toHaveBeenCalled();
  });

  it('propaga a falha do banco sem devolver indicadores incorretos', async () => {
    repository.somarImpactoNoPeriodo.mockRejectedValue(
      new Error('conexão perdida'),
    );

    await expect(service.obter({})).rejects.toThrow('conexão perdida');
  });
});
