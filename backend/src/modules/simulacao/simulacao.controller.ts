import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { IdInteiroPipe } from "../../common/pipes/id-inteiro.pipe";
import { converterPeriodo } from "../indicadores/date-conversion.helper";
import { PeriodoDto } from "../indicadores/dto/periodo.dto";
import { SimulacaoRegiaoRespostaDto } from "./dto/simulacao-regiao-resposta.dto";
import { SimulacaoService } from "./simulacao.service";

@ApiTags("Serviços")
@Controller("servicos")
export class SimulacaoController {
  constructor(private readonly simulacaoService: SimulacaoService) {}

  @Get(":id/simulacao-regiao")
  @ApiOperation({
    summary: "Simular a emissão do serviço em outra região monitorada",
    description: `Estimativa: energia do serviço no período (coletas com cálculo concluído) × intensidade média de carbono de cada região no mesmo período.
      Mesma carga em todas as regiões; não considera latência nem custo. Por padrão, as últimas 24 horas.`,
  })
  @ApiOkResponse({ type: SimulacaoRegiaoRespostaDto })
  @ApiBadRequestResponse({
    description:
      "ID inválido (não inteiro, menor que 1 ou acima do limite do banco) ou período inválido (datas, ordem ou mais de 90 dias).",
  })
  @ApiNotFoundResponse({ description: "Serviço não encontrado." })
  simular(@Param("id", IdInteiroPipe) id: number, @Query() query: PeriodoDto) {
    const { inicio, fim } = converterPeriodo(query);

    return this.simulacaoService.simular(id, inicio, fim);
  }
}
