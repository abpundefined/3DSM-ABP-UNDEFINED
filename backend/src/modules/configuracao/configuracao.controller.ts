import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ConfiguracaoService } from "./configuracao.service";
import { AtualizarConfiguracaoDto } from "./dto/atualizar-configuracao.dto";

@Controller("configuracao")
export class ConfiguracaoController {
  constructor(private readonly configuracaoService: ConfiguracaoService) {}

  @Get()
  obter() {
    return this.configuracaoService.obter();
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  atualizar(@Body() dto: AtualizarConfiguracaoDto) {
    return this.configuracaoService.atualizar(dto);
  }
}