jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));
jest.mock("@nestjs/config", () => ({
  ConfigService: class ConfigService {},
}));
jest.mock("../auth/guards/jwt-auth.guard", () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { HistoricoServicoQueryDto } from "../indicadores/dto/historico-servico-query.dto";
import { IndicadoresService } from "../indicadores/indicadores.service";
import { ServicosController } from "./servicos.controller";
import { ServicosService } from "./servicos.service";

describe("ServicosController", () => {
  it("encaminha ID e filtros do histórico ao service e retorna a série", async () => {
    const resultado = [{ inicio: "2026-11-10T12:00:00.000Z" }];
    const obterHistoricoServico = jest.fn().mockResolvedValue(resultado);
    const controller = new ServicosController(
      {} as ServicosService,
      { obterHistoricoServico } as unknown as IndicadoresService,
    );
    const query: HistoricoServicoQueryDto = {
      inicio: "2026-11-10T12:00:00.000Z",
      fim: "2026-11-10T14:00:00.000Z",
      granularidade: "hora",
    };

    await expect(controller.obterHistorico("7", query)).resolves.toBe(
      resultado,
    );
    expect(obterHistoricoServico).toHaveBeenCalledWith("7", query);
  });
});
