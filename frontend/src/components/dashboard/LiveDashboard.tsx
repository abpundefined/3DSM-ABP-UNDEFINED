import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import useMetaCarbono from '../../hooks/useMetaCarbono';
import useSerie from '../../hooks/useSerie';
import { ApiError, apiRequest } from '../../services/api';
import {
  formatEmission,
  formatEnergy,
  toFiniteNumber,
} from '../../utils/formatters';
import EmissionEquivalences from '../common/EmissionEquivalences';
import AnimatedMetricValue from '../common/AnimatedMetricValue';
import ComposicaoEnergia from '../common/ComposicaoEnergia';
import FeedbackPanel from '../common/FeedbackPanel';
import VariacaoPeriodo from '../common/VariacaoPeriodo';
import type { PeriodoConsultado } from '../../types/mapa';
import type { VariacaoPercentual } from '../../types/variacao';
import {
  ehPeriodoConsultado,
  ehVariacaoPercentual,
} from '../../utils/variacao';
import Icon from '../common/Icon';
import MethodologyLink from '../common/MethodologyLink';
import useComparisonSelection from '../../hooks/useComparisonSelection';
import useFlipList from '../../hooks/useFlipList';
import { somarComponentes } from '../../utils/composicaoEnergia';
import { countServices } from '../../utils/serviceCounter';
import ServiceCard from './ServiceCard';
import ServiceCounter from './ServiceCounter';
import ServiceQuickDrawer from './ServiceQuickDrawer';
import PainelMetaCarbono from './PainelMetaCarbono';
import PainelDaTendencia from '../tendencia/PainelDaTendencia';
import type {
  BackendCollection,
  BackendService,
  LiveService,
} from './liveTypes';

type LatestCollectionResponse = {
  dados: BackendCollection;
};

type BackendConfiguration = {
  intervaloColetaSegundos: number;
};

type BackendIndicators = {
  periodo?: PeriodoConsultado;
  variacaoPercentual?: VariacaoPercentual;
  energiaTotalKwh: number;
  emissaoTotalGCo2e: number;
  servicos: {
    disponiveis: number;
    indisponiveis: number;
    semMetricas: number;
    removidos: number;
  };
};

const REFRESH_INTERVAL_MS = 30_000;

// Apresenta o tempo decorrido em português sem depender de biblioteca extra.
function formatRelativeTime(date: Date, now: number) {
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1],
  ];
  const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const [unit, divisor] = units.find(([, size]) => seconds >= size) ?? units[3];

  return formatter.format(-Math.floor(seconds / divisor), unit);
}

function formatCount(value: number | undefined) {
  return value === undefined
    ? '—'
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(
        value,
      );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBackendIndicators(value: unknown): value is BackendIndicators {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('servicos' in value) ||
    typeof value.servicos !== 'object' ||
    value.servicos === null ||
    !('disponiveis' in value.servicos) ||
    !('indisponiveis' in value.servicos) ||
    !('semMetricas' in value.servicos) ||
    !('removidos' in value.servicos)
  ) {
    return false;
  }

  return (
    'energiaTotalKwh' in value &&
    isFiniteNumber(value.energiaTotalKwh) &&
    'emissaoTotalGCo2e' in value &&
    isFiniteNumber(value.emissaoTotalGCo2e) &&
    isFiniteNumber(value.servicos.disponiveis) &&
    isFiniteNumber(value.servicos.indisponiveis) &&
    isFiniteNumber(value.servicos.semMetricas) &&
    isFiniteNumber(value.servicos.removidos) &&
    (!('variacaoPercentual' in value) ||
      (ehVariacaoPercentual(value.variacaoPercentual) &&
        'periodo' in value &&
        ehPeriodoConsultado(value.periodo)))
  );
}

function normalizeCollection(
  collection: BackendCollection | null,
): BackendCollection | null {
  if (!collection) {
    return null;
  }

  return {
    ...collection,
    intervaloColetaSegundos: toFiniteNumber(collection.intervaloColetaSegundos),
    intensidadeCarbonoGCo2ePorKwh: toFiniteNumber(
      collection.intensidadeCarbonoGCo2ePorKwh,
    ),
    energiaKwh: toFiniteNumber(collection.energiaKwh),
    emissaoGCo2e: toFiniteNumber(collection.emissaoGCo2e),
  };
}

type QueryStatus = 'pending' | 'ready' | 'failed';
type ServiceStateFilter = 'all' | 'active' | 'unavailable' | 'noMetrics';
type ServiceSort = 'default' | 'emissions' | 'energy' | 'name';

function serviceMetricValue(
  service: LiveService,
  metric: 'emissions' | 'energy',
) {
  return metric === 'energy'
    ? (toFiniteNumber(service.latestCollection?.energiaKwh) ??
        toFiniteNumber(service.energiaKwh))
    : (toFiniteNumber(service.latestCollection?.emissaoGCo2e) ??
        toFiniteNumber(service.emissaoGCo2e));
}

function matchesServiceState(service: LiveService, filter: ServiceStateFilter) {
  switch (filter) {
    case 'active':
      return service.estadoAtual === 'DISPONIVEL';
    case 'unavailable':
      return service.estadoAtual === 'INDISPONIVEL';
    case 'noMetrics':
      return service.estadoAtual === 'SEM_METRICAS';
    default:
      return true;
  }
}

function parseServiceStateFilter(value: string): ServiceStateFilter {
  switch (value) {
    case 'active':
    case 'unavailable':
    case 'noMetrics':
      return value;
    default:
      return 'all';
  }
}

function parseServiceSort(value: string): ServiceSort {
  switch (value) {
    case 'emissions':
    case 'energy':
    case 'name':
      return value;
    default:
      return 'default';
  }
}

export default function LiveDashboard({
  periodQuery,
}: {
  periodQuery: string;
}) {
  const [services, setServices] = useState<LiveService[]>([]);
  const [indicators, setIndicators] = useState<BackendIndicators>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [servicesStatus, setServicesStatus] = useState<QueryStatus>('pending');
  const [indicatorsStatus, setIndicatorsStatus] =
    useState<QueryStatus>('pending');
  const [configurationStatus, setConfigurationStatus] =
    useState<QueryStatus>('pending');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [collectionIntervalSeconds, setCollectionIntervalSeconds] = useState<
    number | null
  >(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null,
  );
  const [drawerReturnFocusEl, setDrawerReturnFocusEl] =
    useState<HTMLElement | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceStateFilter, setServiceStateFilter] =
    useState<ServiceStateFilter>('all');
  const [serviceSort, setServiceSort] = useState<ServiceSort>('default');
  const activeRequest = useRef<object | null>(null);
  const { estado: serie, recarregar: recarregarSerie } = useSerie(
    periodQuery,
    true,
  );
  const { estado: meta, recarregar: recarregarMeta } = useMetaCarbono(true);
  const tendencias = useMemo(
    () =>
      serie.status === 'pronto'
        ? new Map(
            serie.dados.servicos.map(({ servicoId, serie: pontos }) => [
              servicoId,
              pontos.map((ponto) => ponto.emissaoGCo2e),
            ]),
          )
        : null,
    [serie],
  );

  const { serviceIds, toggleService } = useComparisonSelection();

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (activeRequest.current) {
        return;
      }

      const requestId = {};
      activeRequest.current = requestId;
      setIsLoading(true);
      setIsLoadingServices(true);

      const loadServices = async () => {
        try {
          const response = await apiRequest<BackendService[]>('/servicos', {
            signal,
          });
          if (!Array.isArray(response)) {
            throw new Error('Formato de serviços inválido.');
          }

          const latestCollections = await Promise.all(
            response.map(async (service) => {
              try {
                const result = await apiRequest<LatestCollectionResponse>(
                  `/coletas/servico/${service.id}/ultima-valida`,
                  { signal },
                );
                return [service.id, result?.dados ?? null] as const;
              } catch (error) {
                if (error instanceof ApiError && error.status === 404) {
                  return [service.id, null] as const;
                }
                throw error;
              }
            }),
          );

          if (signal?.aborted) {
            return;
          }

          const collectionByService = new Map(latestCollections);
          setServices(
            response.map((service) => ({
              ...service,
              energiaKwh: toFiniteNumber(service.energiaKwh),
              emissaoGCo2e: toFiniteNumber(service.emissaoGCo2e),
              latestCollection: normalizeCollection(
                collectionByService.get(service.id) ?? null,
              ),
            })),
          );
          setLastUpdated(new Date());
          setServicesStatus('ready');
        } catch {
          if (!signal?.aborted) {
            setServicesStatus('failed');
          }
        } finally {
          if (!signal?.aborted) {
            setIsLoadingServices(false);
          }
        }
      };

      const loadConfiguration = async () => {
        try {
          const configuration = await apiRequest<BackendConfiguration>(
            '/configuracao',
            { signal },
          );
          const configuredInterval = configuration?.intervaloColetaSegundos;

          if (signal?.aborted) {
            return;
          }
          if (
            typeof configuredInterval !== 'number' ||
            !Number.isSafeInteger(configuredInterval) ||
            configuredInterval <= 0
          ) {
            throw new Error('Intervalo de coleta inválido.');
          }
          setCollectionIntervalSeconds(configuredInterval);
          setConfigurationStatus('ready');
        } catch {
          if (!signal?.aborted) {
            setCollectionIntervalSeconds(null);
            setConfigurationStatus('failed');
          }
        }
      };

      const loadIndicators = async () => {
        try {
          const response = await apiRequest<unknown>(
            `/indicadores${periodQuery}`,
            { signal },
          );
          if (!isBackendIndicators(response)) {
            throw new Error('Formato de indicadores inválido.');
          }
          if (!signal?.aborted) {
            setIndicators(response);
            setIndicatorsStatus('ready');
          }
        } catch {
          if (!signal?.aborted) {
            setIndicatorsStatus('failed');
          }
        }
      };

      try {
        await Promise.all([
          loadServices(),
          loadIndicators(),
          loadConfiguration(),
        ]);
      } finally {
        if (activeRequest.current === requestId) {
          activeRequest.current = null;
          if (!signal?.aborted) {
            setIsLoading(false);
          }
        }
      }
    },
    [periodQuery],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initialRefresh = window.setTimeout(() => {
      void refresh(controller.signal);
    }, 0);
    const interval = window.setInterval(() => {
      void refresh(controller.signal);
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      activeRequest.current = null;
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    // Atualiza o relógio local para que os rótulos relativos continuem avançando.
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const latestCollectionDate = services
    .map((service) => service.latestCollection?.iniciadaEm)
    .filter((date): date is string => Boolean(date))
    .map((date) => new Date(date))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  const selectedService =
    selectedServiceId === null
      ? null
      : (services.find((service) => service.id === selectedServiceId) ?? null);
  const normalizedSearch = serviceSearch.trim().toLocaleLowerCase('pt-BR');
  const filteredServices = services.filter(
    (service) =>
      service.nome.toLocaleLowerCase('pt-BR').includes(normalizedSearch) &&
      matchesServiceState(service, serviceStateFilter),
  );
  const visibleServices =
    serviceSort === 'default'
      ? filteredServices
      : [...filteredServices].sort((left, right) => {
          if (serviceSort === 'name') {
            return left.nome.localeCompare(right.nome, 'pt-BR');
          }

          const leftValue = serviceMetricValue(left, serviceSort);
          const rightValue = serviceMetricValue(right, serviceSort);
          if (leftValue === null || rightValue === null) {
            if (leftValue === rightValue) {
              return left.nome.localeCompare(right.nome, 'pt-BR');
            }
            return leftValue === null ? 1 : -1;
          }
          return rightValue - leftValue;
        });

  const handleSelectService = useCallback(
    (service: LiveService, triggerElement: HTMLElement | null) => {
      setDrawerReturnFocusEl(triggerElement);
      setSelectedServiceId(service.id);
    },
    [],
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedServiceId(null);
  }, []);

  const failedQueries = [
    servicesStatus === 'failed' ? 'os serviços' : null,
    indicatorsStatus === 'failed' ? 'os indicadores' : null,
    configurationStatus === 'failed' ? 'o intervalo de coleta' : null,
  ].filter((label): label is string => label !== null);
  const hasError = failedQueries.length > 0;
  const isUnavailable = failedQueries.length === 3;
  const hasPreviousData = lastUpdated !== null || indicators !== undefined;
  const isConnecting =
    !hasError &&
    [servicesStatus, indicatorsStatus, configurationStatus].includes('pending');
  const connectionTitle = isUnavailable
    ? hasPreviousData
      ? 'Backend indisponível — exibindo os últimos dados válidos'
      : 'Backend indisponível — ainda não há dados válidos'
    : hasError
      ? 'Falha parcial nas consultas ao backend'
      : isConnecting
        ? 'Conectando ao backend'
        : 'Dados conectados ao backend';
  const failedLabels = failedQueries.join(', ').replace(/, ([^,]*)$/, ' e $1');
  const errorDescription = isUnavailable
    ? 'Tente atualizar novamente em instantes.'
    : `Não foi possível atualizar ${failedLabels}; tente novamente em instantes.`;
  const indicatorsDescription =
    indicatorsStatus === 'failed' && indicators !== undefined
      ? 'Últimos dados válidos · coletas calculadas no período analisado'
      : 'Coletas calculadas no período analisado';

  const serviceCount = countServices(services);
  const serviceCardsListRef = useFlipList<HTMLUListElement>(
    visibleServices.map((service) => service.id).join(','),
  );

  return (
    <>
      {services.length > 0 && <ServiceCounter {...serviceCount} />}
      <div className="live-dashboard-toolbar">
        <div
          className={
            hasError ? 'live-connection-error live-refresh-error' : undefined
          }
          role={hasError ? 'alert' : 'status'}
          aria-atomic="true"
        >
          <span className="demo-toolbar-icon">
            <Icon name={hasError ? 'alert' : 'info'} />
          </span>
          <div>
            <strong>{connectionTitle}</strong>
            {hasError && <p>{errorDescription}</p>}
            <p>
              {collectionIntervalSeconds === null
                ? 'Painel atualizado a cada 30 segundos.'
                : `Coleta configurada a cada ${collectionIntervalSeconds} segundos · painel atualizado a cada 30 segundos.`}
            </p>
          </div>
        </div>
        <button
          className="button button--accent"
          type="button"
          onClick={() => {
            void refresh();
            recarregarSerie();
            recarregarMeta();
          }}
          disabled={isLoading}
        >
          Atualizar agora
          <Icon name="arrow" />
        </button>
      </div>

      <section aria-label="Indicadores gerais" className="metrics-grid">
        <MetricSummary
          label="Consumo energético total"
          value={formatEnergy(toFiniteNumber(indicators?.energiaTotalKwh))}
          withUnit
          description={indicatorsDescription}
          icon="bolt"
          tone="leaf"
        >
          {indicators?.variacaoPercentual && indicators.periodo && (
            <VariacaoPeriodo
              valor={indicators.variacaoPercentual.energiaKwh}
              periodo={indicators.periodo}
            />
          )}
          <MethodologyLink />
        </MetricSummary>
        <MetricSummary
          label="Emissão total de CO₂e"
          value={formatEmission(toFiniteNumber(indicators?.emissaoTotalGCo2e))}
          withUnit
          description={indicatorsDescription}
          icon="cloud"
          tone="olive"
        >
          {indicators?.variacaoPercentual && indicators.periodo && (
            <VariacaoPeriodo
              valor={indicators.variacaoPercentual.emissaoGCo2e}
              periodo={indicators.periodo}
            />
          )}
          <EmissionEquivalences
            emissaoGCo2e={toFiniteNumber(indicators?.emissaoTotalGCo2e)}
          />
          <MethodologyLink />
        </MetricSummary>
        <MetricSummary
          label="Serviços ativos"
          value={formatCount(indicators?.servicos.disponiveis)}
          description={
            indicators
              ? `${formatCount(indicators.servicos.semMetricas)} sem métricas · ${formatCount(indicators.servicos.removidos)} removidos`
              : 'Serviços com status disponível'
          }
          icon="server"
          tone="forest"
        />
        <MetricSummary
          label="Serviços indisponíveis"
          value={formatCount(indicators?.servicos.indisponiveis)}
          description="Serviços com falha de acesso/coleta"
          icon="alert"
          tone="olive"
        />
      </section>

      <PainelMetaCarbono estado={meta} onRecarregar={recarregarMeta} />

      <PainelDaTendencia estado={serie} onRecarregar={recarregarSerie} />

      {services.length > 0 && (
        <ComposicaoEnergia
          componentes={somarComponentes(
            services.map((service) => service.componentes),
          )}
          subtitulo="Soma da potência estimada por recurso entre todos os serviços monitorados com coleta válida."
        />
      )}

      <section
        className="live-services-panel"
        aria-labelledby="live-services-heading"
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">INFRAESTRUTURA</p>
            <h2 id="live-services-heading">Serviços monitorados</h2>
          </div>
          <span className="quiet-label">
            {lastUpdated
              ? `Última atualização: ${formatRelativeTime(lastUpdated, now)} · ${lastUpdated.toLocaleString('pt-BR')}`
              : 'Aguardando dados'}
          </span>
        </div>

        {isLoadingServices && services.length === 0 ? (
          <FeedbackPanel
            kind="loading"
            title="Conectando ao backend"
            description="Carregando serviços e suas métricas mais recentes."
          />
        ) : servicesStatus === 'failed' && services.length === 0 ? (
          <FeedbackPanel
            kind="empty"
            title="Não foi possível carregar os dados"
            description="Os serviços aparecerão aqui após uma consulta bem-sucedida."
          >
            <button
              className="button button--primary"
              type="button"
              onClick={() => void refresh()}
            >
              Tentar novamente
            </button>
          </FeedbackPanel>
        ) : services.length === 0 ? (
          <FeedbackPanel
            kind="empty"
            title="Nenhum serviço encontrado"
            description="O backend ainda não descobriu serviços para monitorar."
          />
        ) : (
          <>
            {servicesStatus === 'failed' && (
              <p className="chart-footnote">
                Serviços da última atualização bem-sucedida.
              </p>
            )}
            <div className="live-service-controls">
              <label>
                Buscar por nome
                <input
                  aria-label="Buscar por nome"
                  type="search"
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                  placeholder="Ex.: API de pagamentos"
                />
              </label>
              <label>
                Estado
                <select
                  aria-label="Estado"
                  value={serviceStateFilter}
                  onChange={(event) =>
                    setServiceStateFilter(
                      parseServiceStateFilter(event.target.value),
                    )
                  }
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="unavailable">Indisponíveis</option>
                  <option value="noMetrics">Sem métricas</option>
                </select>
              </label>
              <label>
                Ordenar por
                <select
                  aria-label="Ordenar por"
                  value={serviceSort}
                  onChange={(event) =>
                    setServiceSort(parseServiceSort(event.target.value))
                  }
                >
                  <option value="default">Ordem original</option>
                  <option value="emissions">Emissão (maior primeiro)</option>
                  <option value="energy">Consumo (maior primeiro)</option>
                  <option value="name">Nome (A-Z)</option>
                </select>
              </label>
            </div>
            {(normalizedSearch || serviceStateFilter !== 'all') && (
              <div
                className="live-service-active-filters"
                aria-label="Filtros ativos"
              >
                {normalizedSearch && (
                  <button
                    type="button"
                    className="live-service-filter-chip"
                    aria-label={`Remover filtro de nome ${serviceSearch.trim()}`}
                    onClick={() => setServiceSearch('')}
                  >
                    Nome: {serviceSearch.trim()}{' '}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
                {serviceStateFilter !== 'all' && (
                  <button
                    type="button"
                    className="live-service-filter-chip"
                    aria-label="Remover filtro de estado"
                    onClick={() => setServiceStateFilter('all')}
                  >
                    Estado:{' '}
                    {serviceStateFilter === 'active'
                      ? 'Ativos'
                      : serviceStateFilter === 'unavailable'
                        ? 'Indisponíveis'
                        : 'Sem métricas'}{' '}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
              </div>
            )}
            <p className="live-service-count" role="status" aria-live="polite">
              {visibleServices.length} de {services.length} serviços
            </p>
            {visibleServices.length === 0 ? (
              <FeedbackPanel
                kind="empty"
                title="Nenhum serviço encontrado"
                description="Tente outro nome ou altere o filtro de estado."
              >
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => {
                    setServiceSearch('');
                    setServiceStateFilter('all');
                  }}
                >
                  Limpar filtros
                </button>
              </FeedbackPanel>
            ) : (
              <ul
                ref={serviceCardsListRef}
                className="service-card-grid"
                aria-label="Cards dos serviços monitorados"
              >
                {visibleServices.map((service) => (
                  <li key={service.id} data-flip-id={service.id}>
                    <ServiceCard
                      service={service}
                      onSelect={handleSelectService}
                      tendencia={tendencias?.get(service.id)}
                      comparisonSelected={serviceIds.includes(service.id)}
                      onToggleComparison={toggleService}
                    />
                  </li>
                ))}
              </ul>
            )}
            <p className="chart-footnote">
              {latestCollectionDate
                ? `Coleta válida mais recente: ${formatRelativeTime(latestCollectionDate, now)} (${latestCollectionDate.toLocaleString('pt-BR')}).`
                : 'Ainda não há coletas válidas.'}
            </p>
          </>
        )}
      </section>
      <ServiceQuickDrawer
        service={selectedService}
        collectionIntervalSeconds={collectionIntervalSeconds}
        returnFocusTo={drawerReturnFocusEl}
        onClose={handleCloseDrawer}
      />
    </>
  );
}

function MetricSummary({
  label,
  value,
  withUnit = false,
  description,
  icon,
  tone,
  children,
}: {
  label: string;
  value: string;
  withUnit?: boolean;
  description: string;
  icon: 'server' | 'bolt' | 'cloud' | 'alert';
  tone: 'forest' | 'leaf' | 'olive';
  children?: ReactNode;
}) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <div className="metric-heading">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon name={icon} />
        </span>
      </div>
      <p className="metric-value">
        <AnimatedMetricValue value={value} withUnit={withUnit} />
      </p>
      <p className="metric-description">{description}</p>
      {children}
    </div>
  );
}
