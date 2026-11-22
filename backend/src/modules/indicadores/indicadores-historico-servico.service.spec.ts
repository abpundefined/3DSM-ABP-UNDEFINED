jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));
jest.mock("@nestjs/config", () => ({
  ConfigService: class ConfigService {},
}));

import { NotFoundException } from "@nestjs/common";
import { CalculosService } from "../calculos/calculos.service";
import { CarbonApiService } from "../calculos/carbon-api.service";
import type { ConfiguracaoService } from "../configuracao/configuracao.service";
import { IndicadoresRepository } from "./indicadores.repository";
import { IndicadoresService } from "./indicadores.service";

describe("IndicadoresService.obterHistoricoServico", () => {
  const buscarServicoPorId = jest.fn();
  const obterSerieTemporal = jest.fn();
  const repository = {
    buscarServicoPorId,
    obterSerieTemporal,
  };
  const configuracaoService = { obter: jest.fn() };
  const calculosService = new CalculosService(
    {} as unknown as CarbonApiService,
  );
  const service = new IndicadoresService(
    repository as unknown as IndicadoresRepository,
    configuracaoService as unknown as ConfiguracaoService,
    calculosService,
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
          selo: "A",
          cpuMedia: 12,
          memoriaMediaMb: 256,
          discoMediaGb: 2,
          redeMediaGb: 3,
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
          discoMediaGb: 4,
          redeMediaGb: 5,
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

      expect(resultado).toMatchObject([
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
          selo: "—",
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
          selo: "B",
          cpuMedia: 24,
          memoriaMediaMb: 512,
          coletas: 2,
          ativo: 0,
          indisponivel: 1,
          semMetricas: 0,
        },
      ]);
      expect(resultado[0].componentes).toMatchObject({
        cpuW: 0.06,
        memoriaW: 0.09375,
        discoW: 0.02,
        redeW: 0.06,
      });
      expect(resultado[0].componentes?.totalW).toBeCloseTo(0.23375, 10);
      expect(resultado[1].componentes).toBeNull();
      expect(resultado[2].componentes).toMatchObject({
        cpuW: 0.12,
        memoriaW: 0.1875,
        discoW: 0.04,
        redeW: 0.1,
      });
      expect(resultado[2].componentes?.totalW).toBeCloseTo(0.4475, 10);
    });
  });

  it("calcula o selo diário usando a média por hora do dia", async () => {
    obterSerieTemporal.mockResolvedValue([
      {
        inicio: new Date("2026-11-11T03:00:00.000Z"),
        energiaKwh: 1,
        emissaoGCo2e: 480,
        cpuMedia: null,
        memoriaMediaMb: null,
        discoMediaGb: null,
        redeMediaGb: null,
        coletas: 1,
        ativo: 1,
        indisponivel: 0,
        semMetricas: 0,
      },
    ]);

    const resultado = await service.obterHistoricoServico("7", {
      inicio: "2026-11-10T03:00:00.000Z",
      fim: "2026-11-13T02:59:59.999Z",
      granularidade: "dia",
    });

    expect(resultado[1]).toMatchObject({
      inicio: "2026-11-11T03:00:00.000Z",
      selo: "B",
    });
  });
});
