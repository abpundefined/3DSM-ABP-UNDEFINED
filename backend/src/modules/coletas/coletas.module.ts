import { Module } from '@nestjs/common';
import { ColetasController } from './coletas.controller';
import { ColetasService } from './coletas.service';
import { ColetasRepository } from './coletas.repository';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [ColetasController],
  providers: [ColetasService, ColetasRepository, PrismaService],
  exports: [ColetasService, ColetasRepository],
})
export class ColetasModule {}