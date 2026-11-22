jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));
jest.mock("@nestjs/config", () => ({
  ConfigService: class ConfigService {},
}));

import { IntensidadeHorariosQueryDto } from "./dto/intensidade-horarios-query.dto";
import { IndicadoresService } from "./indicadores.service";
import { IntensidadeController } from "./intensidade.controller";

describe("IntensidadeController", () => {
  const resposta = {
    fusoHorario: "America/Sao_Paulo",
    matriz: [],
    melhorJanela: {
      diaSemana: 0,
      horaInicio: 2,
      mediaJanela: 50.5,
    },
  };
  const obterMatrizHorarios = jest.fn().mockResolvedValue(resposta);
  const service = { obterMatrizHorarios } as unknown as IndicadoresService;
  const controller = new IntensidadeController(service);

  beforeEach(() => obterMatrizHorarios.mockClear().mockResolvedValue(resposta));

  it("encaminha a consulta ao service e retorna a matriz de horários", async () => {
    const query = Object.assign(new IntensidadeHorariosQueryDto(), {
      regiao: "BR-SE",
    });

    await expect(controller.obterMatrizHorarios(query)).resolves.toEqual(
      resposta,
    );
    expect(obterMatrizHorarios).toHaveBeenCalledWith(query);
  });
});
