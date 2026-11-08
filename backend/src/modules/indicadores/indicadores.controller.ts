import { Controller, Get, Query } from "@nestjs/common";
import { FiltroIndicadoresDto } from "./dto/filtro-indicadores.dto";
import { IndicadoresService } from "./indicadores.service";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

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
    schema: {
      example: {
        periodo: {
          inicio: "2026-11-07T12:00:00.000Z",
          fim: "2026-11-08T12:00:00.000Z",
        },
        energiaTotalKwh: 2.5,
        emissaoTotalGCo2e: 100,
        coletasCalculadas: 2,
        servicos: {
          monitorados: 3,
          disponiveis: 1,
          indisponiveis: 1,
          semMetricas: 1,
          desconhecidos: 0,
          removidos: 0,
        },
        ultimaColetaEm: "2026-11-08T11:59:30.000Z",
        geradoEm: "2026-11-08T12:00:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Datas inválidas ou início posterior ao fim.",
  })
  obter(@Query() filtro: FiltroIndicadoresDto) {
    return this.indicadoresService.obter(filtro);
  }
}
