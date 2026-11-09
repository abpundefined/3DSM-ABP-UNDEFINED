import { Module } from '@nestjs/common';
import { ColetasController } from './coletas.controller';
import { ColetasService } from './coletas.service';
import { ColetasRepository } from './coletas.repository';
import { AuthModule } from '../auth/auth.module';
import { CalculosModule } from '../calculos/calculos.module';
import { ServicosModule } from '../servicos/servicos.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [AuthModule, CalculosModule, ServicosModule],
  controllers: [ColetasController],
  providers: [ColetasService, ColetasRepository, PrismaService],
  exports: [ColetasService],
})
export class ColetasModule {}
