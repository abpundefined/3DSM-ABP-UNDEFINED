import { Test, TestingModule } from "@nestjs/testing";
import { CalculosService } from "./calculos.service";
import {
  CarbonApiService,
  DEFAULT_CARBON_INTENSITY_GCO2E_PER_KWH,
} from "./carbon-api.service";

describe("CalculosService", () => {
  let service: CalculosService;
  const carbonApi = {
    obterIntensidadeCarbono: jest.fn(),
  };

  beforeEach(async () => {
    carbonApi.obterIntensidadeCarbono.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalculosService,
        { provide: CarbonApiService, useValue: carbonApi },
      ],
    }).compile();

    service = module.get<CalculosService>(CalculosService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("calculates energy using the documented resource factors and kWh conversion", () => {
    expect(service.calcularEnergia(50, 2, 10, 5, 3600)).toBeCloseTo(0.0011375);
  });

  it.each([
    ["CPU", 100, 0, 0, 0, 0.000375],
    ["RAM", 0, 1, 0, 0, 0.000375],
    ["disco", 0, 0, 1, 0, 0.00001],
    ["rede", 0, 0, 0, 1, 0.00002],
  ])(
    "calcula corretamente o consumo isolado de %s",
    (_resource, cpu, memory, disk, network, expectedKwh) => {
      expect(
        service.calcularEnergia(cpu, memory, disk, network, 3600),
      ).toBeCloseTo(expectedKwh);
    },
  );

  it("usa a duração real recebida para converter a potência em kWh", () => {
    const energyFor30Seconds = service.calcularEnergia(50, 2, 10, 5, 30);
    const energyFor90Seconds = service.calcularEnergia(50, 2, 10, 5, 90);

    expect(energyFor90Seconds).toBeCloseTo(energyFor30Seconds * 3);
    expect(energyFor30Seconds).toBeCloseTo(0.0011375 / 120);
  });

  it.each([
    [-1, 0, 0, 0, 60],
    [101, 0, 0, 0, 60],
    [0, -1, 0, 0, 60],
    [0, 0, -1, 0, 60],
    [0, 0, 0, -1, 60],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, Number.NaN],
    [Number.NaN, 0, 0, 0, 60],
  ])(
    "rejeita métricas ou intervalo inválidos: %j",
    (cpu, memory, disk, network, interval) => {
      expect(() =>
        service.calcularEnergia(cpu, memory, disk, network, interval),
      ).toThrow(RangeError);
    },
  );

  it("returns the emission factor and calculated emissions", async () => {
    carbonApi.obterIntensidadeCarbono.mockResolvedValue(85);

    await expect(service.calcularEmissao(0.002, "br-sudeste")).resolves.toEqual(
      {
        intensidadeCarbonoGCo2ePorKwh: 85,
        emissaoGCo2e: 0.17,
      },
    );
    expect(carbonApi.obterIntensidadeCarbono).toHaveBeenCalledWith(
      "br-sudeste",
    );
  });

  it("usa o fallback de carbono se a consulta da API rejeitar", async () => {
    carbonApi.obterIntensidadeCarbono.mockRejectedValue(
      new Error("API indisponível"),
    );

    await expect(service.calcularEmissao(0.002, "br-sudeste")).resolves.toEqual(
      {
        intensidadeCarbonoGCo2ePorKwh: DEFAULT_CARBON_INTENSITY_GCO2E_PER_KWH,
        emissaoGCo2e: 0.17,
      },
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    "usa o fallback quando a API retorna intensidade inválida (%s)",
    async (intensity) => {
      carbonApi.obterIntensidadeCarbono.mockResolvedValue(intensity);

      await expect(
        service.calcularEmissao(0.002, "br-sudeste"),
      ).resolves.toEqual({
        intensidadeCarbonoGCo2ePorKwh: DEFAULT_CARBON_INTENSITY_GCO2E_PER_KWH,
        emissaoGCo2e: 0.17,
      });
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -0.1])(
    "rejeita energia inválida ao calcular emissões (%s)",
    async (energy) => {
      await expect(
        service.calcularEmissao(energy, "br-sudeste"),
      ).rejects.toThrow(RangeError);
      expect(carbonApi.obterIntensidadeCarbono).not.toHaveBeenCalled();
    },
  );
});
