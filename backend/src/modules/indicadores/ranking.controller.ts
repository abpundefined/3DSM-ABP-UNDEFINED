import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { MetricaRanking, RankingQueryDto } from "./dto/ranking-query.dto";
import { PeriodoPredefinido } from "./dto/periodo.dto";
import { RankingService } from "./ranking.service";

@ApiTags("Ranking")
@Controller("ranking")
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  @ApiOperation({
    summary: "Consultar o ranking de serviços por impacto no período",
    description:
      "Soma as coletas válidas por serviço no período e retorna energia, emissão e quantidade de coletas.",
  })
  @ApiQuery({
    name: "periodo",
    required: false,
    enum: PeriodoPredefinido,
  })
  @ApiQuery({
    name: "inicio",
    required: false,
    type: String,
    format: "date-time",
  })
  @ApiQuery({
    name: "fim",
    required: false,
    type: String,
    format: "date-time",
  })
  @ApiQuery({ name: "metrica", required: false, enum: MetricaRanking })
  @ApiQuery({
    name: "limite",
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["periodo", "metrica", "itens", "semDados"],
      properties: {
        periodo: {
          type: "object",
          required: ["inicio", "fim"],
          properties: {
            inicio: { type: "string", format: "date-time" },
            fim: { type: "string", format: "date-time" },
          },
        },
        metrica: { type: "string", enum: Object.values(MetricaRanking) },
        itens: {
          type: "array",
          items: {
            type: "object",
            required: [
              "posicao",
              "servicoId",
              "nome",
              "energiaKwh",
              "emissaoGCo2e",
              "coletasValidas",
            ],
            properties: {
              posicao: { type: "integer" },
              servicoId: { type: "integer" },
              nome: { type: "string" },
              energiaKwh: { type: "number" },
              emissaoGCo2e: { type: "number" },
              coletasValidas: { type: "integer" },
            },
          },
        },
        semDados: {
          type: "array",
          items: {
            type: "object",
            required: ["servicoId", "nome"],
            properties: {
              servicoId: { type: "integer" },
              nome: { type: "string" },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      "Métrica inválida, limite fora de 1 a 100 ou período inválido.",
  })
  obter(@Query() query: RankingQueryDto) {
    return this.rankingService.obterRanking(query);
  }
}
