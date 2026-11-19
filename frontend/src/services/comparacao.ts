import type { BackendService } from '../components/dashboard/liveTypes';
import type {
  RespostaComparacao,
  ServicoSelecionavel,
} from '../types/comparacao';
import { buildComparisonApiQuery } from '../utils/comparacao';
import { apiRequest } from './api';

function isEstadoAtual(value: unknown): value is BackendService['estadoAtual'] {
  return (
    value === 'DISPONIVEL' ||
    value === 'INDISPONIVEL' ||
    value === 'SEM_METRICAS' ||
    value === 'REMOVIDO' ||
    value === 'DESCONHECIDO'
  );
}

function isLocalizacao(value: unknown) {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value !== 'object') {
    return false;
  }

  const location = value as Record<string, unknown>;
  return ['pais', 'regiao', 'cidade'].every(
    (key) =>
      !(key in location) ||
      typeof location[key] === 'string' ||
      location[key] === null,
  );
}

function isServicoSelecionavel(value: unknown): value is ServicoSelecionavel {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    'nome' in value &&
    typeof value.nome === 'string' &&
    'regiaoCodigo' in value &&
    typeof value.regiaoCodigo === 'string' &&
    'estadoAtual' in value &&
    isEstadoAtual(value.estadoAtual) &&
    (!('localizacao' in value) || isLocalizacao(value.localizacao))
  );
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return (
    value === null || (typeof value === 'number' && Number.isFinite(value))
  );
}

function isRespostaComparacao(value: unknown): value is RespostaComparacao {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('periodo' in value) ||
    typeof value.periodo !== 'object' ||
    value.periodo === null ||
    !('inicio' in value.periodo) ||
    typeof value.periodo.inicio !== 'string' ||
    !('fim' in value.periodo) ||
    typeof value.periodo.fim !== 'string' ||
    !('granularidade' in value) ||
    (value.granularidade !== 'hora' && value.granularidade !== 'dia') ||
    !('servicos' in value) ||
    !Array.isArray(value.servicos)
  ) {
    return false;
  }

  return value.servicos.every(
    (service) =>
      typeof service === 'object' &&
      service !== null &&
      'servicoId' in service &&
      typeof service.servicoId === 'number' &&
      Number.isSafeInteger(service.servicoId) &&
      service.servicoId > 0 &&
      'nome' in service &&
      typeof service.nome === 'string' &&
      'totais' in service &&
      typeof service.totais === 'object' &&
      service.totais !== null &&
      'energiaKwh' in service.totais &&
      isNullableFiniteNumber(service.totais.energiaKwh) &&
      'emissaoGCo2e' in service.totais &&
      isNullableFiniteNumber(service.totais.emissaoGCo2e) &&
      'cpuMedia' in service.totais &&
      isNullableFiniteNumber(service.totais.cpuMedia) &&
      'memoriaMediaMb' in service.totais &&
      isNullableFiniteNumber(service.totais.memoriaMediaMb) &&
      'coletasValidas' in service.totais &&
      typeof service.totais.coletasValidas === 'number' &&
      Number.isSafeInteger(service.totais.coletasValidas) &&
      service.totais.coletasValidas >= 0 &&
      Array.isArray(service.serie) &&
      service.serie.every(
        (point: unknown) =>
          typeof point === 'object' &&
          point !== null &&
          'inicio' in point &&
          typeof point.inicio === 'string' &&
          'energiaKwh' in point &&
          isNullableFiniteNumber(point.energiaKwh) &&
          'emissaoGCo2e' in point &&
          isNullableFiniteNumber(point.emissaoGCo2e),
      ),
  );
}

export async function buscarServicosComparaveis(
  signal?: AbortSignal,
): Promise<ServicoSelecionavel[]> {
  const response = await apiRequest<unknown>('/servicos', { signal });
  if (!Array.isArray(response) || !response.every(isServicoSelecionavel)) {
    throw new Error('O servidor devolveu uma lista de serviços inválida.');
  }

  return response;
}

export async function buscarComparacao(
  serviceIds: number[],
  apiQuery: string,
  signal?: AbortSignal,
): Promise<RespostaComparacao> {
  const query = buildComparisonApiQuery(serviceIds, apiQuery);
  const response = await apiRequest<unknown>(`/comparacao${query}`, { signal });
  if (!isRespostaComparacao(response)) {
    throw new Error('O servidor devolveu a comparação em formato inválido.');
  }
  const firstSeries = response.servicos[0]?.serie ?? [];
  if (
    response.servicos.some(
      (service) =>
        service.serie.length !== firstSeries.length ||
        service.serie.some(
          (point, index) => point.inicio !== firstSeries[index]?.inicio,
        ),
    )
  ) {
    throw new Error(
      'O servidor devolveu séries que não usam os mesmos intervalos.',
    );
  }

  return response;
}
