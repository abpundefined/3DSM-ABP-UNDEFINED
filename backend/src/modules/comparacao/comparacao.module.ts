import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { ComparacaoController } from "./comparacao.controller";
import { ComparacaoRepository } from "./comparacao.repository";
import { ComparacaoService } from "./comparacao.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ComparacaoController],
  providers: [ComparacaoService, ComparacaoRepository],
})
export class ComparacaoModule {}
