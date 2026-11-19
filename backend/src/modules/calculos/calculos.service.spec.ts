import { Test, TestingModule } from "@nestjs/testing";
import { CalculosService } from "./calculos.service";
import { CarbonApiService } from "./carbon-api.service";

describe("CalculosService", () => {
  let service: CalculosService;
  interface ComponentesEnergia {
    cpuW: number;
    memoriaW: number;
    discoW: number;
    redeW: number;
    totalW: number;
  }

  const carbonApi = {
    obterIntensidadeCarbono: jest.fn(),
  };

  const calcularPotencia = (
    cpu: number,
    memoria: number,
    disco: number,
    rede: number,
    intervalo: number,
  ) =>
    service.calcularEnergia(
      cpu,
      memoria,
      disco,
      rede,
      intervalo,
    ) as unknown as ComponentesEnergia;

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

  it("calculates power using the documented resource factors", () => {
    const componentes = calcularPotencia(50, 2, 10, 5, 3600);

    expect(componentes.totalW).toBeCloseTo(1.2, 10);
    expect((componentes.totalW * 3600) / 3_600_000).toBeCloseTo(0.0012, 10);
  });

  it.each([
    ["CPU", 100, 0, 0, 0, 0.5],
    ["RAM", 0, 1, 0, 0, 0.375],
    ["disco", 0, 0, 1, 0, 0.01],
    ["rede", 0, 0, 0, 1, 0.02],
  ])(
    "calcula corretamente o consumo isolado de %s",
    (_resource, cpu, memory, disk, network, expectedW) => {
      expect(
        calcularPotencia(cpu, memory, disk, network, 3600).totalW,
      ).toBeCloseTo(expectedW, 10);
    },
  );

  it("retorna os componentes de potência de CPU, memória, disco e rede", () => {
    const componentes = calcularPotencia(50, 2, 10, 5, 3600);

    expect(componentes.cpuW).toBeCloseTo(0.25, 10);
    expect(componentes.memoriaW).toBeCloseTo(0.75, 10);
    expect(componentes.discoW).toBeCloseTo(0.1, 10);
    expect(componentes.redeW).toBeCloseTo(0.1, 10);
    expect(componentes.totalW).toBeCloseTo(1.2, 10);
  });

  it("retorna a mesma potência para intervalos de duração diferente", () => {
    const potenciaFor30Seconds = calcularPotencia(50, 2, 10, 5, 30);
    const potenciaFor90Seconds = calcularPotencia(50, 2, 10, 5, 90);

    expect(potenciaFor90Seconds.totalW).toBeCloseTo(
      potenciaFor30Seconds.totalW,
      10,
    );
    expect((potenciaFor90Seconds.totalW * 90) / 3_600_000).toBeCloseTo(
      ((potenciaFor30Seconds.totalW * 30) / 3_600_000) * 3,
      10,
    );
  });

  it("valida o exemplo de referência de 50.87 W, energia e emissão", async () => {
    carbonApi.obterIntensidadeCarbono.mockResolvedValue(85);

    const componentes = calcularPotencia(100, 100, 1000, 143.5, 60);
    expect(componentes.totalW).toBeCloseTo(50.87, 10);

    const energiaKwh = (componentes.totalW * 60) / 3_600_000;
    const emissao = await service.calcularEmissao(energiaKwh, "br-sudeste");

    expect(componentes.cpuW).toBeCloseTo(0.5, 10);
    expect(componentes.memoriaW).toBeCloseTo(37.5, 10);
    expect(componentes.discoW).toBeCloseTo(10, 10);
    expect(componentes.redeW).toBeCloseTo(2.87, 10);
    expect(componentes.totalW).toBeCloseTo(50.87, 10);
    expect(energiaKwh).toBeCloseTo(0.0008478333, 10);
    expect(emissao.emissaoGCo2e).toBeCloseTo(0.0720658333, 10);
    expect(Number(emissao.emissaoGCo2e.toFixed(7))).toBe(0.0720658);
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

  it("rejeita energia que excede o limite numérico após a conversão", () => {
    expect(() =>
      service.calcularEnergia(0, Number.MAX_VALUE, 0, 0, Number.MAX_VALUE),
    ).toThrow("A energia calculada não é um valor finito.");
  });

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

  it("propaga a falha da API de carbono sem aplicar fallback", async () => {
    carbonApi.obterIntensidadeCarbono.mockRejectedValue(
      new Error("API indisponível"),
    );

    await expect(service.calcularEmissao(0.002, "br-sudeste")).rejects.toThrow(
      "API indisponível",
    );
    expect(carbonApi.obterIntensidadeCarbono).toHaveBeenCalledWith(
      "br-sudeste",
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    "rejeita intensidade de carbono inválida (%s)",
    async (intensity) => {
      carbonApi.obterIntensidadeCarbono.mockResolvedValue(intensity);

      await expect(
        service.calcularEmissao(0.002, "br-sudeste"),
      ).rejects.toThrow(RangeError);
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

  it("rejeita emissão que excede o limite numérico", async () => {
    carbonApi.obterIntensidadeCarbono.mockResolvedValue(Number.MAX_VALUE);

    await expect(service.calcularEmissao(10, "br-sudeste")).rejects.toThrow(
      "A emissão calculada não é um valor finito.",
    );
  });
});
