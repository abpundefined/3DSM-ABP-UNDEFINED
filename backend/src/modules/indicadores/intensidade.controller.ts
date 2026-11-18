import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { IntensidadeHorariosResponseDto } from "./dto/intensidade-horarios-response.dto";
import { IntensidadeHorariosQueryDto } from "./dto/intensidade-horarios-query.dto";
import { IndicadoresService } from "./indicadores.service";

@ApiTags("Intensidade")
@Controller("intensidade")
export class IntensidadeController {
  constructor(private readonly indicadoresService: IndicadoresService) {}

  @Get("horarios")
  @ApiOperation({
    summary: "Consultar matriz horária de intensidade",
    description: "Usa os últimos 30 dias quando nenhum período é informado.",
  })
  @ApiOkResponse({ type: IntensidadeHorariosResponseDto })
  @ApiBadRequestResponse({ description: "Período informado inválido." })
  obterMatrizHorarios(@Query() query: IntensidadeHorariosQueryDto) {
    return this.indicadoresService.obterMatrizHorarios(query);
  }
}
