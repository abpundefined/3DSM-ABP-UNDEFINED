import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ServicosService } from "./servicos.service";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("Serviços")
@Controller("servicos")
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Get()
  @ApiOperation({ summary: "Listar serviços persistidos" })
  async listar() {
    return this.servicosService.listarServicos();
  }

  @Post("sync")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Sincronizar serviços com o agregador de métricas" })
  async sincronizar() {
    return this.servicosService.syncServices();
  }
}
