import { Module } from "@nestjs/common";
import { RegistroIntegracoesService } from "./registro-integracoes.service";

@Module({
  providers: [RegistroIntegracoesService],
  exports: [RegistroIntegracoesService],
})
export class SaudeModule {}
