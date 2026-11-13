import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ServicosController } from "./servicos.controller";
import { ServicosRepository } from "./servicos.repository";
import { ServicosService } from "./servicos.service";
import { PrismaService } from "../../database/prisma.service";

@Module({
  imports: [AuthModule],
  controllers: [ServicosController],
  providers: [ServicosService, ServicosRepository, PrismaService],
  exports: [ServicosService],
})
export class ServicosModule {}
