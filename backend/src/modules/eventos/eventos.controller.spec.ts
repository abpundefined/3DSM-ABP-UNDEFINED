import { firstValueFrom } from "rxjs";
import { EventosController } from "./eventos.controller";
import { EventosService } from "./eventos.service";

describe("EventosController", () => {
  let controller: EventosController;
  let eventosService: EventosService;

  beforeEach(() => {
    eventosService = new EventosService();
    controller = new EventosController(eventosService);
  });

  it("expõe o fluxo SSE do EventosService em transmitirEventos()", async () => {
    const fluxo = controller.transmitirEventos();
    const promessa = firstValueFrom(fluxo);

    eventosService.emitirEstadoAlterado(
      11,
      "DISPONIVEL",
      new Date("2026-04-20T18:00:00.000Z"),
    );

    const evento = await promessa;
    expect(evento).toEqual({
      type: "estado-alterado",
      data: {
        tipo: "estado-alterado",
        servicoId: 11,
        estadoAtual: "DISPONIVEL",
        atualizadoEm: "2026-04-20T18:00:00.000Z",
      },
    });
  });
});
