jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { PeriodoDto } from "../indicadores/dto/periodo.dto";
import { SimulacaoController } from "./simulacao.controller";
import { SimulacaoService } from "./simulacao.service";

describe("SimulacaoController", () => {
  const simular = jest.fn().mockResolvedValue({});
  const controller = new SimulacaoController({
    simular,
  } as unknown as SimulacaoService);
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });

  beforeEach(() => simular.mockClear());

  it("converte o período antes de simular", async () => {
    const query = (await pipe.transform(
      { inicio: "2026-11-10T00:00:00Z", fim: "2026-11-11T00:00:00Z" },
      { type: "query", metatype: PeriodoDto },
    )) as PeriodoDto;

    await controller.simular(3, query);

    expect(simular).toHaveBeenCalledWith(
      3,
      new Date("2026-11-10T00:00:00.000Z"),
      new Date("2026-11-11T00:00:00.000Z"),
    );
  });

  it("usa as últimas 24 horas sem parâmetros", async () => {
    await controller.simular(3, new PeriodoDto());

    const [, inicio, fim] = simular.mock.calls[0] as [number, Date, Date];
    expect(fim.getTime() - inicio.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it.each([
    [{ periodo: "1ano" }],
    [{ inicio: "2026-11-02T00:00:00Z", fim: "2026-11-01T00:00:00Z" }],
    [{ inicio: "2026-01-01T00:00:00Z", fim: "2026-06-01T00:00:00Z" }],
  ])("rejeita período inválido com 400 %#", async (query) => {
    await expect(
      pipe.transform(query, { type: "query", metatype: PeriodoDto }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
