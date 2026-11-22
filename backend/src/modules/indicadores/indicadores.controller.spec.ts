jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));
jest.mock("@nestjs/config", () => ({
  ConfigService: class ConfigService {},
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
  const obterMeta = jest.fn();
  const obterSerieTemporal = jest.fn().mockResolvedValue(resposta);
  const service = {
    obterMeta,
    obterSerieTemporal,
  } as unknown as IndicadoresService;
  const controller = new IndicadoresController(service);

  beforeEach(() => {
    obterMeta.mockReset();
    obterSerieTemporal.mockClear().mockResolvedValue(resposta);
  });

  it.each([500.5, null])(
    "retorna a resposta da meta mensal quando metaMensal é %s",
    async (metaMensal) => {
      const respostaMeta = {
        metaMensal,
        acumuladoMes: 120.25,
        diasDecorridos: 12,
        diasNoMes: 30,
        projecaoMes: 300.625,
      };
      obterMeta.mockResolvedValue(respostaMeta);

      await expect(controller.obterMeta()).resolves.toEqual(respostaMeta);
      expect(obterMeta).toHaveBeenCalledTimes(1);
    },
  );

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
