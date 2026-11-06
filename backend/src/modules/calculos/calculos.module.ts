import { Module } from "@nestjs/common";
import { CalculosService } from "./calculos.service";
import { CarbonApiService } from "./carbon-api.service";

@Module({
  providers: [CalculosService, CarbonApiService],
  exports: [CalculosService],
})
export class CalculosModule {}
