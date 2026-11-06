import { Test, TestingModule } from "@nestjs/testing";
import { CalculosService } from "./calculos.service";
import { CarbonApiService } from "./carbon-api.service";

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
});
