import { BadRequestException } from "@nestjs/common";
import { subMilliseconds } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { PeriodoDto, PeriodoPredefinido } from "./dto/periodo.dto";

const TIME_ZONE = "America/Sao_Paulo";
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface IntervaloIndicadores {
  inicio: Date;
  fim: Date;
}

export function converterPeriodo(dto: PeriodoDto): IntervaloIndicadores {
  const agora = new Date();

  switch (dto.periodo) {
    case PeriodoPredefinido.ULTIMAS_24_HORAS:
      return intervaloRelativo(agora, 1);
    case PeriodoPredefinido.ULTIMOS_7_DIAS:
      return intervaloRelativo(agora, 7);
    case PeriodoPredefinido.ULTIMOS_30_DIAS:
      return intervaloRelativo(agora, 30);
    case PeriodoPredefinido.MES_ATUAL:
      return {
        inicio: inicioDoMes(agora),
        fim: agora,
      };
    case PeriodoPredefinido.MES_ANTERIOR:
      return intervaloMesAnterior(agora);
    case undefined:
      return intervaloCustomizadoOuPadrao(dto, agora);
    default:
      throw new BadRequestException("Período predefinido inválido.");
  }
}

function intervaloRelativo(agora: Date, dias: number): IntervaloIndicadores {
  return {
    inicio: subMilliseconds(agora, dias * MILLISECONDS_PER_DAY),
    fim: agora,
  };
}

function intervaloCustomizadoOuPadrao(
  dto: PeriodoDto,
  agora: Date,
): IntervaloIndicadores {
  if (dto.inicio === undefined && dto.fim === undefined) {
    return intervaloRelativo(agora, 1);
  }

  if (dto.inicio === undefined || dto.fim === undefined) {
    throw new BadRequestException(
      "Informe inicio e fim para um período customizado.",
    );
  }

  const inicio = new Date(dto.inicio);
  const fim = new Date(dto.fim);

  if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fim.getTime())) {
    throw new BadRequestException("Inicio e fim devem ser datas válidas.");
  }

  return { inicio, fim };
}

function inicioDoMes(data: Date): Date {
  const mesAtual = formatInTimeZone(data, TIME_ZONE, "yyyy-MM");

  return fromZonedTime(`${mesAtual}-01T00:00:00.000`, TIME_ZONE);
}

function intervaloMesAnterior(agora: Date): IntervaloIndicadores {
  const mesAtual = formatInTimeZone(agora, TIME_ZONE, "yyyy-MM");
  const [anoAtual, numeroMesAtual] = mesAtual.split("-").map(Number);
  const anoAnterior = numeroMesAtual === 1 ? anoAtual - 1 : anoAtual;
  const numeroMesAnterior = numeroMesAtual === 1 ? 12 : numeroMesAtual - 1;
  const mesAnterior = `${anoAnterior.toString().padStart(4, "0")}-${numeroMesAnterior
    .toString()
    .padStart(2, "0")}`;
  const primeiroDiaMesAtual = fromZonedTime(
    `${mesAtual}-01T00:00:00.000`,
    TIME_ZONE,
  );

  return {
    inicio: fromZonedTime(`${mesAnterior}-01T00:00:00.000`, TIME_ZONE),
    fim: subMilliseconds(primeiroDiaMesAtual, 1),
  };
}
