import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { PeriodoPredefinido } from "../indicadores/dto/periodo.dto";
import { ComparacaoQueryDto } from "./comparacao-query.dto";
import { ComparacaoService } from "./comparacao.service";

@ApiTags("Comparação")
@Controller("comparacao")
export class ComparacaoController {
  constructor(private readonly service: ComparacaoService) {}

  @Get()
  @ApiOperation({
    summary: "Comparar serviços no mesmo período",
    description:
      "Considera coletas com cálculo concluído. A série usa horas UTC até 48 horas e dias de calendário no fuso America/Sao_Paulo acima disso.",
  })
  @ApiQuery({
    name: "servicos",
    required: true,
    type: String,
    description: "De 2 a 5 IDs internos distintos, separados por vírgula.",
    example: "1,2,3",
  })
  @ApiQuery({ name: "periodo", required: false, enum: PeriodoPredefinido })
  @ApiQuery({
    name: "inicio",
    required: false,
    type: String,
    format: "date-time",
  })
  @ApiQuery({ name: "fim", required: false, type: String, format: "date-time" })
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["periodo", "granularidade", "servicos"],
      properties: {
        periodo: {
          type: "object",
          required: ["inicio", "fim"],
          properties: {
            inicio: { type: "string", format: "date-time" },
            fim: { type: "string", format: "date-time" },
          },
        },
        granularidade: { type: "string", enum: ["hora", "dia"] },
        servicos: {
          type: "array",
          items: {
            type: "object",
            required: ["servicoId", "nome", "totais", "serie"],
            properties: {
              servicoId: { type: "integer" },
              nome: { type: "string" },
              totais: {
                type: "object",
                required: [
                  "energiaKwh",
                  "emissaoGCo2e",
                  "cpuMedia",
                  "memoriaMediaMb",
                  "coletasValidas",
                ],
                properties: {
                  energiaKwh: { type: "number", nullable: true },
                  emissaoGCo2e: { type: "number", nullable: true },
                  cpuMedia: { type: "number", nullable: true },
                  memoriaMediaMb: { type: "number", nullable: true },
                  coletasValidas: { type: "integer" },
                },
              },
              serie: {
                type: "array",
                items: {
                  type: "object",
                  required: ["inicio", "energiaKwh", "emissaoGCo2e"],
                  properties: {
                    inicio: { type: "string", format: "date-time" },
                    energiaKwh: { type: "number", nullable: true },
                    emissaoGCo2e: { type: "number", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: "IDs ou período inválidos." })
  @ApiNotFoundResponse({ description: "Um ou mais serviços não existem." })
  obter(@Query() query: ComparacaoQueryDto) {
    return this.service.obter(query);
  }
}
