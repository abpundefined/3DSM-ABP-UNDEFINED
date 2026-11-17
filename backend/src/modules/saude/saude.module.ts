import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { RegistroIntegracoesService } from "./registro-integracoes.service";
import { SaudeController } from "./saude.controller";
import { SaudeRepository } from "./saude.repository";
import { SaudeService } from "./saude.service";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [SaudeController],
  providers: [RegistroIntegracoesService, SaudeService, SaudeRepository],
  exports: [RegistroIntegracoesService],
})
export class SaudeModule {}
