import { formatServiceLocation, toFiniteNumber } from '../../utils/formatters';
import Icon from '../common/Icon';
import type { BackendService, LiveService } from './liveTypes';

function formatMetric(
  value: number | string | null | undefined,
  suffix: string,
  digits = 2,
) {
  const numericValue = toFiniteNumber(value);
  if (numericValue == null) {
    return '—';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numericValue)} ${suffix}`;
}

function statusFor(service: BackendService) {
  switch (service.estadoAtual) {
    case 'DISPONIVEL':
      return { className: 'active', label: 'Ativo', icon: 'check' as const };
    case 'SEM_METRICAS':
      return {
        className: 'noMetrics',
        label: 'Sem métricas',
        icon: 'info' as const,
      };
    case 'REMOVIDO':
      return {
        className: 'unavailable',
        label: 'Removido',
        icon: 'alert' as const,
      };
    case 'INDISPONIVEL':
      return {
        className: 'unavailable',
        label: 'Indisponível',
        icon: 'alert' as const,
      };
    default:
      return {
        className: 'unavailable',
        label: 'Desconhecido',
        icon: 'info' as const,
      };
  }
}

export default function ServiceCard({ service }: { service: LiveService }) {
  const status = statusFor(service);
  const metrics = service.latestCollection;
  const location = formatServiceLocation(
    service.localizacao,
    service.regiaoCodigo,
  );
  const energyKwh =
    toFiniteNumber(metrics?.energiaKwh) ?? toFiniteNumber(service.energiaKwh);
  const emissionsGCo2e =
    toFiniteNumber(metrics?.emissaoGCo2e) ??
    toFiniteNumber(service.emissaoGCo2e);
  const nameId = `service-card-${service.id}`;

  return (
    <article className="service-card" aria-labelledby={nameId}>
      <header className="service-card-header">
        <div>
          <h3 id={nameId}>{service.nome}</h3>
          <p className="service-card-location">{location.area}</p>
          <p className="service-card-city">
            {location.city ?? 'Cidade não informada'}
          </p>
        </div>
        <span className={`service-badge service-badge--${status.className}`}>
          <Icon name={status.icon} />
          {status.label}
        </span>
      </header>

      <dl className="service-card-impact">
        <div>
          <dt>Energia</dt>
          <dd>{formatMetric(energyKwh, 'kWh', 4)}</dd>
        </div>
        <div>
          <dt>Emissões</dt>
          <dd>
            {formatMetric(
              emissionsGCo2e === null ? null : emissionsGCo2e / 1000,
              'kgCO₂e',
              4,
            )}
          </dd>
        </div>
      </dl>

      <dl className="service-card-metrics">
        <div>
          <dt>CPU</dt>
          <dd>{formatMetric(metrics?.cpuPercent, '%', 1)}</dd>
        </div>
        <div>
          <dt>Memória</dt>
          <dd>{formatMetric(metrics?.memoryGb, 'GB')}</dd>
        </div>
        <div>
          <dt>Disco</dt>
          <dd>{formatMetric(metrics?.diskGb, 'GB')}</dd>
        </div>
        <div>
          <dt>Rede</dt>
          <dd>{formatMetric(metrics?.networkGb, 'GB')}</dd>
        </div>
      </dl>
    </article>
  );
}
