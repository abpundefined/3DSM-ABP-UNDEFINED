import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { MapaController } from "./mapa.controller";
import { MapaRepository } from "./mapa.repository";
import { MapaService } from "./mapa.service";

@Module({
  imports: [DatabaseModule],
  controllers: [MapaController],
  providers: [MapaService, MapaRepository],
})
export class MapaModule {}
