jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { MetricaRanking, RankingQueryDto } from "./dto/ranking-query.dto";
import { RankingService } from "./ranking.service";
import { RankingController } from "./ranking.controller";

describe("RankingController", () => {
  const obterRanking = jest.fn().mockResolvedValue({});
  const controller = new RankingController({
    obterRanking,
  } as unknown as RankingService);
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });

  const validar = (query: Record<string, unknown>) =>
    pipe.transform(query, {
      type: "query",
      metatype: RankingQueryDto,
    });

  beforeEach(() => obterRanking.mockClear());

  it("encaminha os parâmetros de ranking e período ao serviço", async () => {
    const query = (await validar({
      periodo: "7d",
      metrica: "emissao",
      limite: "25",
    })) as RankingQueryDto;

    await controller.obter(query);

    expect(obterRanking).toHaveBeenCalledWith(
      expect.objectContaining({
        periodo: "7d",
        metrica: MetricaRanking.EMISSAO,
        limite: 25,
      }),
    );
  });

  it.each([{ metrica: "agua" }, { limite: "1.5" }, { limite: "101" }])(
    "rejeita parâmetros de ranking inválidos: %o",
    async (query) => {
      await expect(validar(query)).rejects.toBeInstanceOf(BadRequestException);
      expect(obterRanking).not.toHaveBeenCalled();
    },
  );
});
