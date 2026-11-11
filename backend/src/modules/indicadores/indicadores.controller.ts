import { Controller, Get, Query } from "@nestjs/common";
import { FiltroIndicadoresDto } from "./dto/filtro-indicadores.dto";
import { IndicadoresService } from "./indicadores.service";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IndicadoresRespostaDto } from "../../common/swagger/respostas.dto";

@ApiTags("Indicadores")
@Controller("indicadores")
export class IndicadoresController {
  constructor(private readonly indicadoresService: IndicadoresService) {}

  @Get()
  @ApiOperation({
    summary: "Consultar indicadores consolidados",
    description:
      "Soma coletas com cálculo concluído no período; por padrão, as últimas 24 horas. Os estados dos serviços são atuais.",
  })
  @ApiResponse({
    status: 200,
    description: "Totais ambientais e contagem de serviços.",
    type: IndicadoresRespostaDto,
  })
  @ApiResponse({
    status: 400,
    description: "Datas inválidas ou início posterior ao fim.",
  })
  obter(@Query() filtro: FiltroIndicadoresDto) {
    return this.indicadoresService.obter(filtro);
  }
}
