import { addDays, addHours } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const FUSO_HORARIO_PADRAO = "America/Sao_Paulo";
export const LIMITE_GRANULARIDADE_HORA_MS = 48 * 60 * 60 * 1000;

export type Granularidade = "hora" | "dia";

export interface ParametrosDeTruncamento {
  unidade: "hour" | "day";
  fuso: string;
}

export function escolherGranularidade(inicio: Date, fim: Date): Granularidade {
  return fim.getTime() - inicio.getTime() <= LIMITE_GRANULARIDADE_HORA_MS
    ? "hora"
    : "dia";
}

export function parametrosDeTruncamento(
  granularidade: Granularidade,
  fuso = FUSO_HORARIO_PADRAO,
): ParametrosDeTruncamento {
  return granularidade === "hora"
    ? { unidade: "hour", fuso: "UTC" }
    : { unidade: "day", fuso };
}

function diaLocal(data: Date, fuso: string) {
  return formatInTimeZone(data, fuso, "yyyy-MM-dd");
}

function primeiroInstanteDoDia(dia: string, fuso: string): Date {
  let instante = fromZonedTime(`${dia}T00:00:00.000`, fuso);

  while (diaLocal(instante, fuso) < dia) {
    instante = addHours(instante, 1);
  }

  return instante;
}

export function inicioDoIntervalo(
  data: Date,
  granularidade: Granularidade,
  fuso = FUSO_HORARIO_PADRAO,
): Date {
  if (granularidade === "hora") {
    const inicio = new Date(data.getTime());
    inicio.setUTCMinutes(0, 0, 0);
    return inicio;
  }

  return primeiroInstanteDoDia(diaLocal(data, fuso), fuso);
}

function proximoIntervalo(
  inicio: Date,
  granularidade: Granularidade,
  fuso: string,
): Date {
  if (granularidade === "hora") {
    return addHours(inicio, 1);
  }

  const diaSeguinte = addDays(
    new Date(`${diaLocal(inicio, fuso)}T12:00:00.000Z`),
    1,
  )
    .toISOString()
    .slice(0, 10);

  return primeiroInstanteDoDia(diaSeguinte, fuso);
}

export function gerarIntervalos(
  inicio: Date,
  fim: Date,
  granularidade: Granularidade,
  fuso = FUSO_HORARIO_PADRAO,
): Date[] {
  const intervalos: Date[] = [];
  let atual = inicioDoIntervalo(inicio, granularidade, fuso);

  while (atual.getTime() <= fim.getTime()) {
    intervalos.push(atual);

    const proximo = proximoIntervalo(atual, granularidade, fuso);
    if (proximo.getTime() <= atual.getTime()) {
      throw new Error(
        `Intervalo não avançou após ${atual.toISOString()} (${granularidade}, ${fuso}).`,
      );
    }
    atual = proximo;
  }

  return intervalos;
}
