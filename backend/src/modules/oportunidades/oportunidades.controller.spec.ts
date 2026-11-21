jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { PeriodoDto } from "../indicadores/dto/periodo.dto";
import { OportunidadesController } from "./oportunidades.controller";
import { OportunidadesService } from "./oportunidades.service";

describe("OportunidadesController", () => {
  const listar = jest.fn().mockResolvedValue({ oportunidades: [] });
  const controller = new OportunidadesController({
    listar,
  } as unknown as OportunidadesService);
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });

  beforeEach(() => listar.mockClear());

  it("converte período explícito antes de listar oportunidades", async () => {
    const query = (await pipe.transform(
      { inicio: "2026-11-10T00:00:00Z", fim: "2026-11-11T00:00:00Z" },
      { type: "query", metatype: PeriodoDto },
    )) as PeriodoDto;

    await controller.listar(query);

    expect(listar).toHaveBeenCalledWith(
      new Date("2026-11-10T00:00:00.000Z"),
      new Date("2026-11-11T00:00:00.000Z"),
    );
  });

  it("usa as últimas 24 horas quando nenhum parâmetro é enviado", async () => {
    await controller.listar(new PeriodoDto());

    const [inicio, fim] = listar.mock.calls[0] as [Date, Date];
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
