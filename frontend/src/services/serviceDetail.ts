import { ApiError, apiRequest } from './api';
import type {
  BackendCollection,
  BackendService,
} from '../components/dashboard/liveTypes';
import {
  isComponentesEnergia,
  type ComponentesEnergia,
} from '../utils/composicaoEnergia';
import { isSelo } from '../utils/selo';

export type ServiceHistoryPoint = {
  inicio: string;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  selo: string;
  componentes?: ComponentesEnergia | null;
  coletas?: number | null;
  ativo?: number;
  indisponivel?: number;
  semMetricas?: number;
};

export type ServiceDetailData = {
  service: BackendService;
  latestCollection: BackendCollection | null;
  history: ServiceHistoryPoint[];
};

const serviceStatuses: BackendService['estadoAtual'][] = [
  'DISPONIVEL',
  'INDISPONIVEL',
  'SEM_METRICAS',
  'REMOVIDO',
  'DESCONHECIDO',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableNumber(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' &&
      value.trim() !== '' &&
      Number.isFinite(Number(value)))
  );
}

function isFiniteNullableNumber(value: unknown): boolean {
  return (
    value === null || (typeof value === 'number' && Number.isFinite(value))
  );
}

function isServiceStatus(
  value: unknown,
): value is BackendService['estadoAtual'] {
  return serviceStatuses.some((status) => status === value);
}

function isServiceLocation(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (!isRecord(value)) {
    return false;
  }

  return ['pais', 'regiao', 'cidade'].every(
    (key) =>
      !(key in value) || value[key] === null || typeof value[key] === 'string',
  );
}

function isBackendService(value: unknown): value is BackendService {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.idExterno === 'string' &&
    typeof value.nome === 'string' &&
    typeof value.regiaoCodigo === 'string' &&
    isSelo(value.selo) &&
    isServiceStatus(value.estadoAtual) &&
    isServiceLocation(value.localizacao)
  );
}

function isBackendCollection(value: unknown): value is BackendCollection {
  if (
    !isRecord(value) ||
    typeof value.iniciadaEm !== 'string' ||
    !Number.isFinite(Date.parse(value.iniciadaEm))
  ) {
    return false;
  }

  return (
    ['cpuPercent', 'memoryGb', 'diskGb', 'networkGb'].every(
      (key) => key in value && isFiniteNullableNumber(value[key]),
    ) &&
    ['energiaKwh', 'emissaoGCo2e'].every(
      (key) => key in value && isNullableNumber(value[key]),
    ) &&
    (value.intervaloColetaSegundos === undefined ||
      isFiniteNullableNumber(value.intervaloColetaSegundos)) &&
    (value.intensidadeCarbonoGCo2ePorKwh === undefined ||
      isNullableNumber(value.intensidadeCarbonoGCo2ePorKwh))
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseHistory(value: unknown): ServiceHistoryPoint[] {
  if (!Array.isArray(value)) {
    throw new Error('A resposta do histórico do serviço é inválida.');
  }

  return value.map((point) => {
    if (
      !isRecord(point) ||
      typeof point.inicio !== 'string' ||
      !Number.isFinite(Date.parse(point.inicio)) ||
      !('energiaKwh' in point) ||
      !isNullableNumber(point.energiaKwh) ||
      !('emissaoGCo2e' in point) ||
      !isNullableNumber(point.emissaoGCo2e) ||
      !isSelo(point.selo)
    ) {
      throw new Error('A resposta do histórico do serviço é inválida.');
    }

    if (
      ('coletas' in point &&
        point.coletas !== null &&
        !isNonNegativeInteger(point.coletas)) ||
      ('ativo' in point && !isNonNegativeInteger(point.ativo)) ||
      ('indisponivel' in point && !isNonNegativeInteger(point.indisponivel)) ||
      ('semMetricas' in point && !isNonNegativeInteger(point.semMetricas))
    ) {
      throw new Error('A resposta do histórico do serviço é inválida.');
    }

    return {
      inicio: point.inicio,
      energiaKwh: point.energiaKwh === null ? null : Number(point.energiaKwh),
      emissaoGCo2e:
        point.emissaoGCo2e === null ? null : Number(point.emissaoGCo2e),
      selo: point.selo,
      ...('componentes' in point
        ? {
            componentes: isComponentesEnergia(point.componentes)
              ? point.componentes
              : null,
          }
        : {}),
      ...('coletas' in point
        ? { coletas: point.coletas === null ? null : Number(point.coletas) }
        : {}),
      ...('ativo' in point ? { ativo: Number(point.ativo) } : {}),
      ...('indisponivel' in point
        ? { indisponivel: Number(point.indisponivel) }
        : {}),
      ...('semMetricas' in point
        ? { semMetricas: Number(point.semMetricas) }
        : {}),
    };
  });
}

async function fetchLatestCollection(
  serviceId: number,
  signal: AbortSignal,
): Promise<BackendCollection | null> {
  try {
    const response = await apiRequest<unknown>(
      `/coletas/servico/${serviceId}/ultima-valida`,
      { signal },
    );

    if (!isRecord(response) || !('dados' in response)) {
      throw new Error('A resposta da última coleta válida é inválida.');
    }
    if (response.dados === null) {
      return null;
    }
    if (!isBackendCollection(response.dados)) {
      throw new Error('A resposta da última coleta válida é inválida.');
    }

    return response.dados;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchServiceDetail(
  serviceId: number,
  periodQuery: string,
  signal: AbortSignal,
): Promise<ServiceDetailData | null> {
  const services = await apiRequest<unknown>('/servicos', { signal });
  if (!Array.isArray(services) || !services.every(isBackendService)) {
    throw new Error('A resposta da lista de serviços é inválida.');
  }

  const service = services.find((item) => item.id === serviceId);
  if (!service) {
    return null;
  }

  const [rawHistory, latestCollection] = await Promise.all([
    apiRequest<unknown>(`/servicos/${serviceId}/historico${periodQuery}`, {
      signal,
    }),
    fetchLatestCollection(serviceId, signal),
  ]);

  return {
    service,
    latestCollection,
    history: parseHistory(rawHistory),
  };
}
