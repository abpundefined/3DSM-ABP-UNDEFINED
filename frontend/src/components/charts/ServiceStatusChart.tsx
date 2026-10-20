import { useId } from 'react';
import type { DashboardService, ServiceStatus } from '../../types/dashboard';
import Icon from '../common/Icon';
import { serviceStatusPresentation } from '../dashboard/demoPresentation';

const statuses: ServiceStatus[] = ['active', 'unavailable', 'noMetrics'];

export default function ServiceStatusChart({
  services,
}: {
  services: DashboardService[];
}) {
  const headingId = useId();
  const segments = statuses.map((status) => ({
    status,
    count: services.filter((service) => service.status === status).length,
  }));

  return (
    <section className="demo-panel status-panel" aria-labelledby={headingId}>
      <div className="chart-heading">
        <div>
          <p className="eyebrow">DISPONIBILIDADE</p>
          <h2 id={headingId}>Status dos serviços</h2>
        </div>
      </div>
      <div className="status-chart-body">
        <div className="status-donut">
          <svg
            viewBox="0 0 120 120"
            role="img"
            aria-label={`${services.length} serviços fictícios: ${segments.map((segment) => `${segment.count} ${serviceStatusPresentation[segment.status].label.toLowerCase()}`).join(', ')}`}
          >
            <circle cx="60" cy="60" r="45" className="donut-track" />
            {segments.map((segment, index) => {
              const portion = services.length
                ? (segment.count / services.length) * 100
                : 0;
              const segmentOffset = services.length
                ? (segments
                    .slice(0, index)
                    .reduce((sum, previous) => sum + previous.count, 0) /
                    services.length) *
                  100
                : 0;
              return (
                <circle
                  key={segment.status}
                  cx="60"
                  cy="60"
                  r="45"
                  pathLength="100"
                  strokeDasharray={`${Math.max(0, portion - 0.8)} ${100 - Math.max(0, portion - 0.8)}`}
                  strokeDashoffset={-segmentOffset}
                  className={`donut-segment donut-segment--${segment.status}`}
                  transform="rotate(-90 60 60)"
                />
              );
            })}
          </svg>
          <div className="donut-label" aria-hidden="true">
            <strong>{services.length}</strong>
            <span>serviços</span>
          </div>
        </div>
        <ul className="status-legend">
          {segments.map((segment) => (
            <li key={segment.status}>
              <span className={`status-key status-key--${segment.status}`}>
                <Icon name={serviceStatusPresentation[segment.status].icon} />
                {serviceStatusPresentation[segment.status].label}
              </span>
              <strong>{segment.count}</strong>
            </li>
          ))}
        </ul>
      </div>
      <p className="chart-footnote">Situação ilustrativa em 07/10/2026.</p>
    </section>
  );
}
