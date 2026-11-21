import { MessageEvent } from "@nestjs/common";
import { firstValueFrom, take, toArray } from "rxjs";
import { EventosService } from "./eventos.service";

describe("EventosService", () => {
  let service: EventosService;

  beforeEach(() => {
    service = new EventosService();
  });

  it("emite evento coleta-registrada com números, decimais e data normalizados", async () => {
    const promessaEvento = firstValueFrom(service.assinar());
    const dataColeta = new Date("2026-04-20T12:00:00.000Z");

    const payload = service.emitirColetaRegistrada({
      id: 42,
      servicoId: 7,
      iniciadaEm: dataColeta,
      intervaloColetaSegundos: 30,
      estadoColeta: "SUCESSO",
      estadoCalculo: "CONCLUIDO",
      cpuPercent: 48.5,
      memoryGb: 2.4,
      diskGb: 10,
      networkGb: 0.5,
      intensidadeCarbonoGCo2ePorKwh: { toNumber: () => 85.2 },
      energiaKwh: "0.0042",
      emissaoGCo2e: 0.3578,
    });

    const eventoRecebido = await promessaEvento;

    expect(eventoRecebido).toEqual<MessageEvent>({
      type: "coleta-registrada",
      data: payload,
    });
    expect(payload).toEqual({
      tipo: "coleta-registrada",
      servicoId: 7,
      coleta: {
        id: 42,
        servicoId: 7,
        iniciadaEm: "2026-04-20T12:00:00.000Z",
        intervaloColetaSegundos: 30,
        estadoColeta: "SUCESSO",
        estadoCalculo: "PENDENTE".replace("PENDENTE", "CONCLUIDO"),
        cpuPercent: 48.5,
        memoryGb: 2.4,
        diskGb: 10,
        networkGb: 0.5,
        intensidadeCarbonoGCo2ePorKwh: 85.2,
        energiaKwh: 0.0042,
        emissaoGCo2e: 0.3578,
      },
    });
  });

  it("aplica fallbacks para valores ausentes, inválidos ou não numéricos na coleta", async () => {
    const promessaEvento = firstValueFrom(service.assinar());

    const payload = service.emitirColetaRegistrada({
      servicoId: 9,
      iniciadaEm: "   ",
      intervaloColetaSegundos: Number.NaN,
      estadoColeta: null,
      estadoCalculo: null,
      cpuPercent: null,
      memoryGb: undefined,
      diskGb: Number.POSITIVE_INFINITY,
      networkGb: null,
      intensidadeCarbonoGCo2ePorKwh: { toNumber: () => Number.NaN },
      energiaKwh: "invalido",
      emissaoGCo2e: "   ",
    });

    const eventoRecebido = await promessaEvento;

    expect(eventoRecebido.type).toBe("coleta-registrada");
    expect(payload.coleta).toMatchObject({
      id: null,
      servicoId: 9,
      intervaloColetaSegundos: null,
      estadoColeta: "DESCONHECIDO",
      estadoCalculo: "PENDENTE",
      cpuPercent: null,
      memoryGb: null,
      diskGb: null,
      networkGb: null,
      intensidadeCarbonoGCo2ePorKwh: null,
      energiaKwh: null,
      emissaoGCo2e: null,
    });
    expect(typeof payload.coleta.iniciadaEm).toBe("string");
  });

  it("preserva string ISO válida em iniciadaEm quando informada", () => {
    const payload = service.emitirColetaRegistrada({
      servicoId: 3,
      iniciadaEm: "2026-04-20T15:30:00.000Z",
    });

    expect(payload.coleta.iniciadaEm).toBe("2026-04-20T15:30:00.000Z");
  });

  it("emite evento estado-alterado com data informada e com data padrão", async () => {
    const promessaEventos = firstValueFrom(
      service.assinar().pipe(take(2), toArray()),
    );
    const dataFixa = new Date("2026-04-20T16:00:00.000Z");

    const primeiro = service.emitirEstadoAlterado(5, "INDISPONIVEL", dataFixa);
    const segundo = service.emitirEstadoAlterado(5, "DISPONIVEL");

    const eventos = await promessaEventos;

    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toEqual<MessageEvent>({
      type: "estado-alterado",
      data: primeiro,
    });
    expect(primeiro).toEqual({
      tipo: "estado-alterado",
      servicoId: 5,
      estadoAtual: "INDISPONIVEL",
      atualizadoEm: "2026-04-20T16:00:00.000Z",
    });
    expect(segundo.servicoId).toBe(5);
    expect(segundo.estadoAtual).toBe("DISPONIVEL");
    expect(typeof segundo.atualizadoEm).toBe("string");
  });
});
