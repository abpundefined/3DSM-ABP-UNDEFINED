jest.mock("@nestjs/config", () => ({ ConfigService: jest.fn() }));
jest.mock("../../database/prisma.service", () => ({
  PrismaService: jest.fn(),
}));

import { Test, TestingModule } from "@nestjs/testing";
import { CalculosService } from "../calculos/calculos.service";
import { EventosService } from "../eventos/eventos.service";
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
    findMany: jest.fn(),
    findLatestSuccessful: jest.fn(),
    findById: jest.fn(),
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

  it("não inventa um intervalo quando não foi recebido", async () => {
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
    expect(dto).not.toHaveProperty("energiaKwh");
    expect(dto).not.toHaveProperty("emissaoGCo2e");
  });

  it("classifica métricas todas zero como SEM_METRICAS", async () => {
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

  it("preserva a mensagem existente para coleta sem métricas", async () => {
    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.SUCESSO,
      cpuPercent: 0,
      mensagemErro: "Payload sem medições",
    };

    await service.registrarColeta(dto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoColeta: EstadoColetaEnum.SEM_METRICAS,
        mensagemErro: "Payload sem medições",
      }),
    );
  });

  it("preserva o estado de falha quando a coleta não tem métricas", async () => {
    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.FALHA,
      mensagemErro: "Falha na coleta",
    };

    await service.registrarColeta(dto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoColeta: EstadoColetaEnum.FALHA,
        mensagemErro: "Falha na coleta",
        estadoCalculo: EstadoCalculoEnum.PENDENTE,
      }),
    );
    expect(calculosService.calcularEnergia).not.toHaveBeenCalled();
  });

  it("registra falha de cálculo quando o serviço não existe", async () => {
    servicosService.findById.mockResolvedValue(null);
    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.SUCESSO,
      cpuPercent: 12,
      intervaloColetaSegundos: 27,
    };

    await service.registrarColeta(dto);

    expect(calculosService.calcularEmissao).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoColeta: EstadoColetaEnum.SUCESSO,
        estadoCalculo: EstadoCalculoEnum.FALHA,
        mensagemErro: "Falha no cálculo ambiental: Serviço não encontrado",
      }),
    );
  });

  it("usa mensagem genérica quando o cálculo rejeita sem um objeto Error", async () => {
    calculosService.calcularEmissao.mockRejectedValue("falha desconhecida");
    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.SUCESSO,
      cpuPercent: 12,
      intervaloColetaSegundos: 27,
    };

    await service.registrarColeta(dto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoCalculo: EstadoCalculoEnum.FALHA,
        mensagemErro: "Falha no cálculo ambiental: Erro desconhecido",
      }),
    );
  });

  it("persiste métricas como SUCESSO quando o cálculo de carbono falha", async () => {
    calculosService.calcularEmissao.mockRejectedValue(
      new Error("API de carbono indisponível"),
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
        mensagemErro: "Falha no cálculo ambiental: API de carbono indisponível",
      }),
    );
    expect(calculosService.calcularEnergia).toHaveBeenCalled();
  });

  it("delega a listagem do histórico ao repositório", async () => {
    const filtros = { servicoId: 7, pagina: 2, tamanho: 10 };
    const historico = {
      itens: [{ id: 1 }],
      pagina: 2,
      tamanho: 10,
      total: 11,
      totalPaginas: 2,
    };
    repository.findMany.mockResolvedValue(historico);

    await expect(service.listarHistorico(filtros)).resolves.toBe(historico);
    expect(repository.findMany).toHaveBeenCalledWith(filtros);
  });

  it("retorna a última coleta válida no formato de fallback", async () => {
    const ultimaColeta = { id: 1, estadoColeta: EstadoColetaEnum.SUCESSO };
    repository.findLatestSuccessful.mockResolvedValue(ultimaColeta);

    await expect(service.obterUltimaColetaValida(7)).resolves.toEqual({
      fonte: "CACHE_FALLBACK",
      mensagem: "Dados recuperados da última coleta válida preservada",
      dados: ultimaColeta,
    });
    expect(repository.findLatestSuccessful).toHaveBeenCalledWith(7);
  });

  it("falha quando não há coleta válida para usar como fallback", async () => {
    repository.findLatestSuccessful.mockResolvedValue(null);

    await expect(service.obterUltimaColetaValida(7)).rejects.toThrow(
      "Nenhuma coleta válida anterior encontrada para o serviço ID 7",
    );
  });

  it("busca uma coleta pelo id", async () => {
    const coleta = { id: 7 };
    repository.findById.mockResolvedValue(coleta);

    await expect(service.buscarPorId(7)).resolves.toBe(coleta);
    expect(repository.findById).toHaveBeenCalledWith(7);
  });

  it("falha quando a coleta solicitada não existe", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.buscarPorId(7)).rejects.toThrow(
      "Coleta com id 7 não encontrada.",
    );
  });

  it("emite evento SSE coleta-registrada quando EventosService está disponível", async () => {
    const emitirColetaRegistrada = jest.fn();
    const eventosService = {
      emitirColetaRegistrada,
    } as unknown as EventosService;
    const serviceComEventos = new ColetasService(
      repository as unknown as ColetasRepository,
      calculosService as unknown as CalculosService,
      servicosService as unknown as ServicosService,
      eventosService,
    );

    const dto: CreateColetaDto = {
      servicoId: 7,
      estadoColeta: EstadoColetaEnum.SUCESSO,
      cpuPercent: 12,
      intervaloColetaSegundos: 27,
    };

    await serviceComEventos.registrarColeta(dto);

    expect(emitirColetaRegistrada).toHaveBeenCalledWith(
      expect.objectContaining({
        servicoId: 7,
        estadoColeta: EstadoColetaEnum.SUCESSO,
      }),
    );
  });
});
