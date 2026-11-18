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
import type { LiveService } from './liveTypes';

export default function ServiceCard({
  service,
  onSelect,
}: {
  service: LiveService;
  onSelect?: (service: LiveService, triggerElement: HTMLElement | null) => void;
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
      className={`service-card${onSelect ? ' service-card--interactive' : ''}`}
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
        <span className={`service-badge service-badge--${status.className}`}>
          <Icon name={status.icon} />
          {status.label}
        </span>
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

      <dl className="service-card-metrics">
        <div>
          <dt>CPU</dt>
          <dd>{formatServiceMetric(metrics?.cpuPercent, '%', 1)}</dd>
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
    </article>
  );
}
