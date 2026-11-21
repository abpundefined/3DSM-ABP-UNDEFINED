import { Global, Module } from "@nestjs/common";
import { EventosController } from "./eventos.controller";
import { EventosService } from "./eventos.service";

@Global()
@Module({
  controllers: [EventosController],
  providers: [EventosService],
  exports: [EventosService],
})
export class EventosModule {}
