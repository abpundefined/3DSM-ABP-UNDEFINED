import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SaudeRespostaDto } from "./dto/saude-resposta.dto";
import { SaudeService } from "./saude.service";

@ApiTags("Saúde")
@Controller("saude")
export class SaudeController {
  constructor(private readonly saudeService: SaudeService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Consultar a saúde das integrações e das coletas",
    description: `Mostra a última consulta ao agregador de métricas e à API de carbono, a taxa de falha das coletas na última hora e os serviços em cada estado.
      O registro das consultas fica em memória e recomeça vazio quando o backend reinicia.`,
  })
  @ApiOkResponse({ type: SaudeRespostaDto })
  @ApiUnauthorizedResponse({ description: "Token ausente ou inválido." })
  obter() {
    return this.saudeService.obter();
  }
}
