import { Module } from "@nestjs/common";
import { ColetasController } from "./coletas.controller";
import { ColetasService } from "./coletas.service";
import { ColetasRepository } from "./coletas.repository";
import { CalculosModule } from "../calculos/calculos.module";
import { PrismaService } from "../../database/prisma.service";

@Module({
  imports: [CalculosModule],
  controllers: [ColetasController],
  providers: [ColetasService, ColetasRepository, PrismaService],
})
export class ColetasModule {}
