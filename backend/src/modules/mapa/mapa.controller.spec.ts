jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { PeriodoDto, PeriodoPredefinido } from "../indicadores/dto/periodo.dto";
import { MapaController } from "./mapa.controller";
import { MapaService } from "./mapa.service";

describe("MapaController", () => {
  const obter = jest.fn().mockResolvedValue({});
  const controller = new MapaController({ obter } as unknown as MapaService);
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });

  const validar = (query: Record<string, unknown>) =>
    pipe.transform(query, { type: "query", metatype: PeriodoDto });

  beforeEach(() => obter.mockClear());

  it("converte o período customizado antes de consultar o serviço", async () => {
    const query = (await validar({
      inicio: "2026-11-10T00:00:00Z",
      fim: "2026-11-11T00:00:00-03:00",
    })) as PeriodoDto;

    await controller.obter(query);

    expect(obter).toHaveBeenCalledWith(
      new Date("2026-11-10T00:00:00.000Z"),
      new Date("2026-11-11T03:00:00.000Z"),
    );
  });

  it("usa as últimas 24 horas quando não há parâmetros", async () => {
    await controller.obter(new PeriodoDto());

    const [inicio, fim] = obter.mock.calls[0] as [Date, Date];
    expect(fim.getTime() - inicio.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("aceita os períodos predefinidos", async () => {
    const query = (await validar({
      periodo: PeriodoPredefinido.ULTIMOS_7_DIAS,
    })) as PeriodoDto;

    await controller.obter(query);

    const [inicio, fim] = obter.mock.calls[0] as [Date, Date];
    expect(fim.getTime() - inicio.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it.each([
    [{ periodo: "1ano" }],
    [{ periodo: "7d", inicio: "2026-11-01T00:00:00Z" }],
    [{ inicio: "2026-11-01T00:00:00Z" }],
    [{ inicio: "2026-11-02T00:00:00Z", fim: "2026-11-01T00:00:00Z" }],
    [{ inicio: "2026-01-01T00:00:00Z", fim: "2026-06-01T00:00:00Z" }],
    [{ dataInicio: "2026-11-01" }],
  ])("rejeita parâmetros inválidos %#", async (query) => {
    await expect(validar(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
