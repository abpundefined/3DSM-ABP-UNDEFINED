import { Module } from "@nestjs/common";
import { CalculosService } from "./calculos.service";

@Module({
  providers: [CalculosService],
  exports: [CalculosService],
})
export class CalculosModule {}
