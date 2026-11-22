import { Module } from "@nestjs/common";
import { CalculosService } from "./calculos.service";
import { SaudeModule } from "../saude/saude.module";
import { CarbonApiService } from "./carbon-api.service";

@Module({
  imports: [SaudeModule],
  providers: [CalculosService, CarbonApiService],
  exports: [CalculosService],
})
export class CalculosModule {}
