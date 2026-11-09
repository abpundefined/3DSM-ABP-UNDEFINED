jest.mock('@nestjs/config', () => ({ ConfigService: jest.fn() }));
jest.mock('../../database/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { CalculosService } from '../calculos/calculos.service';
import { ServicosService } from '../servicos/servicos.service';
import { ColetasRepository } from './coletas.repository';
import { ColetasService } from './coletas.service';
import {
  CreateColetaDto,
  EstadoCalculoEnum,
  EstadoColetaEnum,
} from './dto/create-coleta.dto';

describe('ColetasService', () => {
  let service: ColetasService;
  const repository = {
    create: jest.fn(),
  };
  const calculosService = {
    calcularEnergia: jest.fn(),
    calcularEmissao: jest.fn(),
  };
  const servicosService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.create.mockImplementation((dto: CreateColetaDto) =>
      Promise.resolve(dto),
    );
    calculosService.calcularEnergia.mockReturnValue(0.002);
    calculosService.calcularEmissao.mockImplementation((energiaKwh: number) =>
      Promise.resolve({
        intensidadeCarbonoGCo2ePorKwh: 85,
        emissaoGCo2e: energiaKwh * 85,
      }),
    );
    servicosService.findById.mockResolvedValue({
      regiaoCodigo: 'br-sudeste',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColetasService,
        { provide: ColetasRepository, useValue: repository },
        { provide: CalculosService, useValue: calculosService },
        { provide: ServicosService, useValue: servicosService },
      ],
    }).compile();

    service = module.get<ColetasService>(ColetasService);
  });

  it('persists the factor, emissions, and completed calculation state', async () => {
    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.SUCESSO,
      cpuPercent: 12,
      intervaloColetaSegundos: 27,
    };

    await service.registrarColeta(dto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        energiaKwh: 0.002,
        intensidadeCarbonoGCo2ePorKwh: 85,
        emissaoGCo2e: 0.17,
        estadoCalculo: EstadoCalculoEnum.CONCLUIDO,
      }),
    );
    expect(calculosService.calcularEnergia).toHaveBeenCalledWith(
      12,
      0,
      0,
      0,
      27,
    );
  });

  it('não inventa um intervalo quando não foi recebido', async () => {
    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.SUCESSO,
      cpuPercent: 12,
    };

    await service.registrarColeta(dto);

    expect(calculosService.calcularEnergia).not.toHaveBeenCalled();
    expect(calculosService.calcularEmissao).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoColeta: EstadoColetaEnum.SUCESSO,
        estadoCalculo: EstadoCalculoEnum.PENDENTE,
      }),
    );
    expect(dto).not.toHaveProperty('energiaKwh');
    expect(dto).not.toHaveProperty('emissaoGCo2e');
  });

  it('classifica métricas todas zero como SEM_METRICAS', async () => {
    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.SUCESSO,
      cpuPercent: 0,
      memoryGb: 0,
      diskGb: 0,
      networkGb: 0,
      intervaloColetaSegundos: 27,
    };

    await service.registrarColeta(dto);

    expect(calculosService.calcularEnergia).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoCalculo: EstadoCalculoEnum.PENDENTE,
        estadoColeta: EstadoColetaEnum.SEM_METRICAS,
      }),
    );
  });

  it('persiste métricas como SUCESSO quando o cálculo de carbono falha', async () => {
    calculosService.calcularEmissao.mockRejectedValue(
      new Error('API de carbono indisponível'),
    );
    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.SUCESSO,
      cpuPercent: 12,
      memoryGb: 2,
      diskGb: 3,
      networkGb: 4,
      intervaloColetaSegundos: 27,
    };

    await service.registrarColeta(dto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        servicoId: 7,
        cpuPercent: 12,
        memoryGb: 2,
        diskGb: 3,
        networkGb: 4,
        energiaKwh: 0.002,
        estadoColeta: EstadoColetaEnum.SUCESSO,
        estadoCalculo: EstadoCalculoEnum.FALHA,
        mensagemErro: 'Falha no cálculo ambiental: API de carbono indisponível',
      }),
    );
    expect(calculosService.calcularEnergia).toHaveBeenCalled();
  });
});
