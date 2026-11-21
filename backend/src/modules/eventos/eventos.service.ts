import { Injectable, MessageEvent } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";

export interface DadosColetaEvento {
  id?: number;
  servicoId: number;
  iniciadaEm?: Date | string | null;
  intervaloColetaSegundos?: number | null;
  estadoColeta?: string | null;
  estadoCalculo?: string | null;
  cpuPercent?: number | null;
  memoryGb?: number | null;
  diskGb?: number | null;
  networkGb?: number | null;
  intensidadeCarbonoGCo2ePorKwh?:
    { toNumber(): number } | number | string | null;
  energiaKwh?: { toNumber(): number } | number | string | null;
  emissaoGCo2e?: { toNumber(): number } | number | string | null;
}

export interface EventoColetaRegistradaPayload {
  tipo: "coleta-registrada";
  servicoId: number;
  coleta: {
    id: number | null;
    servicoId: number;
    iniciadaEm: string;
    intervaloColetaSegundos: number | null;
    estadoColeta: string;
    estadoCalculo: string;
    cpuPercent: number | null;
    memoryGb: number | null;
    diskGb: number | null;
    networkGb: number | null;
    intensidadeCarbonoGCo2ePorKwh: number | null;
    energiaKwh: number | null;
    emissaoGCo2e: number | null;
  };
}

export interface EventoEstadoAlteradoPayload {
  tipo: "estado-alterado";
  servicoId: number;
  estadoAtual: EstadoMonitoramento;
  atualizadoEm: string;
}

export type EventoTempoRealPayload =
  EventoColetaRegistradaPayload | EventoEstadoAlteradoPayload;

function normalizarNumero(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : null;
  }
  if (
    typeof valor === "object" &&
    valor !== null &&
    "toNumber" in valor &&
    typeof valor.toNumber === "function"
  ) {
    const convertido = (valor as { toNumber(): number }).toNumber();
    return Number.isFinite(convertido) ? convertido : null;
  }
  if (typeof valor === "string" && valor.trim() !== "") {
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : null;
  }
  return null;
}

function normalizarDataIso(valor: Date | string | null | undefined): string {
  if (valor instanceof Date && Number.isFinite(valor.getTime())) {
    return valor.toISOString();
  }
  if (typeof valor === "string" && valor.trim() !== "") {
    return valor;
  }
  return new Date().toISOString();
}

@Injectable()
export class EventosService {
  private readonly fluxoEventos = new Subject<MessageEvent>();

  assinar(): Observable<MessageEvent> {
    return this.fluxoEventos.asObservable();
  }

  emitirColetaRegistrada(
    coleta: DadosColetaEvento,
  ): EventoColetaRegistradaPayload {
    const payload: EventoColetaRegistradaPayload = {
      tipo: "coleta-registrada",
      servicoId: coleta.servicoId,
      coleta: {
        id: typeof coleta.id === "number" ? coleta.id : null,
        servicoId: coleta.servicoId,
        iniciadaEm: normalizarDataIso(coleta.iniciadaEm),
        intervaloColetaSegundos: normalizarNumero(
          coleta.intervaloColetaSegundos,
        ),
        estadoColeta: coleta.estadoColeta ?? "DESCONHECIDO",
        estadoCalculo: coleta.estadoCalculo ?? "PENDENTE",
        cpuPercent: normalizarNumero(coleta.cpuPercent),
        memoryGb: normalizarNumero(coleta.memoryGb),
        diskGb: normalizarNumero(coleta.diskGb),
        networkGb: normalizarNumero(coleta.networkGb),
        intensidadeCarbonoGCo2ePorKwh: normalizarNumero(
          coleta.intensidadeCarbonoGCo2ePorKwh,
        ),
        energiaKwh: normalizarNumero(coleta.energiaKwh),
        emissaoGCo2e: normalizarNumero(coleta.emissaoGCo2e),
      },
    };

    this.fluxoEventos.next({
      type: "coleta-registrada",
      data: payload,
    });

    return payload;
  }

  emitirEstadoAlterado(
    servicoId: number,
    estadoAtual: EstadoMonitoramento,
    atualizadoEm: Date = new Date(),
  ): EventoEstadoAlteradoPayload {
    const payload: EventoEstadoAlteradoPayload = {
      tipo: "estado-alterado",
      servicoId,
      estadoAtual,
      atualizadoEm: normalizarDataIso(atualizadoEm),
    };

    this.fluxoEventos.next({
      type: "estado-alterado",
      data: payload,
    });

    return payload;
  }
}
