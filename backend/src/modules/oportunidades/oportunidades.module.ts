import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { OportunidadesController } from "./oportunidades.controller";
import { OportunidadesRepository } from "./oportunidades.repository";
import { OportunidadesService } from "./oportunidades.service";

@Module({
  imports: [DatabaseModule],
  controllers: [OportunidadesController],
  providers: [OportunidadesRepository, OportunidadesService],
})
export class OportunidadesModule {}
