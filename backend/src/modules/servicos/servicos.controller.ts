import { Controller, Get, Post, UseGuards } from "@nestjs/common";
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

@ApiTags("Serviços")
@Controller("servicos")
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Get()
  @ApiOperation({ summary: "Listar serviços persistidos" })
  @ApiResponse({ status: 200, type: ServicoRespostaDto, isArray: true })
  async listar() {
    return this.servicosService.listarServicos();
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
