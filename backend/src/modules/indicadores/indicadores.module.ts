import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { IndicadoresController } from "./indicadores.controller";
import { IndicadoresRepository } from "./indicadores.repository";
import { IndicadoresService } from "./indicadores.service";
import { RankingController } from "./ranking.controller";
import { RankingService } from "./ranking.service";

@Module({
  imports: [DatabaseModule],
  controllers: [IndicadoresController, RankingController],
  providers: [IndicadoresService, IndicadoresRepository, RankingService],
})
export class IndicadoresModule {}
