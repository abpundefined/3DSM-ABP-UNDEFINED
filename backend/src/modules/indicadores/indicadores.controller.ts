import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiExtraModels,
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
import { MetaCarbonoResponseDto } from "./dto/meta-carbono-response.dto";
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
      Compara com a janela imediatamente anterior de mesma duração, sem sobreposição.
      variacaoPercentual retorna null quando não há dados atuais ou anteriores, ou o total anterior é zero.`,
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
      "Totais ambientais, contagem de serviços e variação contra a janela anterior de mesma duração.",
    schema: {
      allOf: [
        { $ref: getSchemaPath(IndicadoresRespostaDto) },
        {
          type: "object",
          properties: {
            variacao: {
              type: "object",
              description:
                "Campo legado de mes-anterior, agora comparado à janela anterior de mesma duração.",
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
                    absoluta: { type: "number", nullable: true },
                    percentual: { type: "number", nullable: true },
                  },
                },
                emissaoTotalGCo2e: {
                  type: "object",
                  required: ["absoluta", "percentual"],
                  properties: {
                    absoluta: { type: "number", nullable: true },
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

  @Get("meta")
  @ApiOperation({ summary: "Consultar meta mensal de carbono e projeção" })
  @ApiOkResponse({ type: MetaCarbonoResponseDto })
  obterMeta(): Promise<MetaCarbonoResponseDto> {
    return this.indicadoresService.obterMeta();
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
  obterSerie(@Query() query: SerieTemporalQueryDto) {
    return this.indicadoresService.obterSerieTemporal(query);
  }
}
