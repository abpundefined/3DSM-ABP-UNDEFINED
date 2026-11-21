import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  PeriodoIndicadoresRespostaDto,
  VariacaoPercentualRespostaDto,
} from "../../common/swagger/respostas.dto";
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
      "Soma coletas concluídas no período e compara com a janela anterior de mesma duração. Variação global considera todos os serviços, não só o top limitado. variacaoPorServico inclui dados em qualquer janela, inclusive removidos, sem limite. Percentual é null quando não há valor atual ou anterior, ou a base é zero. Sem emissão atual, emissão, diferença e percentual por serviço são null; zero medido permanece zero.",
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
  @ApiExtraModels(PeriodoIndicadoresRespostaDto, VariacaoPercentualRespostaDto)
  @ApiOkResponse({
    schema: {
      type: "object",
      required: [
        "periodo",
        "periodoAnterior",
        "variacaoPercentual",
        "variacaoPorServico",
        "metrica",
        "itens",
        "semDados",
      ],
      properties: {
        periodoAnterior: { $ref: getSchemaPath(PeriodoIndicadoresRespostaDto) },
        variacaoPercentual: {
          $ref: getSchemaPath(VariacaoPercentualRespostaDto),
        },
        variacaoPorServico: {
          type: "array",
          items: {
            type: "object",
            required: [
              "servicoId",
              "nome",
              "selo",
              "emissaoAtualGCo2e",
              "emissaoAnteriorGCo2e",
              "diferencaGCo2e",
              "variacaoPercentual",
            ],
            properties: {
              servicoId: { type: "integer" },
              nome: { type: "string" },
              selo: { type: "string" },
              emissaoAtualGCo2e: { type: "number", nullable: true },
              emissaoAnteriorGCo2e: { type: "number", nullable: true },
              diferencaGCo2e: { type: "number", nullable: true },
              variacaoPercentual: { type: "number", nullable: true },
            },
          },
        },
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
              "selo",
            ],
            properties: {
              posicao: { type: "integer" },
              servicoId: { type: "integer" },
              nome: { type: "string" },
              energiaKwh: { type: "number" },
              emissaoGCo2e: { type: "number" },
              coletasValidas: { type: "integer" },
              selo: { type: "string" },
            },
          },
        },
        semDados: {
          type: "array",
          items: {
            type: "object",
            required: ["servicoId", "nome", "selo"],
            properties: {
              servicoId: { type: "integer" },
              nome: { type: "string" },
              selo: { type: "string" },
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
