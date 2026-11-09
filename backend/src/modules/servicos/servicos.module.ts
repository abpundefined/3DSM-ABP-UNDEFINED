import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ServicosController } from "./servicos.controller";
import { ServicosService } from "./servicos.service";
import { PrismaService } from "../../database/prisma.service";

@Module({
  imports: [AuthModule],
  controllers: [ServicosController],
  providers: [ServicosService, PrismaService],
  exports: [ServicosService],
})
export class ServicosModule {}
