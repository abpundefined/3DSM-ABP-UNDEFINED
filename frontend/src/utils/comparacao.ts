import type { Period } from './period';

export const MAX_SERVICES_TO_COMPARE = 5;

export type ParsedComparisonSelection = {
  serviceIds: number[];
  invalid: boolean;
};

export function parseComparisonSelection(
  value: string | null,
): ParsedComparisonSelection {
  if (value === null || value === '') {
    return { serviceIds: [], invalid: false };
  }

  const parts = value.split(',');
  const parsedIds = parts.map((part) =>
    /^\d+$/.test(part) ? Number(part) : Number.NaN,
  );
  const serviceIds = parsedIds.filter(
    (id) => Number.isSafeInteger(id) && id > 0,
  );

  return {
    serviceIds: [...new Set(serviceIds)],
    invalid:
      serviceIds.length !== parts.length ||
      new Set(serviceIds).size !== serviceIds.length,
  };
}

export function formatComparisonPeriod(period: Period) {
  if (period.kind === 'custom') {
    return `${period.inicio} a ${period.fim}`;
  }

  const labels: Record<typeof period.preset, string> = {
    '24h': 'Últimas 24 horas',
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    'mes-atual': 'Este mês',
    'mes-anterior': 'Mês passado',
  };
  return labels[period.preset];
}

export function buildComparisonLinkSearch(
  serviceIds: number[],
  linkSearch: string,
) {
  const search = linkSearch.startsWith('?') ? linkSearch.slice(1) : linkSearch;
  const params = new URLSearchParams(search);
  params.set('servicos', serviceIds.join(','));
  return `?${params.toString()}`;
}

export function buildComparisonApiQuery(
  serviceIds: number[],
  apiQuery: string,
) {
  const search = apiQuery.startsWith('?') ? apiQuery.slice(1) : apiQuery;
  const params = new URLSearchParams(search);
  params.set('servicos', serviceIds.join(','));
  return `?${params.toString()}`;
}

export function compareCarbonIntensity(
  energyKwh: number | null,
  emissionsGCo2e: number | null,
) {
  if (energyKwh === null || emissionsGCo2e === null || energyKwh <= 0) {
    return null;
  }

  return emissionsGCo2e / energyKwh;
}
