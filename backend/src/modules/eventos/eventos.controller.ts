import { Controller, Header, MessageEvent, Sse } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import { Observable } from "rxjs";
import { EventosService } from "./eventos.service";

@ApiTags("Eventos")
@Controller("eventos")
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Sse()
  @Header("Cache-Control", "no-cache, no-transform")
  @Header("X-Accel-Buffering", "no")
  @ApiOperation({
    summary:
      "Transmite eventos em tempo real via Server-Sent Events (coleta-registrada e estado-alterado)",
  })
  @ApiProduces("text/event-stream")
  @ApiOkResponse({
    description:
      "Fluxo contínuo de eventos SSE com atualizações de coletas e mudanças de estado dos serviços monitorados.",
  })
  transmitirEventos(): Observable<MessageEvent> {
    return this.eventosService.assinar();
  }
}
