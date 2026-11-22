import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CalculosModule } from "../calculos/calculos.module";
import { IndicadoresModule } from "../indicadores/indicadores.module";
import { SaudeModule } from "../saude/saude.module";
import { ServicosController } from "./servicos.controller";
import { ServicosRepository } from "./servicos.repository";
import { ServicosService } from "./servicos.service";
import { PrismaService } from "../../database/prisma.service";

@Module({
  imports: [AuthModule, CalculosModule, IndicadoresModule, SaudeModule],
  controllers: [ServicosController],
  providers: [ServicosService, ServicosRepository, PrismaService],
  exports: [ServicosService],
})
export class ServicosModule {}
