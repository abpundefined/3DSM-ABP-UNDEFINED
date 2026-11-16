jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { NotFoundException } from "@nestjs/common";
import { IndicadoresRepository } from "./indicadores.repository";
import { IndicadoresService } from "./indicadores.service";

describe("IndicadoresService.obterHistoricoServico", () => {
  const buscarServicoPorId = jest.fn();
  const obterSerieTemporal = jest.fn();
  const repository = {
    buscarServicoPorId,
    obterSerieTemporal,
  };
  const service = new IndicadoresService(
    repository as unknown as IndicadoresRepository,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    buscarServicoPorId.mockResolvedValue({ id: 7, nome: "api" });
    obterSerieTemporal.mockResolvedValue([]);
  });

  describe("serviço inexistente", () => {
    it("lança NotFoundException com status 404", async () => {
      buscarServicoPorId.mockResolvedValue(null);

      const resultado = service.obterHistoricoServico("7", {
        inicio: "2026-11-10T12:00:00.000Z",
        fim: "2026-11-10T14:00:00.000Z",
      });

      await expect(resultado).rejects.toBeInstanceOf(NotFoundException);
      await expect(resultado).rejects.toMatchObject({ status: 404 });
      expect(obterSerieTemporal).not.toHaveBeenCalled();
    });
  });

  describe("granularidade automática", () => {
    it.each([
      ["2026-11-12T12:00:00.000Z", "hora"],
      ["2026-11-12T12:00:00.001Z", "dia"],
    ] as const)(
      "passa '%s' com granularidade %s para intervalos até/acima de 48 horas",
      async (fim, granularidade) => {
        await service.obterHistoricoServico("7", {
          inicio: "2026-11-10T12:00:00.000Z",
          fim,
        });

        expect(obterSerieTemporal).toHaveBeenCalledWith(
          "7",
          new Date("2026-11-10T12:00:00.000Z"),
          new Date(fim),
          granularidade,
        );
      },
    );
  });

  describe("preenchimento de gaps", () => {
    it("preenche as métricas do intervalo ausente com null", async () => {
      buscarServicoPorId.mockResolvedValue({ id: 7, nome: "api" });
      obterSerieTemporal.mockResolvedValue([
        {
          inicio: new Date("2026-11-10T10:00:00.000Z"),
          energiaKwh: 0.1,
          emissaoGCo2e: 8.5,
          cpuMedia: 12,
          memoriaMediaMb: 256,
          coletas: 1,
          ativo: 1,
          indisponivel: 0,
          semMetricas: 0,
        },
        {
          inicio: new Date("2026-11-10T12:00:00.000Z"),
          energiaKwh: 0.2,
          emissaoGCo2e: 17,
          cpuMedia: 24,
          memoriaMediaMb: 512,
          coletas: 2,
          ativo: 0,
          indisponivel: 1,
          semMetricas: 0,
        },
      ]);

      const resultado = await service.obterHistoricoServico("7", {
        inicio: "2026-11-10T10:00:00.000Z",
        fim: "2026-11-10T12:00:00.000Z",
      });

      expect(resultado).toEqual([
        {
          inicio: "2026-11-10T10:00:00.000Z",
          energiaKwh: 0.1,
          emissaoGCo2e: 8.5,
          cpuMedia: 12,
          memoriaMediaMb: 256,
          coletas: 1,
          ativo: 1,
          indisponivel: 0,
          semMetricas: 0,
        },
        {
          inicio: "2026-11-10T11:00:00.000Z",
          energiaKwh: null,
          emissaoGCo2e: null,
          cpuMedia: null,
          memoriaMediaMb: null,
          coletas: null,
          ativo: 0,
          indisponivel: 0,
          semMetricas: 0,
        },
        {
          inicio: "2026-11-10T12:00:00.000Z",
          energiaKwh: 0.2,
          emissaoGCo2e: 17,
          cpuMedia: 24,
          memoriaMediaMb: 512,
          coletas: 2,
          ativo: 0,
          indisponivel: 1,
          semMetricas: 0,
        },
      ]);
    });
  });
});
