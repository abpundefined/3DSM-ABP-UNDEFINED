import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiNotImplementedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { IndicadoresRespostaDto } from "../../common/swagger/respostas.dto";
import * as DateConversionHelper from "./date-conversion.helper";
import { PeriodoDto, PeriodoPredefinido } from "./dto/periodo.dto";
import { SerieTemporalQueryDto } from "./dto/serie-temporal-query.dto";
import { SerieTemporalResponseDto } from "./dto/serie-temporal-response.dto";
import { IndicadoresService } from "./indicadores.service";

@ApiTags("Indicadores")
@Controller("indicadores")
export class IndicadoresController {
  constructor(private readonly indicadoresService: IndicadoresService) {}

  @Get()
  @ApiOperation({
    summary: "Consultar indicadores consolidados",
    description: `Soma coletas com cálculo concluído no período; por padrão, as últimas 24 horas.
      Para mes-anterior, também compara os indicadores com o mês calendário anterior.`,
  })
  @ApiQuery({
    name: "periodo",
    required: false,
    enum: PeriodoPredefinido,
    description: "Período predefinido. Não pode ser combinado com inicio/fim.",
  })
  @ApiQuery({
    name: "inicio",
    required: false,
    type: String,
    format: "date-time",
    description:
      "Início inclusivo em ISO 8601 com Z ou offset explícito; informe junto com fim.",
  })
  @ApiQuery({
    name: "fim",
    required: false,
    type: String,
    format: "date-time",
    description:
      "Fim inclusivo em ISO 8601 com Z ou offset explícito; informe junto com inicio.",
  })
  @ApiExtraModels(IndicadoresRespostaDto)
  @ApiResponse({
    status: 200,
    description:
      "Totais ambientais, contagem de serviços e, para mes-anterior, variação contra o mês calendário anterior.",
    schema: {
      allOf: [
        { $ref: getSchemaPath(IndicadoresRespostaDto) },
        {
          type: "object",
          properties: {
            variacao: {
              type: "object",
              description:
                "Variação do mês anterior em relação ao mês calendário anterior a ele.",
              required: [
                "energiaTotalKwh",
                "emissaoTotalGCo2e",
                "coletasCalculadas",
              ],
              properties: {
                energiaTotalKwh: {
                  type: "object",
                  required: ["absoluta", "percentual"],
                  properties: {
                    absoluta: { type: "number" },
                    percentual: { type: "number", nullable: true },
                  },
                },
                emissaoTotalGCo2e: {
                  type: "object",
                  required: ["absoluta", "percentual"],
                  properties: {
                    absoluta: { type: "number" },
                    percentual: { type: "number", nullable: true },
                  },
                },
                coletasCalculadas: {
                  type: "object",
                  required: ["absoluta", "percentual"],
                  properties: {
                    absoluta: { type: "number" },
                    percentual: { type: "number", nullable: true },
                  },
                },
              },
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description:
      "Período inválido, datas inválidas, intervalo inconsistente ou superior a 90 dias.",
  })
  obter(@Query() query: PeriodoDto) {
    const { inicio, fim } = DateConversionHelper.converterPeriodo(query);

    return this.indicadoresService.obter(inicio, fim, query.periodo);
  }

  @Get("serie")
  @ApiOperation({
    summary: "Consultar série temporal de energia e emissão",
    description:
      "Retorna os indicadores globais no período e, opcionalmente, as séries por serviço.",
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
  @ApiQuery({ name: "granularidade", required: false, enum: ["hora", "dia"] })
  @ApiQuery({ name: "porServico", required: false, type: Boolean })
  @ApiOkResponse({ type: SerieTemporalResponseDto })
  @ApiBadRequestResponse({ description: "Período ou granularidade inválidos." })
  @ApiNotImplementedResponse({
    description: "A consulta da série temporal ainda não foi implementada.",
  })
  obterSerie(@Query() query: SerieTemporalQueryDto) {
    return this.indicadoresService.obterSerieTemporal(query);
  }
}
