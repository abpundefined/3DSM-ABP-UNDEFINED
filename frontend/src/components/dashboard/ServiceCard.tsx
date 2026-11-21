import { useRef } from 'react';
import {
  formatEmission,
  formatEnergy,
  formatServiceLocation,
  toFiniteNumber,
} from '../../utils/formatters';
import { describeServiceCollection } from '../../utils/serviceCollection';
import {
  formatServiceMetric,
  formatServiceStatus,
} from '../../utils/serviceDetail';
import Icon from '../common/Icon';
import MethodologyLink from '../common/MethodologyLink';
import MiniTendencia from '../tendencia/MiniTendencia';
import AnelCpu from './AnelCpu';
import type { LiveService } from './liveTypes';

export default function ServiceCard({
  service,
  onSelect,
  tendencia,
  comparisonSelected = false,
  onToggleComparison,
  pulsando = false,
}: {
  service: LiveService;
  onSelect?: (service: LiveService, triggerElement: HTMLElement | null) => void;
  tendencia?: (number | null)[];
  comparisonSelected?: boolean;
  onToggleComparison?: (serviceId: number) => void;
  pulsando?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const status = formatServiceStatus(service.estadoAtual);
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
  const collectionNotice = describeServiceCollection(service);
  const nameId = `service-card-${service.id}`;

  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!onSelect) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('button, a')) {
      return;
    }

    onSelect(service, triggerRef.current);
  };

  return (
    <article
      className={`service-card${onSelect ? ' service-card--interactive' : ''}${pulsando ? ' service-card--pulsando' : ''}`}
      data-pulsando={pulsando ? 'true' : undefined}
      aria-labelledby={nameId}
      onClick={handleCardClick}
    >
      <header className="service-card-header">
        <div>
          <h3 id={nameId}>
            {onSelect ? (
              <button
                ref={triggerRef}
                type="button"
                className="service-card-title-button"
                onClick={() => onSelect(service, triggerRef.current)}
              >
                {service.nome}
              </button>
            ) : (
              service.nome
            )}
          </h3>
          <p className="service-card-location">{location.area}</p>
          <p className="service-card-city">
            {location.city ?? 'Cidade não informada'}
          </p>
        </div>
        <div className="service-card-header-actions">
          <span className={`service-badge service-badge--${status.className}`}>
            <Icon name={status.icon} />
            {status.label}
          </span>
          {onToggleComparison && (
            <button
              className="service-card-compare"
              type="button"
              aria-label={
                comparisonSelected ? 'Remover da comparação' : 'Comparar'
              }
              aria-describedby={nameId}
              aria-pressed={comparisonSelected}
              onClick={() => onToggleComparison(service.id)}
            >
              {comparisonSelected ? 'Selecionado' : 'Comparar'}
            </button>
          )}
        </div>
      </header>

      {collectionNotice && (
        <div className="service-card-notice">
          <Icon name="clock" />
          <p>
            {collectionNotice.kind === 'never' ? (
              <>
                <strong>Sem coleta válida</strong>
                <span>
                  Nenhuma coleta válida foi registrada para este serviço.
                </span>
              </>
            ) : (
              <>
                <strong>Sem coleta válida no momento</strong>
                {collectionNotice.label && collectionNotice.dateTime ? (
                  <span>
                    Valores da última coleta válida, em{' '}
                    <time dateTime={collectionNotice.dateTime}>
                      {collectionNotice.label}
                    </time>
                    .
                  </span>
                ) : (
                  <span>
                    Valores da última coleta válida; a data não foi informada.
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      )}

      <dl className="service-card-impact">
        <div>
          <dt>Energia</dt>
          <dd>{formatEnergy(energyKwh)}</dd>
        </div>
        <div>
          <dt>Emissões</dt>
          <dd>{formatEmission(emissionsGCo2e)}</dd>
        </div>
      </dl>

      {tendencia && <MiniTendencia valores={tendencia} />}

      <dl className="service-card-metrics">
        <div className="service-card-metric-cpu">
          <dt>CPU</dt>
          <dd>
            <AnelCpu cpuPercent={metrics?.cpuPercent} />
          </dd>
        </div>
        <div>
          <dt>Memória</dt>
          <dd>{formatServiceMetric(metrics?.memoryGb, 'GB')}</dd>
        </div>
        <div>
          <dt>Disco</dt>
          <dd>{formatServiceMetric(metrics?.diskGb, 'GB')}</dd>
        </div>
        <div>
          <dt>Rede</dt>
          <dd>{formatServiceMetric(metrics?.networkGb, 'GB')}</dd>
        </div>
      </dl>
      <MethodologyLink />
    </article>
  );
}
