import { Controller, Get, Post } from '@nestjs/common';
import { ServicosService } from './servicos.service';

@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Get()
  async listar() {
    return this.servicosService.listarServicos();
  }

  @Post('sync')
  async sincronizar() {
    return this.servicosService.syncServices();
  }
}
