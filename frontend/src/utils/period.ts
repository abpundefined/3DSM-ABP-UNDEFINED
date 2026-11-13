export type PeriodPreset = '24h' | '7d' | '30d' | 'mes-atual' | 'mes-anterior';

export type Period =
  | { kind: 'preset'; preset: PeriodPreset }
  | { kind: 'custom'; inicio: string; fim: string };

export const PRESET_LABELS: Record<PeriodPreset, string> = {
  '24h': 'Últimas 24 horas',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  'mes-atual': 'Este mês',
  'mes-anterior': 'Mês passado',
};

export const DEFAULT_PERIOD: Period = { kind: 'preset', preset: '24h' };
export const MAX_CUSTOM_DAYS = 90;

const PERIOD_KEYS = ['periodo', 'inicio', 'fim'];
const DAY_MS = 24 * 60 * 60 * 1000;

function isPreset(value: string): value is PeriodPreset {
  return Object.hasOwn(PRESET_LABELS, value);
}

function parseDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const time = Date.parse(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return time;
}

export function validateCustomRange(
  inicio: string,
  fim: string,
): string | null {
  if (!inicio || !fim) {
    return 'Informe a data de início e a data de fim.';
  }

  const start = parseDay(inicio);
  const end = parseDay(fim);
  if (start === null || end === null) {
    return 'Informe datas válidas.';
  }
  if (end < start) {
    return 'A data de fim precisa ser igual ou posterior à data de início.';
  }
  if ((end - start) / DAY_MS + 1 > MAX_CUSTOM_DAYS) {
    return `O período personalizado pode ter no máximo ${MAX_CUSTOM_DAYS} dias.`;
  }

  return null;
}

export function readPeriod(params: URLSearchParams): Period {
  const preset = params.get('periodo');
  const inicio = params.get('inicio');
  const fim = params.get('fim');

  if (preset !== null) {
    return isPreset(preset) && inicio === null && fim === null
      ? { kind: 'preset', preset }
      : DEFAULT_PERIOD;
  }

  if (
    inicio !== null &&
    fim !== null &&
    validateCustomRange(inicio, fim) === null
  ) {
    return { kind: 'custom', inicio, fim };
  }

  return DEFAULT_PERIOD;
}

export function writePeriod(
  params: URLSearchParams,
  period: Period,
): URLSearchParams {
  const next = new URLSearchParams(params);
  PERIOD_KEYS.forEach((key) => next.delete(key));

  if (period.kind === 'custom') {
    next.set('inicio', period.inicio);
    next.set('fim', period.fim);
  } else if (period.preset !== '24h') {
    next.set('periodo', period.preset);
  }

  return next;
}

export function toLinkSearch(period: Period): string {
  const search = writePeriod(new URLSearchParams(), period).toString();
  return search ? `?${search}` : '';
}

const SAO_PAULO_OFFSET = '-03:00';

export function toApiQuery(period: Period): string {
  if (period.kind === 'preset') {
    return period.preset === '24h' ? '' : `?periodo=${period.preset}`;
  }

  const params = new URLSearchParams({
    inicio: `${period.inicio}T00:00:00.000${SAO_PAULO_OFFSET}`,
    fim: `${period.fim}T23:59:59.999${SAO_PAULO_OFFSET}`,
  });
  return `?${params}`;
}

const saoPauloParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function toSaoPaulo(date: Date) {
  const parts = Object.fromEntries(
    saoPauloParts.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function addDays(day: string, amount: number): string {
  const time = Date.parse(`${day}T00:00:00Z`) + amount * DAY_MS;
  return new Date(time).toISOString().slice(0, 10);
}

function formatDay(day: string, withYear: boolean): string {
  const [year, month, date] = day.split('-');
  return withYear ? `${date}/${month}/${year}` : `${date}/${month}`;
}

function formatDayRange(start: string, end: string): string {
  if (start === end) {
    return formatDay(end, true);
  }

  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDay(start, !sameYear)} a ${formatDay(end, true)}`;
}

export function describePeriod(period: Period, now: Date): string {
  if (period.kind === 'custom') {
    return formatDayRange(period.inicio, period.fim);
  }

  const today = toSaoPaulo(now);

  switch (period.preset) {
    case '24h': {
      const start = toSaoPaulo(new Date(now.getTime() - DAY_MS));
      return `${formatDay(start.day, true)}, ${start.time} a ${formatDay(today.day, true)}, ${today.time}`;
    }
    case '7d':
      return formatDayRange(
        toSaoPaulo(new Date(now.getTime() - 7 * DAY_MS)).day,
        today.day,
      );
    case '30d':
      return formatDayRange(
        toSaoPaulo(new Date(now.getTime() - 30 * DAY_MS)).day,
        today.day,
      );
    case 'mes-atual':
      return formatDayRange(`${today.day.slice(0, 8)}01`, today.day);
    case 'mes-anterior': {
      const lastDay = addDays(`${today.day.slice(0, 8)}01`, -1);
      return formatDayRange(`${lastDay.slice(0, 8)}01`, lastDay);
    }
  }
}

export function defaultCustomRange(now: Date): { inicio: string; fim: string } {
  const fim = toSaoPaulo(now).day;
  return { inicio: addDays(fim, -6), fim };
}
