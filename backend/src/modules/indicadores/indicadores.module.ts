import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { IndicadoresController } from "./indicadores.controller";
import { IndicadoresRepository } from "./indicadores.repository";
import { IndicadoresService } from "./indicadores.service";

@Module({
  imports: [DatabaseModule],
  controllers: [IndicadoresController],
  providers: [IndicadoresService, IndicadoresRepository],
})
export class IndicadoresModule {}
