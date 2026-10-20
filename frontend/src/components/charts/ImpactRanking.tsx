import { useId, useState } from 'react';
import type { DashboardService, ImpactMetric } from '../../types/dashboard';
import { formatNumber } from '../dashboard/demoPresentation';

export default function ImpactRanking({
  services,
}: {
  services: DashboardService[];
}) {
  const headingId = useId();
  const [metric, setMetric] = useState<ImpactMetric>('carbonKg');
  const rankedServices = services
    .filter((service) => service[metric] !== null)
    .toSorted((first, second) => (second[metric] ?? 0) - (first[metric] ?? 0))
    .slice(0, 5);
  const maximum = rankedServices.at(0)?.[metric] ?? 1;
  const unit = metric === 'energyKwh' ? 'kWh' : 'kgCO₂e';
  const total = services.reduce(
    (sum, service) => sum + (service[metric] ?? 0),
    0,
  );
  const leadingService = rankedServices.at(0);
  const leadingShare =
    total && leadingService ? ((leadingService[metric] ?? 0) / total) * 100 : 0;

  return (
    <section className="demo-panel ranking-panel" aria-labelledby={headingId}>
      <div className="chart-heading">
        <div>
          <p className="eyebrow">ONDE ESTÁ O MAIOR IMPACTO</p>
          <h2 id={headingId}>Top 5 serviços</h2>
        </div>
      </div>
      <label className="ranking-select">
        Ordenar por
        <select
          value={metric}
          onChange={(event) =>
            setMetric(
              event.target.value === 'energyKwh' ? 'energyKwh' : 'carbonKg',
            )
          }
        >
          <option value="carbonKg">Emissões (kgCO₂e)</option>
          <option value="energyKwh">Energia (kWh)</option>
        </select>
      </label>
      <ol className="ranking-list">
        {rankedServices.map((service, index) => (
          <li key={service.id}>
            <div className="ranking-row">
              <span>
                <span className="ranking-position">{index + 1}</span>
                {service.name}
              </span>
              <strong>
                {formatNumber(
                  service[metric] ?? 0,
                  metric === 'carbonKg' ? 3 : 2,
                )}
              </strong>
            </div>
            <div
              className={`ranking-track ranking-track--${index}`}
              aria-hidden="true"
            >
              <span
                style={{
                  width: `${maximum ? ((service[metric] ?? 0) / maximum) * 100 : 0}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ol>
      <p className="ranking-unit">Valores em {unit} · 07/10/2026</p>
      {leadingService && (
        <div className="ranking-insight">
          <strong>{formatNumber(leadingShare, 1)}%</strong>
          <p>
            do total de {metric === 'energyKwh' ? 'energia' : 'emissões'} vem de{' '}
            <b>{leadingService.name}</b> neste exemplo.
          </p>
        </div>
      )}
    </section>
  );
}
