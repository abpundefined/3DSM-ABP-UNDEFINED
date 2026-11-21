import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import EmissionEquivalences from '../components/common/EmissionEquivalences';
import ComposicaoEnergia from '../components/common/ComposicaoEnergia';
import FeedbackPanel from '../components/common/FeedbackPanel';
import Icon from '../components/common/Icon';
import MethodologyLink from '../components/common/MethodologyLink';
import PeriodSelector from '../components/common/PeriodSelector';
import SeloBadge from '../components/common/SeloBadge';
import ServiceHistoryChart from '../components/servico/ServiceHistoryChart';
import LinhaDoTempoEstado from '../components/servico/LinhaDoTempoEstado';
import MelhorHorarioDoServico from '../components/horarios/MelhorHorarioDoServico';
import SimuladorRegiao from '../components/servico/SimuladorRegiao';
import usePageTitle from '../hooks/usePageTitle';
import usePeriod from '../hooks/usePeriod';
import { getDemoServiceDetail } from '../mocks/serviceDetail';
import { ApiError } from '../services/api';
import {
  fetchServiceDetail,
  type ServiceDetailData,
} from '../services/serviceDetail';
import { resolverComposicaoServico } from '../utils/composicaoEnergia';
import { ehModoDemo } from '../utils/modoDemo';
import {
  formatServiceCollectionTimestamp,
  formatServiceStatus,
} from '../utils/serviceDetail';
import {
  formatServiceLocation,
  formatEmission,
  formatEnergy,
} from '../utils/formatters';
import { summarizeServiceHistory } from '../utils/serviceHistory';
import './service-detail.css';

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'notFound' }
  | { status: 'ready'; data: ServiceDetailData };

export default function ServicoDetalhe() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isDemo = ehModoDemo(searchParams);
  const { apiQuery, linkSearch } = usePeriod();
  const serviceId = Number(id);
  const validServiceId =
    typeof id === 'string' &&
    /^\d+$/.test(id) &&
    Number.isSafeInteger(serviceId) &&
    serviceId > 0 &&
    serviceId <= 2_147_483_647;
  const [retryCount, setRetryCount] = useState(0);
  const requestKey = `${id ?? ''}:${apiQuery}:${retryCount}`;
  const [result, setResult] = useState<{
    key: string;
    state: ViewState;
  } | null>(null);

  useEffect(() => {
    if (isDemo || !validServiceId) {
      return;
    }

    const controller = new AbortController();
    void fetchServiceDetail(serviceId, apiQuery, controller.signal)
      .then((data) => {
        setResult({
          key: requestKey,
          state: data ? { status: 'ready', data } : { status: 'notFound' },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setResult({
          key: requestKey,
          state:
            error instanceof ApiError && error.status === 404
              ? { status: 'notFound' }
              : {
                  status: 'error',
                  message:
                    error instanceof Error
                      ? error.message
                      : 'Não foi possível carregar os dados do serviço.',
                },
        });
      });

    return () => controller.abort();
  }, [apiQuery, isDemo, requestKey, serviceId, validServiceId]);

  const demoData =
    isDemo && validServiceId ? getDemoServiceDetail(serviceId) : null;
  const view: ViewState = isDemo
    ? demoData
      ? { status: 'ready', data: demoData }
      : { status: 'notFound' }
    : !validServiceId
      ? { status: 'notFound' }
      : result?.key === requestKey
        ? result.state
        : { status: 'loading' };
  const pageTitle =
    view.status === 'ready'
      ? `${view.data.service.nome}${isDemo ? ' · demonstração' : ''}`
      : view.status === 'notFound'
        ? 'Serviço não encontrado'
        : 'Detalhe do serviço';
  usePageTitle(pageTitle);

  const service = view.status === 'ready' ? view.data.service : null;
  const status = service ? formatServiceStatus(service.estadoAtual) : null;
  const location = service
    ? formatServiceLocation(service.localizacao, service.regiaoCodigo)
    : null;
  const locationLabel = location
    ? location.city
      ? `${location.area} — ${location.city}`
      : location.area
    : null;
  const summary =
    view.status === 'ready' ? summarizeServiceHistory(view.data.history) : null;
  const historyHasData =
    summary?.possuiEnergia === true || summary?.possuiEmissao === true;

  function getCompareHref() {
    if (!service) {
      return '/comparar';
    }
    const params = new URLSearchParams(`servicos=${service.id}`);
    if (isDemo) {
      params.set('demo', '1');
    } else if (linkSearch) {
      new URLSearchParams(linkSearch).forEach((value, key) => {
        params.set(key, value);
      });
    }
    return `/comparar?${params.toString()}`;
  }

  return (
    <div className="service-detail-page">
      <header className="page-heading service-detail-heading">
        <div>
          <p className="eyebrow">DETALHE DO SERVIÇO</p>
          <h1>
            {service?.nome ??
              (view.status === 'notFound'
                ? 'Serviço não encontrado'
                : `Serviço ${id ?? ''}`)}
          </h1>
          {locationLabel && <p className="page-subtitle">{locationLabel}</p>}
        </div>
        {service && status && (
          <div className="service-detail-actions">
            <span
              className={`service-detail-status service-detail-status--${status.className}`}
            >
              <Icon name={status.icon} />
              {status.label}
            </span>
            <Link to={getCompareHref()} className="button button--secondary">
              Comparar com outro serviço
              <Icon name="compare" />
            </Link>
          </div>
        )}
      </header>

      {view.status === 'loading' && (
        <FeedbackPanel
          kind="loading"
          skeleton="detail"
          title="Carregando o serviço"
          description="Buscando os dados do serviço e o histórico do período."
        />
      )}
      {view.status === 'error' && (
        <FeedbackPanel
          kind="error"
          title="Não foi possível carregar o serviço"
          description={view.message}
        >
          <button
            className="button button--primary"
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Tentar novamente
          </button>
        </FeedbackPanel>
      )}
      {view.status === 'notFound' && (
        <FeedbackPanel
          kind="empty"
          title="Não foi possível localizar este serviço"
          description="O serviço pode ter sido removido ou o endereço informado não existe."
        >
          <Link
            to={isDemo ? '/?demo=1' : '/'}
            className="button button--primary"
          >
            Voltar ao dashboard
          </Link>
        </FeedbackPanel>
      )}

      {view.status === 'ready' && summary && (
        <>
          {isDemo && (
            <p className="service-detail-demo-note" role="status">
              <Icon name="info" />
              Demonstração com dados fictícios; os valores não representam
              medições reais.
            </p>
          )}
          <section
            className="service-detail-facts"
            aria-label="Informações do serviço"
          >
            <dl>
              <div>
                <dt>Última coleta válida</dt>
                <dd>
                  {formatServiceCollectionTimestamp(
                    view.data.latestCollection?.iniciadaEm,
                  )}
                </dd>
              </div>
              <div>
                <dt>Estado atual</dt>
                <dd>{status?.label}</dd>
              </div>
              <div>
                <dt>Selo de eficiência</dt>
                <dd>{service && <SeloBadge selo={service.selo} />}</dd>
              </div>
            </dl>
          </section>

          <section
            className="service-detail-totals"
            aria-label="Totais no período selecionado"
          >
            <article className="service-detail-total-card">
              <div className="service-detail-total-heading">
                <h2>Energia total</h2>
                <Icon name="bolt" />
              </div>
              <p className="service-detail-total-value">
                {formatEnergy(summary.totalEnergiaKwh)}
              </p>
              <p className="service-detail-total-description">
                Soma das medições válidas no período.
              </p>
              <MethodologyLink />
            </article>
            <article className="service-detail-total-card">
              <div className="service-detail-total-heading">
                <h2>Emissão total de CO₂e</h2>
                <Icon name="cloud" />
              </div>
              <p className="service-detail-total-value">
                {formatEmission(summary.totalEmissaoGCo2e)}
              </p>
              <p className="service-detail-total-description">
                Soma das medições válidas no período.
              </p>
              <EmissionEquivalences
                emissaoGCo2e={
                  summary.possuiEmissao ? summary.totalEmissaoGCo2e : null
                }
              />
              <MethodologyLink />
            </article>
          </section>

          {!isDemo && <PeriodSelector />}

          <section
            className="service-detail-history"
            aria-labelledby="service-detail-history-title"
          >
            <div className="chart-heading">
              <div>
                <p className="eyebrow">SÉRIE TEMPORAL</p>
                <h2 id="service-detail-history-title">
                  Histórico de energia e emissões
                </h2>
              </div>
            </div>
            {historyHasData ? (
              <>
                <div className="service-detail-charts">
                  <ServiceHistoryChart
                    metric="energia"
                    data={summary.pontos}
                    scale={summary.escalaEnergia}
                    hasData={summary.possuiEnergia}
                    hourly={summary.granularidadeHoraria}
                  />
                  <ServiceHistoryChart
                    metric="emissao"
                    data={summary.pontos}
                    scale={summary.escalaEmissao}
                    hasData={summary.possuiEmissao}
                    hourly={summary.granularidadeHoraria}
                  />
                </div>
                <details className="service-detail-data-table">
                  <summary>Consultar valores do histórico em tabela</summary>
                  <div className="service-detail-table-scroll">
                    <table>
                      <caption className="sr-only">
                        Valores de energia e emissão em cada intervalo do
                        período.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Início do intervalo</th>
                          <th scope="col">Energia</th>
                          <th scope="col">Emissão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.pontos.map((point) => (
                          <tr key={point.inicio}>
                            <th scope="row">
                              {formatServiceCollectionTimestamp(point.inicio)}
                            </th>
                            <td>{formatEnergy(point.energiaKwh)}</td>
                            <td>{formatEmission(point.emissaoGCo2e)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              <FeedbackPanel
                kind="empty"
                title="Nenhum dado no período"
                description="Não há medições de energia ou emissão calculadas para este serviço no período selecionado."
              />
            )}
          </section>

          <LinhaDoTempoEstado
            history={view.data.history}
            hourly={
              view.data.history.length > 1
                ? summary.granularidadeHoraria
                : undefined
            }
            isDemo={isDemo}
          />

          <ComposicaoEnergia
            componentes={resolverComposicaoServico(
              view.data.history,
              view.data.service.componentes,
            )}
            subtitulo="Distribuição estimada da potência por recurso neste serviço no período."
            isDemo={isDemo}
          />
          <SimuladorRegiao servicoId={serviceId} />
          <MelhorHorarioDoServico servicoId={serviceId} />
        </>
      )}
    </div>
  );
}
