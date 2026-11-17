jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { SerieTemporalQueryDto } from "./dto/serie-temporal-query.dto";
import { IntensidadeHorariosQueryDto } from "./dto/intensidade-horarios-query.dto";
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
  const respostaMatrizHorarios = {
    fusoHorario: "America/Sao_Paulo",
    matriz: [],
    melhorJanela: {
      diaSemana: 0,
      horaInicio: 2,
      mediaJanela: 50.5,
    },
  };
  const obterSerieTemporal = jest.fn().mockResolvedValue(resposta);
  const obterMatrizHorarios = jest
    .fn()
    .mockResolvedValue(respostaMatrizHorarios);
  const service = {
    obterSerieTemporal,
    obterMatrizHorarios,
  } as unknown as IndicadoresService;
  const controller = new IndicadoresController(service);

  beforeEach(() => {
    obterSerieTemporal.mockClear().mockResolvedValue(resposta);
    obterMatrizHorarios.mockClear().mockResolvedValue(respostaMatrizHorarios);
  });

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

  describe("GET /intensidade/horarios", () => {
    it("encaminha a consulta ao serviço e retorna a matriz de horários", async () => {
      const query = Object.assign(new IntensidadeHorariosQueryDto(), {
        regiao: "BR-SE",
      });
      const controllerComMatrizHorarios =
        controller as IndicadoresController & {
          obterMatrizHorarios(
            query: IntensidadeHorariosQueryDto,
          ): Promise<typeof respostaMatrizHorarios>;
        };

      await expect(
        controllerComMatrizHorarios.obterMatrizHorarios(query),
      ).resolves.toEqual(respostaMatrizHorarios);
      expect(obterMatrizHorarios).toHaveBeenCalledWith(query);
    });
  });
});
