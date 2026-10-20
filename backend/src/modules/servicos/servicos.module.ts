import { Module } from '@nestjs/common';
import { ServicosController } from './servicos.controller';
import { ServicosService } from './servicos.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [ServicosController],
  providers: [ServicosService, PrismaService],
  exports: [ServicosService],
})
export class ServicosModule {}
