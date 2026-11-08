import { Controller, Get, Query } from "@nestjs/common";
import { FiltroIndicadoresDto } from "./dto/filtro-indicadores.dto";
import { IndicadoresService } from "./indicadores.service";

@Controller("indicadores")
export class IndicadoresController {
  constructor(private readonly indicadoresService: IndicadoresService) {}

  @Get()
  obter(@Query() filtro: FiltroIndicadoresDto) {
    return this.indicadoresService.obter(filtro);
  }
}
