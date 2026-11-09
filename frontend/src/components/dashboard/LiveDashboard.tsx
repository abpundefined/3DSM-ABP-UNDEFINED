import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../../services/api';
import { toFiniteNumber } from '../../utils/formatters';
import FeedbackPanel from '../common/FeedbackPanel';
import Icon from '../common/Icon';
import ServiceCard from './ServiceCard';
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

function formatTotal(value: number | undefined) {
  if (value === undefined) {
    return '—';
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
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
    isFiniteNumber(value.servicos.removidos)
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
    energiaKwh: toFiniteNumber(collection.energiaKwh),
    emissaoGCo2e: toFiniteNumber(collection.emissaoGCo2e),
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return `Não foi possível consultar o backend (HTTP ${error.status}). Confira se o backend está em execução e tente novamente.`;
  }

  if (error instanceof TypeError) {
    return 'Não foi possível alcançar o backend. Confira se ele está em execução e tente novamente.';
  }

  return 'O backend retornou uma resposta inesperada. Tente atualizar os dados.';
}

export default function LiveDashboard() {
  const [services, setServices] = useState<LiveService[]>([]);
  const [indicators, setIndicators] = useState<BackendIndicators>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [indicatorError, setIndicatorError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [collectionIntervalSeconds, setCollectionIntervalSeconds] = useState(30);
  const activeRequest = useRef<object | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (activeRequest.current) {
      return;
    }

    const requestId = {};
    activeRequest.current = requestId;
    setIsLoading(true);
    setIsLoadingServices(true);
    setErrorMessage(null);
    setIndicatorError(null);

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

        // Lê o intervalo configurado; se essa consulta falhar, conserva o padrão de 30 segundos.
        try {
          const configuration = await apiRequest<BackendConfiguration>(
            '/configuracao',
            { signal },
          );
          const configuredInterval = configuration?.intervaloColetaSegundos;

          if (
            typeof configuredInterval === 'number' &&
            Number.isSafeInteger(configuredInterval) &&
            configuredInterval > 0
          ) {
            setCollectionIntervalSeconds(configuredInterval);
          }
        } catch {
          // Uma falha opcional de configuração não impede a exibição dos serviços.
        }

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
      } catch (error) {
        if (!signal?.aborted) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoadingServices(false);
        }
      }
    };

    const loadIndicators = async () => {
      try {
        const response = await apiRequest<unknown>('/indicadores', { signal });
        if (!isBackendIndicators(response)) {
          throw new Error('Formato de indicadores inválido.');
        }
        if (!signal?.aborted) {
          setIndicators(response);
        }
      } catch (error) {
        if (!signal?.aborted) {
          setIndicators(undefined);
          setIndicatorError(getErrorMessage(error));
        }
      }
    };

    try {
      await Promise.all([loadServices(), loadIndicators()]);
    } finally {
      if (activeRequest.current === requestId) {
        activeRequest.current = null;
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    }
  }, []);

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

  return (
    <>
      <div className="live-dashboard-toolbar">
        <div>
          <span className="demo-toolbar-icon">
            <Icon name="info" />
          </span>
          <div>
            <strong>Dados conectados ao backend</strong>
            <p>
              Coleta configurada a cada {collectionIntervalSeconds} segundos ·
              painel atualizado a cada 30 segundos.
            </p>
          </div>
        </div>
        <button
          className="button button--accent"
          type="button"
          onClick={() => void refresh()}
          disabled={isLoading}
        >
          Atualizar agora
          <Icon name="arrow" />
        </button>
      </div>

      <section aria-label="Indicadores gerais" className="metrics-grid">
        <MetricSummary
          label="Consumo energético total"
          value={formatTotal(indicators?.energiaTotalKwh)}
          description="Coletas calculadas nas últimas 24 horas · kWh"
          icon="bolt"
          tone="leaf"
        />
        <MetricSummary
          label="Emissão total de CO₂e"
          value={formatTotal(
            indicators === undefined
              ? undefined
              : indicators.emissaoTotalGCo2e / 1000,
          )}
          description="Coletas calculadas nas últimas 24 horas · kgCO₂e"
          icon="cloud"
          tone="olive"
        />
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

      {indicatorError && (
        <p className="live-refresh-error" role="alert">
          Não foi possível carregar os indicadores. {indicatorError}
        </p>
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
        ) : errorMessage && services.length === 0 ? (
          <FeedbackPanel
            kind="error"
            title="Não foi possível carregar os dados"
            description={errorMessage}
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
            {errorMessage && (
              <p className="live-refresh-error" role="alert">
                {errorMessage} Os dados exibidos são da última atualização
                bem-sucedida.
              </p>
            )}
            <p className="table-scroll-hint">
              Em telas pequenas, deslize a tabela para ver todos os indicadores.
            </p>
                          <ul
                className="service-card-grid"
                aria-label="Cards dos serviços monitorados"
              >
                {services.map((service) => (
                  <li key={service.id}>
                    <ServiceCard service={service} />
                  </li>
                ))}
              </ul>
            <p className="chart-footnote">
              {latestCollectionDate
                ? `Coleta válida mais recente: ${formatRelativeTime(latestCollectionDate, now)} (${latestCollectionDate.toLocaleString('pt-BR')}).`
                : 'Ainda não há coletas válidas.'}
            </p>
          </>
        )}
      </section>
    </>
  );
}

function MetricSummary({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: 'server' | 'bolt' | 'cloud' | 'alert';
  tone: 'forest' | 'leaf' | 'olive';
}) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <div className="metric-heading">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon name={icon} />
        </span>
      </div>
      <p className="metric-value">{value}</p>
      <p className="metric-description">{description}</p>
    </div>
  );
}