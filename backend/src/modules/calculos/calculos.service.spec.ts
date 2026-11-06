import { Test, TestingModule } from "@nestjs/testing";
import { CalculosService } from "./calculos.service";

describe("CalculosService", () => {
  let service: CalculosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalculosService],
    }).compile();

    service = module.get<CalculosService>(CalculosService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
