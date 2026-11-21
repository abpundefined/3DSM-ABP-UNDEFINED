import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { converterPeriodo } from "../indicadores/date-conversion.helper";
import { PeriodoDto } from "../indicadores/dto/periodo.dto";
import { OportunidadesRespostaDto } from "./dto/oportunidades-resposta.dto";
import { OportunidadesService } from "./oportunidades.service";

@ApiTags("Oportunidades")
@Controller("oportunidades")
export class OportunidadesController {
  constructor(private readonly oportunidadesService: OportunidadesService) {}

  @Get()
  @ApiOperation({
    summary: "Listar oportunidades estimadas de redução de emissão",
    description:
      "Avalia regras heurísticas (migração de região, possível superdimensionamento e mudança de horário) para o período selecionado e ordena pelo maior ganho estimado. Valores são estimativas operacionais, não garantia.",
  })
  @ApiOkResponse({ type: OportunidadesRespostaDto })
  @ApiBadRequestResponse({
    description:
      "Período informado inválido (datas, ordem ou intervalo > 90 dias).",
  })
  listar(@Query() query: PeriodoDto) {
    const { inicio, fim } = converterPeriodo(query);
    return this.oportunidadesService.listar(inicio, fim);
  }
}
