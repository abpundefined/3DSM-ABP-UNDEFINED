jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { SerieTemporalQueryDto } from "./dto/serie-temporal-query.dto";
import { IndicadoresService } from "./indicadores.service";
import { IndicadoresController } from "./indicadores.controller";

describe("IndicadoresController", () => {
  const resposta = {
    periodo: {
      inicio: "2026-11-01T00:00:00.000Z",
      fim: "2026-11-02T00:00:00.000Z",
    },
    granularidade: "hora",
    intervalos: ["2026-11-01T00:00:00.000Z"],
    global: [
      {
        inicio: "2026-11-01T00:00:00.000Z",
        energiaKwh: 1.5,
        emissaoGCo2e: 25,
      },
    ],
    servicos: [],
  };
  const obterSerieTemporal = jest.fn().mockResolvedValue(resposta);
  const service = { obterSerieTemporal } as unknown as IndicadoresService;
  const controller = new IndicadoresController(service);

  beforeEach(() => obterSerieTemporal.mockClear().mockResolvedValue(resposta));

  it("retorna a série temporal e encaminha a consulta ao serviço", async () => {
    const query = Object.assign(new SerieTemporalQueryDto(), {
      inicio: "2026-11-01T00:00:00.000Z",
      fim: "2026-11-02T00:00:00.000Z",
      granularidade: "hora",
      porServico: true,
    });

    await expect(controller.obterSerie(query)).resolves.toEqual(resposta);
    expect(obterSerieTemporal).toHaveBeenCalledWith(query);
  });
});
