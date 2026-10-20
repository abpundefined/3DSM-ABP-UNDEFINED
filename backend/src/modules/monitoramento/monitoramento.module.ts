import { Module } from '@nestjs/common';
import { MonitoramentoService } from './monitoramento.service';
import { PrismaService } from '../../database/prisma.service';
import { ServicosService } from '../servicos/servicos.service';

@Module({
  providers: [MonitoramentoService, PrismaService, ServicosService],
  exports: [MonitoramentoService],
})
export class MonitoramentoModule {}
