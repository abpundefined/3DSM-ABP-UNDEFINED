import { escalaDeEmissao, escalaDeEnergia, type Escala } from './formatters';
import type { ServiceHistoryPoint } from '../services/serviceDetail';

export type ScaledServiceHistoryPoint = ServiceHistoryPoint & {
  energia: number | null;
  emissao: number | null;
};

export type ServiceHistorySummary = {
  totalEnergiaKwh: number | null;
  totalEmissaoGCo2e: number | null;
  escalaEnergia: Escala;
  escalaEmissao: Escala;
  pontos: ScaledServiceHistoryPoint[];
  possuiEnergia: boolean;
  possuiEmissao: boolean;
  granularidadeHoraria: boolean;
};

function totalizar(values: (number | null)[]): number | null {
  const validValues = values.filter((value): value is number => value !== null);
  return validValues.length
    ? validValues.reduce((total, value) => total + value, 0)
    : null;
}

function maiorValor(values: (number | null)[]): number {
  return Math.max(
    0,
    ...values.filter((value): value is number => value !== null),
  );
}

export function summarizeServiceHistory(
  history: ServiceHistoryPoint[],
): ServiceHistorySummary {
  const energyValues = history.map((point) => point.energiaKwh);
  const emissionValues = history.map((point) => point.emissaoGCo2e);
  const energiaKwh = totalizar(energyValues);
  const emissaoGCo2e = totalizar(emissionValues);
  const escalaEnergia = escalaDeEnergia(maiorValor(energyValues));
  const escalaEmissao = escalaDeEmissao(maiorValor(emissionValues));

  return {
    totalEnergiaKwh: energiaKwh,
    totalEmissaoGCo2e: emissaoGCo2e,
    escalaEnergia,
    escalaEmissao,
    pontos: history.map((point) => ({
      ...point,
      energia:
        point.energiaKwh === null
          ? null
          : point.energiaKwh * escalaEnergia.fator,
      emissao:
        point.emissaoGCo2e === null
          ? null
          : point.emissaoGCo2e * escalaEmissao.fator,
    })),
    possuiEnergia: energiaKwh !== null,
    possuiEmissao: emissaoGCo2e !== null,
    granularidadeHoraria: history.some((point, index) => {
      if (index === 0) {
        return false;
      }
      const difference =
        Date.parse(point.inicio) - Date.parse(history[index - 1].inicio);
      return difference > 0 && difference < 24 * 60 * 60 * 1000;
    }),
  };
}

export function formatHistoryDate(
  isoDate: string,
  granularidadeHoraria: boolean,
): string {
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) {
    return 'Data indisponível';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    ...(granularidadeHoraria
      ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const }
      : {}),
  }).format(date);
}

export function formatHistoryNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value);
}
