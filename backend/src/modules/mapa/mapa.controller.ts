import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { converterPeriodo } from "../indicadores/date-conversion.helper";
import { PeriodoDto } from "../indicadores/dto/periodo.dto";
import { MapaRespostaDto } from "./dto/mapa-resposta.dto";
import { MapaService } from "./mapa.service";

@ApiTags("Mapa")
@Controller("mapa")
export class MapaController {
  constructor(private readonly mapaService: MapaService) {}

  @Get()
  @ApiOperation({
    summary: "Consultar serviços no mapa com a série de emissão do período",
    description: `Soma as coletas com cálculo concluído no período; por padrão, as últimas 24 horas.
      Serviços cuja região não tem coordenadas válidas vêm em semCoordenadas.
      Serviços removidos só aparecem se tiverem coleta calculada no período.`,
  })
  @ApiOkResponse({ type: MapaRespostaDto })
  @ApiBadRequestResponse({
    description:
      "Período inválido, datas inválidas, intervalo inconsistente ou superior a 90 dias.",
  })
  obter(@Query() query: PeriodoDto) {
    const { inicio, fim } = converterPeriodo(query);

    return this.mapaService.obter(inicio, fim);
  }
}
