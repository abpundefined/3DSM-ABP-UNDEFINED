import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../../services/api';
import FeedbackPanel from '../common/FeedbackPanel';
import Icon from '../common/Icon';

type BackendService = {
  id: number;
  idExterno: string;
  nome: string;
  regiaoCodigo: string;
  estadoAtual: 'DISPONIVEL' | 'INDISPONIVEL' | 'SEM_METRICAS' | 'REMOVIDO' | 'DESCONHECIDO';
};

type BackendCollection = {
  iniciadaEm: string;
  cpuPercent: number | null;
  memoryGb: number | null;
  diskGb: number | null;
  networkGb: number | null;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
};

type LatestCollectionResponse = {
  dados: BackendCollection;
};

type LiveService = BackendService & {
  latestCollection: BackendCollection | null;
};

const REFRESH_INTERVAL_MS = 30_000;

function formatMetric(value: number | null | undefined, suffix: string, digits = 2) {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: digits,
  }).format(value)} ${suffix}`;
}

function statusFor(service: BackendService) {
  switch (service.estadoAtual) {
    case 'DISPONIVEL':
      return { className: 'active', label: 'Ativo', icon: 'check' as const };
    case 'SEM_METRICAS':
      return { className: 'noMetrics', label: 'Sem métricas', icon: 'info' as const };
    case 'REMOVIDO':
      return { className: 'unavailable', label: 'Removido', icon: 'alert' as const };
    case 'INDISPONIVEL':
      return { className: 'unavailable', label: 'Indisponível', icon: 'alert' as const };
    default:
      return { className: 'unavailable', label: 'Desconhecido', icon: 'info' as const };
  }
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const activeRequest = useRef<object | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (activeRequest.current) {
      return;
    }

    const requestId = {};
    activeRequest.current = requestId;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiRequest<BackendService[]>('/servicos', { signal });
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

      const collectionByService = new Map(latestCollections);
      setServices(
        response.map((service) => ({
          ...service,
          latestCollection: collectionByService.get(service.id) ?? null,
        })),
      );
      setLastUpdated(new Date());
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      setErrorMessage(getErrorMessage(error));
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

  const available = services.filter((service) => service.estadoAtual === 'DISPONIVEL').length;
  const unavailable = services.filter((service) => service.estadoAtual === 'INDISPONIVEL').length;
  const noMetrics = services.filter((service) => service.estadoAtual === 'SEM_METRICAS').length;
  const removed = services.filter((service) => service.estadoAtual === 'REMOVIDO').length;
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
          <span className="demo-toolbar-icon"><Icon name="info" /></span>
          <div>
            <strong>Dados conectados ao backend</strong>
            <p>Atualização automática a cada 30 segundos.</p>
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
          label="Serviços monitorados"
          value={services.length}
          description={`${available} ativos · ${unavailable} indisponíveis · ${noMetrics} sem métricas · ${removed} removidos`}
          icon="server"
          tone="forest"
        />
        <MetricSummary
          label="Energia estimada"
          value="—"
          description="kWh · O backend ainda não calcula consumo energético."
          icon="bolt"
          tone="leaf"
        />
        <MetricSummary
          label="Emissões estimadas"
          value="—"
          description="kgCO₂e · O backend ainda não calcula emissões de carbono."
          icon="cloud"
          tone="olive"
        />
      </section>

      <section className="live-services-panel" aria-labelledby="live-services-heading">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">INFRAESTRUTURA</p>
            <h2 id="live-services-heading">Serviços monitorados</h2>
          </div>
          <span className="quiet-label">
            {lastUpdated
              ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR')}`
              : 'Aguardando dados'}
          </span>
        </div>

        {isLoading && services.length === 0 ? (
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
            <button className="button button--primary" type="button" onClick={() => void refresh()}>
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
                {errorMessage} Os dados exibidos são da última atualização bem-sucedida.
              </p>
            )}
            <p className="table-scroll-hint">Em telas pequenas, deslize a tabela para ver todos os indicadores.</p>
            <div className="service-table-scroll" role="region" aria-label="Tabela de serviços reais e métricas" tabIndex={0}>
              <table className="service-table live-service-table">
                <caption className="sr-only">Serviços e sua coleta válida mais recente.</caption>
                <thead>
                  <tr>
                    <th scope="col">Serviço</th>
                    <th scope="col">Status</th>
                    <th scope="col">CPU</th>
                    <th scope="col">Memória</th>
                    <th scope="col">Disco</th>
                    <th scope="col">Rede</th>
                    <th scope="col">Energia</th>
                    <th scope="col">Emissões</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => {
                    const status = statusFor(service);
                    const metrics = service.latestCollection;
                    return (
                      <tr key={service.id}>
                        <th scope="row">
                          <span className="service-name">{service.nome}</span>
                          <span className="service-region">
                            {service.regiaoCodigo === 'desconhecida'
                              ? 'Localização não informada'
                              : service.regiaoCodigo}
                          </span>
                        </th>
                        <td>
                          <span className={`service-badge service-badge--${status.className}`}>
                            <Icon name={status.icon} />
                            {status.label}
                          </span>
                        </td>
                        <td>{formatMetric(metrics?.cpuPercent, '%', 1)}</td>
                        <td>{formatMetric(metrics?.memoryGb, 'GB')}</td>
                        <td>{formatMetric(metrics?.diskGb, 'GB')}</td>
                        <td>{formatMetric(metrics?.networkGb, 'GB')}</td>
                        <td>{formatMetric(metrics?.energiaKwh, 'kWh')}</td>
                        <td>{formatMetric(metrics?.emissaoGCo2e == null ? null : metrics.emissaoGCo2e / 1000, 'kgCO₂e')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="chart-footnote">
              {latestCollectionDate
                ? `Coleta válida mais recente: ${latestCollectionDate.toLocaleString('pt-BR')}.`
                : 'Ainda não há coletas válidas.'}
              {' '}Energia e emissões aparecem como indisponíveis até serem calculadas pelo backend.
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
  icon: 'server' | 'bolt' | 'cloud';
  tone: 'forest' | 'leaf' | 'olive';
}) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <div className="metric-heading">
        <span>{label}</span>
        <span className="metric-icon"><Icon name={icon} /></span>
      </div>
      <p className="metric-value">{value}</p>
      <p className="metric-description">{description}</p>
    </div>
  );
}
