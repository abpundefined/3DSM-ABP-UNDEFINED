import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { IndicadoresController } from "./indicadores.controller";
import { IntensidadeController } from "./intensidade.controller";
import { IndicadoresRepository } from "./indicadores.repository";
import { IndicadoresService } from "./indicadores.service";
import { RankingController } from "./ranking.controller";
import { RankingService } from "./ranking.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    IndicadoresController,
    IntensidadeController,
    RankingController,
  ],
  providers: [IndicadoresService, IndicadoresRepository, RankingService],
  exports: [IndicadoresService],
})
export class IndicadoresModule {}
