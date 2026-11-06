jest.mock("@nestjs/config", () => ({ ConfigService: jest.fn() }));
jest.mock("../../database/prisma.service", () => ({
  PrismaService: jest.fn(),
}));

import { Test, TestingModule } from "@nestjs/testing";
import { CalculosService } from "../calculos/calculos.service";
import { ServicosService } from "../servicos/servicos.service";
import { ColetasRepository } from "./coletas.repository";
import { ColetasService } from "./coletas.service";
import {
  CreateColetaDto,
  EstadoCalculoEnum,
  EstadoColetaEnum,
} from "./dto/create-coleta.dto";

describe("ColetasService", () => {
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
    calculosService.calcularEmissao.mockResolvedValue({
      intensidadeCarbonoGCo2ePorKwh: 85,
      emissaoGCo2e: 0.17,
    });
    servicosService.findById.mockResolvedValue({
      regiaoCodigo: "br-sudeste",
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

  it("persists the factor, emissions, and completed calculation state", async () => {
    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.SUCESSO,
      cpuPercent: 12,
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
  });
});
