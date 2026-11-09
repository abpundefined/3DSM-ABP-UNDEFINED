import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServicosService } from './servicos.service';

@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Get()
  async listar() {
    return this.servicosService.listarServicos();
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async sincronizar() {
    return this.servicosService.syncServices();
  }
}
