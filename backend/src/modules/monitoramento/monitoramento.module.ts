import { Module } from '@nestjs/common';
import { MonitoramentoService } from './monitoramento.service';
import { ServicosModule } from '../servicos/servicos.module';
import { ColetasModule } from '../coletas/coletas.module';

@Module({
  imports: [ServicosModule, ColetasModule],
  providers: [MonitoramentoService],
  exports: [MonitoramentoService],
})
export class MonitoramentoModule {}
