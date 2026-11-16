import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { SimulacaoController } from "./simulacao.controller";
import { SimulacaoRepository } from "./simulacao.repository";
import { SimulacaoService } from "./simulacao.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SimulacaoController],
  providers: [SimulacaoService, SimulacaoRepository],
})
export class SimulacaoModule {}
