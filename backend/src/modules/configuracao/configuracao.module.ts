import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ConfiguracaoController } from "./configuracao.controller";
import { ConfiguracaoRepository } from "./configuracao.repository";
import { ConfiguracaoService } from "./configuracao.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ConfiguracaoController],
  providers: [ConfiguracaoService, ConfiguracaoRepository],
})
export class ConfiguracaoModule {}