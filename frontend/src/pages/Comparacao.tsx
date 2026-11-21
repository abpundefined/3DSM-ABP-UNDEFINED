import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import FeedbackPanel from '../components/common/FeedbackPanel';
import MethodologyLink from '../components/common/MethodologyLink';
import ComparisonCharts from '../components/comparacao/ComparisonCharts';
import PeriodSelector from '../components/common/PeriodSelector';
import useComparisonData from '../hooks/useComparisonData';
import useComparisonSelection from '../hooks/useComparisonSelection';
import usePageTitle from '../hooks/usePageTitle';
import usePeriod from '../hooks/usePeriod';
import { ehModoDemo } from '../utils/modoDemo';
import type {
  ServicoComparacao,
  ServicoSelecionavel,
} from '../types/comparacao';
import type { MetricaRanking } from '../types/ranking';
import {
  formatEmission,
  formatEnergy,
  formatServiceLocation,
  toFiniteNumber,
} from '../utils/formatters';
import {
  formatServiceMetric,
  formatServiceStatus,
} from '../utils/serviceDetail';
import {
  compareCarbonIntensity,
  formatComparisonPeriod,
  MAX_SERVICES_TO_COMPARE,
} from '../utils/comparacao';
import '../components/comparacao/comparacao.css';

function getLocation(service: ServicoSelecionavel | undefined) {
  if (!service) {
    return 'Localização não informada';
  }
  const location = formatServiceLocation(
    service.localizacao,
    service.regiaoCodigo,
  );
  return location.city ? `${location.area} · ${location.city}` : location.area;
}

function ComparisonSummaryCard({
  service,
  isHighestEmission,
}: {
  service: ServicoComparacao;
  isHighestEmission: boolean;
}) {
  return (
    <article
      className="comparison-summary-card"
      aria-labelledby={`comparison-service-${service.servicoId}`}
    >
      <h3 id={`comparison-service-${service.servicoId}`}>{service.nome}</h3>
      {isHighestEmission && (
        <p className="comparison-high-emission">Maior emissão no período</p>
      )}
      <dl>
        <div>
          <dt>Energia total</dt>
          <dd>{formatEnergy(service.totais.energiaKwh)}</dd>
        </div>
        <div>
          <dt>Emissão total</dt>
          <dd>{formatEmission(service.totais.emissaoGCo2e)}</dd>
        </div>
        <div>
          <dt>Coletas válidas</dt>
          <dd>{service.totais.coletasValidas}</dd>
        </div>
      </dl>
      <MethodologyLink />
    </article>
  );
}

function ComparisonTable({
  services,
  metadataById,
}: {
  services: ServicoComparacao[];
  metadataById: Map<number, ServicoSelecionavel>;
}) {
  const indicators = [
    'Estado',
    'Local',
    'CPU média',
    'Memória média',
    'Energia total',
    'CO₂e total',
    'Intensidade de carbono',
  ];
  const estimatedIndicators = new Set([
    'Energia total',
    'CO₂e total',
    'Intensidade de carbono',
  ]);

  function valueFor(service: ServicoComparacao, indicator: string) {
    const metadata = metadataById.get(service.servicoId);
    switch (indicator) {
      case 'Estado':
        return metadata
          ? formatServiceStatus(metadata.estadoAtual).label
          : 'Não informado';
      case 'Local':
        return getLocation(metadata);
      case 'CPU média':
        return formatServiceMetric(service.totais.cpuMedia, '%', 1);
      case 'Memória média':
        return formatServiceMetric(service.totais.memoriaMediaMb, 'MB');
      case 'Energia total':
        return formatEnergy(service.totais.energiaKwh);
      case 'CO₂e total':
        return formatEmission(service.totais.emissaoGCo2e);
      case 'Intensidade de carbono':
        return formatServiceMetric(
          compareCarbonIntensity(
            service.totais.energiaKwh,
            service.totais.emissaoGCo2e,
          ),
          'gCO₂e/kWh',
          1,
        );
      default:
        return '—';
    }
  }

  return (
    <section
      className="comparison-table-section"
      aria-labelledby="comparison-table-title"
    >
      <h2 id="comparison-table-title">Indicadores por serviço</h2>
      <div
        className="comparison-table-scroll"
        role="region"
        aria-label="Tabela de indicadores por serviço"
        tabIndex={0}
      >
        <table>
          <caption>
            Estado, localização e métricas dos serviços no período selecionado.
            A intensidade de carbono é emissão total dividida pela energia
            total.
          </caption>
          <thead>
            <tr>
              <th scope="col">Indicador</th>
              {services.map((service) => (
                <th scope="col" key={service.servicoId}>
                  {service.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {indicators.map((indicator) => (
              <tr key={indicator}>
                <th scope="row">
                  <span>{indicator}</span>
                  {estimatedIndicators.has(indicator) && (
                    <MethodologyLink className="comparison-table-methodology-link" />
                  )}
                </th>
                {services.map((service) => (
                  <td key={service.servicoId}>
                    {valueFor(service, indicator)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ServiceSelectionList({
  services,
  selectedIds,
  onToggle,
}: {
  services: ServicoSelecionavel[];
  selectedIds: number[];
  onToggle: (serviceId: number) => void;
}) {
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const filteredServices = useMemo(
    () =>
      services.filter((service) =>
        service.nome.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
      ),
    [normalizedSearch, services],
  );

  return (
    <div className="comparison-picker">
      <label className="comparison-search">
        Buscar serviço
        <input
          type="search"
          aria-label="Buscar serviço"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Digite o nome do serviço"
        />
      </label>
      {filteredServices.length > 0 ? (
        <ul className="comparison-service-list">
          {filteredServices.map((service) => {
            const status = formatServiceStatus(service.estadoAtual);
            return (
              <li key={service.id}>
                <label className="comparison-service-option">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(service.id)}
                    onChange={() => onToggle(service.id)}
                    aria-label={`Selecionar ${service.nome} para comparação`}
                  />
                  <span className="comparison-service-option-name">
                    {service.nome}
                  </span>
                  <span
                    className={`service-badge service-badge--${status.className}`}
                  >
                    {status.label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="comparison-no-search-results" role="status">
          Nenhum serviço corresponde à busca.
        </p>
      )}
    </div>
  );
}

export default function Comparacao() {
  const [searchParams] = useSearchParams();
  const isDemo = ehModoDemo(searchParams);
  usePageTitle(
    isDemo ? 'Comparar serviços · demonstração' : 'Comparar serviços',
  );
  const { period, apiQuery } = usePeriod();
  const {
    serviceIds,
    invalidSelection,
    selectionWarning,
    setServiceIds,
    clearSelection,
  } = useComparisonSelection();
  const { servicesState, comparisonState, retryServices, retryComparison } =
    useComparisonData({ serviceIds, apiQuery, invalidSelection, isDemo });
  const [metric, setMetric] = useState<MetricaRanking>('energia');

  const services = useMemo(
    () => (servicesState.status === 'pronto' ? servicesState.dados : []),
    [servicesState],
  );
  const metadataById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );

  return (
    <div className="comparison-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ANÁLISE</p>
          <h1>Comparar serviços</h1>
          <p className="page-subtitle">
            Compare indicadores e evolução dos serviços no mesmo período.
          </p>
        </div>
      </div>
      <section
        className="comparison-selection"
        aria-labelledby="comparison-selection-title"
      >
        <div className="comparison-selection-heading">
          <div>
            <h2 id="comparison-selection-title">Serviços para comparar</h2>
            <p>
              Selecione de 2 a {MAX_SERVICES_TO_COMPARE} serviços ·{' '}
              {serviceIds.length} selecionado
              {serviceIds.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            className="button button--secondary"
            type="button"
            onClick={clearSelection}
            disabled={serviceIds.length === 0 && !selectionWarning}
          >
            Limpar seleção
          </button>
        </div>
        {selectionWarning && (
          <p className="comparison-selection-warning" role="alert">
            {selectionWarning}
          </p>
        )}
        {servicesState.status === 'carregando' && (
          <FeedbackPanel
            kind="loading"
            skeleton="cards"
            title="Carregando serviços"
            description="Aguarde enquanto preparamos a lista para comparação."
          />
        )}
        {servicesState.status === 'erro' && (
          <FeedbackPanel
            kind="error"
            title="Não foi possível carregar os serviços"
            description={servicesState.mensagem}
          >
            <button
              className="button button--primary"
              type="button"
              onClick={retryServices}
            >
              Tentar novamente
            </button>
          </FeedbackPanel>
        )}
        {servicesState.status === 'pronto' && services.length === 0 && (
          <FeedbackPanel
            kind="empty"
            title="Nenhum serviço disponível"
            description="Quando o backend descobrir serviços, eles aparecerão aqui."
          />
        )}
        {servicesState.status === 'pronto' && services.length > 0 && (
          <ServiceSelectionList
            services={services}
            selectedIds={serviceIds}
            onToggle={(serviceId) =>
              setServiceIds(
                serviceIds.includes(serviceId)
                  ? serviceIds.filter((id) => id !== serviceId)
                  : [...serviceIds, serviceId],
              )
            }
          />
        )}
      </section>

      {selectionWarning ? (
        <FeedbackPanel
          kind="empty"
          title="Revise a seleção"
          description="Ajuste os serviços selecionados para continuar a comparação."
        />
      ) : serviceIds.length < 2 ? (
        <FeedbackPanel
          kind="empty"
          title="Selecione ao menos dois serviços"
          description="Marque dois ou mais serviços na lista para comparar os indicadores."
        />
      ) : serviceIds.length > MAX_SERVICES_TO_COMPARE ? (
        <FeedbackPanel
          kind="empty"
          title="Limite de comparação excedido"
          description={`A comparação aceita no máximo ${MAX_SERVICES_TO_COMPARE} serviços.`}
        />
      ) : comparisonState.status === 'carregando' ? (
        <FeedbackPanel
          kind="loading"
          skeleton="table"
          title="Carregando comparação"
          description="Consultando totais e séries do período selecionado."
        />
      ) : comparisonState.status === 'erro' ? (
        <FeedbackPanel
          kind="error"
          title="Não foi possível carregar a comparação"
          description={comparisonState.mensagem}
        >
          <button
            className="button button--primary"
            type="button"
            onClick={retryComparison}
          >
            Tentar novamente
          </button>
        </FeedbackPanel>
      ) : comparisonState.status === 'pronto' ? (
        <ComparisonResults
          services={comparisonState.dados.servicos}
          metadataById={metadataById}
          metric={metric}
          setMetric={setMetric}
          hourly={comparisonState.dados.granularidade === 'hora'}
          periodLabel={formatComparisonPeriod(period)}
          isDemo={isDemo}
        />
      ) : null}
      {!isDemo && comparisonState.status !== 'pronto' && <PeriodSelector />}
    </div>
  );
}

function ComparisonResults({
  services,
  metadataById,
  metric,
  setMetric,
  hourly,
  periodLabel,
  isDemo,
}: {
  services: ServicoComparacao[];
  metadataById: Map<number, ServicoSelecionavel>;
  metric: MetricaRanking;
  setMetric: (metric: MetricaRanking) => void;
  hourly: boolean;
  periodLabel: string;
  isDemo: boolean;
}) {
  const emissions = services
    .map((service) => toFiniteNumber(service.totais.emissaoGCo2e))
    .filter((value): value is number => value !== null);
  const maximumEmission = emissions.length ? Math.max(...emissions) : null;

  return (
    <div className="comparison-results">
      <p className="comparison-period-label">
        Período analisado: <strong>{periodLabel}</strong>
      </p>
      <section
        className="comparison-summary"
        aria-label="Totais dos serviços comparados"
      >
        {services.map((service) => (
          <ComparisonSummaryCard
            key={service.servicoId}
            service={service}
            isHighestEmission={
              maximumEmission !== null &&
              service.totais.emissaoGCo2e === maximumEmission
            }
          />
        ))}
      </section>
      {!isDemo && <PeriodSelector />}
      <ComparisonTable services={services} metadataById={metadataById} />
      <ComparisonCharts
        services={services}
        metric={metric}
        onMetricChange={setMetric}
        hourly={hourly}
      />
    </div>
  );
}
