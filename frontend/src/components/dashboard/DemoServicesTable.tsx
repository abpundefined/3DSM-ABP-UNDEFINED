import { useId, useState } from 'react';
import type { DashboardService } from '../../types/dashboard';
import FeedbackPanel from '../common/FeedbackPanel';
import Icon from '../common/Icon';
import { formatNumber, serviceStatusPresentation } from './demoPresentation';

function MetricValue({
  value,
  unit,
  digits = 2,
}: {
  value: number | null;
  unit: string;
  digits?: number;
}) {
  return value === null ? (
    <span aria-label="Dado indisponível">—</span>
  ) : (
    <>
      {formatNumber(value, digits)} <span className="table-unit">{unit}</span>
    </>
  );
}

export default function DemoServicesTable({
  services,
}: {
  services: DashboardService[];
}) {
  const headingId = useId();
  const searchId = useId();
  const statusId = useId();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const matchingServices = services.filter(
    (service) =>
      service.name
        .toLocaleLowerCase('pt-BR')
        .includes(search.trim().toLocaleLowerCase('pt-BR')) &&
      (status === 'all' || service.status === status),
  );

  return (
    <section
      className="demo-panel demo-services-panel"
      aria-labelledby={headingId}
    >
      <div className="chart-heading">
        <div>
          <p className="eyebrow">INFRAESTRUTURA</p>
          <h2 id={headingId}>Serviços monitorados</h2>
        </div>
        <span className="quiet-label" role="status">
          {matchingServices.length} de {services.length} serviços
        </span>
      </div>
      <div className="service-filters">
        <div className="service-search">
          <label className="sr-only" htmlFor={searchId}>
            Buscar serviço
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar serviço pelo nome"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor={statusId}>
            Filtrar por status
          </label>
          <select
            id={statusId}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="unavailable">Indisponíveis</option>
            <option value="noMetrics">Sem métricas</option>
          </select>
        </div>
      </div>
      {matchingServices.length ? (
        <>
          <p className="table-scroll-hint">
            Em telas pequenas, deslize a tabela para ver todos os indicadores.
          </p>
          <div
            className="service-table-scroll"
            role="region"
            aria-label="Tabela de serviços fictícios e indicadores"
            tabIndex={0}
          >
            <table className="service-table">
              <caption className="sr-only">
                Serviços e indicadores simulados em 07/10/2026. Valores ausentes
                são indicados por um traço.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Serviço</th>
                  <th scope="col">Status</th>
                  <th scope="col">CPU</th>
                  <th scope="col">Memória</th>
                  <th scope="col">Energia</th>
                  <th scope="col">Emissões</th>
                </tr>
              </thead>
              <tbody>
                {matchingServices.map((service) => (
                  <tr key={service.id}>
                    <th scope="row">
                      <span className="service-name">{service.name}</span>
                      <span className="service-region">{service.region}</span>
                    </th>
                    <td>
                      <span
                        className={`service-badge service-badge--${service.status}`}
                      >
                        <Icon
                          name={serviceStatusPresentation[service.status].icon}
                        />
                        {serviceStatusPresentation[service.status].label}
                      </span>
                    </td>
                    <td>
                      <MetricValue
                        value={service.cpuPercent}
                        unit="%"
                        digits={0}
                      />
                    </td>
                    <td>
                      <MetricValue
                        value={service.memoryGb}
                        unit="GB"
                        digits={1}
                      />
                    </td>
                    <td>
                      <MetricValue value={service.energyKwh} unit="kWh" />
                    </td>
                    <td>
                      <MetricValue
                        value={service.carbonKg}
                        unit="kgCO₂e"
                        digits={3}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <FeedbackPanel
          kind="empty"
          title="Nenhum serviço encontrado"
          description="Tente outro nome ou altere o filtro de status."
        >
          <button
            className="button button--primary"
            type="button"
            onClick={() => {
              setSearch('');
              setStatus('all');
            }}
          >
            Limpar filtros
          </button>
        </FeedbackPanel>
      )}
      <p className="chart-footnote">
        Dados fictícios de 07/10/2026 · métricas indisponíveis aparecem como —.
      </p>
    </section>
  );
}
