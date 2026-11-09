import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ConfiguracaoService } from "./configuracao.service";
import { AtualizarConfiguracaoDto } from "./dto/atualizar-configuracao.dto";
import { ConfiguracaoRespostaDto } from "../../common/swagger/respostas.dto";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("Configuração")
@Controller("configuracao")
export class ConfiguracaoController {
  constructor(private readonly configuracaoService: ConfiguracaoService) {}

  @Get()
  @ApiOperation({ summary: "Consultar intervalos de monitoramento" })
  @ApiResponse({ status: 200, type: ConfiguracaoRespostaDto })
  obter() {
    return this.configuracaoService.obter();
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Atualizar intervalos de monitoramento" })
  @ApiResponse({ status: 200, type: ConfiguracaoRespostaDto })
  @ApiResponse({ status: 400, description: "Intervalos inválidos." })
  @ApiResponse({ status: 401, description: "Token ausente ou inválido." })
  atualizar(@Body() dto: AtualizarConfiguracaoDto) {
    return this.configuracaoService.atualizar(dto);
  }
}
