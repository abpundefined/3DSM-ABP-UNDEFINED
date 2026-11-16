import type {
  BackendService,
  LiveService,
} from '../components/dashboard/liveTypes';
import {
  formatEmission,
  formatEnergy,
  formatServiceLocation,
  toFiniteNumber,
} from './formatters.ts';

export type ServiceStatusPresentation = {
  className: 'active' | 'noMetrics' | 'unavailable';
  label: string;
  icon: 'check' | 'info' | 'alert';
};

export type ServiceDrawerSummary = {
  id: number;
  title: string;
  externalId: string;
  regionCode: string;
  status: ServiceStatusPresentation;
  locationLabel: string;
  collectedAtLabel: string;
  historyPath: string;
  cpu: string;
  memory: string;
  disk: string;
  network: string;
  carbonIntensity: string;
  energy: string;
  emissions: string;
  collectionInterval: string;
};

export function formatServiceMetric(
  value: number | string | null | undefined,
  suffix: string,
  digits = 2,
): string {
  const numericValue = toFiniteNumber(value);
  if (numericValue === null) {
    return '—';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numericValue)} ${suffix}`;
}

export function formatServiceStatus(
  estadoAtual: BackendService['estadoAtual'],
): ServiceStatusPresentation {
  switch (estadoAtual) {
    case 'DISPONIVEL':
      return { className: 'active', label: 'Ativo', icon: 'check' };
    case 'SEM_METRICAS':
      return { className: 'noMetrics', label: 'Sem métricas', icon: 'info' };
    case 'REMOVIDO':
      return { className: 'unavailable', label: 'Removido', icon: 'alert' };
    case 'INDISPONIVEL':
      return {
        className: 'unavailable',
        label: 'Indisponível',
        icon: 'alert',
      };
    default:
      return {
        className: 'unavailable',
        label: 'Desconhecido',
        icon: 'info',
      };
  }
}

export function formatCollectionInterval(
  collectionInterval: number | string | null | undefined,
  fallbackInterval: number | string | null | undefined,
): string {
  const resolved =
    toFiniteNumber(collectionInterval) ?? toFiniteNumber(fallbackInterval);
  if (resolved === null || resolved <= 0) {
    return 'Não informado';
  }

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(resolved)} s`;
}

export function buildServiceHistoryPath(serviceId: number): string {
  return `/servicos/${serviceId}`;
}

function formatCollectedTimestamp(isoDate: string | undefined): string {
  if (!isoDate) {
    return 'Sem coleta válida registrada';
  }

  const parsed = new Date(isoDate);
  if (!Number.isFinite(parsed.getTime())) {
    return 'Sem coleta válida registrada';
  }

  return parsed.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function buildServiceDrawerSummary(
  service: LiveService,
  fallbackCollectionIntervalSeconds: number | null,
): ServiceDrawerSummary {
  const metrics = service.latestCollection;
  const location = formatServiceLocation(
    service.localizacao,
    service.regiaoCodigo,
  );
  const locationLabel = location.city
    ? `${location.area} — ${location.city}`
    : location.area;

  const energyKwh =
    toFiniteNumber(metrics?.energiaKwh) ?? toFiniteNumber(service.energiaKwh);
  const emissionsGCo2e =
    toFiniteNumber(metrics?.emissaoGCo2e) ??
    toFiniteNumber(service.emissaoGCo2e);

  return {
    id: service.id,
    title: service.nome,
    externalId: service.idExterno,
    regionCode: service.regiaoCodigo,
    status: formatServiceStatus(service.estadoAtual),
    locationLabel,
    collectedAtLabel: formatCollectedTimestamp(metrics?.iniciadaEm),
    historyPath: buildServiceHistoryPath(service.id),
    cpu: formatServiceMetric(metrics?.cpuPercent, '%', 1),
    memory: formatServiceMetric(metrics?.memoryGb, 'GB'),
    disk: formatServiceMetric(metrics?.diskGb, 'GB'),
    network: formatServiceMetric(metrics?.networkGb, 'GB'),
    carbonIntensity: formatServiceMetric(
      metrics?.intensidadeCarbonoGCo2ePorKwh,
      'gCO₂e/kWh',
      1,
    ),
    energy: formatEnergy(energyKwh),
    emissions: formatEmission(emissionsGCo2e),
    collectionInterval: formatCollectionInterval(
      metrics?.intervaloColetaSegundos,
      fallbackCollectionIntervalSeconds,
    ),
  };
}
