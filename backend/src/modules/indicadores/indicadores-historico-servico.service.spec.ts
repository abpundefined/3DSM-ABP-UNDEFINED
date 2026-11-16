jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { NotFoundException } from "@nestjs/common";
import { HistoricoServicoQueryDto } from "./dto/historico-servico-query.dto";
import { IndicadoresRepository } from "./indicadores.repository";
import { IndicadoresService } from "./indicadores.service";

type PontoHistorico = {
  inicio: string;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  cpuMedia: number | null;
  memoriaMediaMb: number | null;
};

type ResultadoHistorico = {
  serie: PontoHistorico[];
};

type IndicadoresServiceComHistorico = IndicadoresService & {
  obterHistoricoServico(
    id: string,
    query: HistoricoServicoQueryDto,
  ): Promise<ResultadoHistorico>;
};

describe("IndicadoresService.obterHistoricoServico", () => {
  const buscarServicoPorId = jest.fn();
  const obterHistoricoServico = jest.fn();
  const repository = {
    buscarServicoPorId,
    obterHistoricoServico,
  };
  const service = new IndicadoresService(
    repository as unknown as IndicadoresRepository,
  ) as IndicadoresServiceComHistorico;

  beforeEach(() => {
    jest.resetAllMocks();
    buscarServicoPorId.mockResolvedValue({ id: 7, nome: "api" });
    obterHistoricoServico.mockResolvedValue([]);
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
      expect(obterHistoricoServico).not.toHaveBeenCalled();
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

        expect(obterHistoricoServico).toHaveBeenCalledWith(
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
      obterHistoricoServico.mockResolvedValue([
        {
          inicio: new Date("2026-11-10T10:00:00.000Z"),
          energiaKwh: 0.1,
          emissaoGCo2e: 8.5,
          cpuMedia: 12,
          memoriaMediaMb: 256,
        },
        {
          inicio: new Date("2026-11-10T12:00:00.000Z"),
          energiaKwh: 0.2,
          emissaoGCo2e: 17,
          cpuMedia: 24,
          memoriaMediaMb: 512,
        },
      ]);

      const resultado = await service.obterHistoricoServico("7", {
        inicio: "2026-11-10T10:00:00.000Z",
        fim: "2026-11-10T12:00:00.000Z",
      });

      expect(resultado.serie).toEqual(
        expect.arrayContaining([
          {
            inicio: "2026-11-10T11:00:00.000Z",
            energiaKwh: null,
            emissaoGCo2e: null,
            cpuMedia: null,
            memoriaMediaMb: null,
          },
        ]),
      );
    });
  });
});
