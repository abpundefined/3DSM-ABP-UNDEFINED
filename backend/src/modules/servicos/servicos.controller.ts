import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ServicosService } from "./servicos.service";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  ServicoDescobertoRespostaDto,
  ServicoRespostaDto,
} from "../../common/swagger/respostas.dto";
import { HistoricoServicoQueryDto } from "../indicadores/dto/historico-servico-query.dto";
import { IndicadoresService } from "../indicadores/indicadores.service";

@ApiTags("Serviços")
@Controller("servicos")
export class ServicosController {
  constructor(
    private readonly servicosService: ServicosService,
    private readonly indicadoresService: IndicadoresService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar serviços persistidos" })
  @ApiResponse({ status: 200, type: ServicoRespostaDto, isArray: true })
  async listar() {
    return this.servicosService.listarServicos();
  }

  @Get(":id/historico")
  @ApiOperation({ summary: "Série temporal de um serviço no período" })
  @ApiResponse({
    status: 200,
    description: "Série temporal agrupada por hora ou dia.",
  })
  @ApiResponse({ status: 404, description: "Serviço inexistente." })
  obterHistorico(
    @Param("id") id: string,
    @Query() query: HistoricoServicoQueryDto,
  ) {
    return this.indicadoresService.obterHistoricoServico(id, query);
  }

  @Post("sync")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sincronizar serviços com o agregador de métricas" })
  @ApiResponse({
    status: 201,
    type: ServicoDescobertoRespostaDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: "Token ausente ou inválido." })
  async sincronizar() {
    return this.servicosService.syncServices();
  }
}
